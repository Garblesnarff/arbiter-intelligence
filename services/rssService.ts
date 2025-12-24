import { Claim } from '../types';
import { extractClaimsFromPost } from './extractionService';

const RSS_URL = 'https://theinnermostloop.substack.com/feed';
const PROXY_URL = 'https://corsproxy.io/?';
const CACHE_KEY_PREFIX = 'arbiter_chronicle_cache_v1_';

export const fetchClaimsFromRSS = async (): Promise<Claim[]> => {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(RSS_URL)}`);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
    
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    const parserError = xml.querySelector('parsererror');
    if (parserError) throw new Error('Error parsing XML feed');

    const items = Array.from(xml.querySelectorAll('item'));
    
    // Process only the top 2 posts for MVP to save tokens/time
    // In production, this would be a background job
    const recentItems = items.slice(0, 2);
    let allClaims: Claim[] = [];

    for (const item of recentItems) {
      const link = item.querySelector('link')?.textContent || '';
      const pubDateStr = item.querySelector('pubDate')?.textContent || '';
      
      const dateObj = new Date(pubDateStr);
      const formattedDate = isNaN(dateObj.getTime()) 
        ? 'Recent' 
        : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // 1. Check Cache
      const cacheKey = `${CACHE_KEY_PREFIX}${link}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        console.log(`[Cache Hit] Loading claims for ${link}`);
        allClaims = [...allClaims, ...JSON.parse(cachedData)];
        continue;
      }

      // 2. Extract content for AI processing
      // Substack puts full HTML in content:encoded
      const contentEncoded = item.getElementsByTagNameNS('*', 'encoded')[0]?.textContent;
      const description = item.querySelector('description')?.textContent;
      const rawHtml = contentEncoded || description || "";

      if (!rawHtml) continue;

      console.log(`[AI Extraction] Processing ${link}...`);
      
      // 3. Call Gemini
      const extractedClaims = await extractClaimsFromPost(rawHtml, link, formattedDate);
      
      // 4. Save to Cache if successful
      if (extractedClaims.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(extractedClaims));
        allClaims = [...allClaims, ...extractedClaims];
      } else {
        // Fallback if AI fails: create a simple claim from title
        const title = item.querySelector('title')?.textContent || 'Untitled Chronicle';
        const fallbackClaim: Claim = {
             id: link,
             post_id: link,
             category: 'MODELS',
             claim_text: title,
             entities: [],
             confidence: 'high',
             sentiment: 'neutral',
             date: formattedDate,
             source_url: link,
             model_relevance: true
        };
        allClaims.push(fallbackClaim);
      }
    }

    return allClaims;

  } catch (error) {
    console.error('Error fetching/processing RSS feed:', error);
    return [];
  }
};