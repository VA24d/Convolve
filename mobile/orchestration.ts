import { OpenAIEmbeddings } from "@langchain/openai";

import {
  OPENAI_API_KEY,
  QDRANT_API_KEY,
  QDRANT_COLLECTIONS,
  QDRANT_URL,
} from "./config";

type HousingType = "kutcha" | "pucca" | "unknown";

type EligibilitySignals = {
  housing_type: HousingType;
  assets: string[];
  demographics: string[];
  state?: string | null;
  caste?: string | null;
  land_acres?: number | null;
  intent?: string | null;
  notes?: string | null;
};

type AnalyzeResult = {
  signals: EligibilitySignals;
  explanations: Array<Record<string, unknown>>;
  memories: Array<Record<string, unknown>>;
};

type AnalyzeInput = {
  state: string | null;
  caste: string | null;
  landAcres: number | null;
  housingType: HousingType;
  assets: string[];
  demographics: string[];
  intent: string | null;
  useVision: boolean;
  imageBase64: string | null;
};

type QdrantSchemePayload = {
  scheme_id?: string;
  scheme_name?: string;
  description?: string;
  states?: string[];
  eligibility_rules?: Record<string, unknown>;
  benefits?: string;
  source_url?: string | null;
};

type QdrantPoint<TPayload> = {
  id: string | number;
  score?: number;
  payload?: TPayload;
};

type QdrantSearchResponse<TPayload> = {
  result: Array<QdrantPoint<TPayload>>;
};

type QdrantUpsertResponse = {
  status: string;
};

type VisionResponseContent = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureOpenAiKey(): string {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith("YOUR_")) {
    throw new Error("Set OPENAI_API_KEY in mobile/config.ts to use on-device orchestration.");
  }
  return OPENAI_API_KEY;
}

function getQdrantHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (QDRANT_API_KEY && !QDRANT_API_KEY.startsWith("YOUR_")) {
    headers["api-key"] = QDRANT_API_KEY;
  }
  return headers;
}

function getOpenAiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ensureOpenAiKey()}`,
  };
}

async function requestJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }
  return (await response.json()) as T;
}

function fallbackSignals(): EligibilitySignals {
  return {
    housing_type: "unknown",
    assets: [],
    demographics: [],
    notes: "Fallback signals (no vision API).",
  };
}

function cleanJsonText(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\n?/i, "").replace(/```$/, "").trim();
  }
  return trimmed;
}

function parseVisionResponse(content: VisionResponseContent): EligibilitySignals {
  const outputText = content.output_text;
  if (outputText && outputText.trim()) {
    return JSON.parse(cleanJsonText(outputText)) as EligibilitySignals;
  }

  const segments = content.output?.flatMap((entry) => entry.content ?? []) ?? [];
  const text = segments.map((segment) => segment.text).filter(Boolean).join("");
  if (!text.trim()) {
    throw new Error("Vision response did not include JSON text.");
  }
  return JSON.parse(cleanJsonText(text)) as EligibilitySignals;
}

