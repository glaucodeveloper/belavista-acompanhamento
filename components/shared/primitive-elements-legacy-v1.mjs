import { esc, ico } from "./dom.mjs";

export class GlassCard extends HTMLElement {
  connectedCallback() {
    if (!this.classList.contains("glass-card"))
      this.classList.add("glass-card");
  }
}

export class StatPill extends HTMLElement {
  connectedCallback() {
    this.render();
  }
  static get observedAttributes() {
    return ["label", "value", "tone", "icon", "sub"];
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const label = this.getAttribute("label") || "";
    const value = this.getAttribute("value") || "";
    const tone = this.getAttribute("tone") || "teal";
    const icon = this.getAttribute("icon") || "activity";
    const sub = this.getAttribute("sub") || "";
    this.innerHTML = `<div class="stat-pill tone-${tone}"><span class="stat-icon">${ico(icon)}</span><span><small>${esc(label)}</small><strong>${esc(value)}</strong>${sub ? `<em>${esc(sub)}</em>` : ""}</span></div>`;
    window.lucide?.createIcons();
  }
}
