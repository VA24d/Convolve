# 0002 - Mobile Orchestration with LangChain.js

## Status
Accepted

## Context
The initial mobile app called the FastAPI backend to run eligibility analysis. The user requested that LangChain and the orchestration run directly on the mobile device instead of calling the backend pipeline.

## Decision
Move the orchestration pipeline to the mobile app using LangChain.js and direct calls to Qdrant/OpenAI. The mobile app now:
- Embeds the query with `@langchain/openai` on-device.
- Calls Qdrant’s REST API for scheme search and memory recall.
- Stores new case memory entries back into Qdrant.
- Optionally runs the vision extraction through the OpenAI Responses API.

## Consequences
- The mobile app requires OpenAI + Qdrant credentials in `mobile/config.ts`.
- The FastAPI `/analyze` endpoint is no longer required for mobile usage (still available for the Streamlit demo).
- Network calls are made directly from the device, so API keys must be protected appropriately for production builds.