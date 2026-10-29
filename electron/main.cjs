const { app, BrowserWindow, protocol, net, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.whenReady().then(() => {
  const isLocalRenderer = origin => origin === 'app://local' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) =>
    permission === 'media' && isLocalRenderer(requestingOrigin) && (details?.mediaType === 'video' || details?.mediaTypes?.includes('video'))
  );
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const origin = details?.requestingUrl ? new URL(details.requestingUrl).origin : '';
    const wantsVideo = details?.mediaTypes?.includes('video') || details?.mediaType === 'video';
    callback(permission === 'media' && wantsVideo && isLocalRenderer(origin));
  });
  const root = path.resolve(__dirname, '../frontend/dist');
  protocol.handle('app', request => {
    const url = new URL(request.url);
    if (url.hostname !== 'local') return new Response('Not found', { status: 404 });
    const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).href);
  });
  const window = new BrowserWindow({ width: 1100, height: 800, title: 'Aliança Park', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.removeMenu();
  const rendererUrl = process.env.VITE_DEV_SERVER_URL;
  if (rendererUrl) window.loadURL(rendererUrl);
  else window.loadURL('app://local/index.html');
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
