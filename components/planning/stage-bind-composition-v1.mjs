/** Adds the historical stage and dashboard drag bindings after the base bind. */
export const installStageBindCompositionV1 = (ViewLayer) => {
  const viewLayerBind = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function () {
    viewLayerBind.call(this);
    this.bindDashboardCardDrag();
    this.bindStageExtensions();
  };
};
