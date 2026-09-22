// BELAVISTA_FINANCE_MOBILE_CASH_V5358
(() => {
  if(globalThis.__belavistaFinanceMobileCashV5358)return;
  globalThis.__belavistaFinanceMobileCashV5358=true;

  const selector='form[data-v8-cash-entry]';
  const esc=value=>String(value??'')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;');

  function enhance(form){
    if(!form||form.dataset.mobileCashV5358==='ready')return;

    // Preserve the form element itself so its original submit transport
    // and operational recalculation listener remain attached.
    const current={
      kind:form.querySelector('[name="kind"]')?.value||'entrada',
      date:form.querySelector('[name="date"]')?.value||new Date().toISOString().slice(0,10),
      category:form.querySelector('[name="category"]')?.value||'',
      stage:form.querySelector('[name="stage"]')?.value||'Geral',
      amount:form.querySelector('[name="amount"]')?.value||'',
      description:form.querySelector('[name="description"]')?.value||''
    };

    const stages=[...form.querySelectorAll('select[name="stage"] option')]
      .map(option=>option.value||option.textContent).filter(Boolean);
    if(!stages.length)stages.push('Geral');

    const categories=['Venda / recebimento','Obra','Material','Mão de obra','Máquinas / transporte','Ajuste','Outro'];
    if(current.category&&!categories.includes(current.category))categories.unshift(current.category);

    form.dataset.mobileCashV5358='ready';
    form.classList.add('cash-entry-mobile-v5358');

    form.innerHTML=`
      <header class="cash-mobile-head-v5358">
        <div><span>CAIXA</span><h2>Adicionar caixa</h2><p>Entrada ou saída em poucos toques.</p></div>
        <small>Dono</small>
      </header>

      <div class="cash-mobile-body-v5358">
        <label class="cash-amount-mobile-v5358">
          <span>Valor</span>
          <div><small>R$</small><input name="amount" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="0,00" value="${esc(current.amount)}" required></div>
        </label>

        <fieldset class="cash-kind-mobile-v5358">
          <legend>Movimento</legend>
          <label><input type="radio" name="kind" value="entrada" ${current.kind!=='saida'?'checked':''}><span><b>＋ Entrada</b><small>Recebimento</small></span></label>
          <label><input type="radio" name="kind" value="saida" ${current.kind==='saida'?'checked':''}><span><b>− Saída</b><small>Pagamento</small></span></label>
        </fieldset>

        <div class="cash-main-fields-v5358">
          <label><span>Categoria</span><select name="category" required>
            <option value="" ${!current.category?'selected':''} disabled>Escolha</option>
            ${categories.map(value=>`<option value="${esc(value)}" ${current.category===value?'selected':''}>${esc(value)}</option>`).join('')}
          </select></label>
          <label><span>Etapa</span><select name="stage">
            ${stages.map(stage=>`<option value="${esc(stage)}" ${current.stage===stage?'selected':''}>${esc(stage)}</option>`).join('')}
          </select></label>
        </div>

        <label class="cash-description-mobile-v5358">
          <span>De onde veio / para onde foi?</span>
          <textarea name="description" rows="2" enterkeyhint="done" placeholder="Ex.: Pix lote 077, concreto, combustível…" required>${esc(current.description)}</textarea>
        </label>

        <details class="cash-details-mobile-v5358">
          <summary>Mais detalhes</summary>
          <label><span>Data</span><input type="date" name="date" value="${esc(current.date)}" required></label>
          <p>Estorno e ajuste continuam preservando a trilha financeira.</p>
        </details>
      </div>

      <footer class="cash-footer-mobile-v5358">
        <span data-v8-cash-status>Pronto para registrar.</span>
        <button type="submit" data-v5358-cash-submit><span>Adicionar entrada</span></button>
      </footer>
    `;

    const syncKind=()=>{
      const kind=form.querySelector('input[name="kind"]:checked')?.value||'entrada';
      form.dataset.cashKind=kind;
      form.querySelectorAll('.cash-kind-mobile-v5358 label').forEach(label=>{
        label.classList.toggle('selected',Boolean(label.querySelector('input')?.checked));
      });
      const text=form.querySelector('[data-v5358-cash-submit] span');
      if(text)text.textContent=kind==='saida'?'Registrar saída':'Adicionar entrada';
    };
    form.querySelectorAll('input[name="kind"]').forEach(radio=>radio.addEventListener('change',syncKind));
    syncKind();

    const amount=form.querySelector('input[name="amount"]');
    amount?.addEventListener('input',()=>{
      let value=String(amount.value||'').replace(/[^\d,]/g,'');
      const comma=value.indexOf(',');
      if(comma>=0)value=value.slice(0,comma+1)+value.slice(comma+1).replace(/,/g,'').slice(0,2);
      amount.value=value;
    });
    if(matchMedia('(max-width:760px)').matches)amount?.setAttribute('aria-label','Valor em reais');
  }

  function scan(root=document){
    if(root.matches?.(selector))enhance(root);
    root.querySelectorAll?.(selector).forEach(enhance);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan(),{once:true});
  else scan();

  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)scan(node);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  globalThis.__BELAVISTA_FINANCE_MOBILE_CASH_V5358={version:'5.3.58',observer};
})();
