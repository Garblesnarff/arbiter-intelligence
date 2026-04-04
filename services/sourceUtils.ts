
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

/**
 * Extract likely proper nouns / entity names from text.
 * Uses a simple heuristic: sequences of capitalised words that are not
 * common English stop-words at the start of a sentence.
 */
export function extractEntities(text: string): string[] {
  if (!text) return [];

  const stopWords = new Set([
    'The', 'A', 'An', 'This', 'That', 'These', 'Those', 'It', 'Its',
    'Is', 'Are', 'Was', 'Were', 'Be', 'Been', 'Being', 'Have', 'Has',
    'Had', 'Do', 'Does', 'Did', 'Will', 'Would', 'Could', 'Should',
    'May', 'Might', 'Shall', 'Can', 'For', 'And', 'But', 'Or', 'Nor',
    'Not', 'No', 'So', 'Yet', 'At', 'By', 'In', 'Of', 'On', 'To',
    'Up', 'With', 'From', 'Into', 'How', 'What', 'When', 'Where',
    'Who', 'Why', 'New', 'Now', 'More', 'Most', 'All', 'About',
    'After', 'Before', 'Over', 'Under', 'Between', 'Through',
  ]);

  // Match capitalised words (2+ chars), possibly chained
  const matches = text.match(/\b[A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)*\b/g) || [];

  const entities: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const words = match.split(/\s+/).filter((w) => !stopWords.has(w) && w.length >= 2);
    const entity = words.join(' ').trim();
    if (entity && !seen.has(entity.toLowerCase())) {
      seen.add(entity.toLowerCase());
      entities.push(entity);
    }
  }

  return entities.slice(0, 8);
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
