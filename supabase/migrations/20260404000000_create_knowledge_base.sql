-- Arbiter Intelligence Knowledge Base Schema
-- Persistent storage for claims, entities, and their relationships

-- Claims: the core unit of intelligence
create table claims (
  id text primary key,
  post_id text,
  category text not null check (category in ('MODELS','CAPITAL','BIOLOGY','ROBOTICS','ENERGY','SPACE','COMPUTE','GOVERNANCE','INFRASTRUCTURE','CONSCIOUSNESS')),
  claim_text text not null,
  original_sentence text,
  confidence text not null default 'medium' check (confidence in ('high','medium','low')),
  sentiment text not null default 'neutral' check (sentiment in ('positive','negative','neutral')),
  date timestamptz not null default now(),
  source_url text,
  source_name text,
  source_author text,
  source_kind text check (source_kind in ('rss','hackernews','arxiv','github')),
  source_feed text not null,
  source_feed_name text not null,
  model_relevance boolean default false,
  metric_value text,
  metric_unit text,
  metric_context text,
  cluster_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_claims_category on claims(category);
create index idx_claims_date on claims(date desc);
create index idx_claims_source_feed on claims(source_feed);
create index idx_claims_cluster on claims(cluster_id);

-- Entities: companies, people, products, technologies
create table entities (
  id text primary key, -- lowercase normalized name
  canonical_name text not null, -- display casing
  entity_type text, -- 'company', 'product', 'person', 'technology', 'benchmark', 'concept'
  description text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  mention_count integer not null default 1,
  created_at timestamptz not null default now()
);

create index idx_entities_type on entities(entity_type);
create index idx_entities_mentions on entities(mention_count desc);

-- Claim-Entity junction: which entities appear in which claims
create table claim_entities (
  claim_id text not null references claims(id) on delete cascade,
  entity_id text not null references entities(id) on delete cascade,
  primary key (claim_id, entity_id)
);

create index idx_claim_entities_entity on claim_entities(entity_id);

-- Entity relationships: connections between entities (co-occurrence based)
create table entity_relationships (
  entity_a text not null references entities(id) on delete cascade,
  entity_b text not null references entities(id) on delete cascade,
  relationship_type text not null default 'co-occurrence', -- 'co-occurrence', 'subsidiary', 'competitor', 'creator'
  strength integer not null default 1, -- co-occurrence count
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (entity_a, entity_b),
  check (entity_a < entity_b) -- canonical ordering to prevent duplicates
);

create index idx_entity_rel_b on entity_relationships(entity_b);

-- Topic clusters: groups of related claims
create table topic_clusters (
  id text primary key,
  label text not null,
  summary text,
  source_count integer not null default 0,
  claim_count integer not null default 0,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Cluster top entities junction
create table cluster_entities (
  cluster_id text not null references topic_clusters(id) on delete cascade,
  entity_id text not null references entities(id) on delete cascade,
  rank integer not null default 0,
  primary key (cluster_id, entity_id)
);

-- Watchlists
create table watchlists (
  id text primary key,
  name text not null,
  query text default '',
  entities text[] default '{}',
  categories text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vault sync tracking: when was each entity/cluster last written to Obsidian
create table vault_sync (
  item_type text not null, -- 'entity', 'cluster', 'daily_digest'
  item_id text not null,
  last_synced timestamptz not null default now(),
  vault_path text not null,
  primary key (item_type, item_id)
);

-- Helper view: entity co-occurrence graph
create view entity_graph as
select
  er.entity_a,
  ea.canonical_name as name_a,
  er.entity_b,
  eb.canonical_name as name_b,
  er.strength,
  er.relationship_type,
  er.last_seen
from entity_relationships er
join entities ea on ea.id = er.entity_a
join entities eb on eb.id = er.entity_b
order by er.strength desc;

-- Helper view: entity with recent claim count
create view entity_activity as
select
  e.id,
  e.canonical_name,
  e.entity_type,
  e.mention_count,
  count(ce.claim_id) filter (where c.date > now() - interval '7 days') as recent_claims,
  max(c.date) as last_claim_date
from entities e
left join claim_entities ce on ce.entity_id = e.id
left join claims c on c.id = ce.claim_id
group by e.id, e.canonical_name, e.entity_type, e.mention_count
order by recent_claims desc;
