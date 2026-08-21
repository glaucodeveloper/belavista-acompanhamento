import {savePublicLead} from './firebase.mjs?v=1';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export class PublicLeadForm extends HTMLElement {
  connectedCallback(){this.render();}
  render(){
    this.innerHTML=`<glass-card class="float-card public-lead-card public-form-shell"><div class="public-brand">VISTA VERDE <small>LOTEAMENTO</small></div><span class="launch-chip">LANÇAMENTO</span><h2>Encontre o lote ideal<br>para <em>morar ou investir</em></h2><p>Receba condições e acompanhe a intenção no atendimento comercial.</p><form class="public-lead-form" novalidate><div class="public-fields"><label><span>Nome completo</span><input name="name" autocomplete="name" required placeholder="Como podemos chamar você?"></label><label><span>WhatsApp com DDD</span><input name="whatsapp" autocomplete="tel" required placeholder="(00) 00000-0000"></label><label><span>E-mail</span><input name="email" autocomplete="email" type="email" required placeholder="voce@email.com"></label></div><span class="public-field-caption">Qual é seu objetivo?</span><div class="intent-switch"><button type="button" data-objective="Moradia" class="selected">⌂ Moradia</button><button type="button" data-objective="Investimento">▧ Investimento</button><button type="button" data-objective="Veraneio">☼ Veraneio</button></div><input type="hidden" name="objective" value="Moradia"><div class="public-advanced-grid"><label>Faixa de valor<input name="budget" placeholder="Ex.: R$ 400k – 550k"></label><label>Orientação solar<select name="sun"><option value="">Selecionar</option><option>Leste</option><option>Oeste</option><option>Norte</option><option>Sul</option></select></label></div><button class="public-submit" type="submit">Quero receber condições <span>→</span></button><small class="public-privacy">Seus dados são usados somente para retorno do atendimento.</small><p class="public-form-status" aria-live="polite"></p></form></glass-card>`;
    const form=this.querySelector('form');
    const objective=this.querySelector('input[name="objective"]');
    this.querySelectorAll('[data-objective]').forEach(button=>button.addEventListener('click',()=>{this.querySelectorAll('[data-objective]').forEach(item=>item.classList.remove('selected'));button.classList.add('selected');objective.value=button.dataset.objective;}));
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const status=this.querySelector('.public-form-status'),submit=form.querySelector('[type="submit"]'),data=Object.fromEntries(new FormData(form));
      if(!data.name?.trim()||!data.whatsapp?.trim()||!data.email?.trim()){status.dataset.tone='warning';status.textContent='Preencha nome, WhatsApp e e-mail.';return;}
      submit.disabled=true;status.dataset.tone='loading';status.textContent='Enviando sua intenção…';
      try{
        const leadId=await savePublicLead(data);
        form.reset();objective.value='Moradia';this.querySelectorAll('[data-objective]').forEach((item,index)=>item.classList.toggle('selected',index===0));
        status.dataset.tone='success';status.textContent=`Recebido. Protocolo ${escapeHtml(leadId||'gerado')} criado para o atendimento.`;
      }catch(error){
        status.dataset.tone='warning';status.textContent='Não foi possível concluir agora. Verifique a conexão e tente novamente.';
        console.warn('Firebase Realtime Database indisponível.',error);
      }finally{submit.disabled=false;}
    });
  }
}

customElements.define('public-lead-form',PublicLeadForm);
