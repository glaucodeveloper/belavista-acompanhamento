const { app, BrowserWindow, protocol, net, session, ipcMain, dialog, safeStorage } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { writeFile, readFile, unlink, rename } = require('node:fs/promises');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.whenReady().then(() => {
  const isLocalRenderer = origin => origin === 'app://local' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) =>
    permission === 'media' && isLocalRenderer(requestingOrigin) && (['audio', 'video'].includes(details?.mediaType) || details?.mediaTypes?.some(type => ['audio', 'video'].includes(type)))
  );
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const requestingUrl = details?.requestingUrl ? new URL(details.requestingUrl) : null;
    const origin = requestingUrl?.protocol === 'app:' && requestingUrl.hostname === 'local' ? 'app://local' : requestingUrl?.origin || '';
    const wantsMedia = details?.mediaTypes?.some(type => ['audio', 'video'].includes(type)) || ['audio', 'video'].includes(details?.mediaType);
    callback(permission === 'media' && wantsMedia && isLocalRenderer(origin));
  });
  const root = path.resolve(__dirname, '../frontend/dist');
  protocol.handle('app', request => {
    const url = new URL(request.url);
    if (url.hostname !== 'local') return new Response('Not found', { status: 404 });
    const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).href);
  });
  const window = new BrowserWindow({ width: 1100, height: 800, title: 'Aliança Park', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') } });
  const credentialFile = path.join(app.getPath('userData'), 'atlas-credential.enc');
  const checkCredentialSender = event => { if (event.sender !== window.webContents || !event.senderFrame.url.startsWith('app://local/')) throw new Error('Origem não autorizada.'); if (!safeStorage.isEncryptionAvailable()) throw new Error('Armazenamento seguro indisponível neste computador.'); };
  ipcMain.handle('credential-save', async (event, value) => {
    checkCredentialSender(event);
    if (typeof value !== 'string' || !value || value.length > 1024) throw new Error('Credencial inválida.');
    const temp = credentialFile + '.tmp';
    await writeFile(temp, safeStorage.encryptString(value), { mode: 0o600 });
    await rename(temp, credentialFile);
  });
  ipcMain.handle('credential-read', async event => {
    checkCredentialSender(event);
    try { return safeStorage.decryptString(await readFile(credentialFile)); }
    catch (error) { if (error.code === 'ENOENT') return null; throw new Error('Não foi possível recuperar a credencial protegida.'); }
  });
  ipcMain.handle('credential-clear', async event => {
    checkCredentialSender(event);
    try { await unlink(credentialFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  });
  ipcMain.handle('save-progress-pdf', async (event, { filename, bytes } = {}) => {
    const source = new URL(event.senderFrame.url);
    const origin = source.protocol === 'app:' && source.hostname === 'local' ? 'app://local' : source.origin;
    if (!isLocalRenderer(origin)) throw new Error('Origem não autorizada.');
    const data = bytes instanceof ArrayBuffer ? Buffer.from(bytes) : null;
    if (!data || data.length < 5 || data.length > 50 * 1024 * 1024 || data.subarray(0, 5).toString() !== '%PDF-') throw new Error('Arquivo PDF inválido.');
    const safeName = path.basename(String(filename || 'progressao.pdf')).replace(/[^\w.-]/g, '-');
    const chosen = await dialog.showSaveDialog(window, { title: 'Salvar plotagem', defaultPath: path.join(app.getPath('downloads'), safeName), filters: [{ name: 'Documento PDF', extensions: ['pdf'] }] });
    if (chosen.canceled || !chosen.filePath) return { canceled: true };
    await writeFile(chosen.filePath, data);
    return { canceled: false };
  });
  ipcMain.handle('save-report-csv', async (event, { filename, bytes } = {}) => {
    const source = new URL(event.senderFrame.url);
    const origin = source.protocol === 'app:' && source.hostname === 'local' ? 'app://local' : source.origin;
    if (!isLocalRenderer(origin)) throw new Error('Origem não autorizada.');
    const data = bytes instanceof ArrayBuffer ? Buffer.from(bytes) : null;
    if (!data || !data.length || data.length > 10 * 1024 * 1024) throw new Error('Planilha inválida.');
    const safeName = path.basename(String(filename || 'relatorio.csv')).replace(/[^\w.-]/g, '-');
    const chosen = await dialog.showSaveDialog(window, { title: 'Salvar planilha', defaultPath: path.join(app.getPath('downloads'), safeName), filters: [{ name: 'Planilha CSV', extensions: ['csv'] }] });
    if (chosen.canceled || !chosen.filePath) return { canceled: true };
    await writeFile(chosen.filePath, data);
    return { canceled: false };
  });
  window.removeMenu();
  const rendererUrl = process.env.VITE_DEV_SERVER_URL;
  if (rendererUrl) window.loadURL(rendererUrl);
  else window.loadURL('app://local/index.html');
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
