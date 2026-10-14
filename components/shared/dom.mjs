export const ico = (name, cls = "") =>
  `<i data-lucide="${name}" class="${cls}"></i>`;

export const esc = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ],
  );

export const notify = (message, tone = "info") => {
  const host = document.querySelector(".app-main");
  if (!host) return;
  let toast = host.querySelector(".action-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "action-toast";
    host.appendChild(toast);
  }
  toast.dataset.tone = tone;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2800);
};
