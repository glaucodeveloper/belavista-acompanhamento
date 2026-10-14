/** Creates the application's CSV download action with injectable browser APIs. */
export const createCsvDownloaderV1 = ({
  documentRef = globalThis.document,
  URLRef = globalThis.URL,
  BlobCtor = globalThis.Blob,
  schedule = globalThis.setTimeout?.bind(globalThis),
} = {}) => {
  if (!documentRef?.createElement || !URLRef?.createObjectURL || !BlobCtor || !schedule)
    throw new TypeError("CSV download requires document, URL, Blob, and timer services.");

  return (filename, columns, rows) => {
    const csv = [columns, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\n");
    const url = URLRef.createObjectURL(
      new BlobCtor([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = documentRef.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    schedule(() => URLRef.revokeObjectURL(url), 1000);
  };
};
