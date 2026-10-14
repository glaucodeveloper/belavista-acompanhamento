/** Installs drag positioning and per-view layout persistence for floating cards. */
export const installFloatingWidgetLayoutV1 = (ViewLayer, dependencies = {}) => {
  const { appStore } = dependencies;

  ViewLayer.prototype.bindFloatingWidgets = function() {
    const view = appStore.get().view;
    if (!["assistant", "map"].includes(view)) return;
    [...this.querySelectorAll(".float-card")].forEach((card, index) => {
      const key = `${view}:${
        [...card.classList]
          .filter((name) => name !== "float-card")
          .sort()
          .join(".") || index
      }`;
      const saved = appStore.get().widgetLayouts?.floating?.[key];
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        card.style.setProperty("left", `${saved.left}px`, "important");
        card.style.setProperty("top", `${saved.top}px`, "important");
        card.style.setProperty("right", "auto", "important");
        card.style.setProperty("bottom", "auto", "important");
      }
      const handle = card.querySelector("h3");
      if (!handle || handle.dataset.layoutBound) return;
      handle.dataset.layoutBound = "true";
      handle.classList.add("widget-drag-handle");
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest("button")) return;
        event.preventDefault();
        const parent = this.getBoundingClientRect(),
          rect = card.getBoundingClientRect(),
          origin = {
            x: event.clientX,
            y: event.clientY,
            left: rect.left - parent.left,
            top: rect.top - parent.top,
          };
        card.classList.add("widget-dragging");
        handle.setPointerCapture?.(event.pointerId);
        const move = (next) => {
          const left = Math.max(
              8,
              Math.min(
                parent.width - card.offsetWidth - 8,
                origin.left + next.clientX - origin.x,
              ),
            ),
            top = Math.max(
              70,
              Math.min(
                parent.height - card.offsetHeight - 8,
                origin.top + next.clientY - origin.y,
              ),
            );
          card.style.setProperty("left", `${left}px`, "important");
          card.style.setProperty("top", `${top}px`, "important");
          card.style.setProperty("right", "auto", "important");
          card.style.setProperty("bottom", "auto", "important");
        };
        const stop = () => {
          handle.releasePointerCapture?.(event.pointerId);
          card.classList.remove("widget-dragging");
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", stop);
          const rectNow = card.getBoundingClientRect();
          appStore.update((s) => ({
            ...s,
            widgetLayouts: {
              ...(s.widgetLayouts || {}),
              floating: {
                ...(s.widgetLayouts?.floating || {}),
                [key]: {
                  left: Math.round(rectNow.left - parent.left),
                  top: Math.round(rectNow.top - parent.top),
                },
              },
            },
          }));
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop, { once: true });
      });
    });
  };
};
