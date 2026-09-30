use std::{
    collections::HashMap,
    env,
    fs,
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tao::{
    dpi::LogicalSize as TaoLogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::WindowBuilder,
};
use wry::{
    dpi::{LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize},
    Rect, WebContext, WebView, WebViewBuilder,
};

#[derive(Debug, Clone)]
enum HostEvent {
    ShowLoading,
    ShowMain,
    ShowError,
    Hide,
    WebViewContentUpsert(WebViewContentRequest),
    WebViewContentRemove(String),
    BrowserSnapshot {
        request_id: String,
        id: String,
    },
    BrowserSnapshotResult {
        request_id: String,
        result: String,
    },
    BrowserAction(BrowserActionRequest),
    BrowserActionResult {
        request_id: String,
        result: String,
    },
    ClientGov(ClientGovRequest),
    ClientGovResult {
        request_id: String,
        result: String,
    },
    ModelComplete(ModelCompleteRequest),
    ModelCompleteResult {
        request_id: String,
        result: String,
    },
}

#[derive(Debug, Clone)]
struct WebViewContentRequest {
    id: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    visible: bool,
}

struct ChildWebView {
    webview: WebView,
    url: String,
}

#[derive(Debug, Clone)]
struct BrowserActionRequest {
    request_id: String,
    id: String,
    action: String,
    target: Option<String>,
    text: Option<String>,
    url: Option<String>,
}

#[derive(Debug, Clone)]
struct ClientGovRequest {
    request_id: String,
    op: String,
    client_id: String,
    field: Option<String>,
    value: Option<String>,
    browser_id: Option<String>,
    target: Option<String>,
}

#[derive(Debug, Clone)]
struct ModelCompleteRequest {
    request_id: String,
    endpoint: String,
    timeout_ms: u64,
    payload: String,
}
fn content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|ext| ext.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "html" => "text/html; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "wasm" => "application/wasm",
        "json" => "application/json; charset=utf-8",
        "rb" | "txt" => "text/plain; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

fn write_response(mut stream: TcpStream, status: &str, mime: &str, body: &[u8], head_only: bool) {
    let headers = format!(
        "HTTP/1.1 {status}\r\n\
         Content-Type: {mime}\r\n\
         Content-Length: {}\r\n\
         Cache-Control: no-store\r\n\
         Cross-Origin-Opener-Policy: same-origin\r\n\
         Cross-Origin-Embedder-Policy: require-corp\r\n\
         Cross-Origin-Resource-Policy: same-origin\r\n\
         X-Content-Type-Options: nosniff\r\n\
         Connection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(headers.as_bytes());
    if !head_only {
        let _ = stream.write_all(body);
    }
    let _ = stream.flush();
}

fn handle_request(mut stream: TcpStream, root: &Path) {
    let mut buf = [0_u8; 16 * 1024];
    let read = match stream.read(&mut buf) {
        Ok(0) | Err(_) => return,
        Ok(n) => n,
    };
    let request = String::from_utf8_lossy(&buf[..read]);
    let line = request.lines().next().unwrap_or("");
    let mut parts = line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let raw_target = parts.next().unwrap_or("/");
    let head_only = method.eq_ignore_ascii_case("HEAD");

    if !method.eq_ignore_ascii_case("GET") && !head_only {
        write_response(stream, "405 Method Not Allowed", "text/plain; charset=utf-8", b"method not allowed", false);
        return;
    }

    let target = raw_target.split('?').next().unwrap_or("/");
    let relative = target.trim_start_matches('/');
    if relative.split('/').any(|segment| segment == "..") || relative.contains('\\') {
        write_response(stream, "403 Forbidden", "text/plain; charset=utf-8", b"forbidden", head_only);
        return;
    }

    let relative = if relative.is_empty() { "index.html" } else { relative };
    let path = root.join(relative);
    match fs::read(&path) {
        Ok(bytes) => write_response(stream, "200 OK", content_type(&path), &bytes, head_only),
        Err(_) => write_response(stream, "404 Not Found", "text/plain; charset=utf-8", b"not found", head_only),
    }
}

fn fnv1a32(text: &str) -> u32 {
    let mut hash = 0x811c9dc5_u32;
    for byte in text.as_bytes() {
        hash ^= *byte as u32;
        hash = hash.wrapping_mul(0x01000193);
    }
    hash
}

fn sanitize_identity(value: &str) -> String {
    let value = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.') {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();

    let trimmed = value.trim_matches('-');
    if trimmed.is_empty() {
        "application".to_string()
    } else {
        trimmed.chars().take(80).collect()
    }
}

fn app_identity(root: &Path) -> String {
    if let Ok(explicit) = env::var("GLAUCO_APP_ID") {
        let explicit = explicit.trim();
        if !explicit.is_empty() {
            return sanitize_identity(explicit);
        }
    }

    let root_text = root.to_string_lossy();
    format!("app-{:08x}", fnv1a32(&root_text))
}

fn persistent_webview_data_dir(identity: &str) -> PathBuf {
    #[cfg(target_os = "windows")]
    let base = env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(env::temp_dir);

    #[cfg(target_os = "macos")]
    let base = env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| home.join("Library").join("Application Support"))
        .unwrap_or_else(env::temp_dir);

    #[cfg(all(unix, not(target_os = "macos")))]
    let base = env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            env::var_os("HOME")
                .map(PathBuf::from)
                .map(|home| home.join(".local").join("share"))
        })
        .unwrap_or_else(env::temp_dir);

    base.join("GlaucoRuby").join("WebView").join(identity)
}

fn preferred_port(identity: &str) -> u16 {
    if let Ok(raw) = env::var("GLAUCO_WEBVIEW_PORT") {
        if let Ok(port) = raw.parse::<u16>() {
            if port >= 1024 {
                return port;
            }
        }
    }

    24000 + (fnv1a32(identity) % 18000) as u16
}

fn start_static_server(root: PathBuf, identity: &str) -> String {
    let preferred = preferred_port(identity);

    let mut selected = None;
    for offset in 0_u16..32 {
        let port = preferred.saturating_add(offset);
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            selected = Some(listener);
            break;
        }
    }

    let listener = selected.expect(
        "failed to bind a stable local Ruby frontend port; set GLAUCO_WEBVIEW_PORT to a free port",
    );
    let address = listener.local_addr().expect("failed to read local server address");

    thread::spawn(move || {
        for incoming in listener.incoming() {
            match incoming {
                Ok(stream) => {
                    let root = root.clone();
                    thread::spawn(move || handle_request(stream, &root));
                }
                Err(error) => eprintln!("[ruby-webview-host] local server error: {error}"),
            }
        }
    });

    format!("http://127.0.0.1:{}/", address.port())
}

