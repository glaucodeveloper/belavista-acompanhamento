// Compatibility element used by the administrative Leads workspace.
// The public landing page and its interactions are owned by
// AtlasPublicLeadsSurface in frontend/src/components.ts.
class PublicLeadForm extends HTMLElement {
  connectedCallback() {
    if (!this.querySelector("public-lead-chat")) {
      this.innerHTML = "<public-lead-chat></public-lead-chat>";
    }
  }
}

if (!customElements.get("public-lead-form")) {
  customElements.define("public-lead-form", PublicLeadForm);
}
