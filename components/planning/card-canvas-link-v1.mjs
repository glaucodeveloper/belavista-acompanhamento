/** Create the shared pointer gesture that draws a temporary card-to-card link. */
export const createCardCanvasLinkV1 = ({ documentRef, windowRef } = {}) => {
  if (typeof documentRef?.createElement !== "function" ||
      typeof documentRef?.createElementNS !== "function" ||
      typeof documentRef?.elementFromPoint !== "function")
    throw new TypeError("Card canvas link requires document element creation and hit testing.");
  if (typeof windowRef?.addEventListener !== "function" ||
      typeof windowRef?.removeEventListener !== "function")
    throw new TypeError("Card canvas link requires window pointer-event registration.");

  return ({ event, source, surface, from, onDrop } = {}) => {
    if (!event || !surface || typeof from !== "function" || typeof onDrop !== "function")
      throw new TypeError("Card canvas link requires pointer event, surface, source, and callbacks.");
    const ghost = documentRef.createElement("div"),
      svg = documentRef.createElementNS("http://www.w3.org/2000/svg", "svg"),
      path = documentRef.createElementNS("http://www.w3.org/2000/svg", "path");
    ghost.className = "card-canvas-link-ghost";
    ghost.textContent = "Novo card";
    svg.classList.add("card-canvas-link-preview");
    svg.appendChild(path);
    surface.append(svg, ghost);
    const update = (pointer) => {
      const rect = surface.getBoundingClientRect(),
        x1 = from().x - rect.left,
        y1 = from().y - rect.top,
        x2 = pointer.clientX - rect.left,
        y2 = pointer.clientY - rect.top,
        bend = Math.max(40, Math.abs(x2 - x1) * .48);
      svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      path.setAttribute("d", `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
      ghost.style.left = `${x2}px`;
      ghost.style.top = `${y2}px`;
    };
    const cleanup = () => {
      windowRef.removeEventListener("pointermove", move, true);
      windowRef.removeEventListener("pointerup", up, true);
      windowRef.removeEventListener("pointercancel", cancel, true);
      ghost.remove();
      svg.remove();
    };
    const move = (pointer) => update(pointer);
    const up = (pointer) => {
      const target = documentRef.elementFromPoint(pointer.clientX, pointer.clientY);
      cleanup();
      onDrop(pointer, target);
    };
    const cancel = () => cleanup();
    update(event);
    windowRef.addEventListener("pointermove", move, true);
    windowRef.addEventListener("pointerup", up, { capture: true, once: true });
    windowRef.addEventListener("pointercancel", cancel, { capture: true, once: true });
  };
};
