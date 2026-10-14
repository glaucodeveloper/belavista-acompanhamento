# Belavista Wails portable desktop app

The Wails window runs the original application source, including `components.js`,
and starts its original `server.mjs` locally. The portable package places the
application source, Node.js, Python used by broker reports, and a fixed WebView2
runtime beside the executable. It does not read the source checkout, `.env`,
system `PATH`, or host API keys at runtime.

## Build a portable Windows package

Run from PowerShell on Windows with Go, Node.js/npm, and a WebView2 runtime
available on the build machine:

```powershell
.\build-portable.ps1
```

The output folder is `build/portable`. Copy that whole folder to another
Windows x64 machine and start `AliancaPark.exe`. The Wails executable uses the
bundled fixed WebView2 runtime; Node and Python are not required on the target
machine. Build-time tools are not runtime dependencies.

## Runtime data and credentials

The SQLite database, uploads, reports, logs, and local settings live under the
current Windows user's application-data directory (`%APPDATA%\Alianca Park`).
The first launch creates a persistent SQLite schema there; it does not copy or
modify the source checkout's database.
The package intentionally excludes the source checkout's `.env`, database,
uploads, and API credentials. Optional external integrations can be configured
in `config/settings.json` under that directory; use plain string values with
the corresponding upper-case setting names (for example `GEMINI_API_KEY`).
Missing external credentials disable only the integration that needs them.

The service binds to loopback on a dynamically selected port. The desktop host
waits for `/api/health` before serving the WebView and writes service output to
`logs/service.log`; it does not open a console window.
