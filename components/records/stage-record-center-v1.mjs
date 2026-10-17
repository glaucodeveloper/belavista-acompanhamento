/** Pure record/attachment and OCR estimate helpers shared by records, finance, agenda, and AI chat. */
export const installStageRecordCenterModalCaptureV1 = ({
  host = globalThis,
  document: documentRef = globalThis.document,
  appStore,
  stageRecordStagesV1,
  stageRecordMaterialRowsV1,
  stageRecordServiceRowsV1,
  stageRecordCenterItemModalMarkupV1,
  setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
} = {}) => {
  if (!appStore?.get || !appStore?.set || !documentRef?.addEventListener ||
      typeof stageRecordCenterItemModalMarkupV1 !== "function" || typeof setTimeoutFn !== "function")
    throw new TypeError("Stage record modal capture requires the document, store, and modal services.");
  if (host.__BELAVISTA_STAGE_RECORD_MODAL_CAPTURE_V1) return () => {};

  host.__BELAVISTA_STAGE_RECORD_MODAL_CAPTURE_V1 = true;
  const onDocumentClick = (event) => {
    const row = event.target.closest?.("[data-stage-center-item-open]"),
      key = String(row?.dataset?.stageCenterItemOpen || "");
    if (!key || event.target.closest("button, a")) return;
    appStore.set({
      controlStageCenterItemModalKey: key,
      lastAction: `Abriu as propriedades da adição ${key}`,
    });
    setTimeoutFn(() => {
      if (documentRef.querySelector("dialog[data-stage-center-item-dialog]")) return;
      const state = appStore.get(),
        stages = stageRecordStagesV1(),
        materials = stageRecordMaterialRowsV1(state),
        services = stageRecordServiceRowsV1(state),
        markup = stageRecordCenterItemModalMarkupV1(state, materials, services, stages);
      if (!markup) return;
      documentRef.body.insertAdjacentHTML("beforeend", markup);
      const dialog = documentRef.querySelector("dialog[data-stage-center-item-dialog]");
      try { dialog?.showModal(); } catch { dialog?.setAttribute("open", ""); }
    }, 0);
  };

  documentRef.addEventListener("click", onDocumentClick, true);
  return () => {
    documentRef.removeEventListener("click", onDocumentClick, true);
    delete host.__BELAVISTA_STAGE_RECORD_MODAL_CAPTURE_V1;
  };
};

