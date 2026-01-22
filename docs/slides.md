# Yojana-Drishti Slides (Submission Deck)

## Slide 1 — Title
**Yojana-Drishti (Convolve 4.0)**
Multimodal eligibility assistant for Indian welfare schemes

- Pan-IIT AI/ML Hackathon — Qdrant track
- Team: Convolve
- Tagline: Search, Memory, Recommendations for last-mile welfare access

---

## Slide 2 — Problem Statement
**Why this matters**

- Welfare eligibility rules are complex, fragmented, and hard to access.
- Rural citizens face language and digital barriers.
- Funds often go unused due to low awareness and eligibility uncertainty.

**Goal:** Help field officers and applicants discover the right scheme quickly with evidence.

---

## Slide 3 — System Overview
**Three-stage pipeline**

1. **Drishti (Vision):** Extracts eligibility signals from photos.
2. **Vidhi (Qdrant Retrieval):** Hybrid search + metadata filters over schemes.
3. **Sahayak (Action):** Recommendations, evidence packs, and form drafts.

Qdrant is the core engine for hybrid retrieval and memory.

---

## Slide 4 — Architecture & Data Flow
**End-to-end flow**

- User enters text signals + optional photo.
- Vision yields structured `EligibilitySignals` JSON.
- Mobile runs LangChain embeddings locally or calls backend API.
- Qdrant hybrid search retrieves top schemes with filter matches.
- Memory stored in `case_memory`, updated with feedback.

---

## Slide 5 — Multimodal Strategy
**Inputs & embeddings**

- Photos → housing type, assets, demographics.
- Text intent → semantic match.
- Dense + sparse retrieval for scheme descriptions.
- Optional OpenAI embeddings or sentence-transformers.

---

## Slide 6 — Search, Memory, Recommendation Logic
**Retrieval + evidence-first output**

- Hybrid dense + sparse search with filters (state, caste, land, housing).
- Memory entries store `status`, `feedback_score`, `chosen_scheme_id`.
- Recency-aware recall and memory updates.
- Explanations include traceable Qdrant point IDs.

---

## Slide 7 — Mobile + Field Workflow
**On-device and backend orchestration**

- Mobile app supports on-device LangChain orchestration.
- Optional backend mode for hybrid retrieval + memory IDs.
- Form drafts auto-filled from signals and applicant profile.
- Shareable evidence pack for officials.

---

## Slide 8 — Demo Walkthrough (2 min)
**Narrative**

- Capture a photo of a rural home.
- Drishti detects housing type + assets.
- Vidhi retrieves top schemes under strict filters.
- Sahayak delivers recommendation + evidence pack.

**Outcome:** explainable eligibility with traceable evidence.

---

## Slide 9 — Impact, Responsibility & Ethics
**Societal impact**

- Faster eligibility discovery → higher utilization of welfare schemes.
- Works in field settings with minimal inputs.

**Ethics & limitations**

- Bias + privacy considerations documented.
- Vision inference is optional and transparent.
- Requires proper key handling for production.

---

## Slide 10 — What’s Next
**Roadmap**

- Validate workflow on-device with field officers.
- Map fields to official scheme templates.
- Strengthen secure key handling for mobile production.
- Expand scheme dataset + multi-language outputs.