// BELAVISTA_ORIGINAL_ADMIN_BOOTSTRAP_V5351

const boot=document.querySelector('#boot');

function setBoot(text,detail=''){
  if(!boot)return;
  const p=boot.querySelector('p')||boot.appendChild(document.createElement('p'));
  p.textContent=text;

  let detailNode=boot.querySelector('[data-boot-detail-v5351]');
  if(!detailNode){
    detailNode=document.createElement('pre');
    detailNode.dataset.bootDetailV5351='true';
    detailNode.style.cssText=
      'max-width:min(820px,calc(100vw - 40px));max-height:38vh;overflow:auto;'+
      'white-space:pre-wrap;text-align:left;font:11px/1.45 ui-monospace,monospace;'+
      'color:#ffb4b4;background:#08131f;border:1px solid #314254;padding:12px;'+
      'margin-top:14px;display:none';
    boot.append(detailNode);
  }

  detailNode.textContent=detail;
  detailNode.style.display=detail?'block':'none';
}

globalThis.__BELAVISTA_BOOT_V5351={
  startedAt:performance.now(),
  phase:'bootstrap',
  errors:[]
};

window.addEventListener('error',event=>{
  globalThis.__BELAVISTA_BOOT_V5351.errors.push({
    type:'error',
    message:event.message,
    source:event.filename,
    line:event.lineno,
    column:event.colno
  });
});

window.addEventListener('unhandledrejection',event=>{
  globalThis.__BELAVISTA_BOOT_V5351.errors.push({
    type:'unhandledrejection',
    message:String(event.reason?.stack||event.reason||'')
  });
});

setBoot('Abrindo administrativo original…');

const watchdog=setTimeout(()=>{
  const appDefined=Boolean(customElements.get('belavista-app'));
  const app=document.querySelector('belavista-app');

  if(!appDefined||app?.hidden){
    globalThis.__BELAVISTA_BOOT_V5351.phase='watchdog';
    setBoot(
      'O módulo principal ainda não concluiu.',
      JSON.stringify({
        appDefined,
        appExists:Boolean(app),
        appHidden:app?.hidden??null,
        errors:globalThis.__BELAVISTA_BOOT_V5351.errors
      },null,2)
    );
  }
},3500);

try{
  globalThis.__BELAVISTA_BOOT_V5351.phase='import-app';
  await import('../app.js?v=atlas-zip-front-structure-v5');
  globalThis.__BELAVISTA_BOOT_V5351.phase='app-imported';
  globalThis.__BELAVISTA_BOOT_V5351.importedAt=performance.now();
  clearTimeout(watchdog);

  // app.js owns removal of #boot. If it imported but did not enter startApp,
  // leave an explicit diagnostic instead of an endless generic spinner.
  setTimeout(()=>{
    const stillBoot=document.querySelector('#boot');
    if(!stillBoot)return;

    const app=document.querySelector('belavista-app');
    const install=document.querySelector('cloudflare-bootstrap');

    if(app?.hidden && install?.hidden===false){
      setBoot('Configuração administrativa necessária.');
      return;
    }

    setBoot(
      'app.js carregou, mas startApp() não liberou o painel.',
      JSON.stringify({
        appDefined:Boolean(customElements.get('belavista-app')),
        appExists:Boolean(app),
        appHidden:app?.hidden??null,
        installExists:Boolean(install),
        installHidden:install?.hidden??null,
        deferred:globalThis.__BELAVISTA_ADMIN_DEFERRED_V5351||null,
        errors:globalThis.__BELAVISTA_BOOT_V5351.errors
      },null,2)
    );
  },1200);

}catch(error){
  clearTimeout(watchdog);
  const detail=String(error?.stack||error?.message||error);
  globalThis.__BELAVISTA_BOOT_V5351.phase='app-import-failed';
  globalThis.__BELAVISTA_BOOT_V5351.errors.push({
    type:'app-import',
    message:detail
  });

  console.error('[Belavista admin bootstrap v5.3.51]',error);
  setBoot(
    'Falha ao carregar o administrativo original.',
    detail
  );
}
