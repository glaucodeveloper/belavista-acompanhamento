import {apiFetch} from './api-client.mjs';
import {uploadPublicLeadFiles} from './firebase.mjs?v=public-runtime-v47';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clean=value=>String(value??'').trim();
const SESSION_KEY='belavista.publicLead.aiSession.v4';
const PUBLIC_CHAT_IMAGE_MAX_BYTES=6*1024*1024;
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
      <div class="public-chat-instagram-handoff" data-instagram-handoff hidden></div>
      <div class="public-chat-attachment" data-chat-attachment aria-live="polite" hidden></div>
      <div class="public-chat-media-row"><button type="button" class="public-chat-media-button" data-chat-camera aria-label="Adicionar uma imagem à conversa">＋ Imagem</button><input type="file" data-chat-camera-input accept="image/png,image/jpeg,image/webp" capture="environment" aria-label="Adicionar imagem à conversa"><span>Cole uma imagem · Ctrl+V</span></div>
      <form class="public-chat-input" data-chat-form><textarea name="message" autocomplete="off" placeholder="Pergunte sobre um lote ou peça uma reserva" rows="1"></textarea><button type="submit" aria-label="Enviar">→</button></form>
      <span hidden data-chat-state>conversa assistida</span><small hidden data-chat-foot></small>
    </section>
    <dialog class="public-lead-modal" data-lead-modal><form method="dialog" data-modal-form></form></dialog>`;
  }
  bind(){
    this.querySelector('[data-chat-form]').addEventListener('submit',async event=>{
      event.preventDefault();const input=event.currentTarget.elements.message,message=clean(input.value);if(!message&&!this.chatAttachment)return;input.value='';
      const attachment=this.chatAttachment;this.chatAttachment=null;this.renderChatAttachment();
      await this.talk({message:message||'Analise a imagem enviada e indique como ela se relaciona à escolha do lote ou à reserva.',attachment:attachment?{name:attachment.name,mimeType:attachment.mimeType,dataUrl:attachment.dataUrl}:null});
    });
    const cameraInput=this.querySelector('[data-chat-camera-input]'),textarea=this.querySelector('[name="message"]');
    this.querySelector('[data-chat-camera]')?.addEventListener('click',()=>cameraInput?.click());
    cameraInput?.addEventListener('change',event=>{const file=event.currentTarget.files?.[0];if(file)this.readChatImage(file);});
    textarea?.addEventListener('paste',event=>{const item=[...(event.clipboardData?.items||[])].find(entry=>entry.kind==='file'&&/^image\/(?:png|jpeg|webp)$/i.test(entry.type));const file=item?.getAsFile?.();if(!file)return;event.preventDefault();this.readChatImage(file);});
    this.querySelector('[data-instagram-handoff]')?.addEventListener('click',async event=>{const button=event.target.closest('[data-instagram-copy]');if(!button)return;const value=button.dataset.message||'';try{await navigator.clipboard.writeText(value);button.textContent='Mensagem copiada';}catch{button.textContent='Selecione e copie a mensagem';}});
    this.renderChatAttachment();
  }
  setBusy(busy,label='NVIDIA analisando…'){
    const form=this.querySelector('[data-chat-form]'),state=this.querySelector('[data-chat-state]');
    const field=form.querySelector('[name=\"message\"]');if(field)field.disabled=busy;form.querySelector('button[type=\"submit\"]').disabled=busy;this.querySelector('[data-chat-camera]')?.toggleAttribute('disabled',busy);if(state)state.textContent=busy?label:'conversa assistida';this.querySelector('.public-chatbox')?.toggleAttribute('data-busy',busy);
  }
  readChatImage(file){
    if(!file)return;
    const mimeType=String(file.type||'').toLowerCase();
    if(!/^image\/(?:png|jpeg|webp)$/.test(mimeType)){this.setFoot('Use PNG, JPEG ou WEBP.');return;}
    if(Number(file.size)>PUBLIC_CHAT_IMAGE_MAX_BYTES){this.setFoot('A imagem precisa ter no máximo 6 MB.');return;}
    const reader=new FileReader();
    reader.onload=()=>{const dataUrl=String(reader.result||'');if(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(dataUrl)){this.setFoot('Não foi possível preparar a imagem.');return;}this.chatAttachment={name:String(file.name||'imagem-colada'),mimeType,dataUrl};this.renderChatAttachment();};
    reader.onerror=()=>this.setFoot('Não foi possível ler a imagem.');
    reader.readAsDataURL(file);
  }
  setFoot(value){const foot=this.querySelector('[data-chat-foot]');if(foot){foot.hidden=false;foot.textContent=value;}}
  renderChatAttachment(){
    const slot=this.querySelector('[data-chat-attachment]');if(!slot)return;
    slot.hidden=!this.chatAttachment;slot.innerHTML=this.chatAttachment?`<img src="${esc(this.chatAttachment.dataUrl)}" alt="Prévia da imagem ${esc(this.chatAttachment.name)}"><span><b>Imagem pronta para a IA</b><small>${esc(this.chatAttachment.name)}</small></span><button type="button" data-chat-attachment-remove aria-label="Remover imagem">×</button>`:'';
    slot.querySelector('[data-chat-attachment-remove]')?.addEventListener('click',()=>{this.chatAttachment=null;const input=this.querySelector('[data-chat-camera-input]');if(input)input.value='';this.renderChatAttachment();});
  }
  renderInstagramHandoff(instagram=null){
    const slot=this.querySelector('[data-instagram-handoff]');
    if(!slot)return;
    if(!instagram?.directUrl){slot.hidden=true;slot.innerHTML='';return;}
    const message=instagram.copyableMessage||instagram.message||'';
    slot.hidden=false;
    slot.innerHTML='<button type="button" class="public-chat-instagram-toggle" data-instagram-toggle aria-expanded="false"><span>CONTINUAR PELO INSTAGRAM</span><b>'+esc(instagram.username||'Instagram')+'</b><i>Opcional · abrir mensagem pronta</i></button><div class="public-chat-instagram-panel" data-instagram-panel hidden><p>Abra o Direct oficial e envie a mensagem pronta abaixo.</p><iframe src="/instagram-message.html" title="Mensagem pronta para o Instagram" data-instagram-frame></iframe><div class="public-chat-instagram-handoff-actions"><a href="'+esc(instagram.directUrl)+'" target="_blank" rel="noopener noreferrer">Abrir Direct</a><button type="button" data-instagram-copy data-message="'+esc(message)+'">Copiar mensagem</button></div></div>';
    const toggle=slot.querySelector('[data-instagram-toggle]'),panel=slot.querySelector('[data-instagram-panel]');
    toggle?.addEventListener('click',()=>{
      const open=panel.hidden;
      panel.hidden=!open;
      toggle.setAttribute('aria-expanded',String(open));
      if(open)panel.querySelector('[data-instagram-frame]')?.contentWindow?.postMessage({type:'instagram-message',payload:instagram},location.origin);
    });
    const frame=slot.querySelector('[data-instagram-frame]');
    const send=()=>frame?.contentWindow?.postMessage({type:'instagram-message',payload:instagram},location.origin);
    frame?.addEventListener('load',send,{once:true});
    if(frame?.contentDocument?.readyState==='complete'&&!panel.hidden)send();
  }
  async talk(extra={},options={}){
    this.setBusy(true);const message=this.querySelector('[data-chat-message]');message.dataset.loading='1';message.textContent='Analisando sua intenção e o estado disponível do loteamento…';
    let result=null;
    try{
      const selectedLot=this.closest('public-leads-surface')?.selectedLot()||this.session.selectedLot||null;
      result=await sendConversation({session:this.session,selectedLot,...extra});
      this.session=saveSession({...this.session,...(result.session||{}),contactConfirmed:Boolean(this.session.contactConfirmed||result.session?.contactConfirmed)});
      this.renderInstagramHandoff(result.contact?.instagram||null);
      delete message.dataset.loading;
      await typeAssistantMessage(message,assistantText(result));
      const foot=this.querySelector('[data-chat-foot]');if(foot){foot.hidden=!result.statusLine&&!result.attachment;foot.textContent=result.attachment?.stored?'Imagem protegida no Cloudflare R2 e analisada pela NVIDIA.':result.attachment?'Imagem analisada nesta conversa; R2 ainda não está configurado.':result.statusLine||'';}
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
    if(kind==='registration')form.innerHTML=this.modalShell('Identificação','Para registrar sua intenção e continuar a reserva, preciso identificar você.',`<div class="public-modal-grid"><label>Nome completo<input name="name" required autocomplete="name" value="${esc(this.session.lead?.name||'')}"></label><label>WhatsApp com DDD<input name="whatsapp" required autocomplete="tel" value="${esc(this.session.lead?.whatsapp||'')}"></label><label>E-mail<input name="email" required type="email" autocomplete="email" value="${esc(this.session.lead?.email||'')}"></label><label>Instagram @ <small>(opcional)</small><input name="instagramHandle" inputmode="text" autocomplete="off" placeholder="@seuusuario" value="${esc(this.session.lead?.instagramHandle||'')}"></label><label>CPF<input name="cpf" required inputmode="numeric" autocomplete="off" placeholder="000.000.000-00"></label></div>`,'Enviar identificação');
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
  <section class="public-map-story" data-map-story>
    <div class="public-map-sticky">
      <div class="public-map-static-bg" aria-hidden="true"></div>
      <map-scene data-public-map data-public-presentation data-admin-public-map data-public-static-only="true" data-stage="Aliança Park · comercial" aria-label="Mapa interativo dos lotes do loteamento" data-public-static-base="true" data-public-static-capture="/assets/public/dwg-satellite-public-v1.webp"></map-scene>
      <div class="public-map-vignette"></div>

      <div class="public-hero-letter" data-hero-letter>
        <span>ALIANÇA PARK · AMARGOSA, BAHIA</span>
        <h1>Escolha seu lote<br><em>em Amargosa, Bahia.</em></h1>
        <p>Consulte disponibilidade, compare posições e avance para uma reserva assistida.</p>
      </div>

      <div class="public-scroll-legend" data-scroll-legend aria-live="off">
        <span data-legend-index>MAPA</span>
        <div><b data-legend-title>Encontre seu lugar</b><small data-legend-text>Consulte lotes, compare posições e converse com a equipe para planejar sua visita ou iniciar uma reserva.</small></div>
      </div>

      <div class="public-map-gesture-controls" data-public-map-controls aria-label="Controles do mapa">
        <span>MAPA</span>
        <button type="button" data-map-zoom="out" aria-label="Diminuir zoom" title="Diminuir zoom">−</button>
        <button type="button" data-map-zoom="in" aria-label="Aumentar zoom" title="Aumentar zoom">+</button>
        <button type="button" data-map-zoom="reset" aria-label="Recentralizar mapa" title="Recentralizar mapa">⌖</button>
        <small>Arraste para mover · Shift + arraste para aproximar</small>
      </div>

      <public-lead-chat></public-lead-chat>
      <div class="public-selected-lot" data-selected-lot hidden></div>
    </div>

  </section>

  <section class="public-place-story public-reveal" data-public-reveal>
    <div class="public-place-copy">
      <span>UM NOVO LUGAR EM AMARGOSA</span>
      <h2>Espaço para construir planos.<br><em>Calma para viver bem.</em></h2>
      <p>O Aliança Park aproxima natureza, mobilidade e uma escolha acompanhada do primeiro contato à reserva.</p>
    </div>
    <div class="public-place-graphic" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i>
      <b>298</b><small>oportunidades para escolher</small>
    </div>
  </section>

  <section class="public-seals" id="selos">
    <header><span>ALIANÇA PARK</span><h2>Selos do loteamento</h2><p>Referências de acompanhamento e segurança da experiência comercial.</p></header>
    <div class="public-seal-grid">
      <article><i data-lucide="map-pinned"></i><b>Mapa integrado</b><small>Leitura espacial do loteamento.</small></article>
      <article><i data-lucide="badge-check"></i><b>Disponibilidade</b><small>Estado comercial conectado ao cadastro.</small></article>
      <article><i data-lucide="message-circle-more"></i><b>Reserva assistida</b><small>Conversa até identificação, documentos e sinal.</small></article>
      <article><i data-lucide="shield-check"></i><b>Rastreabilidade</b><small>Lead e reserva registrados pelo Worker.</small></article>
    </div>
  </section>

  <section class="public-contact public-reveal" id="contato" data-public-reveal>
    <div class="public-contact-copy">
      <span>FALE COM A EQUIPE</span>
      <h2>Conheça o loteamento<br>do seu jeito.</h2>
      <p>Converse para consultar disponibilidade, organizar uma visita e entender as próximas etapas da reserva.</p>
      <div class="public-contact-actions">
        <a href="#" data-contact-channel="instagram" aria-disabled="true"><b>Instagram</b><small>@instagram_do_empreendimento</small></a>
        <a href="#" data-contact-channel="whatsapp" aria-disabled="true"><b>Mensagem pelo WhatsApp</b><small>Número a configurar</small></a>
      </div>
    </div>
    <aside class="public-credentials" aria-label="Dados legais do empreendimento">
      <span>IDENTIFICAÇÃO DO EMPREENDIMENTO</span>
      <dl>
        <div><dt>CREA</dt><dd>A informar</dd></div>
        <div><dt>CNPJ</dt><dd>A informar</dd></div>
        <div><dt>CNPJ da obra</dt><dd>A informar</dd></div>
      </dl>
      <small>Campos reservados para os dados oficiais antes da publicação definitiva.</small>
    </aside>
  </section>
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
  selectedLot(){const map=this.map(),value=clean(map?.dataset.selectedLot||map?.dataset.selectedPart);return value&&value!=='Nenhum lote selecionado'?{id:value,label:value,status:'unknown'}:null;}
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
    const sticky=this.querySelector('.public-map-sticky'),gestureControls=this.querySelector('[data-public-map-controls]');
    if(!story||!letter||!legend)return;
    const clamp=value=>Math.min(1,Math.max(0,value));
    const smooth=(a,b,value)=>{const t=clamp((value-a)/Math.max(.0001,b-a));return t*t*(3-2*t);};
    const gesture={zoom:1,panX:0,panY:0,drag:null};
    const publishGesture=()=>{
      this.style.setProperty('--public-plan-gesture-zoom',String(gesture.zoom));
      this.style.setProperty('--public-plan-gesture-pan-x',gesture.panX+'px');
      this.style.setProperty('--public-plan-gesture-pan-y',gesture.panY+'px');
      if(map){
        map.dataset.publicGestureZoom=gesture.zoom.toFixed(3);
        map.dataset.publicGesturePan=Math.round(gesture.panX)+','+Math.round(gesture.panY);
      }
    };
    const clearGesture=()=>{gesture.zoom=1;gesture.panX=0;gesture.panY=0;publishGesture();};
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
      const sceneY=Math.max(0,scrollY-storyTop);
      const titleEnd=innerHeight*.30;
      const planReveal=smooth(titleEnd,titleEnd+innerHeight*.24,sceneY);
      const planZoom=smooth(titleEnd,titleEnd+innerHeight*.78,sceneY);
      this.style.setProperty('--public-plan-opacity',planReveal.toFixed(4));
      const scrollZoom=1+planZoom*.32,scrollPan=Math.min(innerWidth*.10,150)*planZoom;
      this.style.setProperty('--public-plan-zoom',(scrollZoom*gesture.zoom).toFixed(4));
      this.style.setProperty('--public-plan-pan-x',(scrollPan+gesture.panX).toFixed(1)+'px');
      this.style.setProperty('--public-plan-pan-y',gesture.panY.toFixed(1)+'px');
      this.dataset.planProgress=planZoom.toFixed(4);
      this.querySelector('public-lead-chat')?.dispatchEvent(new CustomEvent('belavista:public-map-scroll-zoom',{
        detail:{active:planZoom>.08}
      }));
      if(gestureControls)gestureControls.dataset.visible=planZoom>.42?'true':'false';
      if(map){
        map.dataset.publicScrollZoom=planZoom.toFixed(4);
        const lotLayer=story.querySelector('.satellite-lot-plan-overlay');
        lotLayer?.setAttribute('aria-hidden',planZoom>.42?'false':'true');
        lotLayer?.querySelectorAll('.satellite-lot-plan-marker').forEach(marker=>{
          marker.tabIndex=planZoom>.42?0:-1;
          marker.setAttribute('aria-hidden',planZoom>.42?'false':'true');
        });
      }
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

    const activateZoomControl=button=>{
      if(button.dataset.mapZoom==='reset')clearGesture();
      else gesture.zoom=clamp((button.dataset.mapZoom==='in'?gesture.zoom*1.2:gesture.zoom/1.2),.65,3.5);
      publishGesture();requestRender();
    };
    sticky?.addEventListener('pointerdown',event=>{
      const zoomButton=event.target.closest?.('[data-map-zoom]');
      if(zoomButton&&gestureControls?.contains(zoomButton)){
        event.preventDefault();event.stopPropagation();activateZoomControl(zoomButton);return;
      }
      if(event.button!==0||Number(this.dataset.planProgress||0)<.42||
        event.target.closest('button,a,input,select,textarea,[role="button"],[contenteditable="true"],.satellite-lot-plan-marker,.satellite-lot-hit-area,public-lead-chat,[data-public-map-controls]'))return;
      gesture.drag={x:event.clientX,y:event.clientY,mode:event.shiftKey||event.ctrlKey?'zoom':'pan'};
      sticky.dataset.mapGesture=gesture.drag.mode==='zoom'?'shift-drag-zoom':'drag-pan';
      sticky.classList.toggle('is-public-map-panning',gesture.drag.mode==='pan');
      try{sticky.setPointerCapture(event.pointerId);}catch{}
      event.preventDefault();
    });
    sticky?.addEventListener('pointermove',event=>{
      if(!gesture.drag)return;
      const dx=event.clientX-gesture.drag.x,dy=event.clientY-gesture.drag.y;
      if(gesture.drag.mode==='pan'){
        gesture.panX+=dx;gesture.panY+=dy;
      }else if(dy){
        const rect=sticky.getBoundingClientRect(),oldZoom=gesture.zoom;
        const nextZoom=clamp(oldZoom-dy*.008,.65,3.5),ratio=nextZoom/oldZoom;
        const offsetX=event.clientX-(rect.left+rect.width/2),offsetY=event.clientY-(rect.top+rect.height/2);
        gesture.panX=offsetX-(offsetX-gesture.panX)*ratio;
        gesture.panY=offsetY-(offsetY-gesture.panY)*ratio;
        gesture.zoom=nextZoom;
      }
      gesture.drag.x=event.clientX;gesture.drag.y=event.clientY;
      publishGesture();requestRender();event.preventDefault();
    });
    const endMapDrag=event=>{
      if(!gesture.drag)return;
      gesture.drag=null;
      delete sticky.dataset.mapGesture;
      sticky.classList.remove('is-public-map-panning');
      try{if(sticky.hasPointerCapture(event.pointerId))sticky.releasePointerCapture(event.pointerId);}catch{}
    };
    sticky?.addEventListener('pointerup',endMapDrag);
    sticky?.addEventListener('pointercancel',endMapDrag);
    gestureControls?.addEventListener('click',event=>{
      const button=event.target.closest?.('[data-map-zoom]');
      if(button&&event.detail===0)activateZoomControl(button);
    });
    publishGesture();

    const revealNodes=[...this.querySelectorAll('[data-public-reveal],.public-seals')];
    this._publicRevealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting)entry.target.classList.add('is-visible');
    }),{threshold:.16,rootMargin:'0px 0px -8%'});
    revealNodes.forEach(node=>this._publicRevealObserver.observe(node));

    const startPublic3D=()=>map?.startPublic3D?.();
    // O modelo é parte da composição inicial; não deve depender do primeiro scroll.
    this._publicModelStartTimer=setTimeout(startPublic3D,180);
    map?.addEventListener('pointerdown',startPublic3D,{once:true,passive:true});
    this.addEventListener('belavista:lot-marker-selected',event=>{
      const lotId=clean(event.detail?.lotId);
      if(!lotId)return;
      const lot={id:lotId,label:clean(event.detail?.label)||lotId,status:'unknown'};
      lotBox.hidden=false;
      lotBox.innerHTML=`<span>LOTE SELECIONADO</span><b>${esc(lot.label)}</b><small>Peça disponibilidade ou reserva no chat.</small>`;
      const chat=this.querySelector('public-lead-chat');
      if(chat)chat.session=saveSession({...chat.session,selectedLot:lot});
    });
    map?.addEventListener('click',()=>setTimeout(()=>{
      const lot=this.selectedLot();if(!lot)return;
      lotBox.hidden=false;lotBox.innerHTML=`<span>LOTE SELECIONADO</span><b>${esc(lot.label)}</b><small>Peça disponibilidade ou reserva no chat.</small>`;
      const chat=this.querySelector('public-lead-chat');chat.session=saveSession({...chat.session,selectedLot:lot});
    },80));
    renderFromScroll();
  }
}
if(!customElements.get('public-leads-surface'))customElements.define('public-leads-surface',PublicLeadsSurface);
