import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..','..');
const read=path=>readFile(join(root,path),'utf8');

const form=await read('public-lead-form.mjs');
const iframe=await read('instagram-message.html');
const css=await read('public-leads.css');
const worker=await read('worker/src/public-lead-ai.js');
const register=await read('worker/src/public-lead-register-v5342.js');
const intent=await read('public-lead-intent-v5342.mjs');
const workerIndex=await read('worker/src/index.js');
const admin=await read('components.js');
const publicHtml=await read('public-leads.html');

assert.match(form,/src="\/instagram-message\.html"/);
assert.match(form,/postMessage\(\{type:'instagram-message'/);
assert.match(form,/data-instagram-toggle/);
assert.match(form,/aria-expanded/);
assert.match(form,/name="instagramHandle"/);
assert.match(iframe,/event\.origin!==location\.origin/);
assert.match(iframe,/data-copy/);
assert.match(iframe,/data-direct/);
assert.match(css,/public-chat-instagram-handoff/);
assert.match(worker,/instagramHandoff/);
assert.match(worker,/instagramHandle/);
assert.match(register,/instagramHandle/);
assert.match(intent,/name="instagramHandle"/);
assert.match(intent,/instagramHandle:instagram/);
assert.match(workerIndex,/pathname==='\/api\/public\/lead-register'/);
assert.match(publicHtml,/public-lead-intent-v5342\.mjs\?v=5\.3\.43/);
assert.match(admin,/instagramHandle/);

console.log('Instagram handoff: iframe, copy/direct action, @ capture and admin mapping present.');
