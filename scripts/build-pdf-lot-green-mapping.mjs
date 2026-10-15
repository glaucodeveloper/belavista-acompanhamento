import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const labels = JSON.parse(
  fs.readFileSync(path.join(root, "assets/data/pdf-lot-labels-v1.json"), "utf8"),
).labels;
const polygons = JSON.parse(
  fs.readFileSync(path.join(root, "assets/data/masterplan-lot-polygons-v2.json"), "utf8"),
).lots;

// Homografia validada visualmente entre a prancha sem fundo e o recorte RGBA.
// Ela leva a página da prancha (1800 × 2098) às coordenadas do overlay (2886 × 3468).
const H = [
  [2.0154851963206397, -0.00042687649519606495, -425.1326438963259],
  [0.000029579630274385108, 2.0148904755011023, -238.49388682277552],
  [0.000000042093879009579067, -0.00000016638699587332165, 1],
];
const sourceSize = { width: 1800, height: 2098 };
const overlaySize = { width: 2886, height: 3468 };
const invalidOfficialLots = new Set([23, 41, 48, 69, 114, 133, 164, 195, 208, 212]);

function project({ u, v }) {
  const x = u * sourceSize.width;
  const y = v * sourceSize.height;
  const denominator = H[2][0] * x + H[2][1] * y + H[2][2];
  return {
    x: (H[0][0] * x + H[0][1] * y + H[0][2]) / denominator,
    y: (H[1][0] * x + H[1][1] * y + H[1][2]) / denominator,
  };
}

function signedDistance(point, polygon) {
  let inside = false;
  let minDistanceSquared = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    const [ax, ay] = polygon[index];
    const [bx, by] = polygon[(index + 1) % polygon.length];
    if ((ay > point.y) !== (by > point.y) && point.x < ((bx - ax) * (point.y - ay)) / (by - ay) + ax) inside = !inside;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / (dx * dx + dy * dy || 1)));
    const px = ax + t * dx;
    const py = ay + t * dy;
    minDistanceSquared = Math.min(minDistanceSquared, (point.x - px) ** 2 + (point.y - py) ** 2);
  }
  return (inside ? 1 : -1) * Math.sqrt(minDistanceSquared);
}

const polygonEntries = Object.entries(polygons).map(([greenPolygonId, points]) => ({
  greenPolygonId,
  polygon: points.map(([u, v]) => [u * overlaySize.width, v * overlaySize.height]),
}));
const candidates = labels
  .filter((label) => !invalidOfficialLots.has(Number(label.number)))
  .map((label) => {
    const point = project(label);
    return {
      label,
      point,
      candidates: polygonEntries
        .map((entry) => ({ ...entry, signedDistance: signedDistance(point, entry.polygon) }))
        .sort((left, right) => right.signedDistance - left.signedDistance),
    };
  });

// Primeiro fixa os círculos que já caem dentro de um polígono; para os demais,
// escolhe o polígono verde ainda livre mais próximo. Isso evita que uma área
// residual receba dois números por causa de círculos impressos no acostamento.
const claimed = new Set();
const resolved = new Map();
for (const candidate of [...candidates].sort((a, b) => b.candidates[0].signedDistance - a.candidates[0].signedDistance)) {
  const pick = candidate.candidates.find((entry) => entry.signedDistance >= 0 && !claimed.has(entry.greenPolygonId));
  if (pick) {
    claimed.add(pick.greenPolygonId);
    resolved.set(candidate.label.lotId, { candidate, pick, anchor: candidate.point, mode: "pdf-circle" });
  }
}
for (const candidate of candidates.filter(({ label }) => !resolved.has(label.lotId))) {
  const pick = candidate.candidates.find((entry) => !claimed.has(entry.greenPolygonId));
  if (!pick) throw new Error(`Sem polígono verde disponível para ${candidate.label.lotId}`);
  claimed.add(pick.greenPolygonId);
  // O polígono alternativo define apenas a área clicável. A posição visual
  // permanece exatamente no círculo numerado da prancha original.
  resolved.set(candidate.label.lotId, { candidate, pick, anchor: candidate.point, mode: "pdf-circle" });
}

const mappings = candidates
  .map(({ label }) => resolved.get(label.lotId))
  .map(({ candidate, pick, anchor, mode }) => ({
    lotId: candidate.label.lotId,
    number: Number(candidate.label.number),
    greenPolygonId: pick.greenPolygonId,
    u: Number((anchor.x / overlaySize.width).toFixed(8)),
    v: Number((anchor.y / overlaySize.height).toFixed(8)),
    anchor: mode,
  }))
  .sort((left, right) => left.number - right.number);

const output = {
  version: 1,
  coordinateSpace: "normalized-masterplan-overlay-top-left",
  source: {
    labels: "pdf-lot-labels-v1.json",
    polygons: "masterplan-lot-polygons-v2.json",
    overlay: "alianca-park-masterplan-lot-overlay-v2.webp",
    method: "homography PDF circles for marker anchors; unique nearest polygon fallback for hit areas",
    excludedOfficialLots: [...invalidOfficialLots].sort((a, b) => a - b),
  },
  mappings,
};
fs.writeFileSync(
  path.join(root, "assets/data/pdf-lot-green-mapping-v1.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(JSON.stringify({ mappings: mappings.length, uniquePolygons: claimed.size, centroidFallbacks: mappings.filter((item) => item.anchor !== "pdf-circle").length }));
