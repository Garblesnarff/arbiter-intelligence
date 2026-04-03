
import { GoogleGenAI, Type } from "@google/genai";
import { Claim } from "../types";

const CLAIM_CATEGORIES = new Set<Claim["category"]>([
  "MODELS",
  "CAPITAL",
  "BIOLOGY",
  "ROBOTICS",
  "ENERGY",
  "SPACE",
  "COMPUTE",
  "GOVERNANCE",
  "INFRASTRUCTURE",
  "CONSCIOUSNESS",
]);

const getApiKey = () =>
  import.meta.env.VITE_GEMINI_API_KEY
  || (typeof process !== 'undefined' ? process.env.API_KEY || process.env.GEMINI_API_KEY : undefined);

// Helper to strip HTML tags to save tokens
const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || "";
};

const EXTRACTION_PROMPT = `
You are an expert analyst extracting structured claims from AI acceleration chronicles.

INPUT: A chronicle entry.

OUTPUT: A JSON array of claims with the following structure:
{
  "claims": [
    {
      "claim_text": "Concise statement of the claim (1-2 sentences)",
      "original_sentence": "The exact sentence(s) from the source",
      "category": "MODELS|COMPUTE|BIOLOGY|ROBOTICS|SPACE|ENERGY|CAPITAL|GOVERNANCE|INFRASTRUCTURE|CONSCIOUSNESS",
      "entities": ["Entity1", "Entity2"],
      "metric_value": "75.0 or null (as string)",
      "metric_unit": "%|$B|tokens|null",
      "metric_context": "What the metric measures (e.g. 'ARC-AGI', 'Pricing', 'Context Window')",
      "confidence": "high|medium|low",
      "model_relevance": true/false
    }
  ]
}
`;

export const extractClaimsFromPost = async (
  rawHtml: string,
  postUrl: string,
  postDate: string
): Promise<Claim[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini extraction skipped because no API key is configured.");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const cleanText = stripHtml(rawHtml);
    const truncatedText = cleanText.substring(0, 15000); 

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract claims from this chronicle text:\n\n${truncatedText}`,
      config: {
        systemInstruction: EXTRACTION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            claims: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  claim_text: { type: Type.STRING },
                  original_sentence: { type: Type.STRING },
                  category: { type: Type.STRING },
                  entities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  metric_value: { type: Type.STRING, nullable: true },
                  metric_unit: { type: Type.STRING, nullable: true },
                  metric_context: { type: Type.STRING, nullable: true },
                  confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  model_relevance: { type: Type.BOOLEAN },
                },
                required: ["claim_text", "category", "entities", "confidence", "model_relevance"],
              },
            },
          },
        },
      },
    });

    let result: { claims?: Array<Record<string, unknown>> } = { claims: [] };
    try {
      result = JSON.parse(response.text || '{ "claims": [] }');
    } catch (error) {
      console.warn("Gemini extraction returned invalid JSON:", error);
      return [];
    }
    
    const claims = Array.isArray(result.claims) ? result.claims : [];

    return claims.flatMap((claim, index) => {
      const claimText = typeof claim.claim_text === "string" ? claim.claim_text.trim() : "";
      if (!claimText) {
        return [];
      }

      const category = CLAIM_CATEGORIES.has(claim.category as Claim["category"])
        ? (claim.category as Claim["category"])
        : "MODELS";
      const confidence = claim.confidence === "low" || claim.confidence === "medium" || claim.confidence === "high"
        ? claim.confidence
        : "medium";
      const entities = Array.isArray(claim.entities)
        ? claim.entities.filter((entity): entity is string => typeof entity === "string" && entity.trim().length > 0)
        : [];
      const metricValue = typeof claim.metric_value === "string" && claim.metric_value.trim()
        ? claim.metric_value.trim()
        : undefined;
      const metricUnit = typeof claim.metric_unit === "string" && claim.metric_unit.trim()
        ? claim.metric_unit.trim()
        : undefined;
      const metricContext = typeof claim.metric_context === "string" && claim.metric_context.trim()
        ? claim.metric_context.trim()
        : undefined;
      const originalSentence = typeof claim.original_sentence === "string" && claim.original_sentence.trim()
        ? claim.original_sentence.trim()
        : undefined;

      return [{
        id: `${postUrl}-${index}`,
        post_id: postUrl,
        category,
        claim_text: claimText,
        original_sentence: originalSentence,
        entities,
        metric_value: metricValue ? `${metricValue}${metricUnit ?? ''}` : undefined,
        metric_context: metricContext,
        confidence,
        sentiment: "neutral",
        date: postDate,
        source_url: postUrl,
        source_feed: "",
        source_feed_name: "",
        model_relevance: Boolean(claim.model_relevance),
      }];
    });

  } catch (error) {
    console.error("Gemini Extraction Failed:", error);
    return [];
  }
};
