from __future__ import annotations

from dataclasses import dataclass
import os

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None
    qdrant_url: str | None
    qdrant_api_key: str | None
    embedding_backend: str


def load_settings() -> Settings:
    load_dotenv()
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        qdrant_url=os.getenv("QDRANT_URL"),
        qdrant_api_key=os.getenv("QDRANT_API_KEY"),
        embedding_backend=os.getenv("EMBEDDING_BACKEND", "sentence-transformers"),
    )


def require_qdrant_settings(settings: Settings) -> None:
    if not settings.qdrant_url:
        raise ValueError("QDRANT_URL is required to connect to Qdrant")
    if not settings.qdrant_api_key:
        raise ValueError("QDRANT_API_KEY is required for Qdrant Cloud")