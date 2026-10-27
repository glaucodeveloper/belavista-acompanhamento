// BELAVISTA_PROPOSAL_VISION_INFERENCE_V1
// Contrato compartilhado para a extração visual de dados comerciais.

export const PROPOSAL_VISION_MAX_BYTES = 6_000_000;
export const PROPOSAL_VISION_MIME_TYPES = Object.freeze([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const PROPOSAL_VISION_PROMPT = `
Analise visualmente o documento ou imagem anexado e extraia somente os dados
comerciais de uma proposta de reserva de lote. Não invente dados: use string
vazia quando o campo não estiver legível ou não aparecer. Responda SOMENTE com
JSON válido nesta forma:
{
  "text": "Resumo curto do que foi extraído",
  "proposal": {
    "client": "nome do cliente comprador",
    "lot": "quadra/lote ou identificação do lote",
    "value": "valor proposto exatamente como aparece",
    "payment": "condição de pagamento exatamente como aparece",
    "quadra": "descrição da quadra, se houver",
    "lotArea": "área do lote, se houver",
    "seller": "vendedor ou proprietário, se houver",
    "confidence": 0
  }
}
O campo confidence deve ser um número entre 0 e 1. Não inclua explicações fora
do JSON e não exponha raciocínio interno.`.trim();

const text = (value, max = 1200) => String(value ?? "").trim().slice(0, max);

const parseJsonCandidate = (value) => {
  if (value && typeof value === "object") return value;
  const raw = text(value, 12_000)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

export const normalizeProposalVisionDraft = (value = {}) => {
  const source = value?.proposal && typeof value.proposal === "object"
    ? value.proposal
    : value?.extracted && typeof value.extracted === "object"
      ? value.extracted
      : value;
  const draft = {
    client: text(source?.client || source?.cliente || source?.buyerName),
    lot: text(source?.lot || source?.lote || source?.lotId),
    value: text(source?.value || source?.valor || source?.price),
    payment: text(source?.payment || source?.paymentCondition || source?.condition || source?.condicao),
    quadra: text(source?.quadra || source?.block || source?.blockDescription),
    lotArea: text(source?.lotArea || source?.area || source?.areaM2),
    seller: text(source?.seller || source?.vendedor || source?.owner),
    confidence: Number.isFinite(Number(source?.confidence))
      ? Math.max(0, Math.min(1, Number(source.confidence)))
      : null,
  };
  return Object.values(draft).some((item) => item !== "" && item !== null)
    ? draft
    : null;
};

export const parseProposalVisionPayload = (payload = {}) => {
  const candidates = [payload?.proposal, payload?.extracted, payload?.structured, payload?.text, payload?.reply, payload?.result];
  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);
    const draft = normalizeProposalVisionDraft(parsed || candidate);
    if (draft) return draft;
  }
  return null;
};

export const readProposalImageAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return reject(new Error("Selecione um anexo de imagem."));
    const mimeType = String(file.type || "").toLowerCase();
    if (!PROPOSAL_VISION_MIME_TYPES.includes(mimeType)) {
      return reject(new Error("A inferência visual aceita PNG, JPEG ou WEBP."));
    }
    if (Number(file.size || 0) > PROPOSAL_VISION_MAX_BYTES) {
      return reject(new Error("A imagem para inferência deve ter até 6 MB."));
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
