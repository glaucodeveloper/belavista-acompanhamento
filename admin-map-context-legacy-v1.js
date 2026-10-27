/** Recovery for bundles that do not expose the TypeScript map-context owner. */
export function installLegacyAtlasAdminMapContextV1({ documentRef, windowRef, registry }) {
  const patch = () => {
    const MapScene = registry.get('map-scene');
    if (MapScene && !MapScene.prototype.__adminMapV11) {
      MapScene.prototype.__adminMapV11 = true;
      const previous = MapScene.prototype.setMapContext;
      MapScene.prototype.setMapContext = function (view) {
        const result = previous?.call(this, view);
        const isPublic = this.hasAttribute('data-public-presentation') && !this.isAdminPublicMapV1?.();
        this.dataset.mapContext = isPublic ? 'public-leads' : view;
        const category = this.querySelector('.map-category-switcher'), rotation = this.querySelector('.map-rotation-controls');
        const legend = this.querySelector('.map-gesture-legend'), badge = this.querySelector('.map-badge');
        const interactiveViews = new Set(['assistant', 'map', 'records']);
        if (category) category.hidden = isPublic || !interactiveViews.has(view);
        if (rotation) rotation.hidden = isPublic || !interactiveViews.has(view);
        if (legend) legend.hidden = isPublic || !interactiveViews.has(view);
        if (badge) badge.hidden = isPublic || !interactiveViews.has(view);
        if (isPublic) this.dataset.mapControls = 'public-disabled';
        else if (view === 'map') this.dataset.mapControls = 'admin-map-enabled';
        return result;
      };
    }
    const ViewLayer = registry.get('view-layer');
    if (ViewLayer && !ViewLayer.prototype.__adminMapViewV11) {
      ViewLayer.prototype.__adminMapViewV11 = true;
      const previous = ViewLayer.prototype.map;
      ViewLayer.prototype.map = function () { return String(previous.call(this)).replace('<stage-cash-dashboard></stage-cash-dashboard>', ''); };
    }
    documentRef.querySelectorAll('map-scene').forEach(map => map.setMapContext?.(
      map.hasAttribute('data-public-presentation') && !map.isAdminPublicMapV1?.()
        ? 'public-leads' : (documentRef.querySelector('view-layer')?.dataset.view || 'map'),
    ));
  };
  const observer = new windowRef.MutationObserver(() => {
    if (documentRef.querySelector('view-layer[data-view="map"]')) patch();
  });
  if (documentRef.documentElement) observer.observe(documentRef.documentElement, { childList: true, subtree: true });
  void registry.whenDefined('map-scene').then(patch);
  void registry.whenDefined('view-layer').then(patch);
  windowRef.queueMicrotask(patch);
  return () => observer.disconnect();
}