fn frontend_root(argument: Option<String>) -> PathBuf {
    let requested = argument.map(PathBuf::from).unwrap_or_else(|| PathBuf::from("web/dist/index.html"));
    let requested = requested.canonicalize().expect("frontend path not found; run npm run build first");
    if requested.is_dir() {
        requested
    } else {
        requested.parent().expect("frontend index has no parent directory").to_path_buf()
    }
}

fn full_bounds(width: u32, height: u32) -> Rect {
    Rect {
        position: PhysicalPosition::new(0, 0).into(),
        size: PhysicalSize::new(width.max(1), height.max(1)).into(),
    }
}

fn fit_webview(webview: &WebView, width: u32, height: u32) {
    if let Err(error) = webview.set_bounds(full_bounds(width, height)) {
        eprintln!("[ruby-webview-host] set_bounds failed: {error}");
    }
}

fn expose_webview(webview: &WebView, width: u32, height: u32) {
    fit_webview(webview, width, height);
    if let Err(error) = webview.set_visible(true) {
        eprintln!("[ruby-webview-host] set_visible(true) failed: {error}");
    }
    if let Ok(bounds) = webview.bounds() {
        println!("[ruby-webview-host] webview bounds: {bounds:?}");
    }
    if let Ok(url) = webview.url() {
        println!("[ruby-webview-host] webview url: {url}");
    }
}


fn logical_bounds(request: &WebViewContentRequest) -> Rect {
    Rect {
        position: LogicalPosition::new(request.x, request.y).into(),
        size: LogicalSize::new(request.width.max(1.0), request.height.max(1.0)).into(),
    }
}

fn parse_webview_content_request(encoded: &str) -> Option<WebViewContentRequest> {
    let values = url::form_urlencoded::parse(encoded.as_bytes())
        .into_owned()
        .collect::<HashMap<String, String>>();

    let id = values.get("id")?.trim().to_string();
    let target_url = values.get("url")?.trim().to_string();

    if id.is_empty() || target_url.is_empty() {
        return None;
    }

    let number = |name: &str| -> f64 {
        values
            .get(name)
            .and_then(|value| value.parse::<f64>().ok())
            .filter(|value| value.is_finite())
            .unwrap_or(0.0)
    };

    Some(WebViewContentRequest {
        id,
        url: target_url,
        x: number("x"),
        y: number("y"),
        width: number("width"),
        height: number("height"),
        visible: values.get("visible").map(String::as_str) == Some("1"),
    })
}

fn update_child_webview(child: &mut ChildWebView, request: &WebViewContentRequest) {
    if child.url != request.url {
        match child.webview.load_url(&request.url) {
            Ok(()) => {
                child.url = request.url.clone();
                println!(
                    "[ruby-webview-host] WebViewContent {} navigate {}",
                    request.id, request.url
                );
            }
            Err(error) => eprintln!(
                "[ruby-webview-host] WebViewContent {} navigation failed: {}",
                request.id, error
            ),
        }
    }

    if let Err(error) = child.webview.set_bounds(logical_bounds(request)) {
        eprintln!(
            "[ruby-webview-host] WebViewContent {} set_bounds failed: {}",
            request.id, error
        );
    }

    if let Err(error) = child.webview.set_visible(request.visible) {
        eprintln!(
            "[ruby-webview-host] WebViewContent {} set_visible failed: {}",
            request.id, error
        );
    }
}


fn query_values(encoded: &str) -> HashMap<String, String> {
    url::form_urlencoded::parse(encoded.as_bytes())
        .into_owned()
        .collect::<HashMap<String, String>>()
}

fn parse_browser_snapshot_request(encoded: &str) -> Option<(String, String)> {
    let values = query_values(encoded);
    let request_id = values.get("requestId")?.trim().to_string();
    let id = values.get("id")?.trim().to_string();

    if request_id.is_empty() || id.is_empty() {
        return None;
    }

    Some((request_id, id))
}

fn parse_browser_action_request(encoded: &str) -> Option<BrowserActionRequest> {
    let values = query_values(encoded);
    let request_id = values.get("requestId")?.trim().to_string();
    let id = values.get("id")?.trim().to_string();
    let action = values.get("action")?.trim().to_string();

    if request_id.is_empty() || id.is_empty() || action.is_empty() {
        return None;
    }

    Some(BrowserActionRequest {
        request_id,
        id,
        action,
        target: values.get("target").cloned().filter(|value| !value.is_empty()),
        text: values.get("text").cloned(),
        url: values.get("url").cloned().filter(|value| !value.is_empty()),
    })
}

fn js_string_literal(value: &str) -> String {
    let mut out = String::with_capacity(value.len() + 2);
    out.push('"');

    for ch in value.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{2028}' => out.push_str("\\u2028"),
            '\u{2029}' => out.push_str("\\u2029"),
            c if c.is_control() => {
                use std::fmt::Write as _;
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }

    out.push('"');
    out
}

fn parent_bridge_callback(method: &str, request_id: &str, result: &str) -> String {
    format!(
        "globalThis.RubyNativeWebViewContent?.{}({}, {});",
        method,
        js_string_literal(request_id),
        js_string_literal(result)
    )
}

fn browser_snapshot_script() -> &'static str {
    r#"
