/** Foremen directory/editor page and its original form/list event behavior. */
export const installForemenDirectoryPageV1 = (ViewLayer, dependencies = {}) => {
  const {
    appStore,
    esc,
    executionModel,
    publishOperationalEvent,
    logger = console,
    host = globalThis,
  } = dependencies;
  if (typeof publishOperationalEvent !== "function")
    throw new TypeError("Foremen directory requires publishOperationalEvent().");
  const personnelPublishV5372 = (type, entity, entityId, payload = {}) =>
    publishOperationalEvent({
      actor: appStore.get().currentActor || {},
      type,
      entity,
      entityId,
      payload: { ...payload, projectId: "project-alianca-park" },
    }).catch((error) =>
      logger.info(
        "Evento de pessoal mantido localmente; RTDB indisponível.",
        error,
      ),
    );
  const confirm = host.confirm.bind(host);
  const FormData = host.FormData;
  const File = host.File;
  const FileReader = host.FileReader;

  // ENCARREGADOS_DIRECTORY_V5424
  // Cadastro simples de encarregados; equipes/formação permanecem apenas como
  // dados de apoio às atividades, não como uma tela administrativa separada.
  ViewLayer.prototype.personnel = function () {
    const state = appStore.get(),
      contacts = Array.isArray(state.foremenContacts)
        ? state.foremenContacts
        : [],
      stages = executionModel.stages || [];
    return `<section class="personnel-page-v5372 foremen-directory-v5424"><header class="personnel-head-v5372"><div><span class="activity-kind">CADASTRO OPERACIONAL · ENCARREGADOS</span><h1>Encarregados de atividade</h1><p>Cadastre responsáveis por e-mail e telefone, gere uma senha inicial e vincule as etapas que eles acompanham.</p></div><span class="personnel-live-v5372"><i></i> Escuta ativa</span></header><div class="foremen-layout-v5424"><section class="personnel-panel-v5372"><header class="personnel-panel-head-v5372"><div><span class="personnel-kicker-v5372">01 · NOVO CADASTRO</span><h2>Adicionar encarregado</h2></div></header><form class="foreman-form-v5424" data-foreman-form><label>Nome completo<input name="name" required autocomplete="name"></label><label>E-mail<input name="email" type="email" required autocomplete="email"></label><label>Telefone<input name="phone" required inputmode="tel" placeholder="(00) 00000-0000"></label><fieldset><legend>Etapas acompanhadas</legend>${stages.map((stage) => `<label><input type="checkbox" name="stages" value="${esc(stage.key)}"> ${esc(stage.name)}</label>`).join("")}</fieldset><button class="button button-primary" type="submit">Cadastrar e gerar senha</button><p class="foreman-form-status-v5424" data-foreman-status aria-live="polite"></p></form></section><section class="personnel-panel-v5372"><header class="personnel-panel-head-v5372"><div><span class="personnel-kicker-v5372">02 · VISUALIZAÇÃO</span><h2>Encarregados cadastrados</h2><p>A senha inicial é exibida uma vez após o cadastro e deve ser trocada pelo responsável.</p></div><span class="personnel-panel-count-v5372">${contacts.length} pessoas</span></header><div class="foreman-list-v5424">${contacts.map((contact) => `<article><div class="avatar">${esc((contact.name || "?")[0])}</div><div><strong>${esc(contact.name)}</strong><small>${esc(contact.email)} · ${esc(contact.phone)}</small><p>${(contact.stages || []).map((key) => esc(stages.find((s) => s.key === key)?.name || key)).join(" · ") || "Nenhuma etapa vinculada"}</p></div><span class="foreman-activities-v5424">${esc(String(contact.activityCount || 0))} atividades</span></article>`).join("") || '<p class="stage-input-empty">Nenhum encarregado cadastrado.</p>'}</div></section></div></section>`;
  };
  const foremenBindV5424 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = foremenBindV5424?.apply(this, args),
      form = this.querySelector("[data-foreman-form]");
    if (!form || form.dataset.bound === "true") return result;
    form.dataset.bound = "true";
    const editing = (appStore.get().foremenContacts || []).find(contact => contact.id === appStore.get().editingForemanId);
    this.querySelectorAll('.foreman-list-v5424 article').forEach((article, index) => {
      const contact = appStore.get().foremenContacts[index];
      article.insertAdjacentHTML('beforeend', `<div><button type="button" data-foreman-edit="${esc(contact.id)}">Editar</button><button type="button" data-foreman-delete="${esc(contact.id)}">Excluir</button></div>`);
      article.querySelector('[data-foreman-edit]').addEventListener('click', () => {
        appStore.set({editingForemanId:contact.id});
        this.querySelector('[data-foreman-form] [name="name"]')?.focus();
      });
      article.querySelector('[data-foreman-delete]').addEventListener('click', () => {
        if (!confirm(`Excluir o cadastro de ${contact.name}? Os registros históricos serão preservados.`)) return;
        appStore.set({foremenContacts:appStore.get().foremenContacts.filter(item=>item.id!==contact.id),editingForemanId:null,lastAction:`Excluiu encarregado ${contact.name}`});
      });
    });
    const contactGrid = form.querySelector("fieldset");
    if (contactGrid) {
      contactGrid.insertAdjacentHTML(
        "beforebegin",
        `<div class="foreman-registration-fields-v5424"><label>CPF / documento<input name="document" inputmode="numeric" autocomplete="off" placeholder="Opcional"></label><label>Data de nascimento<input name="birthDate" type="date" autocomplete="bday"></label><label>Endereço / cidade<input name="address" autocomplete="street-address" placeholder="Cidade e UF"></label><label>WhatsApp <span aria-hidden="true">*</span><input name="whatsapp" required inputmode="tel" autocomplete="tel" placeholder="(00) 00000-0000"></label><label class="foreman-photo-field-v5424">Foto (opcional)<input name="photo" type="file" accept="image/*" capture="user"></label></div>`,
      );
    }
    form.addEventListener(
      "submit",
      (event) => {
        const whatsapp = String(new FormData(form).get("whatsapp") || "").replace(
          /\D/g,
          "",
        );
        if (whatsapp.length < 10) {
          event.preventDefault();
          event.stopImmediatePropagation();
          const message = form.querySelector("[data-foreman-status]");
          if (message) {
            message.textContent =
              "Informe um número de WhatsApp válido (DDD + número).";
            message.dataset.tone = "warning";
          }
          form.elements.whatsapp?.focus();
        } else {
          const data = new FormData(form);
          form._foremanSubmission = {
            name: String(data.get("name") || "").trim(),
            email: String(data.get("email") || "").trim(),
            phone: String(data.get("phone") || "").trim(),
            document: String(data.get("document") || "").trim(),
            birthDate: String(data.get("birthDate") || ""),
            address: String(data.get("address") || "").trim(),
            whatsapp,
            stages: data.getAll("stages"),
            photo: data.get("photo") instanceof File ? data.get("photo") : null,
          };
        }
      },
      true,
    );
    const foremanFileToDataUrlV5424 = (file) =>
      new Promise((resolve) => {
        if (!file || !file.size) return resolve("");
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
    if (editing) {
      for (const name of ['name','email','phone','document','birthDate','address','whatsapp']) form.elements[name].value = editing[name] || '';
      form.querySelectorAll('[name="stages"]').forEach(input=>{input.checked=(editing.stages || []).includes(input.value);});
      form.querySelector('button[type="submit"]').textContent = 'Salvar alterações';
      form.insertAdjacentHTML('beforeend','<button type="button" data-foreman-cancel>Cancelar edição</button>');
      form.querySelector('[data-foreman-cancel]').addEventListener('click',()=>appStore.set({editingForemanId:null}));
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form),
        name = String(data.get("name") || "").trim(),
        email = String(data.get("email") || "").trim(),
        phone = String(data.get("phone") || "").trim(),
        stages = data.getAll("stages"),
        password = editing ? editing.password : `AP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        contact = {
          ...editing,
          id: editing?.id || `foreman-${Date.now()}`,
          name,
          email,
          phone,
          stages,
          password,
          activityCount: editing?.activityCount || 0,
          ...Object.fromEntries(['document','birthDate','address','whatsapp'].map(key=>[key,String(data.get(key)||'').trim()])),
          photoDataUrl: await foremanFileToDataUrlV5424(data.get('photo')) || editing?.photoDataUrl || '',
        };
      const contacts = [...(appStore.get().foremenContacts || []).filter(item=>item.id!==contact.id), contact];
      appStore.set({
        foremenContacts: contacts,
        editingForemanId: null,
        lastAction: `${editing ? 'Atualizou' : 'Cadastrou'} encarregado ${name}`,
      });
      this.querySelector("[data-foreman-status]").textContent = editing ? 'Cadastro atualizado.' : `Cadastro salvo. Senha inicial: ${password}`;
      personnelPublishV5372(editing ? "foreman.updated" : "foreman.created", "foreman", contact.id, {
        name,
        email,
        phone,
        stages,
      });
    });
    return result;
  };
};

/** Render the stage-scoped foremen tab using the selected stage's live links. */
export const installStageForemenTabV1 = (ViewLayer, {
  appStore,
  extensionStage,
  personnelModel,
  stageV9LiveFor,
  esc,
  ico,
} = {}) => {
  if (typeof appStore?.get !== "function")
    throw new TypeError("Stage foremen tab requires appStore.get().");
  if (!personnelModel || !Array.isArray(personnelModel.members))
    throw new TypeError("Stage foremen tab requires personnelModel.members.");
  for (const [name, value] of Object.entries({ extensionStage, stageV9LiveFor, esc, ico }))
    if (typeof value !== "function")
      throw new TypeError(`Stage foremen tab requires ${name}().`);

  const stageForemenMembersV1 = (stage, state) => {
    const contacts = Array.isArray(state.foremenContacts)
      ? state.foremenContacts.filter((item) => (item.stages || []).includes(stage.key))
      : [];
    if (contacts.length) return contacts;
    const modeled = (personnelModel.members || []).filter((item) => item.team === stage.key || item.stage === stage.key);
    if (modeled.length) return modeled;
    return [{
      id: `stage-owner-${stage.key}`,
      name: stage.owner || "Responsável a definir",
      role: "Encarregado da etapa",
      status: "Aguardando vínculo",
      skills: stage.production?.unit ? [stage.production.unit] : [],
    }];
  };

  ViewLayer.prototype.foremen = function () {
    const state = appStore.get(),
      stage = extensionStage(),
      members = stageForemenMembersV1(stage, state),
      live = stageV9LiveFor(stage),
      active = members.filter((item) => /campo|operando|disponível|disponivel/i.test(item.status || "")).length,
      cards = members.map((member, index) =>
        `<article class="stage-foreman-card"><header><span class="stage-foreman-avatar">${esc(String(member.name || "?").trim().slice(0, 2).toUpperCase())}</span><div><h3>${esc(member.name || "Responsável a definir")}</h3><p>${esc(member.role || "Encarregado")}</p></div><span class="stage-foreman-status ${/campo|operando/i.test(member.status || "") ? "live" : ""}">${esc(member.status || "Sem status")}</span></header><dl><div><dt>Vínculo na etapa</dt><dd>${esc(stage.name)}</dd></div><div><dt>Atividades acompanhadas</dt><dd>${esc(String(member.activityCount ?? (index === 0 ? live.progress || 0 : 0)))} registros</dd></div></dl><footer><span>${(member.skills || []).map((skill) => esc(skill)).join(" · ") || "Atribuição operacional em definição"}</span><button type="button" data-view="personnel">Abrir cadastro ${ico("arrow-up-right")}</button></footer></article>`,
      ).join("");
    return `<section class="stage-foremen-page stage-extension-page"><div class="extension-head"><div><span class="activity-kind">ETAPA EM FOCO · RESPONSÁVEIS</span><h1>Por encarregados</h1><p>Veja os encarregados vinculados à etapa <strong>${esc(stage.name)}</strong>, suas atividades e a situação de campo.</p></div><div class="stage-foremen-head-meta"><span>${members.length} responsável${members.length === 1 ? "" : "es"}</span><small>${active} em acompanhamento ou disponibilidade</small></div></div><section class="stage-foremen-summary"><article><small>ETAPA</small><b>${esc(stage.name)}</b><span>${esc(stage.production?.unit || "Unidade de produção")}</span></article><article><small>AVANÇO</small><b>${Number(live.progress) || 0}%</b><span>${esc(live.status || "Em acompanhamento")}</span></article><article><small>RESPONSÁVEIS</small><b>${members.length}</b><span>vínculos encontrados</span></article><article><small>PRÓXIMA AÇÃO</small><b>${esc(stage.nextAction || "Registrar avanço")}</b><span>orientação da etapa</span></article></section><section class="stage-foremen-list"><header><div><span class="activity-kind">RESPONSÁVEIS DA FRENTE</span><h2>Equipe por encarregado</h2><p>A visão acompanha a etapa selecionada na barra acima e não altera o cadastro central.</p></div><span>${members.length} vínculo${members.length === 1 ? "" : "s"}</span></header><div>${cards}</div></section></section>`;
  };
  return ViewLayer;
};
