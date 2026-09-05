export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), {...init, headers});
}

export function error(message, status = 400, extra = {}) {
  return json({error: message, ...extra}, {status});
}

export async function readJson(request) {
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

export function text(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

export function slug(value, fallback = 'item') {
  const cleaned = text(value, 160).toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function now() {
  return new Date().toISOString();
}

export function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`;
}

