/** Normalize user-facing status text into the legacy CSS class token. */
export const statusClass = (value) =>
  String(value)
    .toLowerCase()
    .replaceAll(" ", "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
