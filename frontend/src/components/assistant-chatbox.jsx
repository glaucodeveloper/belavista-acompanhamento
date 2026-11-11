import React, { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Camera, Mic, Square, X } from "lucide-react";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "./ai-elements/attachments.jsx";
import { readOutbox, removeOutboxJob, saveOutboxJob } from "../outbox.js";

const WORKER =
  "https://belavista-cloudflare-worker.icaroglaucooliveira.workers.dev";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const NativeVoz = registerPlugin('NativeVoz');
const INFERENCE_TIMEOUT_MS = 120_000;
const formatSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function toBase64(file) {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  });
}

async function toInferenceImage(blob) {
  const mimeType = String(blob?.type || "").toLowerCase();
  const original = async () => ({ mimeType, data: await toBase64(blob) });
  if (!/^image\/(png|jpeg)$/.test(mimeType) || typeof createImageBitmap !== "function")
    return original();

  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return original();
  }

  try {
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const needsResize = scale < 1;
    const needsCompression = blob.size > 3 * 1024 * 1024;
    if (!needsResize && !needsCompression) return original();

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: mimeType === "image/png" });
    if (!context) return original();
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const encode = (type, quality) =>
      new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    let optimized = await encode(mimeType, mimeType === "image/jpeg" ? 0.9 : undefined);
    if (!optimized) return original();
    if (optimized.size > 8 * 1024 * 1024)
      optimized = await encode("image/jpeg", 0.82);
    if (!optimized || (!needsResize && optimized.size >= blob.size)) return original();
    return { mimeType: optimized.type || mimeType, data: await toBase64(optimized) };
  } catch {
    return original();
  } finally {
    bitmap.close?.();
  }
}

// Em DANFEs fotografados de lado, o total costuma ficar no quadro financeiro
// à direita. Enviamos o recorte apenas como apoio à leitura, sem alterar o anexo.
async function toInvoiceTotalCrop(blob) {
  if (!/^image\/(png|jpeg)$/i.test(blob?.type || "") || typeof createImageBitmap !== "function") return null;
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
    if (bitmap.width >= bitmap.height) return null;
    const rotated = document.createElement("canvas");
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    rotated.width = Math.max(1, Math.round(bitmap.height * scale));
    rotated.height = Math.max(1, Math.round(bitmap.width * scale));
    const context = rotated.getContext("2d");
    if (!context) return null;
    context.translate(0, rotated.height); context.rotate(-Math.PI / 2);
    context.drawImage(bitmap, 0, 0, rotated.height, rotated.width);
    const crop = document.createElement("canvas");
    const sx = Math.round(rotated.width * .45), sy = Math.round(rotated.height * .22);
    const sw = rotated.width - sx, sh = Math.round(rotated.height * .32);
    crop.width = Math.min(1600, sw * 2); crop.height = Math.round(crop.width * sh / sw);
    const cropContext = crop.getContext("2d");
    if (!cropContext) return null;
    cropContext.drawImage(rotated, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
    const output = await new Promise(resolve => crop.toBlob(resolve, "image/jpeg", .92));
    return output ? { mimeType: "image/jpeg", data: await toBase64(output) } : null;
  } catch { return null; }
  finally { bitmap?.close?.(); }
}

const statusLabels = {
  pending: "Para processar",
  processing: "Processando…",
  completed: "Processado",
  failed: "Falha no processamento",
};

function mergeAnalysisPatch(result, patch) {
  const recognized = patch?.recognized || {};
  const currentItems = result.recognized?.items || [];
  const patchedItems = Array.isArray(recognized.items)
      ? recognized.items.map((item, index) => {
        const merged = { ...(currentItems[index] || {}), ...item };
        if (typeof item.description === "string" && item.description.trim()) {
          const previousDescription = String(currentItems[index]?.description || "").trim();
          if (previousDescription && previousDescription !== item.description.trim() && (!item.activityId || !item.stageId))
            for (const key of ["activityId", "activityName", "stageId", "stageName", "activityConfidence"])
              delete merged[key];
          merged.descriptionComplete = true;
          delete merged.descriptionMismatch;
        }
        return merged;
      })
    : undefined;
  return {
    ...result,
    question: null,
    needsClarification: false,
    ...(patch?.category ? { category: patch.category } : {}),
    ...(patch?.fieldEvidence ? {
      fieldEvidence: {
        ...(result.fieldEvidence || {}),
        ...Object.fromEntries(Object.entries(patch.fieldEvidence).filter(([, value]) => value !== null && value !== undefined)),
      },
    } : {}),
    recognized: {
      ...(result.recognized || {}),
      ...Object.fromEntries(
        Object.entries(recognized).filter(([, value]) => value !== null && value !== undefined),
      ),
      ...(patchedItems ? { items: patchedItems } : {}),
    },
    allocation: {
      ...(result.allocation || {}),
      ...(patch?.allocation || {}),
    },
  };
}

