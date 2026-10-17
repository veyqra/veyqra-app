import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(fs.readFileSync(new URL("../src/components/generate/MaskEditor.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

test("starting a stroke snapshots the canvas before React releases currentTarget", () => {
  const queuedUpdates = [];
  const context = {
    beginPath() {}, arc() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {},
  };
  let snapshots = 0;
  const canvas = {
    width: 100, height: 100,
    getContext: () => context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    setPointerCapture() {},
    toDataURL: () => { snapshots++; return "data:image/png;base64,snapshot"; },
  };
  let refIndex = 0;
  let stateIndex = 0;
  const exported = {};
  const element = (type, props) => ({ type, props });
  vm.runInNewContext(source, {
    exports: exported,
    require: (id) => {
      if (id === "react/jsx-runtime") return { jsx: element, jsxs: element };
      if (id === "react") return {
        useRef: (initial) => ({ current: refIndex++ === 0 ? canvas : initial }),
        useState: (initial) => {
          const index = stateIndex++;
          return [index === 2 ? true : initial, (value) => {
            if (typeof value === "function") queuedUpdates.push(value);
          }];
        },
      };
      if (id.endsWith("/Modal")) return { Modal: "dialog" };
      if (id.endsWith("/i18n")) return { useI18n: () => ({ t: (key) => key }) };
      if (id.endsWith("/generate-store")) return { useGenerateStore: { getState: () => ({ manualMask: null }) } };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  const tree = exported.MaskEditor({ imageUrl: "input.png", onClose() {} });
  function find(node, type) {
    if (!node || typeof node !== "object") return undefined;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const result = find(child, type);
      if (result) return result;
    }
  }
  find(tree, "img").props.onLoad({ currentTarget: { naturalWidth: 100, naturalHeight: 100 } });
  const event = { currentTarget: canvas, button: 0, pointerId: 1, clientX: 20, clientY: 30 };
  find(tree, "canvas").props.onPointerDown(event);
  // React clears currentTarget after dispatch, before deferred state updaters run.
  event.currentTarget = null;
  const result = queuedUpdates[0]([]);
  assert.equal(snapshots, 1);
  assert.deepEqual(Array.from(result), ["data:image/png;base64,snapshot"]);
});
