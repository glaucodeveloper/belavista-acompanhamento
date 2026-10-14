/**
 * Owns the mode checks that distinguish public, shared-admin and standalone
 * MapScene surfaces. Attribute and route behavior matches the original element.
 */
export const installMapSceneSurfacePolicyV1 = (
  MapScene,
  { locationRef = globalThis.location } = {},
) => {
  if (typeof MapScene !== "function" || !MapScene.prototype)
    throw new TypeError("Map scene surface policy requires the existing MapScene constructor.");

  const MapSceneSurfacePolicyV1 = class {
    isPublicMapVisual() {
      return (
        this.hasAttribute("data-public-map") ||
        this.hasAttribute("data-public-presentation")
      );
    }

    isPublicCustomerExperience() {
      return (
        this.isPublicMapVisual() &&
        !this.hasAttribute("data-admin-shared-public-map")
      );
    }

    isAdminPublicMapV1() {
      return this.hasAttribute("data-admin-public-map");
    }

    isPublicCameraPreset() {
      // A página pública abre em preset editorial; o mapa administrativo
      // compartilha a cena, mas precisa continuar inclinável pelo operador.
      return (
        this.isPublicCustomerExperience() &&
        (this.isAdminPublicMapV1() ||
          this.dataset.publicCameraInteracted !== "true")
      );
    }

    markAdminCameraInteracted() {
      if (this.isPublicCustomerExperience() && !this.isAdminPublicMapV1()) {
        this.dataset.publicCameraInteracted = "true";
      }
      if (this.hasAttribute("data-admin-shared-public-map")) {
        this.dataset.adminCameraInteracted = "true";
      }
    }

    isAdminStandalone3DV5370() {
      if (this.hasAttribute("data-activity-location-editor")) return false;
      if (this.isAdminPublicMapV1()) return false;
      // O mapa administrativo compartilha a calibração visual do /leads, mas
      // não pode compartilhar o boot legado do GLB: o carregamento automático
      // de WebGL é o que derruba o Chromium antes de a interface aparecer.
      // O /leads continua no renderer público; somente /admin usa a superfície
      // estática com 3D opt-in.
      const location = typeof locationRef === "function"
        ? locationRef()
        : locationRef;
      const isAdminRoute =
        location.pathname === "/admin" || location.pathname.startsWith("/admin/");
      const isRubyAdminRoute = this.dataset.mapInit === "admin-static-first-v5370";
      if (this.hasAttribute("data-admin-shared-public-map")) return isAdminRoute || isRubyAdminRoute;
      return Boolean(isAdminRoute || this.closest("belavista-app"));
    }
  };

  Object.defineProperties(
    MapScene.prototype,
    Object.getOwnPropertyDescriptors(MapSceneSurfacePolicyV1.prototype),
  );
  return MapScene;
};
