<p align="center">
  <img src="docs/assets/veyqra-logo.webp" alt="Veyqra logo" width="112">
</p>

<h1 align="center">Veyqra</h1>

<p align="center"><strong>Create. Train. Deploy.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/status-early_alpha-8b5cf6" alt="Early Alpha">
  <img src="https://img.shields.io/badge/platform-Windows-2563eb?logo=windows11" alt="Windows">
  <img src="https://img.shields.io/badge/platform-Linux-f59e0b?logo=linux&logoColor=white" alt="Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-22c55e" alt="AGPL-3.0"></a>
  <a href="https://github.com/Comfy-Org/ComfyUI"><img src="https://img.shields.io/badge/backend-ComfyUI-111827" alt="ComfyUI"></a>
</p>

Veyqra is a local, web-based interface for AI image generation with ComfyUI.
It connects a responsive Next.js frontend to a FastAPI backend that translates
UI settings into versioned ComfyUI workflows.

The project is currently at **0.1.0 Alpha**. Local image generation is
functional, while cloud integration, training, authentication, and the
marketplace are still planned.

![Veyqra Generate workspace](docs/screenshots/generate-desktop.webp)

<p align="center"><em>Generate locally. Keep control. Skip the ComfyUI complexity.</em></p>

## Motivation

Veyqra started with a simple request: my girlfriend wanted to generate
personalized images of herself. The available tools were powerful, but
training a LoRA, configuring ComfyUI, and building the right workflows
required too much specialist knowledge for an approachable creative process.

The project aims to make those capabilities accessible through a focused
interface without hiding the flexibility of the local AI tooling underneath.

## Current features

- Dashboard with job, model, and runtime status
- FLUX and SDXL Text to Image, Image to Image, and Inpaint modes
- Model and LoRA catalog loaded directly from ComfyUI
- Multiple generation jobs in the ComfyUI queue
- Progress, status, error reporting, and persistent job metadata
- Automatic inpaint segmentation through a grounding-mask workflow
- Optional mask prompt with automatic extraction from the positive prompt
- Local prompt translation to English from German, French, Spanish, Italian,
  and Portuguese
- Voice input through the browser Speech Recognition API
- Persistent history with image, prompt, model, and mask information
- Direct reuse of history and preview images for Image to Image or Inpaint
- Previous/next image navigation in Preview and History
- Live ComfyUI GPU, VRAM, running-job, and pending-job information
- Local notifications for completed, failed, and cancelled jobs
- Responsive desktop and mobile navigation

<p align="center">
  <img src="docs/screenshots/generate-mobile.jpeg" width="420" alt="Veyqra mobile Generate interface with image preview and generation queue">
</p>

## Not implemented yet

- AWS account connection and instance management
- Veyqra Cloud
- LoRA training
- User accounts and authentication
- Settings backend
- Marketplace and plugin system
- Production-ready Docker deployment

The AWS control in the top bar is intentionally shown as disconnected until a
real backend connection is available.

## Architecture

```text
Browser
  │
  ▼
Next.js 16 / React 19 / Zustand
  │  REST
  ▼
FastAPI / Pydantic
  │  HTTP + WebSocket
  ▼
ComfyUI
  ├─ Models and LoRAs
  ├─ Workflow queue
  ├─ Progress events
  ├─ Generated images
  └─ GPU, VRAM, and queue status
```

The frontend does not need to know the internal ComfyUI workflow structure.
The API validates each request, loads a workflow template, applies the selected
model, LoRA, prompt, and parameters, and submits the result to ComfyUI.

## Repository structure

```text
veyqra/
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── api/routes/       # REST endpoints
│   │   │   ├── core/             # Configuration
│   │   │   ├── schemas/          # Pydantic schemas
│   │   │   └── services/         # ComfyUI, jobs, history, models
│   │   ├── scripts/              # Translation model setup
│   │   └── workflows/            # ComfyUI API workflows
│   └── web/
│       └── src/
│           ├── app/              # Next.js routes
│           ├── components/       # UI and workspaces
│           ├── services/         # API clients
│           ├── stores/           # Zustand stores
│           └── types/            # Frontend types
├── docs/                          # Vision and architecture drafts
├── docker-compose.yml             # Web and API containers
└── package.json                   # Workspace scripts
```

