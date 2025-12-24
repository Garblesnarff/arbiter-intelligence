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
  category: "MODELS" | "CAPITAL" | "BIOLOGY" | "ROBOTICS" | "ENERGY" | "SPACE";
  claim_text: string;
  entities: string[];
  metric_value?: string;
  confidence: "high" | "medium" | "low";
  sentiment: "positive" | "negative" | "neutral";
  date: string;
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
}

export interface TaskAnalysis {
  category: TaskCategory;
  reasoning: string;
  complexity: "low" | "medium" | "high";
}