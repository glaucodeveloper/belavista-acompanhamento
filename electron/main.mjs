import {app,BrowserWindow,dialog,ipcMain,Menu,shell} from 'electron';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const desktopPort=Number(process.env.BELAVISTA_DESKTOP_PORT||18080);
const localBaseUrl=`http://127.0.0.1:${desktopPort}`;
const desktopConfigPath=app.isPackaged?join(process.resourcesPath,'desktop-runtime-config.json'):join(here,'..','desktop-runtime-config.json');
let desktopConfig={};
try{desktopConfig=JSON.parse(readFileSync(desktopConfigPath,'utf8'));}catch{}
const externalUrl=String(process.env.BELAVISTA_DESKTOP_URL||desktopConfig.endpoint||'').replace(/\/$/,'');
const routerKey=String(process.env.BELAVISTA_PORT_ROUTER_KEY||desktopConfig.routerKey||'');
let mainWindow=null;
let serverProcess=null;
let activeMode=externalUrl?'router':'local';
let baseUrl=externalUrl||localBaseUrl;

function isRouterRequest(input){
  if(!routerKey||!externalUrl)return false;
  try{
    const requestUrl=new URL(String(input));
    const endpoint=new URL(externalUrl);
    const prefix=endpoint.pathname.replace(/\/$/,'');
    return requestUrl.origin===endpoint.origin&&(!prefix||requestUrl.pathname===prefix||requestUrl.pathname.startsWith(`${prefix}/`));
  }catch{return false;}
}

function rewriteRouterPath(input){
  if(!routerKey||!externalUrl)return null;
  try{
    const requestUrl=new URL(String(input));
    const endpoint=new URL(externalUrl);
    const prefix=endpoint.pathname.replace(/\/+$/,'');
    if(requestUrl.origin!==endpoint.origin||!prefix||requestUrl.pathname===prefix||requestUrl.pathname.startsWith(`${prefix}/`))return null;
    requestUrl.pathname=`${prefix}${requestUrl.pathname}`;
    return requestUrl.href;
  }catch{return null;}
}

function fetchRuntime(input,init={}){
  const headers=new Headers(init.headers||{});
  if(isRouterRequest(input)){
    headers.set('X-Port-Router-Key',routerKey);
    headers.set('ngrok-skip-browser-warning','1');
  }
  return fetch(input,{...init,headers});
}

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function waitForServer(target=baseUrl){
  let lastError=null;
  for(let attempt=0;attempt<40;attempt++){
    try{
      const response=await fetchRuntime(`${target}/api/health`,{signal:AbortSignal.timeout(1500)});
      if(response.ok)return;
    }catch(error){lastError=error;}
    await sleep(250);
  }
  throw new Error(`O serviço local não iniciou: ${lastError?.message||'tempo esgotado'}`);
}

function startLocalServer(){
  if(serverProcess)return;
  const appPath=app.getAppPath();
  const serverEntry=join(appPath,'server.mjs');
  serverProcess=spawn(process.execPath,[serverEntry],{
    cwd:appPath,
    env:{
      ...process.env,
      ELECTRON_RUN_AS_NODE:'1',
      PORT:String(desktopPort),
      HOST:'127.0.0.1',
      PUBLIC_ORIGIN:localBaseUrl,
      BELAVISTA_FRONTEND_ROOT:appPath,
      BELAVISTA_DATA_ROOT:join(app.getPath('userData'),'data')
    },
    stdio:['ignore','pipe','pipe'],
    windowsHide:true
  });
  serverProcess.stderr?.on('data',chunk=>console.warn('[desktop service]',String(chunk).trim()));
  serverProcess.once('exit',code=>{if(code&&code!==0)console.error('[desktop service] exited',code);serverProcess=null;});
}

function currentRoute(){
  // Start at the app's existing access gate. The Instagram station setup stays
  // available as a separate route and must not replace the security-key screen.
  return '/admin?desktop=ready';
}

function desktopModePath(){return join(app.getPath('userData'),'desktop-runtime-mode.json');}

function loadDesktopMode(){
  try{
    const saved=JSON.parse(readFileSync(desktopModePath(),'utf8'))?.mode;
    if(saved==='local'||saved==='router'&&externalUrl)return saved;
  }catch{}
  return externalUrl?'router':'local';
}