function resolveInference(result, lots, activities) {
  const category = result.category || "unknown";
  const recognized = { ...(result.recognized || {}) };
  const allocation = { ...(result.allocation || {}) };
  const ask = question => ({ ready: false, question, result });

  if (result.intent === "stage_activity_evidence") {
    const evidence = { ...(result.fieldEvidence || {}) };
    const activity = activities.find(item => item.id === evidence.activityId && item.stageId === evidence.stageId);
    if (!String(evidence.summary || "").trim())
      return ask("Descreva o serviço visível nesta foto.");
    if (!activity)
      return ask("Qual atividade cadastrada nas etapas descreve melhor o serviço desta foto?");

    if (!evidence.confirmed && Number(evidence.activityConfidence || 0) < 0.82)
      return ask(`A foto parece corresponder a “${activity.name}”, na etapa “${activity.stageName}”. Confirma esse vínculo ou quer complementar o serviço observado?`);

    return {
      ready: true,
      result: {
        ...result,
        category: null,
        direction: null,
        needsClarification: false,
        question: null,
        recognized: { ...recognized, amount: null, items: [] },
        fieldEvidence: {
          ...evidence,
          activityId: activity.id,
          activityName: activity.name,
          stageId: activity.stageId,
          stageName: activity.stageName,
        },
        allocation: { ...allocation, destination: "stages", activityId: activity.id, stageId: activity.stageId },
      },
    };
  }

  if (category === "unknown")
    return ask(result.question || "Qual é a categoria desta nota: entrada recebida, despesa de material ou despesa de serviço?");

  if (category === "entry_receipt") {
    let matches = [];
    if (allocation.lotId) matches = lots.filter(lot => lot.id === allocation.lotId);
    if (!matches.length && recognized.lotLabel) {
      const target = String(recognized.lotLabel).toLocaleUpperCase("pt-BR").replace(/[^A-Z0-9]/g, "");
      matches = lots.filter(lot => String(lot.label || "").toLocaleUpperCase("pt-BR").replace(/[^A-Z0-9]/g, "") === target);
    }
    if (matches.length !== 1)
      return ask(result.question || (recognized.lotLabel ? `Não encontrei um lote único para “${recognized.lotLabel}”. Qual lote recebeu esta entrada?` : "Qual lote recebeu esta entrada?"));
    if (!(Number(recognized.amount) > 0))
      return ask(result.question || "Qual valor devo registrar como entrada recebida?");
    return {
      ready: true,
      result: {
        ...result,
        category,
        direction: "entrada",
        needsClarification: false,
        question: null,
        recognized,
        allocation: { ...allocation, destination: "lots", lotId: matches[0].id, lotLabel: matches[0].label },
      },
    };
  }

  if (!['material_expense', 'service_expense'].includes(category))
    return ask("Qual categoria devo usar para esta nota?");

  const items = Array.isArray(recognized.items) ? recognized.items.map(item => ({ ...item })) : [];
  if (!items.length && !result.needsDescription && String(recognized.description || "").trim()) {
    const inferredItem = { description: String(recognized.description).trim() };
    if (Number(recognized.amount) > 0) inferredItem.amount = Number(recognized.amount);
    for (const key of ["activityId", "activityName", "stageId", "stageName"])
      if (recognized[key]) inferredItem[key] = recognized[key];
    items.push(inferredItem);
  }
  if (!items.length)
    return ask(result.question || "Não identifiquei a descrição da linha da nota. Qual é o texto exato do item?");

  if (items.some(item => item.descriptionMismatch || item.descriptionComplete === false))
    return ask(result.question || "A descrição não corresponde ao NCM impresso. Confirme o texto da nota ou informe a descrição correta.");
  if (items.some(item => !String(item.description || "").trim()))
    return ask(result.question || "Qual é a descrição exata de cada item da nota?");

  if (items.length === 1 && !(Number(items[0].amount) > 0) && Number(recognized.amount) > 0)
    items[0].amount = Number(recognized.amount);
  for (const item of items)
    if (!(Number(item.amount) > 0) && Number(item.unitPrice) > 0)
      item.amount = Number(item.unitPrice) * Number(item.quantity || 1);
  const missingLineValue = items.some(item => !(Number(item.amount) > 0 || Number(item.unitPrice) > 0));
  if (missingLineValue)
    return ask(result.question || "Qual é o valor de cada item que está faltando na nota?");

  const officeDestination = allocation.department === "Escritório" || items.every(item => item.department === "Escritório");
  if (!officeDestination && items.some(item => !activities.some(activity => activity.id === item.activityId && activity.stageId === item.stageId)))
    return ask(result.question || "Não encontrei um vínculo único no catálogo. A qual atividade de etapa devo associar cada item?");
  if (result.needsClarification && result.question)
    return ask(result.question);

  const total = items.reduce((sum, item) => sum + Number(item.amount ?? (Number(item.unitPrice) * Number(item.quantity || 1))), 0);
  return {
    ready: true,
    result: {
      ...result,
      category,
      direction: "saida",
      needsClarification: false,
      question: null,
      recognized: { ...recognized, amount: Number(recognized.amount) > 0 ? Number(recognized.amount) : total, items },
      allocation: { ...allocation, destination: category === "material_expense" ? "materials" : "services", ...(officeDestination ? { department: "Escritório" } : {}) },
    },
  };
}

function inferenceSuccessReply(result) {
  if (result.intent === "stage_activity_evidence") {
    const evidence = result.fieldEvidence || {};
    const activity = [evidence.stageName, evidence.activityName].filter(Boolean).join(" · ");
    return `Foto anexada à atividade${activity ? ` ${activity}` : ""}${evidence.location ? ` · ${evidence.location}` : ""}. ${evidence.summary}${evidence.userNotes ? ` Complemento: ${evidence.userNotes}` : ""} O progresso da etapa não foi alterado.`;
  }
  if (result.category === "entry_receipt") {
    const lot = result.allocation?.lotLabel || result.recognized?.lotLabel || "lote";
    return `Entrada de ${Number(result.recognized?.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} registrada em ${lot}.`;
  }
  const count = result.recognized?.items?.length || 1;
  const destination = result.category === "service_expense" ? "Serviços" : "Materiais";
  return `${count === 1 ? "Item" : `${count} itens`} identificado${count === 1 ? "" : "s"} e adicionado${count === 1 ? "" : "s"} automaticamente a ${destination}.`;
}

