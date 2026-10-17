import { isLimitedOperationalActor } from "../../admin-role-policy.mjs";

export const createFinalOperationalRecordsPageV5360 = ({
  appStore,
  demoData,
  esc,
  ico,
  recordStage,
  tone,
}) =>
  function finalOperationalRecordsPageV5360() {
    const state = appStore.get();
    const actor = state.currentActor || {};
    const profileName = String(actor.name || actor.displayName || "").trim();
    const allRecords = (Array.isArray(state.records) ? state.records : []).filter((record) =>
      !isLimitedOperationalActor(actor) || Boolean(profileName && String(record.responsavel || "").trim().localeCompare(profileName, "pt-BR", { sensitivity: "base" }) === 0),
    );
    const selectedStage = (demoData.activities || []).find(
      (item) =>
        String(item.id) === String(state.selectedStage || "") ||
        String(item.name) === String(state.selectedStage || ""),
    );
    const records = selectedStage
      ? allRecords.filter((record) => {
          const stageValue = String(recordStage(record));
          return (
            stageValue === String(selectedStage.id) ||
            stageValue === String(selectedStage.name) ||
            String(record.atividade || "") === String(selectedStage.name)
          );
        })
      : allRecords;
    const selected = records.find(
      (item) => String(item.id) === String(state.selectedRecordV5360 || ""),
    );

    if (selected) {
      return `<section class="record-page-v5360">
        <header class="workspace-head-v5360">
          <div><span>DIÁRIO · REGISTRO DEDICADO</span><h1>${esc(selected.atividade || "Registro operacional")}</h1><p>${esc(recordStage(selected))} · ${esc(selected.data || "Sem data")} ${esc(selected.hora || "")}</p></div>
          <button type="button" data-v5360-record-back>${ico("arrow-left")} Voltar ao Diário</button>
        </header>

        <div class="record-page-kpis-v5360">
          <article><small>Registro</small><b>${esc(selected.id || "—")}</b></article>
          <article><small>Etapa</small><b>${esc(recordStage(selected))}</b></article>
          <article><small>Responsável</small><b>${esc(selected.responsavel || "A definir")}</b></article>
          <article><small>Status</small><b>${esc(selected.status || "Pendente")}</b></article>
        </div>

        <section class="record-page-body-v5360">
          <span>APONTAMENTO / MEDIÇÃO</span>
          <p>${esc(selected.detalhes || "Nenhum detalhe informado.")}</p>
          ${selected.mapArea ? `<dl><dt>Área vinculada</dt><dd>${esc(selected.mapArea)}</dd></dl>` : ""}
          ${selected.evidenceUri ? `<a href="${esc(selected.evidenceUri)}" target="_blank" rel="noopener">Abrir evidência</a>` : ""}
        </section>

        <footer class="record-page-actions-v5360">
          <button type="button" data-view="stages">Calendário da etapa</button>
          <button type="button" data-view="map">Localizar no mapa</button>
        </footer>
      </section>`;
    }

    const completed = records.filter((item) =>
      /concl|final|feito/i.test(String(item.status || "")),
    ).length;
    const pending = Math.max(0, records.length - completed);
    const stages = new Set(records.map(recordStage));
    const rows = records
      .slice()
      .reverse()
      .map(
        (record) => `
      <tr data-v5360-record-row="${esc(record.id || "")}">
        <td><b>${esc(record.id || "REG")}</b><small>${esc(record.data || "—")} ${esc(record.hora || "")}</small></td>
        <td><b>${esc(recordStage(record))}</b><small>${esc(record.atividade || "Atividade operacional")}</small></td>
        <td>${esc(record.responsavel || "A definir")}</td>
        <td class="record-note-v5360">${esc(record.detalhes || "Sem apontamento informado")}</td>
        <td><span class="record-tone-v5360 ${tone(record.status)}">${esc(record.status || "Pendente")}</span></td>
        <td><button type="button" data-v5360-record="${esc(record.id || "")}">Abrir página</button></td>
      </tr>`,
      )
      .join("");
    const mobileCards = records.slice().reverse().map((record) => `<article class="atlas-profile-record" data-v5360-record-card="${esc(record.id || "")}"><div class="atlas-profile-record-top"><span>${esc(record.data || "Sem data")} · ${esc(record.hora || "")}</span><span class="record-tone-v5360 ${tone(record.status)}">${esc(record.status || "Pendente")}</span></div><h2>${esc(record.atividade || "Registro operacional")}</h2><p>${esc(record.detalhes || "Sem apontamento informado")}</p><footer><span>${esc(recordStage(record))} · ${esc(record.responsavel || "A definir")}</span><button type="button" data-v5360-record="${esc(record.id || "")}">Abrir registro</button></footer></article>`).join("");

    return `<section class="records-table-page-v5360 atlas-profile-records">
      ${state.recordsLoadError ? `<p class="atlas-profile-record-error" role="alert">Não foi possível carregar os registros persistidos: ${esc(state.recordsLoadError)}</p>` : ""}
      <header class="workspace-head-v5360">
        <div><span>DIÁRIO · ${selectedStage ? "ETAPA SELECIONADA" : isLimitedOperationalActor(actor) ? "MEU PERFIL" : "ATIVIDADES NAS ETAPAS"}</span><h1>Registros operacionais${selectedStage ? ` · ${esc(selectedStage.name)}` : ""}</h1><p>${selectedStage ? `Exibindo os registros vinculados à etapa ${esc(selectedStage.name)}.` : isLimitedOperationalActor(actor) ? `Registros atribuídos a ${esc(profileName || "este perfil")}.` : "Tabela dos fatos, medições e evidências vinculados às etapas."}</p></div>
        <button type="button" data-view="stages">Calendário de atividades</button>
      </header>

      ${state.recordsLoadError ? '' : `<div class="records-kpis-v5360">
        <article><small>Registros</small><b>${records.length}</b></article>
        <article><small>Concluídos</small><b>${completed}</b></article>
        <article><small>Pendentes</small><b>${pending}</b></article>
        <article><small>Etapas</small><b>${stages.size}</b></article>
      </div>`}

      ${state.recordsLoadError ? '' : `<div class="atlas-profile-record-list" aria-label="Registros do perfil">${mobileCards || '<p class="atlas-profile-record-empty">Nenhum registro encontrado para este perfil.</p>'}</div>`}

      ${state.recordsLoadError ? '' : `<div class="records-table-v5360">
        <table>
          <thead><tr><th>Registro / data</th><th>Etapa / atividade</th><th>Responsável</th><th>Apontamento</th><th>Status</th><th>Página</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" class="dashboard-empty-v5360">Nenhum registro cadastrado.</td></tr>'}</tbody>
        </table>
      </div>`}
    </section>`;
  };
