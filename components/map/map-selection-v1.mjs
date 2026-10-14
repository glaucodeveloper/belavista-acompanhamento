// The map-selection methods are moved intact from MapScene so their DOM,
// state and interaction behavior stays owned by the original implementation.
// Methods transferred intact from MapScene; service access is provided at this module boundary.
export const installMapSelectionV1 = (MapScene, { activityCatalog, appStore, demoData, document, esc, FormData, ico, notify, progressNatureOptions, stageOverlayColors, stageOverlayKey, window }) => {
  const MapSelectionMethodsV1 = class {
    clearLotSelection(announce = false) {
      for (const item of this.physicalMapParts().filter(
        (item) => item.userData?.partKind === "lots",
      )) {
        delete item.userData.selectionMaterial;
        this.restorePartMaterial(item);
      }
      this.selectedLotIds = new Set();
      delete this.dataset.selectedLots;
      delete this.dataset.selectedLotCount;
      delete this.dataset.selectedPart;
      delete this.dataset.selectedKind;
      if (this.selectionHalo) this.selectionHalo.visible = false;
      this.removeMapSelectionPanel();
      this.renderActiveSceneV5370();
      if (announce) notify("Seleção de lotes limpa.");
    }
    pointFromClient(clientX, clientY) {
      const canvas = this.querySelector(".three-overlay"),
        rect = canvas?.getBoundingClientRect();
      if (!canvas || !rect?.width || !rect?.height) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * canvas.clientWidth,
        y: ((clientY - rect.top) / rect.height) * canvas.clientHeight,
      };
    }
    beginMapAreaSelection(clientX, clientY) {
      this.removeMapAreaSelection();
      const sceneRect = this.getBoundingClientRect(),
        rect = document.createElement("div");
      rect.className = "map-selection-rectangle";
      rect.dataset.mapSelectionRectangle = "true";
      rect.style.left = `${clientX - sceneRect.left}px`;
      rect.style.top = `${clientY - sceneRect.top}px`;
      this.appendChild(rect);
      this._mapAreaSelectionStart = { x: clientX, y: clientY };
      this._mapAreaSelectionRect = rect;
      this.dataset.mapSelection = "dragging";
    }
    updateMapAreaSelection(clientX, clientY) {
      const start = this._mapAreaSelectionStart,
        rect = this._mapAreaSelectionRect,
        sceneRect = this.getBoundingClientRect();
      if (!start || !rect) return;
      const left = Math.min(start.x, clientX) - sceneRect.left,
        top = Math.min(start.y, clientY) - sceneRect.top;
      rect.style.left = `${left}px`;
      rect.style.top = `${top}px`;
      rect.style.width = `${Math.abs(clientX - start.x)}px`;
      rect.style.height = `${Math.abs(clientY - start.y)}px`;
    }
    removeMapAreaSelection() {
      this._mapAreaSelectionRect?.remove();
      this._mapAreaSelectionRect = null;
      this._mapAreaSelectionStart = null;
      delete this.dataset.mapSelection;
    }
    collectModelPartsInRect(startClient, endClient) {
      if (this.isAdminStandaloneInteractiveV5370()) {
        return this.adminStandaloneCollectModelPartsInRectV5370(
          startClient,
          endClient,
        );
      }
      const a = this.pointFromClient(startClient.x, startClient.y),
        b = this.pointFromClient(endClient.x, endClient.y),
        canvas = this.querySelector(".three-overlay"),
        w = canvas?.clientWidth || 0,
        h = canvas?.clientHeight || 0;
      if (!a || !b || !w || !h || !this.camera) return [];
      const left = Math.min(a.x, b.x),
        right = Math.max(a.x, b.x),
        top = Math.min(a.y, b.y),
        bottom = Math.max(a.y, b.y);
      this.camera.updateMatrixWorld(true);
      this.modelGroup?.updateMatrixWorld(true);
      const parts = [
        ...(this.modelParts?.lots || []),
        ...(this.modelParts?.streets || []),
        ...(this.modelParts?.other || []),
      ];
      return parts.filter((item) => {
        const box = new this.THREE.Box3().setFromObject(item),
          center = box.getCenter(new this.THREE.Vector3()).project(this.camera),
          x = ((center.x + 1) * w) / 2,
          y = ((-center.y + 1) * h) / 2;
        return x >= left && x <= right && y >= top && y <= bottom;
      });
    }
    finishMapAreaSelection(clientX, clientY) {
      const start = this._mapAreaSelectionStart;
      this.removeMapAreaSelection();
      if (!start) return;
      const parts = this.collectModelPartsInRect(start, {
          x: clientX,
          y: clientY,
        }),
        selectionMode = this.mapSelectionMode;
      this.setMapSelectionMode(false);
      if (selectionMode === "progress") {
        if (parts.length)
          return this.setProgressAreaSelectionV1(parts, {
            append: true,
            announce: true,
          });
        return this.clearCurrentMapSelectionV1(true);
      }
      if (this.isDashboardStatusContext()) return false;
      this.progressSelectionParts = parts;
      this.renderProgressSelectionPanel(parts);
    }
    setMapSelectionMode(mode = false) {
      const requested = mode === "progress" ? "progress" : null;
      const view = appStore.get().view;
      const next =
        requested && new Set(["assistant", "map", "records"]).has(view)
          ? requested
          : null;
      if (next && !this.isAdminStandaloneInteractiveV5370())
        this.ensureOperationalStreetGeometry();
      this.mapSelectionMode = next;
      this.dataset.mapSelectionMode = next || "off";
      this.querySelectorAll("[data-scene-selection]").forEach((button) =>
        button.classList.toggle("active", button.dataset.sceneSelection === next),
      );
      if (requested && !next) {
        notify(
          "A seleção de progresso fica disponível no mapa administrativo ou em Registros.",
          "warning",
        );
      } else if (next) {
        this.dataset.mapSelectionHint =
          "Arraste um retângulo sobre lotes, ruas ou estruturas para registrar progresso";
        notify(
          "Seleção de progresso ativa: arraste sobre uma área do loteamento.",
        );
      } else delete this.dataset.mapSelectionHint;
    }
    progressMapPartsV1() {
      return this.isAdminStandaloneInteractiveV5370()
        ? this.adminStandaloneModelPartsV5370()
        : this.physicalMapParts();
    }
    progressAreaRecordV1(item) {
      const source = this.modelPartSource(item) || item,
        userData = source?.userData || {};
      const partId = String(
        userData.partId || source?.name || item?.partId || "",
      );
      if (!partId) return null;
      return {
        partId,
        label: String(
          userData.partLabel ||
            source?.name ||
            item?.label ||
            "Área do empreendimento",
        ),
        kind: String(userData.partKind || item?.kind || "other"),
      };
    }
    progressAreaPartV1(record) {
      const id = String(record?.partId || "");
      if (!id) return null;
      return (
        this.progressMapPartsV1().find(
          (item) => String(item.userData?.partId || item.name || "") === id,
        ) || null
      );
    }
    progressAreaPartsFromStoreV1() {
      const selected = Array.isArray(appStore.get().mapProgressSelection)
        ? appStore.get().mapProgressSelection
        : [];
      return selected
        .map((item) => this.progressAreaPartV1(item))
        .filter(Boolean);
    }
    paintProgressAreaSelectionV1(records = []) {
      const selectedIds = new Set(records.map((item) => String(item.partId)));
      for (const item of this.progressMapPartsV1()) {
        const id = String(item.userData?.partId || item.name || "");
        if (item.userData?.progressSelectionMaterial) {
          delete item.userData.progressSelectionMaterial;
          this.restorePartMaterial(item);
        }
        if (selectedIds.has(id)) {
          if (!this.setStreetPaverInstanceColor(item, 0x78a9ff)) {
            item.userData.progressSelectionMaterial = this.materialForColor(
              item.userData.defaultMaterial || item.material,
              0x78a9ff,
              0.94,
            );
            item.material = item.userData.progressSelectionMaterial;
          }
        } else if (item._paverOwner) {
          this.setStreetPaverInstanceColor(
            item,
            item.userData?.paverDefaultColor || 0xffffff,
          );
        }
      }
      this.progressSelectionParts = records
        .map((item) => this.progressAreaPartV1(item))
        .filter(Boolean);
      this.dataset.progressSelectionCount = String(records.length);
    }
    setProgressAreaSelectionV1(
      parts = [],
      { append = true, announce = true } = {},
    ) {
      const current = Array.isArray(appStore.get().mapProgressSelection)
        ? appStore.get().mapProgressSelection
        : [];
      const next = new Map(
        append ? current.map((item) => [String(item.partId), item]) : [],
      );
      for (const item of Array.isArray(parts) ? parts : []) {
        const record = this.progressAreaRecordV1(item);
        if (record) next.set(record.partId, record);
      }
      const records = [...next.values()];
      this.paintProgressAreaSelectionV1(records);
      appStore.set({
        mapProgressSelection: records,
        lastAction: records.length
          ? `Selecionou ${records.length} área(s) para leitura de progresso`
          : "Limpou áreas de progresso",
      });
      document
        .querySelectorAll("map-filter-rail")
        .forEach((rail) => rail.render());
      this.renderActiveSceneV5370();
      if (announce)
        notify(
          records.length
            ? `${records.length} área(s) disponível(is) na lista de progresso.`
            : "Áreas de progresso limpas.",
          records.length ? "success" : "",
        );
      return records;
    }
    toggleProgressAreaSelectionV1(item) {
      const record = this.progressAreaRecordV1(item);
      if (!record) return false;
      const current = Array.isArray(appStore.get().mapProgressSelection)
        ? appStore.get().mapProgressSelection
        : [];
      const exists = current.some(
        (entry) => String(entry.partId) === record.partId,
      );
      const next = exists
        ? current.filter((entry) => String(entry.partId) !== record.partId)
        : [...current, record];
      this.setProgressAreaSelectionV1(next, { append: false, announce: true });
      return true;
    }
    clearProgressAreaSelectionV1(announce = false) {
      this.paintProgressAreaSelectionV1([]);
      this.progressSelectionParts = [];
      appStore.set({
        mapProgressSelection: [],
        lastAction: "Limpou a seleção de áreas de progresso",
      });
      document
        .querySelectorAll("map-filter-rail")
        .forEach((rail) => rail.render());
      this.renderActiveSceneV5370();
      if (announce) notify("Seleção de áreas de progresso limpa.");
    }
    renderMapStatusPanel(parts = []) {
      this.removeMapSelectionPanel();
      const selected = [
        ...new Map(
          parts
            .filter(Boolean)
            .map((item) => [item.userData?.partId || item.name, item]),
        ).values(),
      ];
      const labels = selected.map(
        (item) =>
          item.userData?.partLabel || item.name || "Área do empreendimento",
      );
      const kinds = [
        ...new Set(
          selected.map((item) => item.userData?.partKind || "estrutura"),
        ),
      ];
      const lots = selected.filter(
        (item) => item.userData?.partKind === "lots",
      ).length;
      const streets = selected.filter(
        (item) => item.userData?.partKind === "streets",
      ).length;
      selected.forEach((item) => {
        const color = item.userData?.partKind === "lots" ? 0x78a9ff : 0x42be65;
        if (!this.setStreetPaverInstanceColor(item, color)) {
          item.userData.statusMaterial = this.materialForColor(
            item.userData.defaultMaterial,
            color,
            0.9,
          );
          item.material = item.userData.statusMaterial;
        }
      });
      this.statusSelectionParts = selected;
      const panel = document.createElement("aside");
      panel.className = "map-selection-panel map-status-panel";
      panel.dataset.mapSelectionPanel = "status";
      panel.innerHTML = `<div class="map-selection-panel-head"><div><span class="activity-kind">CONSULTA DO MAPA</span><h2>${selected.length ? `${selected.length} parte${selected.length === 1 ? "" : "s"} selecionada${selected.length === 1 ? "" : "s"}` : "Nenhuma parte selecionada"}</h2></div><button type="button" data-map-status-clear aria-label="Fechar consulta">×</button></div><p class="map-selection-help">Consulta visual do empreendimento. Esta seleção não abre reserva nem cria registro.</p>${
        selected.length
          ? `<div class="map-selection-chips">${labels
              .slice(0, 8)
              .map(
                (label) =>
                  `<span class="map-selection-chip">${esc(label)}</span>`,
              )
              .join(
                "",
              )}${labels.length > 8 ? `<span class="map-selection-chip">+${labels.length - 8} partes</span>` : ""}</div><dl class="map-status-facts"><div><dt>Lotes</dt><dd>${lots}</dd></div><div><dt>Trechos</dt><dd>${streets}</dd></div><div><dt>Tipo</dt><dd>${esc(kinds.join(" · "))}</dd></div></dl>`
          : `<p class="map-selection-help">Arraste sobre lotes, trechos ou estruturas para consultar o status consolidado.</p>`
      }<div class="map-selection-panel-actions"><button type="button" class="ghost" data-map-status-clear>Limpar consulta</button></div>`;
      this.appendChild(panel);
      panel.querySelectorAll("[data-map-status-clear]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.clearMapStatusSelection();
        }),
      );
      this.dataset.mapStatusCount = String(selected.length);
      appStore.set({
        lastAction: selected.length
          ? `Consultou status de ${selected.length} parte(s) do mapa`
          : "Limpou consulta do mapa",
      });
      this.renderActiveSceneV5370();
      window.lucide?.createIcons();
      return true;
    }
    clearMapStatusSelection() {
      (this.statusSelectionParts || []).forEach((item) => {
        if (
          !this.setStreetPaverInstanceColor(
            item,
            item.userData?.paverDefaultColor || 0xffffff,
          )
        ) {
          delete item.userData.statusMaterial;
          this.restorePartMaterial(item);
        }
      });
      this.statusSelectionParts = [];
      delete this.dataset.mapStatusCount;
      this.removeMapSelectionPanel();
      this.renderActiveSceneV5370();
    }
    clearCurrentMapSelectionV1(announce = false) {
      const state = appStore.get(),
        hasProgress = Boolean(
          (Array.isArray(state.mapProgressSelection) &&
            state.mapProgressSelection.length) ||
          this.progressSelectionParts?.length,
        ),
        hasFilters = Boolean(
          state.mapFilter ||
          state.mapFilterWidget ||
          (Array.isArray(state.mapFilters) && state.mapFilters.length),
        );
      const hasLots = Boolean(this.selectedLotIds?.size),
        hasStatus = Boolean(this.statusSelectionParts?.length),
        hadSelection =
          hasProgress ||
          hasLots ||
          hasStatus ||
          Boolean(this.recordPaintMode || this.mapSelectionMode);
      if (hasProgress) this.clearProgressAreaSelectionV1(false);
      if (hasLots) this.clearLotSelection(false);
      if (hasStatus) this.clearMapStatusSelection();
      this.progressSelectionParts = [];
      this.removeMapAreaSelection();
      this.removeMapSelectionPanel();
      if (this.recordPaintMode) this.setRecordPaintMode(false);
      if (this.mapSelectionMode) this.setMapSelectionMode(false);
      if (hasFilters)
        appStore.set({
          mapFilters: [],
          mapFilter: null,
          mapFilterWidget: null,
          lastAction: "Limpou seleção e filtros do mapa",
        });
      if (hadSelection || hasFilters)
        document
          .querySelectorAll("map-filter-rail")
          .forEach((rail) => rail.render());
      if (announce && (hadSelection || hasFilters))
        notify(
          hasFilters
            ? "Seleção e filtros do mapa removidos."
            : "Seleção atual removida.",
        );
      return hadSelection || hasFilters;
    }
    renderProgressSelectionPanel(parts = []) {
      this.removeMapSelectionPanel();
      const labels = parts
          .map((item) => item.userData.partLabel || item.name)
          .filter(Boolean),
        panel = document.createElement("aside");
      panel.className = "map-selection-panel map-progress-panel";
      panel.dataset.mapSelectionPanel = "progress";
      const stages = demoData.activities
          .map((item) => `<option>${esc(item.name)}</option>`)
          .join(""),
        responsibles = demoData.collaborators
          .map(([name]) => `<option>${esc(name)}</option>`)
          .join("");
      panel.innerHTML = `<div class="map-selection-panel-head"><div><span class="activity-kind">REGISTRO DE PROGRESSO · ÁREA</span><h2>${labels.length ? `${labels.length} área(s) selecionada(s)` : "Área do empreendimento"}</h2></div><button type="button" data-map-selection-close aria-label="Fechar">×</button></div><p class="map-selection-help">A seleção pode conter qualquer natureza de obra. Defina a atividade e registre o avanço físico, responsável e evidências.</p>${
        labels.length
          ? `<div class="map-selection-chips">${labels
              .slice(0, 8)
              .map(
                (label) =>
                  `<span class="map-selection-chip">${esc(label)}</span>`,
              )
              .join(
                "",
              )}${labels.length > 8 ? `<span class="map-selection-chip">+${labels.length - 8} áreas</span>` : ""}</div>`
          : ""
      }<form data-map-progress-form><label>Natureza<select name="natureza">${progressNatureOptions.map((value) => `<option>${esc(value)}</option>`).join("")}</select></label><label>Atividade<select name="atividade">${stages}</select></label><div class="map-selection-form-grid"><label>Avanço (%)<input name="percentual" type="number" min="0" max="100" value="25"></label><label>Data<input name="data" type="date" value="${new Date().toISOString().slice(0, 10)}"></label></div><label>Responsável<select name="responsavel">${responsibles}</select></label><label>Detalhes da execução<textarea name="detalhes" rows="3" placeholder="Medição, frente executada, ocorrência ou próximo passo"></textarea></label><label>Comprovante / foto<input name="evidencia" placeholder="URL local, nome do arquivo ou observação"></label><div class="map-selection-panel-actions"><button type="button" class="ghost" data-map-selection-close>Cancelar</button><button type="submit" class="primary">${ico("save")} Registrar progresso</button></div></form>`;
      this.appendChild(panel);
      panel.querySelectorAll("[data-map-selection-close]").forEach((button) =>
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          this.removeMapSelectionPanel();
          this.progressSelectionParts = [];
        }),
      );
      panel
        .querySelector("[data-map-progress-form]")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget),
            natureza = String(data.get("natureza") || "Execução operacional"),
            atividade = String(data.get("atividade") || "Atividade"),
            mapAreas = parts.map((item) => ({
              label: item.userData.partLabel || item.name,
              kind: item.userData.partKind || "other",
              partId: item.userData.partId || item.name,
            })),
            record = {
              id: `REG-${Date.now()}`,
              obra: "Aliança Park",
              atividade,
              etapa:
                demoData.activities.find(
                  (item) => item.id === appStore.get().selectedStage,
                )?.name || "Etapa não vinculada",
              categoria: natureza,
              responsavel: String(data.get("responsavel") || "A definir"),
              data: String(
                data.get("data") || new Date().toISOString().slice(0, 10),
              ),
              hora: new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              detalhes: String(data.get("detalhes") || ""),
              evidenceUri: String(data.get("evidencia") || ""),
              status: "Pendente",
              progresso: Number(data.get("percentual") || 0),
              mapArea: JSON.stringify(mapAreas),
              createdAt: new Date().toISOString(),
            };
          appStore.update((state) => ({
            ...state,
            records: [record, ...(state.records || [])],
            lastAction: `Registrou ${natureza} em ${mapAreas.length || "área geral"} área(s)`,
          }));
          this.paintProgressParts(parts, natureza);
          notify(`Progresso de ${natureza} registrado no mapa.`, "success");
          panel.innerHTML = `<div class="map-selection-success"><span>✓</span><h2>Progresso registrado</h2><p>${esc(natureza)} · ${esc(atividade)}</p><small>${mapAreas.length || "Área geral"} área(s) vinculada(s) ao novo registro.</small><button type="button" class="primary" data-map-selection-close>Continuar no mapa</button></div>`;
          panel
            .querySelector("[data-map-selection-close]")
            ?.addEventListener("click", () => this.removeMapSelectionPanel());
          window.lucide?.createIcons();
        });
      window.lucide?.createIcons();
    }
    paintProgressParts(parts, natureza) {
      const color = stageOverlayColors[stageOverlayKey(natureza)] || 0x42be65;
      parts.forEach((item) => {
        if (!this.setStreetPaverInstanceColor(item, color)) {
          item.userData.progressMaterial = this.materialForColor(
            item.userData.defaultMaterial || item.material,
            color,
            0.88,
          );
          item.material = item.userData.progressMaterial;
        }
      });
      this.dataset.progressAreaCount = String(parts.length);
      this.dataset.progressNature = natureza;
      this.renderActiveSceneV5370();
    }
    setRecordPaintMode(enabled = false, callback = null) {
      this.recordPaintMode = Boolean(enabled);
      this._recordPaintCallback = callback || null;
      this.dataset.recordPaintMode = this.recordPaintMode ? "true" : "false";
      if (this.recordPaintMode && !this.isAdminStandaloneInteractiveV5370())
        this.ensureOperationalStreetGeometry();
      if (this.recordPaintMode && this.mapSelectionMode)
        this.setMapSelectionMode(false);
      const canvas = this.querySelector(".three-overlay");
      canvas?.classList.toggle("record-paint-active", this.recordPaintMode);
      if (this.recordPaintMode) {
        this.dataset.recordPaintHint =
          "Clique em um lote, rua ou área do modelo para registrar o progresso";
        notify(
          "Modo pintar no mapa ativo: clique em uma área do empreendimento.",
        );
      } else delete this.dataset.recordPaintHint;
    }
    selectRecordMapPart(node) {
      let source = node;
      while (source && !source.userData?.partKind) source = source.parent;
      if (!source) return false;
      const kind = source.userData.partKind,
        label =
          source.userData.partLabel ||
          source.name ||
          (kind === "streets"
            ? "Paralelepípedo · trecho"
            : "Área do empreendimento"),
        overlayKey =
          kind === "lots"
            ? "terraplanagem"
            : kind === "streets"
              ? "pavimentacao"
              : "urbanizacao",
        natureByOverlay = {
          terraplanagem: "Terraplanagem",
          pavimentacao: "Pavimentação",
          urbanizacao: "Urbanização",
        },
        nature = natureByOverlay[overlayKey] || "Execução operacional",
        catalog =
          activityCatalog.find((item) => item.nature === nature) ||
          activityCatalog.find((item) =>
            item.name.toLowerCase().includes(nature.toLowerCase().split(" ")[0]),
          ) ||
          activityCatalog[0],
        stage =
          demoData.activities.find(
            (item) => item.id === appStore.get().selectedStage,
          )?.name || "Etapa não vinculada";
      const area = {
        label,
        kind,
        partId: source.userData.partId || source.name || kind,
        overlayKey,
        nature: catalog?.nature || nature,
        activity: catalog?.name || "Registrar atividade da área",
        initial: catalog?.initial || [],
        execution: catalog?.execution || [],
        stage,
        selectedAt: new Date().toISOString(),
      };
      this.clearStageOverlay(false);
      this.selectModelPart(source, false);
      this.lastRecordMapArea = area;
      this.dataset.recordPaintArea = JSON.stringify(area);
      this._recordPaintCallback?.(area);
      this.setRecordPaintMode(false);
      notify(`${label} pintado e vinculado ao registro.`, "success");
      return true;
    }
    selectRecordMapParts(parts = []) {
      const unique = [
        ...new Map(
          parts
            .filter(Boolean)
            .map((item) => [item.userData?.partId || item.name, item]),
        ).values(),
      ];
      if (!unique.length) {
        this.removeMapAreaSelection();
        return false;
      }
      const first = unique[0],
        kind = first.userData?.partKind || "other";
      const labels = unique.map(
        (item) =>
          item.userData?.partLabel || item.name || "Área do empreendimento",
      );
      const overlayKey =
        kind === "lots"
          ? "terraplanagem"
          : kind === "streets"
            ? "pavimentacao"
            : "urbanizacao";
      const natureByOverlay = {
        terraplanagem: "Terraplanagem",
        pavimentacao: "Pavimentação",
        urbanizacao: "Urbanização",
      };
      const nature = natureByOverlay[overlayKey] || "Execução operacional";
      const catalog =
        activityCatalog.find((item) => item.nature === nature) ||
        activityCatalog[0];
      const area = {
        label: `${unique.length} áreas selecionadas`,
        labels,
        kind,
        partIds: unique.map((item) => item.userData?.partId || item.name),
        overlayKey,
        nature: catalog?.nature || nature,
        activity: catalog?.name || "Registrar atividade da área",
        initial: catalog?.initial || [],
        execution: catalog?.execution || [],
        stage:
          demoData.activities.find(
            (item) => item.id === appStore.get().selectedStage,
          )?.name || "Etapa não vinculada",
        selectedAt: new Date().toISOString(),
      };
      this.clearStageOverlay(false);
      unique.forEach((item) => this.selectModelPart(item, false));
      this.lastRecordMapArea = area;
      this.dataset.recordPaintArea = JSON.stringify(area);
      this._recordPaintCallback?.(area);
      this.setRecordPaintMode(false);
      this.removeMapAreaSelection();
      notify(
        `${unique.length} áreas pintadas e vinculadas ao registro.`,
        "success",
      );
      return true;
    }
  };
  const methods = Object.getOwnPropertyDescriptors(MapSelectionMethodsV1.prototype);
  delete methods.constructor;
  Object.defineProperties(MapScene.prototype, methods);
};
