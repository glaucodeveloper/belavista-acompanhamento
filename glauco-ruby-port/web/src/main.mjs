import { installConnection } from './connection.mjs';
import { installAndroidContent } from './android-content.mjs';
installConnection();
await installAndroidContent();
import './app.css';
import { installNativeWebViewContentBridge } from './webviewcontent.mjs';

installNativeWebViewContentBridge();

function hostLog(kind, value = '') {
  try {
    globalThis.ipc?.postMessage?.(`ruby:log:${kind}:${String(value)}`);
  } catch {
    // Capacitor/browser mode may not expose Wry IPC.
  }
}

function status(message, error = false) {
  const node = document.querySelector('#ruby-boot-status');
  if (!node) return;
  node.hidden = false;
  node.textContent = message;
  node.dataset.error = error ? '1' : '0';
  hostLog(error ? 'status-error' : 'status', message);
}

function hideStatus() {
  const node = document.querySelector('#ruby-boot-status');
  if (node) node.hidden = true;
}

function showHostError() {
  try {
    globalThis.RubyPlatform?.window?.showError?.();
    globalThis.ipc?.postMessage?.('ruby:show-error');
  } catch {
    // Native host bridge is optional outside Wry.
  }
}

globalThis.addEventListener('error', (event) => {
  const message =
    event?.error?.stack ??
    event?.error?.message ??
    event?.message ??
    String(event);
  status(`JavaScript boot failed: ${message}`, true);
  showHostError();
});

globalThis.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  status(
    `Unhandled promise rejection: ${reason?.stack ?? reason?.message ?? String(reason)}`,
    true,
  );
  showHostError();
});

async function source(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Unable to load ${url}: HTTP ${response.status}`);
  return response.text();
}

async function runFrameworkOnStart(platform) {
  // installRubyPlatform() is required to return the bridge in v12+, but use
  // RubyPlatform as a defensive fallback while old dist files are being repaired.
  const bridge = platform ?? globalThis.RubyPlatform;

  if (!bridge) {
    throw new TypeError(
      'installRubyPlatform() did not return a platform and globalThis.RubyPlatform is missing',
    );
  }

  if (typeof bridge.onstart === 'function') {
    hostLog('phase', 'framework-onstart');
    return bridge.onstart();
  }

  // Transitional compatibility only. New framework sources should expose
  // onstart(); this allows a stale v11-style bridge to produce a meaningful run.
  if (typeof bridge.systemOne?.preload === 'function') {
    hostLog('warning', 'platform.onstart missing; using systemOne.preload fallback');
    return bridge.systemOne.preload();
  }

  throw new TypeError(
    `RubyPlatform.onstart is not a function. Platform keys: ${Object.keys(bridge).join(', ')}`,
  );
}

async function boot() {
  status('Loading Ruby runtimeâ€¦');

  const [{ DefaultRubyVM }, { installRubyPlatform }] = await Promise.all([
    import('@ruby/wasm-wasi/dist/browser'),
    import('./platform.mjs'),
  ]);

  const installedPlatform = installRubyPlatform();
  const platform = installedPlatform ?? globalThis.RubyPlatform;

  hostLog(
    'platform',
    platform
      ? `keys=${Object.keys(platform).join(',')} onstart=${typeof platform.onstart}`
      : 'missing',
  );

  const wasmUrl = new URL('./vendor/ruby+stdlib.wasm', globalThis.location.href);
  const rubyResponse = await fetch(wasmUrl, { cache: 'no-cache' });
  if (!rubyResponse.ok) throw new Error(`Unable to load Ruby WASM: HTTP ${rubyResponse.status}`);

  const contentType = rubyResponse.headers.get('content-type') ?? '';
  if (!contentType.includes('application/wasm')) {
    throw new Error(`Ruby WASM returned invalid MIME type: ${contentType || '(empty)'}`);
  }

  const [wasmModule, runtime, application] = await Promise.all([
    WebAssembly.compileStreaming(rubyResponse),
    source(new URL('./ruby/runtime.rb', globalThis.location.href)),
    source(new URL('./ruby/application.rb', globalThis.location.href)),
  ]);

  hostLog('phase', 'ruby-assets-loaded');

  const { vm } = await DefaultRubyVM(wasmModule);
  globalThis.rubyVM = vm;

  status('Preparing Ruby applicationâ€¦');
  await vm.evalAsync(`${runtime}\n\n${application}\n\nRuby::Boot.prepare_loading!`);
  hostLog('phase', 'ruby-loading-component-mounted');

  // AI initializes only on an explicitly requested monitor run.

  status('Mounting Ruby applicationâ€¦');
  await vm.evalAsync('Ruby::Boot.mount_application!');
  hostLog('phase', 'application-mounted');

  hideStatus();
  platform.window.showMain();
}

boot().catch((error) => {
  const message = error?.stack ?? error?.message ?? String(error);
  console.error(error);
  hostLog('boot-error', message);
  status(`Ruby boot failed: ${message}`, true);
  showHostError();
});