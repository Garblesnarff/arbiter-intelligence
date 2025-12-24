import { GoogleGenAI, Type } from "@google/genai";
import { Claim } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Helper to strip HTML tags to save tokens
const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || "";
};

const EXTRACTION_PROMPT = `
You are an expert analyst extracting structured claims from AI acceleration chronicles.

INPUT: A chronicle entry from "The Innermost Loop".

OUTPUT: A JSON array of claims with the following structure:
{
  "claims": [
    {
      "claim_text": "Concise statement of the claim (1-2 sentences)",
      "original_sentence": "The exact sentence(s) from the source",
      "category": "MODELS|COMPUTE|BIOLOGY|ROBOTICS|SPACE|ENERGY|CAPITAL|GOVERNANCE|INFRASTRUCTURE|CONSCIOUSNESS",
      "subcategory": "capability|funding|deployment|benchmark|announcement|prediction|policy",
      "entities": ["Entity1", "Entity2"],
      "metric_type": "benchmark_score|funding|percentage|count|null",
      "metric_value": "75.0 or null (as string)",
      "metric_unit": "%|$B|tokens|null",
      "metric_context": "What the metric measures",
      "confidence": "high|medium|low",
      "model_relevance": true/false (does this affect AI model capabilities/pricing?)
    }
  ]
}

CATEGORY DEFINITIONS:
- MODELS: AI model releases, capabilities, benchmarks, architecture
- COMPUTE: Data centers, chips, training infrastructure, hardware
- BIOLOGY: Longevity, gene therapy, drug discovery, medical breakthroughs
- ROBOTICS: Humanoids, autonomous vehicles, drones, industrial automation
- SPACE: Orbital compute, launches, lunar/Mars infrastructure, satellites
- ENERGY: Nuclear, solar, fusion, grid infrastructure, power generation
- CAPITAL: Funding rounds, valuations, market movements, revenue
- GOVERNANCE: Regulation, policy, institutional responses, legal
- INFRASTRUCTURE: Physical buildout, supply chains, manufacturing
- CONSCIOUSNESS: AI sentience, interpretability, alignment, welfare

ENTITY EXTRACTION:
- Extract company names, model names, person names, benchmark names
- Normalize variations: "GPT-5.2-xhigh" and "GPT 5.2 xhigh" -> "GPT-5.2-xhigh"
- Include benchmark names as entities: "ARC-AGI-2", "SWE-Bench"

CONFIDENCE LEVELS:
- high: Direct quotes, specific metrics, named sources
- medium: Reasonable extrapolation, industry reports
- low: Predictions, forecasts, "reportedly" language

MODEL_RELEVANCE:
- true: Claim affects understanding of AI model capabilities, pricing, or performance
- false: Claim is about other domains (biology, space, etc.)

Extract ALL substantive claims.
`;

export const extractClaimsFromPost = async (
  rawHtml: string,
  postUrl: string,
  postDate: string
): Promise<Claim[]> => {
  if (!apiKey) {
    console.warn("No API Key. Returning empty extraction.");
    return [];
  }

  try {
    const cleanText = stripHtml(rawHtml);
    // Limit text length for preview/MVP purposes to avoid token limits on very long posts
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

    const result = JSON.parse(response.text || "{ \"claims\": [] }");
    
    // Map response to our internal Claim type
    return result.claims.map((c: any, index: number) => ({
      id: `${postUrl}-${index}`,
      post_id: postUrl,
      category: c.category,
      claim_text: c.claim_text,
      original_sentence: c.original_sentence,
      entities: c.entities || [],
      metric_value: c.metric_value ? `${c.metric_value}${c.metric_unit ? c.metric_unit : ''}` : undefined,
      confidence: c.confidence,
      sentiment: "neutral", // LLM extraction didn't ask for sentiment, default neutral
      date: postDate,
      source_url: postUrl,
      model_relevance: c.model_relevance
    }));

  } catch (error) {
    console.error("Gemini Extraction Failed:", error);
    return [];
  }
};