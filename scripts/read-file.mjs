import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import pdfParse from 'pdf-parse';
import { prompt } from './prompt.mjs';
const path = process.argv[2];
const client = process.argv.includes('--mobile') ? 'mobile' : 'desktop';
const base = process.env.ALIANCA_WORKER_URL;
if (!path || !base) { console.error('Uso: ALIANCA_WORKER_URL=https://... node scripts/read-file.mjs arquivo.pdf [--mobile]'); process.exit(2); }
const bytes = await readFile(path);
const extension = extname(path).toLowerCase();
let text;
if (extension === '.pdf') text = (await pdfParse(bytes)).text;
else if (['.txt', '.md', '.csv'].includes(extension)) text = bytes.toString('utf8');
else throw new Error('Formato não suportado. Use PDF com texto, TXT, Markdown ou CSV.');
if (!text.trim()) throw new Error('O arquivo não contém texto extraível. OCR de imagem ainda não está implementado.');
const username = (await prompt('Nome de usuário: ')).trim();
const password = await prompt('Senha: ', { secret: true });
async function request(route, body, token) {
  const response = await fetch(new URL(route, base), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result;
}
const session = await request('/api/login', { username, password, client });
try {
  const result = await request('/api/inference/file', { filename: basename(path), text }, session.token);
  console.log(JSON.stringify(result, null, 2));
} finally { await request('/api/logout', {}, session.token); }
