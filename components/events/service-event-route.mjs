export const eventChannelKey = (eventType, capture) =>
  `${eventType}:${capture}`;

export const resolveServiceEventTarget = (event, root, selector) => {
  if (selector == null) return event.target || root;

  const path = typeof event.composedPath === "function" ? event.composedPath() : null;
  if (Array.isArray(path) && path.length) {
    const rootIndex = path.indexOf(root);
    if (rootIndex < 0 && !root.contains?.(event.target)) return null;
    const scopedPath = rootIndex < 0 ? path : path.slice(0, rootIndex + 1);
    for (const candidate of scopedPath) {
      if (candidate?.matches?.(selector)) return candidate;
    }
    return null;
  }

  const target = event.target?.closest?.(selector);
  if (!target || !(target === root || root.contains?.(target))) return null;
  return target;
};
