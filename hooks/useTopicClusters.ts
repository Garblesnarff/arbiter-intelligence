import { useMemo } from 'react';
import type { Claim, TopicCluster } from '../types';

/**
 * Simple union-find (disjoint set) for grouping claims by shared entities.
 */
class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor(ids: string[]) {
    this.parent = new Map();
    this.rank = new Map();
    for (const id of ids) {
      this.parent.set(id, id);
      this.rank.set(id, 0);
    }
  }

  find(x: string): string {
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression
    let current = x;
    while (current !== root) {
      const next = this.parent.get(current)!;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA)!;
    const rankB = this.rank.get(rootB)!;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }
}

/** Deterministic hash from sorted claim IDs */
function hashClaimIds(ids: string[]): string {
  const sorted = [...ids].sort();
  let hash = 0;
  const str = sorted.join('|');
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return 'cluster_' + Math.abs(hash).toString(36);
}

function buildClusters(claims: Claim[]): TopicCluster[] {
  // 1. Filter to 14-day window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const recentClaims = claims.filter(c => c.date >= cutoffISO);
  if (recentClaims.length < 2) return [];

  // 2. Build entity-to-claims index
  const entityToClaims = new Map<string, Set<string>>();
  for (const claim of recentClaims) {
    for (const entity of claim.entities) {
      const lower = entity.toLowerCase();
      if (!entityToClaims.has(lower)) {
        entityToClaims.set(lower, new Set());
      }
      entityToClaims.get(lower)!.add(claim.id);
    }
  }

  // 3. Count shared entities between claim pairs and union those with 2+
  const claimIds = recentClaims.map(c => c.id);
  const uf = new UnionFind(claimIds);

  // For each pair of claims, count shared entities via the inverted index
  // More efficient: iterate entities, and for each entity's claim set,
  // count co-occurrences between all pairs
  const pairShared = new Map<string, number>();

  for (const claimSet of entityToClaims.values()) {
    const arr = Array.from(claimSet);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = arr[i] < arr[j] ? `${arr[i]}|${arr[j]}` : `${arr[j]}|${arr[i]}`;
        pairShared.set(key, (pairShared.get(key) || 0) + 1);
      }
    }
  }

  // Union pairs with 1+ shared entities
  for (const [key, count] of pairShared) {
    if (count >= 1) {
      const [a, b] = key.split('|');
      uf.union(a, b);
    }
  }

  // 4. Group claims by their root
  const groups = new Map<string, string[]>();
  for (const id of claimIds) {
    const root = uf.find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(id);
  }

  // 5. Build TopicCluster for groups with 2+ claims
  const claimById = new Map<string, Claim>();
  for (const c of recentClaims) claimById.set(c.id, c);

  const clusters: TopicCluster[] = [];

  for (const memberIds of groups.values()) {
    if (memberIds.length < 2) continue;

    const memberClaims = memberIds.map(id => claimById.get(id)!);

    // Count entity frequencies (case-insensitive, use original casing of most common form)
    const entityFreq = new Map<string, number>();
    const entityOriginal = new Map<string, string>();
    for (const claim of memberClaims) {
      for (const entity of claim.entities) {
        const lower = entity.toLowerCase();
        const prev = entityFreq.get(lower) || 0;
        entityFreq.set(lower, prev + 1);
        // Keep the casing that appears most often (first seen is fine for determinism)
        if (!entityOriginal.has(lower)) {
          entityOriginal.set(lower, entity);
        }
      }
    }

    // Sort entities by frequency desc
    const sortedEntities = Array.from(entityFreq.entries())
      .sort((a, b) => b[1] - a[1]);

    const label = entityOriginal.get(sortedEntities[0][0]) || sortedEntities[0][0];
    const topEntities = sortedEntities.slice(0, 5).map(([lower]) => entityOriginal.get(lower) || lower);

    // Source count
    const sources = new Set(memberClaims.map(c => c.source_feed_name));

    // Most recent date
    const lastUpdated = memberClaims.reduce(
      (latest, c) => (c.date > latest ? c.date : latest),
      memberClaims[0].date
    );

    clusters.push({
      id: hashClaimIds(memberIds),
      label,
      claim_ids: memberIds,
      top_entities: topEntities,
      source_count: sources.size,
      last_updated: lastUpdated,
    });
  }

  // 6. Sort: source_count desc, then claim count desc
  clusters.sort((a, b) => {
    if (b.source_count !== a.source_count) return b.source_count - a.source_count;
    return b.claim_ids.length - a.claim_ids.length;
  });

  return clusters;
}

export function useTopicClusters(claims: Claim[]) {
  const clusters = useMemo(() => buildClusters(claims), [claims]);

  return {
    clusters,
    loading: false,
  };
}
