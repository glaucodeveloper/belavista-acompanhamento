import http from 'node:http';

const listenHost=process.env.BELAVISTA_PROXY_HOST||'127.0.0.1';
const listenPort=Number(process.env.BELAVISTA_PROXY_PORT||5000);
const upstreamHost=process.env.BELAVISTA_PROXY_UPSTREAM_HOST||'127.0.0.1';
const upstreamPort=Number(process.env.BELAVISTA_PROXY_UPSTREAM_PORT||8080);

const server=http.createServer((incoming,outgoing)=>{
  const originalHost=incoming.headers['x-forwarded-host']||incoming.headers.host||`${listenHost}:${listenPort}`;
  const headers={
    ...incoming.headers,
    host:`${upstreamHost}:${upstreamPort}`,
    'x-forwarded-host':originalHost,
    'x-forwarded-proto':incoming.headers['x-forwarded-proto']||'http',
  };
  const request=http.request({
    hostname:upstreamHost,
    port:upstreamPort,
    path:incoming.url,
    method:incoming.method,
    headers,
  },response=>{
    outgoing.writeHead(response.statusCode||502,response.headers);
    response.pipe(outgoing);
  });
  request.on('error',()=>{
    if(!outgoing.headersSent)outgoing.writeHead(502,{'content-type':'application/json; charset=utf-8'});
    outgoing.end(JSON.stringify({error:'Servidor principal indisponível.'}));
  });
  incoming.pipe(request);
});

server.listen(listenPort,listenHost,()=>{
  process.stdout.write(`Proxy local ativo: http://${listenHost}:${listenPort} → http://${upstreamHost}:${upstreamPort}\n`);
});