## Requirements

- Node.js 22 or newer
- npm
- Python 3.12 recommended
- A running ComfyUI instance, available by default at
  `http://127.0.0.1:8188`
- A GPU configuration supported by ComfyUI
- FLUX models and the CLIP/VAE files required by the FLUX workflows
- An SDXL checkpoint in ComfyUI's `models/checkpoints` directory for SDXL
  generation

Inpaint additionally requires the custom nodes referenced by
`inpaint_flux.json`:

- `GroundingMaskModelLoader`
- `GroundingMaskDetector`

The current workflow uses `Florence-2: Base (Segmentation)` for automatic mask
detection. ComfyUI must be able to load these nodes and the associated model.

The workflow templates also expect these files by default:

- `clip_l.safetensors`
- `t5xxl_fp16.safetensors`
- `ae.safetensors`

The selected diffusion model and optional LoRA are injected at runtime from
the ComfyUI model catalog.

The automated installers offer official FLUX model bundles and the official
SDXL Base 1.0 checkpoint. Other SDXL checkpoints and LoRAs can be installed in
ComfyUI separately; Veyqra then discovers them through the model catalog.

## Quick start with Docker Compose

Docker Compose runs the Veyqra web interface and API. ComfyUI, custom nodes,
models, and GPU drivers remain installed on the host and are not copied into
the containers.

ComfyUI must accept connections from Docker. When using the Veyqra-managed
ComfyUI installation on Linux, start it with:

```bash
VEYQRA_COMFYUI_HOST=0.0.0.0 scripts/start-comfyui.sh
```

Then build and start Veyqra:

```bash
docker compose up --build -d
```

Open <http://localhost:3000>. View the logs or stop the services with:

```bash
docker compose logs -f
docker compose down
```

Generated images, uploads, job metadata, history, and installed translation
models remain in `apps/api/data`. The API is exposed only on
`http://127.0.0.1:8000`; browser requests use the frontend's same-origin proxy.

Compose connects to ComfyUI at `http://host.docker.internal:8188` by default.
Override the address, ports, or container user in a root `.env` file when
needed:

```dotenv
VEYQRA_COMFYUI_URL=http://host.docker.internal:8188
VEYQRA_WEB_PORT=3000
VEYQRA_API_PORT=8000
VEYQRA_UID=1000
VEYQRA_GID=1000
```

On Linux, use your numeric `id -u` and `id -g` values if they are not `1000`.
Do not expose ComfyUI's port to untrusted networks.

## Installation

### Automated Linux installer

The automated installer for Linux is available here:

```bash
scripts/install-linux.sh
```

It performs the following steps:

- Checks Git, Python, Node.js, and npm
- Detects common existing ComfyUI installations and lets interactive users
  reuse one, create a separate Veyqra-managed copy, or enter another path
- Detects an AMD, NVIDIA, or CPU backend
- Clones ComfyUI into a user-owned Veyqra data directory
- Creates isolated Python environments for ComfyUI and the Veyqra API
- Installs the appropriate PyTorch build and ComfyUI dependencies
- Installs the required custom nodes from `config/comfyui-nodes.json`
- Creates all model directories used by the Veyqra workflows
- Optionally downloads selected official FLUX models plus their shared CLIP-L,
  T5XXL and VAE files, or the official SDXL Base 1.0 checkpoint, directly into
  the correct ComfyUI directories
- Writes the local ComfyUI URL to `apps/api/.env`
- Starts ComfyUI and verifies its system, queue, and required-node endpoints

Review the complete plan without changing the system:

```bash
scripts/install-linux.sh --dry-run --yes
```

