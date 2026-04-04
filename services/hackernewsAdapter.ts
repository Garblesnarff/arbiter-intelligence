
import { Claim } from '../types';
import { FeedStatus } from './rssService';
import { inferCategory, extractEntities, cachedFetch } from './sourceUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const CACHE_KEY = 'arbiter_hn_claims_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const STATUS_KEY = 'arbiter_hn_feed_status';
const TOP_N = 30;

const AI_KEYWORDS =
  /\b(ai|ml|model|gpu|compute|robot|biotech|quantum|neural|llm|transformer|agi|chip|semiconductor|nvidia|openai|google|anthropic|meta\s*ai|inference|training|benchmark|deep\s*learn|machine\s*learn|diffusion|gpt|claude|gemini|mistral|llama)\b/i;

// ---------------------------------------------------------------------------
// HN item type
// ---------------------------------------------------------------------------

interface HNItem {
  id: number;
  type: string;
  title?: string;
  url?: string;
  score?: number;
  by?: string;
  time?: number;
  descendants?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchTopStoryIds(): Promise<number[]> {
  const res = await fetch(`${HN_API}/topstories.json`);
  if (!res.ok) throw new Error(`HN topstories HTTP ${res.status}`);
  const ids: number[] = await res.json();
  return ids.slice(0, TOP_N);
}

async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${HN_API}/item/${id}.json`);
    if (!res.ok) return null;
    return (await res.json()) as HNItem;
  } catch {
    return null;
  }
}

function isRelevantStory(item: HNItem): boolean {
  if (item.type !== 'story') return false;
  if (!item.title) return false;
  // Filter out Ask HN / Show HN polls and job posts
  if (/^(Ask HN|Show HN|Tell HN|Launch HN)/.test(item.title)) return false;
  return AI_KEYWORDS.test(item.title);
}

function itemToClaim(item: HNItem): Claim {
  const title = item.title || '';
  const hasHighScore = (item.score ?? 0) > 100;

  return {
    id: `hn_${item.id}`,
    post_id: `hn_${item.id}`,
    category: inferCategory(title),
    claim_text: title,
    entities: extractEntities(title),
    confidence: 'medium',
    sentiment: 'neutral',
    date: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
    source_url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    source_name: 'Hacker News',
    source_kind: 'hackernews',
    source_feed: 'hackernews',
    source_feed_name: 'Hacker News',
    ...(hasHighScore
      ? { metric_value: `${item.score}`, metric_context: 'HN points' }
      : {}),
  };
}

function writeStatus(status: FeedStatus) {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  } catch {
    // non-fatal
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchHackerNewsClaims(): Promise<Claim[]> {
  try {
    const claims = await cachedFetch<Claim[]>(CACHE_KEY, CACHE_TTL_MS, async () => {
      const ids = await fetchTopStoryIds();
      const items = await Promise.all(ids.map(fetchItem));
      const relevant = (items.filter(Boolean) as HNItem[]).filter(isRelevantStory);
      return relevant.map(itemToClaim);
    });

    writeStatus({
      id: 'hackernews',
      name: 'Hacker News',
      lastFetch: new Date().toISOString(),
      claimCount: claims.length,
      status: 'success',
    });

    return claims;
  } catch (err) {
    console.warn('[hackernewsAdapter] Failed to fetch HN stories:', err);
    writeStatus({
      id: 'hackernews',
      name: 'Hacker News',
      lastFetch: new Date().toISOString(),
      claimCount: 0,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return [];
  }
}

export function getHNFeedStatus(): FeedStatus {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw) return JSON.parse(raw) as FeedStatus;
  } catch {
    // ignore
  }
  return {
    id: 'hackernews',
    name: 'Hacker News',
    lastFetch: null,
    claimCount: 0,
    status: 'pending',
  };
}
