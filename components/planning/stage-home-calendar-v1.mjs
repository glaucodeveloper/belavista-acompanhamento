export function installStageHomeCalendarV1(ViewLayer, {
  appStore,
  activityCatalog,
  agendaCalendarInitialWeekV8,
  agendaCalendarIsoV3,
  agendaCalendarOperationalEventsV3,
  agendaCalendarParseDateV3,
  agendaCalendarReadV3,
  agendaCalendarWeekDaysV8,
  agendaCalendarWeekKeyV8,
  agendaCalendarWeekLabelV8,
  demoData,
  executionModel,
  ico,
  operationalRaid,
  stageV9LiveFor,
  getStageHomePageMarkupV1,
}) {
  const stageHomeSnapshotV1 = (calendarWeekOverrideV2 = "") => {
    const state = appStore.get(),
      operational = state.operationalState || {},
      stages = (executionModel.stages || []).map((stage, index) => {
        const live =
          (operational.stages || []).find((item) => item.key === stage.key) ||
          stageV9LiveFor(stage) ||
          {};
        return {
          key: stage.key,
          name: stage.name,
          owner: live.owner || stage.owner || "Responsável a definir",
          progress: Number(live.progress) || 0,
          period: live.week || `Fase ${String(index + 1).padStart(2, "0")}`,
          dependsOn: Array.isArray(stage.dependsOn) ? stage.dependsOn : [],
        };
      });
    const activities = (activityCatalog || []).map((activity, index) => ({
      ...activity,
      stage:
        stages[index % Math.max(stages.length, 1)]?.name || "Etapa operacional",
      stageName:
        stages[index % Math.max(stages.length, 1)]?.name || "Etapa operacional",
    }));
    const raid = operationalRaid().map((item) => ({
      ...item,
      activityName:
        activities.find((activity) =>
          String(activity.stage)
            .toLocaleLowerCase("pt-BR")
            .includes(
              String(item.linked || "")
                .toLocaleLowerCase("pt-BR")
                .split(" ")[0],
            ),
        )?.name || "Leitura da atividade relacionada",
    }));
    const storedAgenda = agendaCalendarReadV3(),
      agendaEvents = storedAgenda.initialized
        ? storedAgenda.events || []
        : agendaCalendarOperationalEventsV3(state),
      weekKey = calendarWeekOverrideV2 ||
        state.stageHomeCalendarWeekV1 ||
        agendaCalendarInitialWeekV8(state, { events: agendaEvents }),
      today = agendaCalendarIsoV3(new Date()),
      days = agendaCalendarWeekDaysV8(weekKey).map((date) => ({
        iso: agendaCalendarIsoV3(date),
        date: String(date.getDate()).padStart(2, "0"),
        weekday: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        today: agendaCalendarIsoV3(date) === today,
      })),
      visibleDates = new Set(days.map((day) => day.iso));
    return {
      stages,
      activities,
      raid,
      records: Array.isArray(state.records) ? state.records : [],
      calendar: days,
      calendarLabel: agendaCalendarWeekLabelV8(weekKey),
      calendarEvents: agendaEvents.filter((event) => visibleDates.has(String(event.date || ""))),
      icons: {
        shield: ico("shield-alert"),
        sparkles: ico("sparkles"),
        plus: ico("plus"),
      },
    };
  };
  
  // STAGE_HOME_CALENDAR_STATIC_STAGE_COLUMN_V3
  // A primeira coluna (ETAPAS + botões das etapas) permanece no grid original.
  // Somente a segunda coluna (cabeçalho dos dias + tracks das linhas) recebe
  // três semanas horizontais e anima translateX.
  const ensureStageHomeCalendarStaticColumnStyleV3 = () => {
    if (document.getElementById("stage-home-calendar-static-column-style-v3")) return;
    const style = document.createElement("style");
    style.id = "stage-home-calendar-static-column-style-v3";
    style.textContent = `
      .stage-home-canvas-axis,
      .stage-home-canvas-row {
        grid-template-columns: var(--stage-home-static-stage-width-v3, 210px) minmax(0, 1fr) !important;
      }
      /* A altura pertence à linha da etapa, não às células das 3 semanas.
         Assim conteúdo em previous/current/next não altera o espaçamento vertical. */
      .stage-home-canvas-row {
        height: var(--stage-home-calendar-row-height-v3, 58px) !important;
        min-height: var(--stage-home-calendar-row-height-v3, 58px) !important;
        max-height: var(--stage-home-calendar-row-height-v3, 58px) !important;
        align-items: stretch !important;
      }
      .stage-home-canvas-row > .stage-home-canvas-stage,
      .stage-home-canvas-row > .stage-home-calendar-cell-viewport-v3,
      .stage-home-canvas-row .stage-home-calendar-cell-strip-v3,
      .stage-home-canvas-row .stage-home-calendar-cell-page-v3,
      .stage-home-canvas-row .stage-home-calendar-cell-page-v3 > .stage-home-canvas-track {
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        box-sizing: border-box;
      }
      .stage-home-canvas-row .stage-home-calendar-cell-page-v3 {
        overflow: hidden;
      }
      .stage-home-canvas-axis > span:first-child {
        grid-column: 1 !important;
        min-width: 0;
      }
      .stage-home-canvas-axis > .stage-home-calendar-cell-viewport-v3,
      .stage-home-canvas-row > .stage-home-calendar-cell-viewport-v3 {
        grid-column: 2 / -1 !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        display: block !important;
      }
      .stage-home-canvas-row > .stage-home-canvas-stage {
        grid-column: 1 !important;
        min-width: 0 !important;
      }
      .stage-home-calendar-cell-viewport-v3 {
        width: 100%;
        min-width: 0;
        overflow: hidden !important;
        position: relative;
        contain: layout paint;
      }
      .stage-home-calendar-cell-strip-v3 {
        display: flex !important;
        width: 300% !important;
        min-width: 300% !important;
        max-width: none !important;
        transform: translate3d(-33.3333333333%, 0, 0);
        will-change: transform;
      }
      .stage-home-calendar-cell-strip-v3.is-animating {
        transition: transform 320ms cubic-bezier(.22,.61,.36,1);
      }
      .stage-home-calendar-cell-page-v3 {
        flex: 0 0 33.3333333333% !important;
        width: 33.3333333333% !important;
        min-width: 0;
        max-width: 33.3333333333% !important;
      }
      .stage-home-calendar-days-v3,
      .stage-home-calendar-cell-page-v3 > .stage-home-canvas-track {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
      }
      @media (prefers-reduced-motion: reduce) {
        .stage-home-calendar-cell-strip-v3.is-animating {
          transition-duration: 1ms;
        }
      }
    `;
    document.head.appendChild(style);
  };
  
  const syncStageHomeCalendarStaticColumnWidthV3 = (host) => {
    const axis = host?.querySelector?.(".stage-home-canvas-axis"),
      firstStage = host?.querySelector?.(".stage-home-canvas-row .stage-home-canvas-stage");
    if (!axis || !firstStage) return;
    const width = firstStage.getBoundingClientRect().width;
    if (Number.isFinite(width) && width > 0)
      host.style.setProperty("--stage-home-static-stage-width-v3", `${width}px`);
  };
  
  const stageHomeCalendarShiftWeekV3 = (weekKey, shift) => {
    const date = agendaCalendarParseDateV3(weekKey);
    if (!date) return "";
    date.setDate(date.getDate() + Number(shift || 0) * 7);
    return agendaCalendarWeekKeyV8(date);
  };
  
  const stageHomeCalendarWeekPartsV3 = (weekKey) => {
    const template = document.createElement("template");
    template.innerHTML = getStageHomePageMarkupV1()(weekKey);
    const page = template.content.querySelector("[data-stage-home-page]") || template.content,
      axis = page.querySelector(".stage-home-canvas-axis"),
      rows = [...page.querySelectorAll(".stage-home-canvas-row")],
      days = axis?.querySelector(":scope > div")?.cloneNode(true) || null,
      tracks = rows.map((row) => row.querySelector(".stage-home-canvas-track")?.cloneNode(true) || null);
    if (days) days.classList.add("stage-home-calendar-days-v3");
    return { days, tracks };
  };
  
  const stageHomeCalendarWrapCellV3 = ({ current, previous, next, kind, index = -1 }) => {
    if (!current?.parentNode || !previous || !next) return null;
  
    const viewport = document.createElement("div"),
      strip = document.createElement("div");
    viewport.className = "stage-home-calendar-cell-viewport-v3";
    viewport.dataset.stageHomeCalendarCell = kind;
    if (index >= 0) viewport.dataset.stageHomeCalendarRow = String(index);
    strip.className = "stage-home-calendar-cell-strip-v3";
  
    const makePage = (node, relation) => {
      const page = document.createElement("div");
      page.className = "stage-home-calendar-cell-page-v3";
      page.dataset.stageHomeCalendarPage = relation;
      page.appendChild(node);
      return page;
    };
  
    const parent = current.parentNode;
    parent.insertBefore(viewport, current);
    viewport.appendChild(strip);
    strip.append(
      makePage(previous, "previous"),
      makePage(current, "current"),
      makePage(next, "next"),
    );
    return strip;
  };
  
  const mountStageHomeCalendarStaticColumnSliderV3 = (host) => {
    if (!host || host.dataset.stageHomeCalendarStaticColumnV3 === "true") return;
    const weekNode = host.querySelector("[data-stage-home-calendar-week]"),
      currentWeek = weekNode?.dataset.stageHomeCalendarWeek,
      axis = host.querySelector(".stage-home-canvas-axis"),
      currentDays = axis?.querySelector(":scope > div"),
      rows = [...host.querySelectorAll(".stage-home-canvas-row")],
      currentTracks = rows.map((row) => row.querySelector(":scope > .stage-home-canvas-track"));
  
    if (!currentWeek || !axis || !currentDays || !rows.length || currentTracks.some((track) => !track))
      return;
  
    const previousWeek = stageHomeCalendarShiftWeekV3(currentWeek, -1),
      nextWeek = stageHomeCalendarShiftWeekV3(currentWeek, 1),
      previous = stageHomeCalendarWeekPartsV3(previousWeek),
      next = stageHomeCalendarWeekPartsV3(nextWeek);
  
    if (
      !previous.days ||
      !next.days ||
      previous.tracks.length !== currentTracks.length ||
      next.tracks.length !== currentTracks.length ||
      previous.tracks.some((track) => !track) ||
      next.tracks.some((track) => !track)
    ) return;
  
    ensureStageHomeCalendarStaticColumnStyleV3();
    syncStageHomeCalendarStaticColumnWidthV3(host);
    currentDays.classList.add("stage-home-calendar-days-v3");
  
    const strips = [];
    const headerStrip = stageHomeCalendarWrapCellV3({
      current: currentDays,
      previous: previous.days,
      next: next.days,
      kind: "days",
    });
    if (headerStrip) strips.push(headerStrip);
  
    currentTracks.forEach((track, index) => {
      const rowStrip = stageHomeCalendarWrapCellV3({
        current: track,
        previous: previous.tracks[index],
        next: next.tracks[index],
        kind: "row",
        index,
      });
      if (rowStrip) strips.push(rowStrip);
    });
  
    if (!strips.length) return;
    strips.forEach((strip) => {
      strip.dataset.stageHomeCalendarSlideWeek = currentWeek;
    });
    host.dataset.stageHomeCalendarStaticColumnV3 = "true";
  };
  
  const slideStageHomeCalendarStaticColumnV3 = (host, rawShift) => {
    const strips = [...(host?.querySelectorAll(".stage-home-calendar-cell-strip-v3") || [])],
      shift = Math.sign(Number(rawShift) || 0);
    if (!strips.length || !shift || host.dataset.stageHomeCalendarSlidingV3 === "true") return;
  
    const currentWeek = strips[0].dataset.stageHomeCalendarSlideWeek,
      nextWeek = stageHomeCalendarShiftWeekV3(currentWeek, shift);
    if (!nextWeek) return;
  
    host.dataset.stageHomeCalendarSlidingV3 = "true";
    strips.forEach((strip) => strip.classList.add("is-animating"));
  
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = shift > 0 ? -66.6666666667 : 0;
      strips.forEach((strip) => {
        strip.style.transform = `translate3d(${target}%, 0, 0)`;
      });
    }));
  
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      delete host.dataset.stageHomeCalendarSlidingV3;
      appStore.set({ stageHomeCalendarWeekV1: nextWeek });
    };
  
    const sentinel = strips[0];
    const onTransitionEnd = (event) => {
      if (event.target !== sentinel || event.propertyName !== "transform") return;
      sentinel.removeEventListener("transitionend", onTransitionEnd);
      commit();
    };
    sentinel.addEventListener("transitionend", onTransitionEnd);
    setTimeout(commit, 420);
  };
  
  // STAGE_HOME_CALENDAR_VIEWPORT_FOCUS_V4
  // A linha cresce pela semana visível e o calendário vira uma superfície de foco
  // quando seu scrollpoint alcança o limite inferior do mapa persistente.
  const ensureStageHomeCalendarViewportStyleV4 = () => {
    if (document.getElementById("stage-home-calendar-viewport-style-v4")) return;
    const style = document.createElement("style");
    style.id = "stage-home-calendar-viewport-style-v4";
    style.textContent = `
      /* V4 substitui a altura fixa da V3: a semana visível define a altura da linha. */
      .stage-home-canvas-row {
        height: auto !important;
        min-height: 58px !important;
        max-height: none !important;
        align-items: stretch !important;
      }
      .stage-home-canvas-row > .stage-home-canvas-stage {
        height: auto !important;
        min-height: 58px !important;
        max-height: none !important;
        align-self: stretch !important;
      }
      .stage-home-canvas-row > .stage-home-calendar-cell-viewport-v3 {
        min-height: 58px !important;
        max-height: none !important;
        transition: height 200ms cubic-bezier(.22,.61,.36,1);
      }
      .stage-home-canvas-row .stage-home-calendar-cell-strip-v3,
      .stage-home-canvas-row .stage-home-calendar-cell-page-v3,
      .stage-home-canvas-row .stage-home-calendar-cell-page-v3 > .stage-home-canvas-track {
        height: auto !important;
        min-height: 58px !important;
        max-height: none !important;
      }
      .stage-home-canvas-row .stage-home-calendar-cell-page-v3 {
        overflow: visible !important;
        align-self: flex-start;
      }
  
      /* Superfície expandida no scrollpoint. */
      .stage-home-calendar-focus-placeholder-v4 {
        display: none;
        width: 100%;
        min-width: 0;
        pointer-events: none;
        visibility: hidden;
      }
      .stage-home-calendar-focus-v4 {
        position: fixed !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        z-index: 80 !important;
        display: flex !important;
        flex-direction: column !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        transition:
          left 200ms cubic-bezier(.22,.61,.36,1),
          top 200ms cubic-bezier(.22,.61,.36,1),
          width 200ms cubic-bezier(.22,.61,.36,1),
          height 200ms cubic-bezier(.22,.61,.36,1),
          box-shadow 200ms ease;
        box-shadow: 0 18px 48px rgba(0,0,0,.28);
      }
      .stage-home-calendar-focus-v4 > header {
        flex: 0 0 auto;
      }
      .stage-home-calendar-focus-v4 .stage-home-canvas-scroll {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }
      .stage-home-calendar-focus-v4 .stage-home-canvas-grid {
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        height: 100% !important;
        min-height: 0 !important;
        max-height: 100% !important;
        overflow: auto !important;
        align-content: start !important;
        scrollbar-gutter: stable both-edges;
      }
      .stage-home-calendar-focus-v4 .stage-home-canvas-axis,
      .stage-home-calendar-focus-v4 .stage-home-canvas-row {
        width: 100% !important;
        min-width: calc(var(--stage-home-static-stage-width-v3, 210px) + 1120px) !important;
        grid-template-columns: var(--stage-home-static-stage-width-v3, 210px) minmax(1120px, 1fr) !important;
      }
      .stage-home-calendar-focus-v4 .stage-home-calendar-days-v3,
      .stage-home-calendar-focus-v4 .stage-home-calendar-cell-page-v3 > .stage-home-canvas-track {
        grid-template-columns: repeat(7, minmax(160px, 1fr)) !important;
        align-items: stretch;
      }
      .stage-home-calendar-focus-v4 .stage-home-canvas-axis {
        position: sticky;
        top: 0;
        z-index: 8;
      }
      .stage-home-calendar-focus-v4 .stage-home-canvas-axis > span:first-child,
      .stage-home-calendar-focus-v4 .stage-home-canvas-row > .stage-home-canvas-stage {
        position: sticky;
        left: 0;
        z-index: 7;
      }
      .stage-home-calendar-focus-v4 .stage-home-canvas-axis > span:first-child {
        z-index: 10;
      }
      @media (prefers-reduced-motion: reduce) {
        .stage-home-calendar-focus-v4,
        .stage-home-canvas-row > .stage-home-calendar-cell-viewport-v3 {
          transition-duration: 1ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  };
  
  const stageHomeCalendarSyncVisibleRowHeightsV4 = (
    host,
    relation = "current",
  ) => {
    host
      ?.querySelectorAll?.('[data-stage-home-calendar-cell="row"]')
      .forEach((viewport) => {
        const page = viewport.querySelector(
            `[data-stage-home-calendar-page="${relation}"]`,
          ),
          track = page?.querySelector(".stage-home-canvas-track");
        if (!page || !track) return;
        const height = Math.max(
          58,
          Math.ceil(track.scrollHeight || page.scrollHeight || 58),
        );
        viewport.style.setProperty("height", `${height}px`, "important");
      });
  };
  
  const stageHomeCalendarPrepareRowHeightsV4 = (host, rawShift) => {
    const shift = Math.sign(Number(rawShift) || 0);
    if (!shift) return;
    stageHomeCalendarSyncVisibleRowHeightsV4(
      host,
      shift > 0 ? "next" : "previous",
    );
  };
  
  const stageHomeCalendarFocusBoundsV4 = (section) => {
    const viewportWidth = globalThis.innerWidth || document.documentElement.clientWidth,
      viewportHeight = globalThis.innerHeight || document.documentElement.clientHeight,
      sidebar = document.querySelector(".sidebar"),
      mapAccordion = document.querySelector(
        "[data-stage-map-accordion],.stage-map-accordion,[data-map-accordion]",
      ),
      content = section?.closest?.("view-layer,.app-main,main") || null,
      sidebarRect = sidebar?.getBoundingClientRect?.(),
      mapRect = mapAccordion?.getBoundingClientRect?.(),
      contentRect = content?.getBoundingClientRect?.();
  
    const sidebarRight =
        sidebarRect && sidebarRect.width > 0 && sidebarRect.right > 0
          ? sidebarRect.right
          : 0,
      mapVisible =
        mapRect &&
        mapRect.width > 0 &&
        mapRect.height > 0 &&
        mapRect.bottom > 0 &&
        mapRect.top < viewportHeight,
      contentVisible = contentRect && contentRect.width > 0,
      left = Math.max(
        0,
        sidebarRight,
        mapVisible ? mapRect.left : contentVisible ? contentRect.left : 0,
      ),
      rightCandidate = mapVisible
        ? mapRect.right
        : contentVisible
          ? contentRect.right
          : viewportWidth,
      right = Math.min(viewportWidth, Math.max(left, rightCandidate)),
      top = Math.max(0, mapVisible ? mapRect.bottom : 0),
      width = Math.max(0, right - left),
      height = Math.max(0, viewportHeight - top);
  
    if (width < 480 || height < 240) return null;
    return { left, top, width, height };
  };
  
  const mountStageHomeCalendarViewportV4 = (host) => {
    const section = host?.querySelector?.(
        '[data-stage-home-section="calendar"],.stage-home-calendar-canvas',
      ),
      scroller = section?.querySelector?.(".stage-home-canvas-scroll");
    if (!section || !scroller) return;
  
    const restoreFocus = globalThis.__stageHomeCalendarViewportFocusWantedV4 === true;
    globalThis.__stageHomeCalendarViewportCleanupV4?.();
    ensureStageHomeCalendarViewportStyleV4();
    stageHomeCalendarSyncVisibleRowHeightsV4(host);
  
    const placeholder = document.createElement("div");
    placeholder.className = "stage-home-calendar-focus-placeholder-v4";
    section.before(placeholder);
    section.dataset.stageHomeCalendarViewportV4 = "true";
  
    let active = false,
      exiting = false,
      raf = 0,
      exitTimer = 0;
  
    const clearFixedGeometry = () => {
      for (const property of ["left", "top", "width", "height"])
        section.style.removeProperty(property);
    };
  
    const applyBounds = (bounds) => {
      if (!bounds) return;
      section.style.setProperty("left", `${Math.round(bounds.left)}px`, "important");
      section.style.setProperty("top", `${Math.round(bounds.top)}px`, "important");
      section.style.setProperty("width", `${Math.round(bounds.width)}px`, "important");
      section.style.setProperty("height", `${Math.round(bounds.height)}px`, "important");
    };
  
    const finishExit = () => {
      clearTimeout(exitTimer);
      section.classList.remove("stage-home-calendar-focus-v4");
      clearFixedGeometry();
      placeholder.style.display = "none";
      placeholder.style.height = "0px";
      active = false;
      exiting = false;
      globalThis.__stageHomeCalendarViewportFocusWantedV4 = false;
      stageHomeCalendarSyncVisibleRowHeightsV4(host);
    };
  
    const enter = () => {
      if (active || exiting || !section.isConnected) return;
      const bounds = stageHomeCalendarFocusBoundsV4(section);
      if (!bounds) return;
      const rect = section.getBoundingClientRect();
      placeholder.style.display = "block";
      placeholder.style.height = `${Math.max(rect.height, 1)}px`;
      section.classList.add("stage-home-calendar-focus-v4");
      section.style.setProperty("left", `${rect.left}px`, "important");
      section.style.setProperty("top", `${rect.top}px`, "important");
      section.style.setProperty("width", `${rect.width}px`, "important");
      section.style.setProperty("height", `${rect.height}px`, "important");
      active = true;
      globalThis.__stageHomeCalendarViewportFocusWantedV4 = true;
      section.getBoundingClientRect();
      requestAnimationFrame(() => applyBounds(stageHomeCalendarFocusBoundsV4(section)));
    };
  
    const exit = () => {
      if (!active || exiting) return;
      exiting = true;
      globalThis.__stageHomeCalendarViewportFocusWantedV4 = false;
      const target = placeholder.getBoundingClientRect(),
        targetVisible = target.width > 0 && target.height > 0 && target.bottom > 0;
      if (!targetVisible) {
        finishExit();
        return;
      }
      section.style.setProperty("left", `${target.left}px`, "important");
      section.style.setProperty("top", `${target.top}px`, "important");
      section.style.setProperty("width", `${target.width}px`, "important");
      section.style.setProperty("height", `${target.height}px`, "important");
      exitTimer = setTimeout(finishExit, 215);
    };
  
    const evaluate = () => {
      raf = 0;
      if (!section.isConnected) {
        cleanup();
        return;
      }
      const bounds = stageHomeCalendarFocusBoundsV4(section);
      if (!bounds) {
        if (active) exit();
        return;
      }
      if (active && !exiting) {
        applyBounds(bounds);
        const marker = placeholder.getBoundingClientRect(),
          line = bounds.top + 2,
          withinScrollpoint = marker.top <= line && marker.bottom > line + 64;
        if (!withinScrollpoint) exit();
        return;
      }
      if (exiting) return;
      const rect = section.getBoundingClientRect(),
        line = bounds.top + 2;
      if (rect.top <= line && rect.bottom > line + 80) enter();
    };
  
    const scheduleEvaluate = () => {
      if (raf) return;
      raf = requestAnimationFrame(evaluate);
    };
  
    const resizeObserver = globalThis.ResizeObserver
      ? new ResizeObserver(() => {
          stageHomeCalendarSyncVisibleRowHeightsV4(host);
          scheduleEvaluate();
        })
      : null;
    host
      .querySelectorAll(
        '[data-stage-home-calendar-cell="row"] [data-stage-home-calendar-page="current"] .stage-home-canvas-track',
      )
      .forEach((track) => resizeObserver?.observe(track));
  
    window.addEventListener("scroll", scheduleEvaluate, { passive: true });
    window.addEventListener("resize", scheduleEvaluate, { passive: true });
  
    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(exitTimer);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleEvaluate);
      window.removeEventListener("resize", scheduleEvaluate);
      if (section.isConnected) {
        section.classList.remove("stage-home-calendar-focus-v4");
        clearFixedGeometry();
      }
      placeholder.remove();
    };
    globalThis.__stageHomeCalendarViewportCleanupV4 = cleanup;
  
    if (restoreFocus)
      requestAnimationFrame(() => requestAnimationFrame(enter));
    else
      scheduleEvaluate();
  };
  
  const bindStageHomeV1 = (host) => {
    if (!host || host.dataset.stageHomeBound === "true") return;
    host.dataset.stageHomeBound = "true";
    mountStageHomeCalendarStaticColumnSliderV3(host);
    mountStageHomeCalendarViewportV4(host);
    host.querySelectorAll("[data-stage-home-calendar-shift]").forEach((button) =>
      button.addEventListener("click", (event) => {
        event.preventDefault();
        stageHomeCalendarPrepareRowHeightsV4(
          host,
          button.dataset.stageHomeCalendarShift,
        );
        slideStageHomeCalendarStaticColumnV3(
          host,
          button.dataset.stageHomeCalendarShift,
        );
      }),
    );
    host.querySelectorAll("[data-stage-home-calendar-event]").forEach((button) =>
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        appStore.set({
          view: "agenda",
          agendaCalendarWeekV8: agendaCalendarWeekKeyV8(button.dataset.stageHomeCalendarDate),
          selectedAgendaEventV3: button.dataset.stageHomeCalendarEvent,
          lastAction: "Abriu compromisso pela linha do tempo das etapas",
        });
      }, true),
    );
    host.querySelectorAll("[data-stage-home-view]").forEach((button) =>
      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          const view = button.dataset.stageHomeView;
          appStore.set({
            view,
            activityDedicated: false,
            stageActivityDedicatedV9: false,
            lastAction: `Abriu ${view === "activities" ? "as atividades" : view === "records" ? "os registros" : "a agenda"} pelo organizador`,
          });
        },
        true,
      ),
    );
    host.querySelector("[data-stage-home-new-record]")?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        appStore.set({
          view: "records",
          editingRecord: "new",
          recordContext: null,
          stageRecordsContext: false,
          lastAction: "Abriu novo registro pelo organizador de etapas",
        });
      },
      true,
    );
    host.querySelectorAll("[data-stage-home-record]").forEach((button) =>
      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          appStore.set({
            view: "records",
            selectedRecordV5362: button.dataset.stageHomeRecord,
            lastAction: "Abriu registro pelo organizador de etapas",
          });
        },
        true,
      ),
    );
    host.querySelectorAll("[data-stage-home-stage]").forEach((button) =>
      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          const key = button.dataset.stageHomeStage,
            modelStage = (executionModel.stages || []).find(
              (item) => String(item.key) === String(key),
            ),
            stage = modelStage || {
              key,
              name:
                button.querySelector("h3")?.textContent?.trim() ||
                "Etapa operacional",
            },
            record = demoData.activities.find(
              (item) =>
                String(item.name).toLocaleLowerCase("pt-BR") ===
                String(stage.name || "").toLocaleLowerCase("pt-BR"),
            );
          appStore.set({
            view: "stages",
            selectedStageV9: stage.key,
            selectedStage: record?.id || stage.key,
            activityDedicated: true,
            stageActivityDedicatedV9: false,
            lastAction: `Abriu a etapa ${stage.name} pelo cronograma`,
          });
        },
        true,
      ),
    );
    window.lucide?.createIcons();
  };
  
  const ensureStageHomeV1 = (layer) => {
    const host = layer || document.querySelector("view-layer"),
      state = appStore.get();
    if (!host || state.view !== "stages" || state.stageActivityDedicatedV9) return false;
    const ensureTabs = (home) => {
      if (!home) return;
      // O cabeçalho compartilhado é montado no view-layer, antes do conteúdo.
      home.querySelector("[data-stage-home-timeline]")?.remove();
    };
    const legacyHome = host.querySelector(".dashboard-carbon-home");
    if (!legacyHome) {
      const current = host.querySelector("[data-stage-home-page]");
      if (current) {
        ensureTabs(current);
        bindStageHomeV1(current);
      }
      return Boolean(current);
    }
    legacyHome.outerHTML = getStageHomePageMarkupV1();
    const current = host.querySelector("[data-stage-home-page]");
    ensureTabs(current);
    bindStageHomeV1(current);
    return true;
  };
  globalThis.ensureStageHomeRaidAiRecordsCalendarV1 = ensureStageHomeV1;
  
  const renderStageHomeFinalV1 = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderStageHomeFinalV1?.apply(this, args),
      state = appStore.get();
    if (state.view === "stages" && !state.stageActivityDedicatedV9) {
      const legacyHome = this.querySelector(".dashboard-carbon-home");
      if (legacyHome)
        legacyHome.outerHTML = getStageHomePageMarkupV1();
      ensureStageHomeV1(this);
    }
    return result;
  };
  
  // O carregamento administrativo também instala extensões assíncronas depois
  // deste módulo. Reaplica a landing no fim desse ciclo para que um reload limpo
  // não volte a exibir a antiga superfície de Etapas.
  globalThis.installStageHomeRaidAiRecordsCalendarV1 = () => {
    if (ViewLayer.prototype.__stageHomeRaidAiRecordsCalendarV1Installed) return;
    const previousStages = ViewLayer.prototype.stages;
    ViewLayer.prototype.stages = function (...args) {
      const state = appStore.get();
      // `activityDedicated` can remain true after returning from an activity.
      // Only the explicit dedicated activity route should replace the stage home;
      // otherwise the timeline must retain the stage records/resources section.
      if (state.view === "stages" && !state.stageActivityDedicatedV9)
        return getStageHomePageMarkupV1();
      return previousStages?.apply(this, args) || "";
    };
    const previous = ViewLayer.prototype.render;
    ViewLayer.prototype.render = function (...args) {
      const result = previous?.apply(this, args),
        state = appStore.get();
      if (state.view === "stages" && !state.stageActivityDedicatedV9) {
        ensureStageHomeV1(this);
      }
      return result;
    };
    ViewLayer.prototype.__stageHomeRaidAiRecordsCalendarV1Installed = true;
  };
  return { stageHomeSnapshotV1 };
}

