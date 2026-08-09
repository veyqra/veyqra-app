from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.generation import router as generation_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.api.routes.comfyui import router as comfyui_router
from app.api.routes.images import router as images_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for the Vyrra AI workstation.",
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

@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }
