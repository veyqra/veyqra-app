# Architektur

Veyqra verwendet eine modulare Service-Architektur.

```

```
                  Browser

                     │

              Next.js Frontend

                     │

             REST + WebSocket

                     │

             FastAPI Backend

──────────────────────────────────────────

Core Services

Generate

Training

History

Models

Cloud

Settings

──────────────────────────────────────────

Backend Adapter

ComfyUI

OneTrainer

Kohya

AWS

S3

SQLite

──────────────────────────────────────────

Infrastructure

Local GPU

AWS EC2

Docker

Filesystem

```

---

# Komponenten

## Frontend

Verantwortlich für

UI

Routing

State

Uploads

Realtime

---

## Backend

Verantwortlich für

Business Logic

API

Queue

Job Management

Authentication

---

## Generate Service

Aufgaben

Workflow erzeugen

Prompt senden

History speichern

Queue verwalten

---

## Training Service

Aufgaben

Dataset

Caption

Training

Monitoring

Logs

---

## Cloud Service

Aufgaben

AWS

EC2

S3

Spot

Kosten

---

## Model Service

Verwaltet

Checkpoints

LoRAs

VAEs

Embeddings

---

## Plugin Architektur

Alle Backends implementieren dieselben Interfaces.

```

GeneratorBackend

generate()

cancel()

status()

history()

```

TrainingBackend

train()

stop()

logs()

status()

```

CloudBackend

start()

stop()

health()

```

Dadurch kann später problemlos ergänzt werden:

- InvokeAI

- Forge

- Automatic1111

- RunPod

- Kubernetes

ohne Änderungen am Frontend.

