package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// applicationService is the Go implementation of the read-only service
// contracts that the Wails shell can serve without starting the legacy Node
// HTTP layer. Mutating/domain endpoints remain on the compatibility service
// until their transactional behavior has been ported.
type applicationService struct {
	db           *sql.DB
	dbPath       string
	dataRoot     string
	configRoot   string
	publicOrigin string
	apiBase      string
	settings     map[string]string
	provider     string
	geminiModel  string
	nvidiaModel  string
	visionModel  string
	visionReason string
	nvidiaURL    string
	reasonURL    string
	modelID      string
	mode         string
	host         string
	port         int
}

func newApplicationService(dataRoot, configRoot string) (*applicationService, error) {
	dbPath := strings.TrimSpace(os.Getenv("BELAVISTA_DB"))
	if dbPath == "" {
		dbPath = filepath.Join(dataRoot, "belavista.sqlite")
	}
	absoluteDB, err := filepath.Abs(dbPath)
	if err != nil {
		return nil, fmt.Errorf("resolve SQLite database: %w", err)
	}
	dbURL := "file:" + filepath.ToSlash(absoluteDB)
	dbURL += "?mode=ro&_pragma=busy_timeout(5000)"
	db, err := sql.Open("sqlite", dbURL)
	if err != nil {
		return nil, fmt.Errorf("open SQLite database: %w", err)
	}
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("connect to the application SQLite database: %w", err)
	}
	settings := readServiceSettings(configRoot)
	setting := func(key, fallback string) string {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
		if value := strings.TrimSpace(settings[key]); value != "" {
			return value
		}
		return fallback
	}
	mode := strings.ToLower(setting("BELAVISTA_AUTH_MODE", "demo"))
	if mode != "firebase" {
		mode = "demo"
	}
	nvidiaURL := setting("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions")
	visionModel := setting("NVIDIA_VISION_MODEL", setting("NVIDIA_VLM_MODEL", "meta/llama-3.2-90b-vision-instruct"))
	return &applicationService{
		db:           db,
		dbPath:       absoluteDB,
		dataRoot:     dataRoot,
		configRoot:   configRoot,
		publicOrigin: strings.TrimRight(setting("PUBLIC_ORIGIN", ""), "/"),
		apiBase:      strings.TrimRight(setting("BELAVISTA_API_BASE", ""), "/"),
		settings:     settings,
		provider:     strings.ToLower(setting("AI_PROVIDER", "gemini")),
		geminiModel:  setting("GEMINI_MODEL", "gemini-3.7-flash"),
		nvidiaModel:  setting("NVIDIA_MODEL", "meta/llama-3.2-11b-vision-instruct"),
		visionModel:  visionModel,
		visionReason: setting("NVIDIA_REASONING_VISION_MODEL", setting("NVIDIA_REASONING_VLM_MODEL", visionModel)),
		nvidiaURL:    nvidiaURL,
		reasonURL:    setting("NVIDIA_REASONING_API_URL", nvidiaURL),
		modelID:      setting("RUBY_SYSTEM_MODEL", "kev-0.6b"),
		mode:         mode,
	}, nil
}

func readServiceSettings(configRoot string) map[string]string {
	settings := make(map[string]string)
	if configRoot == "" {
		return settings
	}
	content, err := os.ReadFile(filepath.Join(configRoot, "settings.json"))
	if err != nil {
		return settings
	}
	var raw map[string]any
	if json.Unmarshal(content, &raw) != nil {
		return settings
	}
	for key, value := range raw {
		if !regexp.MustCompile(`^[A-Z][A-Z0-9_]*$`).MatchString(key) {
			continue
		}
		if text, ok := value.(string); ok {
			settings[key] = text
		}
	}
	return settings
}

func (s *applicationService) handles(path string) bool {
	switch path {
	case "/api/health", "/api/runtime", "/api/entities", "/api/public/catalog":
		return true
	default:
		return false
	}
}