async function extractSignalsFromImage(imageBase64: string, hints: string): Promise<EligibilitySignals> {
  const payload = {
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Analyze this image for Indian government welfare eligibility. " +
              "Return JSON with keys: housing_type (kutcha/pucca/unknown), " +
              "assets (list), demographics (list), notes (string). Keep lists short. " +
              `Hints: ${hints}`,
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${imageBase64}`,
          },
        ],
      },
    ],
  };

  const response = await requestJson<VisionResponseContent>(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: getOpenAiHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseVisionResponse(response);
}

function buildSignals(input: AnalyzeInput, baseSignals: EligibilitySignals): EligibilitySignals {
  const signals = { ...baseSignals };
  signals.state = input.state ?? baseSignals.state;
  signals.caste = input.caste ?? baseSignals.caste;
  signals.land_acres = input.landAcres ?? baseSignals.land_acres ?? null;
  if (input.housingType && input.housingType !== "unknown") {
    signals.housing_type = input.housingType;
  }
  signals.assets = input.assets;
  signals.demographics = input.demographics;
  signals.intent = input.intent ?? baseSignals.intent ?? null;
  return signals;
}

function signalSummaryText(signals: EligibilitySignals): string {
  const segments: string[] = [`housing=${signals.housing_type}`];
  if (signals.state) {
    segments.push(`state=${signals.state}`);
  }
  if (signals.caste) {
    segments.push(`caste=${signals.caste}`);
  }
  if (signals.land_acres !== null && signals.land_acres !== undefined) {
    segments.push(`land_acres=${signals.land_acres}`);
  }
  if (signals.assets.length > 0) {
    segments.push(`assets=${signals.assets.join(", ")}`);
  }
  if (signals.demographics.length > 0) {
    segments.push(`demographics=${signals.demographics.join(", ")}`);
  }
  if (signals.intent) {
    segments.push(`intent=${signals.intent}`);
  }
  if (signals.notes) {
    segments.push(`notes=${signals.notes}`);
  }
  return segments.join(" | ");
}

function memorySummaryText(signals: EligibilitySignals, queryIntent: string): string {
  const summary = signalSummaryText(signals);
  return `intent=${queryIntent} | ${summary}`;
}

function buildFilter(signals: EligibilitySignals): Record<string, unknown> | null {
  const must: Array<Record<string, unknown>> = [];
  const should: Array<Record<string, unknown>> = [];

  if (signals.state) {
    should.push({ key: "states", match: { value: signals.state } });
    should.push({ key: "states", match: { value: "All" } });
  }
  if (signals.housing_type !== "unknown") {
    must.push({ key: "eligibility_rules.housing", match: { value: signals.housing_type } });
  }
  if (signals.caste) {
    must.push({ key: "eligibility_rules.caste", match: { value: signals.caste } });
  }
  if (signals.land_acres !== null && signals.land_acres !== undefined) {
    must.push({ key: "eligibility_rules.land_max_acres", range: { lte: signals.land_acres } });
  }

  if (must.length === 0 && should.length === 0) {
    return null;
  }

  return {
    must: must.length > 0 ? must : undefined,
    should: should.length > 0 ? should : undefined,
  };
}

function explainMatch(
  signals: EligibilitySignals,
  point: QdrantPoint<QdrantSchemePayload>
): Record<string, unknown> {
  const payload = point.payload ?? {};
  const rules = payload.eligibility_rules ?? {};
  const explanation: Record<string, unknown> = {
    scheme_name: payload.scheme_name ?? "Unknown",
    benefits: payload.benefits ?? "",
    score: point.score ?? null,
    matched_filters: {},
    notes: signals.notes ?? null,
  };

  const matchedFilters = explanation.matched_filters as Record<string, unknown>;

  if (signals.housing_type !== "unknown") {
    matchedFilters.housing = {
      signal: signals.housing_type,
      rule: rules["housing"],
    };
  }

  if (signals.state) {
    matchedFilters.state = {
      signal: signals.state,
      rule: payload.states,
    };
  }

  if (signals.caste) {
    matchedFilters.caste = {
      signal: signals.caste,
      rule: rules["caste"],
    };
  }

  if (signals.land_acres !== null && signals.land_acres !== undefined) {
    matchedFilters.land_acres = {
      signal: signals.land_acres,
      rule: rules["land_max_acres"],
    };
  }

  return explanation;
}

function getSearchResults<TPayload>(data: unknown): Array<QdrantPoint<TPayload>> {
  if (isRecord(data) && Array.isArray(data.result)) {
    return data.result as Array<QdrantPoint<TPayload>>;
  }
  throw new Error("Unexpected Qdrant response format.");
}

async function searchSchemes(
  embeddings: OpenAIEmbeddings,
  signals: EligibilitySignals,
  queryText: string
): Promise<{ explanations: Array<Record<string, unknown>>; schemeIds: string[] }> {
  const vector = await embeddings.embedQuery(queryText);
  const filter = buildFilter(signals);
  const response = await requestJson<QdrantSearchResponse<QdrantSchemePayload>>(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTIONS.schemes}/points/search`,
    {
      method: "POST",
      headers: getQdrantHeaders(),
      body: JSON.stringify({
        vector,
        filter,
        limit: 3,
        with_payload: true,
      }),
    }
  );

  const points = getSearchResults<QdrantSchemePayload>(response);
  const explanations = points.map((point) => explainMatch(signals, point));
  const schemeIds = points
    .map((point) => (point.payload?.scheme_id ? String(point.payload.scheme_id) : null))
    .filter((value): value is string => value !== null);

  return { explanations, schemeIds };
}

async function recallMemories(
  embeddings: OpenAIEmbeddings,
  queryText: string
): Promise<Array<Record<string, unknown>>> {
  const vector = await embeddings.embedQuery(queryText);
  const response = await requestJson<QdrantSearchResponse<Record<string, unknown>>>(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTIONS.memories}/points/search`,
    {
      method: "POST",
      headers: getQdrantHeaders(),
      body: JSON.stringify({
        vector,
        limit: 3,
        with_payload: true,
      }),
    }
  );
  const points = getSearchResults<Record<string, unknown>>(response);
  return points.map((point) => point.payload ?? {});
}

async function saveMemory(
  embeddings: OpenAIEmbeddings,
  signals: EligibilitySignals,
  queryIntent: string,
  schemeIds: string[]
): Promise<QdrantUpsertResponse> {
  const summary = memorySummaryText(signals, queryIntent);
  const vector = await embeddings.embedQuery(summary);
  const caseId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const payload = {
    signals,
    query_intent: queryIntent,
    retrieved_scheme_ids: schemeIds,
    chosen_scheme_id: null,
    created_at: new Date().toISOString(),
  };

  return requestJson<QdrantUpsertResponse>(
    `${QDRANT_URL}/collections/${QDRANT_COLLECTIONS.memories}/points?wait=true`,
    {
      method: "PUT",
      headers: getQdrantHeaders(),
      body: JSON.stringify({
        points: [
          {
            id: caseId,
            vector,
            payload,
          },
        ],
      }),
    }
  );
}

export async function runMobileOrchestration(input: AnalyzeInput): Promise<AnalyzeResult> {
  ensureOpenAiKey();
  const embeddings = new OpenAIEmbeddings({ apiKey: OPENAI_API_KEY });
  let baseSignals = fallbackSignals();

  if (input.useVision) {
    if (!input.imageBase64) {
      throw new Error("Select a photo or disable vision.");
    }
    const hints = JSON.stringify({
      state: input.state,
      caste: input.caste,
      land_acres: input.landAcres,
    });
    baseSignals = await extractSignalsFromImage(input.imageBase64, hints);
  }

  const signals = buildSignals(input, baseSignals);
  const queryIntent = input.intent ?? "";
  const queryText = queryIntent || signalSummaryText(signals);

  const { explanations, schemeIds } = await searchSchemes(embeddings, signals, queryText);
  await saveMemory(embeddings, signals, queryIntent, schemeIds);
  const memories = await recallMemories(embeddings, queryText);

  return {
    signals,
    explanations,
    memories,
  };
}

export type { AnalyzeInput, AnalyzeResult, EligibilitySignals };