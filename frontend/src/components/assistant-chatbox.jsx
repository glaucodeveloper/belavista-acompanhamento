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
              filename: item.filename,
              result: item.result,
              messageId: job.id,
            })),
            status: job.status,
            error: job.error || "",
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
      if (navigator.onLine) setQueueVersion((value) => value + 1);
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
    const job = {
      id: crypto.randomUUID(),
      owner,
      text: text.trim(),
      createdAt: Date.now(),
      status: "pending",
      error: "",
      analysisOutputs: [],
      files: files.map(({ id, name, size, type, file }) => ({
        id,
        name,
        size,
        type,
        blob: file,
      })),
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
          try {
            let analysisOutputs = [...(queued.analysisOutputs || [])];
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
                  stageId: stage.id,
                  stageName: stage.name,
                  stageDescription: stage.description || "",
                })),
              );
              const response = await fetch(
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
                    image: {
                      mimeType: file.type,
                      data: await toBase64(file.blob),
                    },
                  }),
                },
              );
              const result = await response.json().catch(() => ({}));
              if (!response.ok) {
                const failure = new Error(
                  result.error || `Falha ao analisar ${file.name}.`,
                );
                failure.status = response.status;
                throw failure;
              }
              analysisOutputs.push({
                fileId: file.id,
                filename: file.name,
                result,
              });
              await saveOutboxJob({ ...processing, analysisOutputs });
            }
            await removeOutboxJob(queued.id);
            setMessages((current) =>
              current.map((message) =>
                message.id === queued.id
                  ? {
                      ...message,
                      status: "completed",
                      error: "",
                      analyses: analysisOutputs.map((item) => ({
                        filename: item.filename,
                        result: item.result,
                        messageId: queued.id,
                      })),
                    }
                  : message,
              ),
            );
          } catch (err) {
            const retryable =
              !navigator.onLine ||
              err instanceof TypeError ||
              err.status === 429 ||
              err.status >= 500;
            const failed = {
              ...processing,
              status: retryable ? "pending" : "failed",
              error: err.message,
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
  }, [online, outboxReady, queueVersion, owner, stages, inferenceReady]);

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

  async function applyAnalysis(analysis, category, lotId) {
    const result = {
      ...analysis.result,
      category,
      allocation: { ...(analysis.result.allocation || {}), lotId },
    };
    try {
      await onAllocate?.(result);
      setMessages((current) =>
        current.map((message) =>
          message.id === analysis.messageId
            ? {
                ...message,
                analyses: message.analyses.map((item) =>
                  item.filename === analysis.filename
                    ? { ...item, applied: true }
                    : item,
                ),
              }
            : message,
        ),
      );
    } catch (err) {
      setError(err.message);
    }
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
                  {message.status === "failed" && (
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
        {messages.map((message) =>
          message.analyses?.map((analysis, index) => {
            const result = analysis.result,
              recognized = result.recognized || {};
            const lineItems = recognized.items?.length
              ? recognized.items
              : [
                  {
                    description:
                      recognized.description ||
                      recognized.supplier ||
                      "Item da nota",
                    amount: recognized.amount,
                    activityId: recognized.activityId,
                    stageId: recognized.stageId,
                  },
                ];
            const [category, setCategory] = [
              result.category,
              (value) => {
                analysis.result.category = value;
                setMessages((current) => [...current]);
              },
            ];
            const [lotId, setLotId] = [
              analysis.result.allocation?.lotId ||
                lots.find(
                  (lot) =>
                    lot.label.toLowerCase() ===
                    String(recognized.lotLabel || "").toLowerCase(),
                )?.id ||
                "",
              (value) => {
                analysis.result.allocation = {
                  ...(analysis.result.allocation || {}),
                  lotId: value,
                };
                setMessages((current) => [...current]);
              },
            ];
            const setAmount = (value) => {
              analysis.result.recognized = {
                ...recognized,
                amount: value === "" ? null : Number(value),
              };
              setMessages((current) => [...current]);
            };
            const setItemAmount = (itemIndex, value) => {
              const items = recognized.items?.length
                ? [...recognized.items]
                : [
                    {
                      description:
                        recognized.description ||
                        recognized.supplier ||
                        "Item da nota",
                      amount: recognized.amount,
                    },
                  ];
              items[itemIndex] = {
                ...items[itemIndex],
                amount: value === "" ? null : Number(value),
              };
              analysis.result.recognized = { ...recognized, items };
              setMessages((current) => [...current]);
            };
            const setActivity = (itemIndex, activityId) => {
              const item = activityOptions.find(
                (option) => option.id === activityId,
              );
              const items = recognized.items?.length
                ? [...recognized.items]
                : [
                    {
                      description:
                        recognized.description ||
                        recognized.supplier ||
                        "Item da nota",
                      amount: recognized.amount,
                    },
                  ];
              items[itemIndex] = {
                ...items[itemIndex],
                activityId: item?.id || null,
                activityName: item?.name || null,
                stageId: item?.stageId || null,
                stageName: item?.stageName || null,
                activityConfidence: item ? 1 : 0,
              };
              analysis.result.recognized = { ...recognized, items };
              setMessages((current) => [...current]);
            };
            const activityRequired = [
              "material_expense",
              "service_expense",
            ].includes(category);
            const missingActivity =
              activityRequired &&
              lineItems.some(
                (item) =>
                  !item.activityId ||
                  !activityOptions.some(
                    (option) => option.id === item.activityId,
                  ),
              );
            const missingLineValue =
              activityRequired &&
              lineItems.some((item, itemIndex) => {
                const amount =
                  item.amount ??
                  (lineItems.length === 1 ? recognized.amount : null);
                return !(Number(amount) > 0 || Number(item.unitPrice) > 0);
              });
            const amountRequired =
              category === "entry_receipt" || !activityRequired;
            return (
              <article
                key={`${message.id}-${index}`}
                className="classification-card"
              >
                <div>
                  <span className="eyebrow">
                    LEITURA NVIDIA · {analysis.filename}
                  </span>
                  <strong>
                    {recognized.description ||
                      recognized.supplier ||
                      "Anexo analisado"}
                  </strong>
                  <small>
                    Categoria: {category || "Não identificada"} · Confiança{" "}
                    {Math.round(Number(result.confidence || 0) * 100)}%
                  </small>
                  {recognized.amount != null && (
                    <small>
                      Valor reconhecido:{" "}
                      {Number(recognized.amount).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </small>
                  )}
                  {result.question && <p>{result.question}</p>}
                </div>
                {!analysis.applied && (
                  <div className="classification-actions">
                    <label>
                      Categoria
                      <select
                        value={category || "unknown"}
                        onChange={(event) => setCategory(event.target.value)}
                      >
                        <option value="unknown">Preciso escolher</option>
                        <option value="entry_receipt">Entrada recebida</option>
                        <option value="service_expense">
                          Despesa de serviço
                        </option>
                        <option value="material_expense">
                          Despesa de material
                        </option>
                      </select>
                    </label>
                    {category === "entry_receipt" && (
                      <label>
                        Lote
                        <select
                          value={lotId}
                          onChange={(event) => setLotId(event.target.value)}
                        >
                          <option value="">Selecione o lote</option>
                          {lots.map((lot) => (
                            <option value={lot.id} key={lot.id}>
                              {lot.label} · {lot.quadra}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {activityRequired && (
                      <div className="ocr-activity-list">
                        <strong>
                          Vincule cada item a uma atividade e confira os valores
                        </strong>
                        {lineItems.map((item, itemIndex) => {
                          const lineAmount =
                            item.amount ??
                            (lineItems.length === 1 ? recognized.amount : null);
                          const hasLineValue =
                            Number(lineAmount) > 0 ||
                            Number(item.unitPrice) > 0;
                          return (
                            <div
                              className="ocr-activity-item"
                              key={`${item.description}-${itemIndex}`}
                            >
                              <span>
                                <b>
                                  {item.description || `Item ${itemIndex + 1}`}
                                </b>
                                <small>
                                  {item.quantity
                                    ? `${item.quantity} ${item.unit || ""}`
                                    : ""}
                                  {lineAmount != null
                                    ? ` · ${Number(lineAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                                    : ""}
                                </small>
                              </span>
                              <select
                                aria-label={`Atividade de ${item.description || `item ${itemIndex + 1}`}`}
                                value={item.activityId || ""}
                                onChange={(event) =>
                                  setActivity(itemIndex, event.target.value)
                                }
                              >
                                <option value="">Escolha a atividade</option>
                                {activityOptions.map((option) => (
                                  <option value={option.id} key={option.id}>
                                    {option.stageName} · {option.name}
                                  </option>
                                ))}
                              </select>
                              {!hasLineValue && (
                                <label className="ocr-line-amount">
                                  Valor deste item
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={item.amount ?? ""}
                                    onChange={(event) =>
                                      setItemAmount(
                                        itemIndex,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="0,00"
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {amountRequired && recognized.amount == null && (
                      <label>
                        Valor para registrar
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder="Informe o valor"
                        />
                      </label>
                    )}
                    <button
                      className="primary-button"
                      disabled={
                        category === "unknown" ||
                        (category === "entry_receipt" && !lotId) ||
                        (activityRequired &&
                          (missingActivity || missingLineValue)) ||
                        (amountRequired && Number(recognized.amount || 0) <= 0)
                      }
                      onClick={() =>
                        applyAnalysis(
                          { ...analysis, messageId: message.id },
                          category,
                          lotId,
                        )
                      }
                    >
                      {category === "unknown"
                        ? "Informe a categoria"
                        : missingActivity
                          ? "Escolha atividade para cada item"
                          : missingLineValue
                            ? "Informe o valor de cada item"
                            : "Aplicar à lista"}
                    </button>
                  </div>
                )}
                {analysis.applied && (
                  <span className="classification-applied">Aplicado</span>
                )}
              </article>
            );
          }),
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
