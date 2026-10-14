// Compatibilidade de marca para extensões legadas: somente texto e campos
// apresentados ao usuário são normalizados; namespaces, chaves e APIs ficam intactos.
const ALIANCA_PARK_BRAND = "Aliança Park";

export const normalizeAliancaParkBrand = (root = document) => {
  const createTreeWalker =
    root?.createTreeWalker?.bind(root) ||
    root?.ownerDocument?.createTreeWalker?.bind(root.ownerDocument);
  if (!createTreeWalker) return;
  const walker = createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    if (node.parentElement?.closest("script,style")) continue;
    if (/\bbelavista\b/i.test(node.nodeValue || ""))
      node.nodeValue = node.nodeValue.replace(
        /\bbelavista\b/gi,
        ALIANCA_PARK_BRAND,
      );
  }
  root
    .querySelectorAll?.("[value],[title],[placeholder],[aria-label],[content]")
    .forEach((element) => {
      if (element.closest("script,style")) return;
      for (const attribute of [
        "value",
        "title",
        "placeholder",
        "aria-label",
        "content",
      ]) {
        const value = element.getAttribute(attribute);
        if (!value || !/(?<![-_.])belavista(?![-_.])/i.test(value)) continue;
        if (
          attribute === "placeholder" &&
          !/empreendimento\s+belavista/i.test(value)
        )
          continue;
        element.setAttribute(
          attribute,
          value.replace(/\bbelavista\b/gi, ALIANCA_PARK_BRAND),
        );
      }
    });
};

if (globalThis.MutationObserver && globalThis.document?.documentElement) {
  const brandObserver = new MutationObserver((records) =>
    records.forEach((record) => {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE)
          normalizeAliancaParkBrand(node);
        else if (
          node.nodeType === Node.TEXT_NODE &&
          /\bbelavista\b/i.test(node.nodeValue || "")
        )
          node.nodeValue = node.nodeValue.replace(
            /\bbelavista\b/gi,
            ALIANCA_PARK_BRAND,
          );
      }
    }),
  );
  brandObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
  });
  queueMicrotask(() => normalizeAliancaParkBrand(document));
}
