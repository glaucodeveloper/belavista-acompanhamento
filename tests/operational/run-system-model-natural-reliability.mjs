import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=path.resolve(process.cwd());
const baseUrl=(process.env.BELAVISTA_OPENJEV_URL||'http://127.0.0.1:8090').replace(/\/+$/,'');
const startPs1=path.join(root,'scripts','system-model','start-openjev.ps1');
const stopPs1=path.join(root,'scripts','system-model','stop-openjev.ps1');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function health(timeoutMs=2500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);

  try{
    const response=await fetch(baseUrl+'/health',{signal:controller.signal});
    if(!response.ok)return null;
    return await response.json().catch(()=>null);
  }catch{
    return null;
  }finally{
    clearTimeout(timer);
  }
}

async function waitReady(totalMs=190000){
  const deadline=Date.now()+totalMs;
  let last=null;

  while(Date.now()<deadline){
    last=await health(3000);
    if(last?.ready===true)return last;
    await sleep(700);
  }

  throw new Error(
    'System Model não ficou ready em '+baseUrl+
    ' dentro de '+Math.round(totalMs/1000)+'s.'
  );
}

function commandWorks(command,args=['-NoProfile','-Command','$PSVersionTable.PSVersion.ToString()']){
  const result=spawnSync(command,args,{
    cwd:root,
    encoding:'utf8',
    windowsHide:true
  });
  return !result.error&&result.status===0;
}

function resolvePowerShell(){
  const candidates=[];

  if(process.platform==='win32'){
    const programFiles=process.env.ProgramFiles||'C:\\Program Files';
    const programFilesX86=process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)';
    const systemRoot=process.env.SystemRoot||'C:\\Windows';

    candidates.push(
      path.join(programFiles,'PowerShell','7','pwsh.exe'),
      path.join(programFiles,'PowerShell','7-preview','pwsh.exe'),
      path.join(programFilesX86,'PowerShell','7','pwsh.exe'),
      path.join(systemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
      'pwsh.exe',
      'pwsh',
      'powershell.exe',
      'powershell'
    );
  }else{
    candidates.push('pwsh','powershell');
  }

  for(const candidate of candidates){
    if(
      (path.isAbsolute(candidate)&&fs.existsSync(candidate))||
      (!path.isAbsolute(candidate)&&commandWorks(candidate))
    ){
      if(path.isAbsolute(candidate)){
        if(commandWorks(candidate))return candidate;
      }else{
        return candidate;
      }
    }
  }

  throw new Error(
    'Nenhum PowerShell executável foi encontrado. '+ 
    'Testados: '+candidates.join(', ')
  );
}

const powerShell=resolvePowerShell();

function runPowerShellScript(scriptPath){
  const result=spawnSync(
    powerShell,
    [
      '-NoProfile',
      '-ExecutionPolicy','Bypass',
      '-File',scriptPath,
      '-Root',root
    ],
    {
      cwd:root,
      stdio:'inherit',
      windowsHide:false
    }
  );

  if(result.error)throw result.error;
  return result.status??1;
}

let startedByRunner=false;
let attemptedStart=false;
let exitCode=1;

try{
  console.log('[SYSTEM MODEL] PowerShell: '+powerShell);

  let current=await health();

  if(current?.ready===true){
    console.log(
      '[SYSTEM MODEL] já estava online em '+baseUrl+
      ' model='+(current.model||'desconhecido')
    );
  }else{
    attemptedStart=true;
    console.log('[SYSTEM MODEL] offline; iniciando bundle local...');

    const status=runPowerShellScript(startPs1);

    if(status!==0){
      throw new Error('system-model:start falhou com exit code '+status);
    }

    startedByRunner=true;
    current=await waitReady();

    console.log(
      '[SYSTEM MODEL] ready em '+baseUrl+
      ' model='+(current.model||'desconhecido')
    );
  }

  const child=spawnSync(
    process.execPath,
    [
      '--env-file-if-exists=.env',
      '--test',
      '--test-concurrency=1',
      'tests/operational/system-model-natural-reliability.live.test.mjs'
    ],
    {
      cwd:root,
      stdio:'inherit',
      env:{
        ...process.env,
        BELAVISTA_OPENJEV_LIVE:'1',
        BELAVISTA_OPENJEV_URL:baseUrl
      },
      windowsHide:false
    }
  );

  if(child.error)throw child.error;
  exitCode=child.status??1;
}catch(error){
  console.error('[SYSTEM MODEL TEST RUNNER]',error?.stack||error);
  exitCode=1;
}finally{
  if(startedByRunner){
    console.log('[SYSTEM MODEL] encerrando serviços iniciados pelo teste...');
    try{
      const status=runPowerShellScript(stopPs1);
      if(status!==0){
        console.error('[SYSTEM MODEL] stop retornou '+status);
      }
    }catch(error){
      console.error('[SYSTEM MODEL] falha ao parar:',error?.message||error);
    }
  }else if(attemptedStart){
    console.log('[SYSTEM MODEL] nenhum serviço confirmado como iniciado pelo runner.');
  }else{
    console.log('[SYSTEM MODEL] preservando instância que já estava online.');
  }
}

process.exit(exitCode);
