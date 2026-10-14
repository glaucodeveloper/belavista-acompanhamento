/** Installs pointer dragging for dashboard cards over the persistent map. */
export const installDashboardCardDragV1 = (ViewLayer, dependencies = {}) => {
  const { notify, windowRef = globalThis.window } = dependencies;

  ViewLayer.prototype.bindDashboardCardDrag = function() {
    const home = this.querySelector(".dashboard-home");
    if (!home) return;
    home.querySelectorAll(":scope > .float-card").forEach((card) => {
      if (card.dataset.dashboardDragBound) return;
      card.dataset.dashboardDragBound = "true";
      card.style.touchAction = "none";
      card.addEventListener("pointerdown", (event) => {
        if (
          event.button !== 0 ||
          event.target.closest("button,input,textarea,select,a")
        )
          return;
        event.preventDefault();
        const parent = home.getBoundingClientRect(),
          rect = card.getBoundingClientRect();
        const initial = { x: rect.left - parent.left, y: rect.top - parent.top },
          origin = { x: event.clientX, y: event.clientY };
        let moved = false;
        const move = (ev) => {
          const dx = ev.clientX - origin.x,
            dy = ev.clientY - origin.y;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          moved = true;
          const x = Math.max(
            8,
            Math.min(
              Math.max(8, parent.width - card.offsetWidth - 8),
              initial.x + dx,
            ),
          );
          const y = Math.max(
            8,
            Math.min(
              Math.max(8, parent.height - card.offsetHeight - 8),
              initial.y + dy,
            ),
          );
          card.style.left = `${x}px`;
          card.style.top = `${y}px`;
          card.style.right = "auto";
          card.style.bottom = "auto";
          card.style.transform = "none";
          card.classList.add("dashboard-card-dragging");
        };
        const finish = () => {
          windowRef.removeEventListener("pointermove", move);
          windowRef.removeEventListener("pointerup", finish);
          windowRef.removeEventListener("pointercancel", finish);
          card.releasePointerCapture?.(event.pointerId);
          card.classList.remove("dashboard-card-dragging");
          if (moved) notify("Card do mapa reposicionado.");
        };
        card.setPointerCapture?.(event.pointerId);
        windowRef.addEventListener("pointermove", move);
        windowRef.addEventListener("pointerup", finish, { once: true });
        windowRef.addEventListener("pointercancel", finish, { once: true });
      });
    });
  };
};
