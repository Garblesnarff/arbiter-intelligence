
import { Claim } from "../types";

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'qwen/qwen3.6-plus:free';

const CLAIM_CATEGORIES = new Set<Claim["category"]>([
  "MODELS", "CAPITAL", "BIOLOGY", "ROBOTICS", "ENERGY",
  "SPACE", "COMPUTE", "GOVERNANCE", "INFRASTRUCTURE", "CONSCIOUSNESS",
]);

const getApiKey = (): string | null =>
  (import.meta as any).env?.VITE_OPENROUTER_API_KEY || null;

const stripHtml = (html: string): string => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || "";
};

const EXTRACTION_PROMPT = `You are an expert analyst extracting structured claims from technology and science articles.

Extract individual claims — concrete facts, announcements, data points, or findings.

Return ONLY valid JSON (no markdown, no explanation) in this format:
{
  "claims": [
    {
      "claim_text": "Concise statement of the claim (1-2 sentences)",
      "original_sentence": "The exact sentence(s) from the source",
      "category": "MODELS|COMPUTE|BIOLOGY|ROBOTICS|SPACE|ENERGY|CAPITAL|GOVERNANCE|INFRASTRUCTURE|CONSCIOUSNESS",
      "entities": ["Company", "Product", "Person", "Technology"],
      "metric_value": "75.0 or null",
      "metric_unit": "%|$B|tokens|null",
      "metric_context": "What the metric measures",
      "confidence": "high|medium|low",
      "model_relevance": true or false
    }
  ]
}

Extract ALL named entities thoroughly — company names, product names, people, technologies, benchmarks.
Be thorough with entities — they are critical for linking related claims across sources.`;

export const extractClaimsFromPost = async (
  rawHtml: string,
  postUrl: string,
  postDate: string
): Promise<Claim[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Extraction skipped: no VITE_OPENROUTER_API_KEY configured.");
    return [];
  }

  try {
    const cleanText = stripHtml(rawHtml);
    const truncatedText = cleanText.substring(0, 8000); // shorter than Gemini's 15k — free tier is more limited

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://arbiter-intelligence.app',
        'X-Title': 'Arbiter Intelligence',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: `Extract claims from this article text:\n\n${truncatedText}` },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn(`Extraction API failed: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return [];

    // Parse JSON — handle thinking tags, code fences, preamble
    let jsonStr = content;
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return [];
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

    let result: { claims?: Array<Record<string, unknown>> };
    try {
      result = JSON.parse(jsonStr);
    } catch (error) {
      console.warn("Extraction returned invalid JSON:", error);
      return [];
    }

    const claims = Array.isArray(result.claims) ? result.claims : [];

    return claims.flatMap((claim, index) => {
      const claimText = typeof claim.claim_text === "string" ? claim.claim_text.trim() : "";
      if (!claimText) return [];

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
        metric_value: metricValue ? `${metricValue}${metricUnit ? ' ' + metricUnit : ''}` : undefined,
        metric_context: metricContext,
        confidence,
        sentiment: "neutral" as const,
        date: postDate,
        source_url: postUrl,
        source_feed: "",
        source_feed_name: "",
        model_relevance: Boolean(claim.model_relevance),
      }];
    });

  } catch (error) {
    console.error("Extraction failed:", error);
    return [];
  }
};