Interactive runs ask separately for the Veyqra data/install directory and the
ComfyUI directory. The Veyqra application repository itself remains at the
location from which the installer is executed.

Useful options:

```text
--gpu auto|amd|nvidia|cpu
--install-dir PATH
--comfyui-dir PATH
--torch-index-url URL
--hsa-override VERSION
--with-manager
--with-translations
--models flux-schnell,flux-dev,flux-fill,sdxl-base|all|none
--no-start
--update
```

The installer never uses `sudo` and does not install GPU drivers. Large model
downloads remain an explicit user choice. Interactive runs display a model
picker; unattended runs download no models unless `--models` is supplied.
For example:

```bash
HF_TOKEN=hf_your_token scripts/install-linux.sh \
  --models flux-dev,flux-fill
```

The full shared FLUX assets require about 10.4 GB, and each full FLUX diffusion
model adds about 23.8 GB. SDXL Base 1.0 requires about 6.94 GB and does not need
the FLUX shared assets. Downloads resume from `.part` files, check available
disk space, and verify SHA-256 before replacing the destination file. Gated
FLUX files require accepted Hugging Face agreements. Tokens are read from
`HF_TOKEN` or prompted without echo and are never written to Veyqra's
configuration.

Run `scripts/install-linux.sh --help` for all options.
In non-interactive runs, a previously selected installation is reused; otherwise
the installer uses Veyqra's managed data directory.

### Automated Windows installer

Run the PowerShell installer from the repository root:

```powershell
scripts\install-windows.cmd
```

It checks Git, Python 3.11+, Node.js 22+, and npm; detects or installs ComfyUI;
creates isolated Python environments; installs the required custom nodes; and
configures the Veyqra API. Existing ComfyUI virtual environments and portable
Python installations are reused when possible.

Useful PowerShell options:

```powershell
scripts\install-windows.ps1 `
  -ComfyUIDir "D:\AI\ComfyUI" `
  -Gpu Nvidia `
  -WithManager `
  -WithTranslations
```

Other options include `-InstallDir`, `-Python`, `-TorchIndexUrl`, `-Models`,
`-Update`, `-NoStart`, `-Yes`, and `-DryRun`. Optional FLUX downloads require
`HF_TOKEN` and accepted Hugging Face model agreements:

```powershell
$env:HF_TOKEN = "hf_your_token"
scripts\install-windows.ps1 -Models flux-schnell,sdxl-base
```

NVIDIA and CPU PyTorch packages are selected automatically. Windows AMD builds
are hardware-specific: reuse an already working AMD ComfyUI installation, use
the official AMD portable package, or provide its documented package index via
`-TorchIndexUrl`.

After installation:

```powershell
scripts\start-comfyui.cmd
npm run dev:windows
```

The steps below describe the equivalent manual installation.

### 1. Clone the repository and install Node dependencies

```bash
git clone <repository-url> veyqra
cd veyqra
npm install
```

### 2. Create the API Python environment

```bash
python3.12 -m venv apps/api/.venv
apps/api/.venv/bin/pip install --upgrade pip
apps/api/.venv/bin/pip install -r apps/api/requirements.txt
```

### 3. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

Default configuration:

```dotenv
VEYQRA_API_HOST=0.0.0.0
VEYQRA_API_PORT=8000
VEYQRA_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
VEYQRA_COMFYUI_URL=http://127.0.0.1:8188
VEYQRA_PUBLIC_API_URL=
```

`VEYQRA_PUBLIC_API_URL` is used to create history and mask image URLs. Keep it
empty when the frontend's same-origin API proxy is used. Set an absolute URL
only when clients access the API directly.

### 4. Configure the frontend

Create `apps/web/.env.local` if a custom API address is needed:

```dotenv
NEXT_PUBLIC_VEYQRA_API_URL=/api/v1
VEYQRA_ALLOWED_DEV_ORIGINS=
```

