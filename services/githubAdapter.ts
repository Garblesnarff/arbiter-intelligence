
import { Claim } from '../types';
import { FeedStatus } from './rssService';
import { inferCategory, extractEntities, cachedFetch } from './sourceUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GH_API = 'https://api.github.com/search/repositories';
const CACHE_KEY = 'arbiter_gh_claims_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const STATUS_KEY = 'arbiter_gh_feed_status';

// ---------------------------------------------------------------------------
// GitHub API response types
// ---------------------------------------------------------------------------

interface GHRepo {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  owner: { login: string };
  pushed_at: string;
  created_at: string;
}

interface GHSearchResponse {
  items: GHRepo[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function searchRepos(query: string): Promise<GHRepo[]> {
  const res = await fetch(`${GH_API}?q=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
  const data: GHSearchResponse = await res.json();
  return data.items ?? [];
}

function repoToClaim(repo: GHRepo): Claim {
  const desc = repo.description ?? 'New repository';
  const claimText = `${repo.full_name}: ${desc}`.slice(0, 200);

  // Build searchable text from topics + description for category inference
  const searchText = [
    desc,
    ...repo.topics,
    repo.language ?? '',
  ].join(' ');

  const entities: string[] = [
    repo.owner.login,
    ...(repo.language ? [repo.language] : []),
    ...repo.topics.slice(0, 3),
  ];

  const hasStars = repo.stargazers_count > 50;

  return {
    id: `gh_${repo.full_name.replace('/', '_')}`,
    post_id: `gh_${repo.full_name.replace('/', '_')}`,
    category: inferCategory(searchText),
    claim_text: claimText,
    entities,
    confidence: 'medium',
    sentiment: 'neutral',
    date: repo.pushed_at || repo.created_at,
    source_url: repo.html_url,
    source_name: 'GitHub',
    source_kind: 'github',
    source_feed: 'github',
    source_feed_name: 'GitHub',
    ...(hasStars
      ? {
          metric_value: `${repo.stargazers_count}`,
          metric_unit: 'stars',
          metric_context: `${repo.forks_count} forks`,
        }
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

export async function fetchGitHubClaims(): Promise<Claim[]> {
  try {
    const claims = await cachedFetch<Claim[]>(CACHE_KEY, CACHE_TTL_MS, async () => {
      const date7d = daysAgo(7);
      const date3d = daysAgo(3);

      const [newRepos, trendingRepos] = await Promise.all([
        searchRepos(
          `created:>${date7d} language:python topic:machine-learning&sort=stars&order=desc&per_page=15`,
        ),
        searchRepos(
          `topic:artificial-intelligence stars:>100 pushed:>${date3d}&sort=updated&order=desc&per_page=15`,
        ),
      ]);

      // Merge and deduplicate by full_name
      const seen = new Set<string>();
      const merged: GHRepo[] = [];
      for (const repo of [...newRepos, ...trendingRepos]) {
        if (!seen.has(repo.full_name)) {
          seen.add(repo.full_name);
          merged.push(repo);
        }
      }

      return merged.map(repoToClaim);
    });

    writeStatus({
      id: 'github',
      name: 'GitHub',
      lastFetch: new Date().toISOString(),
      claimCount: claims.length,
      status: 'success',
    });

    return claims;
  } catch (err) {
    console.warn('[githubAdapter] Failed to fetch GitHub repos:', err);
    writeStatus({
      id: 'github',
      name: 'GitHub',
      lastFetch: new Date().toISOString(),
      claimCount: 0,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return [];
  }
}

export function getGitHubFeedStatus(): FeedStatus {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw) return JSON.parse(raw) as FeedStatus;
  } catch {
    // ignore
  }
  return {
    id: 'github',
    name: 'GitHub',
    lastFetch: null,
    claimCount: 0,
    status: 'pending',
  };
}