(() => {
  const clean = (value, max = 180) =>
    String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

  const visible = (element) => {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number(style.opacity || '1') <= 0
    ) return false;

    const rect = element.getBoundingClientRect();
    return rect.width >= 2 && rect.height >= 2;
  };

  const selector = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[contenteditable="true"]'
  ].join(',');

  const nodes = [...document.querySelectorAll(selector)]
    .filter(visible)
    .slice(0, 48);

  const elements = nodes.map((element, index) => {
    const id = `e${index}`;
    element.setAttribute('data-ruby-jev-id', id);

    const tag = element.tagName.toLowerCase();
    const role =
      element.getAttribute('role') ||
      (tag === 'a' ? 'link' :
       tag === 'button' ? 'button' :
       tag === 'input' || tag === 'textarea' ? 'input' :
       tag === 'select' ? 'select' :
       element.isContentEditable ? 'editable' :
       tag);

    const inputType = tag === 'input'
      ? String(element.getAttribute('type') || 'text').toLowerCase()
      : '';

    const editable =
      tag === 'textarea' ||
      tag === 'select' ||
      element.isContentEditable ||
      (
        tag === 'input' &&
        !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color']
          .includes(inputType)
      );

    const clickable =
      tag === 'a' ||
      tag === 'button' ||
      ['button', 'link'].includes(String(element.getAttribute('role') || '').toLowerCase()) ||
      ['button', 'submit', 'reset', 'checkbox', 'radio', 'image'].includes(inputType);

    const semanticText = clean(
      `${element.innerText || ''} ${element.textContent || ''}`,
      700
    ).toLowerCase();

    const unread =
      /\bunread\b/.test(semanticText) ||
      semanticText.includes('nÃ£o lida') ||
      semanticText.includes('nao lida') ||
      semanticText.includes('nÃ£o lido') ||
      semanticText.includes('nao lido');

    return {
      id,
      tag,
      role,
      type: inputType,
      text: clean(
        element.innerText ||
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.value ||
        element.getAttribute('placeholder')
      ),
      ariaLabel: clean(element.getAttribute('aria-label')),
      placeholder: clean(element.getAttribute('placeholder') || element.getAttribute('aria-placeholder')),
      ariaPlaceholder: clean(element.getAttribute('aria-placeholder')),
      value: clean(element.isContentEditable ? (element.innerText || element.textContent) : element.value, 240),
      href: clean(element.href, 320),
      editable,
      clickable,
      unread
    };
  });

  const messageArticles = [
    ...document.querySelectorAll(
      '[role="article"][aria-roledescription="message"]'
    )
  ]
    .filter(visible)
    .slice(-40);

  const messageAuthor = (article) => {
    const group =
      article.closest('[role="group"][tabindex="-1"]') ||
      article.closest('[role="group"]') ||
      article.parentElement;

    const labels = [
      ...(group?.querySelectorAll?.('[aria-label]') || [])
    ]
      .map((node) => String(node.getAttribute('aria-label') || ''))
      .filter(Boolean);

    for (const label of labels) {
      const match = label.match(
        /(?:mensagem de|message from)\s+(.+?)\s*$/i
      );

      if (match?.[1]) return clean(match[1], 80);
    }

    return null;
  };

  const messages = messageArticles.map((article, index) => ({
    index,
    author: messageAuthor(article),
    text: clean(article.innerText || article.textContent || '', 1200),
  }));

  const externalProfiles = new Set(
    [...document.querySelectorAll('a[aria-label]')]
      .map((link) => String(link.getAttribute('aria-label') || ''))
      .map((label) => {
        const match = label.match(
          /(?:profile page of|perfil de)\s+(.+?)\s*$/i
        );
        return match?.[1] ? clean(match[1], 80) : null;
      })
      .filter(Boolean)
  );

  const messageAuthors = [
    ...new Set(messages.map((message) => message.author).filter(Boolean))
  ];

  const selfCandidates = messageAuthors.filter(
    (author) => !externalProfiles.has(author)
  );

  const instagramSelf =
    selfCandidates.length
      ? selfCandidates[selfCandidates.length - 1]
      : null;

  return JSON.stringify({
    ok: true,
    url: location.href,
    title: document.title,
    text: clean(document.body?.innerText || '', 4200),
    activeTag: document.activeElement?.tagName?.toLowerCase() || null,
    instagramSelf,
    messages,
    elements
  });
})()
"#
}

fn browser_dom_action_script(request: &BrowserActionRequest) -> Option<String> {
    let action = request.action.as_str();

    let scroll_script = match action {
        "scroll_down" => Some(
            "window.scrollBy({top: Math.max(window.innerHeight * 0.8, 420), behavior: 'auto'});"
        ),
        "scroll_up" => Some(
            "window.scrollBy({top: -Math.max(window.innerHeight * 0.8, 420), behavior: 'auto'});"
        ),
        "scroll_top" => Some("window.scrollTo({top: 0, behavior: 'auto'});"),
        "scroll_bottom" => Some(
            "window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'auto'});"
        ),
        _ => None,
    };

    if let Some(script) = scroll_script {
        return Some(format!(
            "(() => {{ {} return JSON.stringify({{ok:true, action:{}}}); }})()",
            script,
            js_string_literal(action)
        ));
    }

    let target = request.target.as_deref()?;
    let target_js = js_string_literal(target);

    match action {
        "click" => Some(format!(
            r#"(() => {{
  const element = document.querySelector(`[data-ruby-jev-id="${{String({target})}}"]`);
  if (!element) return JSON.stringify({{ok:false,error:"target not found"}});
  element.scrollIntoView({{block:"center",inline:"nearest"}});
  element.focus?.();
  element.click();
  return JSON.stringify({{ok:true,action:"click",target:{target}}});
}})()"#,
            target = target_js,
        )),
        "focus" => Some(format!(
            r#"(() => {{
  const element = document.querySelector(`[data-ruby-jev-id="${{String({target})}}"]`);
  if (!element) return JSON.stringify({{ok:false,error:"target not found"}});
  element.scrollIntoView({{block:"center",inline:"nearest"}});
  element.focus?.();
  return JSON.stringify({{ok:true,action:"focus",target:{target}}});
}})()"#,
            target = target_js,
        )),
        "type" => {
            let text = request.text.as_deref().unwrap_or("");
            let text_js = js_string_literal(text);
            Some(format!(
                r#"(() => {{
  const element = document.querySelector(`[data-ruby-jev-id="${{String({target})}}"]`);
  if (!element) return JSON.stringify({{ok:false,error:"target not found"}});
  element.scrollIntoView({{block:"center",inline:"nearest"}});
  element.focus?.();

  const value = {text};
  if (element.isContentEditable) {{
    element.focus?.();

    const selection = window.getSelection?.();
    if (selection) {{
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }}

    let inserted = false;
    try {{
      inserted = document.execCommand?.('insertText', false, value) === true;
    }} catch {{
      inserted = false;
    }}

    if (!inserted) {{
      element.textContent = value;
      element.dispatchEvent(
        new InputEvent('input', {{
          bubbles: true,
          inputType: 'insertText',
          data: value,
        }})
      );
    }}
  }} else if ('value' in element) {{
    const proto =
      element.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : element.tagName === 'SELECT'
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
  }}

  element.dispatchEvent(new Event('input', {{bubbles:true}}));
  element.dispatchEvent(new Event('change', {{bubbles:true}}));

  return JSON.stringify({{ok:true,action:"type",target:{target},text:value}});
}})()"#,
                target = target_js,
                text = text_js,
            ))
        }
        "press_enter" => Some(format!(
            r#"(() => {{
  const element = document.querySelector(`[data-ruby-jev-id="${{String({target})}}"]`);
  if (!element) return JSON.stringify({{ok:false,error:"target not found"}});
  element.focus?.();

  const down = new KeyboardEvent('keydown', {{
    key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true, cancelable:true
  }});
  const allowed = element.dispatchEvent(down);

  if (allowed && element.form?.requestSubmit) {{
    element.form.requestSubmit();
  }}

  element.dispatchEvent(new KeyboardEvent('keyup', {{
    key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true
  }}));

  return JSON.stringify({{ok:true,action:"press_enter",target:{target}}});
}})()"#,
            target = target_js,
        )),
        _ => None,
    }
}


