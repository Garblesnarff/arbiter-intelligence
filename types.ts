
export interface ChroniclePost {
  id: string;
  title: string;
  published_at: string;
  body_snippet: string;
}

export type SourceKind = 'rss' | 'hackernews' | 'arxiv' | 'github';

export interface Claim {
  id: string;
  post_id: string;
  category: "MODELS" | "CAPITAL" | "BIOLOGY" | "ROBOTICS" | "ENERGY" | "SPACE" | "COMPUTE" | "GOVERNANCE" | "INFRASTRUCTURE" | "CONSCIOUSNESS";
  claim_text: string;
  original_sentence?: string;
  entities: string[];
  metric_value?: string;
  metric_unit?: string;
  metric_context?: string;
  confidence: "high" | "medium" | "low";
  sentiment: "positive" | "negative" | "neutral";
  date: string;
  source_url?: string;
  source_name?: string;
  source_author?: string;
  model_relevance?: boolean;
  source_kind?: SourceKind;
  source_feed: string;
  source_feed_name: string;
  cluster_id?: string;
}

export interface TopicCluster {
  id: string;
  label: string;
  summary?: string;
  claim_ids: string[];
  top_entities: string[];
  source_count: number;
  last_updated: string;
}

export interface Watchlist {
  id: string;
  name: string;
  query: string;
  entities: string[];
  categories: Claim['category'][];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedSource {
  id: string;
  name: string;
  author: string;
  url: string;
  categories: string[];
  quality: "High" | "Medium";
}