function CatalogMaterialForm({ stages, inferredAmount, inferredDate, onSave }) {
  const dialogRef = useRef(null);
  const titleId = React.useId();
  const [stageId, setStageId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [materialIndex, setMaterialIndex] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState(() => typeof inferredAmount === "number" && Number.isFinite(inferredAmount) ? inferredAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const [date, setDate] = useState(() => /^\d{4}-\d{2}-\d{2}$/.test(String(inferredDate || "")) ? inferredDate : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const stage = stages.find(item => item.id === stageId);
  const activity = stage?.activities?.find(item => item.id === activityId);
  const material = materialIndex === "" ? null : activity?.materials?.[Number(materialIndex)];
  async function submit(event) {
    event.preventDefault();
    const value = Number(amount.includes(",") ? amount.replace(/\./g, "").replace(",", ".") : amount);
    if (!(Number(quantity) > 0) || !amount.trim() || !Number.isFinite(value) || value < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Informe a data da nota, a quantidade e um valor total válido.");
      return;
    }
    setSaving(true); setError("");
    try { await onSave({ stage, activity, material, quantity: Number(quantity), amount: value, date }); dialogRef.current?.close(); }
    catch (err) { setError(err.message || "Não foi possível salvar o material."); }
    finally { setSaving(false); }
  }
  return <div className="material-allocation">
    <div className="material-allocation-heading"><strong>{material?.name || "Material não selecionado"}</strong><button type="button" onClick={() => dialogRef.current?.showModal()}>Alocar</button></div>
    <dialog ref={dialogRef} className="material-allocation-dialog" aria-labelledby={titleId} onCancel={event => { if (saving) event.preventDefault(); }}>
    <form onSubmit={submit} className="catalog-material-form">
      <header className="material-allocation-dialog-header"><div><small>DESTINO DO MATERIAL</small><h2 id={titleId}>Confirmar alocação</h2></div><button type="button" className="material-close" disabled={saving} onClick={() => dialogRef.current?.close()} aria-label="Fechar">×</button></header>
    <div className="catalog-material-picker">
      <p>Etapa, atividade e material são opcionais. Confira os valores da nota.</p>
      <label>Etapa (opcional)<select value={stageId} onChange={e => { setStageId(e.target.value); setActivityId(""); setMaterialIndex(""); }}><option value="">Não informada</option>{stages.filter(s => s.activities?.some(a => a.materials?.length)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Atividade (opcional)<select value={activityId} onChange={e => { setActivityId(e.target.value); setMaterialIndex(""); }}><option value="">Não informada</option>{(stage?.activities || []).filter(a => a.materials?.length).map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
      <label>Material (opcional)<select value={materialIndex} onChange={e => setMaterialIndex(e.target.value)}><option value="">Não informado</option>{(activity?.materials || []).map((m, index) => <option key={m.id || index} value={index}>{m.name}</option>)}</select></label>
    </div>
      <p className="catalog-destination">Destino: <strong>Materiais</strong> · Categoria: <strong>{activity?.title || 'Sem atividade'}</strong>{stage?.name ? ` · ${stage.name}` : ''}</p>
      <label>Data da nota<input required type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      <p>{date ? "Data sugerida pela nota. Confira antes de confirmar." : "Informe a data de emissão impressa na nota."}</p>
      <label>Quantidade<input required type="number" min="0.001" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      <label>Valor total (R$)<input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" /></label>
      <p>{typeof inferredAmount === "number" && Number.isFinite(inferredAmount) ? "Valor sugerido pela leitura da nota. Confira antes de confirmar." : "Não foi possível identificar o valor total. Confira a nota e informe-o."}</p>
      {error && <p role="alert">{error}</p>}
      <footer className="material-allocation-actions"><button type="button" className="material-cancel" disabled={saving} onClick={() => dialogRef.current?.close()}>Cancelar</button><button type="submit" disabled={saving}>{saving ? "Salvando…" : "Confirmar alocação"}</button></footer>
    </form></dialog></div>;
}

export function AssistantChatbox({
  lots = [],
  stages = [],
  inferenceReady = false,
  onAllocate,
  owner = "local",
}) {
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [queueVersion, setQueueVersion] = useState(0);
  const [outboxReady, setOutboxReady] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceProgress, setVoiceProgress] = useState(null);
  const voiceRecorderRef = useRef(null), voiceStreamRef = useRef(null), vozRef = useRef(null);
  const inputRef = useRef(null);
  const audioInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const objectUrlsRef = useRef(new Set());
  const activityOptions = stages.flatMap((stage) =>
    (stage.activities || []).map((activity) => ({
      id: activity.id,
      name: activity.title,
      description: [
        activity.description || activity.summary || "",
        ...(activity.properties || [])
          .filter((property) => property.label || property.value)
          .map(
            (property) =>
              `${property.label || "Detalhe"}: ${property.value || ""}`,
          ),
      ]
        .filter(Boolean)
        .join("\n"),
      stageId: stage.id,
      stageName: stage.name,
      stageDescription: stage.description || "",
    })),
  );

  useEffect(() => () => {
    const recorder = voiceRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    voiceStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  async function transcribeAudio(blob) {
    setError('');
    try {
      setVoiceState('loading'); setVoiceProgress(null);
      const audio = new AudioContext();
      let decoded;
      try { decoded = await audio.decodeAudioData(await blob.arrayBuffer()); }
      finally { await audio.close(); }
      if (!decoded.duration || decoded.duration > 120) throw new Error('Use um áudio de até 2 minutos.');
      const resampler = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
      const source = resampler.createBufferSource(); source.buffer = decoded; source.connect(resampler.destination); source.start();
      const samples = (await resampler.startRendering()).getChannelData(0);
      let result;
      if (Capacitor.getPlatform() === 'android') {
        result = await NativeVoz.transcribe({ samplesBase64: await toBase64(new Blob([samples])), sampleRate: 16000 });
      } else {
        if (!vozRef.current) {
          const { Voz } = await import('@desert-ant-labs/voz');
          vozRef.current = await Voz.load({ onProgress: value => setVoiceProgress(Math.round(value * 100)) });
        }
        setVoiceState('transcribing');
        result = await vozRef.current.transcribe({ samples, sampleRate: 16000 });
      }
      if (!result.text?.trim()) throw new Error('Nenhuma fala foi reconhecida. Tente novamente.');
      setText(current => [current.trim(), result.text.trim()].filter(Boolean).join(' '));
    } catch (err) { setError(err.message || 'Não foi possível transcrever o áudio.'); }
    finally { setVoiceState('idle'); setVoiceProgress(null); }
  }

  async function toggleVoice() {
    if (voiceState === 'recording') { voiceRecorderRef.current?.stop(); return; }
    if (voiceState !== 'idle') return;
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Gravação de voz indisponível neste dispositivo.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      voiceRecorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { stream.getTracks().forEach(track => track.stop()); setVoiceState('idle'); setError('Não foi possível gravar o áudio.'); };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        voiceStreamRef.current = null; voiceRecorderRef.current = null;
        transcribeAudio(new Blob(chunks, { type: recorder.mimeType }));
      };
      recorder.start(); setVoiceState('recording');
    } catch (err) {
      voiceStreamRef.current?.getTracks().forEach(track => track.stop());
      voiceStreamRef.current = null; setVoiceState('idle');
      setError(err.name === 'NotAllowedError' ? 'Permita o acesso ao microfone para gravar.' : (err.message || 'Não foi possível iniciar a gravação.'));
    }
  }

  useEffect(() => {
    let cancelled = false;
    const refreshQueue = async () => {
      try {
        const jobs = await readOutbox(owner);
        const recovered = jobs.map((job) =>
          job.status === "processing" ? { ...job, status: "pending" } : job,
        );
        for (const job of recovered)
          if (job.status !== jobs.find((item) => item.id === job.id)?.status)
            await saveOutboxJob(job);
        if (cancelled) return;
        setMessages(
          recovered.map((job) => ({
            id: job.id,
            text: job.text,
            sourceMessageId: job.editTarget?.messageId,
            files: job.files.map((file) => {
              const url = URL.createObjectURL(file.blob);
              objectUrlsRef.current.add(url);
              return {
                id: file.id,
                filename: file.name,
                mediaType: file.type,
                size: file.size,
                url,
              };
            }),
            analyses: (job.analysisOutputs || []).map((item) => ({
              fileId: item.fileId,
              filename: item.filename,
              result: item.result,
              applied: Boolean(item.applied),
              messageId: job.id,
            })),
            status: job.status,
            error: job.error || "",
            reply: job.reply || "",
          })),
        );
        setQueueCount(
          recovered.filter((job) =>
            ["pending", "processing"].includes(job.status),
          ).length,
        );
        setOutboxReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(`Não foi possível abrir a fila local: ${err.message}`);
          setOutboxReady(true);
        }
      }
    };
    refreshQueue();
    const onlineHandler = () => {
      setOnline(true);
      setQueueVersion((value) => value + 1);
    };
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    const signalPoll = window.setInterval(() => {
      setOnline(navigator.onLine);
    }, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.clearInterval(signalPoll);
    };
  }, [owner]);

  useEffect(
    () => () =>
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen) return undefined;
    let cancelled = false;
    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "Câmera indisponível neste ambiente. Use Anexar para escolher uma imagem.",
          );
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.name === "NotAllowedError"
              ? "Permita o acesso à câmera para tirar uma foto."
              : err.message || "Não foi possível abrir a câmera.",
          );
          setCameraOpen(false);
        }
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  function addFiles(incoming) {
    setError("");
    const accepted = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        setError("Cada anexo pode ter no máximo 20 MB.");
        continue;
      }
      if (
        file.type.startsWith("image/") &&
        !["image/png", "image/jpeg"].includes(file.type)
      ) {
        setError("A leitura automática aceita imagens PNG e JPEG.");
        continue;
      }
      if (file.type.startsWith("image/") && file.size > 8 * 1024 * 1024) {
        setError("Imagens para leitura automática podem ter até 8 MB.");
        continue;
      }
      if (
        files.some(
          (existing) =>
            existing.name === file.name && existing.size === file.size,
        )
      )
        continue;
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        url,
        file,
      });
    }
    setFiles((current) => [...current, ...accepted]);
  }

  function removeFile(id) {
    setFiles((current) => {
      const removed = current.find((file) => file.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
        objectUrlsRef.current.delete(removed.url);
      }
      return current.filter((file) => file.id !== id);
    });
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setError("A câmera ainda está iniciando. Tente novamente em instantes.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas
      .getContext("2d")
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Não foi possível capturar a imagem.");
          return;
        }
        addFiles([
          new File(
            [blob],
            `foto-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
            { type: "image/jpeg" },
          ),
        ]);
        setCameraOpen(false);
      },
      "image/jpeg",
      0.9,
    );
  }

  async function send(event) {
    event.preventDefault();
    if (!text.trim() && !files.length) return;
    setBusy(true);
    setError("");
    const pendingAnalysis = files.length || !/\b(corrig(?:ir|e|a)|alter(?:ar|e|a)|ajust(?:ar|e|a)|complement(?:ar|e|a))\b/i.test(text)
      ? null
      : [...messages]
          .reverse()
          .flatMap((message) =>
            [...(message.analyses || [])]
              .reverse()
              .map((analysis) => ({ message, analysis })),
          )
          .find(({ analysis }) => !analysis.applied);
    try {
    const job = {
      id: crypto.randomUUID(),
      owner,
      text: text.trim(),
      createdAt: Date.now(),
      status: "pending",
      error: "",
      analysisOutputs: [],
      ...(pendingAnalysis
        ? {
            editTarget: {
              messageId: pendingAnalysis.message.id,
              fileId: pendingAnalysis.analysis.fileId,
              filename: pendingAnalysis.analysis.filename,
              result: pendingAnalysis.analysis.result,
            },
          }
        : {}),
      files: await Promise.all(
        files.map(async ({ id, name, size, type, file }) => {
          // Android content-provider Files can preview correctly but persist as
          // zero-byte File objects in IndexedDB. Copy bytes into a plain Blob
          // before queuing so the later inference request receives the image.
          const bytes = await file.arrayBuffer();
          return {
            id,
            name,
            size,
            type,
            blob: new Blob([bytes], { type }),
          };
        }),
      ),
    };
      await saveOutboxJob(job);
      setMessages((current) => [
        ...current,
        {
          id: job.id,
          text: job.text,
          sourceMessageId: job.editTarget?.messageId,
          files: files.map(({ id, name, size, type, url }) => ({
            id,
            filename: name,
            size,
            mediaType: type,
            url,
          })),
          analyses: [],
          status: "pending",
          error: "",
        },
      ]);
      setQueueCount((value) => value + 1);
      setQueueVersion((value) => value + 1);
      setText("");
      setFiles([]);
    } catch (err) {
      setError(`Não foi possível guardar para processamento: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!online || !outboxReady || !inferenceReady || processingRef.current)
      return;
    async function processQueue() {
      processingRef.current = true;
      try {
        const jobs = await readOutbox(owner);
        for (const queued of jobs) {
          if (!mountedRef.current || !navigator.onLine) break;
          if (!["pending", "processing"].includes(queued.status)) continue;
          const token = sessionStorage.getItem("alianca-session-token");
          if (!token) {
            const failed = {
              ...queued,
              status: "failed",
              error: "Entre novamente para continuar o processamento.",
            };
            await saveOutboxJob(failed);
            setMessages((current) =>
              current.map((message) =>
                message.id === queued.id
                  ? { ...message, status: "failed", error: failed.error }
                  : message,
              ),
            );
            continue;
          }
          const processing = { ...queued, status: "processing", error: "" };
          await saveOutboxJob(processing);
          setMessages((current) =>
            current.map((message) =>
              message.id === queued.id
                ? { ...message, status: "processing", error: "" }
                : message,
            ),
          );
          let analysisOutputs = [...(queued.analysisOutputs || [])];
          try {
            if (!queued.files.length && !queued.editTarget) {
              const controller = new AbortController();
              const timeout = window.setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);
              let response;
              try {
                response = await fetch(`${WORKER}/api/assistant/message`, {
                  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: queued.text, stages: stages.map(stage => ({ name: stage.name, status: stage.status, activities: (stage.activities || []).map(activity => ({ title: activity.title })) })) }), signal: controller.signal,
                });
              } finally { window.clearTimeout(timeout); }
              const result = await response.json().catch(() => ({}));
              if (!response.ok || !result.reply) {
                const failure = new Error(result.error || 'Não foi possível responder à mensagem.');
                failure.status = response.status;
                failure.retryable = result.retryable ?? (response.status === 429 || response.status >= 500);
                throw failure;
              }
              await saveOutboxJob({ ...processing, status: 'completed', error: '', reply: result.reply });
              setMessages(current => current.map(message => message.id === queued.id ? { ...message, status: 'completed', error: '', reply: result.reply } : message));
              continue;
            }
            let analysisEdit = null;
            if (!queued.files.length && queued.editTarget) {
              const activities = stages.flatMap((stage) =>
                (stage.activities || []).map((activity) => ({
                  id: activity.id,
                  name: activity.title,
                  stageId: stage.id,
                  stageName: stage.name,
                  description: activity.description || activity.summary || "",
                  materials: (activity.materials || []).map((material) => ({
                    name: material.name || "",
                  })),
                })),
              );
              const editController = new AbortController();
              const editTimeout = window.setTimeout(
                () => editController.abort(),
                INFERENCE_TIMEOUT_MS,
              );
              let response;
              try {
                response = await fetch(
                  `${WORKER}/api/inference/analysis-edit`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      instruction: queued.text,
                      filename: queued.editTarget.filename,
                      currentResult: queued.editTarget.result,
                      activities,
                      lots: lots.map(({ id, label, quadra }) => ({ id, label, quadra })),
                    }),
                    signal: editController.signal,
                  },
                );
              } catch (err) {
                if (err.name === "AbortError")
                  throw new Error(
                    "A revisão excedeu 120 segundos. Tente novamente quando o Worker estiver disponível.",
                  );
                throw err;
              } finally {
                window.clearTimeout(editTimeout);
              }
              analysisEdit = await response.json().catch(() => ({}));
              if (!response.ok) {
                const failure = new Error(
                  analysisEdit.error || "Não foi possível revisar a nota.",
                );
                failure.status = response.status;
                failure.retryable =
                  response.status === 429 || response.status >= 500;
                throw failure;
              }
              const updated = mergeAnalysisPatch(
                queued.editTarget.result,
                analysisEdit.patch,
              );
              const resolution = resolveInference(updated, lots, activityOptions);
              const outputId = queued.editTarget.fileId || queued.editTarget.filename;
              const inferenceId = `${queued.editTarget.messageId}:${outputId}`;
              let finalResult = resolution.result;
              let reply = resolution.ready
                ? inferenceSuccessReply(finalResult)
                : resolution.question || analysisEdit.reply || "Ainda falta um detalhe para classificar esta nota.";
              const sourceJobs = await readOutbox(owner);
              const sourceJob = sourceJobs.find(item => item.id === queued.editTarget.messageId);
              if (resolution.ready) {
                if (!onAllocate) throw new Error("O salvamento automático do registro não está disponível.");
                const sourceBlob = sourceJob?.files?.find(file => file.id === outputId || file.name === queued.editTarget.filename)?.blob;
                const sourceImage = finalResult.intent === "stage_activity_evidence" && sourceBlob
                  ? await toInferenceImage(sourceBlob)
                  : null;
                if (finalResult.intent === "stage_activity_evidence" && !sourceImage)
                  throw new Error("A imagem original não está disponível para anexar à atividade. Reenvie a foto.");
                await onAllocate({ ...finalResult, inferenceId, ...(sourceImage ? { sourceImage } : {}) });
              } else {
                finalResult = {
                  ...finalResult,
                  needsClarification: true,
                  question: resolution.question,
                };
              }

              if (sourceJob) {
                const sourceOutputs = (sourceJob.analysisOutputs || []).map((item) =>
                  (queued.editTarget.fileId && item.fileId === queued.editTarget.fileId) ||
                  (!queued.editTarget.fileId && item.filename === queued.editTarget.filename)
                    ? {
                        ...item,
                        result: finalResult,
                        applied: resolution.ready,
                        reply,
                      }
                    : item,
                );
                await saveOutboxJob({
                  ...sourceJob,
                  status: "completed",
                  error: "",
                  reply,
                  analysisOutputs: sourceOutputs,
                });
              }
              await removeOutboxJob(queued.id);
              setMessages((current) =>
                current.map((message) => {
                  if (message.id === queued.id)
                    return { ...message, status: "completed", error: "", reply };
                  if (message.id === queued.editTarget.messageId)
                    return {
                      ...message,
                      analyses: message.analyses.map((item) =>
                        ((queued.editTarget.fileId && item.fileId === queued.editTarget.fileId) ||
                        (!queued.editTarget.fileId && item.filename === queued.editTarget.filename))
                          ? { ...item, result: finalResult, applied: resolution.ready }
                          : item,
                      ),
                    };
                  return message;
                }),
              );
              continue;
            }
            for (const file of queued.files.filter((item) =>
              item.type.startsWith("image/"),
            )) {
              if (analysisOutputs.some((item) => item.fileId === file.id))
                continue;
              const activities = stages.flatMap((stage) =>
                (stage.activities || []).map((activity) => ({
                  id: activity.id,
                  name: activity.title,
                  description: [
                    activity.description || activity.summary || "",
                    ...(activity.properties || [])
                      .filter((property) => property.label || property.value)
                      .map(
                        (property) =>
                          `${property.label || "Detalhe"}: ${property.value || ""}`,
                      ),
                  ]
                    .filter(Boolean)
                    .join("\n"),
                  properties: (activity.properties || []).map((property) => ({
                    label: property.label || "",
                    value: property.value || "",
                  })),
                  stageId: stage.id,
                  stageName: stage.name,
                  stageDescription: stage.description || "",
                  materials: (activity.materials || []).map((material) => ({
                    name: material.name || "",
                    quantity: material.quantity ?? material.plannedQuantity ?? null,
                    unit: material.unit || "",
                  })),
                })),
              );
              const stageCatalog = stages.map((stage) => ({
                id: stage.id,
                name: stage.name,
                description: stage.description || "",
                status: stage.status || "",
                peculiarities: stage.peculiarities || [],
                entryCriteria: (stage.entryCriteria || []).map((item) => item.label || item.name || ""),
                requiredEvidence: stage.requiredEvidence || [],
                materials: (stage.materials || []).map((material) => ({
                  name: material.name || "",
                  quantity: material.quantity ?? material.plannedQuantity ?? null,
                  unit: material.unit || "",
                })),
              }));
              const controller = new AbortController();
              const timeout = window.setTimeout(
                () => controller.abort(),
                INFERENCE_TIMEOUT_MS,
              );
              let response;
              try {
                response = await fetch(
                  `${WORKER}/api/inference/attachment`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      filename: file.name,
                      userContext: queued.text,
                      description: queued.text,
                      activities,
                      stages: stageCatalog,
                      image: await toInferenceImage(file.blob),
                      totalImage: await toInvoiceTotalCrop(file.blob),
                    }),
                    signal: controller.signal,
                  },
                );
              } catch (err) {
                if (err.name === "AbortError")
                  throw new Error(
                    "A inferência excedeu 120 segundos. Tente novamente quando o Worker estiver disponível.",
                  );
                throw err;
              } finally {
                window.clearTimeout(timeout);
              }
              const result = await response.json().catch(() => ({}));
              if (!response.ok) {
                const failure = new Error(
                  result.error || `Falha ao analisar ${file.name}.`,
                );
                failure.status = response.status;
                failure.retryable =
                  typeof result.retryable === "boolean"
                    ? result.retryable
                    : response.status === 429 ||
                      (response.status >= 500 &&
                        !/\bHTTP 4\d{2}\b/.test(result.error || ""));
                throw failure;
              }
              analysisOutputs.push({
                fileId: file.id,
                filename: file.name,
                result: result.intent === "stage_activity_evidence"
                  ? { ...result, evidenceId: crypto.randomUUID() }
                  : result,
              });
              await saveOutboxJob({ ...processing, analysisOutputs });
            }
            const resolvedOutputs = [];
            for (const output of analysisOutputs) {
              if (output.applied) {
                resolvedOutputs.push(output);
                continue;
              }
              const wantsMaterial = /\b(?:material|materiais)\b/i.test(queued.text || "");
              const resolution = wantsMaterial
                ? { ready: false, result: output.result, question: "Confira o destino e confirme o material escolhido." }
                : resolveInference(output.result, lots, activityOptions);
              let result = resolution.result;
              let reply;
              if (resolution.ready) {
                if (!onAllocate) throw new Error("O salvamento automático do registro não está disponível.");
                const inferenceId = `${queued.id}:${output.fileId || output.filename}`;
                const sourceFile = queued.files.find(file => file.id === output.fileId);
                const sourceImage = result.intent === "stage_activity_evidence" && sourceFile?.blob
                  ? await toInferenceImage(sourceFile.blob)
                  : null;
                if (result.intent === "stage_activity_evidence" && !sourceImage)
                  throw new Error("A imagem original não está disponível para anexar à atividade. Reenvie a foto.");
                await onAllocate({ ...result, inferenceId, ...(sourceImage ? { sourceImage } : {}) });
                reply = inferenceSuccessReply(result);
              } else {
                result = {
                  ...result,
                  needsClarification: true,
                  question: resolution.question,
                };
                reply = resolution.question;
              }
              resolvedOutputs.push({ ...output, result, applied: resolution.ready, reply });
              analysisOutputs = [...resolvedOutputs, ...analysisOutputs.slice(resolvedOutputs.length)];
              await saveOutboxJob({ ...processing, analysisOutputs });
            }
            analysisOutputs = resolvedOutputs;
            const assistantReply = analysisOutputs
              .map((item) => item.applied ? item.reply : `${item.filename}: ${item.reply}`)
              .filter(Boolean)
              .join("\n");
            const completed = {
              ...processing,
              status: "completed",
              error: "",
              analysisOutputs,
              reply: assistantReply,
            };
            if (analysisOutputs.length) await saveOutboxJob(completed);
            else await removeOutboxJob(queued.id);
            setMessages((current) =>
              current.map((message) => {
                if (message.id === queued.id)
                  return {
                    ...message,
                    status: "completed",
                    error: "",
                    reply: assistantReply,
                    analyses: analysisOutputs.map((item) => ({
                      fileId: item.fileId,
                      filename: item.filename,
                      result: item.result,
                      applied: Boolean(item.applied),
                      messageId: queued.id,
                    })),
                  };
                return message;
              }),
            );
          } catch (err) {
            const retryable =
              typeof err.retryable === "boolean"
                ? err.retryable
                : !navigator.onLine ||
                  err instanceof TypeError ||
                  err.status === 429 ||
                  err.status >= 500;
            const failed = {
              ...processing,
              status: retryable ? "pending" : "failed",
              error: err.message,
              analysisOutputs,
            };
            await saveOutboxJob(failed);
            setMessages((current) =>
              current.map((message) =>
                message.id === queued.id
                  ? { ...message, status: failed.status, error: err.message }
                  : message,
              ),
            );
            if (retryable) break;
          }
        }
        const remaining = await readOutbox(owner);
        if (mountedRef.current)
          setQueueCount(
            remaining.filter((job) =>
              ["pending", "processing"].includes(job.status),
            ).length,
          );
      } catch (err) {
        if (mountedRef.current)
          setError(`Falha na fila de sincronização: ${err.message}`);
      } finally {
        processingRef.current = false;
      }
    }
    processQueue();
  }, [online, outboxReady, queueVersion, owner, stages, lots, inferenceReady]);

  async function retryJob(id) {
    const jobs = await readOutbox(owner),
      job = jobs.find((item) => item.id === id);
    if (!job) return;
    await saveOutboxJob({ ...job, status: "pending", error: "" });
    setMessages((current) =>
      current.map((message) =>
        message.id === id
          ? { ...message, status: "pending", error: "" }
          : message,
      ),
    );
    setQueueCount((value) => value + 1);
    setQueueVersion((value) => value + 1);
  }

  const latestMessage = messages.at(-1);
  const sourceMessage = latestMessage?.sourceMessageId
    ? messages.find(message => message.id === latestMessage.sourceMessageId)
    : null;
  const displayedMessages = latestMessage ? [{
    ...latestMessage,
    files: sourceMessage?.files || latestMessage.files,
    analyses: sourceMessage?.analyses || latestMessage.analyses,
    attachmentMessageId: sourceMessage?.id || latestMessage.id,
  }] : [];

  return (
    <section className="assistant-chat" aria-label="Chat com assistente">
      <header className="chat-header">
        <span className="assistant-mark" aria-hidden="true">
          ✦
        </span>
        <div>
          <strong>Assistente de obra</strong>
          <small>Conversa e anexos</small>
        </div>
        <span className={`chat-ready ${online ? "is-online" : "is-offline"}`}>
          {online
            ? queueCount
              ? `Online · ${queueCount} para processar`
              : "Online"
            : `Offline · ${queueCount} para processar`}
        </span>
      </header>
      <div className="chat-messages" aria-live="polite">
        {displayedMessages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-icon" aria-hidden="true">
              ✦
            </span>
            <h2>Como posso ajudar?</h2>
            <p>
              Escreva uma mensagem e anexe documentos ou imagens para organizar
              sua conversa.
            </p>
          </div>
        ) : (
          displayedMessages.map((message) => (
            <article className="chat-message" key={message.id}>
              <div className="chat-assistant-reply">
                <strong>Assistente de obra</strong>
                {message.reply && <p>{message.reply}</p>}
                {!message.reply && ["pending", "processing"].includes(message.status) && <p>Analisando o conteúdo enviado…</p>}
              </div>
              {!!message.files.length && (
                <Attachments variant="grid">
                  {message.files.map((file) => (
                    <Attachment key={file.id} data={file}>
                      <AttachmentPreview data={file} />
                      <AttachmentInfo data={file} />
                    </Attachment>
                  ))}
                </Attachments>
              )}
              {(message.analyses || []).filter(item => item.result?.intent === "stage_activity_evidence").map(item => {
                const evidence = item.result.fieldEvidence || {};
                return (
                  <section className="activity-evidence-card" key={item.fileId || item.filename} aria-label="Leitura da evidência da atividade">
                    <strong>{item.applied ? "Foto vinculada à atividade" : "Atividade provável · aguardando complemento"}</strong>
                    <p>{evidence.summary || "Descrição não identificada"}</p>
                    <small>{[evidence.stageName, evidence.activityName, evidence.location].filter(Boolean).join(" · ") || "Aguardando vínculo com uma atividade"}</small>
                    {evidence.activityConfidence != null && <small>Correspondência provável: {Math.round(Number(evidence.activityConfidence) * 100)}%</small>}
                    {evidence.userNotes && <small>Complemento: {evidence.userNotes}</small>}
                    <small>{evidence.observedStatus === "completed" ? "A imagem sugere serviço concluído; avanço não foi alterado" : evidence.observedStatus === "in_progress" ? "A imagem sugere serviço em execução; avanço não foi alterado" : "Situação não confirmada pela imagem"}</small>
                  </section>
                );
              })}
              {(message.analyses || []).filter(item => item.applied && item.result?.category === "material_expense").map(item => (
                <section className="material-destination-card" key={item.fileId || item.filename} aria-label="Destino do material">
                  <strong>Destino: Materiais</strong>
                  {(item.result.recognized?.items || []).map((material, index) => <div key={index}>
                    <span>{material.description || "Material não informado"}</span>
                    <small>Categoria: {material.activityName || material.category || "Sem atividade"}{material.stageName ? ` · Etapa: ${material.stageName}` : ""}</small>
                  </div>)}
                </section>
              ))}
              {message.status !== "processing" && message.status !== "pending" && message.files.filter(file => file.mediaType?.startsWith("image/") && !(message.analyses || []).some(item => item.fileId === file.id && item.applied)).map(file => {
                const inferred = (message.analyses || []).find(item => item.fileId === file.id)?.result?.recognized || {};
                return <CatalogMaterialForm key={file.id} stages={stages} inferredAmount={inferred.amount} inferredDate={inferred.date} onSave={async ({ stage, activity, material, quantity, amount, date }) => {
                  const inferenceId = `${message.attachmentMessageId}:${file.id}`;
                  const result = { filename: file.filename, inferenceId, source: "Seleção manual", category: "material_expense", direction: "saida", allocation: { destination: "materials" }, recognized: { ...inferred, amount, date, items: [{ description: material?.name || "Material não informado", quantity, unit: material?.unit || "unidade", amount, stageId: stage?.id || null, stageName: stage?.name || null, activityId: activity?.id || null, activityName: activity?.title || null }] } };
                  await onAllocate(result);
                  const job = (await readOutbox(owner)).find(item => item.id === message.attachmentMessageId);
                  if (job) {
                    const output = { fileId: file.id, filename: file.filename, result, applied: true, reply: "Material escolhido registrado em Materiais." };
                    const analysisOutputs = [...(job.analysisOutputs || []).filter(item => item.fileId !== file.id), output];
                    await saveOutboxJob({ ...job, status: "completed", error: "", reply: output.reply, analysisOutputs });
                    setMessages(current => current.map(item => item.id === message.id || item.id === message.attachmentMessageId ? { ...item, status: "completed", error: "", reply: output.reply, analyses: analysisOutputs } : item));
                  }
                }} />;
              })}
              {message.status && (
                <div className={`outbox-status outbox-${message.status}`}>
                  <span>
                    {statusLabels[message.status]}
                    {message.status === "pending" && !online
                      ? " · aguardando conexão"
                      : ""}
                  </span>
                  {message.error && <small>{message.error}</small>}
                  {(message.status === "failed" ||
                    (message.status === "pending" && message.error)) && (
                    <button type="button" onClick={() => retryJob(message.id)}>
                      Tentar novamente
                    </button>
                  )}
                </div>
              )}
            </article>
          ))
        )}


      </div>
      <form className="chat-composer" onSubmit={send}>
        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}
        {!!files.length && (
          <Attachments variant="grid">
            {files.map((file) => {
              const data = {
                filename: file.name,
                mediaType: file.type,
                url: file.url,
              };
              return (
                <Attachment
                  key={file.id}
                  data={data}
                  onRemove={() => removeFile(file.id)}
                >
                  <AttachmentPreview data={data} />
                  <AttachmentInfo data={data} />
                  <small className="attachment-size">
                    {formatSize(file.size)}
                  </small>
                  <AttachmentRemove onClick={() => removeFile(file.id)} />
                </Attachment>
              );
            })}
          </Attachments>
        )}
        <label className="chat-input-label" htmlFor="assistant-message">
          Mensagem
        </label>
        <textarea
          id="assistant-message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escreva sua mensagem..."
          rows={3}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form.requestSubmit();
            }
          }}
        />
        <div className="chat-actions">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"
            hidden
            onChange={(event) => {
              addFiles(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/png,image/jpeg"
            capture="environment"
            hidden
            onChange={(event) => {
              addFiles(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
          <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) transcribeAudio(file); }} />
          <button
            className="attach-button"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <span aria-hidden="true">＋</span> Anexar
          </button>
          <button
            className="camera-button"
            type="button"
            aria-label="Abrir câmera para adicionar uma imagem"
            onClick={() => {
              setError("");
              setCameraOpen(true);
            }}
          >
            <Camera size={16} aria-hidden="true" />
            <span> Câmera</span>
          </button>
          <button className="camera-button voice-button" type="button" onClick={toggleVoice} disabled={voiceState === 'loading' || voiceState === 'transcribing'} aria-label={voiceState === 'recording' ? 'Parar gravação' : 'Gravar mensagem de voz'}>
            {voiceState === 'recording' ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
            <span>{voiceState === 'recording' ? ' Parar' : ' Voz'}</span>
          </button>
          <button className="camera-button voice-file-button" type="button" onClick={() => audioInputRef.current?.click()} disabled={voiceState !== 'idle'} aria-label="Transcrever arquivo de áudio"><span>Áudio</span></button>
          <span className="chat-hint">Imagem até 8 MB para leitura NVIDIA</span>
          <button
            className="send-button"
            type="submit"
            disabled={busy || (!text.trim() && !files.length)}
          >
            {busy ? "Guardando…" : "Enviar"} <span aria-hidden="true">↑</span>
          </button>
        </div>
        {voiceState !== 'idle' && <p className="chat-voice-status" role="status">{voiceState === 'recording' ? 'Gravando. Toque em Parar para transcrever.' : voiceState === 'loading' ? `Preparando o modelo de voz${voiceProgress == null ? '…' : ` · ${voiceProgress}%`}` : 'Transcrevendo no dispositivo…'}</p>}
      </form>
      {cameraOpen && (
        <div
          className="camera-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCameraOpen(false);
          }}
        >
          <section
            className="camera-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-title"
          >
            <header>
              <div>
                <strong id="camera-title">Adicionar imagem pela câmera</strong>
                <small>
                  Posicione o documento ou comprovante no enquadramento.
                </small>
              </div>
              <button
                className="camera-close"
                type="button"
                aria-label="Fechar câmera"
                onClick={() => setCameraOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <video ref={videoRef} autoPlay playsInline muted />
            <footer>
              <button
                className="attach-button"
                type="button"
                onClick={() => {
                  setCameraOpen(false);
                  cameraInputRef.current?.click();
                }}
              >
                Escolher imagem
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={capturePhoto}
              >
                <Camera size={16} /> Tirar foto
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
