# Yojana-Drishti Report (Qdrant Convolve 4.0)

## 1. Problem Statement
Millions of rural citizens struggle to identify which welfare schemes they qualify for due to complex eligibility rules, language barriers, and limited access to official portals.

## 2. System Design
The system is a three-stage pipeline:

- **Drishti (Vision)** extracts structured eligibility signals from images.
- **Vidhi (Qdrant Retrieval)** performs filtered semantic search over schemes.
- **Sahayak (Action)** provides evidence-based recommendations and stores memory.

Qdrant is critical for semantic search + metadata filtering + memory storage.

## 3. Multimodal Strategy
- **Image signals**: extracted from photos (housing type, assets, demographics).
- **Text signals**: scheme descriptions and user intent.
- **Embeddings**: sentence-transformers for text; optional OpenAI if configured.

## 4. Search / Memory / Recommendation Logic
- **Search**: query embedding + filters (state, housing, caste, land).
- **Memory**: each interaction is stored in a `case_memory` collection, enabling recall and updates.
- **Recommendation**: top schemes with explanation of matched filters.
- **Form readiness**: recommended schemes can be turned into prefilled form drafts with applicant
  details, ready to share with officials.

## 5. Evidence-based Outputs
Each recommendation includes:
- Retrieved scheme payload
- The filter matches (signals vs. rules)
- A traceable relevance score

## 6. Limitations & Ethics
See `docs/ethics.md` for risks and mitigations.