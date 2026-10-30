import React, { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
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
  if (result.category === "entry_receipt") {
    const lot = result.allocation?.lotLabel || result.recognized?.lotLabel || "lote";
    return `Entrada de ${Number(result.recognized?.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} registrada em ${lot}.`;
  }
  const count = result.recognized?.items?.length || 1;
  const destination = result.category === "service_expense" ? "Serviços" : "Materiais";
  return `${count === 1 ? "Item" : `${count} itens`} identificado${count === 1 ? "" : "s"} e adicionado${count === 1 ? "" : "s"} automaticamente a ${destination}.`;
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
  const inputRef = useRef(null);
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
    const pendingAnalysis = files.length
      ? null
      : [...messages]
          .reverse()
          .flatMap((message) =>
            [...(message.analyses || [])]
              .reverse()
              .map((analysis) => ({ message, analysis })),
          )
          .find(({ analysis }) => !analysis.applied);
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
    try {
      await saveOutboxJob(job);
      setMessages((current) => [
        ...current,
        {
          id: job.id,
          text: job.text,
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
          ...(job.text && !job.files.length && !job.editTarget
            ? {
                status: "completed",
                reply: "Anexe uma nota primeiro. Depois, envie uma mensagem para corrigir os dados reconhecidos.",
              }
            : {}),
        },
      ]);
      if (job.text && !job.files.length && !job.editTarget) {
        await removeOutboxJob(job.id);
        setText("");
        setFiles([]);
        return;
      }
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
              if (resolution.ready) {
                if (!onAllocate) throw new Error("O salvamento automático da nota não está disponível.");
                await onAllocate({ ...finalResult, inferenceId });
              } else {
                finalResult = {
                  ...finalResult,
                  needsClarification: true,
                  question: resolution.question,
                };
              }

              const sourceJobs = await readOutbox(owner);
              const sourceJob = sourceJobs.find(
                (item) => item.id === queued.editTarget.messageId,
              );
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
                      image: {
                        mimeType: file.type,
                        data: await toBase64(file.blob),
                      },
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
                result,
              });
              await saveOutboxJob({ ...processing, analysisOutputs });
            }
            const resolvedOutputs = [];
            for (const output of analysisOutputs) {
              if (output.applied) {
                resolvedOutputs.push(output);
                continue;
              }
              const resolution = resolveInference(output.result, lots, activityOptions);
              let result = resolution.result;
              let reply;
              if (resolution.ready) {
                if (!onAllocate) throw new Error("O salvamento automático da nota não está disponível.");
                const inferenceId = `${queued.id}:${output.fileId || output.filename}`;
                await onAllocate({ ...result, inferenceId });
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
        {messages.length === 0 ? (
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
          messages.map((message) => (
            <article className="chat-message" key={message.id}>
              {message.text && <p>{message.text}</p>}
              {message.reply && (
                <div className="chat-assistant-reply">
                  <strong>Assistente de obra</strong>
                  <p>{message.reply}</p>
                </div>
              )}
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
          <span className="chat-hint">Imagem até 8 MB para leitura NVIDIA</span>
          <button
            className="send-button"
            type="submit"
            disabled={busy || (!text.trim() && !files.length)}
          >
            {busy ? "Guardando…" : "Enviar"} <span aria-hidden="true">↑</span>
          </button>
        </div>
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
