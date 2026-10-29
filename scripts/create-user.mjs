import { randomBytes, randomUUID, pbkdf2Sync, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { prompt } from './prompt.mjs';
const role = process.argv.includes('--desktop') ? 'desktop' : process.argv.includes('--mobile') ? 'mobile' : '';
if (!role) { console.error('Uso: npm run user:create -- --desktop|--mobile'); process.exit(2); }
const username = (await prompt('Nome de usuário: ')).trim();
const password = await prompt('Senha: ', { secret: true });
if (username.length < 2 || username.length > 80 || password.length < 12 || password.length > 1024) { console.error('Nome deve ter 2 a 80 caracteres e senha de 12 a 1024 caracteres.'); process.exit(2); }
const token = process.env.GITHUB_TOKEN || execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
const repo = process.env.GITHUB_DATA_REPOSITORY || 'glaucodeveloper/belavista-acompanhamento-data';
const key = createHash('sha256').update(username.normalize('NFKC').trim().toLowerCase()).digest('hex');
const endpoint = `https://api.github.com/repos/${repo}/contents/users/${key}.json`;
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'alianca-park-user-setup', 'X-GitHub-Api-Version': '2022-11-28' };
const check = await fetch(endpoint, { headers });
if (check.ok) { console.error('Usuário já existe.'); process.exit(1); }
if (check.status !== 404) { console.error(`Repositório indisponível (HTTP ${check.status}).`); process.exit(1); }
const salt = randomBytes(16).toString('hex'), iterations = 100000;
const user = { id: randomUUID(), username, role, salt, password_hash: pbkdf2Sync(password, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex'), iterations, created_at: new Date().toISOString() };
const result = await fetch(endpoint, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Criar usuário ${role}`, content: Buffer.from(JSON.stringify(user)).toString('base64') }) });
if (!result.ok) { console.error(`Não foi possível criar usuário (HTTP ${result.status}).`); process.exit(1); }
console.log(`Usuário ${role} criado no repositório privado.`);