function saveDesktopMode(mode){
  const path=desktopModePath();
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify({mode,updatedAt:new Date().toISOString()},null,2),{mode:0o600});
}

function currentWindowRoute(){
  try{
    const current=new URL(mainWindow?.webContents.getURL()||'/desktop/setup',baseUrl);
    let pathname=current.pathname;
    if(activeMode==='local'&&externalUrl){
      const routerPrefix=new URL(externalUrl).pathname.replace(/\/+$/,'');
      if(routerPrefix&&(pathname===routerPrefix||pathname.startsWith(`${routerPrefix}/`)))pathname=pathname.slice(routerPrefix.length)||'/';
    }
    current.searchParams.delete('demo');
    return `${pathname}${current.search}${current.hash}`;
  }catch{return '/admin?desktop=ready';}
}

async function switchEnvironment(mode){
  if(mode!=='local'&&mode!=='router')throw new Error('Ambiente inválido.');
  if(mode==='router'&&!externalUrl)throw new Error('Este pacote não tem endpoint Router configurado.');
  const target=mode==='router'?externalUrl:localBaseUrl;
  if(mode==='local')startLocalServer();
  await waitForServer(target);
  const previousMode=activeMode;
  const previousBaseUrl=baseUrl;
  activeMode=mode;
  baseUrl=target;
  try{
    if(mainWindow){
      const route=currentWindowRoute();
      await mainWindow.loadURL(`${baseUrl}${route}`);
    }
    saveDesktopMode(mode);
  }catch(error){
    activeMode=previousMode;
    baseUrl=previousBaseUrl;
    throw error;
  }
  return {mode:activeMode,endpoint:new URL(baseUrl).origin,managedServer:Boolean(serverProcess)};
}

async function createWindow(){
  mainWindow=new BrowserWindow({
    minWidth:1080,
    minHeight:720,
    width:1440,
    height:920,
    backgroundColor:'#07131d',
    icon:join(here,'..','assets','public','alianca-park-logo-full-letter-cutouts-v555.png'),
    autoHideMenuBar:true,
    show:false,
    webPreferences:{
      preload:join(here,'preload.cjs'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      partition:'persist:alianca-park-desktop'
    }
  });
  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.session.webRequest.onBeforeRequest({urls:['http://127.0.0.1/*','https://*/*']},(details,callback)=>{
    const redirectURL=rewriteRouterPath(details.url);
    callback(redirectURL?{redirectURL}:{});
  });
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders({urls:['http://127.0.0.1/*','https://*/*']},(details,callback)=>{
    if(isRouterRequest(details.url)){
      details.requestHeaders['X-Port-Router-Key']=routerKey;
      details.requestHeaders['ngrok-skip-browser-warning']='1';
    }
    callback({requestHeaders:details.requestHeaders});
  });
  mainWindow.once('ready-to-show',()=>mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({url})=>{void shell.openExternal(url);return {action:'deny'};});
  await mainWindow.loadURL(`${baseUrl}${await currentRoute()}`);
}

async function boot(){
  Menu.setApplicationMenu(null);
  activeMode=loadDesktopMode();
  baseUrl=activeMode==='router'?externalUrl:localBaseUrl;
  if(activeMode==='local')startLocalServer();
  try{await waitForServer();await createWindow();}
  catch(error){await dialog.showMessageBox({type:'error',title:'Aliança Park Desktop',message:'Não foi possível iniciar a aplicação.',detail:error.message});app.quit();}
}

const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
else{
  app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus();}});
  app.whenReady().then(boot);
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)void createWindow();});
}

ipcMain.handle('desktop:runtime',()=>({mode:activeMode,baseUrl,availableModes:externalUrl?['local','router']:['local'],managedServer:Boolean(serverProcess),dataPath:join(app.getPath('userData'),'data')}));
ipcMain.handle('desktop:switchEnvironment',(_event,mode)=>switchEnvironment(String(mode||'')));
ipcMain.handle('desktop:openExternal',(_event,url)=>shell.openExternal(String(url||'')));
ipcMain.handle('desktop:goAdmin',async()=>{await mainWindow?.loadURL(`${baseUrl}/admin?desktop=ready`);return true;});

app.on('before-quit',()=>{if(serverProcess&&!serverProcess.killed)serverProcess.kill();});
