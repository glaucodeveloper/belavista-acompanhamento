import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServiceEventAdministrators } from "../../components/events/service-event-admin.mjs";

test("event services share native listeners while keeping separate generator routes", () => {
  const nativeListeners = new Map(),
    handled = [],
    root = {
      addEventListener(type, listener) {
        nativeListeners.set(type, listener);
      },
      removeEventListener(type, listener) {
        if (nativeListeners.get(type) === listener) nativeListeners.delete(type);
      },
      contains: () => true,
    },
    admins = createServiceEventAdministrators({
      root,
      services: [
        {
          service: "composer",
          routes: [
            {
              eventType: "click",
              selector: "[data-send]",
              action: "send",
              handler: () => handled.push("composer"),
            },
          ],
        },
        {
          service: "attachments",
          routes: [
            {
              eventType: "click",
              selector: "[data-remove]",
              action: "remove",
              handler: () => handled.push("attachments"),
            },
            {
              eventType: "paste",
              selector: null,
              action: "read-clipboard",
              handler: ({ event }) => handled.push(event.type),
            },
          ],
        },
      ],
    });

  assert.deepEqual([...nativeListeners.keys()], ["click", "paste"]);
  const send = {
    closest(selector) {
      return selector === "[data-send]" ? this : null;
    },
  };
  nativeListeners.get("click")({ target: send });
  const remove = {
    closest(selector) {
      return selector === "[data-remove]" ? this : null;
    },
  };
  nativeListeners.get("click")({ target: remove });
  nativeListeners.get("paste")({ type: "paste", target: root });

  assert.deepEqual(handled, ["composer", "attachments", "paste"]);
  assert.deepEqual(admins.services, ["composer", "attachments"]);
  admins.dispose();
  assert.equal(nativeListeners.size, 0);
});

test("AI chat routes interaction by service and delegates dynamic actions", async () => {
  const source = await readFile(new URL("../../components/chat/ai-chat.mjs", import.meta.url), "utf8");
  assert.match(source, /service: "ai-chat-composer"/);
  assert.match(source, /service: "ai-chat-message-actions"/);
  assert.match(source, /service: "ai-chat-layout-gesture"/);
  assert.match(source, /registerEventActionV1\(button/);
  assert.doesNotMatch(source, /\.addEventListener\(/);
});
