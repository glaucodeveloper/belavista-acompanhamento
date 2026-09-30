import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const components=read('components.js');
const server=read('server.mjs');
const nvidia=read('worker/src/nvidia.js');
const routes=read('worker/src/routes.js');
const storage=read('worker/src/storage.js');
const publicLead=read('public-lead-form.mjs');
const publicAi=read('worker/src/public-lead-ai.js');
const media=read('worker/src/media-attachments.js');

test('chat aceita imagem colada e mantém texto no mesmo envio',()=>{
  assert.match(components,/data-chat-camera-input accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(components,/chat-paste-hint/);
  assert.match(components,/addEventListener\('paste'/);
  assert.match(components,/readChatImage\(file,'clipboard'\)/);
  assert.match(components,/this\.chatAttachment=\{name:String\(file\.name\|\|`imagem-/);
  assert.match(components,/attachment\?\{name:attachment\.name,mimeType:attachment\.mimeType,dataUrl:attachment\.dataUrl/);
  assert.match(components,/Imagem colada/);
  assert.match(components,/const endpoint=attachment\?'\/api\/ai\/vision-reasoning':'\/api\/ai'/);
});

test('NVIDIA recebe conteúdo multimodal no Worker e no servidor local',()=>{
  assert.match(nvidia,/function normalizeVisionAttachment\(attachment\)/);
  assert.match(nvidia,/type:'image_url',image_url:\{url:image\.dataUrl\}/);
  assert.match(nvidia,/nvidiaRequest\(env,messages,\{vision:Boolean\(image\)/);
  assert.match(routes,/attachment:payload\.attachment\|\|null/);
  assert.match(server,/const nvidiaVisionModel =/);
  assert.match(server,/type:'image_url',image_url:\{url:image\.dataUrl\}/);
  assert.match(server,/content:image\?userContent:prompt/);
  assert.doesNotMatch(server,/attachmentIgnored/);
  assert.match(server,/https:\/\/integrate\.api\.nvidia\.com\/v1\/chat\/completions/);
});

test('status do runtime declara suporte a imagem e respeita o alias VLM',()=>{
  assert.match(server,/supportsImages:aiProvider==='nvidia'\|\|aiProvider==='gemini'/);
  assert.match(storage,/visionModel:env\.NVIDIA_VISION_MODEL\|\|env\.NVIDIA_VLM_MODEL/);
  assert.match(nvidia,/env\.NVIDIA_VISION_MODEL\|\|env\.NVIDIA_VLM_MODEL\|\|DEFAULT_VISION_MODEL/);
  assert.match(nvidia,/NVIDIA_REASONING_VISION_MODEL/);
  assert.match(nvidia,/reasoningVisionEndpoint/);
});

test('Worker segura a imagem no R2 antes de oferecer aceite como evidência',()=>{
  assert.match(media,/BELAVISTA_MEDIA\|\|env\.BELAVISTA_UPLOADS/);
  assert.match(media,/cloudflare-r2/);
  assert.match(media,/cacheControl:'private, no-store'/);
  assert.match(media,/readHeldImageDataUrl/);
  assert.match(routes,/holdImageInWorker\(env,payload\.attachment/);
  assert.match(routes,/digestImageSource\(env,payload\.payload\?\.evidenceUri/);
  assert.match(components,/Usar em registro/);
  assert.match(components,/Usar como comprovação/);
  assert.match(components,/evidencePurpose:purpose/);
  assert.match(components,/Referência privada mantida pelo Worker Cloudflare/);
  assert.match(storage,/evidenceUri\|\|input\.evidenceUrl/);
});

test('landing mobile aceita colagem ou câmera e envia imagem pela rota pública',()=>{
  assert.match(publicLead,/public-chat-media-row/);
  assert.match(publicLead,/data-chat-camera-input accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(publicLead,/clipboardData\?\.items/);
  assert.match(publicLead,/attachment:attachment\?\{name:attachment\.name,mimeType:attachment\.mimeType,dataUrl:attachment\.dataUrl\}/);
  assert.match(routes,/channel:'public-lead-chat'/);
  assert.match(routes,/!String\(payload\.message\|\|''\)\.trim\(\)&&!payload\.event&&!payload\.attachment/);
  assert.match(read('api-client.mjs'),/api\\\/public\\\/lead-chat/);
  assert.match(publicAi,/type:'image_url',image_url:\{url:image\.dataUrl\}/);
  assert.match(publicAi,/NVIDIA_VISION_MODEL\|\|env\.NVIDIA_VLM_MODEL/);
});
