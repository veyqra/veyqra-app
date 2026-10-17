import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(fs.readFileSync(new URL("../src/lib/history-organization.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
vm.runInNewContext(source, { exports: exported });
const { organizeHistory, parseTags } = exported;
const base = { prompt: "Forest", negativePrompt: "blur", modelName: "Flux", modelId: "flux", loraId: "none", project: "", tags: [], favorite: false, width: 1024, height: 1024 };
const items = [
  { ...base, id: "a", project: "Portfolio", tags: ["studio"], favorite: true, createdAt: "2026-10-01T00:00:00Z" },
  { ...base, id: "b", modelName: "SDXL", modelId: "sdxl", width: 2048, createdAt: "2026-10-03T00:00:00Z" },
  { ...base, id: "c", project: "Portfolio", tags: ["portrait"], createdAt: "2026-10-02T00:00:00Z" },
];
const defaults = { search: "", favoritesOnly: false, project: "", unassignedOnly: false, tag: "", model: "", sort: "newest" };
const ids = (filters) => Array.from(organizeHistory(items, { ...defaults, ...filters }), (item) => item.id);

test("history combines word search, project, tags, favorites and model filters", () => {
  assert.deepEqual(ids({ search: "PORTFOLIO studio", favoritesOnly: true, model: "flux", tag: "studio" }), ["a"]);
  assert.deepEqual(ids({ project: "Portfolio" }), ["c", "a"]);
  assert.deepEqual(ids({ unassignedOnly: true }), ["b"]);
  assert.deepEqual(ids({ tag: "missing" }), []);
});

test("sorting is deterministic and leaves original history order unchanged", () => {
  assert.deepEqual(ids({}), ["b", "c", "a"]);
  assert.deepEqual(ids({ sort: "oldest" }), ["a", "c", "b"]);
  assert.deepEqual(ids({ sort: "largest" }), ["b", "c", "a"]);
  assert.deepEqual(ids({ sort: "model" }), ["c", "a", "b"]);
  assert.deepEqual(items.map((item) => item.id), ["a", "b", "c"]);
});

test("tag entry trims, deduplicates and ignores empty comma fields", () => {
  assert.deepEqual(Array.from(parseTags(" Portrait, portrait, , Studio, ")), ["portrait", "studio"]);
});
