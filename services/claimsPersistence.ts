import { supabase } from './supabaseClient';
import type { Claim, Watchlist } from '../types';

// ──────────────────────────────────────────────
// Types returned by persistence queries
// ──────────────────────────────────────────────

export interface EntityRow {
  id: string;
  canonical_name: string;
  entity_type: string | null;
  description: string | null;
  first_seen: string;
  last_seen: string;
  mention_count: number;
  created_at: string;
}

export interface EntityGraphEdge {
  entity_a: string;
  name_a: string;
  entity_b: string;
  name_b: string;
  strength: number;
}

export interface EntityDetail {
  entity: EntityRow;
  claims: Claim[];
  related: EntityRow[];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Chunk an array into batches of `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/** Sort a pair of entity ids so entity_a < entity_b (matching the DB constraint). */
function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// ──────────────────────────────────────────────
// persistClaims
// ──────────────────────────────────────────────

export async function persistClaims(claims: Claim[]): Promise<void> {
  if (!supabase || claims.length === 0) return;

  const now = new Date().toISOString();

  // 1. Upsert claims (batch in groups of 500 to stay within Supabase row limits)
  const claimRows = claims.map((c) => ({
    id: c.id,
    post_id: c.post_id,
    category: c.category,
    claim_text: c.claim_text,
    original_sentence: c.original_sentence ?? null,
    confidence: c.confidence,
    sentiment: c.sentiment,
    date: c.date,
    source_url: c.source_url ?? null,
    source_name: c.source_name ?? null,
    source_author: c.source_author ?? null,
    source_kind: c.source_kind ?? null,
    source_feed: c.source_feed,
    source_feed_name: c.source_feed_name,
    model_relevance: c.model_relevance ?? false,
    metric_value: c.metric_value ?? null,
    metric_unit: c.metric_unit ?? null,
    metric_context: c.metric_context ?? null,
    cluster_id: c.cluster_id ?? null,
    updated_at: now,
  }));

  for (const batch of chunk(claimRows, 500)) {
    const { error } = await supabase
      .from('claims')
      .upsert(batch, { onConflict: 'id' });
    if (error) console.error('[Arbiter] Failed to upsert claims batch:', error.message);
  }

  // 2. Collect unique entities across all claims
  const entityMap = new Map<string, string>(); // lowercase id -> original casing
  for (const c of claims) {
    for (const name of c.entities) {
      const id = name.toLowerCase();
      // Keep the first-seen casing as canonical
      if (!entityMap.has(id)) entityMap.set(id, name);
    }
  }

  // Upsert entities — use raw SQL via rpc for the increment logic.
  // Supabase JS upsert doesn't support "on conflict do update set mention_count = mention_count + 1"
  // so we do a two-step: upsert with default values, then increment counts.
  if (entityMap.size > 0) {
    const entityRows = Array.from(entityMap.entries()).map(([id, canonical]) => ({
      id,
      canonical_name: canonical,
      first_seen: now,
      last_seen: now,
      mention_count: 1,
    }));

    for (const batch of chunk(entityRows, 500)) {
      const { error } = await supabase
        .from('entities')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
      if (error) console.error('[Arbiter] Failed to upsert entities batch:', error.message);
    }

    // Now update last_seen and increment mention_count for entities that already existed.
    // We count how many times each entity appears across the claims being persisted.
    const mentionCounts = new Map<string, number>();
    for (const c of claims) {
      const seen = new Set<string>();
      for (const name of c.entities) {
        const id = name.toLowerCase();
        if (!seen.has(id)) {
          seen.add(id);
          mentionCounts.set(id, (mentionCounts.get(id) ?? 0) + 1);
        }
      }
    }

    // Batch-update mention counts via individual updates (Supabase JS doesn't support
    // arithmetic in upsert). We fire these concurrently in small batches.
    const updateEntries = Array.from(mentionCounts.entries());
    for (const batch of chunk(updateEntries, 50)) {
      await Promise.all(
        batch.map(([id, count]) =>
          supabase!.rpc('increment_entity_mentions', { eid: id, n: count, seen_at: now })
            .then(({ error }) => {
              // If the RPC doesn't exist yet, fall back to a plain update
              if (error) {
                return supabase!
                  .from('entities')
                  .update({ last_seen: now })
                  .eq('id', id);
              }
            })
        )
      );
    }
  }

  // 3. Upsert claim_entities junction rows
  const junctionRows: { claim_id: string; entity_id: string }[] = [];
  for (const c of claims) {
    const seen = new Set<string>();
    for (const name of c.entities) {
      const id = name.toLowerCase();
      if (!seen.has(id)) {
        seen.add(id);
        junctionRows.push({ claim_id: c.id, entity_id: id });
      }
    }
  }

  for (const batch of chunk(junctionRows, 500)) {
    const { error } = await supabase
      .from('claim_entities')
      .upsert(batch, { onConflict: 'claim_id,entity_id' });
    if (error) console.error('[Arbiter] Failed to upsert claim_entities batch:', error.message);
  }

  // 4. Upsert entity_relationships (co-occurrence within each claim)
  const relMap = new Map<string, { entity_a: string; entity_b: string; count: number }>();
  for (const c of claims) {
    const ids = [...new Set(c.entities.map((n) => n.toLowerCase()))];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = sortedPair(ids[i], ids[j]);
        const key = `${a}|${b}`;
        const existing = relMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          relMap.set(key, { entity_a: a, entity_b: b, count: 1 });
        }
      }
    }
  }

  if (relMap.size > 0) {
    const relRows = Array.from(relMap.values()).map((r) => ({
      entity_a: r.entity_a,
      entity_b: r.entity_b,
      relationship_type: 'co-occurrence',
      strength: r.count,
      first_seen: now,
      last_seen: now,
    }));

    // Upsert base rows (this sets strength to the batch count for new rows)
    for (const batch of chunk(relRows, 500)) {
      const { error } = await supabase
        .from('entity_relationships')
        .upsert(batch, { onConflict: 'entity_a,entity_b' });
      if (error) console.error('[Arbiter] Failed to upsert entity_relationships batch:', error.message);
    }

    // Increment strength for existing relationships via rpc or fallback
    for (const batch of chunk(Array.from(relMap.values()), 50)) {
      await Promise.all(
        batch.map((r) =>
          supabase!
            .rpc('increment_relationship_strength', {
              a: r.entity_a,
              b: r.entity_b,
              n: r.count,
              seen_at: now,
            })
            .then(({ error }) => {
              // If the RPC doesn't exist, the plain upsert above is sufficient
              if (error) return;
            })
        )
      );
    }
  }
}

// ──────────────────────────────────────────────
// loadPersistedClaims
// ──────────────────────────────────────────────

export async function loadPersistedClaims(): Promise<Claim[]> {
  if (!supabase) return [];

  try {
    // Load claims ordered by date desc
    const { data: claimRows, error: claimsErr } = await supabase
      .from('claims')
      .select('*')
      .order('date', { ascending: false });

    if (claimsErr) {
      console.error('[Arbiter] Failed to load claims:', claimsErr.message);
      return [];
    }
    if (!claimRows || claimRows.length === 0) return [];

    // Load all claim_entities in one query
    const { data: ceRows, error: ceErr } = await supabase
      .from('claim_entities')
      .select('claim_id, entity_id');

    if (ceErr) {
      console.error('[Arbiter] Failed to load claim_entities:', ceErr.message);
    }

    // Build a map of claim_id -> entity_id[]
    const entityMap = new Map<string, string[]>();
    if (ceRows) {
      for (const row of ceRows) {
        const list = entityMap.get(row.claim_id);
        if (list) list.push(row.entity_id);
        else entityMap.set(row.claim_id, [row.entity_id]);
      }
    }

    // Also load canonical names so we can return the display casing
    const { data: entityRows } = await supabase
      .from('entities')
      .select('id, canonical_name');

    const nameMap = new Map<string, string>();
    if (entityRows) {
      for (const e of entityRows) nameMap.set(e.id, e.canonical_name);
    }

    // Assemble Claim objects
    return claimRows.map((row): Claim => ({
      id: row.id,
      post_id: row.post_id,
      category: row.category,
      claim_text: row.claim_text,
      original_sentence: row.original_sentence ?? undefined,
      confidence: row.confidence,
      sentiment: row.sentiment,
      date: row.date,
      source_url: row.source_url ?? undefined,
      source_name: row.source_name ?? undefined,
      source_author: row.source_author ?? undefined,
      source_kind: row.source_kind ?? undefined,
      source_feed: row.source_feed,
      source_feed_name: row.source_feed_name,
      model_relevance: row.model_relevance ?? undefined,
      metric_value: row.metric_value ?? undefined,
      metric_unit: row.metric_unit ?? undefined,
      metric_context: row.metric_context ?? undefined,
      cluster_id: row.cluster_id ?? undefined,
      entities: (entityMap.get(row.id) ?? []).map((id) => nameMap.get(id) ?? id),
    }));
  } catch (err) {
    console.error('[Arbiter] Unexpected error loading claims:', err);
    return [];
  }
}

// ──────────────────────────────────────────────
// getEntityGraph
// ──────────────────────────────────────────────

export async function getEntityGraph(): Promise<EntityGraphEdge[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('entity_graph')
      .select('entity_a, name_a, entity_b, name_b, strength')
      .order('strength', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Arbiter] Failed to load entity graph:', error.message);
      return [];
    }

    return (data ?? []) as EntityGraphEdge[];
  } catch (err) {
    console.error('[Arbiter] Unexpected error loading entity graph:', err);
    return [];
  }
}

// ──────────────────────────────────────────────
// getEntityDetail
// ──────────────────────────────────────────────

export async function getEntityDetail(entityId: string): Promise<EntityDetail | null> {
  if (!supabase) return null;

  try {
    // 1. Fetch entity info
    const { data: entity, error: entityErr } = await supabase
      .from('entities')
      .select('*')
      .eq('id', entityId)
      .single();

    if (entityErr || !entity) {
      console.error('[Arbiter] Entity not found:', entityId, entityErr?.message);
      return null;
    }

    // 2. Fetch all claim IDs mentioning this entity
    const { data: ceRows, error: ceErr } = await supabase
      .from('claim_entities')
      .select('claim_id')
      .eq('entity_id', entityId);

    if (ceErr) {
      console.error('[Arbiter] Failed to load claim_entities for entity:', ceErr.message);
    }

    const claimIds = (ceRows ?? []).map((r) => r.claim_id);

    // 3. Fetch the actual claims
    let claims: Claim[] = [];
    if (claimIds.length > 0) {
      // Supabase .in() has a limit; batch if needed
      const allClaimRows: any[] = [];
      for (const batch of chunk(claimIds, 200)) {
        const { data, error } = await supabase
          .from('claims')
          .select('*')
          .in('id', batch)
          .order('date', { ascending: false });

        if (error) {
          console.error('[Arbiter] Failed to load claims for entity:', error.message);
        } else if (data) {
          allClaimRows.push(...data);
        }
      }

      // Reconstruct entities array for each claim
      const { data: allCeRows } = await supabase
        .from('claim_entities')
        .select('claim_id, entity_id')
        .in('claim_id', claimIds);

      const ceMap = new Map<string, string[]>();
      if (allCeRows) {
        for (const row of allCeRows) {
          const list = ceMap.get(row.claim_id);
          if (list) list.push(row.entity_id);
          else ceMap.set(row.claim_id, [row.entity_id]);
        }
      }

      const { data: entityNames } = await supabase
        .from('entities')
        .select('id, canonical_name');

      const nameMap = new Map<string, string>();
      if (entityNames) {
        for (const e of entityNames) nameMap.set(e.id, e.canonical_name);
      }

      claims = allClaimRows.map((row): Claim => ({
        id: row.id,
        post_id: row.post_id,
        category: row.category,
        claim_text: row.claim_text,
        original_sentence: row.original_sentence ?? undefined,
        confidence: row.confidence,
        sentiment: row.sentiment,
        date: row.date,
        source_url: row.source_url ?? undefined,
        source_name: row.source_name ?? undefined,
        source_author: row.source_author ?? undefined,
        source_kind: row.source_kind ?? undefined,
        source_feed: row.source_feed,
        source_feed_name: row.source_feed_name,
        model_relevance: row.model_relevance ?? undefined,
        metric_value: row.metric_value ?? undefined,
        metric_unit: row.metric_unit ?? undefined,
        metric_context: row.metric_context ?? undefined,
        cluster_id: row.cluster_id ?? undefined,
        entities: (ceMap.get(row.id) ?? []).map((id) => nameMap.get(id) ?? id),
      }));
    }

    // 4. Fetch related entities from entity_relationships
    const { data: relsA } = await supabase
      .from('entity_relationships')
      .select('entity_b')
      .eq('entity_a', entityId)
      .order('strength', { ascending: false })
      .limit(20);

    const { data: relsB } = await supabase
      .from('entity_relationships')
      .select('entity_a')
      .eq('entity_b', entityId)
      .order('strength', { ascending: false })
      .limit(20);

    const relatedIds = [
      ...(relsA ?? []).map((r) => r.entity_b),
      ...(relsB ?? []).map((r) => r.entity_a),
    ];

    let related: EntityRow[] = [];
    if (relatedIds.length > 0) {
      const uniqueRelated = [...new Set(relatedIds)];
      const { data: relatedEntities, error: relErr } = await supabase
        .from('entities')
        .select('*')
        .in('id', uniqueRelated.slice(0, 20));

      if (relErr) {
        console.error('[Arbiter] Failed to load related entities:', relErr.message);
      } else {
        related = (relatedEntities ?? []) as EntityRow[];
      }
    }

    return { entity: entity as EntityRow, claims, related };
  } catch (err) {
    console.error('[Arbiter] Unexpected error in getEntityDetail:', err);
    return null;
  }
}

// ──────────────────────────────────────────────
// Watchlists
// ──────────────────────────────────────────────

export async function persistWatchlists(watchlists: Watchlist[]): Promise<void> {
  if (!supabase || watchlists.length === 0) return;

  const rows = watchlists.map((w) => ({
    id: w.id,
    name: w.name,
    query: w.query,
    entities: w.entities,
    categories: w.categories,
    is_active: w.is_active,
    created_at: w.created_at,
    updated_at: w.updated_at,
  }));

  for (const batch of chunk(rows, 500)) {
    const { error } = await supabase
      .from('watchlists')
      .upsert(batch, { onConflict: 'id' });
    if (error) console.error('[Arbiter] Failed to upsert watchlists:', error.message);
  }
}

export async function loadWatchlists(): Promise<Watchlist[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('watchlists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Arbiter] Failed to load watchlists:', error.message);
      return [];
    }

    return (data ?? []).map((row): Watchlist => ({
      id: row.id,
      name: row.name,
      query: row.query ?? '',
      entities: row.entities ?? [],
      categories: row.categories ?? [],
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error('[Arbiter] Unexpected error loading watchlists:', err);
    return [];
  }
}
