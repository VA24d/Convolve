# 0001 - Embedding Backend Choice

## Status
Accepted

## Context
We need a fast, reproducible embedding pipeline for scheme descriptions and queries. The system should also support hosted embeddings when API keys are available.

## Decision
Use sentence-transformers (`all-MiniLM-L6-v2`) as the default embedding backend, with an optional OpenAI embedding backend enabled via `EMBEDDING_BACKEND=openai`.

## Consequences
- The default path is offline-friendly and deterministic.
- OpenAI embeddings are optional and require `OPENAI_API_KEY`.