fn parse_client_gov_request(encoded: &str) -> Option<ClientGovRequest> {
    let values = query_values(encoded);

    let request_id = values.get("requestId")?.trim().to_string();
    let op = values.get("op")?.trim().to_string();
    let client_id = values.get("clientId")?.trim().to_string();

    if request_id.is_empty() || op.is_empty() || client_id.is_empty() {
        return None;
    }

    Some(ClientGovRequest {
        request_id,
        op,
        client_id,
        field: values.get("field").cloned().filter(|value| !value.is_empty()),
        value: values.get("value").cloned(),
        browser_id: values.get("browserId").cloned().filter(|value| !value.is_empty()),
        target: values.get("target").cloned().filter(|value| !value.is_empty()),
    })
}

fn safe_client_id(value: &str) -> Option<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() || trimmed.len() > 96 {
        return None;
    }

    if trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
    {
        Some(trimmed.to_string())
    } else {
        None
    }
}

fn safe_credential_field(value: &str) -> Option<&'static str> {
    match value {
        "login" => Some("login"),
        "password" => Some("password"),
        _ => None,
    }
}

fn client_gov_root() -> PathBuf {
    let base = env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(env::temp_dir);

    base.join("GlaucoRuby")
        .join("ClientGovBR")
        .join("clients")
}

fn ensure_client_folder(client_id: &str) -> Result<PathBuf, String> {
    let client_id =
        safe_client_id(client_id).ok_or_else(|| "invalid client id".to_string())?;

    let root = client_gov_root().join(client_id);

    for child in ["documentos", "downloads", "protocolos", "comprovantes"] {
        fs::create_dir_all(root.join(child))
            .map_err(|error| format!("failed to create client folder: {error}"))?;
    }

    Ok(root)
}

fn open_client_folder(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg(path)
            .spawn()
            .map_err(|error| format!("failed to open Explorer: {error}"))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|error| format!("failed to open Finder: {error}"))?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| format!("failed to open file manager: {error}"))?;
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err("opening folders is unsupported on this platform".to_string())
}

fn credential_account(client_id: &str, field: &str) -> Result<String, String> {
    let client_id =
        safe_client_id(client_id).ok_or_else(|| "invalid client id".to_string())?;
    let field =
        safe_credential_field(field).ok_or_else(|| "invalid credential field".to_string())?;

    Ok(format!("{client_id}:{field}"))
}

#[cfg(target_os = "windows")]
fn credential_entry(client_id: &str, field: &str) -> Result<keyring::Entry, String> {
    let account = credential_account(client_id, field)?;
    keyring::Entry::new("glauco-client-govbr", &account)
        .map_err(|error| format!("credential store error: {error}"))
}

#[cfg(target_os = "windows")]
fn credential_set(client_id: &str, field: &str, value: &str) -> Result<(), String> {
    credential_entry(client_id, field)?
        .set_password(value)
        .map_err(|error| format!("failed to save credential: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn credential_set(_client_id: &str, _field: &str, _value: &str) -> Result<(), String> {
    Err("secure client credential storage is currently enabled for Windows desktop".to_string())
}

#[cfg(target_os = "windows")]
fn credential_get(client_id: &str, field: &str) -> Result<String, String> {
    credential_entry(client_id, field)?
        .get_password()
        .map_err(|error| format!("failed to read credential: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn credential_get(_client_id: &str, _field: &str) -> Result<String, String> {
    Err("secure client credential storage is currently enabled for Windows desktop".to_string())
}

#[cfg(target_os = "windows")]
fn credential_has(client_id: &str, field: &str) -> bool {
    credential_get(client_id, field).is_ok()
}

#[cfg(not(target_os = "windows"))]
fn credential_has(_client_id: &str, _field: &str) -> bool {
    false
}

#[cfg(target_os = "windows")]
fn credential_delete(client_id: &str, field: &str) -> Result<(), String> {
    let entry = credential_entry(client_id, field)?;

    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("failed to delete credential: {error}")),
    }
}

#[cfg(not(target_os = "windows"))]
fn credential_delete(_client_id: &str, _field: &str) -> Result<(), String> {
    Err("secure client credential storage is currently enabled for Windows desktop".to_string())
}

fn client_gov_callback(request_id: &str, result: &str) -> String {
    format!(
        "globalThis.RubyClientGovBridge?.resolve({}, {});",
        js_string_literal(request_id),
        js_string_literal(result)
    )
}

fn client_gov_ok() -> String {
    "{\"ok\":true}".to_string()
}

fn client_gov_error(error: impl AsRef<str>) -> String {
    format!(
        "{{\"ok\":false,\"error\":{}}}",
        js_string_literal(error.as_ref())
    )
}

fn credential_fill_script(target: &str, secret: &str) -> String {
    let target = js_string_literal(target);
    let secret = js_string_literal(secret);

    format!(
        r#"(() => {{
  const targetId = {target};
  const element = document.querySelector(`[data-ruby-jev-id="${{String(targetId)}}"]`);

  if (!element) {{
    return JSON.stringify({{ok:false,error:"credential target not found"}});
  }}

  const value = {secret};

  element.scrollIntoView({{block:"center",inline:"nearest"}});
  element.focus?.();

  if (element.isContentEditable) {{
    element.textContent = value;
  }} else if ('value' in element) {{
    const tag = element.tagName;
    const proto =
      tag === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : tag === 'SELECT'
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;

    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
  }} else {{
    return JSON.stringify({{ok:false,error:"credential target is not editable"}});
  }}

  element.dispatchEvent(new Event('input', {{bubbles:true}}));
  element.dispatchEvent(new Event('change', {{bubbles:true}}));

  return JSON.stringify({{ok:true,target:targetId}});
}})()"#,
        target = target,
        secret = secret,
    )
}

fn parse_model_complete_request(encoded: &str) -> Option<ModelCompleteRequest> {
    let values = query_values(encoded);

    let request_id = values.get("requestId")?.trim().to_string();
    let endpoint = values.get("endpoint")?.trim().to_string();
    let payload = values.get("payload")?.to_string();

    if request_id.is_empty() || endpoint.is_empty() || payload.is_empty() {
        return None;
    }

    if !endpoint.starts_with("http://") && !endpoint.starts_with("https://") {
        return None;
    }

    let timeout_ms = values
        .get("timeoutMs")
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(30_000)
        .clamp(1_000, 120_000);

    Some(ModelCompleteRequest {
        request_id,
        endpoint,
        timeout_ms,
        payload,
    })
}

fn model_complete_callback(request_id: &str, result: &str) -> String {
    format!(
        "globalThis.RubyNativeModelBridge?.resolve({}, {});",
        js_string_literal(request_id),
        js_string_literal(result)
    )
}

