import assert from "node:assert/strict";
import test from "node:test";
import { createCsvDownloaderV1 } from "../../components/shared/csv-download-v1.mjs";

test("CSV downloader escapes cells, keeps UTF-8 BOM, and revokes its object URL", () => {
  const calls = [],
    link = { click() { calls.push(["click", this.href, this.download]); } },
    urlRef = {
      createObjectURL(blob) { calls.push(["blob", blob]); return "blob:csv-test"; },
      revokeObjectURL(url) { calls.push(["revoke", url]); },
    },
    schedule = (callback, delay) => calls.push(["schedule", callback, delay]),
    download = createCsvDownloaderV1({
      documentRef: { createElement: (tag) => { assert.equal(tag, "a"); return link; } },
      URLRef: urlRef,
      BlobCtor: class { constructor(parts, options) { this.parts = parts; this.options = options; } },
      schedule,
    });

  download("records.csv", ["Nome", "Nota"], [["João", 'A "B"']]);
  assert.equal(link.download, "records.csv");
  const blob = calls.find(([kind]) => kind === "blob")[1];
  assert.equal(blob.parts[0], '\ufeff"Nome";"Nota"\n"João";"A ""B"""');
  assert.equal(blob.options.type, "text/csv;charset=utf-8");
  assert.equal(calls.find(([kind]) => kind === "schedule")[2], 1000);
  calls.find(([kind]) => kind === "schedule")[1]();
  assert.deepEqual(calls.at(-1), ["revoke", "blob:csv-test"]);
});

test("CSV downloader fails loudly when browser dependencies are absent", () => {
  assert.throws(() => createCsvDownloaderV1({}), /requires document, URL, Blob, and timer services/);
});
