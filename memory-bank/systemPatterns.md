# System Patterns

## Architecture Patterns
- Retrieval pipeline: signals + intent -> embeddings -> Qdrant search + filters -> explanations + memory write.
- Optional vision extraction using OpenAI Responses API.

## Data Access
- Qdrant used for both scheme retrieval and memory recall.
- Filtering includes state, housing, caste, and land acreage.

## Mobile Orchestration
- Mobile app uses LangChain.js (`@langchain/openai`) to compute embeddings locally.
- Direct REST calls to Qdrant for search and memory operations.