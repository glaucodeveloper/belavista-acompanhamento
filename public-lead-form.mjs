import {apiFetch} from './api-client.mjs';
import {uploadPublicLeadFiles} from './firebase.mjs?v=public-runtime-v5601';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clean=value=>String(value??'').trim();
const SESSION_KEY='belavista.publicLead.aiSession.v4';
const digits=value=>String(value??'').replace(/\D/g,'');
const whatsappWebUrl=(phone,message)=>`https://api.whatsapp.com/send?phone=${encodeURIComponent(digits(phone))}&text=${encodeURIComponent(clean(message))}`;
const initialSession=()=>({
  id:`PLS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
  phase:'exploration',selectedLot:null,lead:{},reservation:{},contactConfirmed:false,conversationSummary:'',updatedAt:new Date().toISOString()
});
const readSession=()=>{try{return {...initialSession(),...(JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')||{})};}catch{return initialSession();}};
const saveSession=session=>{sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));return session;};
const assistantText=data=>clean(data?.reply||data?.message||data?.text||'Conte o que procura e eu organizo os próximos passos.');
const mapKeys=new Set(['available','reserved','negotiation','sold']);
const WELCOME_MESSAGE='Bem-vindo ao Aliança Park! Posso ajudar você a encontrar um lote, consultar disponibilidade e valores ou iniciar uma reserva com o corretor.';

function typeAssistantMessage(element,value,{immediate=false}={}){
  if(!element)return Promise.resolve();
  const text=String(value??'');
  const previous=element.__publicTypingController;
  if(previous)previous.cancelled=true;
  const controller={cancelled:false};
  element.__publicTypingController=controller;
  const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(immediate||reducedMotion||text.length<2){
    element.textContent=text;
    element.classList.remove('is-assistant-typing');
    element.removeAttribute('aria-busy');
    return Promise.resolve();
  }
  element.textContent='';
  element.classList.add('is-assistant-typing');
  element.setAttribute('aria-busy','true');
  const duration=Math.min(2800,Math.max(620,text.length*13));
  const started=performance.now();
  return new Promise(resolve=>{
    const frame=now=>{
      if(controller.cancelled){resolve();return;}
      const progress=Math.min(1,(now-started)/duration);
      const eased=1-Math.pow(1-progress,2.15);
      let end=Math.max(1,Math.floor(text.length*eased));
      if(end<text.length){
        const nextSpace=text.indexOf(' ',end);
        if(nextSpace>0&&nextSpace-end<4)end=nextSpace;
      }
      element.textContent=text.slice(0,end);
      if(progress<1){requestAnimationFrame(frame);return;}
      element.textContent=text;
      element.classList.remove('is-assistant-typing');
      element.removeAttribute('aria-busy');
      if(element.__publicTypingController===controller)delete element.__publicTypingController;
      resolve();
    };
    requestAnimationFrame(frame);
  });
}

globalThis.belavistaTypeAssistantMessage=typeAssistantMessage;

async function sendConversation(payload){
  const response=await apiFetch('/api/public/lead-chat',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)
  });
  const raw=await response.text();let data={};
  try{data=raw?JSON.parse(raw):{};}catch{throw new Error('O Worker de Leads respondeu fora do formato JSON.');}
  if(!response.ok)throw new Error(data.error||data.message||`Worker respondeu HTTP ${response.status}`);
  return data;
}

class PublicLeadChat extends HTMLElement{
  connectedCallback(){this.session=readSession();this.render();this.bind();}
  render(){
    this.innerHTML=`<section class="public-chatbox" aria-label="Conversa com a IA do Aliança Park">
      <div class="public-chat-message" data-chat-message aria-live="polite">${esc(WELCOME_MESSAGE)}</div>
      <form class="public-chat-input" data-chat-form><textarea name="message" autocomplete="off" placeholder="Pergunte sobre um lote ou peça uma reserva" rows="1"></textarea><button type="submit" aria-label="Enviar">→</button></form>
      <span hidden data-chat-state>conversa assistida</span><small hidden data-chat-foot></small>
    </section>
    <dialog class="public-lead-modal" data-lead-modal><form method="dialog" data-modal-form></form></dialog>`;
  }
  bind(){
    this.querySelector('[data-chat-form]').addEventListener('submit',async event=>{
      event.preventDefault();const input=event.currentTarget.elements.message,message=clean(input.value);if(!message)return;input.value='';
      await this.talk({message});
    });
  }
  setBusy(busy,label='NVIDIA analisando…'){
    const form=this.querySelector('[data-chat-form]'),state=this.querySelector('[data-chat-state]');
    const field=form.querySelector('[name=\"message\"]');if(field)field.disabled=busy;form.querySelector('button').disabled=busy;if(state)state.textContent=busy?label:'conversa assistida';this.querySelector('.public-chatbox')?.toggleAttribute('data-busy',busy);
  }
  async talk(extra={},options={}){
    this.setBusy(true);const message=this.querySelector('[data-chat-message]');message.dataset.loading='1';message.textContent='Analisando sua intenção e o estado disponível do loteamento…';
    let result=null;
    try{
      const selectedLot=this.closest('public-leads-surface')?.selectedLot()||this.session.selectedLot||null;
      result=await sendConversation({session:this.session,selectedLot,...extra});
      this.session=saveSession({...this.session,...(result.session||{}),contactConfirmed:Boolean(this.session.contactConfirmed||result.session?.contactConfirmed)});
      delete message.dataset.loading;
      await typeAssistantMessage(message,assistantText(result));
      const foot=this.querySelector('[data-chat-foot]');if(foot)foot.textContent=result.statusLine||'';
      const surface=this.closest('public-leads-surface');
      if(result.map?.highlight)surface?.activateHighlight(result.map.highlight,'ai');
      if(result.contact?.confirmRequired&&!this.session.contactConfirmed&&!options.deferContact)this.openContactConfirm(result.contact,result.ui);
      else if(result.ui?.modal&&!options.deferModal)this.openModal(result.ui.modal,result.ui);
      if(result.effects?.reservation?.lot?.id||result.effects?.reservation?.lot?.code)surface?.markReserved(result.effects.reservation.lot);
    }catch(error){delete message.dataset.loading;await typeAssistantMessage(message,error?.message||'Não foi possível continuar agora.');}
    finally{this.setBusy(false);}
    return result;
  }
  openContactConfirm(contact={},nextUi={}){
    const dialog=this.querySelector('[data-lead-modal]'),form=this.querySelector('[data-modal-form]');
    const phone=digits(contact.phone||'');
    if(!phone){
      const foot=this.querySelector('[data-chat-foot]');if(foot)foot.textContent='Contato comercial ainda não configurado no Worker.';
      if(nextUi?.modal)this.openModal(nextUi.modal,nextUi);
      return;
    }
    this.pendingContact={contact:{...contact,phone},nextUi};
    form.dataset.kind='contact-confirm';
    const display=phone.replace(/^(55)(\d{2})(\d+)/,'+$1 ($2) $3');
    form.innerHTML=this.modalShell('Confirme contato',`Confirme o contato pelo WhatsApp. Ao tocar em OK, abriremos o WhatsApp com a mensagem já preparada para o comercial.`,`<div class="public-contact-confirm"><span>WHATSAPP</span><b>${esc(display)}</b><p>${esc(contact.message||'Olá, quero continuar meu contato sobre o Aliança Park.')}</p></div>`,'OK · abrir WhatsApp');
    form.querySelector('[data-modal-close]').onclick=()=>dialog.close();
    form.onsubmit=event=>this.submitModal(event);
    dialog.showModal();
  }
  async registerContactConfirmation(){
    try{
      const selectedLot=this.closest('public-leads-surface')?.selectedLot()||this.session.selectedLot||null;
      const result=await sendConversation({session:this.session,selectedLot,event:{type:'lead.contact.confirmed',at:new Date().toISOString(),payload:{channel:'whatsapp-web'}}});
      this.session=saveSession({...this.session,...(result.session||{}),contactConfirmed:true});
    }catch(error){console.warn('Falha ao registrar confirmação de contato',error);}
  }
  modalShell(title,subtitle,body,button='Continuar'){
    return `<header><div><span>ALIANÇA PARK · CONTINUIDADE DA CONVERSA</span><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button type="button" data-modal-close aria-label="Fechar">×</button></header>${body}<footer><button type="submit" class="public-modal-primary">${esc(button)}</button></footer>`;
  }
  openModal(kind,ui={}){
    const dialog=this.querySelector('[data-lead-modal]'),form=this.querySelector('[data-modal-form]');form.dataset.kind=kind;
    if(kind==='registration')form.innerHTML=this.modalShell('Identificação','Para registrar sua intenção e continuar a reserva, preciso identificar você.',`<div class="public-modal-grid"><label>Nome completo<input name="name" required autocomplete="name" value="${esc(this.session.lead?.name||'')}"></label><label>WhatsApp com DDD<input name="whatsapp" required autocomplete="tel" value="${esc(this.session.lead?.whatsapp||'')}"></label><label>E-mail<input name="email" required type="email" autocomplete="email" value="${esc(this.session.lead?.email||'')}"></label><label>CPF<input name="cpf" required inputmode="numeric" autocomplete="off" placeholder="000.000.000-00"></label></div>`,'Enviar identificação');
    else if(kind==='documents')form.innerHTML=this.modalShell('Documentos','A IA pediu a documentação como próximo passo da reserva.',`<div class="public-modal-grid"><label>Identidade — frente<input name="identityFront" required type="file" accept="image/*,application/pdf"></label><label>Identidade — verso<input name="identityBack" required type="file" accept="image/*,application/pdf"></label><label>Comprovante de endereço<input name="addressProof" required type="file" accept="image/*,application/pdf"></label></div><p class="public-modal-note">Os arquivos vão para o armazenamento Firebase; a NVIDIA recebe apenas o fato de que os documentos foram enviados e seus metadados, não o conteúdo do documento.</p>`,'Enviar documentos');
    else if(kind==='signal')form.innerHTML=this.modalShell('Sinal da reserva',ui?.signalMessage||'Só falta o sinal com o envio do comprovante para efetivar a reserva no estado comercial.',`<label>Comprovante do sinal<input name="paymentProof" required type="file" accept="image/*,application/pdf"></label><p class="public-modal-note">O lote só será marcado como Reservado depois que a IA receber este evento e retornar a ação de confirmação.</p>`,'Enviar comprovante');
    else return;
    form.querySelector('[data-modal-close]').onclick=()=>dialog.close();
    form.onsubmit=event=>this.submitModal(event);
    dialog.showModal();
  }
  async submitModal(event){
    event.preventDefault();const form=event.currentTarget,kind=form.dataset.kind,dialog=this.querySelector('[data-lead-modal]');
    const button=form.querySelector('[type="submit"]');button.disabled=true;button.textContent='Enviando…';
    try{
      if(kind==='contact-confirm'){
        const pending=this.pendingContact||{};
        const contact=pending.contact||{};
        const url=whatsappWebUrl(contact.phone,contact.message||'Olá, quero continuar meu contato sobre o Aliança Park.');
        this.session=saveSession({...this.session,contactConfirmed:true,updatedAt:new Date().toISOString()});
        window.open(url,'_blank','noopener,noreferrer');
        dialog.close();
        void this.registerContactConfirmation();
        this.pendingContact=null;
        if(pending.nextUi?.modal)setTimeout(()=>this.openModal(pending.nextUi.modal,pending.nextUi),80);
        return;
      }else if(kind==='registration'){
        const data=Object.fromEntries(new FormData(form));
        const result=await this.talk({event:{type:'lead.registration.submitted',at:new Date().toISOString(),payload:data}},{deferContact:true,deferModal:true});
        dialog.close();
        if(result?.contact?.confirmRequired&&!this.session.contactConfirmed)this.openContactConfirm(result.contact,result.ui||{});
        else if(result?.ui?.modal)this.openModal(result.ui.modal,result.ui);
        return;
      }else if(kind==='documents'){
        const files={identityFront:form.elements.identityFront.files[0],identityBack:form.elements.identityBack.files[0],addressProof:form.elements.addressProof.files[0]};
        const documents=await uploadPublicLeadFiles(this.session.id,files,{scope:'documents'});
        await this.talk({event:{type:'reservation.documents.submitted',at:new Date().toISOString(),payload:{documents}}});
      }else if(kind==='signal'){
        const files={paymentProof:form.elements.paymentProof.files[0]};
        const proof=await uploadPublicLeadFiles(this.session.id,files,{scope:'signal'});
        await this.talk({event:{type:'reservation.signal.proof.submitted',at:new Date().toISOString(),payload:{proof:proof.paymentProof||Object.values(proof)[0]}}});
      }
      dialog.close();
    }catch(error){const note=form.querySelector('.public-modal-note')||document.createElement('p');note.className='public-modal-note error';note.textContent=error?.message||'Falha ao enviar.';if(!note.isConnected)form.insertBefore(note,form.querySelector('footer'));}
    finally{button.disabled=false;button.textContent=kind==='contact-confirm'?'OK · abrir WhatsApp':kind==='signal'?'Enviar comprovante':kind==='documents'?'Enviar documentos':'Enviar identificação';}
  }
}
if(!customElements.get('public-lead-chat'))customElements.define('public-lead-chat',PublicLeadChat);

// Compatibilidade com usos antigos do componente dentro do projeto.
class PublicLeadForm extends HTMLElement{connectedCallback(){if(!this.querySelector('public-lead-chat'))this.innerHTML='<public-lead-chat></public-lead-chat>';}}
if(!customElements.get('public-lead-form'))customElements.define('public-lead-form',PublicLeadForm);

const HIGHLIGHT_COPY={
  available:{index:'01',title:'Verde para escolher',text:'Veja os lotes disponíveis, compare posições e converse com a equipe antes de decidir.'},
  reserved:{index:'02',title:'Escolhas em andamento',text:'Em amarelo, cada reserva em andamento sinaliza uma oportunidade que está ganhando destino.'},
  negotiation:{index:'03',title:'Converse sobre o próximo passo',text:'Em azul, os lotes em negociação convidam você a comparar alternativas e condições próximas.'},
  sold:{index:'04',title:'Uma comunidade tomando forma',text:'Em vermelho, os lotes vendidos contam a história de quem já escolheu viver no Aliança Park.'}
};

const pageMarkup=()=>`<div class="public-leads-experience">
  <section class="public-map-story" id="mapa" data-map-story>
    <div class="public-map-sticky">
      <div class="public-map-static-bg" aria-hidden="true"></div>
      <map-scene data-public-map data-public-presentation data-stage="Aliança Park · comercial" aria-label="Mapa interativo do loteamento" data-public-static-base="true" data-public-static-capture="/assets/public/dwg-satellite-treated-v5411.png"></map-scene>
      <div class="public-map-vignette"></div>

      <header class="public-page-nav">
        <a class="public-page-brand" href="#mapa" aria-label="Aliança Park — início">
          <span class="public-page-brand-mark" aria-hidden="true">A</span>
          <span><b>Aliança Park</b><small>Lotes em Amargosa, Bahia</small></span>
        </a>
        <nav aria-label="Navegação da página">
          <a href="#como-funciona">Como funciona</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <a class="public-page-nav-cta" href="#mapa">Explorar lotes <span aria-hidden="true">↗</span></a>
      </header>

      <div class="public-hero-letter" data-hero-letter>
        <span>ALIANÇA PARK · AMARGOSA, BAHIA</span>
        <h1>Escolha seu lote<br><em>em Amargosa, Bahia.</em></h1>
        <p>Explore a planta, selecione um lote e continue a conversa com essa referência.</p>
      </div>

      <div class="public-scroll-legend" data-scroll-legend aria-live="off">
        <span data-legend-index>MAPA</span>
        <div><b data-legend-title>Encontre seu lugar</b><small data-legend-text>Consulte lotes, compare posições e converse com a equipe para planejar sua visita ou iniciar uma reserva.</small></div>
      </div>

      <public-lead-chat id="atendimento"></public-lead-chat>
      <div class="public-selected-lot" data-selected-lot hidden></div>
    </div>

  </section>

  <section class="public-overview public-reveal" data-public-reveal>
    <div class="public-overview-copy">
      <span class="public-kicker">LOTEAMENTO · AMARGOSA, BAHIA</span>
      <h2>Planta, disponibilidade e atendimento <em>no mesmo fluxo.</em></h2>
      <p>Encontre uma posição no mapa, consulte a situação do lote e envie sua dúvida sem perder a referência da unidade escolhida.</p>
      <a class="public-text-link" href="#mapa">Abrir mapa de lotes <span aria-hidden="true">→</span></a>
    </div>
    <aside class="public-overview-stat" aria-label="Quadro oficial de lotes">
      <span class="public-stat-icon" aria-hidden="true">⌖</span>
      <b>298</b>
      <strong>lotes no quadro oficial</strong>
      <small>Selecione uma unidade na planta para iniciar a consulta.</small>
    </aside>
  </section>

  <section class="public-features public-reveal" data-public-reveal>
    <header class="public-section-heading" id="como-funciona">
      <span class="public-kicker">COMO FUNCIONA</span>
      <h2>Uma escolha mais clara, <em>passo a passo.</em></h2>
      <p>Use a planta e o atendimento juntos para entender as opções e decidir como seguir.</p>
    </header>
    <div class="public-feature-grid">
      <article class="public-feature-card">
        <span class="public-feature-number">01</span>
        <span class="public-feature-icon" aria-hidden="true">⌖</span>
        <h3>Explore a planta</h3>
        <p>Amplie o mapa e toque em um lote para ver sua posição e levar essa referência à conversa.</p>
        <a href="#mapa">Ir para o mapa <span aria-hidden="true">↗</span></a>
      </article>
      <article class="public-feature-card">
        <span class="public-feature-number">02</span>
        <span class="public-feature-icon public-status-icon" aria-hidden="true"><i></i><i></i><i></i></span>
        <h3>Confira a situação</h3>
        <p>As cores distinguem lotes disponíveis, reservados, em negociação e vendidos.</p>
        <small class="public-status-key"><i class="available"></i> Disponível <i class="reserved"></i> Reserva <i class="negotiation"></i> Negociação <i class="sold"></i> Vendido</small>
      </article>
      <article class="public-feature-card">
        <span class="public-feature-number">03</span>
        <span class="public-feature-icon" aria-hidden="true">↗</span>
        <h3>Converse sobre a escolha</h3>
        <p>Pergunte sobre o lote selecionado. A conversa acompanha a unidade e orienta os próximos passos.</p>
        <a href="#mapa">Começar consulta <span aria-hidden="true">↗</span></a>
      </article>
    </div>
  </section>

  <section class="public-steps public-reveal" data-public-reveal>
    <header class="public-section-heading">
      <span class="public-kicker">DA CONSULTA À RESERVA</span>
      <h2>Você escolhe o ritmo.</h2>
      <p>Comece comparando. A identificação só entra quando for necessária para continuar.</p>
    </header>
    <ol class="public-step-list">
      <li><span>01</span><div><h3>Escolha uma posição</h3><p>Selecione um lote diretamente no mapa. A referência permanece ligada à conversa.</p></div></li>
      <li><span>02</span><div><h3>Tire suas dúvidas</h3><p>Pergunte sobre situação, valor ou alternativas antes de decidir.</p></div></li>
      <li><span>03</span><div><h3>Avance quando estiver pronto</h3><p>Se quiser continuar uma reserva, o atendimento solicita os dados e documentos necessários para aquela etapa.</p></div></li>
    </ol>
  </section>

  <section class="public-faq public-reveal" id="duvidas" data-public-reveal>
    <header class="public-section-heading">
      <span class="public-kicker">DÚVIDAS FREQUENTES</span>
      <h2>Antes de escolher.</h2>
      <p>Respostas rápidas para você começar a explorar o mapa.</p>
    </header>
    <div class="public-faq-list">
      <details><summary>Como encontro um lote específico?</summary><p>Use o zoom e navegue pela planta. Ao selecionar um lote, envie sua pergunta no atendimento para consultar aquela unidade.</p></details>
      <details><summary>O que significam as cores do mapa?</summary><p>Elas indicam a situação comercial registrada: disponível, reservado, em negociação ou vendido. Confirme a situação atual na conversa antes de avançar.</p></details>
      <details><summary>Preciso me identificar para consultar?</summary><p>Não. Você pode começar perguntando sobre os lotes. A identificação é solicitada quando for necessária para registrar a intenção e continuar uma reserva.</p></details>
      <details><summary>Como continuo uma reserva?</summary><p>Selecione o lote e peça para continuar pelo atendimento. Ele orienta cada etapa e solicita documentos apenas quando forem necessários.</p></details>
    </div>
  </section>

  <section class="public-contact public-reveal" data-public-reveal>
    <div class="public-contact-card">
      <div>
        <span class="public-kicker">SEU PRÓXIMO PASSO</span>
        <h2>Encontre uma opção que faça sentido para você.</h2>
        <p>Volte à planta, escolha um lote e envie sua pergunta com a unidade já selecionada.</p>
      </div>
      <a class="public-contact-cta" href="#mapa">Explorar lotes no mapa <span aria-hidden="true">↗</span></a>
    </div>
  </section>
  <footer class="public-page-footer"><a href="#mapa">Aliança Park</a><span>Amargosa · Bahia</span><a href="#mapa">Voltar ao mapa ↑</a></footer>
</div>`;

export class PublicLeadsSurface extends HTMLElement{
  connectedCallback(){this.render();this.bind();}
  disconnectedCallback(){
    if(this._publicScrollHandler)removeEventListener('scroll',this._publicScrollHandler);
    if(this._publicResizeHandler)removeEventListener('resize',this._publicResizeHandler);
    if(this._publicRaf)cancelAnimationFrame(this._publicRaf);
    if(this._publicModelStartTimer)clearTimeout(this._publicModelStartTimer);
    if(this._publicWheelHandler)removeEventListener('wheel',this._publicWheelHandler,{capture:true});
    if(this._publicTouchStartHandler)removeEventListener('touchstart',this._publicTouchStartHandler,{capture:true});
    if(this._publicTouchMoveHandler)removeEventListener('touchmove',this._publicTouchMoveHandler,{capture:true});
    if(this._publicTouchEndHandler)removeEventListener('touchend',this._publicTouchEndHandler,{capture:true});
    this._publicRevealObserver?.disconnect?.();
  }
  render(){this.innerHTML=pageMarkup();}
  map(){return this.querySelector('map-scene[data-public-map]');}
  selectedLot(){const map=this.map(),value=clean(map?.dataset.selectedPart);return value&&value!=='Nenhum lote selecionado'?{id:value,label:value,status:'unknown'}:null;}
  activateHighlight(key,source='interactive'){
    if(!mapKeys.has(key))return;
    const map=this.map(),copy=HIGHLIGHT_COPY[key]||HIGHLIGHT_COPY.urbanizacao;
    try{map?.setPublicLotFilter?.(key);}catch{map?.setAttribute('data-public-lot-filter',key);}
    map?.setAttribute('data-public-highlight',key);
    const legend=this.querySelector('[data-scroll-legend]');
    legend?.querySelector('[data-legend-index]')?.replaceChildren(copy.index);
    legend?.querySelector('[data-legend-title]')?.replaceChildren(copy.title);
    legend?.querySelector('[data-legend-text]')?.replaceChildren(copy.text);
    this.dataset.highlightSource=source;
    this.dataset.activeHighlight=key;
  }
  clearScrollHighlight(){
    const map=this.map();
    try{map?.clearPublicLotFilter?.();}catch{}
    map?.removeAttribute('data-public-highlight');
    delete this.dataset.activeHighlight;
  }
  markReserved(lot){const box=this.querySelector('[data-selected-lot]');box.hidden=false;box.innerHTML=`<span>RESERVADO</span><b>${esc(lot.code||lot.label||lot.id)}</b>`;}
  bind(){
    const letter=this.querySelector('[data-hero-letter]'),legend=this.querySelector('[data-scroll-legend]'),map=this.map(),lotBox=this.querySelector('[data-selected-lot]'),story=this.querySelector('[data-map-story]');
    if(!story||!letter||!legend)return;
    const clamp=value=>Math.min(1,Math.max(0,value));
    const smooth=(a,b,value)=>{const t=clamp((value-a)/Math.max(.0001,b-a));return t*t*(3-2*t);};
    const disableAdministrativeMapControls=()=>{
      if(!map)return;
      map.dataset.publicPresentation='true';
      try{map.setMapContext?.('leads');}catch{}
      map.querySelectorAll('.map-category-switcher,.map-rotation-controls,.map-gesture-legend,.map-badge,.map-selection-tools,.map-selection-panel,.map-v5-launcher,.compact-map-controls,.map-status-panel,[data-map-controls],[data-scene-selection]').forEach(node=>{
        node.hidden=true;node.setAttribute('aria-hidden','true');try{node.inert=true;}catch{}
      });
    };
    disableAdministrativeMapControls();

    const applyState=p=>{
      const heroFade=smooth(.035,.285,p);
      const legendReveal=smooth(.255,.345,p);
      const lift=heroFade*34;
      const side=heroFade*10;
      letter.style.opacity=String(1-heroFade);
      letter.style.filter=`blur(${(heroFade*3.2).toFixed(2)}px)`;
      letter.style.setProperty('--public-letter-lift',`${lift.toFixed(2)}px`);
      letter.style.setProperty('--public-letter-side',`${side.toFixed(2)}px`);
      legend.style.opacity=String(legendReveal);
      legend.style.transform='translate3d(0,0,0)';
      this.style.setProperty('--public-map-reveal',String(.38+heroFade*.62));
      this.style.setProperty('--public-vignette-shift',`${(heroFade*6).toFixed(2)}%`);
    };

    const renderFromScroll=()=>{
      const storyTop=story.getBoundingClientRect().top+scrollY;
      const travel=Math.max(1,story.offsetHeight-innerHeight);
      const p=clamp((scrollY-storyTop)/travel);
      const release=scrollY>=storyTop+travel-.5;
      story.dataset.sceneReleased=release?'true':'false';
      this.dataset.scenePinned=release?'false':'true';
      this.dataset.scrollProgress=p.toFixed(4);
      if(p>.01&&map?.dataset.publicThree==='deferred')map?.startPublic3D?.();
      applyState(p);
    };

    const requestRender=()=>{
      if(this._publicRaf)return;
      this._publicRaf=requestAnimationFrame(()=>{this._publicRaf=0;renderFromScroll();});
    };
    this._publicScrollHandler=requestRender;
    this._publicResizeHandler=requestRender;
    addEventListener('scroll',requestRender,{passive:true});
    addEventListener('resize',requestRender,{passive:true});

    const revealNodes=[...this.querySelectorAll('[data-public-reveal],.public-seals')];
    this._publicRevealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting)entry.target.classList.add('is-visible');
    }),{threshold:.16,rootMargin:'0px 0px -8%'});
    revealNodes.forEach(node=>this._publicRevealObserver.observe(node));

    let wheelCharge=0,lastWheelAt=0,snapLocked=false;
    this._publicWheelHandler=event=>{
      if(event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||snapLocked)return;
      const now=performance.now();
      if(now-lastWheelAt>420)wheelCharge=0;
      lastWheelAt=now;
      const top=story.getBoundingClientRect().top+scrollY;
      const travel=Math.max(1,story.offsetHeight-innerHeight);
      const firstGate=top+innerHeight*.2;
      const secondGate=top+travel-innerHeight*.12;
      const down=event.deltaY>0;
      const nearFirst=down&&scrollY>=top&&scrollY<firstGate;
      const nearSecond=down&&scrollY>=secondGate-innerHeight*.22&&scrollY<secondGate;
      if(!nearFirst&&!nearSecond){wheelCharge=0;return;}
      event.preventDefault();
      wheelCharge+=Math.abs(event.deltaY);
      const resistance=nearFirst?180:240;
      if(wheelCharge<resistance)return;
      wheelCharge=0;snapLocked=true;
      const target=nearFirst?top+innerHeight*.42:story.nextElementSibling?.getBoundingClientRect().top+scrollY;
      scrollTo({top:Number.isFinite(target)?target:secondGate,behavior:'smooth'});
      setTimeout(()=>{snapLocked=false;},720);
    };
    addEventListener('wheel',this._publicWheelHandler,{passive:false,capture:true});

    let touchStartY=0,touchCharge=0;
    const snapForTouch=()=>{
      const top=story.getBoundingClientRect().top+scrollY;
      const travel=Math.max(1,story.offsetHeight-innerHeight);
      const firstGate=top+innerHeight*.2;
      const secondGate=top+travel-innerHeight*.12;
      if(touchCharge<72||snapLocked)return;
      let target=null;
      if(scrollY>=top&&scrollY<firstGate)target=top+innerHeight*.42;
      else if(scrollY>=secondGate-innerHeight*.22&&scrollY<secondGate)target=story.nextElementSibling?.getBoundingClientRect().top+scrollY;
      if(!Number.isFinite(target))return;
      snapLocked=true;
      scrollTo({top:target,behavior:'smooth'});
      setTimeout(()=>{snapLocked=false;},720);
    };
    this._publicTouchStartHandler=event=>{touchStartY=event.touches?.[0]?.clientY||0;touchCharge=0;};
    this._publicTouchMoveHandler=event=>{
      const y=event.touches?.[0]?.clientY||touchStartY;
      const delta=touchStartY-y;
      if(delta>0)touchCharge+=delta;
      touchStartY=y;
    };
    this._publicTouchEndHandler=()=>{snapForTouch();touchCharge=0;};
    addEventListener('touchstart',this._publicTouchStartHandler,{passive:true,capture:true});
    addEventListener('touchmove',this._publicTouchMoveHandler,{passive:true,capture:true});
    addEventListener('touchend',this._publicTouchEndHandler,{passive:true,capture:true});

    const startPublic3D=()=>map?.startPublic3D?.();
    // O modelo é parte da composição inicial; não deve depender do primeiro scroll.
    this._publicModelStartTimer=setTimeout(startPublic3D,180);
    map?.addEventListener('pointerdown',startPublic3D,{once:true,passive:true});
    map?.addEventListener('click',()=>setTimeout(()=>{
      const lot=this.selectedLot();if(!lot)return;
      lotBox.hidden=false;lotBox.innerHTML=`<span>LOTE SELECIONADO</span><b>${esc(lot.label)}</b><small>Peça disponibilidade ou reserva no chat.</small>`;
      const chat=this.querySelector('public-lead-chat');chat.session=saveSession({...chat.session,selectedLot:lot});
    },80));
    renderFromScroll();
  }
}
if(!customElements.get('public-leads-surface'))customElements.define('public-leads-surface',PublicLeadsSurface);
