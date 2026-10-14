/** Applies the existing full-inset cover policy to a MapScene and its layers. */
export const applyMapSceneCoverLayoutV1 = (scene) => {
  scene.style.position = scene.style.position || "relative";
  scene.style.overflow = "hidden";
  scene.style.minWidth = "0";
  scene.style.minHeight = "0";

  const world = scene.querySelector(".scene-world");
  const canvas = scene.querySelector(".three-overlay");
  const host = scene.querySelector(".map-host");
  [world, host].forEach((node) => {
    if (!node) return;
    node.style.position = "absolute";
    node.style.inset = "0";
    node.style.width = "100%";
    node.style.height = "100%";
    node.style.maxWidth = "none";
    node.style.maxHeight = "none";
  });
  if (canvas) {
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.maxWidth = "none";
    canvas.style.maxHeight = "none";
    canvas.style.objectFit = "cover";
  }
  scene.dataset.mapCoverLayoutV9 = "full-inset";
  scene.dataset.mapCoverPolicyV9 = "aerial-cover + pan-clamp + resize-lock";
};
