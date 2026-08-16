import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const tool = process.argv[2];
const supportedTools = new Set(["eslint", "next"]);

if (!supportedTools.has(tool)) {
  console.error(`Unknown frontend tool: ${tool ?? "(missing)"}`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const entrypoint = tool === "eslint"
  ? join(dirname(require.resolve("eslint/package.json")), "bin", "eslint.js")
  : require.resolve("next/dist/bin/next");

// Hide this launcher and the tool selector from the invoked CLI.
process.argv.splice(1, 2, entrypoint);
await import(pathToFileURL(entrypoint).href);
