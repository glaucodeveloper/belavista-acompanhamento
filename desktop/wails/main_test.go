package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestSourceRootResolvesOriginalComponentsApplication(t *testing.T) {
	root, err := sourceRoot()
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"server.mjs", "index.html", "components.js"} {
		if !fileExists(filepath.Join(root, name)) {
			t.Fatalf("source root is missing %s", name)
		}
	}
	content, err := os.ReadFile(filepath.Join(root, "components", "shared", "application-elements-registration-v1.mjs"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(content), "customElementsRef.define") {
		t.Fatal("the component package does not register the original custom elements")
	}
}

func TestChildEnvironmentContainsOnlyRuntimeAndSystemSettings(t *testing.T) {
	result := childEnvironment(map[string]string{
		"HOST": "127.0.0.1",
		"PORT": "49152",
	})
	values := make(map[string]string)
	for _, item := range result {
		key, value, _ := strings.Cut(item, "=")
		values[key] = value
	}
	if values["HOST"] != "127.0.0.1" || values["PORT"] != "49152" {
		t.Fatalf("unexpected child environment: %#v", values)
	}
	if _, inherited := values["PATH"]; inherited {
		t.Fatalf("the child must use its bundled runtime instead of the system PATH: %#v", values)
	}
}

func TestWailsAssetHandlerProxiesOriginalHTTPMethodsAndPaths(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/health" || r.Method != http.MethodGet {
			t.Errorf("unexpected proxied request: %s %s", r.Method, r.URL.Path)
		}
		if r.Host != "127.0.0.1" && !strings.HasPrefix(r.Host, "127.0.0.1:") {
			t.Errorf("upstream host is not loopback: %s", r.Host)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, "original-service")
	}))
	defer backend.Close()

	target, err := url.Parse(backend.URL)
	if err != nil {
		t.Fatal(err)
	}
	host := &desktopHost{proxy: newOriginalProxy(target)}
	recorder := httptest.NewRecorder()
	host.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if recorder.Code != http.StatusOK || recorder.Body.String() != "original-service" {
		t.Fatalf("proxy returned %d %q", recorder.Code, recorder.Body.String())
	}
}

func TestAssetHandlerWaitsForServiceInsteadOfRenderingStartupPlaceholder(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "original-app")
	}))
	defer backend.Close()

	target, err := url.Parse(backend.URL)
	if err != nil {
		t.Fatal(err)
	}
	ready := make(chan struct{})
	host := &desktopHost{ready: ready, proxy: newOriginalProxy(target)}
	recorder := httptest.NewRecorder()
	done := make(chan struct{})
	go func() {
		host.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))
		close(done)
	}()

	select {
	case <-done:
		t.Fatal("handler returned before the original service was ready")
	case <-time.After(20 * time.Millisecond):
	}
	close(ready)
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("handler did not resume after service readiness")
	}
	if recorder.Code != http.StatusOK || recorder.Body.String() != "original-app" {
		t.Fatalf("unexpected response after startup: %d %q", recorder.Code, recorder.Body.String())
	}
}

func TestGoServiceRoutesPreserveReadOnlyContracts(t *testing.T) {
	service := &applicationService{}
	for _, path := range []string{"/api/health", "/api/runtime", "/api/entities", "/api/public/catalog"} {
		if !service.handles(path) {
			t.Errorf("Go service does not own %s", path)
		}
	}
	if service.handles("/api/records") {
		t.Fatal("unported write-capable route must remain on the compatibility service")
	}
	if err := service.setListenAddress("127.0.0.1", "52341"); err != nil || service.host != "127.0.0.1" || service.port != 52341 {
		t.Fatalf("local service address was not preserved: host=%q port=%d err=%v", service.host, service.port, err)
	}
	if err := service.setListenAddress("127.0.0.1", "0"); err == nil {
		t.Fatal("runtime must not report a fake or unbound service port")
	}
	for input, expected := range map[string]string{
		"Vendido": "sold", "Reservado": "reserved", "Em negociação": "negotiation", "Disponível": "available",
	} {
		if got := classifyCatalogStatus(input); got != expected {
			t.Errorf("classifyCatalogStatus(%q) = %q, want %q", input, got, expected)
		}
	}
}

func TestGoServiceReadsTheConfiguredRealDatabase(t *testing.T) {
	appData, err := applicationDataRoot()
	if err != nil {
		t.Skipf("application data root is unavailable: %v", err)
	}
	dataRoot := filepath.Join(appData, "data")
	databasePath := filepath.Join(dataRoot, "belavista.sqlite")
	if !fileExists(databasePath) {
		t.Skip("real application database is not present on this machine")
	}
	service, err := newApplicationService(dataRoot, filepath.Join(appData, "config"))
	if err != nil {
		t.Fatal(err)
	}
	defer service.close()
	response := httptest.NewRecorder()
	service.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("health returned %d: %s", response.Code, response.Body.String())
	}
	var payload struct {
		OK       bool             `json:"ok"`
		Database string           `json:"database"`
		Entities map[string]int64 `json:"entities"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if !payload.OK || payload.Database != "sqlite" || payload.Entities["records"] < 0 {
		t.Fatalf("unexpected health response from real database: %#v", payload)
	}
	if err := service.setListenAddress("127.0.0.1", "52341"); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/api/runtime", "/api/entities", "/api/public/catalog"} {
		response := httptest.NewRecorder()
		service.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusOK {
			t.Errorf("%s returned %d: %s", path, response.Code, response.Body.String())
		}
	}
}
