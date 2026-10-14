package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

type desktopHost struct {
	mu         sync.Mutex
	root       string
	baseURL    *url.URL
	proxy      *httputil.ReverseProxy
	server     *exec.Cmd
	apiService *applicationService
	startupErr error
	ready      chan struct{}
	readyOnce  sync.Once
}

func main() {
	host := &desktopHost{ready: make(chan struct{})}
	webviewPath := filepath.Join(executableDir(), "resources", "webview2")
	if !directoryExists(webviewPath) {
		webviewPath = ""
	}
	err := wails.Run(&options.App{
		Title:                    "Aliança Park · Aplicação original",
		Width:                    1440,
		Height:                   920,
		MinWidth:                 960,
		MinHeight:                640,
		BackgroundColour:         &options.RGBA{R: 7, G: 19, B: 29, A: 255},
		AssetServer:              &assetserver.Options{Handler: host},
		OnStartup:                host.start,
		OnShutdown:               host.stop,
		EnableDefaultContextMenu: true,
		Windows:                  &windows.Options{WebviewBrowserPath: webviewPath},
	})
	if err != nil {
		log.Fatal(err)
	}
}

func (h *desktopHost) start(ctx context.Context) {
	if err := h.startOriginalService(ctx); err != nil {
		h.mu.Lock()
		h.startupErr = err
		h.mu.Unlock()
		log.Printf("Belavista Wails startup failed: %v", err)
	}
	h.readyOnce.Do(func() { close(h.ready) })
}

func (h *desktopHost) startOriginalService(ctx context.Context) error {
	root, err := sourceRoot()
	if err != nil {
		return err
	}
	node, err := nodeExecutable()
	if err != nil {
		return err
	}
	appData, err := applicationDataRoot()
	if err != nil {
		return err
	}
	dataRoot := filepath.Join(appData, "data")
	configRoot := filepath.Join(appData, "config")
	logRoot := filepath.Join(appData, "logs")
	for _, dir := range []string{dataRoot, configRoot, logRoot} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return fmt.Errorf("create application data directory: %w", err)
		}
	}
	port, err := availableLoopbackPort()
	if err != nil {
		return fmt.Errorf("reserve local service port: %w", err)
	}

	target, err := url.Parse(fmt.Sprintf("http://127.0.0.1:%d", port))
	if err != nil {
		return fmt.Errorf("build local service URL: %w", err)
	}
	serviceLog, err := os.OpenFile(filepath.Join(logRoot, "service.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return fmt.Errorf("open application service log: %w", err)
	}
	cmd := exec.CommandContext(ctx, node, filepath.Join(root, "server.mjs"))
	cmd.Dir = root
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	cmd.Env = childEnvironment(map[string]string{
		"PORT":                        fmt.Sprint(port),
		"HOST":                        "127.0.0.1",
		"PUBLIC_ORIGIN":               target.String(),
		"BELAVISTA_FRONTEND_ROOT":     root,
		"BELAVISTA_DATA_ROOT":         dataRoot,
		"BELAVISTA_CONFIG_ROOT":       configRoot,
		"BELAVISTA_PYTHON_EXECUTABLE": filepath.Join(root, "runtime", "python", "python.exe"),
		"PATH":                        runtimePath(node, filepath.Join(root, "runtime", "python")),
	})
	cmd.Stdout = serviceLog
	cmd.Stderr = serviceLog
	if err := cmd.Start(); err != nil {
		_ = serviceLog.Close()
		return fmt.Errorf("start original Node service: %w", err)
	}

	h.mu.Lock()
	h.server = cmd
	h.mu.Unlock()
	go func() {
		if err := cmd.Wait(); err != nil && ctx.Err() == nil {
			log.Printf("Original Belavista service exited: %v", err)
		}
		_ = serviceLog.Close()
		h.mu.Lock()
		if h.server == cmd {
			h.server = nil
		}
		h.mu.Unlock()
	}()

	client := &http.Client{Timeout: 1500 * time.Millisecond}
	for attempt := 0; attempt < 80; attempt++ {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		response, requestErr := client.Get(target.String() + "/api/health")
		if requestErr == nil {
			_, _ = io.Copy(io.Discard, response.Body)
			_ = response.Body.Close()
			if response.StatusCode == http.StatusOK {
				apiService, serviceErr := newApplicationService(dataRoot, configRoot)
				if serviceErr != nil {
					return fmt.Errorf("initialize Go application service: %w", serviceErr)
				}
				if err := apiService.setListenAddress(target.Hostname(), target.Port()); err != nil {
					_ = apiService.close()
					return err
				}
				h.mu.Lock()
				h.root = root
				h.baseURL = target
				h.proxy = newOriginalProxy(target)
				h.apiService = apiService
				h.mu.Unlock()
				return nil
			}
		}
		time.Sleep(250 * time.Millisecond)
	}
	return fmt.Errorf("the original service did not become healthy at %s/api/health", target)
}

