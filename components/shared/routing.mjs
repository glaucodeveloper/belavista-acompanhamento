// Gera rotas que continuam válidas quando o app é servido sob o prefixo do
// multiplexador (por exemplo, /8080/admin) e preserva a chave da sessão.
export const runtimeRouteV1 = (path, query = "") => {
  const route = String(path || "/").startsWith("/")
    ? String(path || "/")
    : `/${String(path || "")}`;
  const currentPath = String(globalThis.location?.pathname || "");
  const embeddedPrefix = currentPath.match(/^\/(\d{2,5})(?=\/|$)/)?.[0] || "";
  const host = String(globalThis.location?.hostname || "");
  const tunnelPrefix = embeddedPrefix || (/ngrok/i.test(host) ? "/8080" : "");
  const params = new URLSearchParams(String(query || "").replace(/^\?/, ""));
  const key = new URLSearchParams(
    String(globalThis.location?.search || ""),
  ).get("key");
  if (key && !params.has("key")) params.set("key", key);
  const suffix = params.toString();
  return `${tunnelPrefix}${route}${suffix ? `?${suffix}` : ""}`;
};