func (s *applicationService) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Vary", "Host, X-Forwarded-Host, X-Forwarded-Proto")
	if r.Method != http.MethodGet {
		writeServiceError(w, http.StatusMethodNotAllowed, "Método não permitido.")
		return
	}
	switch r.URL.Path {
	case "/api/health":
		entities, err := s.entitySummary(r)
		if err != nil {
			writeServiceError(w, http.StatusServiceUnavailable, "Falha ao consultar o banco SQLite.")
			return
		}
		var schemaVersion int
		if err := s.db.QueryRowContext(r.Context(), `SELECT COALESCE(MAX(version),0) FROM schema_migrations`).Scan(&schemaVersion); err != nil {
			writeServiceError(w, http.StatusServiceUnavailable, "Esquema SQLite não está inicializado.")
			return
		}
		writeServiceJSON(w, http.StatusOK, map[string]any{
			"ok": true, "database": "sqlite", "path": s.dbPath,
			"schemaVersion": schemaVersion, "entities": entities,
			"ai": s.aiStatus(), "inference": s.inferenceStatus(),
			"auth":   map[string]any{"mode": s.mode, "productionReady": s.mode == "firebase", "roles": []string{"owner", "admin", "foreman", "developer"}, "localDeveloperScope": "localhost only"},
			"origin": s.requestOrigin(r), "forwarded": r.Header.Get("X-Forwarded-Host") != "", "belavistaApiBase": s.apiBase,
		})
	case "/api/runtime":
		writeServiceJSON(w, http.StatusOK, map[string]any{
			"origin": s.requestOrigin(r), "host": s.host, "port": s.port,
			"forwardedHost":             emptyToNil(r.Header.Get("X-Forwarded-Host")),
			"forwardedProto":            emptyToNil(r.Header.Get("X-Forwarded-Proto")),
			"firebaseMessagingVapidKey": s.setting("FIREBASE_MESSAGING_VAPID_KEY"),
			"belavistaApiBase":          s.apiBase,
		})
	case "/api/entities":
		entities, err := s.entitySummary(r)
		if err != nil {
			writeServiceError(w, http.StatusServiceUnavailable, "Falha ao consultar entidades SQLite.")
			return
		}
		writeServiceJSON(w, http.StatusOK, map[string]any{"entities": entities})
	case "/api/public/catalog":
		if r.Method != http.MethodGet {
			writeServiceError(w, http.StatusMethodNotAllowed, "Método não permitido.")
			return
		}
		lots, err := s.publicCatalog(r)
		if err != nil {
			writeServiceError(w, http.StatusServiceUnavailable, "Falha ao consultar o catálogo comercial.")
			return
		}
		writeServiceJSON(w, http.StatusOK, map[string]any{"lots": lots, "source": "local-commercial-catalog", "updatedAt": time.Now().UTC().Format(time.RFC3339Nano)})
	}
}

func (s *applicationService) setListenAddress(host, port string) error {
	parsedPort, err := strconv.Atoi(port)
	if err != nil || parsedPort < 1 || parsedPort > 65535 {
		return fmt.Errorf("invalid local service port %q", port)
	}
	s.host = host
	s.port = parsedPort
	return nil
}

