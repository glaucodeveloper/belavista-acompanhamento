const ACTIVITY_PAGE_HEAD_SELECTORS_V1 = [
  ".repasse-page-head",
  ".v7-page-head",
  ".activity-dedicated-head",
  ".activity-installation-head",
  ".activity-calendar-page-v1 > header",
  ".broker-directory-head",
  ".broker-detail-head",
  ".sales-history-head",
  ".sales-history-detail-head",
  ".settings-commercial-workspace > header",
  ".agenda-detail-page > header",
  ".commission-negotiations-head",
  ".commission-page-head",
  ".commission-profile-header",
  ".commission-deal-head",
  ".commission-deal-empty",
  ".contracts-page-head-v2",
  ".control-page-head",
  ".control-center-head",
  ".dashboard-head",
  ".dashboard-carbon-head",
  ".dashboard-map-head-v5360",
  ".dedicated-head",
  ".extension-head",
  ".lot-detail-head",
  ".materials-head",
  ".my-contracts-head-v1",
  ".my-proposal-head-v1",
  ".personnel-head-v5372",
  ".stages-landing-head-v5361",
  ".stage-v9-dedicated-head",
  ".stage-v9-activity-head",
  ".stage-v9-page-head",
  ".stage-agenda-month-head-v3",
  ".stages-navigation-head-v5374",
  ".project-documents-head",
  ".cash-record-page-head",
  ".workspace-head-v5356",
  ".workspace-head-v5360",
  ".workspace-head-v5362",
  ".records-head",
];

/** Moves each page's existing heading controls into the shared activity toolbar. */
export const installActivityHeaderConsolidationV1 = (
  ViewLayer,
  { document: documentRef = globalThis.document, Node: NodeRef = globalThis.Node } = {},
) => {
  const renderBeforeActivityHeaderConsolidationV1 = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderBeforeActivityHeaderConsolidationV1.apply(this, args),
      sharedHeader = this.querySelector(":scope > .activity-header");
    if (!sharedHeader) return result;
    const sharedTitle = sharedHeader.querySelector(":scope > div:first-child > span"),
      sharedSubtitle = sharedHeader.querySelector(":scope > div:first-child > small");
    let tools = sharedHeader.querySelector(":scope > .activity-header-tools");
    const ensureTools = () => {
      if (!tools) {
        tools = documentRef.createElement("div");
        tools.className = "activity-header-tools";
        tools.setAttribute("aria-label", "Ações da página");
        sharedHeader.insertBefore(tools, sharedHeader.querySelector(":scope > .activity-state"));
      }
      return tools;
    };
    const pageHeads = [...new Set(ACTIVITY_PAGE_HEAD_SELECTORS_V1.flatMap((selector) => [...this.querySelectorAll(selector)]))]
      .filter((node) => node !== sharedHeader && !node.closest("dialog") && node.querySelector("h1"))
      .sort((left, right) => left === right ? 0 : left.compareDocumentPosition(right) & NodeRef.DOCUMENT_POSITION_FOLLOWING ? -1 : 1),
      pageHead = pageHeads[0];
    if (pageHead) {
      const pageTitle = pageHead.querySelector("h1"),
        pageSubtitle = pageHead.querySelector("p");
      if (pageTitle && sharedTitle) sharedTitle.textContent = pageTitle.textContent.trim();
      if (pageSubtitle && sharedSubtitle) sharedSubtitle.textContent = pageSubtitle.textContent.trim();
      const target = ensureTools(),
        meaningfulControl = (node) => node.matches("button, a, input, select, textarea, [role='button'], .deal-status, .lot-status-pill, .lot-payment-pill, .my-contracts-identity-v1, .stage-record-center-live, .control-live-dot, .commission-avatar") || Boolean(node.querySelector("button, a, input, select, textarea, [role='button']"));
      let titleBlock = pageTitle;
      while (titleBlock && titleBlock.parentElement !== pageHead) titleBlock = titleBlock.parentElement;
      if (titleBlock === pageHead) titleBlock = null;
      let insertAfter = pageHead;
      for (const child of [...pageHead.children]) {
        if (child === titleBlock) continue;
        if (meaningfulControl(child)) target.append(child);
        else {
          insertAfter.insertAdjacentElement("afterend", child);
          insertAfter = child;
        }
      }
      if (titleBlock) {
        for (const control of [...titleBlock.querySelectorAll("button, a, input, select, textarea, [role='button']")]) {
          const unit = control.matches("input, select, textarea") ? control.closest("label") || control : control;
          if (!target.contains(unit)) target.append(unit);
        }
      } else {
        for (const control of [...pageHead.querySelectorAll("button, a, input, select, textarea, [role='button']")]) {
          const unit = control.matches("input, select, textarea") ? control.closest("label") || control : control;
          if (!target.contains(unit)) target.append(unit);
        }
      }
      pageHead.remove();
    }
    return result;
  };
};
