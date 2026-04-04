
import type { Claim } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Qwen3.6 Plus — free on OpenRouter, strong at structured JSON output and coding tasks
const MODEL = 'qwen/qwen3.6-plus:free';

function getApiKey(): string | null {
  return (import.meta as any).env?.VITE_OPENROUTER_API_KEY || null;
}

interface ExtractionResult {
  entities: string[];
  category: Claim['category'];
  confidence: Claim['confidence'];
  claim_text?: string; // optionally improved claim text
}

/**
 * Use OpenRouter (free tier) to extract structured entities and metadata
 * from a title + description. Returns enriched extraction results.
 *
 * Falls back to empty result if API is unavailable.
 */
export async function extractWithOpenRouter(
  title: string,
  description: string = '',
  sourceKind: string = 'unknown',
): Promise<ExtractionResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const truncatedDesc = description.slice(0, 500);
  const prompt = `Extract structured intelligence from this ${sourceKind} item.

Title: ${title}
${truncatedDesc ? `Description: ${truncatedDesc}` : ''}

Return ONLY valid JSON with these fields:
{
  "entities": ["list of proper nouns, company names, product names, people, technologies mentioned - be thorough, extract ALL named entities"],
  "category": "one of: MODELS, COMPUTE, CAPITAL, BIOLOGY, ROBOTICS, ENERGY, SPACE, GOVERNANCE, INFRASTRUCTURE, CONSCIOUSNESS",
  "confidence": "high, medium, or low based on how concrete/verified the claim is",
  "claim_text": "a clear 1-sentence summary of the key claim or finding (rewrite title if needed for clarity)"
}`;

  try {
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
          { role: 'system', content: 'You are a structured data extraction assistant. Return only valid JSON, no markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn(`OpenRouter extraction failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON from response — handle markdown code blocks, thinking tags, and preamble
    let jsonStr = content;
    // Strip <think>...</think> blocks (Qwen thinking mode)
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // Strip markdown code fences
    jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    // Find the first { and last } to extract JSON object
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return null;
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonStr);

    const validCategories = new Set([
      'MODELS', 'COMPUTE', 'CAPITAL', 'BIOLOGY', 'ROBOTICS',
      'ENERGY', 'SPACE', 'GOVERNANCE', 'INFRASTRUCTURE', 'CONSCIOUSNESS',
    ]);

    return {
      entities: Array.isArray(parsed.entities)
        ? parsed.entities.filter((e: unknown): e is string => typeof e === 'string' && e.trim().length > 0).slice(0, 10)
        : [],
      category: validCategories.has(parsed.category) ? parsed.category : 'MODELS',
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      claim_text: typeof parsed.claim_text === 'string' ? parsed.claim_text.trim() : undefined,
    };
  } catch (err) {
    console.warn('OpenRouter extraction error:', err);
    return null;
  }
}

/**
 * Batch extract entities for multiple items. Processes sequentially to
 * stay within rate limits. Skips items that already have good entities.
 */
export async function batchExtract(
  items: Array<{ title: string; description?: string; sourceKind: string }>,
  maxItems: number = 15,
): Promise<Array<ExtractionResult | null>> {
  const apiKey = getApiKey();
  if (!apiKey) return items.map(() => null);

  const results: Array<ExtractionResult | null> = [];

  for (let i = 0; i < Math.min(items.length, maxItems); i++) {
    const item = items[i];
    const result = await extractWithOpenRouter(item.title, item.description || '', item.sourceKind);
    results.push(result);

    // Small delay between requests to be respectful
    if (i < items.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Fill remaining with null
  while (results.length < items.length) {
    results.push(null);
  }

  return results;
}
