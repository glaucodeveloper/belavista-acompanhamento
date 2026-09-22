// BELAVISTA_ADMIN_LOTS_CANVAS_V1
(() => {
  if (globalThis.__belavistaAdminLotsCanvasV1) return;
  globalThis.__belavistaAdminLotsCanvasV1 = true;

  const STORAGE_KEY = "belavista.admin.lots.canvas.v1";
  const STAGE_W = 9600;
  const STAGE_H = 6200;
  const NODE_W = 128;
  const NODE_H = 58;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  let state = null;
  let lots = [];
  let page = null;
  let workspace = null;
  let hiddenNodes = [];
  let selected = null;
  let relationSource = null;
  let drag = null;
  let saveTimer = 0;

  const defaultState = () => ({
    version: 1,
    zoom: .9,
    nodes: {},
    groups: [],
    relations: [],
    updatedAt: new Date().toISOString()
  });

  const clone = value => {
    try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
  };

  function loadState() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value?.version === 1 ? value : defaultState();
    } catch {
      return defaultState();
    }
  }

  function persist(now = false) {
    clearTimeout(saveTimer);
    const commit = () => {
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const node = page?.querySelector("[data-lots-save]");
      if (node) node.textContent = `salvo · ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`;
    };
    if (now) commit();
    else saveTimer = setTimeout(commit, 180);
  }

  function normalizeLot(item, index) {
    const p = item?.properties || item?.attrs || item || {};
    const id = String(
      p.id ?? p.lotId ?? p.loteId ?? p.codigo ?? p.code ?? p.reference ??
      p.ref ?? p.partId ?? p.glbObject ?? p.name ?? p.label ?? `L-${index+1}`
    ).trim();
    const label = String(
      p.label ?? p.partLabel ?? p.codigo ?? p.code ?? p.lote ?? p.lot ??
      p.name ?? p.glbObject ?? id
    ).trim();
    const block = String(p.quadra ?? p.block ?? p.blockName ?? p.qd ?? "").trim();
    const area = String(p.area ?? p.areaM2 ?? p.squareMeters ?? "").trim();
    return { id, label, block, area, raw: p };
  }

  function collectLots(payload) {
    const candidates = [
      payload?.lots,
      payload?.lotes,
      payload?.features,
      payload?.data?.lots,
      payload?.data?.lotes,
      payload?.map?.lots
    ].find(Array.isArray) || [];
    return candidates.map(normalizeLot).filter(x => x.id);
  }

  async function fetchLots() {
    const urls = [
      "./assets/data/dwg-georeference.json",
      "./assets/data/lot-pricing.json",
      "./assets/dwg-georeference.json",
      "./dwg-georeference.json"
    ];
    const merged = new Map();
    for (const url of urls) {
      try {
        const response = await fetch(url,{cache:"no-store"});
        if (!response.ok) continue;
        const payload = await response.json();
        collectLots(payload).forEach(lot => {
          const current = merged.get(lot.id) || {};
          merged.set(lot.id,{...current,...lot,raw:{...(current.raw||{}),...(lot.raw||{})}});
        });
      } catch {}
    }
    return [...merged.values()];
  }

  function ensureNodeLayout() {
    const blockRows = new Map();
    lots.forEach((lot,index) => {
      if (state.nodes[lot.id]) return;
      const key = lot.block || (lot.label.match(/Q(?:UADRA)?\s*[-_]?\s*(\d+)/i)?.[1] ? `Q${lot.label.match(/Q(?:UADRA)?\s*[-_]?\s*(\d+)/i)[1]}` : "Sem quadra");
      const row = blockRows.get(key) || 0;
      blockRows.set(key,row+1);
      const blockIndex = [...blockRows.keys()].indexOf(key);
      state.nodes[lot.id] = {
        x: 120 + (row % 12) * 154,
        y: 140 + blockIndex * 190 + Math.floor(row/12)*78,
        label: "",
        comment: "",
        groupId: ""
      };
    });
    persist(true);
  }

  function entityCenter(id) {
    if (id?.startsWith("lot:")) {
      const key = id.slice(4), node = state.nodes[key];
      if (!node) return null;
      return {x:node.x + NODE_W/2,y:node.y + NODE_H/2};
    }
    if (id?.startsWith("group:")) {
      const group = state.groups.find(x => x.id === id.slice(6));
      if (!group) return null;
      return {x:group.x + group.w/2,y:group.y + group.h/2};
    }
    return null;
  }

  function relationSvg() {
    return state.relations.map(rel => {
      const a = entityCenter(rel.from), b = entityCenter(rel.to);
      if (!a || !b) return "";
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      return `<g data-rel-id="${esc(rel.id)}">
        <path d="M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}" />
        <rect x="${mx-54}" y="${my-12}" width="108" height="24" rx="12"></rect>
        <text x="${mx}" y="${my+4}" text-anchor="middle">${esc(rel.label||"relaciona")}</text>
      </g>`;
    }).join("");
  }

  function groupHtml(group) {
    return `<section class="lot-group ${selected===`group:${group.id}`?"selected":""}"
      data-entity="group:${esc(group.id)}"
      style="left:${group.x}px;top:${group.y}px;width:${group.w}px;height:${group.h}px">
      <header data-group-drag>
        <span><small>GRUPO</small><strong>${esc(group.name||"Grupo")}</strong></span>
        <b>${state.nodes ? Object.values(state.nodes).filter(n=>n.groupId===group.id).length : 0}</b>
      </header>
      <p>${esc(group.note||"")}</p>
    </section>`;
  }

  function lotHtml(lot) {
    const node = state.nodes[lot.id];
    if (!node) return "";
    const custom = node.label.trim();
    return `<button type="button"
      class="lot-node ${selected===`lot:${lot.id}`?"selected":""}"
      data-entity="lot:${esc(lot.id)}"
      style="left:${node.x}px;top:${node.y}px">
      <small>${esc(lot.block || "LOTE")}</small>
      <strong>${esc(custom || lot.label)}</strong>
      <span>${node.comment ? "comentado" : (lot.area ? `${esc(lot.area)} m²` : "sem comentário")}</span>
    </button>`;
  }

  function renderCanvas() {
    const stage = page?.querySelector("[data-lots-stage]");
    const svg = page?.querySelector("[data-lots-relations]");
    if (!stage || !svg) return;
    stage.querySelectorAll(".lot-group,.lot-node").forEach(node=>node.remove());
    state.groups.forEach(group => stage.insertAdjacentHTML("beforeend",groupHtml(group)));
    lots.forEach(lot => stage.insertAdjacentHTML("beforeend",lotHtml(lot)));
    svg.innerHTML = relationSvg();
    stage.style.transform = `scale(${state.zoom})`;
    renderInspector();
    updateCounts();
  }

  function updateCounts() {
    const lotCount = page?.querySelector("[data-lot-count]");
    const groupCount = page?.querySelector("[data-group-count]");
    const relCount = page?.querySelector("[data-rel-count]");
    if (lotCount) lotCount.textContent = lots.length;
    if (groupCount) groupCount.textContent = state.groups.length;
    if (relCount) relCount.textContent = state.relations.length;
  }

  function selectedGroup() {
    return selected?.startsWith("group:") ? state.groups.find(x=>x.id===selected.slice(6)) : null;
  }
  function selectedLot() {
    if (!selected?.startsWith("lot:")) return null;
    return lots.find(x=>x.id===selected.slice(4)) || null;
  }

  function renderInspector() {
    const host = page?.querySelector("[data-lots-inspector]");
    if (!host) return;
    const lot = selectedLot();
    const group = selectedGroup();

    if (lot) {
      const node = state.nodes[lot.id];
      host.innerHTML = `
        <div class="inspector-kicker">LOTE SELECIONADO</div>
        <h3>${esc(node.label || lot.label)}</h3>
        <dl>
          <dt>Referência</dt><dd>${esc(lot.id)}</dd>
          <dt>Quadra</dt><dd>${esc(lot.block || "—")}</dd>
          <dt>Área</dt><dd>${esc(lot.area || "—")}</dd>
        </dl>
        <label>Rótulo do lote<input data-lot-label value="${esc(node.label)}" placeholder="${esc(lot.label)}"></label>
        <label>Grupo
          <select data-lot-group>
            <option value="">Sem grupo</option>
            ${state.groups.map(g=>`<option value="${esc(g.id)}" ${node.groupId===g.id?"selected":""}>${esc(g.name)}</option>`).join("")}
          </select>
        </label>
        <label>Comentário<textarea data-lot-comment rows="8" placeholder="Observação comercial, restrição, preferência, informação de campo…">${esc(node.comment)}</textarea></label>
        <div class="inspector-actions">
          <button data-start-relation="${esc(selected)}">Relacionar</button>
          <button class="danger" data-delete-relations-for="${esc(selected)}">Remover relações</button>
        </div>`;
      host.querySelector("[data-lot-label]")?.addEventListener("input",e=>{node.label=e.target.value;persist();renderCanvas();});
      host.querySelector("[data-lot-comment]")?.addEventListener("input",e=>{node.comment=e.target.value;persist();});
      host.querySelector("[data-lot-group]")?.addEventListener("change",e=>{
        node.groupId=e.target.value;
        const g=state.groups.find(x=>x.id===node.groupId);
        if(g){node.x=g.x+26+(Math.random()*Math.max(10,g.w-NODE_W-52));node.y=g.y+68+(Math.random()*Math.max(10,g.h-NODE_H-92));}
        persist(true);renderCanvas();
      });
      return;
    }

    if (group) {
      host.innerHTML = `
        <div class="inspector-kicker">GRUPO SELECIONADO</div>
        <h3>${esc(group.name)}</h3>
        <label>Nome<input data-group-name value="${esc(group.name)}"></label>
        <label>Descrição<textarea data-group-note rows="6" placeholder="Função do agrupamento…">${esc(group.note||"")}</textarea></label>
        <div class="inspector-actions">
          <button data-start-relation="${esc(selected)}">Relacionar</button>
          <button class="danger" data-delete-group="${esc(group.id)}">Excluir grupo</button>
        </div>`;
      host.querySelector("[data-group-name]")?.addEventListener("input",e=>{group.name=e.target.value;persist();renderCanvas();});
      host.querySelector("[data-group-note]")?.addEventListener("input",e=>{group.note=e.target.value;persist();});
      return;
    }

    host.innerHTML = `<div class="inspector-empty">
      <small>INSPECTOR</small>
      <strong>Selecione um lote ou grupo</strong>
      <p>Comentários pertencem ao lote. Grupos organizam os lotes e podem se relacionar por linhas rotuladas.</p>
    </div>`;
  }

  function beginRelation(entity) {
    relationSource = entity;
    page.dataset.relationMode = "true";
    const hint = page.querySelector("[data-relation-hint]");
    if (hint) hint.textContent = "Selecione o segundo elemento da relação";
  }

  function finishRelation(target) {
    if (!relationSource || relationSource === target) return;
    const label = prompt("Rótulo da relação:", "relaciona com")?.trim();
    if (label == null) return;
    state.relations.push({
      id:`REL-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      from:relationSource,to:target,label:label||"relaciona com"
    });
    relationSource=null;
    page.dataset.relationMode="false";
    const hint=page.querySelector("[data-relation-hint]");
    if(hint)hint.textContent="Clique em Relacionar e escolha dois elementos";
    persist(true);renderCanvas();
  }

  function createGroup() {
    const name = prompt("Nome do grupo:", "Novo grupo")?.trim();
    if (!name) return;
    const scroller=page.querySelector(".lots-canvas-viewport");
    const x=(scroller.scrollLeft/state.zoom)+220;
    const y=(scroller.scrollTop/state.zoom)+180;
    const group={id:`G-${Date.now()}`,name,note:"",x,y,w:560,h:330};
    state.groups.push(group);
    selected=`group:${group.id}`;
    persist(true);renderCanvas();
  }

  function deleteGroup(id) {
    state.groups=state.groups.filter(g=>g.id!==id);
    Object.values(state.nodes).forEach(n=>{if(n.groupId===id)n.groupId="";});
    state.relations=state.relations.filter(r=>r.from!==`group:${id}`&&r.to!==`group:${id}`);
    selected=null;persist(true);renderCanvas();
  }

  function exportJson() {
    const blob=new Blob([JSON.stringify({state,lots},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="belavista-lotes-canvas.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function importJson(file) {
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const payload=JSON.parse(reader.result);
        if(payload?.state?.version===1)state=payload.state;
        else if(payload?.version===1)state=payload;
        else throw new Error("Formato inválido");
        persist(true);renderCanvas();
      }catch(error){alert(`Não foi possível importar: ${error.message}`);}
    };
    reader.readAsText(file);
  }

  function pointerDown(event) {
    const entity=event.target.closest?.("[data-entity]");
    if (!entity) return;
    const id=entity.dataset.entity;
    if (page.dataset.relationMode==="true" && relationSource) {
      event.preventDefault();event.stopPropagation();finishRelation(id);return;
    }
    selected=id;renderCanvas();

    const isGroup=id.startsWith("group:");
    if(isGroup && !event.target.closest("[data-group-drag]"))return;
    if(!isGroup && !event.target.closest(".lot-node"))return;

    const target=isGroup?state.groups.find(g=>g.id===id.slice(6)):state.nodes[id.slice(4)];
    if(!target)return;
    drag={id,isGroup,startX:event.clientX,startY:event.clientY,x:target.x,y:target.y};
    entity.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function pointerMove(event) {
    if(!drag)return;
    const scale=state.zoom||1;
    const dx=(event.clientX-drag.startX)/scale,dy=(event.clientY-drag.startY)/scale;
    const target=drag.isGroup?state.groups.find(g=>g.id===drag.id.slice(6)):state.nodes[drag.id.slice(4)];
    if(!target)return;
    const nextX=Math.max(0,Math.min(STAGE_W-(drag.isGroup?target.w:NODE_W),drag.x+dx));
    const nextY=Math.max(0,Math.min(STAGE_H-(drag.isGroup?target.h:NODE_H),drag.y+dy));
    const ddx=nextX-target.x,ddy=nextY-target.y;
    target.x=nextX;target.y=nextY;
    if(drag.isGroup){
      Object.values(state.nodes).forEach(n=>{if(n.groupId===target.id){n.x+=ddx;n.y+=ddy;}});
    }
    const dom=page.querySelector(`[data-entity="${CSS.escape(drag.id)}"]`);
    if(dom){dom.style.left=`${target.x}px`;dom.style.top=`${target.y}px`;}
    page.querySelector("[data-lots-relations]").innerHTML=relationSvg();
  }

  function pointerUp() {
    if(!drag)return;
    drag=null;persist();
  }

  function pageHtml() {
    return `<section class="admin-lots-canvas-page">
      <header class="lots-page-head">
        <div><small>COMERCIAL · INVENTÁRIO ESPACIAL</small><h1>Lotes</h1><p>Comentários, agrupamentos e relações entre lotes.</p></div>
        <div class="lots-head-stats">
          <span><b data-lot-count>0</b><small>lotes</small></span>
          <span><b data-group-count>0</b><small>grupos</small></span>
          <span><b data-rel-count>0</b><small>relações</small></span>
        </div>
      </header>
      <div class="lots-toolbar">
        <button data-new-group>＋ Grupo</button>
        <button data-rel-toolbar>↗ Relacionar</button>
        <button data-zoom-out>−</button><button data-zoom-reset>100%</button><button data-zoom-in>＋</button>
        <span data-relation-hint>Clique em Relacionar e escolha dois elementos</span>
        <i data-lots-save>local</i>
        <button data-export>Exportar JSON</button>
        <label class="import-button">Importar<input type="file" accept="application/json" data-import></label>
      </div>
      <div class="lots-layout">
        <div class="lots-canvas-viewport">
          <div class="lots-stage" data-lots-stage style="width:${STAGE_W}px;height:${STAGE_H}px">
            <svg data-lots-relations viewBox="0 0 ${STAGE_W} ${STAGE_H}"></svg>
          </div>
        </div>
        <aside class="lots-inspector" data-lots-inspector></aside>
      </div>
    </section>`;
  }

  function bindPage() {
    page.addEventListener("pointerdown",pointerDown);
    window.addEventListener("pointermove",pointerMove);
    window.addEventListener("pointerup",pointerUp);
    page.querySelector("[data-new-group]")?.addEventListener("click",createGroup);
    page.querySelector("[data-rel-toolbar]")?.addEventListener("click",()=>{
      if(!selected){alert("Selecione primeiro um lote ou grupo.");return;}
      beginRelation(selected);
    });
    page.addEventListener("click",event=>{
      const start=event.target.closest("[data-start-relation]");
      if(start){beginRelation(start.dataset.startRelation);return;}
      const delGroup=event.target.closest("[data-delete-group]");
      if(delGroup){if(confirm("Excluir este grupo?"))deleteGroup(delGroup.dataset.deleteGroup);return;}
      const delRels=event.target.closest("[data-delete-relations-for]");
      if(delRels){
        const id=delRels.dataset.deleteRelationsFor;
        state.relations=state.relations.filter(r=>r.from!==id&&r.to!==id);
        persist(true);renderCanvas();
      }
    });
    page.querySelector("[data-zoom-in]")?.addEventListener("click",()=>{state.zoom=Math.min(1.6,state.zoom+.1);persist();renderCanvas();});
    page.querySelector("[data-zoom-out]")?.addEventListener("click",()=>{state.zoom=Math.max(.45,state.zoom-.1);persist();renderCanvas();});
    page.querySelector("[data-zoom-reset]")?.addEventListener("click",()=>{state.zoom=1;persist();renderCanvas();});
    page.querySelector("[data-export]")?.addEventListener("click",exportJson);
    page.querySelector("[data-import]")?.addEventListener("change",e=>e.target.files?.[0]&&importJson(e.target.files[0]));
  }

  function findWorkspace() {
    return document.querySelector(".workspace,.maximus-workspace,[data-workspace],main .content,main > section:last-of-type");
  }

  function unmount() {
    if(!page)return;
    page.remove();
    hiddenNodes.forEach(([node,display])=>{if(node.isConnected)node.style.display=display;});
    hiddenNodes=[];page=null;workspace=null;selected=null;relationSource=null;
    document.body.classList.remove("admin-lots-canvas-active");
    document.querySelectorAll("[data-admin-lots-nav]").forEach(b=>b.classList.remove("active"));
  }

  async function mount() {
    if(page)return;
    workspace=findWorkspace();
    if(!workspace)return;
    state=loadState();
    lots=await fetchLots();
    ensureNodeLayout();
    hiddenNodes=[...workspace.children].map(node=>[node,node.style.display]);
    hiddenNodes.forEach(([node])=>node.style.display="none");
    workspace.insertAdjacentHTML("beforeend",pageHtml());
    page=workspace.querySelector(".admin-lots-canvas-page");
    document.body.classList.add("admin-lots-canvas-active");
    document.querySelectorAll("[data-admin-lots-nav]").forEach(b=>b.classList.add("active"));
    bindPage();renderCanvas();
  }

  function makeNavButton(reference) {
    const button=reference.cloneNode(true);
    button.classList.remove("active");
    [...button.attributes].forEach(attr=>{
      if(attr.name.startsWith("data-"))button.removeAttribute(attr.name);
    });
    button.dataset.adminLotsNav="true";
    button.type="button";
    const spans=button.querySelectorAll("span");
    if(spans.length)spans[spans.length-1].textContent="Lotes";
    else button.textContent="Lotes";
    const icon=button.querySelector("i,b");
    if(icon)icon.textContent="▦";
    button.addEventListener("click",event=>{
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();mount();
    },true);
    return button;
  }

  function installNav() {
    if(document.querySelector("[data-admin-lots-nav]"))return true;
    const candidates=[...document.querySelectorAll("aside button, nav button, .sidebar button")];
    const registros=candidates.find(b=>b.textContent?.trim().toLowerCase().includes("registros"));
    if(!registros)return false;
    registros.after(makeNavButton(registros));
    return true;
  }

  document.addEventListener("click",event=>{
    if(!page)return;
    const nav=event.target.closest("aside button,nav button,.sidebar button");
    if(nav && !nav.closest("[data-admin-lots-nav]"))setTimeout(unmount,0);
  },true);

  const navObserver=new MutationObserver(()=>installNav());
  const boot=()=>{
    installNav();
    navObserver.observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