export const createStageRecordServicesV1 = ({ executionModel, demoData, controlCenterMaterialRowsV1, stageV9LiveFor } = {}) => {
const stageRecordNormalizeV1 = (value) =>
  String(value ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const stageRecordStagesV1 = () => {
  const model = Array.isArray(executionModel?.stages)
    ? executionModel.stages
    : [];
  if (model.length) return model;
  return (Array.isArray(demoData?.activities) ? demoData.activities : []).map(
    (stage) => ({ key: stage.key || stage.id, name: stage.name, ...stage }),
  );
};

const stageRecordStageForV1 = (record, stages) => {
  const values = [
    record?.stageKey,
    record?.stageId,
    record?.stage,
    record?.stageName,
    record?.etapa,
    record?.etapaNome,
    record?.activityStage,
    record?.atividade,
  ]
    .map(stageRecordNormalizeV1)
    .filter(Boolean);
  return (
    stages.find((stage) => {
      const candidates = [stage.key, stage.id, stage.name]
        .map(stageRecordNormalizeV1)
        .filter(Boolean);
      return values.some(
        (value) =>
          candidates.includes(value) ||
          candidates.some(
            (candidate) =>
              candidate.length > 3 &&
              (value.includes(candidate) || candidate.includes(value)),
          ),
      );
    }) || null
  );
};

const stageRecordAttachmentsV1 = (record) => {
  const lists = [record?.attachments, record?.files, record?.evidencias]
    .flatMap((items) =>
      Array.isArray(items)
        ? items
        : items && typeof items === "object"
          ? Object.values(items)
          : [],
    )
    .filter(Boolean);
  const properties = Array.isArray(record?.properties) ? record.properties : [];
  const storedFileUrl = String(properties.find((item) => item?.id === "allocation_attachment_url")?.value || "").trim();
  if (storedFileUrl) {
    lists.push({
      fileUrl: storedFileUrl,
      url: storedFileUrl,
      fileName: String(properties.find((item) => item?.id === "allocation_attachment")?.value || "Anexo do registro"),
      mimeType: String(properties.find((item) => item?.id === "allocation_attachment_mime")?.value || ""),
      notes: "Arquivo original salvo na solicitação vinculada",
    });
  }
  if (record?.evidenceUri || record?.comprovante) {
    lists.push({
      url: record.evidenceUri || record.comprovante,
      name: "Comprovante do registro",
    });
  }
  const seen = new Set();
  return lists
    .map((item, index) => {
      const url =
        item.fileUrl ||
        item.url ||
        item.href ||
        item.dataUrl ||
        item.evidenceUri ||
        item.path ||
        "";
      const label =
        item.title ||
        item.fileName ||
        item.name ||
        item.label ||
        `Anexo ${index + 1}`;
      return {
        label,
        url,
        meta: item.mimeType || item.type || item.notes || "",
      };
    })
    .filter((item) => {
      const key = `${item.label}|${item.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const stageRecordPropertiesV1 = (record) => {
  if (Array.isArray(record?.properties)) {
    return record.properties
      .filter((item) => !["allocation_attachment_url", "allocation_attachment_mime"].includes(String(item?.id || "")))
      .map((item, index) => ({
        label: item?.label || item?.name || item?.id || `Propriedade ${index + 1}`,
        value: item?.value ?? item?.text ?? item?.description ?? "—",
      }))
      .filter((item) => String(item.value ?? "").trim());
  }
  if (record?.properties && typeof record.properties === "object") {
    return Object.entries(record.properties).map(([label, value]) => ({
      label,
      value: Array.isArray(value) ? value.join(" · ") : value,
    }));
  }
  return [];
};

const stageRecordStatusLabelV1 = (record) =>
  record?.status || record?.situacao || record?.state || "Pendente";

const stageRecordProgressV1 = (stage, state) => {
  const live =
    typeof stageV9LiveFor === "function" ? stageV9LiveFor(stage) || {} : {};
  const operational = (state.operationalState?.stages || []).find(
    (item) => item.key === stage?.key,
  );
  return Number(operational?.progress ?? live.progress ?? stage?.progress ?? 0) || 0;
};

const stageRecordMaterialRowsV1 = (state) =>
  typeof controlCenterMaterialRowsV1 === "function"
    ? controlCenterMaterialRowsV1(state)
    : [];

const stageRecordEstimateNameKeyV1 = (value) =>
  stageRecordNormalizeV1(value)
    .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/s$/, ""))
    .filter((token) => token.length > 2)
    .join(" ");

const stageRecordEstimateMatchesV1 = (left, right) => {
  const a = stageRecordEstimateNameKeyV1(left),
    b = stageRecordEstimateNameKeyV1(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a) || a.split(" ").some((token) => b.split(" ").includes(token))));
};

const stageRecordEstimateKindV1 = (item) => {
  const text = `${item?.name || ""} ${item?.scope || ""} ${item?.unit || ""}`;
  return /equip\.?|maquin|p[aá]\s*carreg|escav|patrol|pipa|rolo|compactador|ca[cç]amba|caminh[aã]o|retro|trator|gerador|bomba|betoneira|h(?:ora|\b)/i.test(text)
    ? "equipment"
    : "material";
};

const stageRecordEstimateNumberV1 = (value) => {
  if (value == null || value === "") return null;
  const number = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
};

const stageRecordEstimateFormatV1 = (value) => {
  if (value == null) return "A dimensionar";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
};


  return { stageRecordNormalizeV1, stageRecordStagesV1, stageRecordStageForV1, stageRecordAttachmentsV1, stageRecordPropertiesV1, stageRecordStatusLabelV1, stageRecordProgressV1, stageRecordMaterialRowsV1, stageRecordEstimateNameKeyV1, stageRecordEstimateMatchesV1, stageRecordEstimateKindV1, stageRecordEstimateNumberV1, stageRecordEstimateFormatV1 };
};

/** Stage record center, material reports, and their control-view integration. */
export const installStageRecordCenterV1 = (ViewLayer, {
  REPASSE_PRICE_CATALOG,
  apiFetch,
  appStore,
  defaultStageMaterialRows,
  demoData,
  esc,
  formatBRL,
  ico,
  isAssistantVisualAdditionV1,
  operationalHeaders,
  notify = () => {},
  renderStageHomePageV1,
  stageContextV1,
  stageHomeSnapshotV1,
  stageRecordAttachmentsV1,
  stageRecordEstimateFormatV1,
  stageRecordEstimateKindV1,
  stageRecordEstimateMatchesV1,
  stageRecordEstimateNumberV1,
  stageRecordMaterialRowsV1,
  stageRecordNormalizeV1,
  stageRecordProgressV1,
  stageRecordPropertiesV1,
  stageRecordStageForV1,
  stageRecordStagesV1,
  stageRecordStatusLabelV1,
  stageViewTabs,
  document: documentRef = globalThis.document,
}) => {
  const stageRecordOcrEstimateRowsV1 = (state, stages, materialRows) => {
    const representedStages = stages.filter((stage) =>
      materialRows.some((item) => stageRecordStageForV1(item, [stage]) === stage),
    );
    return representedStages.flatMap((stage) => {
      const scanned = materialRows.filter((item) => stageRecordStageForV1(item, [stage]) === stage),
        baseRows = defaultStageMaterialRows(stage),
        consumedByBase = new Set(),
        rows = [];
      baseRows.forEach((base) => {
        const related = scanned.filter((item) => stageRecordEstimateMatchesV1(item.name, base.name));
        related.forEach((item) => consumedByBase.add(item.id));
        const captured = related.reduce((sum, item) => sum + (stageRecordEstimateNumberV1(item.quantity) || 0), 0),
          planned = stageRecordEstimateNumberV1(base.quantity),
          remaining = planned == null ? null : Math.max(planned - captured, 0);
        rows.push({
          id: `estimate:${stage.key}:${base.id}`,
          stageKey: stage.key,
          stageName: stage.name,
          name: base.name,
          scope: base.description || base.scope || "Base relacionada da etapa",
          unit: base.unit || related[0]?.unit || "un.",
          kind: stageRecordEstimateKindV1(base),
          planned,
          captured: related.length ? captured : 0,
          remaining,
          source: related.length ? "OCR + base da etapa" : "Base relacionada da etapa",
          status: planned == null ? "A dimensionar" : remaining > 0 ? "Saldo estimado" : "Coberto",
          confidence: related.length ? related.map((item) => item.properties || []).flat().find((property) => property.id === "allocation_confidence")?.value || "—" : "—",
        });
      });
      scanned.filter((item) => !consumedByBase.has(item.id)).forEach((item) => {
        const captured = stageRecordEstimateNumberV1(item.quantity),
          kind = stageRecordEstimateKindV1(item);
        rows.push({
          id: `estimate:${stage.key}:ocr:${item.id}`,
          stageKey: stage.key,
          stageName: stage.name,
          name: item.name || "Item identificado no OCR",
          scope: item.scope || "Item identificado no anexo",
          unit: item.unit || "un.",
          kind,
          planned: null,
          captured,
          remaining: null,
          source: "Somente OCR",
          status: "A dimensionar",
          confidence: (item.properties || []).find((property) => property.id === "allocation_confidence")?.value || "—",
        });
      });
      return rows;
    });
  };
  
  const stageRecordEstimateBoardV1 = (rows) => {
    const equipment = rows.filter((item) => item.kind === "equipment"),
      materials = rows.filter((item) => item.kind === "material"),
      quantified = rows.filter((item) => item.planned != null && item.planned > 0),
      remainingItems = rows.filter((item) => item.remaining != null && item.remaining > 0).length,
      averageCoverage = quantified.length
        ? Math.round(quantified.reduce((sum, item) => sum + Math.min(1, (item.captured || 0) / item.planned) * 100, 0) / quantified.length)
        : null,
      cards = [
        ["EQUIPAMENTOS", equipment.length, "itens relacionados"],
        ["MATERIAIS", materials.length, "itens relacionados"],
        ["SALDO CONHECIDO", remainingItems, "itens com quantidade restante"],
        ["COBERTURA", averageCoverage == null ? "A dimensionar" : `${averageCoverage}%`, "média da base quantificada"],
      ];
    const table = (title, kind, items) => `<section class="stage-record-estimate-table" data-stage-center-estimate-table="${kind}"><header><div><span class="activity-kind">${title}</span><h3>${kind === "equipment" ? "Equipamentos restantes" : "Materiais restantes"}</h3></div><small>${items.length} item(ns)</small></header><div class="stage-record-table-wrap"><table class="stage-record-table"><thead><tr><th>Etapa</th><th>Item relacionado</th><th>Base prevista</th><th>Identificado no OCR</th><th>Restante estimado</th><th>Leitura</th></tr></thead><tbody>${items.map((item) => `<tr><td><b>${esc(item.stageName)}</b><small>${esc(item.stageKey)}</small></td><td><strong>${esc(item.name)}</strong><small>${esc(item.scope)}</small></td><td>${esc(stageRecordEstimateFormatV1(item.planned))}<small>${esc(item.unit)}</small></td><td>${esc(stageRecordEstimateFormatV1(item.captured))}<small>${esc(item.unit)}</small></td><td><b>${esc(stageRecordEstimateFormatV1(item.remaining))}</b><small>${esc(item.unit)}</small></td><td><span class="stage-record-status stage-record-status-${stageRecordNormalizeV1(item.status).replace(/ /g, "-")}">${esc(item.status)}</span><small>${esc(item.source)} · confiança ${esc(item.confidence)}</small></td></tr>`).join("") || `<tr><td colspan="6" class="stage-record-empty-state">Nenhum item relacionado aos escaneamentos.</td></tr>`}</tbody></table></div></section>`;
    return `<section class="stage-record-estimate-board" data-stage-center-estimates><header class="stage-record-estimate-head"><div><span class="activity-kind">04 · ESTIMATIVAS A PARTIR DOS ESCANEAMENTOS</span><h2>Equipamentos e materiais restantes</h2><p>Quadros derivados dos itens OCR da lista e da base relacionada de cada etapa. A base não adiciona itens à lista do assistente; serve apenas para estimar o saldo.</p></div><span class="stage-record-estimate-note">${rows.length} relação(ões) calculada(s)</span></header><div class="stage-record-estimate-kpis">${cards.map(([label, value, note]) => `<article><small>${label}</small><b>${esc(value)}</b><span>${note}</span></article>`).join("")}</div>${table("04A · EQUIPAMENTOS", "equipment", equipment)}${table("04B · MATERIAIS", "material", materials)}</section>`;
  };
  
  const stageRecordServiceRowsV1 = (state) =>
    stageRecordStagesV1().flatMap((stage) => {
      const allocatedRows = (Array.isArray(state.records) ? state.records : [])
        .filter((record) => {
          const target = record.allocationTarget || record.properties?.find?.((item) => item.id === "allocation_target")?.value;
          return isAssistantVisualAdditionV1(record) && String(target || "").toLocaleLowerCase("pt-BR").includes("serv") && stageRecordStageForV1(record, [stage]) === stage;
        })
        .map((record) => ({
          id: `record:${record.id}`,
          recordId: record.id,
          stageKey: stage.key,
          stageName: stage.name,
          name: record.activityName || record.atividade || record.activity || "Serviço lido no chat",
          detail: record.detalhes || "Registro visual alocado pelo assistente.",
          trigger: "Leitura OCR do assistente · revisão humana",
          unit: record.unit || stage.production?.unit || "registro",
          responsible: record.responsavel || "Assistente operacional",
          progress: Number(record.progresso || 0),
          status: record.status || "Pendente",
          properties: record.properties || [],
          attachments: stageRecordAttachmentsV1(record),
        }));
      return allocatedRows;
    });
  
  const stageRecordCenterTabsV1 = (active, counts) =>
    [
      ["materials", "Materiais", counts.materials],
      ["services", "Serviços", counts.services],
    ]
      .map(
        ([key, label, count]) =>
          `<button type="button" class="stage-record-center-tab${active === key ? " active" : ""}" data-stage-record-center-tab="${key}" role="tab" aria-selected="${active === key}"><span>${ico(key === "records" ? "clipboard-list" : key === "materials" ? "boxes" : "briefcase-business")}</span><b>${label}</b><em>${count}</em></button>`,
      )
      .join("");
  
  const stageRecordCenterModeSwitchV1 = (kind, active) =>
    `<div class="stage-center-mode-switch" role="group" aria-label="Modo de visualização"><button type="button" data-stage-center-view-mode="${kind}" data-stage-center-mode="table" aria-pressed="${active === "table"}">Tabela</button><button type="button" data-stage-center-view-mode="${kind}" data-stage-center-mode="proofs" aria-pressed="${active === "proofs"}">${ico("paperclip")} Comprovantes</button>${kind === "materials" ? `<button type="button" class="stage-material-report-open" data-stage-material-report-open aria-haspopup="dialog">${ico("chart-no-axes-column-increasing")} Relatórios</button>` : ""}</div>`;
  
  const stageMaterialReportPropertyEntriesV1 = (item) => {
    const properties = item?.properties;
    if (Array.isArray(properties)) return properties;
    if (properties && typeof properties === "object") {
      return Object.entries(properties).map(([key, value]) => ({id: key, label: key, value}));
    }
    return [];
  };
  
  const stageMaterialReportTextV1 = (value) => {
    if (value == null || value === "") return "—";
    if (Array.isArray(value)) return value.map(stageMaterialReportTextV1).join(", ");
    if (typeof value === "object") {
      return Object.entries(value).map(([key, item]) => key + ": " + stageMaterialReportTextV1(item)).join(" · ");
    }
    return String(value);
  };
  
  const stageMaterialReportFieldsV1 = (rows) => {
    const fields = [
      {key: "stage", label: "Etapa", read: (item) => item.stageName || item.etapa || "Sem etapa"},
      {key: "activity", label: "Atividade", read: (item) => item.activityName || item.activity || item.atividade || item.title || "Sem atividade vinculada"},
      {key: "name", label: "Material / equipamento", read: (item) => item.name || item.materialName || "Material sem nome"},
      {key: "scope", label: "Descrição / uso", read: (item) => item.scope || item.detail || item.description || item.detalhes || "—"},
      {key: "quantity", label: "Quantidade", read: (item) => item.quantity ?? item.quantidade ?? "—"},
      {key: "unit", label: "Unidade", read: (item) => item.unit || item.unidade || "un."},
      {key: "status", label: "Status", read: (item) => item.status || "Planejado"},
      {key: "responsible", label: "Responsável", read: (item) => item.responsible || item.responsavel || item.owner || "—"},
      {key: "source", label: "Origem do registro", read: (item) => item.source === "chat-visual" ? "OCR do assistente" : item.source || "Adição do assistente"},
      {key: "date", label: "Data do registro", read: (item) => item.createdAt || item.updatedAt || item.date || item.data || "—"},
      {key: "attachments", label: "Comprovantes", read: (item) => stageRecordAttachmentsV1(item).map((attachment) => attachment.label).join(", ") || "Sem anexo"},
    ];
    const custom = new Map();
    rows.forEach((item) => stageMaterialReportPropertyEntriesV1(item).forEach((property) => {
      const identity = String(property?.id || property?.key || property?.name || property?.label || "").trim();
      if (!identity) return;
      const key = identity.toLocaleLowerCase("pt-BR");
      if (!custom.has(key)) custom.set(key, {key: identity, label: String(property.label || property.name || property.key || identity)});
    }));
    return fields.concat([...custom.values()].map((property) => ({
      key: "property:" + property.key,
      label: property.label,
      read: (item) => {
        const found = stageMaterialReportPropertyEntriesV1(item).find((entry) =>
          String(entry?.id || entry?.key || entry?.name || entry?.label || "").toLocaleLowerCase("pt-BR") === property.key.toLocaleLowerCase("pt-BR"),
        );
        return found?.value ?? "—";
      },
    })));
  };
  
  const stageMaterialReportIdV1 = (item, index) => String(item?.id ?? item?.sourceRecordId ?? "material-" + index);
  
  const stageMaterialReportGroupsMarkupV1 = (rows, fields, groupKeys, sortKey, direction, selectedIds = new Set(), allFields = fields) => {
    const byKey = new Map(allFields.map((field) => [field.key, field])),
      groups = new Map(),
      compare = (left, right) => {
        const result = stageRecordNormalizeV1(stageMaterialReportTextV1(left)).localeCompare(
          stageRecordNormalizeV1(stageMaterialReportTextV1(right)), "pt-BR", {numeric: true, sensitivity: "base"},
        );
        return direction === "desc" ? -result : result;
      },
      orderedRows = [...rows].sort((left, right) => {
        for (const key of groupKeys) {
          const field = byKey.get(key);
          if (field) {
            const result = compare(field.read(left), field.read(right));
            if (result) return result;
          }
        }
        const field = byKey.get(sortKey);
        return field ? compare(field.read(left), field.read(right)) : 0;
      });
    orderedRows.forEach((item, index) => {
      const values = groupKeys.map((key) => {
        const field = byKey.get(key);
        return field ? stageMaterialReportTextV1(field.read(item)) : "";
      });
      const label = values.length ? values.join(" · ") : "Todos os materiais",
        key = JSON.stringify(values);
      if (!groups.has(key)) groups.set(key, {label, rows: []});
      groups.get(key).rows.push({item, index});
    });
    if (!groups.size) return '<p class="stage-material-report-empty">Nenhum material corresponde aos filtros deste relatório.</p>';
    return [...groups.values()].map((group) => {
      const rowsMarkup = group.rows.map(({item, index}) => {
        const identity = stageMaterialReportIdV1(item, index);
        return '<tr><td class="stage-material-report-select-column"><input type="checkbox" aria-label="Selecionar ' +
          esc(item.name || "material") + '" data-material-report-row-select value="' + esc(identity) +
          '"' + (selectedIds.has(identity) ? " checked" : "") + '></td>' +
          fields.map((field) => '<td>' + esc(stageMaterialReportTextV1(field.read(item))) + '</td>').join("") + '</tr>';
      }).join("");
      return '<section class="stage-material-report-group"><h3>' + esc(group.label) +
        '</h3><div class="stage-material-report-table-wrap"><table class="stage-material-report-table"><thead><tr>' +
        '<th class="stage-material-report-select-column">Selecionar</th>' +
        fields.map((field) => '<th>' + esc(field.label) + '</th>').join("") +
        '</tr></thead><tbody>' + rowsMarkup + '</tbody></table></div></section>';
    }).join("");
  };
  
  const stageMaterialReportDialogV1 = (rows, stages) => {
    const fields = stageMaterialReportFieldsV1(rows),
      defaultColumns = new Set(["stage", "activity", "name", "scope", "quantity", "unit", "status"]),
      defaultGroups = new Set(["stage", "activity"]),
      stageOptions = stages.map((stage) => '<option value="' + esc(stage.key) + '">' + esc(stage.name) + '</option>').join(""),
      fieldOptions = fields.map((field) => '<option value="' + esc(field.key) + '">' + esc(field.label) + '</option>').join(""),
      columns = fields.map((field) => '<label><input type="checkbox" data-material-report-column="' + esc(field.key) +
        '"' + (defaultColumns.has(field.key) ? " checked" : "") + '><span>' + esc(field.label) + '</span></label>').join(""),
      groups = fields.map((field) => '<label><input type="checkbox" data-material-report-group-field="' + esc(field.key) +
        '"' + (defaultGroups.has(field.key) ? " checked" : "") + '><span>' + esc(field.label) + '</span></label>').join(""),
      groupKeys = [...defaultGroups],
      defaultFields = fields.filter((field) => defaultColumns.has(field.key)),
      initialRows = stageMaterialReportGroupsMarkupV1(rows, defaultFields, groupKeys, "stage", "asc");
    return '<dialog class="stage-material-report-dialog" data-stage-material-report-dialog aria-labelledby="stage-material-report-title">' +
      '<header class="stage-material-report-dialog-head"><div><span class="activity-kind">CENTRAL OPERACIONAL · MATERIAIS</span>' +
      '<h2 id="stage-material-report-title">Relatório de materiais</h2><p>Selecione propriedades, ordene e agrupe os itens por etapa, atividade ou outros campos.</p></div>' +
      '<button type="button" class="stage-record-dialog-close" data-material-report-close aria-label="Fechar relatório">' + ico("x") + '</button></header>' +
      '<div class="stage-material-report-dialog-body"><div class="stage-material-report-filters">' +
      '<label>Pesquisar<input type="search" data-material-report-search placeholder="Material, etapa, atividade…"></label>' +
      '<label>Etapa<select data-material-report-stage><option value="">Todas as etapas</option>' + stageOptions + '</select></label>' +
      '<label>Status<select data-material-report-status><option value="">Todos os status</option>' +
      [...new Set(rows.map((item) => item.status).filter(Boolean))].map((status) => '<option>' + esc(status) + '</option>').join("") + '</select></label></div>' +
      '<div class="stage-material-report-config"><fieldset><legend>Propriedades no relatório</legend><div class="stage-material-report-options">' + columns + '</div></fieldset>' +
      '<fieldset><legend>Agrupar por propriedades</legend><div class="stage-material-report-options stage-material-report-group-options">' + groups + '</div></fieldset>' +
      '<div class="stage-material-report-sort"><label>Ordenar por<select data-material-report-sort>' + fieldOptions + '</select></label>' +
      '<label>Ordem<select data-material-report-direction><option value="asc">Crescente</option><option value="desc">Decrescente</option></select></label></div></div>' +
      '<div class="stage-material-report-selection-toolbar"><span data-material-report-selection-count aria-live="polite">0 selecionados</span>' +
      '<button type="button" data-material-report-select-all>Selecionar itens filtrados</button><button type="button" data-material-report-clear-selection>Limpar seleção</button>' +
      '<button type="button" class="primary" data-material-report-print-all>Imprimir relatório</button><button type="button" data-material-report-print-selected disabled>Imprimir selecionados</button></div>' +
      '<div class="stage-material-report-results" data-material-report-results><header><div><span>ALIANÇA PARK · RELATÓRIO OPERACIONAL</span><h2>Materiais e equipamentos</h2>' +
      '<p>Lista de itens adicionados pelo assistente, com os vínculos e propriedades selecionados.</p></div><small data-material-report-print-date></small></header>' +
      '<div data-material-report-groups>' + initialRows + '</div></div></div></dialog>';
  };
  
  const stageMaterialReportBindV1 = (root, rows) => {
    let dialog = root.querySelector("[data-stage-material-report-dialog]");
    if (!dialog) return;
    const previousDialog = globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_DIALOG_V1__,
      keepOpen = Boolean(globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_OPEN_V1__ || previousDialog?.open);
    // Keep the native dialog outside ViewLayer: the app re-renders that subtree
    // on live state updates, which otherwise destroys an open report mid-edit.
    if (previousDialog && previousDialog !== dialog) previousDialog.remove();
    document.body.append(dialog);
    globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_DIALOG_V1__ = dialog;
    if (keepOpen) globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_OPEN_V1__ = true;
    if (!globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_CLEANUP_V1__) {
      globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_CLEANUP_V1__ = true;
      appStore.subscribe((state) => {
        if (state.view === "stages") return;
        const activeDialog = globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_DIALOG_V1__;
        globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_OPEN_V1__ = false;
        if (activeDialog?.open) activeDialog.close();
        activeDialog?.remove();
        globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_DIALOG_V1__ = null;
      });
    }
    const allRows = Array.isArray(rows) ? rows : [],
      uiState = globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_UI_V1__ || (globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_UI_V1__ = Object.create(null)),
      normalizeId = (item, index) => stageMaterialReportIdV1(item, index),
      uiKey = allRows.map((item, index) => normalizeId(item, index)).sort().join("|") || "empty",
      savedUi = uiState[uiKey] || {},
      selectedIds = new Set(savedUi.selectedIds || []),
      groupsHost = dialog.querySelector("[data-material-report-groups]"),
      count = dialog.querySelector("[data-material-report-selection-count]"),
      printSelected = dialog.querySelector("[data-material-report-print-selected]"),
      persist = () => {
        uiState[uiKey] = {
          selectedIds: [...selectedIds],
          search: dialog.querySelector("[data-material-report-search]")?.value || "",
          stage: dialog.querySelector("[data-material-report-stage]")?.value || "",
          status: dialog.querySelector("[data-material-report-status]")?.value || "",
          sort: dialog.querySelector("[data-material-report-sort]")?.value || "stage",
          direction: dialog.querySelector("[data-material-report-direction]")?.value || "asc",
          columns: [...dialog.querySelectorAll("[data-material-report-column]:checked")].map((input) => input.dataset.materialReportColumn),
          groups: [...dialog.querySelectorAll("[data-material-report-group-field]:checked")].map((input) => input.dataset.materialReportGroupField),
        };
      },
      filteredRows = () => {
        const query = stageRecordNormalizeV1(dialog.querySelector("[data-material-report-search]")?.value),
          stage = String(dialog.querySelector("[data-material-report-stage]")?.value || ""),
          status = stageRecordNormalizeV1(dialog.querySelector("[data-material-report-status]")?.value);
        return allRows.filter((item) =>
          (!query || stageRecordNormalizeV1([
            item.stageName, item.activityName, item.name, item.scope, item.status,
            ...stageMaterialReportPropertyEntriesV1(item).map((property) => property.value),
          ].join(" ")).includes(query)) &&
          (!stage || String(item.stageKey || "") === stage) &&
          (!status || stageRecordNormalizeV1(item.status || "Planejado") === status),
        );
      },
      refresh = () => {
        const availableFields = stageMaterialReportFieldsV1(allRows),
          selectedColumns = [...dialog.querySelectorAll("[data-material-report-column]:checked")].map((input) => input.dataset.materialReportColumn),
          fields = availableFields.filter((field) => selectedColumns.includes(field.key)),
          visibleFields = fields.length ? fields : availableFields.slice(0, 1),
          groupKeys = [...dialog.querySelectorAll("[data-material-report-group-field]:checked")].map((input) => input.dataset.materialReportGroupField),
          direction = dialog.querySelector("[data-material-report-direction]")?.value || "asc",
          sortKey = dialog.querySelector("[data-material-report-sort]")?.value || "stage",
          visible = filteredRows();
        if (groupsHost) groupsHost.innerHTML = stageMaterialReportGroupsMarkupV1(visible, visibleFields, groupKeys, sortKey, direction, selectedIds, availableFields);
        const selectedVisible = visible.filter((item, index) => selectedIds.has(normalizeId(item, index))).length;
        if (count) count.textContent = selectedVisible + " selecionado(s) de " + visible.length + " visível(is)";
        if (printSelected) printSelected.disabled = selectedIds.size === 0;
        const dateNode = dialog.querySelector("[data-material-report-print-date]");
        if (dateNode) dateNode.textContent = new Date().toLocaleDateString("pt-BR");
        persist();
      },
      print = (selectedOnly) => {
        const availableFields = stageMaterialReportFieldsV1(allRows),
          selectedColumns = [...dialog.querySelectorAll("[data-material-report-column]:checked")].map((input) => input.dataset.materialReportColumn),
          fields = availableFields.filter((field) => selectedColumns.includes(field.key)),
          visibleFields = fields.length ? fields : availableFields.slice(0, 1),
          groupKeys = [...dialog.querySelectorAll("[data-material-report-group-field]:checked")].map((input) => input.dataset.materialReportGroupField),
          items = selectedOnly ? allRows.filter((item, index) => selectedIds.has(normalizeId(item, index))) : filteredRows();
        if (groupsHost) groupsHost.innerHTML = stageMaterialReportGroupsMarkupV1(items, visibleFields, groupKeys, dialog.querySelector("[data-material-report-sort]")?.value || "stage", dialog.querySelector("[data-material-report-direction]")?.value || "asc", selectedIds, availableFields);
        const printRoot = document.createElement("main");
        printRoot.className = "stage-material-report-print-root";
        printRoot.innerHTML = dialog.querySelector("[data-material-report-results]")?.outerHTML || "";
        document.body.append(printRoot);
        document.body.classList.add("stage-material-report-printing");
        window.addEventListener("afterprint", () => {
          document.body.classList.remove("stage-material-report-printing");
          printRoot.remove();
          refresh();
        }, {once: true});
        window.print();
      };
    if (savedUi.search) dialog.querySelector("[data-material-report-search]").value = savedUi.search;
    if (savedUi.stage) dialog.querySelector("[data-material-report-stage]").value = savedUi.stage;
    if (savedUi.status) dialog.querySelector("[data-material-report-status]").value = savedUi.status;
    if (savedUi.sort) dialog.querySelector("[data-material-report-sort]").value = savedUi.sort;
    if (savedUi.direction) dialog.querySelector("[data-material-report-direction]").value = savedUi.direction;
    if (Array.isArray(savedUi.columns)) dialog.querySelectorAll("[data-material-report-column]").forEach((input) => { input.checked = savedUi.columns.includes(input.dataset.materialReportColumn); });
    if (Array.isArray(savedUi.groups)) dialog.querySelectorAll("[data-material-report-group-field]").forEach((input) => { input.checked = savedUi.groups.includes(input.dataset.materialReportGroupField); });
    root.querySelector("[data-stage-material-report-open]")?.addEventListener("click", () => {
      globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_OPEN_V1__ = true;
      if (!dialog.open) dialog.showModal();
      refresh();
    });
    const closeReport = () => {
      globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_OPEN_V1__ = false;
      if (dialog.open) dialog.close();
    };
    dialog.querySelector("[data-material-report-close]")?.addEventListener("click", closeReport);
    dialog.addEventListener("close", () => {
      // Re-rendering the view detaches the old dialog and fires `close`; only an
      // explicit close on the live dialog should clear the open state.
      if (dialog.isConnected) globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_OPEN_V1__ = false;
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeReport();
      const input = event.target.closest("[data-material-report-row-select]");
      if (input) {
        if (input.checked) selectedIds.add(input.value);
        else selectedIds.delete(input.value);
        refresh();
      }
    });
    dialog.addEventListener("change", (event) => {
      if (event.target.matches("[data-material-report-column], [data-material-report-group-field], [data-material-report-sort], [data-material-report-direction], [data-material-report-stage], [data-material-report-status]")) refresh();
    });
    dialog.querySelector("[data-material-report-search]")?.addEventListener("input", refresh);
    dialog.querySelector("[data-material-report-select-all]")?.addEventListener("click", () => {
      filteredRows().forEach((item, index) => selectedIds.add(normalizeId(item, index)));
      refresh();
    });
    dialog.querySelector("[data-material-report-clear-selection]")?.addEventListener("click", () => {
      selectedIds.clear();
      refresh();
    });
    dialog.querySelector("[data-material-report-print-all]")?.addEventListener("click", () => print(false));
    printSelected?.addEventListener("click", () => print(true));
    refresh();
    if (globalThis.__BELAVISTA_STAGE_MATERIAL_REPORT_OPEN_V1__) {
      try { if (!dialog.open) dialog.showModal(); } catch { dialog.setAttribute("open", ""); }
    }
  };
  
  const stageRecordProofListV1 = (record) => {
    const attachments = stageRecordAttachmentsV1(record);
    return attachments.length
      ? `<ul class="stage-center-proof-list">${attachments.map((item) => `<li><span class="stage-record-attachment-icon">${ico("paperclip")}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.meta || "Anexo do escaneamento OCR")}</small></div>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${esc(item.label)}">${ico("external-link")}</a>` : `<span class="stage-record-attachment-missing">arquivo sem link</span>`}</li>`).join("")}</ul>`
      : `<span class="stage-center-proof-empty">Sem comprovante anexado</span>`;
  };
  
  const stageRecordProofRowsV1 = (items, kind) =>
    items
      .map((item) => {
        const status = item.status || (kind === "material" ? "Planejado" : "Pendente"),
          itemId = kind === "material" ? item.id : item.recordId || item.id,
          description = kind === "material" ? item.scope || item.activityName : item.detail,
          attachments = stageRecordAttachmentsV1(item),
          text = `${item.stageName || ""} ${item.name || ""} ${description || ""} ${status} ${attachments.map((entry) => entry.label).join(" ")}`;
        return `<tr data-stage-center-${kind}-row data-stage-center-item-open="${kind}:${esc(itemId || "")}" tabindex="0" data-stage-center-${kind}-stage="${esc(item.stageKey || "")}" data-stage-center-${kind}-status="${esc(status)}" data-stage-center-${kind}-text="${esc(text)}"><td><b>${esc(item.stageName || "Sem etapa")}</b><small>${esc(item.stageKey || "—")}</small></td><td><strong>${esc(item.name || (kind === "material" ? "Material sem nome" : "Serviço sem nome"))}</strong><small>${esc(kind === "material" ? "Material/equipamento identificado pelo assistente" : item.responsible || "Assistente operacional")}</small></td><td>${esc(description || "Apontamento lido no anexo")}</td><td>${stageRecordProofListV1(item)}<small class="stage-center-proof-count">${attachments.length} arquivo(s)</small></td><td><span class="stage-record-status stage-record-status-${stageRecordNormalizeV1(status).replace(/ /g, "-")}">${esc(status)}</span></td></tr>`;
      })
      .join("");
  
  const stageRecordMaterialsPanelV1 = (state, stages, materialRows, mode = "table") => {
    const rows = materialRows
      .map((item) => {
        const status = item.status || "Planejado";
        const text = `${item.stageName || ""} ${item.activityName || ""} ${item.name || ""} ${item.scope || ""} ${status}`;
        return `<tr data-stage-center-material-row data-stage-center-item-open="material:${esc(item.id || "")}" tabindex="0" data-stage-center-material-stage="${esc(item.stageKey || "")}" data-stage-center-material-status="${esc(status)}" data-stage-center-material-text="${esc(text)}"><td><b>${esc(item.stageName || "Sem etapa")}</b><small>${esc(item.stageKey || "—")}</small></td><td><strong>${esc(item.name || "Material sem nome")}</strong><small>${esc(item.source === "chat-visual" ? "Leitura OCR do assistente · revisão humana" : item.activityName || "Adição do assistente")}</small></td><td>${esc(item.scope || "Apontamento lido no anexo")}</td><td>${item.quantity == null ? "—" : esc(item.quantity)}</td><td>${esc(item.unit || "un.")}</td><td><span class="stage-record-status stage-record-status-${stageRecordNormalizeV1(status).replace(/ /g, "-")}">${esc(status)}</span></td></tr>`;
      })
      .join("");
    const proofRows = stageRecordProofRowsV1(materialRows, "material"),
      tableHead = mode === "proofs"
        ? `<tr><th>Etapa</th><th>Material / equipamento</th><th>Apontamento OCR</th><th>Comprovantes / anexos</th><th>Status</th></tr>`
        : `<tr><th>Etapa</th><th>Material / equipamento</th><th>Escopo / uso</th><th>Quantidade</th><th>Unidade</th><th>Status</th></tr>`,
      tableRows = mode === "proofs" ? proofRows : rows,
      emptyColumns = mode === "proofs" ? 5 : 6;
    return `<section class="stage-record-table-section stage-center-panel" data-stage-center-panel="materials"><header class="stage-record-table-head"><div><span class="activity-kind">MATERIAIS E EQUIPAMENTOS DA ETAPA</span><h2>Materiais</h2><p class="stage-center-panel-description">Itens adicionados pelo assistente e vinculados à etapa selecionada.</p></div><div class="stage-record-filters"><label><span>Pesquisar</span><input type="search" data-stage-center-material-search placeholder="Material, uso…"></label><label><span>Etapa</span><select data-stage-center-material-stage-filter><option value="">Etapa selecionada</option>${stages.map((stage) => `<option value="${esc(stage.key)}">${esc(stage.name)}</option>`).join("")}</select></label><label><span>Status</span><select data-stage-center-material-status-filter><option value="">Todos os status</option>${[...new Set(materialRows.map((item) => item.status).filter(Boolean))].map((status) => `<option>${esc(status)}</option>`).join("")}</select></label><button type="button" class="ghost" data-stage-center-material-clear>Limpar filtros</button></div></header>${stageRecordCenterModeSwitchV1("materials", mode)}<div class="stage-record-table-wrap"><table class="stage-record-table"><thead>${tableHead}</thead><tbody>${tableRows || `<tr><td colspan="${emptyColumns}" class="stage-record-empty-state">${mode === "proofs" ? "Nenhum comprovante cadastrado para os materiais desta etapa." : "Nenhum material adicionado pelo assistente nesta etapa."}</td></tr>`}</tbody></table></div></section>`;
  };
  
  const stageRecordServicesPanelV1 = (stages, serviceRows, mode = "table") => {
    const rows = serviceRows
      .map(
        (item) => `<tr data-stage-center-service-row data-stage-center-item-open="service:${esc(item.recordId || item.id || "")}" tabindex="0" data-stage-center-service-stage="${esc(item.stageKey || "")}" data-stage-center-service-status="${esc(item.status || "")}" data-stage-center-service-text="${esc(`${item.stageName || ""} ${item.name || ""} ${item.detail || ""} ${item.responsible || ""} ${item.status || ""}`)}"><td><b>${esc(item.stageName || "Sem etapa")}</b><small>${esc(item.stageKey || "—")}</small></td><td><strong>${esc(item.name)}</strong><small>${esc(item.detail)}</small></td><td>${esc(item.responsible || "A definir")}</td><td>${esc(item.unit || "un.")}<small>${esc(item.trigger || "Leitura OCR do assistente")}</small></td><td><div class="stage-center-service-progress"><span><i style="width:${Math.max(0, Math.min(100, Number(item.progress) || 0))}%"></i></span><b>${Math.max(0, Math.min(100, Number(item.progress) || 0))}%</b></div></td><td><span class="stage-record-status stage-record-status-${stageRecordNormalizeV1(item.status || "Pendente").replace(/ /g, "-")}">${esc(item.status || "Pendente")}</span></td><td>${item.recordId ? `<button type="button" class="stage-center-open-stage" data-stage-center-service-record="${esc(item.recordId)}">Ver propriedades ${ico("arrow-up-right")}</button>` : `<button type="button" class="stage-center-open-stage" data-stage-center-service-stage="${esc(item.stageKey || "")}">Abrir etapa ${ico("arrow-up-right")}</button>`}</td></tr>`,
      )
      .join("");
    const proofRows = stageRecordProofRowsV1(serviceRows, "service"),
      tableHead = mode === "proofs"
        ? `<tr><th>Etapa</th><th>Serviço / atividade</th><th>Apontamento OCR</th><th>Comprovantes / anexos</th><th>Status</th></tr>`
        : `<tr><th>Etapa</th><th>Serviço / atividade</th><th>Responsável</th><th>Unidade / gatilho</th><th>Avanço</th><th>Status</th><th>Ação</th></tr>`,
      tableRows = mode === "proofs" ? proofRows : rows,
      emptyColumns = mode === "proofs" ? 5 : 7;
    return `<section class="stage-record-table-section stage-center-panel" data-stage-center-panel="services"><header class="stage-record-table-head"><div><span class="activity-kind">SERVIÇOS DA ETAPA</span><h2>Serviços</h2><p class="stage-center-panel-description">Serviços identificados pelo assistente, com atividade e evidências associadas.</p></div><div class="stage-record-filters"><label><span>Pesquisar</span><input type="search" data-stage-center-service-search placeholder="Serviço, responsável…"></label><label><span>Etapa</span><select data-stage-center-service-stage-filter><option value="">Etapa selecionada</option>${stages.map((stage) => `<option value="${esc(stage.key)}">${esc(stage.name)}</option>`).join("")}</select></label><label><span>Status</span><select data-stage-center-service-status-filter><option value="">Todos os status</option>${[...new Set(["Pendente", "Em andamento", "Concluído", ...serviceRows.map((item) => item.status).filter(Boolean)])].map((status) => `<option>${esc(status)}</option>`).join("")}</select></label><button type="button" class="ghost" data-stage-center-service-clear>Limpar filtros</button></div></header>${stageRecordCenterModeSwitchV1("services", mode)}<div class="stage-record-table-wrap"><table class="stage-record-table stage-center-services-table"><thead>${tableHead}</thead><tbody>${tableRows || `<tr><td colspan="${emptyColumns}" class="stage-record-empty-state">${mode === "proofs" ? "Nenhum comprovante cadastrado para os serviços desta etapa." : "Nenhum serviço adicionado pelo assistente nesta etapa."}</td></tr>`}</tbody></table></div></section>`;
  };
  
  const stageRecordLotStatusLabelV1 = (value) => {
    const normalized = stageRecordNormalizeV1(value);
    return ({
      available: "Disponível",
      disponivel: "Disponível",
      reserved: "Reservado",
      reservado: "Reservado",
      negotiation: "Em negociação",
      "em negociacao": "Em negociação",
      sold: "Vendido",
      vendido: "Vendido",
      "repasse programado": "Repasse programado",
      quitado: "Quitado",
      bloqueado: "Bloqueado",
    })[normalized] || String(value || "Disponível");
  };
  
  const stageRecordLotAnalysisV1 = (state) => {
    const catalog = REPASSE_PRICE_CATALOG
      .filter((item) => Number(item?.lot) > 0 && Number(item?.price) > 0)
      .map((item) => {
        const key = String(item.label || `${item.quadra}-${item.lot}`),
          saved = state.lotStatuses?.[key] || {};
        return { ...item, key, status: stageRecordLotStatusLabelV1(saved.status) };
      });
    const statusOrder = ["Disponível", "Reservado", "Em negociação", "Vendido", "Repasse programado", "Quitado", "Bloqueado"],
      committedStatuses = new Set(["Reservado", "Em negociação", "Vendido", "Repasse programado", "Quitado"]),
      statusCounts = Object.fromEntries(statusOrder.map((status) => [status, 0]));
    const quadras = new Map();
    let totalArea = 0;
    let totalValue = 0;
    for (const item of catalog) {
      const status = statusCounts[item.status] == null ? "Disponível" : item.status;
      statusCounts[status] += 1;
      totalArea += Number(item.area) || 0;
      totalValue += Number(item.price) || 0;
      const current = quadras.get(item.quadra) || { quadra: item.quadra, lots: 0, area: 0, value: 0, available: 0, committed: 0 };
      current.lots += 1;
      current.area += Number(item.area) || 0;
      current.value += Number(item.price) || 0;
      if (committedStatuses.has(status)) current.committed += 1;
      else current.available += 1;
      quadras.set(item.quadra, current);
    }
    const groups = [...quadras.values()].sort((a, b) => String(a.quadra).localeCompare(String(b.quadra), "pt-BR", { numeric: true })),
      topGroups = [...groups].sort((a, b) => b.value - a.value).slice(0, 8),
      maxGroupValue = Math.max(1, ...topGroups.map((item) => item.value)),
      interestedLots = Number(demoData.metrics?.lotsWithInterest) || 0,
      committed = catalog.filter((item) => committedStatuses.has(item.status)).length,
      documents = Array.isArray(state.documentCatalog) ? state.documentCatalog : [],
      documentsWithFile = documents.filter((item) => item.fileName || item.sourceUrl).length,
      documentRows = documents.slice(0, 8).map((item) => `<tr><td><b>${esc(item.title || "Documento sem título")}</b><small>${esc(item.code || item.issuer || "Acervo do loteamento")}</small></td><td>${esc(item.category || "Outro")}</td><td><span class="lot-analysis-document-state ${item.fileName || item.sourceUrl ? "is-ready" : "is-pending"}">${item.fileName || item.sourceUrl ? "Com arquivo" : "Pendente"}</span></td><td>${esc(item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("pt-BR") : "Base inicial")}</td></tr>`).join("");
    const statusBars = statusOrder.map((status) => {
      const count = statusCounts[status] || 0;
      return `<div class="lot-analysis-bar-row"><span>${esc(status)}</span><div><i style="width:${Math.round((count / Math.max(1, catalog.length)) * 100)}%"></i></div><b>${count}</b></div>`;
    }).join("");
    const quadraBars = topGroups.map((item) => `<div class="lot-analysis-bar-row"><span>${esc(item.quadra)}</span><div><i style="width:${Math.round((item.value / maxGroupValue) * 100)}%"></i></div><b>${formatBRL(item.value)}</b></div>`).join("");
    const tableRows = groups.map((item) => `<tr><td><b>${esc(item.quadra)}</b></td><td>${item.lots}</td><td>${item.available}</td><td>${item.committed}</td><td>${item.area.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²</td><td>${formatBRL(item.value)}</td><td>${formatBRL(item.value / Math.max(1, item.lots))}</td></tr>`).join("");
    return `<section class="stage-record-document-summary" data-stage-center-documents><header class="stage-record-table-head"><div><span class="activity-kind">01 · DOCUMENTOS DO LOTEAMENTO</span><h2>Acervo que sustenta a análise</h2><p class="stage-center-panel-description">Projetos, plantas, memoriais e licenças ficam acima dos indicadores para que a leitura comercial use a mesma base documental.</p></div><span class="stage-record-section-note">${documentsWithFile} de ${documents.length} com arquivo</span></header><div class="stage-record-table-wrap"><table class="stage-record-table"><thead><tr><th>Documento</th><th>Categoria</th><th>Arquivo</th><th>Atualização</th></tr></thead><tbody>${documentRows || `<tr><td colspan="4" class="stage-record-empty-state">Nenhum documento cadastrado.</td></tr>`}</tbody></table></div></section><section class="stage-record-lot-analysis" data-stage-center-lot-analysis><header class="stage-record-lot-analysis-head"><div><span class="activity-kind">02 · ANÁLISE DO LOTEAMENTO</span><h2>Quadro de lotes, ocupação e valor</h2><p>Leitura consolidada da planilha de preços e dos controles de status. Os totais se atualizam quando um lote é reservado, vendido ou vinculado a repasse.</p></div><span class="stage-record-section-note">${groups.length} quadras · base de ${catalog.length} lotes</span></header><div class="stage-record-lot-kpis"><article><small>LOTES TABELADOS</small><b>${catalog.length}</b><span>unidades com preço</span></article><article><small>VALOR DE TABELA</small><b>${formatBRL(totalValue)}</b><span>base catalogada</span></article><article><small>COM INTERESSE</small><b>${interestedLots}</b><span>leads relacionados</span></article><article><small>OCUPADOS / NEGOCIAÇÃO</small><b>${committed}</b><span>status controlados</span></article></div><div class="stage-record-lot-charts"><article class="stage-record-lot-chart"><header><div><span>STATUS COMERCIAL</span><h3>Distribuição dos lotes</h3></div><small>${catalog.length} unidades</small></header><div class="lot-analysis-bars" role="img" aria-label="Distribuição de lotes por status">${statusBars}</div></article><article class="stage-record-lot-chart"><header><div><span>CONCENTRAÇÃO DE VALOR</span><h3>Valor por quadra</h3></div><small>8 maiores bases</small></header><div class="lot-analysis-bars" role="img" aria-label="Valor de tabela por quadra">${quadraBars}</div></article></div><section class="stage-record-lot-table"><header><div><span>03 · TABELA ANALÍTICA</span><h3>Resumo por quadra</h3></div><small>${totalArea.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m² de área catalogada</small></header><div class="stage-record-table-wrap"><table class="stage-record-table"><thead><tr><th>Quadra</th><th>Lotes</th><th>Disponíveis</th><th>Ocupados / negociação</th><th>Área total</th><th>Valor de tabela</th><th>Ticket médio</th></tr></thead><tbody>${tableRows || `<tr><td colspan="7" class="stage-record-empty-state">Nenhum lote com preço encontrado.</td></tr>`}</tbody></table></div></section></section>`;
  };
  
  // O Dashboard começa na seção 02. O acervo documental segue disponível no
  // cadastro próprio, sem ocupar a primeira dobra operacional.
  const stageRecordDashboardLotAnalysisV1 = (state) =>
    stageRecordLotAnalysisV1(state).replace(
      /<section class="stage-record-document-summary"[\s\S]*?<\/section>(?=<section class="stage-record-lot-analysis")/,
      "",
    );
  
  const stageRecordQuickCaptureMarkupV1 = (stages, state = appStore.get()) => {
    const today = new Date().toISOString().slice(0, 10);
    return `<section class="stage-dashboard-quick-capture" data-stage-dashboard-quick-capture><header><div><span class="activity-kind">AÇÕES RÁPIDAS</span><h2>Adicionar registro</h2><p>Os recebimentos de lotes são registrados exclusivamente em Repasses; os apontamentos operacionais permanecem nesta área.</p></div><button type="button" class="toolbar-action" data-view="repasses">${ico("wallet-cards")} Abrir Repasses</button></header><form data-dashboard-quick-record><header><span>${ico("clipboard-pen-line")}</span><div><b>Novo registro</b><small>Cria apontamento para uma etapa</small></div></header><label>Etapa<select name="stageKey" required>${stages.map((stage) => `<option value="${esc(stage.key)}">${esc(stage.name)}</option>`).join("")}</select></label><label>Atividade<input name="activity" required placeholder="Ex.: conferência de execução"></label><div class="stage-dashboard-quick-pair"><label>Data<input name="date" type="date" required value="${today}"></label><label>Responsável<input name="responsible" placeholder="A definir"></label></div><label>Resumo<input name="detail" placeholder="Medição, ocorrência ou evidência"></label><button type="submit" class="primary">Adicionar registro ${ico("arrow-up-right")}</button></form><p class="stage-dashboard-quick-feedback" data-dashboard-quick-feedback aria-live="polite">${esc(state.dashboardQuickRecordFeedbackV1 || "Pronto para registrar.")}</p></section>`;
  };
  
  const stageRecordRecordsPanelV1 = (stages, groups) => {
    const rows = groups
      .map(({ stage, records: stageRecords }) => {
        if (!stageRecords.length) {
          return `<tr class="stage-record-empty-row" data-stage-record-row data-stage-record-empty data-stage-record-stage="${esc(stage.key)}" data-stage-record-text="${esc(stage.name)}"><td><b>${esc(stage.name)}</b><small>${esc(stage.key)}</small></td><td colspan="6"><span>Nenhum registro adicionado nesta etapa.</span></td></tr>`;
        }
        return stageRecords
          .map((record) => {
            const attachments = stageRecordAttachmentsV1(record),
              status = stageRecordStatusLabelV1(record),
              activity = record.atividade || record.activity || record.title || "Registro operacional",
              text = `${stage.name} ${activity} ${record.id || ""} ${record.responsavel || ""} ${status}`;
            return `<tr class="stage-record-row" data-stage-record-row data-stage-record-open="${esc(record.id)}" data-stage-record-stage="${esc(stage.key)}" data-stage-record-status="${esc(status)}" data-stage-record-text="${esc(text)}" tabindex="0"><td><b>${esc(stage.name)}</b><small>${esc(stage.key)}</small></td><td><strong>${esc(activity)}</strong><small>${esc(record.id || "Registro sem ID")}</small></td><td>${esc(record.data || record.date || "—")} ${esc(record.hora || record.time || "")}</td><td>${esc(record.responsavel || record.responsible || "A definir")}</td><td><span class="stage-record-status stage-record-status-${stageRecordNormalizeV1(status).replace(/ /g, "-")}">${esc(status)}</span></td><td><span class="stage-record-attachment-count">${ico("paperclip")} ${attachments.length}</span></td><td><button type="button" class="stage-record-open" data-stage-record-open="${esc(record.id)}">Ver propriedades ${ico("arrow-up-right")}</button></td></tr>`;
          })
          .join("");
      })
      .join("");
    return `<section class="stage-record-table-section stage-center-panel" data-stage-center-panel="records"><header class="stage-record-table-head"><div><span class="activity-kind">01 · REGISTROS OPERACIONAIS</span><h2>Registros por etapa</h2><p class="stage-center-panel-description">Clique em uma linha para ver propriedades, apontamento e anexos do registro.</p></div><div class="stage-record-filters"><label><span>Pesquisar</span><input type="search" data-stage-record-filter-search placeholder="Etapa, atividade, responsável…"></label><label><span>Etapa</span><select data-stage-record-filter-stage><option value="">Todas as etapas</option>${stages.map((stage) => `<option value="${esc(stage.key)}">${esc(stage.name)}</option>`).join("")}<option value="unassigned">Sem etapa</option></select></label><label><span>Status</span><select data-stage-record-filter-status><option value="">Todos os status</option><option>Pendente</option><option>Em andamento</option><option>Concluído</option><option>Bloqueado</option></select></label><button type="button" class="ghost" data-stage-record-filter-clear>Limpar filtros</button></div></header><div class="stage-record-table-wrap"><table class="stage-record-table"><thead><tr><th>Etapa</th><th>Registro / atividade</th><th>Data / hora</th><th>Responsável</th><th>Status</th><th>Anexos</th><th>Ação</th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="stage-record-empty-state">Nenhum registro operacional encontrado.</td></tr>`}</tbody></table></div></section>`;
  };
  
  const stageRecordModalMarkupV1 = (state, record, stage) => {
    if (!record) return "";
    const attachments = stageRecordAttachmentsV1(record),
      properties = stageRecordPropertiesV1(record),
      recordProperties = [
        ["ID do registro", record.id || "—"],
        ["Data", record.data || record.date || "—"],
        ["Hora", record.hora || record.time || "—"],
        ["Responsável", record.responsavel || record.responsible || "A definir"],
        ["Status", stageRecordStatusLabelV1(record)],
        ["Avanço", record.progresso == null ? "—" : `${record.progresso}%`],
      ];
    return `<dialog class="stage-record-properties-dialog" data-stage-record-dialog aria-labelledby="stage-record-dialog-title"><form method="dialog" class="stage-record-dialog-shell"><header class="stage-record-dialog-head"><div><span class="activity-kind">REGISTRO DA ETAPA · PROPRIEDADES</span><h2 id="stage-record-dialog-title">${esc(record.atividade || record.activity || "Registro operacional")}</h2><p>${esc(stage?.name || record.etapa || "Sem etapa")} · ${esc(record.id || "registro sem identificador")}</p></div><button type="submit" class="stage-record-dialog-close" data-stage-record-close aria-label="Fechar propriedades">${ico("x")}</button></header><div class="stage-record-dialog-body"><section class="stage-record-detail-block"><header><span>01 · PROPRIEDADES DO REGISTRO</span><b>Dados do apontamento</b></header><dl class="stage-record-property-grid">${recordProperties.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl></section><section class="stage-record-detail-block"><header><span>02 · DESCRIÇÃO / APONTAMENTO</span><b>Contexto informado na etapa</b></header><p class="stage-record-description">${esc(record.detalhes || record.description || record.descricao || "Nenhuma descrição foi adicionada a este registro.")}</p></section><section class="stage-record-detail-block"><header><span>03 · ETAPA RELACIONADA</span><b>${esc(stage?.name || record.etapa || "Sem etapa")}</b></header><dl class="stage-record-property-grid"><div><dt>Chave</dt><dd>${esc(stage?.key || record.stageKey || "—")}</dd></div><div><dt>Progresso atual</dt><dd>${stage ? `${stageRecordProgressV1(stage, state)}%` : "—"}</dd></div><div><dt>Prioridade</dt><dd>${esc(stage?.priority || "—")}</dd></div><div><dt>Dependências</dt><dd>${esc(stage?.dependsOn?.join(" · ") || "Origem")}</dd></div></dl>${properties.length ? `<div class="stage-record-custom-properties"><strong>Propriedades adicionais</strong><dl class="stage-record-property-grid">${properties.map((item) => `<div><dt>${esc(item.label)}</dt><dd>${esc(item.value)}</dd></div>`).join("")}</dl></div>` : ""}</section><section class="stage-record-detail-block"><header><span>04 · ANEXOS</span><b>${attachments.length} arquivo(s) vinculado(s)</b></header>${attachments.length ? `<ul class="stage-record-attachments">${attachments.map((item) => `<li><span class="stage-record-attachment-icon">${ico("paperclip")}</span><div><strong>${esc(item.label)}</strong><small>${esc(item.meta || "Anexo do registro operacional")}</small></div>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener" aria-label="Abrir ${esc(item.label)}">${ico("external-link")}</a>` : `<span class="stage-record-attachment-missing">sem arquivo</span>`}</li>`).join("")}</ul>` : `<p class="stage-record-empty-attachments">Nenhum anexo foi associado a este registro.</p>`}</section></div><footer class="stage-record-dialog-foot"><span>As propriedades e anexos pertencem ao registro selecionado.</span><button type="submit" class="primary" data-stage-record-close>Fechar</button></footer></form></dialog>`;
  };
  
  const stageRecordCenterItemModalMarkupV1 = (state, materialRows, serviceRows, stages) => {
    const key = String(state.controlStageCenterItemModalKey || "");
    if (!key) return "";
    const separator = key.indexOf(":");
    const kind = separator > 0 ? key.slice(0, separator) : "";
    const itemId = separator > 0 ? key.slice(separator + 1) : "";
    const source = kind === "material"
      ? materialRows.find((item) => String(item.id) === itemId)
      : serviceRows.find((item) => String(item.recordId || item.id) === itemId);
    if (!source) return "";
    const sourceRecord = (state.records || []).find((item) => String(item.id) === String(source.sourceRecordId || source.recordId));
    const record = {
      ...sourceRecord,
      ...source,
      properties: source.properties || sourceRecord?.properties || [],
      attachments: source.attachments || sourceRecord?.attachments || [],
    };
    const stage = stages.find((item) => String(item.key) === String(record.stageKey || source.stageKey)) || stageRecordStageForV1(record, stages);
    const properties = stageRecordPropertiesV1(record);
    const attachments = stageRecordAttachmentsV1(record);
    const title = kind === "material" ? record.name || "Material adicionado" : record.name || "Serviço adicionado";
    const description = kind === "material" ? record.scope : record.detail || record.detalhes;
    const overview = [
      ["ID da adição", record.id || "—"],
      ["Etapa associada", stage?.name || record.stageName || record.etapa || "—"],
      ["Origem", "Assistente operacional · OCR"],
      ["Status", stageRecordStatusLabelV1(record)],
      ["Quantidade", record.quantity == null ? "Não informado" : record.quantity],
      ["Unidade", record.unit || "Não informado"],
    ];
    const overviewMarkup = overview.map(([label, value]) => "<div><dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>").join("");
    const propertiesMarkup = properties.length
      ? "<dl class=\"stage-record-property-grid\">" + properties.map((item) => "<div><dt>" + esc(item.label) + "</dt><dd>" + esc(item.value) + "</dd></div>").join("") + "</dl>"
      : "<p class=\"stage-record-empty-attachments\">Nenhuma propriedade adicional foi registrada.</p>";
    const attachmentsMarkup = attachments.length
      ? "<ul class=\"stage-record-attachments\">" + attachments.map((item) => "<li><span class=\"stage-record-attachment-icon\">" + ico("paperclip") + "</span><div><strong>" + esc(item.label) + "</strong><small>" + esc(item.meta || "Anexo analisado pelo assistente") + "</small></div>" + (item.url ? "<a href=\"" + esc(item.url) + "\" target=\"_blank\" rel=\"noopener\" aria-label=\"Abrir anexo\">" + ico("external-link") + "</a>" : "<span class=\"stage-record-attachment-missing\">sem arquivo</span>") + "</li>").join("") + "</ul>"
      : "<p class=\"stage-record-empty-attachments\">O anexo é referenciado nas propriedades da leitura.</p>";
    return "<dialog class=\"stage-record-properties-dialog stage-center-item-dialog\" data-stage-center-item-dialog aria-labelledby=\"stage-center-item-dialog-title\"><form method=\"dialog\" class=\"stage-record-dialog-shell\"><header class=\"stage-record-dialog-head\"><div><span class=\"activity-kind\">" + (kind === "material" ? "MATERIAL" : "SERVIÇO") + " ADICIONADO PELO ASSISTENTE · PROPRIEDADES</span><h2 id=\"stage-center-item-dialog-title\">" + esc(title) + "</h2><p>" + esc(stage?.name || record.stageName || record.etapa || "Sem etapa") + " · " + esc(record.sourceRecordId || record.recordId || record.id || "adição sem identificador") + "</p></div><button type=\"submit\" class=\"stage-record-dialog-close\" data-stage-center-item-close aria-label=\"Fechar propriedades\">" + ico("x") + "</button></header><div class=\"stage-record-dialog-body\"><section class=\"stage-record-detail-block\"><header><span>01 · PROPRIEDADES DA ADIÇÃO</span><b>Dados criados no escaneamento</b></header><dl class=\"stage-record-property-grid\">" + overviewMarkup + "</dl></section><section class=\"stage-record-detail-block\"><header><span>02 · APONTAMENTO OCR</span><b>Contexto lido no anexo</b></header><p class=\"stage-record-description\">" + esc(description || record.detalhes || "Nenhum detalhe foi informado pelo assistente.") + "</p></section><section class=\"stage-record-detail-block\"><header><span>03 · PROPRIEDADES GERADAS PELO ASSISTENTE</span><b>" + properties.length + " campo(s)</b></header>" + propertiesMarkup + "</section><section class=\"stage-record-detail-block\"><header><span>04 · ANEXO DE ORIGEM</span><b>" + attachments.length + " arquivo(s)</b></header>" + attachmentsMarkup + "</section></div><footer class=\"stage-record-dialog-foot\"><span>Esta adição foi criada pelo assistente a partir de um escaneamento OCR.</span><button type=\"submit\" class=\"primary\" data-stage-center-item-close>Fechar</button></footer></form></dialog>";
  };
  
  const stageRecordCenterMarkupV1 = (state) => {
    const records = Array.isArray(state.records) ? state.records : [],
      stages = stageRecordStagesV1(),
      stageGroups = stages.map((stage) => ({
        stage,
        records: records.filter((record) => stageRecordStageForV1(record, [stage]) === stage),
      })),
      unassigned = records.filter((record) => !stageRecordStageForV1(record, stages)),
      groups = unassigned.length
        ? [...stageGroups, { stage: { key: "unassigned", name: "Registros sem etapa" }, records: unassigned }]
        : stageGroups,
      attachmentCount = records.reduce((total, record) => total + stageRecordAttachmentsV1(record).length, 0),
      pendingCount = records.filter((record) => !/conclu/i.test(stageRecordStatusLabelV1(record))).length,
      selectedRecord = records.find((record) => String(record.id) === String(state.controlStageRecordModalId)),
      selectedStage = selectedRecord ? stageRecordStageForV1(selectedRecord, stages) : null;
    const rows = groups
      .map(({ stage, records: stageRecords }) => {
        if (!stageRecords.length) {
          return `<tr class="stage-record-empty-row" data-stage-record-row data-stage-record-empty data-stage-record-stage="${esc(stage.key)}" data-stage-record-text="${esc(stage.name)}"><td><b>${esc(stage.name)}</b><small>${esc(stage.key)}</small></td><td colspan="6"><span>Nenhum registro adicionado nesta etapa.</span></td></tr>`;
        }
        return stageRecords
          .map((record) => {
            const attachments = stageRecordAttachmentsV1(record),
              status = stageRecordStatusLabelV1(record),
              activity = record.atividade || record.activity || record.title || "Registro operacional",
              text = `${stage.name} ${activity} ${record.id || ""} ${record.responsavel || ""} ${status}`;
            return `<tr class="stage-record-row" data-stage-record-row data-stage-record-open="${esc(record.id)}" data-stage-record-stage="${esc(stage.key)}" data-stage-record-status="${esc(status)}" data-stage-record-text="${esc(text)}" tabindex="0"><td><b>${esc(stage.name)}</b><small>${esc(stage.key)}</small></td><td><strong>${esc(activity)}</strong><small>${esc(record.id || "Registro sem ID")}</small></td><td>${esc(record.data || record.date || "—")} ${esc(record.hora || record.time || "")}</td><td>${esc(record.responsavel || record.responsible || "A definir")}</td><td><span class="stage-record-status stage-record-status-${stageRecordNormalizeV1(status).replace(/ /g, "-")}">${esc(status)}</span></td><td><span class="stage-record-attachment-count">${ico("paperclip")} ${attachments.length}</span></td><td><button type="button" class="stage-record-open" data-stage-record-open="${esc(record.id)}">Ver propriedades ${ico("arrow-up-right")}</button></td></tr>`;
          })
          .join("");
      })
      .join("");
    return `<section class="stage-record-center-page" data-stage-record-center><header class="stage-record-center-head"><div><span class="activity-kind">CENTRAL OPERACIONAL · ETAPAS</span><h1>Etapas, registros e anexos</h1><p>Consulte os registros adicionados em cada etapa. Clique em uma linha para ver todas as propriedades e os arquivos vinculados.</p></div><div class="stage-record-center-live"><span class="control-live-dot">${ico("radio")} leitura operacional</span><button type="button" data-view="stages">Abrir cronograma ${ico("arrow-up-right")}</button></div></header><section class="stage-record-center-kpis"><article><small>ETAPAS</small><b>${stages.length}</b><span>frentes cadastradas</span></article><article><small>REGISTROS</small><b>${records.length}</b><span>apontamentos adicionados</span></article><article><small>ANEXOS</small><b>${attachmentCount}</b><span>arquivos vinculados</span></article><article><small>PENDÊNCIAS</small><b>${pendingCount}</b><span>registros não concluídos</span></article></section><section class="stage-record-table-section"><header class="stage-record-table-head"><div><span class="activity-kind">01 · LISTA OPERACIONAL</span><h2>Registros por etapa</h2></div><div class="stage-record-filters"><label><span>Pesquisar</span><input type="search" data-stage-record-filter-search placeholder="Etapa, atividade, responsável…"></label><label><span>Etapa</span><select data-stage-record-filter-stage><option value="">Todas as etapas</option>${stages.map((stage) => `<option value="${esc(stage.key)}">${esc(stage.name)}</option>`).join("")}<option value="unassigned">Sem etapa</option></select></label><label><span>Status</span><select data-stage-record-filter-status><option value="">Todos os status</option><option>Pendente</option><option>Em andamento</option><option>Concluído</option><option>Bloqueado</option></select></label><button type="button" class="ghost" data-stage-record-filter-clear>Limpar filtros</button></div></header><div class="stage-record-table-wrap"><table class="stage-record-table"><thead><tr><th>Etapa</th><th>Registro / atividade</th><th>Data / hora</th><th>Responsável</th><th>Status</th><th>Anexos</th><th>Ação</th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="stage-record-empty-state">Nenhum registro operacional encontrado.</td></tr>`}</tbody></table></div></section>${stageRecordModalMarkupV1(state, selectedRecord, selectedStage)}</section>`;
  };
  
  const stageRecordCenterMarkupV2 = (state) => {
    const records = Array.isArray(state.records) ? state.records : [],
      stages = stageRecordStagesV1(),
      materialRows = stageRecordMaterialRowsV1(state),
      stageGroups = stages.map((stage) => ({
        stage,
        records: records.filter((record) => stageRecordStageForV1(record, [stage]) === stage),
      })),
      unassigned = records.filter((record) => !stageRecordStageForV1(record, stages)),
      groups = unassigned.length
        ? [...stageGroups, { stage: { key: "unassigned", name: "Registros sem etapa" }, records: unassigned }]
        : stageGroups,
      attachmentCount = records.reduce((total, record) => total + stageRecordAttachmentsV1(record).length, 0),
      pendingCount = records.filter((record) => !/conclu/i.test(stageRecordStatusLabelV1(record))).length,
      selectedRecord = records.find((record) => String(record.id) === String(state.controlStageRecordModalId)),
      selectedStage = selectedRecord ? stageRecordStageForV1(selectedRecord, stages) : null;
    return `<section class="stage-record-center-page" data-stage-record-center>${stageRecordQuickCaptureMarkupV1(stages, state)}<section class="stage-record-center-kpis"><article><small>MATERIAIS OCR</small><b>${materialRows.length}</b><span>itens identificados nas notas</span></article><article><small>REGISTROS OCR</small><b>${records.length}</b><span>apontamentos adicionados</span></article><article><small>ANEXOS</small><b>${attachmentCount}</b><span>arquivos vinculados</span></article><article><small>PENDÊNCIAS</small><b>${pendingCount}</b><span>registros para revisão</span></article></section>${stageRecordDashboardLotAnalysisV1(state)}${stageRecordModalMarkupV1(state, selectedRecord, selectedStage)}</section>`;
  };
  
  const stageHomeRecordResourcesMarkupV1 = (state = appStore.get()) => {
    const stages = stageRecordStagesV1(),
      contextualStage = stageContextV1()?.model,
      selectedKey = String(state.selectedStageV9 || contextualStage?.key || state.selectedStage || ""),
      selectedStage = stages.find((stage) => String(stage.key) === selectedKey) || stages[0];
    if (!selectedStage) return '<p class="stage-home-empty">Nenhuma etapa disponível para consultar materiais e serviços.</p>';
    const scopedStages = [selectedStage],
      materialRows = stageRecordMaterialRowsV1(state).filter((item) => String(item.stageKey || "") === String(selectedStage.key)),
      serviceRows = stageRecordServiceRowsV1(state).filter((item) => String(item.stageKey || "") === String(selectedStage.key)),
      tab = state.controlStageCenterTab === "services" ? "services" : "materials",
      materialMode = state.controlStageCenterMaterialMode === "proofs" ? "proofs" : "table",
      serviceMode = state.controlStageCenterServiceMode === "proofs" ? "proofs" : "table",
      panel = tab === "services"
        ? stageRecordServicesPanelV1(scopedStages, serviceRows, serviceMode)
        : stageRecordMaterialsPanelV1(state, scopedStages, materialRows, materialMode);
    return `<section class="stage-home-record-resource-workspace" data-stage-home-record-resources><header class="stage-home-record-resource-toolbar"><div><span class="activity-kind">ITENS ASSOCIADOS À ETAPA</span><strong>${esc(selectedStage.name)}</strong><small>${materialRows.length} material(is) · ${serviceRows.length} serviço(s) adicionados pelo assistente</small></div><label>Etapa<select data-stage-home-resource-stage>${stages.map((stage) => `<option value="${esc(stage.key)}" ${String(stage.key) === String(selectedStage.key) ? "selected" : ""}>${esc(stage.name)}</option>`).join("")}</select></label></header><nav class="stage-record-center-tabs" data-stage-record-center-tabs role="tablist" aria-label="Materiais e serviços da etapa">${stageRecordCenterTabsV1(tab, {materials: materialRows.length, services: serviceRows.length})}</nav>${panel}${stageMaterialReportDialogV1(materialRows, scopedStages)}${stageRecordCenterItemModalMarkupV1(state, materialRows, serviceRows, scopedStages)}</section>`;
  };
  
  const stageHomePageMarkupV1 = (calendarWeek = "") => {
    const state = appStore.get();
    return `${stageViewTabs("stages")}${renderStageHomePageV1({
      ...stageHomeSnapshotV1(calendarWeek),
      recordResources: stageHomeRecordResourcesMarkupV1(state),
    })}`;
  };

  if (documentRef?.addEventListener) {
    installStageRecordCenterModalCaptureV1({
      host: globalThis,
      document: documentRef,
      appStore,
      stageRecordStagesV1,
      stageRecordMaterialRowsV1,
      stageRecordServiceRowsV1,
      stageRecordCenterItemModalMarkupV1,
    });
  }
  
  globalThis.installStageRecordCenterV1 = () => {
    ViewLayer.prototype.control = function () {
      return stageRecordCenterMarkupV2(appStore.get());
    };
  };
  globalThis.installStageRecordCenterV1();
  
  const stageRecordDashboardQuickEntryMarkupV1 = () => {
    return stageRecordQuickCaptureMarkupV1(stageRecordStagesV1(), appStore.get());
  };
  
  const stageRecordDashboardActionWorkspaceMarkupV1 = () => {
    const template = document.createElement("template");
    template.innerHTML = ViewLayer.prototype.actions?.call({}) || "";
    const workspace = template.content.querySelector(".action-workspace");
    return workspace
      ? `<section class="dashboard-action-workspace-item" data-dashboard-action-workspace><header><div><span class="activity-kind">03 · AÇÕES OPERACIONAIS</span><h2>Prioridades por impacto e prontidão</h2><p>Reordene prioridades e avance a passagem da ação sem sair do Dashboard.</p></div><button type="button" class="ghost" data-view="activities">Abrir atividades da etapa ${ico("arrow-up-right")}</button></header>${workspace.outerHTML}</section>`
      : "";
  };
  
  const stageRecordDashboardControlBaseV1 = ViewLayer.prototype.control;
  ViewLayer.prototype.control = function (...args) {
    return stageRecordDashboardControlBaseV1.apply(this, args).replace(
      /<section class="stage-dashboard-quick-capture"[\s\S]*?<\/section>/,
      stageRecordDashboardQuickEntryMarkupV1(),
    );
  };
  
  // The control view may be replaced by later render/bind decorators. Delegate
  // the submit at document level so a new form never falls through to a GET.
  documentRef?.addEventListener("submit", async (event) => {
      const form = event.target;
      if (!form?.matches?.("[data-dashboard-quick-record]")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const view = form.closest("view-layer");
      if (!view || typeof apiFetch !== "function" || typeof operationalHeaders !== "function") return;
        const values = Object.fromEntries(new FormData(form)),
          stage = stageRecordStagesV1().find((item) => String(item.key) === String(values.stageKey)),
          activity = String(values.activity || "").trim(),
          feedback = view.querySelector("[data-dashboard-quick-feedback]"),
          button = form.querySelector('button[type="submit"]');
        if (!stage || !activity) {
          if (feedback) feedback.textContent = "Selecione uma etapa e informe a atividade.";
          return;
        }
        button.disabled = true;
        if (feedback) feedback.textContent = "Salvando registro no diário operacional…";
        try {
          const response = await apiFetch("/api/records", {
              method: "POST",
              headers: operationalHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                obra: "Aliança Park",
                etapa: stage.name,
                stageKey: stage.key,
                atividade: activity,
                data: String(values.date || ""),
                hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                responsavel: String(values.responsible || "A definir").trim() || "A definir",
                detalhes: String(values.detail || `Registro operacional: ${activity}`).trim(),
                status: "Pendente",
                properties: [{ label: "Origem", value: "Registro rápido do Dashboard" }],
              }),
            }),
            payload = await response.json();
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          const record = payload.record || payload;
          appStore.update((state) => ({
            ...state,
            records: [record, ...(state.records || []).filter((item) => String(item.id) !== String(record.id))],
            lastAction: `Criou registro de ${activity} na etapa ${stage.name}`,
            dashboardQuickRecordFeedbackV1: `Registro ${record.id} salvo e vinculado a ${stage.name}.`,
          }));
          form.reset();
          form.elements.date.value = new Date().toISOString().slice(0, 10);
          notify(`Registro salvo em ${stage.name}.`, "success");
          try { await view.runOperationalLoop?.("record.created"); } catch (error) { console.warn("Replanejamento após registro não concluído.", error); }
        } catch (error) {
          const message = `Registro não salvo: ${error.message || "serviço indisponível"}`;
          appStore.set({ dashboardQuickRecordFeedbackV1: message });
          notify("Registro não confirmado; revise a conexão e tente novamente.", "warning");
        } finally {
          button.disabled = false;
        }
  }, true);
  const stageRecordCenterBindBaseV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = stageRecordCenterBindBaseV1.apply(this, args),
      root = this.querySelector("[data-stage-record-center]");
    if (!root) return result;
    stageMaterialReportBindV1(root, stageRecordMaterialRowsV1(appStore.get()));
  
    root.querySelectorAll("[data-stage-record-center-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.stageRecordCenterTab;
        if (!tab) return;
        appStore.set({
          controlStageCenterTab: tab,
          controlStageRecordModalId: null,
          lastAction: `Abriu a aba ${button.textContent.trim()}`,
        });
      });
    });
  
    root.querySelectorAll("[data-stage-center-view-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.stageCenterViewMode,
          mode = button.dataset.stageCenterMode;
        if (!["materials", "services"].includes(kind) || !["table", "proofs"].includes(mode)) return;
        appStore.set({
          [kind === "materials" ? "controlStageCenterMaterialMode" : "controlStageCenterServiceMode"]: mode,
          lastAction: `Abriu ${mode === "proofs" ? "os comprovantes" : "a tabela"} de ${kind === "materials" ? "materiais" : "serviços"}`,
        });
      });
    });
  
    const openRecord = (element) => {
      const recordId = element.dataset.stageRecordOpen;
      if (!recordId) return;
      appStore.set({
        controlStageRecordModalId: recordId,
        lastAction: `Abriu as propriedades do registro ${recordId}`,
      });
    };
    root.querySelectorAll("[data-stage-record-open]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        openRecord(element);
      });
      if (element.matches("tr")) {
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openRecord(element);
          }
        });
      }
    });
  
    const rows = [...root.querySelectorAll("[data-stage-record-row]")],
      search = root.querySelector("[data-stage-record-filter-search]"),
      stageFilter = root.querySelector("[data-stage-record-filter-stage]"),
      statusFilter = root.querySelector("[data-stage-record-filter-status]"),
      applyFilters = () => {
        const query = stageRecordNormalizeV1(search?.value),
          stage = String(stageFilter?.value || ""),
          status = stageRecordNormalizeV1(statusFilter?.value);
        rows.forEach((row) => {
          const matches =
            (!query || stageRecordNormalizeV1(row.dataset.stageRecordText).includes(query)) &&
            (!stage || row.dataset.stageRecordStage === stage) &&
            (!status || stageRecordNormalizeV1(row.dataset.stageRecordStatus) === status);
          row.hidden = !matches;
        });
      };
    search?.addEventListener("input", applyFilters);
    stageFilter?.addEventListener("change", applyFilters);
    statusFilter?.addEventListener("change", applyFilters);
    root.querySelector("[data-stage-record-filter-clear]")?.addEventListener("click", () => {
      if (search) search.value = "";
      if (stageFilter) stageFilter.value = "";
      if (statusFilter) statusFilter.value = "";
      applyFilters();
    });
  
    const bindCenterTableFilters = ({ searchSelector, stageSelector, statusSelector, rowSelector, textKey, stageKey, statusKey, clearSelector }) => {
      const listRows = [...root.querySelectorAll(rowSelector)],
        listSearch = root.querySelector(searchSelector),
        listStage = root.querySelector(stageSelector),
        listStatus = root.querySelector(statusSelector),
        applyListFilters = () => {
          const query = stageRecordNormalizeV1(listSearch?.value),
            stage = String(listStage?.value || ""),
            status = stageRecordNormalizeV1(listStatus?.value);
          listRows.forEach((row) => {
            const matches =
              (!query || stageRecordNormalizeV1(row.dataset[textKey]).includes(query)) &&
              (!stage || row.dataset[stageKey] === stage) &&
              (!status || stageRecordNormalizeV1(row.dataset[statusKey]) === status);
            row.hidden = !matches;
          });
        };
      listSearch?.addEventListener("input", applyListFilters);
      listStage?.addEventListener("change", applyListFilters);
      listStatus?.addEventListener("change", applyListFilters);
      root.querySelector(clearSelector)?.addEventListener("click", () => {
        if (listSearch) listSearch.value = "";
        if (listStage) listStage.value = "";
        if (listStatus) listStatus.value = "";
        applyListFilters();
      });
    };
    bindCenterTableFilters({
      searchSelector: "[data-stage-center-material-search]",
      stageSelector: "[data-stage-center-material-stage-filter]",
      statusSelector: "[data-stage-center-material-status-filter]",
      rowSelector: "[data-stage-center-material-row]",
      textKey: "stageCenterMaterialText",
      stageKey: "stageCenterMaterialStage",
      statusKey: "stageCenterMaterialStatus",
      clearSelector: "[data-stage-center-material-clear]",
    });
    bindCenterTableFilters({
      searchSelector: "[data-stage-center-service-search]",
      stageSelector: "[data-stage-center-service-stage-filter]",
      statusSelector: "[data-stage-center-service-status-filter]",
      rowSelector: "[data-stage-center-service-row]",
      textKey: "stageCenterServiceText",
      stageKey: "stageCenterServiceStage",
      statusKey: "stageCenterServiceStatus",
      clearSelector: "[data-stage-center-service-clear]",
    });
    const openCenterItem = (element) => {
      const itemKey = element.dataset.stageCenterItemOpen;
      if (!itemKey) return;
      appStore.set({
        controlStageCenterItemModalKey: itemKey,
        lastAction: `Abriu as propriedades da adição ${itemKey}`,
      });
    };
    root.querySelectorAll("[data-stage-center-item-open]").forEach((row) => {
      row.addEventListener("click", (event) => {
        if (event.target.closest("button, a")) return;
        openCenterItem(row);
      });
      row.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openCenterItem(row);
      });
    });
    root.querySelectorAll("button[data-stage-center-service-stage]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const stageKey = button.dataset.stageCenterServiceStage;
        if (!stageKey) return;
        appStore.set({
          view: "stages",
          selectedStageV9: stageKey,
          selectedStage: stageKey,
          stageSelected: true,
          lastAction: `Abriu a etapa ${stageKey} pela Central operacional`,
        });
      });
    });
    root.querySelectorAll("[data-stage-center-service-record]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const recordId = button.dataset.stageCenterServiceRecord;
        if (!recordId) return;
        appStore.set({
          controlStageCenterItemModalKey: `service:${recordId}`,
          lastAction: `Abriu as propriedades do serviço ${recordId}`,
        });
      });
    });
  
    const dialog = root.querySelector("[data-stage-record-dialog]");
    if (dialog) {
      try {
        if (!dialog.open) dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) appStore.set({ controlStageRecordModalId: null });
      });
      dialog.querySelectorAll("[data-stage-record-close]").forEach((button) =>
        button.addEventListener("click", () =>
          appStore.set({ controlStageRecordModalId: null }),
        ),
      );
    }
    const itemDialog = root.querySelector("[data-stage-center-item-dialog]");
    if (itemDialog) {
      try {
        if (!itemDialog.open) itemDialog.showModal();
      } catch {
        itemDialog.setAttribute("open", "");
      }
      itemDialog.addEventListener("click", (event) => {
        if (event.target === itemDialog) appStore.set({ controlStageCenterItemModalKey: null });
      });
      itemDialog.querySelectorAll("[data-stage-center-item-close]").forEach((button) =>
        button.addEventListener("click", () =>
          appStore.set({ controlStageCenterItemModalKey: null }),
        ),
      );
    }
    return result;
  };
  return { stageRecordServiceRowsV1, stageMaterialReportDialogV1, stageMaterialReportBindV1, stageRecordCenterItemModalMarkupV1, stageHomeRecordResourcesMarkupV1, stageHomePageMarkupV1, stageRecordDashboardActionWorkspaceMarkupV1 };
};