The frontend uses this same-origin path by default and proxies API requests to
the local FastAPI service. This also avoids mixed-content errors when Veyqra is
served over HTTPS.

For development access from other devices, set
`VEYQRA_ALLOWED_DEV_ORIGINS` to a comma-separated list of local hostnames or IP
addresses. Keep machine-specific values in the untracked `.env.local` file.

### 5. Install local translation models

```bash
npm run translation:setup
```

The script downloads local Argos translation models for:

- German → English
- French → English
- Spanish → English
- Italian → English
- Portuguese → English

Models are stored in `apps/api/data/translation-models`. Once installed,
prompt translation does not require an external service.

Specific languages can also be installed separately:

```bash
cd apps/api
.venv/bin/python scripts/install_translation_models.py de fr
```

## Running the development environment

Start ComfyUI first. Then start the API and web app together:

```bash
npm run dev
```

Press `Ctrl+C` to stop both processes.

Workflow JSON templates are cached by the API process. After editing a file in
`apps/api/workflows`, restart the backend completely; Python hot reload alone
does not invalidate the workflow cache.

On Windows, use PowerShell from the project directory:

```powershell
npm run dev:windows
```

The Windows script can also be started directly:

```powershell
scripts\start-dev.cmd
```

Alternatively, run them in separate terminals.

Terminal 1:

```bash
npm run api
```

Terminal 2:

```bash
npm run web
```

The following addresses will be available:

- Web app: <http://localhost:3000>
- API: <http://localhost:8000>
- OpenAPI documentation: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/api/v1/health>

The root page redirects to `/dashboard`.

## Supported model families

Veyqra currently supports FLUX and SDXL. The backend selects the correct
ComfyUI workflow automatically from the generation mode and the selected
model's detected family. The frontend does not infer the family with its own
filename checks.

### FLUX

FLUX uses the existing guidance-based controls and dedicated workflow
templates for Text to Image, Image to Image, and FLUX Fill inpainting. FLUX
LoRAs are applied to the model path.

### SDXL

SDXL has dedicated workflow templates for Text to Image, Image to Image, and
Inpaint. The UI exposes SDXL-specific defaults and controls:

- 30 steps and CFG `6.0`
- `dpmpp_2m` sampler with the `karras` scheduler
- Positive and negative prompts
- Seed, batch size, sampler, and scheduler
- Optional SDXL LoRAs applied to both the model and CLIP paths

For SDXL Text to Image, the available resolutions are:

- `1024 × 1024`
- `832 × 1216`
- `1216 × 832`
- `896 × 1152`
- `1152 × 896`

The model catalog recognizes common SDXL checkpoint names such as `sdxl`,
`sd_xl`, Juggernaut XL, RealVis XL, and DreamShaper XL. Compatible FLUX and
SDXL LoRAs are grouped by model family. LoRAs whose family cannot be detected
remain available as unclassified adapters.

## Generation modes

### Text to Image

Creates a new image from a prompt. It supports model and LoRA selection,
resolution, seed, steps, guidance or CFG, sampler, scheduler, and batch size.
Text-to-image workflows always use full denoising (`1.0`).

### Image to Image

Uses an uploaded image or an image selected from history. The original input
resolution is preserved, and denoise controls the transformation strength.

### Inpaint

Also preserves the original input resolution. FLUX Fill and SDXL always use a
denoise value of `1.0` for inpainting.

The mask area can be entered explicitly, for example:

```text
red shirt
```

When the mask field is empty, Veyqra extracts the target from an instruction
such as:

```text
Replace the red shirt with a black jacket.
```

Non-English input is translated locally. The extracted target is sent to the
grounding detector as the mask prompt and removed from the final generation
prompt. The detected mask is saved as a dedicated ComfyUI output and displayed
in the Preview panel.

<!-- SCREENSHOT: Inpaint workflow
Suggested file: docs/screenshots/inpaint-mask-result.webp
Replace this marker with:
![Veyqra Inpaint mask detection and result](docs/screenshots/inpaint-mask-result.webp)
Show a neutral input image, the detected mask, and the final result.
-->

