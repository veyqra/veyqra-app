import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = ts.transpileModule(fs.readFileSync(new URL("../src/services/generation-monitor.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function monitorWith(getGeneration, step = 1_000) {
  const exported = {};
  let clock = 0;
  vm.runInNewContext(source, {
    exports: exported,
    require: () => ({ getGeneration }),
    Date: { now: () => clock },
    window: { setTimeout: (callback) => { clock += step; callback(); } },
  });
  return exported.pollGeneration;
}

test("follow-up monitoring reports progress and returns the completed image", async () => {
  const statuses = ["queued", "running", "completed"];
  const updates = [];
  const image = { id: "result", width: 2048, height: 2048 };
  const poll = monitorWith(async (id) => ({ id, status: statuses.shift(), image }));
  const result = await poll("upscale", (job) => updates.push(job.status), "timeout");
  assert.deepEqual(updates, ["queued", "running", "completed"]);
  assert.equal(result.image, image);
});

test("failed and cancelled follow-ups stop polling", async () => {
  for (const status of ["failed", "cancelled"]) {
    let requests = 0;
    const poll = monitorWith(async () => { requests++; return { status }; });
    assert.equal((await poll("job", () => {}, "timeout")).status, status);
    assert.equal(requests, 1);
  }
});

test("network failures and monitoring timeouts surface as errors", async () => {
  const unavailable = monitorWith(async () => { throw new Error("offline"); });
  await assert.rejects(unavailable("job", () => {}, "timeout"), /offline/);
  const pending = monitorWith(async () => ({ status: "queued" }), 15 * 60_000);
  await assert.rejects(pending("job", () => {}, "timeout"), /timeout/);
});
