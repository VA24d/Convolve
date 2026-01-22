# Architecture Overview

## Problem
Rural citizens struggle to understand which welfare schemes they qualify for due to complex eligibility rules and language barriers.

## System
Yojana-Drishti is a multimodal eligibility assistant that combines:

- **Vision extraction (Drishti)** to turn photos into structured signals.
- **Qdrant filtered semantic search (Vidhi)** to retrieve matching schemes.
- **Action output (Sahayak)** to present evidence-based recommendations and audio feedback.
- **On-device orchestration (mobile)** to run LangChain embeddings and Qdrant/OpenAI calls locally on the Expo app.
- **Guided mobile UI** with safe-area support and Vision hints that allow missing details to be inferred from photos.

## Data Flow
1. User uploads a photo (library or camera) or provides manual evidence.
2. Drishti extracts `EligibilitySignals` JSON (or falls back to defaults).
3. On mobile, LangChain embeddings are computed on-device; signals + intent are sent to Qdrant with metadata filters.
4. Qdrant returns top matching schemes.
5. The system generates explanations and stores the interaction in memory.

## Why Qdrant is Critical
- Vector search over scheme descriptions enables semantic matching (“housing aid”).
- Payload filtering supports rule-based eligibility checks (state, housing, caste, land).
- Memory collection stores past cases for long-term recall.