import http from 'node:http';

const host = String(process.env.BELAVISTA_CLOUDFLARE_GATEWAY_HOST || '127.0.0.1');
const port = Number(process.env.BELAVISTA_CLOUDFLARE_GATEWAY_PORT || 18888);
const upstreamHost = String(process.env.BELAVISTA_DESKTOP_UPSTREAM_HOST || '127.0.0.1');
const upstreamPort = Number(process.env.BELAVISTA_DESKTOP_UPSTREAM_PORT || 8080);
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
  // The public Port Router validates X-Port-Router-Key and strips it before
  // forwarding. This gateway is loopback-only, so forwarded host headers are
  // the marker that a request passed through that authenticated router.
  if (!incoming.headers['x-forwarded-host']) {
    sendJson(outgoing, 401, { error: 'Acesso permitido somente pelo Router autenticado.' });
    return;
  }

  let incomingUrl;
  try { incomingUrl = new URL(incoming.url || '/', 'http://router.local'); }
  catch { sendJson(outgoing, 400, { error: 'Endereço de rota inválido.' }); return; }
  // Port Router already removes its /<port> prefix before forwarding here.
  const upstreamPath = incomingUrl.pathname || '/';
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
  process.stdout.write(`Gateway protegido ativo em http://${host}:${port} → ${upstreamHost}:${upstreamPort}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
