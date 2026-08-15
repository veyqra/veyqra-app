# Third-Party Notices

Veyqra uses third-party open-source software. Copyright in those
components remains with their respective authors and contributors.
Their licenses apply independently of Veyqra's
[GNU Affero General Public License v3.0](LICENSE).

This document covers the direct dependencies declared by Veyqra as of
August 16, 2026. The authoritative dependency versions are recorded in
`package-lock.json`, `apps/web/package.json`, and
`apps/api/requirements.txt`.

## Frontend runtime dependencies

| Component | License |
| --- | --- |
| [@base-ui/react](https://www.npmjs.com/package/@base-ui/react) | MIT |
| [@tanstack/react-query](https://www.npmjs.com/package/@tanstack/react-query) | MIT |
| [axios](https://www.npmjs.com/package/axios) | MIT |
| [class-variance-authority](https://www.npmjs.com/package/class-variance-authority) | Apache-2.0 |
| [clsx](https://www.npmjs.com/package/clsx) | MIT |
| [framer-motion](https://www.npmjs.com/package/framer-motion) | MIT |
| [lucide-react](https://www.npmjs.com/package/lucide-react) | ISC |
| [next](https://www.npmjs.com/package/next) | MIT |
| [react](https://www.npmjs.com/package/react) | MIT |
| [react-dom](https://www.npmjs.com/package/react-dom) | MIT |
| [shadcn](https://www.npmjs.com/package/shadcn) | MIT |
| [tailwind-merge](https://www.npmjs.com/package/tailwind-merge) | MIT |
| [tw-animate-css](https://www.npmjs.com/package/tw-animate-css) | MIT |
| [zustand](https://www.npmjs.com/package/zustand) | MIT |

## Frontend development dependencies

| Component | License |
| --- | --- |
| [@tailwindcss/postcss](https://www.npmjs.com/package/@tailwindcss/postcss) | MIT |
| [@types/node](https://www.npmjs.com/package/@types/node) | MIT |
| [@types/react](https://www.npmjs.com/package/@types/react) | MIT |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom) | MIT |
| [eslint](https://www.npmjs.com/package/eslint) | MIT |
| [eslint-config-next](https://www.npmjs.com/package/eslint-config-next) | MIT |
| [tailwindcss](https://www.npmjs.com/package/tailwindcss) | MIT |
| [typescript](https://www.npmjs.com/package/typescript) | Apache-2.0 |

## Backend runtime dependencies

| Component | License |
| --- | --- |
| [FastAPI](https://pypi.org/project/fastapi/) | MIT |
| [pydantic-settings](https://pypi.org/project/pydantic-settings/) | MIT |
| [Uvicorn](https://pypi.org/project/uvicorn/) | BSD-3-Clause |
| [HTTPX](https://pypi.org/project/httpx/) | BSD-3-Clause |
| [python-multipart](https://pypi.org/project/python-multipart/) | Apache-2.0 |
| [websockets](https://pypi.org/project/websockets/) | BSD-3-Clause |
| [Pillow](https://pypi.org/project/pillow/) | MIT-CMU |
| [PyTorch](https://pypi.org/project/torch/) | Multiple; see the license directory included with the installed wheel |
| [Argos Translate](https://pypi.org/project/argostranslate/) | MIT |
| [langdetect](https://pypi.org/project/langdetect/) | Apache-2.0 |

## External software and model assets

Veyqra can connect to a separately installed ComfyUI instance and can
use ComfyUI custom nodes. Those projects are not part of Veyqra and
remain subject to their own licenses.

Veyqra does not distribute AI model weights. Checkpoints, LoRAs,
embeddings, VAEs, translation models, and other downloaded assets are
not covered by the Veyqra license. Users must review and comply with the
license and usage restrictions supplied by each asset's publisher.

In particular, a model being downloadable or usable by open-source
software does not necessarily make the model itself open source or
permit commercial use or redistribution.

## Distribution note

The Veyqra source repository does not include `node_modules`, a Python
virtual environment, model weights, or third-party binary bundles.
Package managers install dependencies together with their upstream
license files.

Anyone distributing a Docker image, installer, desktop bundle, virtual
environment, model bundle, or other binary form of Veyqra must audit the
exact contents of that artifact and include all license texts,
copyright notices, attribution notices, and source-code offers required
by the applicable licenses. This file is not a substitute for the
license files shipped by upstream projects.
