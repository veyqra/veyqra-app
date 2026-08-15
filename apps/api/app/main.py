from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.generation import router as generation_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.api.routes.comfyui import router as comfyui_router
from app.api.routes.images import router as images_router
from app.api.routes.models import router as models_router
from app.api.routes.history import router as history_router
from app.api.routes.storage import router as storage_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes import uploads
import asyncio

from contextlib import asynccontextmanager

from app.services.generation_service import (
    generation_service,
)

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    recovery_task = asyncio.create_task(
        generation_service.resume_pending_jobs()
    )

    try:
        yield
    finally:
        recovery_task.cancel()

        try:
            await recovery_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for the Veyqra AI workstation.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(generation_router, prefix=settings.api_prefix)
app.include_router(
    comfyui_router,
    prefix=settings.api_prefix,
)
app.include_router(
    images_router,
    prefix=settings.api_prefix,
)

app.include_router(
    models_router,
    prefix=settings.api_prefix,
)

app.include_router(
    history_router,
    prefix=settings.api_prefix,
)

app.include_router(
    storage_router,
    prefix=settings.api_prefix,
)

app.include_router(
    dashboard_router,
    prefix=settings.api_prefix,
)

app.include_router(
    uploads.router,
    prefix=settings.api_prefix,
)

@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }
