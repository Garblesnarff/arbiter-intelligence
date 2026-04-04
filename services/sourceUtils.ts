
import { Claim } from '../types';

// ---------------------------------------------------------------------------
// Category inference from free-text (title, description, topics, etc.)
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<Claim['category'], RegExp> = {
  BIOLOGY: /\b(biotech|biology|gene|genomic|crispr|dna|drug|pharma|protein|medical|health|clinical|vaccine)\b/i,
  ROBOTICS: /\b(robot|robotics|humanoid|actuator|manipulation|locomotion|drone|autonomous\s*vehicle)\b/i,
  COMPUTE: /\b(gpu|tpu|chip|semiconductor|nvidia|amd|intel|compute|hardware|hpc|asic|fpga|data\s*center)\b/i,
  ENERGY: /\b(energy|solar|battery|fusion|nuclear|renewable|grid|power\s*plant|electricity)\b/i,
  SPACE: /\b(space|spacex|rocket|satellite|orbit|mars|nasa|launch\s*vehicle|asteroid)\b/i,
  CAPITAL: /\b(funding|invest|venture|series\s*[a-f]|valuation|ipo|acquisition|merger|billion|million\s*dollar)\b/i,
  GOVERNANCE: /\b(regulation|policy|governance|legislation|compliance|safety\s*board|executive\s*order|eu\s*ai\s*act)\b/i,
  INFRASTRUCTURE: /\b(infrastructure|cloud|aws|azure|gcp|kubernetes|deploy|data\s*pipeline|networking)\b/i,
  CONSCIOUSNESS: /\b(consciousness|sentien|agi|alignment|superintelligen|existential|phenomenal)\b/i,
  // MODELS is the fallback but also has explicit keywords
  MODELS: /\b(ai|ml|model|llm|transformer|neural|gpt|diffusion|training|inference|benchmark|fine.?tun|foundation\s*model|deep\s*learn|machine\s*learn|openai|anthropic|meta\s*ai|google\s*ai|gemini|claude)\b/i,
};

/** Return the best-matching Claim category for a given text string. */
export function inferCategory(text: string): Claim['category'] {
  // Check specific categories first (more specific -> less specific)
  const ordered: Claim['category'][] = [
    'BIOLOGY',
    'ROBOTICS',
    'COMPUTE',
    'ENERGY',
    'SPACE',
    'CAPITAL',
    'GOVERNANCE',
    'INFRASTRUCTURE',
    'CONSCIOUSNESS',
    'MODELS',
  ];

  for (const cat of ordered) {
    if (CATEGORY_KEYWORDS[cat].test(text)) {
      return cat;
    }
  }

  return 'MODELS';
}

// ---------------------------------------------------------------------------
// Entity extraction (simple proper-noun heuristic)
// ---------------------------------------------------------------------------

// Well-known entities to look for in any text (case-insensitive matching, canonical casing output)
const KNOWN_ENTITIES: Array<[RegExp, string]> = [
  [/\bOpenAI\b/i, 'OpenAI'],
  [/\bAnthro?pic\b/i, 'Anthropic'],
  [/\bGoogle\b/i, 'Google'],
  [/\bMeta\s*AI\b/i, 'Meta AI'],
  [/\bMeta\b/i, 'Meta'],
  [/\bNVIDIA\b/i, 'NVIDIA'],
  [/\bAMD\b/i, 'AMD'],
  [/\bIntel\b/i, 'Intel'],
  [/\bMicrosoft\b/i, 'Microsoft'],
  [/\bApple\b/i, 'Apple'],
  [/\bAmazon\b/i, 'Amazon'],
  [/\bTesla\b/i, 'Tesla'],
  [/\bSpaceX\b/i, 'SpaceX'],
  [/\bGPT[\s-]?[0-9.]+\b/i, 'GPT'],
  [/\bClaude\b/i, 'Claude'],
  [/\bGemini\b/i, 'Gemini'],
  [/\bLlama\b/i, 'Llama'],
  [/\bMistral\b/i, 'Mistral'],
  [/\bStable\s*Diffusion\b/i, 'Stable Diffusion'],
  [/\bHugging\s*Face\b/i, 'Hugging Face'],
  [/\bPyTorch\b/i, 'PyTorch'],
  [/\bTensorFlow\b/i, 'TensorFlow'],
  [/\bTransformer\b/i, 'Transformer'],
  [/\bLLM\b/i, 'LLM'],
  [/\bRAG\b/, 'RAG'],
  [/\bRL(?:HF)?\b/, 'RLHF'],
  [/\bCRISPR\b/i, 'CRISPR'],
  [/\bAlphaFold\b/i, 'AlphaFold'],
  [/\bNASA\b/i, 'NASA'],
  [/\bArtemis\b/i, 'Artemis'],
  [/\bBlackwell\b/i, 'Blackwell'],
  [/\bH100\b/i, 'H100'],
  [/\bH200\b/i, 'H200'],
  [/\bTPU\b/i, 'TPU'],
  [/\bGPU\b/i, 'GPU'],
  [/\bAGI\b/i, 'AGI'],
  [/\bARC-AGI\b/i, 'ARC-AGI'],
  [/\barXiv\b/i, 'arXiv'],
];

/**
 * Extract entities from text using known-entity matching + proper-noun heuristic.
 */
export function extractEntities(text: string): string[] {
  if (!text) return [];

  const entities: string[] = [];
  const seen = new Set<string>();

  // 1. Match known entities (case-insensitive, canonical casing)
  for (const [pattern, canonical] of KNOWN_ENTITIES) {
    if (pattern.test(text) && !seen.has(canonical.toLowerCase())) {
      seen.add(canonical.toLowerCase());
      entities.push(canonical);
    }
  }

  // 2. Proper-noun heuristic for remaining capitalized words
  const stopWords = new Set([
    'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'its',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'shall', 'can', 'for', 'and', 'but', 'or', 'nor',
    'not', 'no', 'so', 'yet', 'at', 'by', 'in', 'of', 'on', 'to',
    'up', 'with', 'from', 'into', 'how', 'what', 'when', 'where',
    'who', 'why', 'new', 'now', 'more', 'most', 'all', 'about',
    'after', 'before', 'over', 'under', 'between', 'through',
    'we', 'our', 'your', 'my', 'their', 'show', 'ask', 'get',
  ]);

  const matches = text.match(/\b[A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)*\b/g) || [];

  for (const match of matches) {
    const words = match.split(/\s+/).filter((w) => !stopWords.has(w.toLowerCase()) && w.length >= 2);
    const entity = words.join(' ').trim();
    if (entity && !seen.has(entity.toLowerCase())) {
      seen.add(entity.toLowerCase());
      entities.push(entity);
    }
  }

  return entities.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Generic localStorage cache wrapper
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  fetchedAt: number;
  data: T;
}

/**
 * Return cached data if fresh, otherwise call `fetcher`, cache the result,
 * and return it.
 */
export async function cachedFetch<T>(
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.fetchedAt < ttlMs) {
        return entry.data;
      }
    }
  } catch {
    // Corrupted cache — ignore and refetch
    localStorage.removeItem(cacheKey);
  }

  const data = await fetcher();

  try {
    const entry: CacheEntry<T> = { fetchedAt: Date.now(), data };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — non-fatal
    console.warn(`[sourceUtils] Could not write cache for key "${cacheKey}"`);
  }

  return data;
}
