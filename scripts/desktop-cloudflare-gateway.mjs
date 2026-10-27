import { timingSafeEqual } from 'node:crypto';
import http from 'node:http';

const routerKey = String(process.env.BELAVISTA_PORT_ROUTER_KEY || '').trim();
if (routerKey.length < 24) throw new Error('BELAVISTA_PORT_ROUTER_KEY precisa ter ao menos 24 caracteres.');

const host = String(process.env.BELAVISTA_CLOUDFLARE_GATEWAY_HOST || '127.0.0.1');
const port = Number(process.env.BELAVISTA_CLOUDFLARE_GATEWAY_PORT || 18888);
const upstreamHost = String(process.env.BELAVISTA_DESKTOP_UPSTREAM_HOST || '127.0.0.1');
const upstreamPort = Number(process.env.BELAVISTA_DESKTOP_UPSTREAM_PORT || 8080);
const routePrefix = '/5000';
const expectedKey = Buffer.from(routerKey);

function hasRouterKey(value) {
  const candidate = Buffer.from(String(value || ''));
  return candidate.length === expectedKey.length && timingSafeEqual(candidate, expectedKey);
}

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

const server = http.createServer((incoming, outgoing) => {
  if (!hasRouterKey(incoming.headers['x-port-router-key'])) {
    sendJson(outgoing, 401, { error: 'Chave do Router inválida ou ausente.' });
    return;
  }

  let incomingUrl;
  try { incomingUrl = new URL(incoming.url || '/', 'http://router.local'); }
  catch { sendJson(outgoing, 400, { error: 'Endereço de rota inválido.' }); return; }
  if (incomingUrl.pathname !== routePrefix && !incomingUrl.pathname.startsWith(`${routePrefix}/`)) {
    sendJson(outgoing, 404, { error: 'Rota do Router não encontrada.' });
    return;
  }

  const upstreamPath = incomingUrl.pathname.slice(routePrefix.length) || '/';
  const headers = { ...incoming.headers };
  delete headers['x-port-router-key'];
  headers.host = `${upstreamHost}:${upstreamPort}`;
  headers['x-forwarded-host'] = String(incoming.headers['x-forwarded-host'] || incoming.headers.host || '');
  headers['x-forwarded-proto'] = String(incoming.headers['x-forwarded-proto'] || 'https');

  const proxy = http.request({
    hostname: upstreamHost,
    port: upstreamPort,
    method: incoming.method,
    path: `${upstreamPath}${incomingUrl.search}`,
    headers,
  }, response => {
    outgoing.writeHead(response.statusCode || 502, response.headers);
    response.pipe(outgoing);
  });
  proxy.on('error', () => {
    if (!outgoing.headersSent) sendJson(outgoing, 502, { error: 'Servidor Atlas indisponível.' });
    else outgoing.end();
  });
  incoming.pipe(proxy);
});

server.listen(port, host, () => {
  process.stdout.write(`Gateway Cloudflare protegido ativo em http://${host}:${port} → ${upstreamHost}:${upstreamPort}${routePrefix}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
