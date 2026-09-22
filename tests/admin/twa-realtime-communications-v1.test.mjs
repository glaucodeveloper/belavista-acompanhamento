import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {operationalConversationKey} from '../../firebase.mjs';

const read=path=>readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('conversation ids are stable, symmetric and safe for RTDB paths',()=>{
  const forward=operationalConversationKey('owner-123','foreman-456');
  const reverse=operationalConversationKey('foreman-456','owner-123');
  assert.equal(forward,reverse);
  assert.equal(forward,'foreman-456__owner-123');
  assert.doesNotMatch(forward,/[.#$\[\]/]/);
});

test('workers TWA exposes phone notifications and realtime messenger controls',async()=>{
  const html=await read('admin-workers.html');
  for(const contract of ['data-open-communications="notifications"','data-open-communications="messages"','data-enable-push','data-contact-list','data-message-feed','data-message-form','/admin-auth.mjs'])assert.match(html,new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(html,/admin-workers-manifest\.webmanifest/);
  assert.match(html,/option value="developer"/);
});

test('realtime messenger writes conversation, recipient notification and worker event',async()=>{
  const source=await read('firebase.mjs');
  for(const contract of ['operationalConversations/${threadId}/messages','notifications/${contactUid}/${notification.id}','agentBridgeEvents/message-${id}','runtime.ref(runtime.db,\'metadata\')'])assert.ok(source.includes(contract),`missing RTDB contract: ${contract}`);
});

test('workers client registers service worker, device and realtime subscriptions',async()=>{
  const source=await read('admin-workers.js');
  for(const contract of ["navigator.serviceWorker.register('/sw.js')",'registerOperationalDevice','subscribeOperationalNotifications','subscribeOperationalContacts','subscribeOperationalConversation','sendOperationalMessage',"jsonFetch('/api/devices'"])assert.ok(source.includes(contract),`missing client contract: ${contract}`);
});

test('notification dispatcher supports both RTDB inbox and Firebase Cloud Messaging',async()=>{
  const source=await read('notification-service.mjs');
  assert.match(source,/sendEachForMulticast/);
  assert.match(source,/notifications\/\$\{device\.uid\}/);
});