func (s *applicationService) entitySummary(r *http.Request) (map[string]int64, error) {
	names := []string{"projects", "stages", "activities", "collaborators", "materials", "purchases", "purchase_receipts", "commercial_sales", "commercial_sale_files", "cash_flow_entries", "commission_reasons", "outsourcing_receipts", "leads", "records", "activity_relations", "audit_events", "workbench_attachments"}
	counts := make(map[string]int64, len(names))
	for _, name := range names {
		var count int64
		if err := s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM `+name).Scan(&count); err != nil {
			return nil, fmt.Errorf("count %s: %w", name, err)
		}
		counts[name] = count
	}
	return counts, nil
}

func (s *applicationService) publicCatalog(r *http.Request) ([]map[string]string, error) {
	rows, err := s.db.QueryContext(r.Context(), `SELECT lot,status FROM commercial_sales WHERE TRIM(COALESCE(lot,''))<>'' ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	priority := map[string]int{"available": 0, "negotiation": 1, "reserved": 2, "sold": 3}
	statusByLot := make(map[string]string)
	lotOrder := make([]string, 0)
	for rows.Next() {
		var lot, sourceStatus string
		if err := rows.Scan(&lot, &sourceStatus); err != nil {
			return nil, err
		}
		status := classifyCatalogStatus(sourceStatus)
		if previous, ok := statusByLot[lot]; !ok {
			lotOrder = append(lotOrder, lot)
			statusByLot[lot] = status
		} else if priority[status] >= priority[previous] {
			statusByLot[lot] = status
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	lots := make([]map[string]string, 0, len(statusByLot))
	for _, lot := range lotOrder {
		lots = append(lots, map[string]string{"id": lot, "code": lot, "status": statusByLot[lot]})
	}
	return lots, nil
}

func classifyCatalogStatus(value string) string {
	status := strings.ToLower(value)
	if strings.Contains(status, "vend") {
		return "sold"
	}
	if strings.Contains(status, "reserv") {
		return "reserved"
	}
	if strings.Contains(status, "negocia") || strings.Contains(status, "proposta") || strings.Contains(status, "interesse") {
		return "negotiation"
	}
	return "available"
}

func (s *applicationService) aiStatus() map[string]any {
	configured := s.setting("NVIDIA_API_KEY") != ""
	model := s.nvidiaModel
	if s.provider == "gemini" {
		configured = s.setting("GEMINI_API_KEY") != ""
		model = s.geminiModel
	}
	return map[string]any{"provider": s.provider, "model": model, "visionModel": s.visionModel, "reasoningVisionModel": s.visionReason, "reasoningVisionEndpoint": s.reasonURL, "reasoningBudget": boundedInt(s.setting("NVIDIA_REASONING_BUDGET"), 2048, 256, 16384), "configured": configured, "supportsImages": s.provider == "nvidia" || s.provider == "gemini", "supportsImageReasoning": s.provider == "nvidia", "attachmentStorage": "local-ephemeral", "toolProtocol": "belavista-client-tools/v1", "toolCount": 13}
}

func (s *applicationService) inferenceStatus() map[string]any {
	status := s.aiStatus()
	status["protocol"] = "belavista-operational-inference/v1"
	status["endpoint"] = "/api/inference"
	status["systemModel"] = map[string]string{"id": s.modelID, "runtime": "open-jev", "role": "local-intent-router"}
	status["serverRole"] = "response-and-tool-inference"
	return status
}

func (s *applicationService) requestOrigin(r *http.Request) string {
	if s.publicOrigin != "" {
		return s.publicOrigin
	}
	host := firstHeader(r.Header.Get("X-Forwarded-Host"), r.Host, "localhost")
	proto := firstHeader(r.Header.Get("X-Forwarded-Proto"), "http")
	return proto + "://" + host
}

func (s *applicationService) setting(key string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return strings.TrimSpace(s.settings[key])
}

func firstHeader(values ...string) string {
	for _, value := range values {
		if first := strings.TrimSpace(strings.Split(value, ",")[0]); first != "" {
			return first
		}
	}
	return ""
}

func emptyToNil(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func boundedInt(value string, fallback, min, max int) int {
	var number int
	if _, err := fmt.Sscan(value, &number); err != nil || number == 0 {
		return fallback
	}
	if number < min {
		return min
	}
	if number > max {
		return max
	}
	return number
}

func writeServiceJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeServiceError(w http.ResponseWriter, status int, message string) {
	writeServiceJSON(w, status, map[string]string{"error": message})
}

func (s *applicationService) close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}
