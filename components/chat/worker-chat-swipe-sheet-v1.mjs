/** Native Android chat sheet: swipe the header up to open, down to collapse. */
export function chatSheetViewportMetrics({ innerHeight, visibleHeight = innerHeight, offsetTop = 0 }) {
  const height = Math.max(0, Math.min(innerHeight, visibleHeight));
  const bottom = Math.max(0, innerHeight - offsetTop - height);
  return {
    height: Math.round(Math.min(760, height * (height < 600 ? 0.96 : 0.84))),
    bottom: Math.round(bottom),
    compact: height < 600,
  };
}

export function installWorkerChatSwipeSheetV1({ root, setCollapsed, native = false } = {}) {
  if (!native || !root || typeof setCollapsed !== 'function' || globalThis.innerWidth > 760) return false;
  const handle = root.querySelector('.worker-context-chat-head');
  if (!handle || handle.dataset.workerChatSwipeHandle === 'true') return false;
  root.classList.add('is-native-swipe-sheet');
  root.dataset.chatSwipe = 'up-down';
  handle.dataset.workerChatSwipeHandle = 'true';
  handle.setAttribute('aria-description', 'Deslize para cima para abrir o chat e para baixo para recolher.');

  const updateViewport = () => {
    const viewport = globalThis.visualViewport;
    const metrics = chatSheetViewportMetrics({
      innerHeight: globalThis.innerHeight,
      visibleHeight: viewport?.height ?? globalThis.innerHeight,
      offsetTop: viewport?.offsetTop ?? 0,
    });
    root.style?.setProperty('--worker-chat-sheet-height', `${metrics.height}px`);
    root.style?.setProperty('--worker-chat-viewport-bottom', `${metrics.bottom}px`);
    root.classList.toggle('is-native-compact-viewport', metrics.compact);
  };
  updateViewport();
  globalThis.visualViewport?.addEventListener?.('resize', updateViewport);
  globalThis.visualViewport?.addEventListener?.('scroll', updateViewport);
  globalThis.addEventListener?.('resize', updateViewport);

  let gesture = null;
  handle.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (event.target.closest('button,input,textarea,select,a')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    handle.setPointerCapture?.(event.pointerId);
  });
  handle.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const deltaX = event.clientX - gesture.x;
    const deltaY = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(deltaY) < 48 || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return;
    if (deltaY < 0 && root.classList.contains('is-collapsed')) setCollapsed(false);
    if (deltaY > 0 && !root.classList.contains('is-collapsed')) setCollapsed(true);
  });
  handle.addEventListener('pointercancel', () => { gesture = null; });
  return true;
}
