
import { Claim } from '../types';
import { extractClaimsFromPost } from './extractionService';
import { FEEDS } from '../constants/feeds';

const PROXY_URL = 'https://corsproxy.io/?';
const CACHE_KEY_PREFIX = 'arbiter_chronicle_cache_v3_';
const ALL_CLAIMS_CACHE_KEY = 'arbiter_claims_cache_v1';
const CLAIMS_CACHE_TTL_MS = 15 * 60 * 1000;
export const LAST_FETCH_KEY = 'arbiter_last_fetch';
const FEED_STATUS_KEY = 'arbiter_feed_status';

type FetchClaimsOptions = {
  forceRefresh?: boolean;
};

type ClaimsCache = {
  fetchedAt: string;
  claims: Claim[];
};

let inFlightClaimsRequest: Promise<Claim[]> | null = null;

export interface FeedStatus {
  id: string;
  name: string;
  lastFetch: string | null;
  claimCount: number;
  status: 'success' | 'error' | 'pending';
  error?: string;
}

const createDefaultFeedStatuses = (): FeedStatus[] =>
  FEEDS.map((feed) => ({
    id: feed.id,
    name: feed.name,
    lastFetch: null,
    claimCount: 0,
    status: 'pending',
  }));

const readStoredJson = <T,>(key: string): T | null => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as T;
  } catch (error) {
    console.warn(`Ignoring invalid cached JSON for ${key}:`, error);
    localStorage.removeItem(key);
    return null;
  }
};

const getCachedClaims = (ignoreTtl = false): Claim[] | null => {
  const cached = readStoredJson<ClaimsCache>(ALL_CLAIMS_CACHE_KEY);
  if (!cached || !Array.isArray(cached.claims)) {
    return null;
  }

  if (!ignoreTtl) {
    const fetchedAt = new Date(cached.fetchedAt).getTime();
    if (!Number.isFinite(fetchedAt) || Date.now() - fetchedAt > CLAIMS_CACHE_TTL_MS) {
      return null;
    }
  }

  return cached.claims;
};

const setCachedClaims = (claims: Claim[], fetchedAt: string) => {
  const payload: ClaimsCache = { fetchedAt, claims };
  localStorage.setItem(ALL_CLAIMS_CACHE_KEY, JSON.stringify(payload));
};

export const fetchFeedStatus = (): FeedStatus[] => {
  const stored = readStoredJson<FeedStatus[]>(FEED_STATUS_KEY);
  if (!Array.isArray(stored)) {
    return createDefaultFeedStatuses();
  }

  const statusesById = new Map(stored.map((status) => [status.id, status]));
  return FEEDS.map((feed) => {
    const existing = statusesById.get(feed.id);
    return existing
      ? { ...existing, name: feed.name }
      : {
          id: feed.id,
          name: feed.name,
          lastFetch: null,
          claimCount: 0,
          status: 'pending',
        };
  });
};

const updateFeedStatus = (id: string, update: Partial<FeedStatus>) => {
  const current = fetchFeedStatus();
  const next = current.map((status) => (status.id === id ? { ...status, ...update } : status));
  localStorage.setItem(FEED_STATUS_KEY, JSON.stringify(next));
};

