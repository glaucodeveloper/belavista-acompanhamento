// BELAVISTA_CHAT_TAB_WIDGET_GHOST_V5359
(() => {
  if(globalThis.__belavistaChatTabWidgetGhostV5359)return;
  globalThis.__belavistaChatTabWidgetGhostV5359=true;

  const STORAGE_KEY='belavista.ai-chat.tab-collapsed.v5359';

  const readSaved=()=>{
    try{return localStorage.getItem(STORAGE_KEY)==='1';}
    catch{return false;}
  };

  const save=value=>{
    try{localStorage.setItem(STORAGE_KEY,value?'1':'0');}
    catch{}
  };

  const setGhostMode=collapsed=>{
    document.documentElement.dataset.mapWidgetsGhostV5359=
      collapsed?'true':'false';
  };

  const setButtonState=(chat,collapsed)=>{
    const button=chat.querySelector('[data-chat-tab-toggle-v5359]');
    if(!button)return;

    button.dataset.state=collapsed?'collapsed':'expanded';
    button.setAttribute(
      'aria-label',
      collapsed?'Abrir chat da IA':'Recolher chat em aba'
    );
    button.setAttribute(
      'title',
      collapsed?'Abrir chat':'Recolher em aba'
    );

    const glyph=button.querySelector('[data-chat-tab-glyph-v5359]');
    if(glyph)glyph.textContent=collapsed?'›':'‹';
  };

  const applyState=(chat,collapsed,{persist=true}={})=>{
    if(!chat)return;

    chat.classList.toggle('tab-collapsed-v5359',collapsed);
    chat.dataset.chatTabCollapsedV5359=collapsed?'true':'false';

    if(collapsed){
      chat.dataset.wasCollapsedBeforeTabV5359=
        chat.classList.contains('collapsed')?'true':'false';
    }

    setButtonState(chat,collapsed);
    setGhostMode(collapsed);

    if(persist)save(collapsed);

    try{chat.saveLayout?.();}catch{}
  };

  const installButton=chat=>{
    if(!chat||chat.dataset.chatTabV5359==='ready')return;
    const head=chat.querySelector('.chat-head');
    if(!head)return;

    chat.dataset.chatTabV5359='ready';

    const button=document.createElement('button');
    button.type='button';
    button.className='icon-btn compact chat-tab-toggle-v5359';
    button.dataset.chatTabToggleV5359='true';
    button.innerHTML=
      '<span data-chat-tab-glyph-v5359 aria-hidden="true">‹</span>';

    const minimize=head.querySelector('.close-chat');
    if(minimize)head.insertBefore(button,minimize);
    else head.append(button);

    button.addEventListener('pointerdown',event=>{
      event.stopPropagation();
    });

    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();

      const next=!chat.classList.contains('tab-collapsed-v5359');
      applyState(chat,next);
    });

    applyState(chat,readSaved(),{persist:false});
  };

  const install=()=>{
    const chat=document.querySelector('ai-chat');
    if(chat){
      installButton(chat);
      return true;
    }
    return false;
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }

  setTimeout(install,120);
  setTimeout(install,650);
  setTimeout(install,1800);

  globalThis.__BELAVISTA_CHAT_TAB_WIDGET_GHOST_V5359={
    version:'5.3.59',
    applyState,
    install
  };
})();
