
import { Claim } from '../types';
import { FeedStatus } from './rssService';
import { inferCategory, cachedFetch } from './sourceUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARXIV_QUERY =
  'search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL+OR+cat:cs.CV+OR+cat:cs.RO' +
  '&sortBy=submittedDate&sortOrder=descending&max_results=20';
const ARXIV_URL = `https://export.arxiv.org/api/query?${ARXIV_QUERY}`;
const PROXY_URL = 'https://corsproxy.io/?';
const CACHE_KEY = 'arbiter_arxiv_claims_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const STATUS_KEY = 'arbiter_arxiv_feed_status';

// ---------------------------------------------------------------------------
// arXiv category -> Claim category mapping
// ---------------------------------------------------------------------------

const ARXIV_CAT_MAP: Record<string, Claim['category']> = {
  'cs.AI': 'MODELS',
  'cs.LG': 'MODELS',
  'cs.CL': 'MODELS',
  'cs.CV': 'MODELS',
  'cs.RO': 'ROBOTICS',
};

function categoryFromArxiv(primaryCategory: string): Claim['category'] {
  return ARXIV_CAT_MAP[primaryCategory] ?? 'MODELS';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip the arXiv ID down to just the numeric portion (e.g. "2406.12345v1"). */
function extractArxivId(fullId: string): string {
  const match = fullId.match(/([\d.]+v?\d*)$/);
  return match ? match[1] : fullId;
}

/** Clean up whitespace / newlines often present in arXiv titles and abstracts. */
function cleanText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** Extract first N author names from an entry. */
function extractAuthors(entry: Element, max: number): string[] {
  const authorNodes = entry.querySelectorAll('author > name');
  const names: string[] = [];
  for (let i = 0; i < Math.min(authorNodes.length, max); i++) {
    const name = authorNodes[i]?.textContent?.trim();
    if (name) names.push(name);
  }
  return names;
}

function entryToClaim(entry: Element): Claim {
  const rawId = entry.querySelector('id')?.textContent ?? '';
  const title = cleanText(entry.querySelector('title')?.textContent);
  const summary = cleanText(entry.querySelector('summary')?.textContent);
  const published = entry.querySelector('published')?.textContent ?? new Date().toISOString();
  const link = entry.querySelector('link[title="pdf"]')?.getAttribute('href')
    ?? entry.querySelector('link')?.getAttribute('href')
    ?? rawId;

  const primaryCat =
    entry.querySelector('arxiv\\:primary_category, primary_category')?.getAttribute('term')
    ?? '';

  const authors = extractAuthors(entry, 3);

  return {
    id: `arxiv_${extractArxivId(rawId)}`,
    post_id: `arxiv_${extractArxivId(rawId)}`,
    category: primaryCat ? categoryFromArxiv(primaryCat) : inferCategory(title),
    claim_text: title,
    original_sentence: summary.slice(0, 200) || undefined,
    entities: authors,
    confidence: 'high',
    sentiment: 'neutral',
    date: new Date(published).toISOString(),
    source_url: link,
    source_name: 'arXiv',
    source_kind: 'arxiv',
    source_feed: 'arxiv',
    source_feed_name: 'arXiv',
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

export async function fetchArxivClaims(): Promise<Claim[]> {
  try {
    const claims = await cachedFetch<Claim[]>(CACHE_KEY, CACHE_TTL_MS, async () => {
      const res = await fetch(`${PROXY_URL}${encodeURIComponent(ARXIV_URL)}`);
      if (!res.ok) throw new Error(`arXiv API HTTP ${res.status}`);

      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');

      const errorNode = xml.querySelector('parsererror');
      if (errorNode) throw new Error('arXiv XML parse error');

      const entries = Array.from(xml.querySelectorAll('entry'));
      return entries.map(entryToClaim);
    });

    writeStatus({
      id: 'arxiv',
      name: 'arXiv',
      lastFetch: new Date().toISOString(),
      claimCount: claims.length,
      status: 'success',
    });

    return claims;
  } catch (err) {
    console.warn('[arxivAdapter] Failed to fetch arXiv papers:', err);
    writeStatus({
      id: 'arxiv',
      name: 'arXiv',
      lastFetch: new Date().toISOString(),
      claimCount: 0,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return [];
  }
}

export function getArxivFeedStatus(): FeedStatus {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw) return JSON.parse(raw) as FeedStatus;
  } catch {
    // ignore
  }
  return {
    id: 'arxiv',
    name: 'arXiv',
    lastFetch: null,
    claimCount: 0,
    status: 'pending',
  };
}
