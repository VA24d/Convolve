# Project Brief

## Overview
Yojana-Drishti (Convolve 4.0) is a multimodal eligibility assistant for Indian welfare schemes. It combines vision-based signal extraction, filtered semantic search in Qdrant, and explainable recommendations, with optional memory recall for prior cases.

## Goals
- Provide reliable welfare scheme recommendations based on user-provided signals and intent.
- Use Qdrant filtering + semantic search to handle complex eligibility rules.
- Support both web (Streamlit) and mobile (Expo) experiences.

## Scope
- Python backend for data ingest, retrieval pipeline, memory, and optional vision extraction.
- Mobile app that can run orchestration on-device using LangChain.js and direct Qdrant/OpenAI calls.

## Non-Goals
- Production-grade secret management for mobile clients.
- Full offline operation on mobile devices.