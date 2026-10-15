import {app,BrowserWindow,dialog,ipcMain,shell} from 'electron';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const desktopPort=Number(process.env.BELAVISTA_DESKTOP_PORT||18080);
const externalUrl=String(process.env.BELAVISTA_DESKTOP_URL||'').replace(/\/$/,'');
let mainWindow=null;
let serverProcess=null;
let baseUrl=externalUrl||`http://127.0.0.1:${desktopPort}`;

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function waitForServer(){
  let lastError=null;
  for(let attempt=0;attempt<40;attempt++){
    try{
      const response=await fetch(`${baseUrl}/api/health`,{signal:AbortSignal.timeout(1500)});
      if(response.ok)return;
    }catch(error){lastError=error;}
    await sleep(250);
  }
  throw new Error(`O serviço local não iniciou: ${lastError?.message||'tempo esgotado'}`);
}

function startLocalServer(){
  if(externalUrl)return;
  const appPath=app.getAppPath();
  const serverEntry=join(appPath,'server.mjs');
  serverProcess=spawn(process.execPath,[serverEntry],{
    cwd:appPath,
    env:{
      ...process.env,
      ELECTRON_RUN_AS_NODE:'1',
      PORT:String(desktopPort),
      HOST:'127.0.0.1',
      PUBLIC_ORIGIN:baseUrl,
      BELAVISTA_FRONTEND_ROOT:appPath,
      BELAVISTA_DATA_ROOT:join(app.getPath('userData'),'data')
    },
    stdio:['ignore','pipe','pipe'],
    windowsHide:true
  });
  serverProcess.stderr?.on('data',chunk=>console.warn('[desktop service]',String(chunk).trim()));
  serverProcess.once('exit',code=>{if(code&&code!==0)console.error('[desktop service] exited',code);serverProcess=null;});
}

async function currentRoute(){
  const response=await fetch(`${baseUrl}/api/desktop/setup`,{signal:AbortSignal.timeout(2500)});
  const payload=await response.json().catch(()=>({}));
  return payload?.setup?.complete?'/admin?desktop=ready':'/desktop/setup';
}

async function createWindow(){
  mainWindow=new BrowserWindow({
    minWidth:1080,
    minHeight:720,
    width:1440,
    height:920,
    backgroundColor:'#07131d',
    icon:join(here,'..','assets','public','alianca-park-logo-full-letter-cutouts-v555.png'),
    show:false,
    webPreferences:{
      preload:join(here,'preload.mjs'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      partition:'persist:alianca-park-desktop'
    }
  });
  mainWindow.once('ready-to-show',()=>mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({url})=>{void shell.openExternal(url);return {action:'deny'};});
  await mainWindow.loadURL(`${baseUrl}${await currentRoute()}`);
}

async function boot(){
  startLocalServer();
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

ipcMain.handle('desktop:runtime',()=>({baseUrl,managedServer:Boolean(serverProcess),dataPath:join(app.getPath('userData'),'data')}));
ipcMain.handle('desktop:openExternal',(_event,url)=>shell.openExternal(String(url||'')));
ipcMain.handle('desktop:goAdmin',async()=>{await mainWindow?.loadURL(`${baseUrl}/admin?desktop=ready`);return true;});

app.on('before-quit',()=>{if(serverProcess&&!serverProcess.killed)serverProcess.kill();});
