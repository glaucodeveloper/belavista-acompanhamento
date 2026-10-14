import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installLotDevelopmentPageV1, installLotDevelopmentRenderGuardV1 } from "../../components/lots/lot-development-page-v1.mjs";

test("lot development page installer preserves the empty directory and profile navigation surfaces", () => {
  class ViewLayer {}
  ViewLayer.prototype.bind = function () { return "base bind"; };
  const state = {};
  installLotDevelopmentPageV1(ViewLayer, {
    appStore: { get: () => state },
    esc: (value) => String(value ?? ""),
    Event: class Event {},
    FormData: class FormData {},
    formatBRL: (value) => String(value ?? 0),
    host: { document: {} },
    ico: () => "",
    lotDevelopmentProfilesV1: () => [],
    normalizeLotDevelopmentTextV1: (value) => String(value ?? "").toLowerCase(),
    notify() {},
    upsertLotDevelopmentProfileV1() {},
  });

  const directory = ViewLayer.prototype.lotDevelopment.call({});
  const profile = ViewLayer.prototype.lotProfile.call({});
  assert.match(directory, /data-lot-development-page/);
  assert.match(directory, /atlas-page-heading/);
  assert.match(directory, /lot-development-grid/);
  assert.doesNotMatch(`${directory}${profile}`, /carbon-|cds-/);
  assert.match(directory, /Nenhum perfil encontrado/);
  assert.match(directory, /data-development-new/);
  assert.match(profile, /Nenhum perfil disponível/);
  assert.match(profile, /data-view="lot-development"/);
});

test("lot development render guard preserves route rendering and avoids duplicate page shells", () => {
  const state = { view: "lot-development" };
  let iconCalls = 0, bindCalls = 0, hasPage = false;
  class ViewLayer {
    constructor() { this.dataset = {}; }
    render() { return "base-render"; }
    querySelector(selector) { return hasPage && selector === "[data-lot-development-page]" ? {} : null; }
    lotDevelopment() { return '<section data-lot-development-page>directory</section>'; }
    lotProfile() { return '<section data-lot-development-profile>profile</section>'; }
    bind() { bindCalls += 1; }
  }
  installLotDevelopmentRenderGuardV1(ViewLayer, {
    appStore: { get: () => state },
    windowRef: { lucide: { createIcons: () => { iconCalls += 1; } } },
  });
  const view = new ViewLayer();
  assert.equal(view.render(), "base-render");
  assert.equal(view.dataset.view, "lot-development");
  assert.match(view.innerHTML, /Loteamento/);
  assert.match(view.innerHTML, /data-lot-development-page/);
  assert.equal(bindCalls, 1);
  assert.equal(iconCalls, 1);

  hasPage = true;
  assert.equal(view.render(), "base-render");
  assert.equal(bindCalls, 1);
  state.view = "map";
  assert.equal(view.render(), "base-render");
  assert.equal(bindCalls, 1);
});

test("lot profile render guard selects the profile route and validates its injected shell services", () => {
  const state = { view: "lot-profile" };
  class ViewLayer {
    constructor() { this.dataset = {}; }
    render() { return "base"; }
    querySelector() { return null; }
    lotProfile() { return "profile content"; }
    bind() {}
  }
  assert.throws(() => installLotDevelopmentRenderGuardV1(ViewLayer, {}), /requires appStore.get/);
  installLotDevelopmentRenderGuardV1(ViewLayer, { appStore: { get: () => state }, windowRef: {} });
  const view = new ViewLayer();
  view.render();
  assert.match(view.innerHTML, /Perfil do loteamento/);
  assert.match(view.innerHTML, /data-lot-development-profile|profile content/);
});

test("components entry delegates lot route rendering to the lot module", async () => {
  const source = await readFile(new URL("../../components/index.mjs", import.meta.url), "utf8");
  assert.match(source, /import \{ installLotDevelopmentRenderGuardV1 \} from "\.\/lots\/lot-development-page-v1\.mjs/);
  assert.match(source, /installLotDevelopmentRenderGuardV1,/);
  assert.match(source, /installStageHomeRecordResourcesApplicationV1\(\{[\s\S]*installLotDevelopmentRenderGuardV1,/);
});