func (h *desktopHost) stop(context.Context) {
	h.mu.Lock()
	cmd := h.server
	h.server = nil
	apiService := h.apiService
	h.apiService = nil
	h.mu.Unlock()
	if err := apiService.close(); err != nil {
		log.Printf("Close Go application service: %v", err)
	}
	if cmd != nil && cmd.Process != nil {
		if err := cmd.Process.Kill(); err != nil && !strings.Contains(strings.ToLower(err.Error()), "already finished") {
			log.Printf("Stop original Belavista service: %v", err)
		}
	}
}

func (h *desktopHost) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h.ready != nil {
		select {
		case <-h.ready:
		case <-r.Context().Done():
			return
		}
	}
	h.mu.Lock()
	proxy, startupErr, apiService := h.proxy, h.startupErr, h.apiService
	h.mu.Unlock()
	if apiService != nil && apiService.handles(r.URL.Path) {
		apiService.ServeHTTP(w, r)
		return
	}
	if startupErr != nil {
		http.Error(w, "Belavista Wails could not start the original application service: "+startupErr.Error(), http.StatusServiceUnavailable)
		return
	}
	if proxy == nil {
		http.Error(w, "Belavista Wails is waiting for the original application service.", http.StatusServiceUnavailable)
		return
	}
	proxy.ServeHTTP(w, r)
}

func sourceRoot() (string, error) {
	candidates := []string{}
	if executable, err := os.Executable(); err == nil {
		dir := filepath.Dir(executable)
		candidates = append(candidates,
			filepath.Join(dir, "resources", "app"),
			filepath.Join(dir, "..", "..", ".."),
			filepath.Join(dir, "resources", "app"),
			filepath.Join(dir, "..", "resources", "app"),
		)
	}
	candidates = append(candidates, os.Getenv("BELAVISTA_SOURCE_ROOT"))
	if _, sourceFile, _, ok := runtime.Caller(0); ok {
		candidates = append(candidates, filepath.Join(filepath.Dir(sourceFile), "..", ".."))
	}
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		root, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if fileExists(filepath.Join(root, "server.mjs")) && fileExists(filepath.Join(root, "index.html")) {
			return root, nil
		}
	}
	return "", fmt.Errorf("cannot locate the original Belavista source (server.mjs and index.html); set BELAVISTA_SOURCE_ROOT")
}

func nodeExecutable() (string, error) {
	if executable, err := os.Executable(); err == nil {
		bundled := filepath.Join(filepath.Dir(executable), "resources", "node", "node.exe")
		if fileExists(bundled) {
			return bundled, nil
		}
	}
	if configured := strings.TrimSpace(os.Getenv("BELAVISTA_NODE_EXECUTABLE")); configured != "" {
		if fileExists(configured) {
			return configured, nil
		}
		return "", fmt.Errorf("BELAVISTA_NODE_EXECUTABLE does not point to a file: %s", configured)
	}
	path, err := exec.LookPath("node")
	if err != nil {
		return "", fmt.Errorf("Node.js is required to run the original server.mjs: %w", err)
	}
	return path, nil
}

func availableLoopbackPort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port, nil
}

func applicationDataRoot() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve per-user application data directory: %w", err)
	}
	return filepath.Join(base, "Alianca Park"), nil
}

func executableDir() string {
	executable, err := os.Executable()
	if err != nil {
		return "."
	}
	return filepath.Dir(executable)
}

func directoryExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func newOriginalProxy(target *url.URL) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)
	director := proxy.Director
	proxy.Director = func(request *http.Request) {
		director(request)
		// The WebView's custom origin is not a loopback hostname. Present the
		// loopback service host upstream so the original local-auth policy keeps
		// recognizing this as the same local application.
		request.Host = target.Host
	}
	return proxy
}

func childEnvironment(overrides map[string]string) []string {
	values := make(map[string]string, len(overrides)+4)
	for _, key := range []string{"SystemRoot", "WINDIR", "TEMP", "TMP"} {
		if value := os.Getenv(key); value != "" {
			values[key] = value
		}
	}
	for key, value := range overrides {
		values[key] = value
	}
	result := make([]string, 0, len(values))
	for key, value := range values {
		result = append(result, key+"="+value)
	}
	return result
}

func runtimePath(node, pythonDir string) string {
	paths := []string{filepath.Dir(node), pythonDir}
	if systemRoot := os.Getenv("SystemRoot"); systemRoot != "" {
		paths = append(paths, filepath.Join(systemRoot, "System32"))
	}
	if windir := os.Getenv("WINDIR"); windir != "" {
		paths = append(paths, filepath.Join(windir, "System32"))
	}
	seen := make(map[string]struct{}, len(paths))
	unique := paths[:0]
	for _, path := range paths {
		if path == "" {
			continue
		}
		key := strings.ToLower(filepath.Clean(path))
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		unique = append(unique, path)
	}
	return strings.Join(unique, string(os.PathListSeparator))
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
