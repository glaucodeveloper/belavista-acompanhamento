export const stageOverlayKey = (value) => {
  const text = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (text.includes("terra")) return "terraplanagem";
  if (text.includes("dren")) return "drenagem";
  if (text.includes("agua")) return "rede-agua";
  if (text.includes("eletric")) return "rede-eletrica";
  if (text.includes("meio") || text.includes("fio") || text.includes("guia"))
    return "pavimentacao";
  if (text.includes("paviment")) return "pavimentacao";
  if (text.includes("projeto")) return "urbanizacao";
  if (
    text.includes("praca") ||
    text.includes("urban") ||
    text.includes("arbor")
  )
    return "urbanizacao";
  return "drenagem";
};

export const stageOverlayLabels = {
  terraplanagem: "Terraplanagem",
  drenagem: "Drenagem",
  "rede-agua": "Rede de água",
  "rede-eletrica": "Rede elétrica",
  pavimentacao: "Pavimentação",
  urbanizacao: "Praças / urbanização",
};

export const stageOverlayColors = {
  terraplanagem: 0xf1b832,
  drenagem: 0x3f9cff,
  "rede-agua": 0x32c5d9,
  "rede-eletrica": 0x9b7cff,
  pavimentacao: 0xff7c45,
  urbanizacao: 0x42be65,
};

export const normalizeStageOverlayKeysV1 = (value) => {
  const values = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  return [
    ...new Set(
      values
        .map((item) => {
          const raw = String(item).toLowerCase();
          return stageOverlayLabels[raw]
            ? raw
            : stageOverlayLabels[stageOverlayKey(item)]
              ? stageOverlayKey(item)
              : null;
        })
        .filter(Boolean),
    ),
  ];
};

export const blendStageOverlayColorV1 = (keys) => {
  const colors = normalizeStageOverlayKeysV1(keys)
    .map((key) => stageOverlayColors[key])
    .filter(Number.isFinite);
  if (!colors.length) return 0x2fe6ae;
  const channel = (shift) =>
    Math.round(
      colors.reduce((sum, color) => sum + ((color >> shift) & 255), 0) /
        colors.length,
    );
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

export const stageOverlayLabelV1 = (keys) =>
  normalizeStageOverlayKeysV1(keys)
    .map((key) => stageOverlayLabels[key])
    .join(" + ") || "Nenhum highlight";
