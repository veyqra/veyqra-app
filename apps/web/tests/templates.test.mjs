import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const loadPackage = createRequire(import.meta.url);
const testDirectory = path.dirname(fileURLToPath(import.meta.url));

// Exercise the real Zustand stores with browser storage, without a DOM or bundler.
function loadStores() {
  const values = new Map();
  const cache = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const filename = path.resolve(testDirectory, "../src", `${name}.ts`);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const loadedModule = { exports: {} };
    cache.set(name, loadedModule.exports);
    vm.runInNewContext(source, {
      exports: loadedModule.exports, module: loadedModule, localStorage, crypto: { randomUUID }, console,
      require: (id) => id === "@/services/uploads-api"
        ? { copyHistoryImageToInputs: async () => ({ filename: "input.png" }) }
        : id.startsWith("@/") ? load(id.slice(2)) : loadPackage(id),
    }, { filename });
    return loadedModule.exports;
  }
  return { load, values, reload: (name) => { cache.delete(name); return load(name); } };
}

test("templates restore complete settings without capturing image files or jobs", () => {
  const { load } = loadStores();
  const { useGenerateStore } = load("stores/generate-store");
  const { captureSettings, loadTemplate, useTemplateStore } = load("stores/template-store");
  useGenerateStore.setState({
    prompt: "Portrait", negativePrompt: "blur", modelId: "sdxl.safetensors", modelFamily: "sdxl",
    loraId: "style.safetensors", loraStrength: 0.7, resolutionId: "832x1216",
    seed: "123", seedLocked: true, steps: 34, guidance: 6, sampler: "euler",
    scheduler: "normal", batchSize: 3, denoiseStrength: 0.4, generationMode: "inpaint",
    maskPrompt: "face", maskConfidence: 0.6, maskExpand: 12, uploadedInputFilename: "private.png",
  });
  const snapshot = captureSettings();
  assert.equal(Object.keys(snapshot).length, 19);
  assert.equal("uploadedInputFilename" in snapshot, false);
  assert.equal("queue" in snapshot, false);
  useTemplateStore.getState().save("  Portrait preset  ", snapshot);
  const template = useTemplateStore.getState().templates[0];
  assert.equal(template.name, "Portrait preset");
  useGenerateStore.getState().resetSettings();
  loadTemplate(template);
  assert.deepEqual(captureSettings(), snapshot);
  assert.equal(useGenerateStore.getState().uploadedInputFilename, null);
});

test("saved templates survive reload and deletion is persisted", () => {
  const { load, reload, values } = loadStores();
  const first = load("stores/template-store");
  first.useTemplateStore.getState().save("Preset", first.captureSettings());
  const id = first.useTemplateStore.getState().templates[0].id;
  const second = reload("stores/template-store");
  assert.equal(second.useTemplateStore.getState().templates[0].id, id);
  second.useTemplateStore.getState().remove(id);
  assert.equal(JSON.parse(values.get("veyqra-generation-templates")).state.templates.length, 0);
});

test("manual masks are cleared when the input changes and excluded from templates", async () => {
  const { load } = loadStores();
  const { useGenerateStore } = load("stores/generate-store");
  const { captureSettings } = load("stores/template-store");
  useGenerateStore.getState().setManualMask("data:image/png;base64,mask");
  assert.equal("manualMask" in captureSettings(), false);
  useGenerateStore.getState().setInputImageUrl("/new-image.png");
  assert.equal(useGenerateStore.getState().manualMask, null);
  useGenerateStore.getState().setManualMask("data:image/png;base64,mask");
  await useGenerateStore.getState().prepareHistoryImage("image", "/history.png", "inpaint");
  assert.equal(useGenerateStore.getState().manualMask, null);
});
