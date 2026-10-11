from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Veyqra API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"

    host: str = Field(
        default="0.0.0.0",
        alias="VEYQRA_API_HOST",
    )

    port: int = Field(
        default=8000,
        alias="VEYQRA_API_PORT",
    )

    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="VEYQRA_CORS_ORIGINS",
    )

    comfyui_url: str = Field(
        default="http://127.0.0.1:8188",
        alias="VEYQRA_COMFYUI_URL",
    )

    public_api_url: str = Field(
        default="",
        alias="VEYQRA_PUBLIC_API_URL",
    )

    ai_toolkit_script: str = Field(
        default="",
        alias="VEYQRA_AI_TOOLKIT_SCRIPT",
    )

    ai_toolkit_python: str = Field(
        default="python",
        alias="VEYQRA_AI_TOOLKIT_PYTHON",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins_raw.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
