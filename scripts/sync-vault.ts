/**
 * sync-vault.ts
 *
 * Reads from local Supabase and writes Obsidian-compatible .md files
 * to the vault at /Volumes/T7/ArbiterVault (or VITE_OBSIDIAN_VAULT_PATH).
 *
 * Usage:  npx tsx scripts/sync-vault.ts
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Load .env manually (no dotenv dependency)
function loadEnv(): Record<string, string> {
  const envPath = join(import.meta.dirname ?? ".", "..", ".env");
  const vars: Record<string, string> = {};
  if (!existsSync(envPath)) return vars;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

const env = loadEnv();

const SUPABASE_URL = env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY ?? "";
const VAULT_PATH = env.VITE_OBSIDIAN_VAULT_PATH ?? "/Volumes/T7/ArbiterVault";

if (!SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Types (mirrors the DB schema)
// ---------------------------------------------------------------------------

interface Entity {
  id: string;
  canonical_name: string;
  entity_type: string | null;
  description: string | null;
  mention_count: number;
  first_seen: string;
  last_seen: string;
}

interface Claim {
  id: string;
  category: string;
  claim_text: string;
  confidence: string;
  sentiment: string;
  date: string;
  source_url: string | null;
  source_name: string | null;
  source_feed: string;
  source_feed_name: string;
  metric_value: string | null;
  metric_unit: string | null;
  metric_context: string | null;
  cluster_id: string | null;
}

interface ClaimEntity {
  claim_id: string;
  entity_id: string;
}

interface EntityRelationship {
  entity_a: string;
  entity_b: string;
  relationship_type: string;
  strength: number;
}

interface TopicCluster {
  id: string;
  label: string;
  summary: string | null;
  source_count: number;
  claim_count: number;
  last_updated: string;
}

interface ClusterEntity {
  cluster_id: string;
  entity_id: string;
  rank: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

function write(filePath: string, content: string) {
  writeFileSync(filePath, content, "utf-8");
}

/** Sanitise a name for use as a filename (keep spaces, remove FS-unsafe chars). */
function safeName(name: string): string {
  return name.replace(/[/\\:*?"<>|#^[\]]/g, "_").trim() || "unnamed";
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Group an array by a key function. */
function groupBy<T>(items: T[], key: (t: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchAll<T>(table: string): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      return all;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data as T[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Vault generators
// ---------------------------------------------------------------------------

function generateEntityFile(
  entity: Entity,
  claimsByEntity: Map<string, (Claim & { entityIds: string[] })[]>,
  entityMap: Map<string, Entity>,
  relationships: EntityRelationship[],
): string {
  const claims = claimsByEntity.get(entity.id) ?? [];

  // Related entities via relationships
  const related: { name: string; strength: number }[] = [];
  for (const r of relationships) {
    if (r.entity_a === entity.id) {
      const other = entityMap.get(r.entity_b);
      if (other) related.push({ name: other.canonical_name, strength: r.strength });
    } else if (r.entity_b === entity.id) {
      const other = entityMap.get(r.entity_a);
      if (other) related.push({ name: other.canonical_name, strength: r.strength });
    }
  }
  related.sort((a, b) => b.strength - a.strength);

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const c of claims) {
    catCounts[c.category] = (catCounts[c.category] ?? 0) + 1;
  }

  // Sort claims by date descending, limit to 20
  const recentClaims = [...claims]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  let md = `---
type: entity
entity_type: ${entity.entity_type ?? "unknown"}
mention_count: ${entity.mention_count}
first_seen: ${fmtDate(entity.first_seen)}
last_seen: ${fmtDate(entity.last_seen)}
---
# ${entity.canonical_name}

**Type:** ${entity.entity_type ?? "unknown"}
**Mentions:** ${entity.mention_count}
**First seen:** ${fmtDate(entity.first_seen)} | **Last seen:** ${fmtDate(entity.last_seen)}
`;

  if (entity.description) {
    md += `\n> ${entity.description}\n`;
  }

  md += `\n## Recent Claims\n`;
  if (recentClaims.length === 0) {
    md += `_No claims linked yet._\n`;
  } else {
    for (const c of recentClaims) {
      const link = c.source_url ? `[${c.claim_text}](${c.source_url})` : c.claim_text;
      md += `- ${link} -- ${fmtDate(c.date)} via [[${c.source_feed_name}]]\n`;
    }
  }

  md += `\n## Related Entities\n`;
  if (related.length === 0) {
    md += `_No relationships yet._\n`;
  } else {
    for (const r of related) {
      md += `- [[${r.name}]] (strength: ${r.strength})\n`;
    }
  }

  if (Object.keys(catCounts).length > 0) {
    md += `\n## Categories\n`;
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    md += sorted.map(([cat, n]) => `- ${cat} (${n} claims)`).join(", ") + "\n";
  }

  return md;
}

function generateDailyDigest(
  dateStr: string,
  claims: (Claim & { entityIds: string[] })[],
  entityMap: Map<string, Entity>,
): string {
  const byCat = groupBy(claims, (c) => c.category);
  const catEntries = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length);

  let md = `---
type: daily_digest
date: ${dateStr}
claim_count: ${claims.length}
---
# Intelligence Digest -- ${fmtDateLong(dateStr + "T00:00:00Z")}

`;

  for (const [cat, catClaims] of catEntries) {
    md += `## ${cat} (${catClaims.length} signals)\n`;
    for (const c of catClaims) {
      const entityLinks = c.entityIds
        .map((eid) => entityMap.get(eid))
        .filter(Boolean)
        .map((e) => `[[${e!.canonical_name}]]`)
        .join(", ");
      const entitiesPart = entityLinks ? ` -- ${entityLinks}` : "";
      md += `- ${c.claim_text}${entitiesPart} -- via [[${c.source_feed_name}]] -- ${c.confidence}\n`;
    }
    md += "\n";
  }

  return md;
}

function generateSourceFile(
  feedName: string,
  claims: (Claim & { entityIds: string[] })[],
  entityMap: Map<string, Entity>,
): string {
  const catCounts: Record<string, number> = {};
  for (const c of claims) {
    catCounts[c.category] = (catCounts[c.category] ?? 0) + 1;
  }

  const recentClaims = [...claims]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);

  const firstDate = claims.reduce(
    (min, c) => (c.date < min ? c.date : min),
    claims[0]?.date ?? "",
  );
  const lastDate = claims.reduce(
    (max, c) => (c.date > max ? c.date : max),
    claims[0]?.date ?? "",
  );

  let md = `---
type: source
source_feed_name: "${feedName}"
claim_count: ${claims.length}
first_seen: ${firstDate ? fmtDate(firstDate) : "n/a"}
last_seen: ${lastDate ? fmtDate(lastDate) : "n/a"}
---
# ${feedName}

**Claims:** ${claims.length}
**Active:** ${firstDate ? fmtDate(firstDate) : "n/a"} -- ${lastDate ? fmtDate(lastDate) : "n/a"}

## Categories Covered
`;

  const catSorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  for (const [cat, n] of catSorted) {
    md += `- ${cat} (${n})\n`;
  }

  md += `\n## Recent Claims\n`;
  for (const c of recentClaims) {
    const entityLinks = c.entityIds
      .map((eid) => entityMap.get(eid))
      .filter(Boolean)
      .map((e) => `[[${e!.canonical_name}]]`)
      .join(", ");
    const entitiesPart = entityLinks ? ` -- ${entityLinks}` : "";
    const link = c.source_url ? `[${c.claim_text}](${c.source_url})` : c.claim_text;
    md += `- ${link}${entitiesPart} -- ${fmtDate(c.date)}\n`;
  }

  return md;
}

function generateClusterFile(
  cluster: TopicCluster,
  clusterEntities: ClusterEntity[],
  entityMap: Map<string, Entity>,
  claims: (Claim & { entityIds: string[] })[],
): string {
  const clusterClaims = claims.filter((c) => c.cluster_id === cluster.id);
  const entities = clusterEntities
    .filter((ce) => ce.cluster_id === cluster.id)
    .sort((a, b) => a.rank - b.rank)
    .map((ce) => entityMap.get(ce.entity_id))
    .filter(Boolean) as Entity[];

  let md = `---
type: cluster
cluster_id: "${cluster.id}"
claim_count: ${cluster.claim_count}
source_count: ${cluster.source_count}
last_updated: ${fmtDate(cluster.last_updated)}
---
# ${cluster.label}

`;

  if (cluster.summary) {
    md += `${cluster.summary}\n\n`;
  }

  md += `**Claims:** ${cluster.claim_count} | **Sources:** ${cluster.source_count} | **Updated:** ${fmtDate(cluster.last_updated)}\n\n`;

  if (entities.length > 0) {
    md += `## Key Entities\n`;
    for (const e of entities) {
      md += `- [[${e.canonical_name}]] (${e.entity_type ?? "unknown"})\n`;
    }
    md += "\n";
  }

  if (clusterClaims.length > 0) {
    md += `## Claims\n`;
    const sorted = [...clusterClaims].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    for (const c of sorted.slice(0, 30)) {
      const entityLinks = c.entityIds
        .map((eid) => entityMap.get(eid))
        .filter(Boolean)
        .map((e) => `[[${e!.canonical_name}]]`)
        .join(", ");
      const entitiesPart = entityLinks ? ` -- ${entityLinks}` : "";
      md += `- ${c.claim_text}${entitiesPart} -- ${fmtDate(c.date)} via [[${c.source_feed_name}]]\n`;
    }
  }

  return md;
}

function generateReadme(
  entities: Entity[],
  claims: (Claim & { entityIds: string[] })[],
  sourceFeeds: string[],
  clusters: TopicCluster[],
): string {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const topEntities = [...entities]
    .sort((a, b) => b.mention_count - a.mention_count)
    .slice(0, 15);

  // Recent days with claim counts
  const byDate = groupBy(claims, (c) => fmtDate(c.date));
  const recentDays = Object.entries(byDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10);

  let md = `# Arbiter Intelligence Vault

**Last synced:** ${now}
**Total claims:** ${claims.length} | **Entities:** ${entities.length} | **Sources:** ${sourceFeeds.length} | **Clusters:** ${clusters.length}

## Top Entities (by mentions)
`;

  if (topEntities.length === 0) {
    md += `_No entities yet. Run the ingestion pipeline to populate._\n`;
  } else {
    for (let i = 0; i < topEntities.length; i++) {
      const e = topEntities[i];
      md += `${i + 1}. [[${e.canonical_name}]] -- ${e.mention_count} mentions\n`;
    }
  }

  md += `\n## Recent Activity\n`;
  if (recentDays.length === 0) {
    md += `_No claims yet._\n`;
  } else {
    for (const [date, dayClaims] of recentDays) {
      md += `- [[${date}]] -- ${dayClaims.length} new signals\n`;
    }
  }

  if (clusters.length > 0) {
    md += `\n## Topic Clusters\n`;
    const sorted = [...clusters].sort(
      (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime(),
    );
    for (const c of sorted.slice(0, 10)) {
      md += `- [[${c.label}]] -- ${c.claim_count} claims\n`;
    }
  }

  md += `\n---\n_Auto-generated by [Arbiter Intelligence](https://github.com/arbiter-intelligence). Do not edit manually._\n`;

  return md;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  console.log("Arbiter Intelligence -- Obsidian Vault Sync");
  console.log(`Vault path: ${VAULT_PATH}`);
  console.log(`Supabase:   ${SUPABASE_URL}`);
  console.log();

  // Fetch all data
  console.log("Fetching data...");
  const [entities, claims, claimEntities, relationships, clusters, clusterEntities] =
    await Promise.all([
      fetchAll<Entity>("entities"),
      fetchAll<Claim>("claims"),
      fetchAll<ClaimEntity>("claim_entities"),
      fetchAll<EntityRelationship>("entity_relationships"),
      fetchAll<TopicCluster>("topic_clusters"),
      fetchAll<ClusterEntity>("cluster_entities"),
    ]);

  console.log(
    `  ${entities.length} entities, ${claims.length} claims, ${relationships.length} relationships, ${clusters.length} clusters`,
  );

  // Build lookup maps
  const entityMap = new Map<string, Entity>(entities.map((e) => [e.id, e]));

  // Build claims with their entity IDs attached
  const entityIdsByClaim = new Map<string, string[]>();
  for (const ce of claimEntities) {
    const arr = entityIdsByClaim.get(ce.claim_id) ?? [];
    arr.push(ce.entity_id);
    entityIdsByClaim.set(ce.claim_id, arr);
  }

  const enrichedClaims = claims.map((c) => ({
    ...c,
    entityIds: entityIdsByClaim.get(c.id) ?? [],
  }));

  // Claims grouped by entity
  const claimsByEntity = new Map<string, (Claim & { entityIds: string[] })[]>();
  for (const c of enrichedClaims) {
    for (const eid of c.entityIds) {
      const arr = claimsByEntity.get(eid) ?? [];
      arr.push(c);
      claimsByEntity.set(eid, arr);
    }
  }

  // Ensure vault directories
  console.log("Creating vault directories...");
  ensureDir(join(VAULT_PATH, "Entities"));
  ensureDir(join(VAULT_PATH, "Claims"));
  ensureDir(join(VAULT_PATH, "Sources"));
  ensureDir(join(VAULT_PATH, "Clusters"));

  let filesWritten = 0;

  // --- Entity files ---
  console.log("Writing entity files...");
  for (const entity of entities) {
    const content = generateEntityFile(entity, claimsByEntity, entityMap, relationships);
    const filename = safeName(entity.canonical_name) + ".md";
    write(join(VAULT_PATH, "Entities", filename), content);
    filesWritten++;
  }

  // --- Daily digest files ---
  console.log("Writing daily digest files...");
  const claimsByDate = groupBy(enrichedClaims, (c) => fmtDate(c.date));
  for (const [dateStr, dayClaims] of Object.entries(claimsByDate)) {
    const content = generateDailyDigest(dateStr, dayClaims, entityMap);
    write(join(VAULT_PATH, "Claims", `${dateStr}.md`), content);
    filesWritten++;
  }

  // --- Source feed files ---
  console.log("Writing source files...");
  const claimsByFeed = groupBy(enrichedClaims, (c) => c.source_feed_name);
  const sourceFeeds = Object.keys(claimsByFeed);
  for (const [feedName, feedClaims] of Object.entries(claimsByFeed)) {
    const content = generateSourceFile(feedName, feedClaims, entityMap);
    const filename = safeName(feedName) + ".md";
    write(join(VAULT_PATH, "Sources", filename), content);
    filesWritten++;
  }

  // --- Cluster files ---
  console.log("Writing cluster files...");
  for (const cluster of clusters) {
    const content = generateClusterFile(cluster, clusterEntities, entityMap, enrichedClaims);
    const filename = safeName(cluster.label) + ".md";
    write(join(VAULT_PATH, "Clusters", filename), content);
    filesWritten++;
  }

  // --- README ---
  console.log("Writing README...");
  const readme = generateReadme(entities, enrichedClaims, sourceFeeds, clusters);
  write(join(VAULT_PATH, "README.md"), readme);
  filesWritten++;

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log();
  console.log(`Done. Wrote ${filesWritten} files in ${elapsed}s.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