## Queue and jobs

The Generate button becomes available again as soon as ComfyUI accepts a job.
This allows multiple workflows to be queued. Each job is monitored
independently and remains `queued` until the sampler actually starts.

Job metadata is stored in `apps/api/data/jobs.json`. On API startup, Veyqra
attempts to resume monitoring unfinished jobs. The Jobs page displays each
job's prompt, model, status, progress, errors, and result.

## History and local data

Completed images are copied from ComfyUI into Veyqra-owned local storage.

```text
apps/api/data/
├── history.json
├── jobs.json
├── history-images/
├── uploads/
├── translation-models/
└── translation-runtime/
```

History images can be deleted, downloaded, browsed with arrow controls, and
used directly as Image to Image or Inpaint input. Reusing a history image only
prepares the image; it does not overwrite the prompt currently entered in the
editor.

![Veyqra generation history with reusable images and generation details](docs/screenshots/history-desktop.png)

## System status and notifications

Local runtime information comes directly from ComfyUI:

- `/system_stats` provides device, GPU name, and VRAM information
- `/queue` provides running and pending workflows

The API normalizes these responses before returning them to the frontend.
Internal device types such as `cuda` are not used as product labels; the UI
only displays the GPU name and `Local compute`.

The notification bell observes job status transitions through dashboard
polling. The first response establishes a baseline, so existing jobs do not
produce old notifications. Notifications are persisted in browser storage
under `veyqra-notifications`.

<!-- SCREENSHOT: Local system status popover (optional)
Suggested file: docs/screenshots/system-status.webp
Replace this marker with:
![Veyqra local GPU and queue status](docs/screenshots/system-status.webp)
Show the GPU name, VRAM usage, and ComfyUI running/pending counters.
-->

## Main API endpoints

All application endpoints use `/api/v1` as their default prefix.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check API health |
| `GET` | `/comfyui/status` | Check the ComfyUI connection |
| `GET` | `/dashboard` | Get statistics, jobs, GPU, VRAM, and queue data |
| `POST` | `/generations` | Create and queue a generation |
| `GET` | `/generations` | List generation jobs |
| `GET` | `/generations/{id}` | Get a job's current state |
| `DELETE` | `/generations/{id}` | Cancel a job in Veyqra |
| `DELETE` | `/generations` | Clear the job list |
| `GET` | `/models/catalog` | Get models and LoRAs from ComfyUI |
| `GET` | `/history` | List history items |
| `DELETE` | `/history/{id}` | Delete a history item |
| `DELETE` | `/history` | Clear history |
| `POST` | `/uploads/image` | Upload an input image |
| `POST` | `/uploads/image/from-history/{id}` | Prepare a history image |

The complete and current OpenAPI specification is available at `/docs` while
the API is running.

## Quality checks

Check frontend types:

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```

Lint the frontend:

```bash
npm run lint --workspace=web
```

Create a production build:

```bash
npm run build --workspace=web
```

Compile the Python modules:

```bash
cd apps/api
.venv/bin/python -m compileall -q app
```

The root `npm run lint` and `npm run build` scripts are currently placeholders.
Use the workspace commands above for real checks.

## Roadmap

Planned major work packages:

1. Real AWS account integration and cloud instance status
2. Robust queue and cancellation management directly through ComfyUI
3. Training and LoRA workflows
4. Settings and user accounts
5. Marketplace and plugin interfaces
6. Production-ready packaging and deployment

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

Please report security issues according to [SECURITY.md](SECURITY.md).

## License

Veyqra is licensed under the
[GNU Affero General Public License v3.0](LICENSE).

### Third-party components

Veyqra does not distribute AI model weights. Models, LoRAs,
ComfyUI custom nodes, and other third-party components remain subject
to their respective licenses. Users are responsible for reviewing
those licenses before use. Direct dependency license information is
listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
