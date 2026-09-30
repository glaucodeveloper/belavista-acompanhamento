import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=process.env.BELAVISTA_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('Worker oferece qualificação de Direct para lead comercial de reserva',()=>{
  const nvidia=read('worker/src/nvidia.js');
  const routes=read('worker/src/routes.js');
  const social=read('worker/src/social.js');
  assert.match(nvidia,/runInstagramCommercialLeadAssistant/);
  assert.match(nvidia,/nome completo, WhatsApp, lote\/quadra ou preferência/);
  assert.match(nvidia,/data\/horário[^\n]*visita/);
  assert.match(nvidia,/Nossa equipe entrará em contato para confirmar a visita agendada/);
  assert.match(nvidia,/requiresHumanApproval:true/);
  assert.match(nvidia,/sendAutomatically:false/);
  assert.match(nvidia,/readyForVisit/);
  assert.match(routes,/\/assistant\$/);
  assert.match(routes,/runInstagramCommercialLeadAssistant/);
  assert.match(routes,/somente para conversas do Instagram/);
  assert.match(routes,/saveInstagramCommercialLead/);
  assert.match(social,/saveInstagramCommercialLead/);
  assert.match(social,/instagram-direct/);
  assert.match(social,/Novo lead · intenção de reserva/);
  assert.match(social,/lead-qualified/);
});

test('painel de mensagens prepara rascunho sem envio automático',()=>{
  const communications=read('admin-communications.mjs');
  const css=read('admin-communications.css');
  assert.match(communications,/data-instagram-assist/);
  assert.match(communications,/IA · qualificar reserva/);
  assert.match(communications,/data-instagram-assistant/);
  assert.match(communications,/qualifyInstagram/);
  assert.match(communications,/data-instagram-lead-save/);
  assert.match(communications,/saveInstagramLead/);
  assert.match(communications,/textarea\.value=instagramAssistantResult\.reply/);
  assert.match(css,/instagram-assistant-card/);
});
