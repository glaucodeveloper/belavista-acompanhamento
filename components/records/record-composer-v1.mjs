/** Installs the shared attachment composer on the existing record forms. */
export const installRecordComposerV1 = (
  ViewLayer,
  {
    ico,
    document: documentRef = globalThis.document,
    FileReader: FileReaderCtor = globalThis.FileReader,
    DataTransfer: DataTransferCtor = globalThis.DataTransfer,
    Event: EventCtor = globalThis.Event,
  } = {},
) => {
  if (!ViewLayer?.prototype)
    throw new TypeError("Record composer requires the application view layer.");

  // The original inputs are moved (not cloned) to preserve their submission.
  const mountRecordDropinV1 = (host, input, order) => {
    if (!host || !input || host.dataset.recordComposerMounted) return;
    host.dataset.recordComposerMounted = "1";
    const originalLabel = input.closest("label");
    const composer = documentRef.createElement("div");
    composer.className = `record-composer-v1 record-composer-${order}-v1`;
    const fields = documentRef.createElement("div");
    fields.className = "record-composer-fields-v1";
    const dropin = documentRef.createElement("div");
    dropin.className = "record-dropin-v1";
    dropin.innerHTML = `<span class="record-dropin-kicker-v1">ANEXO · FOTO OU DOCUMENTO</span><label class="record-dropin-target-v1"><span class="record-dropin-symbol-v1">${ico("file-up")}</span><strong>Solte o arquivo aqui</strong><span>ou clique para selecionar</span><small>JPG, PNG, WEBP ou PDF · até 6 MB</small></label><div class="record-dropin-preview-v1" aria-live="polite">Nenhum arquivo selecionado</div><button type="button" class="record-dropin-clear-v1" hidden>Remover arquivo</button>`;
    input.removeAttribute("capture");
    dropin.querySelector(".record-dropin-target-v1").append(input);
    originalLabel?.remove();
    if (order === "general" || order === "cash") {
      const grid = host.querySelector(order === "cash" ? ".cash-record-form-grid" : ".control-general-event-grid");
      grid?.parentNode.insertBefore(composer, grid);
      if (grid) fields.append(grid);
      composer.append(dropin, fields);
    } else {
      const header = host.querySelector(":scope > header");
      header?.insertAdjacentElement("afterend", composer);
      [...host.children].filter((node) => node !== header && node !== composer).forEach((node) => fields.append(node));
      composer.append(fields, dropin);
    }
    const preview = dropin.querySelector(".record-dropin-preview-v1");
    const clear = dropin.querySelector(".record-dropin-clear-v1");
    const showFile = () => {
      const file = input.files?.[0];
      if (!file) {
        preview.textContent = "Nenhum arquivo selecionado";
        clear.hidden = true;
        return;
      }
      preview.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      clear.hidden = false;
      if (file.type.startsWith("image/") && file.size <= 6 * 1024 * 1024) {
        const image = documentRef.createElement("img");
        image.alt = `Prévia de ${file.name}`;
        const reader = new FileReaderCtor();
        reader.onload = () => { if (input.files?.[0] === file) { image.src = String(reader.result || ""); preview.prepend(image); } };
        reader.readAsDataURL(file);
      }
    };
    input.addEventListener("change", showFile);
    clear.addEventListener("click", () => { input.value = ""; input.dispatchEvent(new EventCtor("change", { bubbles: true })); showFile(); });
    ["dragenter", "dragover"].forEach((name) => dropin.addEventListener(name, (event) => {
      event.preventDefault();
      dropin.classList.add("dragging");
    }));
    dropin.addEventListener("dragleave", (event) => {
      if (!dropin.contains(event.relatedTarget)) dropin.classList.remove("dragging");
    });
    dropin.addEventListener("drop", (event) => {
      event.preventDefault();
      dropin.classList.remove("dragging");
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 6 * 1024 * 1024) {
        preview.textContent = "Use JPG, PNG, WEBP ou PDF de até 6 MB.";
        return;
      }
      const transfer = new DataTransferCtor();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new EventCtor("change", { bubbles: true }));
    });
  };

  const bindBeforeRecordComposerV1 = ViewLayer.prototype.bind;
  ViewLayer.prototype.bind = function (...args) {
    const result = bindBeforeRecordComposerV1.apply(this, args);
    const general = this.querySelector("[data-control-general-event]");
    mountRecordDropinV1(general, general?.elements.evidence, "general");
    const stage = this.querySelector("[data-control-stage-inline-record]");
    mountRecordDropinV1(stage, stage?.querySelector("[data-inline-record-photo]"), "stage");
    return result;
  };

  // The record center recreates the stage form on render; decorate the new node.
  const renderBeforeRecordComposerV1 = ViewLayer.prototype.render;
  ViewLayer.prototype.render = function (...args) {
    const result = renderBeforeRecordComposerV1.apply(this, args);
    const stage = this.querySelector("[data-control-stage-inline-record]");
    mountRecordDropinV1(stage, stage?.querySelector("[data-inline-record-photo]"), "stage");
    return result;
  };

  return Object.freeze({ mountRecordDropinV1 });
};
