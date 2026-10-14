/** Active Etapas overview delegates to the canonical dashboard panorama. */
export const installStagePanoramaPageV1 = (ViewLayer) => {
  const stagesPanoramaBaseV1 = ViewLayer.prototype.assistant;
  ViewLayer.prototype.stagesPanoramaHome = function () {    const html = stagesPanoramaBaseV1?.call(this) || "";
    return html      .replace(        "DASHBOARD INICIAL · ALIANÇA PARK",        "ETAPAS E CRONOGRAMA · ALIANÇA PARK",      )      .replace("<h1>Panorama operacional</h1>", "<h1>Etapas e cronograma</h1>")      .replace(        "Registros rápidos e leitura de status, com o mapa aberto somente quando necessário.",        "Mapa, filtros e cronograma integrados para acompanhar cada frente de execução.",      );  };
  ViewLayer.prototype.stagesCanvas = function () {    return this.stagesPanoramaHome?.() || "";  };
};