fn model_complete_error(error: impl AsRef<str>) -> String {
    format!(
        "{{\"ok\":false,\"error\":{}}}",
        js_string_literal(error.as_ref())
    )
}

fn model_complete_success(response: &str) -> String {
    format!(
        "{{\"ok\":true,\"response\":{}}}",
        js_string_literal(response)
    )
}

const DEFAULT_NVIDIA_PROVIDER_ENV: &str = "F:\\belavista-acompanhamento\\.env";

fn dotenv_value(raw: &str) -> String {
    let value = raw.trim();

    if value.len() >= 2 {
        let bytes = value.as_bytes();

        if (bytes[0] == b'"' && bytes[value.len() - 1] == b'"')
            || (bytes[0] == b'\'' && bytes[value.len() - 1] == b'\'')
        {
            return value[1..value.len() - 1].to_string();
        }
    }

    value.to_string()
}

fn load_provider_env(path: &Path) -> Result<HashMap<String, String>, String> {
    let text = fs::read_to_string(path)
        .map_err(|error| {
            format!(
                "failed to read NVIDIA provider env {}: {}",
                path.display(),
                error
            )
        })?;

    let mut values = HashMap::new();

    for raw_line in text.lines() {
        let mut line = raw_line.trim();

        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        if let Some(rest) = line.strip_prefix("export ") {
            line = rest.trim();
        }

        let Some((key, value)) = line.split_once('=') else {
            continue;
        };

        let key = key.trim();

        if key.is_empty() {
            continue;
        }

        values.insert(
            key.to_string(),
            dotenv_value(value),
        );
    }

    Ok(values)
}

