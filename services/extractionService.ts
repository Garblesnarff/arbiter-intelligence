
import { GoogleGenAI, Type } from "@google/genai";
import { Claim } from "../types";

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
  // Always initialize GoogleGenAI with the API key from process.env.API_KEY directly
  // Create a new instance right before the call as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const cleanText = stripHtml(rawHtml);
    // Limit text length to avoid token limits for very long posts
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

    // Access text directly from response.text property
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
      metric_context: c.metric_context,
      confidence: c.confidence,
      sentiment: "neutral",
      date: postDate,
      source_url: postUrl,
      model_relevance: c.model_relevance
    }));

  } catch (error) {
    console.error("Gemini Extraction Failed:", error);
    return [];
  }
};
