import test from 'node:test';
import assert from 'node:assert/strict';
import { chatSheetViewportMetrics, installWorkerChatSwipeSheetV1 } from '../../components/chat/worker-chat-swipe-sheet-v1.mjs';

function chatShell() {
  const classes = new Set(['is-collapsed']);
  const listeners = new Map();
  const handle = {
    dataset: {},
    setAttribute() {},
    setPointerCapture() {},
    addEventListener(type, handler) { listeners.set(type, handler); },
  };
  const root = {
    dataset: {},
    classList: {
      add(name) { classes.add(name); },
      contains(name) { return classes.has(name); },
      toggle(name, on) { on ? classes.add(name) : classes.delete(name); },
    },
    querySelector() { return handle; },
  };
  const setCollapsed = collapsed => root.classList.toggle('is-collapsed', collapsed);
  const pointer = (type, y, x = 100, pointerType = 'touch') => listeners.get(type)?.({
    pointerType, pointerId: 1, clientX: x, clientY: y,
    target: { closest: () => null },
  });
  return { root, listeners, pointer, setCollapsed };
}

test('native chat opens on up swipe and collapses on down swipe', () => {
  const { root, pointer, setCollapsed } = chatShell();
  assert.equal(installWorkerChatSwipeSheetV1({ root, setCollapsed, native: true }), true);
  pointer('pointerdown', 140);
  pointer('pointerup', 70);
  assert.equal(root.classList.contains('is-collapsed'), false);
  pointer('pointerdown', 70);
  pointer('pointerup', 145);
  assert.equal(root.classList.contains('is-collapsed'), true);
});

test('horizontal gestures and desktop web leave chat unchanged', () => {
  const { root, pointer, setCollapsed } = chatShell();
  assert.equal(installWorkerChatSwipeSheetV1({ root, setCollapsed, native: false }), false);
  assert.equal(root.dataset.chatSwipe, undefined);
  installWorkerChatSwipeSheetV1({ root, setCollapsed, native: true });
  pointer('pointerdown', 140);
  pointer('pointerup', 110, 190);
  assert.equal(root.classList.contains('is-collapsed'), true);
});

test('native sheet follows visible phone height and lifts above the keyboard', () => {
  assert.deepEqual(chatSheetViewportMetrics({ innerHeight: 829, visibleHeight: 829 }), {
    height: 696, bottom: 0, compact: false,
  });
  assert.deepEqual(chatSheetViewportMetrics({ innerHeight: 829, visibleHeight: 450, offsetTop: 0 }), {
    height: 432, bottom: 379, compact: true,
  });
  assert.deepEqual(chatSheetViewportMetrics({ innerHeight: 440, visibleHeight: 440 }), {
    height: 422, bottom: 0, compact: true,
  });
});
