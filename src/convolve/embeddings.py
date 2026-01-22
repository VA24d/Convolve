from __future__ import annotations

from typing import Protocol, Sequence

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import OpenAIEmbeddings

from convolve.config import Settings


class EmbeddingBackend(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        ...

    def embed_query(self, text: str) -> list[float]:
        ...


class EmbeddingService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._backend = settings.embedding_backend
        self._hf_backend: HuggingFaceEmbeddings | None = None
        self._openai_backend: OpenAIEmbeddings | None = None

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return self._get_backend().embed_documents(list(texts))

    def embed_query(self, text: str) -> list[float]:
        return self._get_backend().embed_query(text)

    def embedding_dimension(self) -> int:
        return len(self.embed_query("dimension"))

    def _get_backend(self) -> EmbeddingBackend:
        if self._backend == "openai":
            return self._openai_embeddings()
        return self._hf_embeddings()

    def _hf_embeddings(self) -> HuggingFaceEmbeddings:
        if self._hf_backend is None:
            self._hf_backend = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
        return self._hf_backend

    def _openai_embeddings(self) -> OpenAIEmbeddings:
        if not self._settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for OpenAI embeddings")
        if self._openai_backend is None:
            self._openai_backend = OpenAIEmbeddings(
                openai_api_key=self._settings.openai_api_key
            )
        return self._openai_backend