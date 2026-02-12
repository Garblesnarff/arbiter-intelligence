
import { Claim } from '../types';
import { extractClaimsFromPost } from './extractionService';
import { FEEDS } from '../constants/feeds';

const PROXY_URL = 'https://corsproxy.io/?';
const CACHE_KEY_PREFIX = 'arbiter_chronicle_cache_v3_';
export const LAST_FETCH_KEY = 'arbiter_last_fetch';
const FEED_STATUS_KEY = 'arbiter_feed_status';

export interface FeedStatus {
  id: string;
  name: string;
  lastFetch: string | null;
  claimCount: number;
  status: 'success' | 'error' | 'pending';
  error?: string;
}

export const fetchFeedStatus = (): FeedStatus[] => {
  const stored = localStorage.getItem(FEED_STATUS_KEY);
  if (!stored) {
    return FEEDS.map(f => ({
      id: f.id,
      name: f.name,
      lastFetch: null,
      claimCount: 0,
      status: 'pending'
    }));
  }
  return JSON.parse(stored);
};

const updateFeedStatus = (id: string, update: Partial<FeedStatus>) => {
  const current = fetchFeedStatus();
  const next = current.map(s => s.id === id ? { ...s, ...update } : s);
  localStorage.setItem(FEED_STATUS_KEY, JSON.stringify(next));
};

export const fetchClaimsFromRSS = async (): Promise<Claim[]> => {
  try {
    const fetchPromises = FEEDS.map(async (source) => {
      try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(source.url)}`);
        if (!response.ok) {
          updateFeedStatus(source.id, { status: 'error', error: `HTTP ${response.status}`, lastFetch: new Date().toISOString() });
          return [];
        }
        
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        
        const parserError = xml.querySelector('parsererror');
        if (parserError) {
          updateFeedStatus(source.id, { status: 'error', error: 'XML Parsing Error', lastFetch: new Date().toISOString() });
          return [];
        }

        const items = Array.from(xml.querySelectorAll('item'));
        if (items.length === 0) {
          updateFeedStatus(source.id, { status: 'success', claimCount: 0, lastFetch: new Date().toISOString() });
          return [];
        }
        
        // Take top 1 item for maximum coverage efficiency across all 21 feeds
        const latestItem = items[0];
        const link = latestItem.querySelector('link')?.textContent || '';
        const pubDateStr = latestItem.querySelector('pubDate')?.textContent || '';
        
        const dateObj = new Date(pubDateStr);
        // Use ISO string for reliable sorting and grouping in the UI
        const formattedDate = isNaN(dateObj.getTime()) 
          ? new Date().toISOString() 
          : dateObj.toISOString();

        const cacheKey = `${CACHE_KEY_PREFIX}${source.id}_${link}`;
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
          const claims = JSON.parse(cachedData).map((c: Claim) => ({
            ...c,
            source_name: source.name,
            source_author: source.author,
            source_feed: source.id,
            source_feed_name: source.name
          }));
          updateFeedStatus(source.id, { status: 'success', claimCount: claims.length, lastFetch: new Date().toISOString() });
          return claims;
        }

        const contentEncoded = latestItem.getElementsByTagNameNS('*', 'encoded')[0]?.textContent;
        const description = latestItem.querySelector('description')?.textContent;
        const rawHtml = contentEncoded || description || "";

        if (!rawHtml) {
          updateFeedStatus(source.id, { status: 'success', claimCount: 0, lastFetch: new Date().toISOString() });
          return [];
        }

        const extractedClaims = await extractClaimsFromPost(rawHtml, link, formattedDate);
        
        if (extractedClaims.length > 0) {
          const finalClaims = extractedClaims.map(c => ({
             ...c,
             source_name: source.name,
             source_author: source.author,
             source_feed: source.id,
             source_feed_name: source.name
          }));
          localStorage.setItem(cacheKey, JSON.stringify(finalClaims));
          updateFeedStatus(source.id, { status: 'success', claimCount: finalClaims.length, lastFetch: new Date().toISOString() });
          return finalClaims;
        } else {
          const title = latestItem.querySelector('title')?.textContent || source.name;
          const fallbackClaim: Claim = {
               id: `${source.id}_${link}`,
               post_id: link,
               category: (source.categories[0] as any) || 'MODELS',
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
               source_feed_name: source.name
          };
          updateFeedStatus(source.id, { status: 'success', claimCount: 1, lastFetch: new Date().toISOString() });
          return [fallbackClaim];
        }
      } catch (err) {
        console.warn(`Failed to fetch ${source.name}:`, err);
        updateFeedStatus(source.id, { status: 'error', error: 'Network Error', lastFetch: new Date().toISOString() });
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const allClaims = results.flat();

    localStorage.setItem(LAST_FETCH_KEY, new Date().toISOString());
    return allClaims;

  } catch (error) {
    console.error('Error fetching multi-source RSS feed:', error);
    return [];
  }
};
