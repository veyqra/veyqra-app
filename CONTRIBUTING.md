# Contributing to Veyqra

Thanks for helping make local AI image generation easier to use.

Veyqra is an early-alpha, local-first open-source project. Bug reports, install feedback, docs, accessibility fixes, and small code improvements are especially valuable.

## Before opening an issue

- Search existing issues and discussions to avoid duplicates.
- For a bug, include your OS, GPU and VRAM, Python and Node versions, ComfyUI version, selected model family (FLUX/SDXL), reproduction steps, expected result, actual result, and relevant logs **with tokens, prompts, private images, and local paths redacted**.
- For installation problems, mention whether you reused an existing ComfyUI installation and which installer options you chose.
- For feature requests, explain the real user workflow rather than only a proposed implementation.

## Local development

1. Fork and clone the repository.
2. Install the prerequisites described in the [README](README.md#installation).
3. Create a dedicated feature branch.
4. Start ComfyUI, then run Veyqra with `npm run dev` on Linux or `npm run dev:windows` on Windows.
5. Keep changes focused and include screenshots for visible UI changes when appropriate.

## Before submitting a pull request

Run the checks relevant to your change:

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
npm run lint --workspace=web
npm run build --workspace=web
```

For backend changes, compile the Python modules with the API virtual environment:

```bash
cd apps/api
.venv/bin/python -m compileall -q app
```

On Windows, use `apps/api/.venv/Scripts/python.exe` instead. Root-level `npm run lint` and `npm run build` are currently placeholders; use the workspace commands above.

## Pull request guidelines

- Explain what changed, why, and how you tested it.
- Link any related issue.
- Note GPU/backend or platform-specific behavior.
- Avoid introducing new model downloads or external services without explicit user choice.
- Never commit API keys, Hugging Face tokens, generated images containing personal data, or large model weights.
- Be kind and constructive; see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Security vulnerabilities should be reported privately according to [SECURITY.md](SECURITY.md), not in a public issue.
