// BELAVISTA_LEAD_SYSTEM_REALTIME_V5342
(() => {
  if(globalThis.__belavistaLeadSystemRealtimeV5342)return;
  globalThis.__belavistaLeadSystemRealtimeV5342=true;

  const ENDPOINT='/api/public/lead-register';
  const SESSION_KEY='belavista.public.lead.registered.v5342';
  let pending=null;

  const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const digits=value=>String(value||'').replace(/\D/g,'');

  function detectIntent(message,selection={}){
    const text=normalize(message);
    if(!text)return false;
    const strong=[
      /\bquero (comprar|reservar|fechar|negociar|dar entrada|seguir com)\b/,
      /\btenho interesse\b/,/\bme interessei\b/,/\bquero esse lote\b/,/\bquero este lote\b/,
      /\bpode reservar\b/,/\bpode separar\b/,/\bquero fazer (uma )?proposta\b/,
      /\bquero falar com (um )?corretor\b/,/\bcomo faco para comprar\b/,/\bcomo eu compro\b/,
      /\bvamos fechar\b/,/\bquero avancar\b/
    ];
    if(strong.some(re=>re.test(text)))return true;
    const hasLot=Boolean(selection.selectedLot||selection.selectedLotId);
    return hasLot&&[/\bgostei desse\b/,/\bgostei deste\b/,/\bfico com esse\b/,/\bfico com este\b/,/\bquero ele\b/].some(re=>re.test(text));
  }

  function currentSelection(){
    const map=document.querySelector('map-scene[data-public-map],map-scene[data-public-presentation]');
    const context=map?.__publicSelectedLotContextV5330||{};
    return {
      selectedLot:String(context.selectedLot||map?.dataset.selectedPart||'').trim(),
      selectedLotId:String(context.selectedLotId||map?.dataset.selectedPart||'').trim(),
      selectedLotData:context.selectedLotData||null
    };
  }

  function currentMemory(){
    try{return globalThis.belavistaPublicChatContext?.get?.()||{id:'',turns:[]};}
    catch{return {id:'',turns:[]};}
  }

  function alreadyRegistered(lotKey){
    if(!lotKey)return false;
    try{return Boolean(JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}')[lotKey]);}
    catch{return false;}
  }

  function markRegistered(lotKey,leadId){
    if(!lotKey)return;
    let data={};
    try{data=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}')||{};}catch{}
    data[lotKey]={leadId,at:Date.now()};
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(data));}catch{}
  }

  function validCpf(value){
    const d=digits(value);
    if(d.length!==11||/^(\d)\1{10}$/.test(d))return false;
    const calc=len=>{let sum=0;for(let i=0;i<len;i++)sum+=Number(d[i])*(len+1-i);const mod=(sum*10)%11;return mod===10?0:mod;};
    return calc(9)===Number(d[9])&&calc(10)===Number(d[10]);
  }

  function validCnpj(value){
    const d=digits(value);
    if(d.length!==14||/^(\d)\1{13}$/.test(d))return false;
    const digit=base=>{let size=base.length-7,sum=0;for(const ch of base){sum+=Number(ch)*size--;if(size===1)size=9;}const result=11-(sum%11);return result>9?0:result;};
    const d1=digit(d.slice(0,12)),d2=digit(d.slice(0,12)+d1);
    return d.endsWith(`${d1}${d2}`);
  }

  function validDocument(type,value){
    const t=String(type||'').toUpperCase();
    if(t==='CPF')return validCpf(value);
    if(t==='CNPJ')return validCnpj(value);
    if(t==='RG')return digits(value).length>=5;
    return false;
  }

  function installStyle(){
    if(document.getElementById('belavista-lead-modal-v5342-style'))return;
    const style=document.createElement('style');
    style.id='belavista-lead-modal-v5342-style';
    style.textContent=`
      .public-lead-intent-modal-v5342{position:fixed;inset:0;z-index:150;display:grid;place-items:center;padding:22px;background:rgba(1,10,7,.68);backdrop-filter:blur(10px)}
      .public-lead-intent-modal-v5342[hidden]{display:none!important}
      .public-lead-intent-card-v5342{width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 38px);overflow:auto;box-sizing:border-box;padding:22px;border:1px solid rgba(135,210,174,.28);background:#061811;color:#eef8f3;box-shadow:0 24px 80px rgba(0,0,0,.45);font-family:system-ui,sans-serif}
      .public-lead-intent-card-v5342 header{display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid rgba(255,255,255,.10);padding-bottom:15px}
      .public-lead-intent-card-v5342 small,.public-lead-intent-card-v5342 label>span{color:#74a88f;font:700 9px/1.3 ui-monospace,monospace;letter-spacing:.14em}
      .public-lead-intent-card-v5342 h2{margin:5px 0;font:500 26px/1.12 Georgia,serif}
      .public-lead-intent-card-v5342 p{margin:0;color:#8ea99b;font-size:11px;line-height:1.45}
      .public-lead-intent-fields-v5342{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:17px}
      .public-lead-intent-fields-v5342 label{display:grid;gap:6px}.public-lead-intent-fields-v5342 .full{grid-column:1/-1}
      .public-lead-intent-fields-v5342 input,.public-lead-intent-fields-v5342 select{box-sizing:border-box;width:100%;min-height:44px;padding:10px;border:1px solid #29483a;background:#081d15;color:#edf8f2;outline:none}
      .public-lead-intent-lot-v5342{margin-top:15px;padding:10px 12px;border:1px solid #29483a;color:#9db8aa;font-size:11px}
      .public-lead-intent-consent-v5342{display:grid!important;grid-template-columns:auto 1fr!important;gap:9px!important;margin-top:15px!important;color:#9bb2a6;font-size:10px;line-height:1.45}
      .public-lead-intent-consent-v5342 input{width:auto!important;min-height:0!important;margin-top:2px}
      .public-lead-intent-actions-v5342{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}
      .public-lead-intent-card-v5342 button{appearance:none;min-height:40px;padding:0 14px;border:1px solid #315144;background:#0a2118;color:#e6f4ed;cursor:pointer}
      .public-lead-intent-card-v5342 button.primary{background:#afe8cc;color:#072017;border-color:#afe8cc;font-weight:700}
      .public-lead-intent-status-v5342{min-height:18px;margin-top:11px;color:#88ad9b;font-size:10px}
      .public-lead-intent-status-v5342.error{color:#f0a1a1}
      @media(max-width:620px){.public-lead-intent-fields-v5342{grid-template-columns:1fr}.public-lead-intent-fields-v5342 .full{grid-column:auto}}
    `;
    document.head.append(style);
  }

  function ensureModal(){
    let modal=document.querySelector('[data-public-lead-intent-modal-v5342]');
    if(modal)return modal;
    installStyle();
    modal=document.createElement('div');
    modal.className='public-lead-intent-modal-v5342';
    modal.dataset.publicLeadIntentModalV5342='true';
    modal.hidden=true;
    modal.innerHTML=`
      <form class="public-lead-intent-card-v5342" data-lead-intent-form novalidate>
        <header><div><small>INTENÇÃO COMERCIAL IDENTIFICADA</small><h2>Registrar interesse</h2><p>Os dados ficam ligados ao lote e ao contexto desta conversa para continuidade pelo comercial.</p></div><button type="button" data-lead-intent-close>×</button></header>
        <div class="public-lead-intent-lot-v5342" data-lead-intent-lot>Lote: —</div>
        <div class="public-lead-intent-fields-v5342">
          <label class="full"><span>Nome completo</span><input name="name" autocomplete="name" maxlength="120" required></label>
          <label><span>WhatsApp</span><input name="whatsapp" autocomplete="tel" maxlength="24" required></label>
          <label><span>Documento</span><select name="documentType"><option>CPF</option><option>RG</option><option>CNPJ</option></select></label>
          <label class="full"><span>Número do documento</span><input name="document" autocomplete="off" maxlength="32" required></label>
        </div>
        <label class="public-lead-intent-consent-v5342"><input type="checkbox" name="consent" required><span>Autorizo o registro dos dados e do contexto comercial desta conversa para continuidade da negociação.</span></label>
        <div class="public-lead-intent-status-v5342" data-lead-intent-status></div>
        <div class="public-lead-intent-actions-v5342"><button type="button" data-lead-intent-close>Agora não</button><button class="primary" type="submit">Registrar interesse</button></div>
      </form>`;
    document.body.append(modal);

    const close=()=>{const doc=modal.querySelector('[name="document"]');if(doc)doc.value='';modal.hidden=true;document.body.dataset.publicLeadIntentModal='closed';};
    modal.querySelectorAll('[data-lead-intent-close]').forEach(btn=>btn.addEventListener('click',close));
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    modal.querySelector('[data-lead-intent-form]').addEventListener('submit',submitLead);
    return modal;
  }

  function openModal(message,selection,memory){
    const lotKey=String(selection.selectedLotId||selection.selectedLot||'sem-lote');
    if(alreadyRegistered(lotKey))return;
    const modal=ensureModal();
    pending={message,selection,memory};
    modal.hidden=false;
    document.body.dataset.publicLeadIntentModal='open';
    modal.querySelector('[data-lead-intent-lot]').textContent=`Lote de interesse: ${selection.selectedLot||selection.selectedLotId||'a definir'}`;
    const status=modal.querySelector('[data-lead-intent-status]');status.textContent='';status.classList.remove('error');
    modal.querySelector('[name="name"]')?.focus();
  }

  async function submitLead(event){
    event.preventDefault();
    const form=event.currentTarget,modal=form.closest('[data-public-lead-intent-modal-v5342]');
    const status=modal.querySelector('[data-lead-intent-status]'),submit=form.querySelector('[type="submit"]');
    const values=Object.fromEntries(new FormData(form)),ctx=pending||{message:'',selection:currentSelection(),memory:currentMemory()};
    const name=String(values.name||'').trim(),whatsapp=String(values.whatsapp||'').trim();
    const documentType=String(values.documentType||'CPF').toUpperCase(),documentValue=String(values.document||'').trim();
    status.classList.remove('error');
    if(name.length<2){status.textContent='Informe o nome.';status.classList.add('error');return;}
    if(digits(whatsapp).length<10){status.textContent='Informe um WhatsApp válido.';status.classList.add('error');return;}
    if(!validDocument(documentType,documentValue)){status.textContent=`${documentType} inválido.`;status.classList.add('error');return;}
    if(values.consent!=='on'){status.textContent='Confirme a autorização para registrar.';status.classList.add('error');return;}

    submit.disabled=true;status.textContent='Registrando no sistema…';
    try{
      const configured=document.querySelector('meta[name="belavista-api-base"]')?.content?.trim()||document.querySelector('meta[name="belavista-ai-base"]')?.content?.trim()||'';
      const endpoint=new URL(ENDPOINT,configured||location.origin).href;
      const response=await fetch(endpoint,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({
        schema:'belavista.public-lead.v1',name,whatsapp,document:{type:documentType,value:documentValue},consent:true,
        lot:{...ctx.selection},
        intent:{message:String(ctx.message||'').slice(0,1200),detectedAt:new Date().toISOString()},
        conversation:{id:String(ctx.memory?.id||''),history:Array.isArray(ctx.memory?.turns)?ctx.memory.turns.slice(-8):[]},
        page:{href:location.href,source:'public-map'}
      })});
      const raw=await response.text();let payload={};try{payload=raw?JSON.parse(raw):{};}catch{}
      if(!response.ok||payload?.ok!==true)throw new Error(payload?.error||`HTTP ${response.status}`);
      const lotKey=String(ctx.selection.selectedLotId||ctx.selection.selectedLot||'sem-lote');
      markRegistered(lotKey,payload.leadId);
      form.querySelector('[name="document"]').value='';
      status.textContent=`Registrado · protocolo ${payload.leadId}`;
      modal.dataset.publicLeadId=String(payload.leadId||'');
      modal.dataset.publicLeadRealtime=payload.realtime?.published?'published':'not-published';
      setTimeout(()=>{modal.hidden=true;},1100);
    }catch(error){
      status.textContent=`Não foi possível registrar: ${error.message}`;status.classList.add('error');
      console.warn('[Belavista public v5.3.42] lead registration failed.',error);
    }finally{submit.disabled=false;}
  }

  // Window capture executes before the chat form's capture listener.
  window.addEventListener('submit',event=>{
    const form=event.target;
    if(!form?.matches?.('public-lead-chat [data-chat-form]'))return;
    const field=form.elements?.message||form.querySelector('[name="message"]');
    const message=String(field?.value||'').trim();
    const selection=currentSelection();
    if(!detectIntent(message,selection))return;
    openModal(message,selection,currentMemory());
  },{capture:true});
})();