fn first_env_value(
    values: &HashMap<String, String>,
    keys: &[&str],
) -> Option<String> {
    keys.iter()
        .filter_map(|key| values.get(*key))
        .map(|value| value.trim())
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn normalize_openai_endpoint(value: &str) -> String {
    let endpoint = value.trim().trim_end_matches('/');

    if endpoint.ends_with("/chat/completions") {
        return endpoint.to_string();
    }

    if endpoint.ends_with("/v1") {
        return format!("{endpoint}/chat/completions");
    }

    if endpoint.contains("/v1/") {
        return endpoint.to_string();
    }

    format!("{endpoint}/v1/chat/completions")
}

fn prepare_nvidia_request(
    request: &ModelCompleteRequest,
) -> Result<(String, String, String, String, String), String> {
    let provider_env_path = env::var("GLAUCO_NVIDIA_ENV")
        .unwrap_or_else(|_| DEFAULT_NVIDIA_PROVIDER_ENV.to_string());

    let provider_path = PathBuf::from(&provider_env_path);
    let values = load_provider_env(&provider_path)?;

    let provider = values
        .get("AI_PROVIDER")
        .map(|value| value.trim().to_ascii_lowercase())
        .unwrap_or_else(|| "nvidia".to_string());

    if provider != "nvidia" {
        return Err(format!(
            "AI_PROVIDER in {} is {:?}, expected \"nvidia\"",
            provider_path.display(),
            provider
        ));
    }

    let endpoint = first_env_value(
        &values,
        &[
            "NVIDIA_REASONING_API_URL",
            "NVIDIA_API_URL",
            "NVIDIA_ENDPOINT",
            "NVIDIA_BASE_URL",
        ],
    )
    .ok_or_else(|| {
        format!(
            "NVIDIA endpoint missing in {}",
            provider_path.display()
        )
    })?;

    let api_key = first_env_value(
        &values,
        &[
            "NVIDIA_API_KEY",
            "NVIDIA_REASONING_API_KEY",
        ],
    )
    .ok_or_else(|| {
        format!(
            "NVIDIA_API_KEY missing in {}",
            provider_path.display()
        )
    })?;

    let model = first_env_value(
        &values,
        &[
            "NVIDIA_MODEL",
            "NVIDIA_REASONING_MODEL",
            "NVIDIA_REASONING_VISION_MODEL",
        ],
    )
    .ok_or_else(|| {
        format!(
            "NVIDIA model missing in {}",
            provider_path.display()
        )
    })?;

    let mut payload: serde_json::Value =
        serde_json::from_str(&request.payload)
            .map_err(|error| {
                format!(
                    "invalid model completion JSON payload: {}",
                    error
                )
            })?;

    let object = payload
        .as_object_mut()
        .ok_or_else(|| {
            "model completion payload must be a JSON object".to_string()
        })?;

    object.insert(
        "model".to_string(),
        serde_json::Value::String(model.clone()),
    );

    let payload = serde_json::to_string(&payload)
        .map_err(|error| {
            format!(
                "failed to serialize NVIDIA request payload: {}",
                error
            )
        })?;

    Ok((
        normalize_openai_endpoint(&endpoint),
        api_key,
        model,
        payload,
        provider_env_path,
    ))
}

fn run_model_complete(request: &ModelCompleteRequest) -> String {
    let (
        endpoint,
        api_key,
        model,
        payload,
        provider_env_path,
    ) = match prepare_nvidia_request(request) {
        Ok(config) => config,
        Err(error) => return model_complete_error(error),
    };

    let timeout_seconds =
        ((request.timeout_ms + 999) / 1000).max(1).to_string();

    eprintln!(
        "[ruby-webview-host] model provider: NVIDIA env={} endpoint={} model={}",
        provider_env_path,
        endpoint,
        model
    );

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("curl.exe");
        command.creation_flags(0x08000000);
        command
    };

    #[cfg(not(target_os = "windows"))]
    let mut command = Command::new("curl");

    command
        .arg("--silent")
        .arg("--show-error")
        .arg("--max-time")
        .arg(&timeout_seconds)
        .arg("--request")
        .arg("POST")
        .arg("--header")
        .arg("Content-Type: application/json")
        .arg("--header")
        .arg(format!("Authorization: Bearer {}", api_key))
        .arg("--data-binary")
        .arg("@-")
        .arg("--write-out")
        .arg("\n__GLAUCO_HTTP_STATUS__:%{http_code}")
        .arg(&endpoint)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            return model_complete_error(format!(
                "failed to start NVIDIA HTTP client: {}",
                error
            ));
        }
    };

    if let Some(mut stdin) = child.stdin.take() {
        if let Err(error) = stdin.write_all(payload.as_bytes()) {
            return model_complete_error(format!(
                "failed to send request body to NVIDIA endpoint: {}",
                error
            ));
        }
    } else {
        return model_complete_error(
            "NVIDIA HTTP client stdin was unavailable"
        );
    }

    let output = match child.wait_with_output() {
        Ok(output) => output,
        Err(error) => {
            return model_complete_error(format!(
                "NVIDIA HTTP request failed: {}",
                error
            ));
        }
    };

    let stderr = String::from_utf8_lossy(&output.stderr)
        .trim()
        .to_string();

    if !output.status.success() {
        return model_complete_error(format!(
            "cannot reach NVIDIA model endpoint {}: {}",
            endpoint,
            if stderr.is_empty() {
                format!("curl exited with {}", output.status)
            } else {
                stderr
            }
        ));
    }

    let stdout =
        String::from_utf8_lossy(&output.stdout).to_string();

    let marker = "\n__GLAUCO_HTTP_STATUS__:";

    let Some(marker_pos) = stdout.rfind(marker) else {
        return model_complete_error(
            "NVIDIA model request did not return an HTTP status"
        );
    };

    let body = stdout[..marker_pos].to_string();

    let status_text =
        stdout[marker_pos + marker.len()..].trim();

    let status =
        status_text.parse::<u16>().unwrap_or(0);

    if !(200..300).contains(&status) {
        let preview: String =
            body.chars().take(700).collect();

        return model_complete_error(format!(
            "NVIDIA endpoint {} returned HTTP {} for model {}: {}",
            endpoint,
            status,
            model,
            preview
        ));
    }

    if body.trim().is_empty() {
        return model_complete_error(
            "NVIDIA endpoint returned an empty response"
        );
    }

    model_complete_success(&body)
}
fn main() -> wry::Result<()> {
    let root = frontend_root(env::args().nth(1));
    let index = root.join("index.html");
    if !index.is_file() {
        panic!("frontend index not found: {}", index.display());
    }

    let identity = app_identity(&root);
    let webview_data_dir = persistent_webview_data_dir(&identity);
    fs::create_dir_all(&webview_data_dir)
        .expect("failed to create persistent WebView data directory");

    let url = start_static_server(root.clone(), &identity);
    println!("[ruby-webview-host] app id: {identity}");
    println!("[ruby-webview-host] persistent origin: {url}");
    println!(
        "[ruby-webview-host] persistent WebView data: {}",
        webview_data_dir.display()
    );
    println!("[ruby-webview-host] main window starts hidden until framework onstart finishes");

    let event_loop = EventLoopBuilder::<HostEvent>::with_user_event().build();
    let host_proxy = event_loop.create_proxy();

    let window = WindowBuilder::new()
        .with_title("Ruby")
        .with_inner_size(TaoLogicalSize::new(1100.0, 720.0))
        .with_visible(false)
        .build(&event_loop)
        .expect("failed to create bootstrap window");

    let initial_size = window.inner_size();

    let devtools = env::var("RUBY_WEBVIEW_DEVTOOLS")
        .map(|value| matches!(value.to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(false);

    let ipc_proxy = host_proxy.clone();
    let mut web_context = WebContext::new(Some(webview_data_dir));
    let builder = WebViewBuilder::new_with_web_context(&mut web_context)
        .with_devtools(devtools)
        .with_focused(false)
        .with_visible(true)
        .with_bounds(full_bounds(initial_size.width, initial_size.height))
        .with_initialization_script(
            r#"
            (() => {
              const send = (kind, value) => {
                try {
                  window.ipc?.postMessage(`ruby:log:${kind}:${String(value)}`);
                } catch (_) {}
              };
              send("init", location.href);
              window.addEventListener("error", (event) => {
                send("error", event?.error?.stack || event?.error?.message || event?.message || "unknown");
              });
              window.addEventListener("unhandledrejection", (event) => {
                const reason = event?.reason;
                send("rejection", reason?.stack || reason?.message || String(reason));
              });
            })();
            "#,
        )
        .with_ipc_handler(move |request| {
            let body = request.body().trim();

            if let Some(message) = body.strip_prefix("ruby:log:") {
                println!("[webview] {message}");
                return;
            }

            let event = if let Some(encoded) =
                body.strip_prefix("ruby:webview-content:upsert:")
            {
                parse_webview_content_request(encoded)
                    .map(HostEvent::WebViewContentUpsert)
            } else if let Some(encoded) =
                body.strip_prefix("ruby:webview-content:remove:")
            {
                let values = query_values(encoded);

                values
                    .get("id")
                    .filter(|id| !id.trim().is_empty())
                    .cloned()
                    .map(HostEvent::WebViewContentRemove)
            } else if let Some(encoded) =
                body.strip_prefix("ruby:webview-content:snapshot:")
            {
                parse_browser_snapshot_request(encoded).map(|(request_id, id)| {
                    HostEvent::BrowserSnapshot { request_id, id }
                })
            } else if let Some(encoded) =
                body.strip_prefix("ruby:webview-content:action:")
            {
                parse_browser_action_request(encoded).map(HostEvent::BrowserAction)
            } else if let Some(encoded) =
                body.strip_prefix("ruby:client-gov:request:")
            {
                parse_client_gov_request(encoded).map(HostEvent::ClientGov)
            } else if let Some(encoded) =
                body.strip_prefix("ruby:model-complete:request:")
            {
                parse_model_complete_request(encoded)
                    .map(HostEvent::ModelComplete)
            } else {
                match body {
                    "ruby:show-loading" => Some(HostEvent::ShowLoading),
                    "ruby:show-main" => Some(HostEvent::ShowMain),
                    "ruby:show-error" => Some(HostEvent::ShowError),
                    "ruby:hide" => Some(HostEvent::Hide),
                    _ => None,
                }
            };

            if let Some(event) = event {
                let _ = ipc_proxy.send_event(event);
            }
        })
        .with_url(&url);

    #[cfg(not(target_os = "linux"))]
    let webview = builder.build(&window)?;

    #[cfg(target_os = "linux")]
    let webview = {
        use gtk::prelude::*;
        use tao::platform::unix::WindowExtUnix;
        use wry::WebViewBuilderExtUnix;

        let vbox = window.default_vbox().expect("tao default GTK vbox unavailable");
        let fixed = gtk::Fixed::new();
        fixed.show_all();
        vbox.pack_start(&fixed, true, true, 0);
        builder.build_gtk(&fixed)?
    };

    // The parent native window is hidden during bootstrap. Keep the child WebView
    // laid out at a real size so exposing the parent later does not leave an
    // invisible/zero/default-sized WebView2 surface.
    fit_webview(&webview, initial_size.width, initial_size.height);

    if devtools {
        println!("[ruby-webview-host] devtools enabled on WebViewBuilder");
    }

    let mut child_webviews: HashMap<String, ChildWebView> = HashMap::new();
    let browser_proxy = host_proxy.clone();

    event_loop.run(move |event, _, control_flow| {
        let _webview = &webview;
        *control_flow = ControlFlow::Wait;

        match event {
            Event::UserEvent(HostEvent::ShowLoading) => {
                println!("[ruby-webview-host] showing application-defined loading window");
                let size = window.inner_size();
                expose_webview(&webview, size.width, size.height);
                window.set_visible(true);
                window.request_redraw();
            }
            Event::UserEvent(HostEvent::ShowMain) => {
                println!("[ruby-webview-host] framework ready; showing main window");
                let size = window.inner_size();
                expose_webview(&webview, size.width, size.height);
                window.set_visible(true);
                window.request_redraw();
                let _ = webview.focus();
            }
            Event::UserEvent(HostEvent::ShowError) => {
                eprintln!("[ruby-webview-host] bootstrap failed; exposing diagnostics window");
                let size = window.inner_size();
                expose_webview(&webview, size.width, size.height);
                window.set_visible(true);
                window.request_redraw();
            }
            Event::UserEvent(HostEvent::Hide) => {
                window.set_visible(false);
            }
            Event::UserEvent(HostEvent::WebViewContentUpsert(request)) => {
                if let Some(child) = child_webviews.get_mut(&request.id) {
                    update_child_webview(child, &request);
                } else {
                    println!(
                        "[ruby-webview-host] creating WebViewContent {} -> {}",
                        request.id, request.url
                    );

                    let child_result = WebViewBuilder::new_with_web_context(&mut web_context)
                        .with_devtools(devtools)
                        .with_focused(false)
                        .with_visible(request.visible)
                        .with_bounds(logical_bounds(&request))
                        .with_url(&request.url)
                        .build_as_child(&window);

                    match child_result {
                        Ok(child_webview) => {
                            child_webviews.insert(
                                request.id.clone(),
                                ChildWebView {
                                    webview: child_webview,
                                    url: request.url.clone(),
                                },
                            );
                        }
                        Err(error) => eprintln!(
                            "[ruby-webview-host] failed to create WebViewContent {}: {}",
                            request.id, error
                        ),
                    }
                }
            }
            Event::UserEvent(HostEvent::BrowserSnapshot { request_id, id }) => {
                if let Some(child) = child_webviews.get(&id) {
                    let result_proxy = browser_proxy.clone();
                    let callback_request_id = request_id.clone();

                    // Wry requires Fn(String), so the closure is technically
                    // callable more than once. Browser JEV requests are
                    // one-shot: only the first callback is allowed through.
                    let callback_once = Arc::new(AtomicBool::new(false));
                    let callback_gate = callback_once.clone();

                    if let Err(error) = child.webview.evaluate_script_with_callback(
                        browser_snapshot_script(),
                        move |result| {
                            if callback_gate.swap(true, Ordering::AcqRel) {
                                return;
                            }

                            let _ = result_proxy.send_event(
                                HostEvent::BrowserSnapshotResult {
                                    request_id: callback_request_id.clone(),
                                    result,
                                },
                            );
                        },
                    ) {
                        // A synchronous evaluate error is the terminal result.
                        // Suppress any late callback that might still arrive.
                        callback_once.store(true, Ordering::Release);

                        let result = format!(
                            "{{\"ok\":false,\"error\":{}}}",
                            js_string_literal(&error.to_string())
                        );
                        let script = parent_bridge_callback(
                            "resolveSnapshot",
                            &request_id,
                            &result,
                        );
                        let _ = webview.evaluate_script(&script);
                    }
                } else {
                    let result = "{\"ok\":false,\"error\":\"WebViewContent id not found\"}";
                    let script = parent_bridge_callback(
                        "resolveSnapshot",
                        &request_id,
                        result,
                    );
                    let _ = webview.evaluate_script(&script);
                }
            }
            Event::UserEvent(HostEvent::BrowserSnapshotResult {
                request_id,
                result,
            }) => {
                let script = parent_bridge_callback(
                    "resolveSnapshot",
                    &request_id,
                    &result,
                );
                let _ = webview.evaluate_script(&script);
            }
            Event::UserEvent(HostEvent::BrowserAction(request)) => {
                let request_id = request.request_id.clone();

                if let Some(child) = child_webviews.get_mut(&request.id) {
                    let direct_result = match request.action.as_str() {
                        "back" => Some(child.webview.go_back()),
                        "forward" => Some(child.webview.go_forward()),
                        "reload" => Some(child.webview.reload()),
                        "navigate" => {
                            let target = request.url.as_deref().unwrap_or("");
                            if target.is_empty() {
                                let result = "{\"ok\":false,\"error\":\"navigate requires URL\"}";
                                let script = parent_bridge_callback(
                                    "resolveAction",
                                    &request_id,
                                    result,
                                );
                                let _ = webview.evaluate_script(&script);
                                None
                            } else {
                                let loaded = child.webview.load_url(target);
                                if loaded.is_ok() {
                                    child.url = target.to_string();
                                }
                                Some(loaded)
                            }
                        }
                        _ => None,
                    };

                    if let Some(result) = direct_result {
                        let payload = match result {
                            Ok(()) => format!(
                                "{{\"ok\":true,\"action\":{}}}",
                                js_string_literal(&request.action)
                            ),
                            Err(error) => format!(
                                "{{\"ok\":false,\"error\":{}}}",
                                js_string_literal(&error.to_string())
                            ),
                        };
                        let script = parent_bridge_callback(
                            "resolveAction",
                            &request_id,
                            &payload,
                        );
                        let _ = webview.evaluate_script(&script);
                    } else if let Some(script_to_run) = browser_dom_action_script(&request) {
                        let result_proxy = browser_proxy.clone();
                        let callback_request_id = request_id.clone();

                        // Same one-shot contract for DOM actions.
                        let callback_once = Arc::new(AtomicBool::new(false));
                        let callback_gate = callback_once.clone();

                        if let Err(error) = child.webview.evaluate_script_with_callback(
                            &script_to_run,
                            move |result| {
                                if callback_gate.swap(true, Ordering::AcqRel) {
                                    return;
                                }

                                let _ = result_proxy.send_event(
                                    HostEvent::BrowserActionResult {
                                        request_id: callback_request_id.clone(),
                                        result,
                                    },
                                );
                            },
                        ) {
                            callback_once.store(true, Ordering::Release);

                            let payload = format!(
                                "{{\"ok\":false,\"error\":{}}}",
                                js_string_literal(&error.to_string())
                            );
                            let script = parent_bridge_callback(
                                "resolveAction",
                                &request_id,
                                &payload,
                            );
                            let _ = webview.evaluate_script(&script);
                        }
                    } else if !matches!(
                        request.action.as_str(),
                        "navigate" | "back" | "forward" | "reload"
                    ) {
                        let result = format!(
                            "{{\"ok\":false,\"error\":\"unsupported browser action: {}\"}}",
                            request.action.replace('"', "\\\"")
                        );
                        let script = parent_bridge_callback(
                            "resolveAction",
                            &request_id,
                            &result,
                        );
                        let _ = webview.evaluate_script(&script);
                    }
                } else {
                    let result = "{\"ok\":false,\"error\":\"WebViewContent id not found\"}";
                    let script = parent_bridge_callback(
                        "resolveAction",
                        &request_id,
                        result,
                    );
                    let _ = webview.evaluate_script(&script);
                }
            }
            Event::UserEvent(HostEvent::BrowserActionResult {
                request_id,
                result,
            }) => {
                let script = parent_bridge_callback(
                    "resolveAction",
                    &request_id,
                    &result,
                );
                let _ = webview.evaluate_script(&script);
            }
            Event::UserEvent(HostEvent::ModelComplete(request)) => {
                let proxy = browser_proxy.clone();

                thread::spawn(move || {
                    let request_id = request.request_id.clone();
                    let result = run_model_complete(&request);

                    let _ = proxy.send_event(
                        HostEvent::ModelCompleteResult {
                            request_id,
                            result,
                        },
                    );
                });
            }
            Event::UserEvent(HostEvent::ModelCompleteResult {
                request_id,
                result,
            }) => {
                let script = model_complete_callback(
                    &request_id,
                    &result,
                );

                let _ = webview.evaluate_script(&script);
            }
            Event::UserEvent(HostEvent::ClientGov(mut request)) => {
                let request_id = request.request_id.clone();

                match request.op.as_str() {
                    "ensure_folder" => {
                        let result = match ensure_client_folder(&request.client_id) {
                            Ok(path) => format!(
                                "{{\"ok\":true,\"path\":{}}}",
                                js_string_literal(&path.to_string_lossy())
                            ),
                            Err(error) => client_gov_error(error),
                        };

                        let script = client_gov_callback(&request_id, &result);
                        let _ = webview.evaluate_script(&script);
                    }
                    "open_folder" => {
                        let result = match ensure_client_folder(&request.client_id)
                            .and_then(|path| {
                                open_client_folder(&path)?;
                                Ok(path)
                            })
                        {
                            Ok(path) => format!(
                                "{{\"ok\":true,\"path\":{}}}",
                                js_string_literal(&path.to_string_lossy())
                            ),
                            Err(error) => client_gov_error(error),
                        };

                        let script = client_gov_callback(&request_id, &result);
                        let _ = webview.evaluate_script(&script);
                    }
                    "save_credential" => {
                        let result = match (
                            request.field.as_deref(),
                            request.value.as_deref(),
                        ) {
                            (Some(field), Some(value)) if !value.is_empty() => {
                                match credential_set(&request.client_id, field, value) {
                                    Ok(()) => client_gov_ok(),
                                    Err(error) => client_gov_error(error),
                                }
                            }
                            _ => client_gov_error("credential field/value missing"),
                        };

                        // Do not log or return the secret.
                        if let Some(value) = request.value.as_mut() {
                            value.clear();
                        }

                        let script = client_gov_callback(&request_id, &result);
                        let _ = webview.evaluate_script(&script);
                    }
                    "has_credential" => {
                        let result = match request.field.as_deref() {
                            Some(field) => format!(
                                "{{\"ok\":true,\"exists\":{}}}",
                                if credential_has(&request.client_id, field) {
                                    "true"
                                } else {
                                    "false"
                                }
                            ),
                            None => client_gov_error("credential field missing"),
                        };

                        let script = client_gov_callback(&request_id, &result);
                        let _ = webview.evaluate_script(&script);
                    }
                    "delete_credential" => {
                        let result = match request.field.as_deref() {
                            Some(field) => match credential_delete(&request.client_id, field) {
                                Ok(()) => client_gov_ok(),
                                Err(error) => client_gov_error(error),
                            },
                            None => client_gov_error("credential field missing"),
                        };

                        let script = client_gov_callback(&request_id, &result);
                        let _ = webview.evaluate_script(&script);
                    }
                    "fill_credential" => {
                        let browser_id = request.browser_id.as_deref().unwrap_or("");
                        let target = request.target.as_deref().unwrap_or("");
                        let field = request.field.as_deref().unwrap_or("");

                        if browser_id.is_empty() || target.is_empty() || field.is_empty() {
                            let result = client_gov_error(
                                "browser id, target and credential field are required"
                            );
                            let script = client_gov_callback(&request_id, &result);
                            let _ = webview.evaluate_script(&script);
                            return;
                        }

                        let Some(child) = child_webviews.get(browser_id) else {
                            let result = client_gov_error("WebViewContent id not found");
                            let script = client_gov_callback(&request_id, &result);
                            let _ = webview.evaluate_script(&script);
                            return;
                        };

                        let mut secret = match credential_get(&request.client_id, field) {
                            Ok(secret) => secret,
                            Err(error) => {
                                let result = client_gov_error(error);
                                let script = client_gov_callback(&request_id, &result);
                                let _ = webview.evaluate_script(&script);
                                return;
                            }
                        };

                        let mut script_to_run = credential_fill_script(target, &secret);
                        secret.clear();

                        let result_proxy = browser_proxy.clone();
                        let callback_request_id = request_id.clone();

                        let callback_once = Arc::new(AtomicBool::new(false));
                        let callback_gate = callback_once.clone();

                        if let Err(error) = child.webview.evaluate_script_with_callback(
                            &script_to_run,
                            move |result| {
                                if callback_gate.swap(true, Ordering::AcqRel) {
                                    return;
                                }

                                let _ = result_proxy.send_event(
                                    HostEvent::ClientGovResult {
                                        request_id: callback_request_id.clone(),
                                        result,
                                    },
                                );
                            },
                        ) {
                            callback_once.store(true, Ordering::Release);
                            let result = client_gov_error(error.to_string());
                            let script = client_gov_callback(&request_id, &result);
                            let _ = webview.evaluate_script(&script);
                        }

                        script_to_run.clear();
                    }
                    _ => {
                        let result = client_gov_error("unsupported client-gov operation");
                        let script = client_gov_callback(&request_id, &result);
                        let _ = webview.evaluate_script(&script);
                    }
                }
            }
            Event::UserEvent(HostEvent::ClientGovResult {
                request_id,
                result,
            }) => {
                let script = client_gov_callback(&request_id, &result);
                let _ = webview.evaluate_script(&script);
            }
            Event::UserEvent(HostEvent::WebViewContentRemove(id)) => {
                if child_webviews.remove(&id).is_some() {
                    println!("[ruby-webview-host] removed WebViewContent {id}");
                }
            }
            Event::WindowEvent {
                event: WindowEvent::Resized(size),
                ..
            } => {
                fit_webview(&webview, size.width, size.height);
            }
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    });
}