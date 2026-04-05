/**
 * Backfill script: fetch 7 days of HN top stories + arXiv papers,
 * extract entities via OpenRouter, and persist to local Supabase.
 *
 * Usage: npm run backfill
 *
 * Rate limits:
 * - OpenRouter free tier: 20 req/min, 200 req/day
 * - HN API: no hard limit, be respectful
 * - arXiv API: 1 req/3s recommended
 *
 * The script batches OpenRouter calls and pauses between them.
 * Run it multiple times to process more items (cached items are skipped).
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const OPENROUTER_KEY = process.env.VITE_OPENROUTER_API_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OPENROUTER_MODEL = 'qwen/qwen3.6-plus:free';
const MAX_OPENROUTER_CALLS = 150; // leave some daily quota buffer
let openrouterCallCount = 0;

// ─── Helpers ──────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function extractWithOpenRouter(title: string, description: string, sourceKind: string): Promise<any> {
  if (!OPENROUTER_KEY || openrouterCallCount >= MAX_OPENROUTER_CALLS) return null;

  try {
    openrouterCallCount++;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://arbiter-intelligence.app',
        'X-Title': 'Arbiter Intelligence Backfill',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'Extract structured data. Return ONLY valid JSON: {"entities":["list"],"category":"MODELS|COMPUTE|CAPITAL|BIOLOGY|ROBOTICS|ENERGY|SPACE|GOVERNANCE|INFRASTRUCTURE|CONSCIOUSNESS","confidence":"high|medium|low","claim_text":"improved summary"}' },
          { role: 'user', content: `Extract from this ${sourceKind} item:\nTitle: ${title}\n${description ? 'Description: ' + description.slice(0, 400) : ''}` },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    let jsonStr = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const first = jsonStr.indexOf('{');
    const last = jsonStr.lastIndexOf('}');
    if (first === -1 || last === -1) return null;
    return JSON.parse(jsonStr.slice(first, last + 1));
  } catch {
    return null;
  }
}

const VALID_CATEGORIES = new Set(['MODELS', 'COMPUTE', 'CAPITAL', 'BIOLOGY', 'ROBOTICS', 'ENERGY', 'SPACE', 'GOVERNANCE', 'INFRASTRUCTURE', 'CONSCIOUSNESS']);

function inferCategory(text: string): string {
  const t = text.toLowerCase();
  if (/\b(biotech|biology|gene|protein|medical|drug|crispr)\b/.test(t)) return 'BIOLOGY';
  if (/\b(robot|humanoid|drone)\b/.test(t)) return 'ROBOTICS';
  if (/\b(gpu|tpu|chip|nvidia|semiconductor|compute)\b/.test(t)) return 'COMPUTE';
  if (/\b(energy|solar|battery|fusion|nuclear)\b/.test(t)) return 'ENERGY';
  if (/\b(space|spacex|rocket|nasa|satellite)\b/.test(t)) return 'SPACE';
  if (/\b(funding|invest|ipo|acquisition|billion)\b/.test(t)) return 'CAPITAL';
  if (/\b(regulation|policy|governance|legislation)\b/.test(t)) return 'GOVERNANCE';
  return 'MODELS';
}

// ─── Persist ──────────────────────────────────────────────

interface ClaimRow {
  id: string;
  post_id: string;
  category: string;
  claim_text: string;
  entities: string[];
  confidence: string;
  sentiment: string;
  date: string;
  source_url: string;
  source_name: string;
  source_kind: string;
  source_feed: string;
  source_feed_name: string;
}

async function persistClaims(claims: ClaimRow[]) {
  if (claims.length === 0) return;

  // Upsert claims
  for (let i = 0; i < claims.length; i += 500) {
    const batch = claims.slice(i, i + 500).map(c => ({
      id: c.id,
      post_id: c.post_id,
      category: c.category,
      claim_text: c.claim_text,
      confidence: c.confidence,
      sentiment: c.sentiment,
      date: c.date,
      source_url: c.source_url,
      source_name: c.source_name,
      source_kind: c.source_kind,
      source_feed: c.source_feed,
      source_feed_name: c.source_feed_name,
    }));
    await supabase.from('claims').upsert(batch, { onConflict: 'id' });
  }

  // Upsert entities and claim_entities
  for (const claim of claims) {
    for (const entity of claim.entities) {
      const entityId = entity.toLowerCase();
      await supabase.from('entities').upsert({
        id: entityId,
        canonical_name: entity,
        entity_type: 'unknown',
        mention_count: 1,
        first_seen: claim.date,
        last_seen: claim.date,
      }, { onConflict: 'id' });

      await supabase.from('claim_entities').upsert({
        claim_id: claim.id,
        entity_id: entityId,
      }, { onConflict: 'claim_id,entity_id' });
    }

    // Entity relationships (co-occurrence)
    for (let i = 0; i < claim.entities.length; i++) {
      for (let j = i + 1; j < claim.entities.length; j++) {
        let a = claim.entities[i].toLowerCase();
        let b = claim.entities[j].toLowerCase();
        if (a > b) [a, b] = [b, a];
        await supabase.from('entity_relationships').upsert({
          entity_a: a,
          entity_b: b,
          relationship_type: 'co-occurrence',
          strength: 1,
          first_seen: claim.date,
          last_seen: claim.date,
        }, { onConflict: 'entity_a,entity_b' });
      }
    }
  }
}

// ─── HN Backfill ──────────────────────────────────────────

const AI_KEYWORDS = /\b(ai|ml|model|gpu|compute|robot|biotech|quantum|neural|llm|transformer|agi|chip|nvidia|openai|anthropic|inference|training|benchmark|gpt|claude|gemini)\b/i;

async function backfillHN(days: number) {
  console.log(`\n── Hacker News (top stories, ${days} days) ──`);

  // HN doesn't have a date-based API, but we can fetch more top/best stories
  // and filter by time
  const cutoff = daysAgo(days).getTime() / 1000;

  const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  const allIds: number[] = await res.json();

  // Fetch more stories to cover the time range
  const storyIds = allIds.slice(0, 200);
  console.log(`  Fetching ${storyIds.length} story details...`);

  const stories: any[] = [];
  for (let i = 0; i < storyIds.length; i += 20) {
    const batch = storyIds.slice(i, i + 20);
    const results = await Promise.all(
      batch.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()).catch(() => null))
    );
    stories.push(...results.filter(Boolean));
    if (i + 20 < storyIds.length) await sleep(200);
  }

  const relevant = stories.filter(s =>
    s.type === 'story' &&
    s.title &&
    s.time >= cutoff &&
    AI_KEYWORDS.test(s.title) &&
    !/^(Ask HN|Show HN|Tell HN)/.test(s.title)
  );

  console.log(`  ${relevant.length} AI-relevant stories in the last ${days} days`);

  // Check which ones we already have
  const { data: existing } = await supabase
    .from('claims')
    .select('id')
    .like('id', 'hn_%');
  const existingIds = new Set((existing || []).map(r => r.id));

  const newStories = relevant.filter(s => !existingIds.has(`hn_${s.id}`));
  console.log(`  ${newStories.length} new (${relevant.length - newStories.length} already in DB)`);

  const claims: ClaimRow[] = [];

  for (let i = 0; i < newStories.length; i++) {
    const s = newStories[i];
    const date = new Date(s.time * 1000).toISOString();

    // Try OpenRouter extraction
    const extracted = await extractWithOpenRouter(s.title, '', 'hackernews');
    await sleep(3500); // ~17/min to stay under 20/min limit

    const entities = extracted?.entities?.filter((e: any) => typeof e === 'string') || [];
    const category = (extracted?.category && VALID_CATEGORIES.has(extracted.category))
      ? extracted.category
      : inferCategory(s.title);

    claims.push({
      id: `hn_${s.id}`,
      post_id: `hn_${s.id}`,
      category,
      claim_text: extracted?.claim_text || s.title,
      entities: entities.length > 0 ? entities : [s.by || 'HN'],
      confidence: extracted?.confidence || 'medium',
      sentiment: 'neutral',
      date,
      source_url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
      source_name: 'Hacker News',
      source_kind: 'hackernews',
      source_feed: 'hackernews',
      source_feed_name: 'Hacker News',
    });

    process.stdout.write(`  [${i + 1}/${newStories.length}] ${s.title.slice(0, 60)}...\r`);
  }

  console.log(`\n  Persisting ${claims.length} HN claims...`);
  await persistClaims(claims);
  console.log(`  Done. (${openrouterCallCount} OpenRouter calls used so far)`);
}

// ─── arXiv Backfill ───────────────────────────────────────

async function backfillArxiv(days: number) {
  console.log(`\n── arXiv (cs.AI + cs.LG, ${days} days) ──`);

  const from = daysAgo(days);
  const to = new Date();
  const fromStr = from.toISOString().slice(0, 10).replace(/-/g, '');
  const toStr = to.toISOString().slice(0, 10).replace(/-/g, '');

  // arXiv API with date range — limit to 50 to stay manageable
  const query = `search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&start=0&max_results=50`;
  const url = `https://export.arxiv.org/api/query?${query}`;

  console.log(`  Fetching papers...`);
  const res = await fetch(url);
  const xml = await res.text();

  // Parse XML
  const parser = new (await import('linkedom')).DOMParser();
  let doc: any;
  try {
    // Try linkedom first (Node.js)
    doc = parser.parseFromString(xml, 'text/xml');
  } catch {
    // Fallback: simple regex extraction
    console.log('  Using regex parser fallback...');
  }

  // Simple regex-based extraction since we're in Node.js
  const entries: Array<{ id: string; title: string; summary: string; authors: string[]; published: string; link: string }> = [];

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const id = entry.match(/<id>(.*?)<\/id>/)?.[1] || '';
    const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/\s+/g, ' ').trim();
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '').replace(/\s+/g, ' ').trim();
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || '';
    const link = entry.match(/<link[^>]*href="(https:\/\/arxiv[^"]*)"[^>]*title="pdf"/)?.[1]
      || entry.match(/<id>(.*?)<\/id>/)?.[1] || '';

    const authors: string[] = [];
    const authorRegex = /<name>(.*?)<\/name>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1]);
    }

    if (title && id) {
      entries.push({ id, title, summary, authors, published, link });
    }
  }

  console.log(`  ${entries.length} papers found`);

  // Check which ones we already have
  const { data: existing } = await supabase
    .from('claims')
    .select('id')
    .like('id', 'arxiv_%');
  const existingIds = new Set((existing || []).map(r => r.id));

  const newEntries = entries.filter(e => {
    const arxivId = e.id.replace('http://arxiv.org/abs/', '').replace(/v\d+$/, '');
    return !existingIds.has(`arxiv_${arxivId}`);
  });

  console.log(`  ${newEntries.length} new (${entries.length - newEntries.length} already in DB)`);

  const claims: ClaimRow[] = [];

  for (let i = 0; i < newEntries.length; i++) {
    const e = newEntries[i];
    const arxivId = e.id.replace('http://arxiv.org/abs/', '').replace(/v\d+$/, '');

    // Use OpenRouter for entity extraction on the first 30, keyword-based for the rest
    let entities: string[] = e.authors.slice(0, 3);
    let category = 'MODELS';

    if (i < 30 && openrouterCallCount < MAX_OPENROUTER_CALLS) {
      const extracted = await extractWithOpenRouter(e.title, e.summary.slice(0, 300), 'arxiv');
      await sleep(3500);
      if (extracted?.entities?.length) {
        entities = [...extracted.entities.filter((x: any) => typeof x === 'string'), ...e.authors.slice(0, 2)];
        entities = [...new Set(entities)].slice(0, 10);
      }
      if (extracted?.category && VALID_CATEGORIES.has(extracted.category)) {
        category = extracted.category;
      }
    } else {
      category = inferCategory(e.title + ' ' + e.summary);
    }

    claims.push({
      id: `arxiv_${arxivId}`,
      post_id: `arxiv_${arxivId}`,
      category,
      claim_text: e.title,
      entities,
      confidence: 'high',
      sentiment: 'neutral',
      date: e.published || new Date().toISOString(),
      source_url: e.link || e.id,
      source_name: 'arXiv',
      source_kind: 'arxiv',
      source_feed: 'arxiv',
      source_feed_name: 'arXiv',
    });

    process.stdout.write(`  [${i + 1}/${newEntries.length}] ${e.title.slice(0, 60)}...\r`);
  }

  console.log(`\n  Persisting ${claims.length} arXiv claims...`);
  await persistClaims(claims);
  console.log(`  Done. (${openrouterCallCount} OpenRouter calls used so far)`);
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  console.log('Arbiter Intelligence -- Backfill Script');
  console.log(`OpenRouter key: ${OPENROUTER_KEY ? 'configured' : 'MISSING'}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Max OpenRouter calls: ${MAX_OPENROUTER_CALLS}`);

  await backfillHN(7);
  await backfillArxiv(7);

  console.log(`\n── Summary ──`);
  console.log(`Total OpenRouter calls: ${openrouterCallCount}`);

  const { count: claimCount } = await supabase.from('claims').select('*', { count: 'exact', head: true });
  const { count: entityCount } = await supabase.from('entities').select('*', { count: 'exact', head: true });
  console.log(`Database: ${claimCount} claims, ${entityCount} entities`);
  console.log('\nRun `npm run sync-vault` to update the Obsidian vault.');
}

main().catch(console.error);