export const fetchClaimsFromRSS = async ({ forceRefresh = false }: FetchClaimsOptions = {}): Promise<Claim[]> => {
  if (!forceRefresh) {
    const cachedClaims = getCachedClaims();
    if (cachedClaims) {
      return cachedClaims;
    }
  }

  if (inFlightClaimsRequest) {
    return inFlightClaimsRequest;
  }

  inFlightClaimsRequest = (async () => {
    const staleClaims = getCachedClaims(true);

    try {
      const fetchPromises = FEEDS.map(async (source) => {
        try {
          const response = await fetch(`${PROXY_URL}${encodeURIComponent(source.url)}`);
          const fetchedAt = new Date().toISOString();

          if (!response.ok) {
            updateFeedStatus(source.id, { status: 'error', error: `HTTP ${response.status}`, lastFetch: fetchedAt });
            return [];
          }

          const text = await response.text();
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, 'text/xml');

          const parserError = xml.querySelector('parsererror');
          if (parserError) {
            updateFeedStatus(source.id, { status: 'error', error: 'XML Parsing Error', lastFetch: fetchedAt });
            return [];
          }

          const items = Array.from(xml.querySelectorAll('item'));
          if (items.length === 0) {
            updateFeedStatus(source.id, { status: 'success', claimCount: 0, lastFetch: fetchedAt, error: undefined });
            return [];
          }

          // Take the latest item from each feed to keep requests bounded.
          const latestItem = items[0];
          const link = latestItem.querySelector('link')?.textContent || '';
          const pubDateStr = latestItem.querySelector('pubDate')?.textContent || '';

          const dateObj = new Date(pubDateStr);
          const formattedDate = Number.isNaN(dateObj.getTime())
            ? fetchedAt
            : dateObj.toISOString();

          const cacheKey = `${CACHE_KEY_PREFIX}${source.id}_${link}`;
          const cachedClaimsForItem = readStoredJson<Claim[]>(cacheKey);

          if (Array.isArray(cachedClaimsForItem)) {
            const claims = cachedClaimsForItem.map((claim) => ({
              ...claim,
              source_name: source.name,
              source_author: source.author,
              source_feed: source.id,
              source_feed_name: source.name,
            }));
            updateFeedStatus(source.id, { status: 'success', claimCount: claims.length, lastFetch: fetchedAt, error: undefined });
            return claims;
          }

          const contentEncoded = latestItem.getElementsByTagNameNS('*', 'encoded')[0]?.textContent;
          const description = latestItem.querySelector('description')?.textContent;
          const rawHtml = contentEncoded || description || '';

          if (!rawHtml) {
            updateFeedStatus(source.id, { status: 'success', claimCount: 0, lastFetch: fetchedAt, error: undefined });
            return [];
          }

          const extractedClaims = await extractClaimsFromPost(rawHtml, link, formattedDate);

          if (extractedClaims.length > 0) {
            const finalClaims = extractedClaims.map((claim) => ({
              ...claim,
              source_name: source.name,
              source_author: source.author,
              source_feed: source.id,
              source_feed_name: source.name,
            }));
            localStorage.setItem(cacheKey, JSON.stringify(finalClaims));
            updateFeedStatus(source.id, { status: 'success', claimCount: finalClaims.length, lastFetch: fetchedAt, error: undefined });
            return finalClaims;
          }

          const title = latestItem.querySelector('title')?.textContent || source.name;
          const fallbackCategory = (source.categories[0] as Claim['category'] | undefined) ?? 'MODELS';
          const fallbackClaim: Claim = {
            id: `${source.id}_${link}`,
            post_id: link,
            category: fallbackCategory,
            claim_text: title,
            entities: [source.name],
            confidence: 'medium',
            sentiment: 'neutral',
            date: formattedDate,
            source_url: link,
            source_name: source.name,
            source_author: source.author,
            model_relevance: source.categories.includes('MODELS'),
            source_feed: source.id,
            source_feed_name: source.name,
          };
          updateFeedStatus(source.id, { status: 'success', claimCount: 1, lastFetch: fetchedAt, error: undefined });
          return [fallbackClaim];
        } catch (error) {
          console.warn(`Failed to fetch ${source.name}:`, error);
          updateFeedStatus(source.id, { status: 'error', error: 'Network Error', lastFetch: new Date().toISOString() });
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allClaims = results.flat();

      if (allClaims.length > 0) {
        const fetchedAt = new Date().toISOString();
        setCachedClaims(allClaims, fetchedAt);
        localStorage.setItem(LAST_FETCH_KEY, fetchedAt);
        return allClaims;
      }

      return staleClaims ?? [];
    } catch (error) {
      console.error('Error fetching multi-source RSS feed:', error);
      return staleClaims ?? [];
    } finally {
      inFlightClaimsRequest = null;
    }
  })();

  return inFlightClaimsRequest;
};
