export enum TaskCategory {
  CODE_GENERATION = "code_generation",
  CODE_REVIEW = "code_review",
  CODE_DEBUGGING = "code_debugging",
  CREATIVE_WRITING = "creative_writing",
  TECHNICAL_WRITING = "technical_writing",
  DATA_EXTRACTION = "data_extraction",
  SUMMARIZATION = "summarization",
  QA_REASONING = "qa_reasoning",
  QA_FACTUAL = "qa_factual",
  MATH_PROOF = "math_proof",
  VISION_ANALYSIS = "vision_analysis",
  AGENTIC_MULTISTEP = "agentic_multistep",
  GENERAL = "general"
}

export interface ChroniclePost {
  id: string;
  title: string;
  published_at: string;
  body_snippet: string;
}

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
  model_relevance?: boolean; // Critical for Model Matrix updates
}

export interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  input_cost_per_1m: number;
  output_cost_per_1m: number;
  latency_tier: "fast" | "medium" | "slow";
  strengths: string[];
  benchmarks: Record<string, string | number>; // e.g., { "ARC-AGI": "85%" }
  recommended_for: TaskCategory[];
  chronicle_snippet?: string; // The "intelligence" overlay
  last_updated?: string; // Date of the last chronicle signal update
}

export interface TaskAnalysis {
  category: TaskCategory;
  reasoning: string;
  complexity: "low" | "medium" | "high";
}