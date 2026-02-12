
import { Claim } from '../types';
import { extractClaimsFromPost } from './extractionService';
import { FEED_SOURCES } from '../constants';

const PROXY_URL = 'https://corsproxy.io/?';
const CACHE_KEY_PREFIX = 'arbiter_chronicle_cache_v2_';
export const LAST_FETCH_KEY = 'arbiter_last_fetch';

export const fetchClaimsFromRSS = async (): Promise<Claim[]> => {
  try {
    let allClaims: Claim[] = [];
    
    // Iterate through all sources defined in constants
    // For MVP/Demo, we process the latest post from each feed
    const fetchPromises = FEED_SOURCES.map(async (source) => {
      try {
        const response = await fetch(`${PROXY_URL}${encodeURIComponent(source.url)}`);
        if (!response.ok) return [];
        
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        
        const parserError = xml.querySelector('parsererror');
        if (parserError) return [];

        const items = Array.from(xml.querySelectorAll('item'));
        if (items.length === 0) return [];
        
        // Take only the very latest item per feed for broad coverage without overloading
        const latestItem = items[0];
        const link = latestItem.querySelector('link')?.textContent || '';
        const pubDateStr = latestItem.querySelector('pubDate')?.textContent || '';
        
        const dateObj = new Date(pubDateStr);
        const formattedDate = isNaN(dateObj.getTime()) 
          ? 'Recent' 
          : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // 1. Check Cache
        const cacheKey = `${CACHE_KEY_PREFIX}${link}`;
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
          return JSON.parse(cachedData).map((c: Claim) => ({
            ...c,
            source_name: source.name,
            source_author: source.author
          }));
        }

        // 2. Extract content for AI processing
        const contentEncoded = latestItem.getElementsByTagNameNS('*', 'encoded')[0]?.textContent;
        const description = latestItem.querySelector('description')?.textContent;
        const rawHtml = contentEncoded || description || "";

        if (!rawHtml) return [];

        // 3. Call Gemini
        const extractedClaims = await extractClaimsFromPost(rawHtml, link, formattedDate);
        
        // 4. Save to Cache if successful
        if (extractedClaims.length > 0) {
          const finalClaims = extractedClaims.map(c => ({
             ...c,
             source_name: source.name,
             source_author: source.author
          }));
          localStorage.setItem(cacheKey, JSON.stringify(finalClaims));
          return finalClaims;
        } else {
          // Fallback
          const title = latestItem.querySelector('title')?.textContent || source.name;
          const fallbackClaim: Claim = {
               id: link,
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
               model_relevance: source.categories.includes('MODELS')
          };
          return [fallbackClaim];
        }
      } catch (err) {
        console.warn(`Failed to fetch ${source.name}:`, err);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    allClaims = results.flat();

    // Sort by date (newest first) - though date string sorting is tricky, 
    // we'll rely on the order they were processed (latest from RSS)
    localStorage.setItem(LAST_FETCH_KEY, new Date().toISOString());
    return allClaims;

  } catch (error) {
    console.error('Error fetching/processing multi-source RSS feed:', error);
    return [];
  }
};
