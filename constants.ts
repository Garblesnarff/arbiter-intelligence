
import { Claim, ModelEntry, TaskCategory } from "./types";
import { FEEDS } from "./constants/feeds";

export const CURRENT_DATE = "Dec 24, 2025";

export const FEED_SOURCES = FEEDS;

export const MOCK_CLAIMS: Claim[] = [
  {
    id: "c1",
    post_id: "p1",
    category: "MODELS",
    claim_text: "GPT-5.2-xhigh achieves 75% on ARC-AGI-2 at <$8/task.",
    entities: ["GPT-5.2", "ARC-AGI-2"],
    metric_value: "75%",
    confidence: "high",
    sentiment: "positive",
    date: "Dec 24, 2025",
    source_name: "The Innermost Loop",
    source_feed: "inner-loop",
    source_feed_name: "The Innermost Loop"
  }
];

export const MODELS: ModelEntry[] = [
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    input_cost_per_1m: 0.10,
    output_cost_per_1m: 0.40,
    latency_tier: "fast",
    strengths: ["coding", "vision", "tool_use", "speed", "cost"],
    benchmarks: {
      "ARC-AGI-1": "85%",
      "GPQA Diamond": "90.4%"
    },
    recommended_for: [
      TaskCategory.CODE_REVIEW,
      TaskCategory.DATA_EXTRACTION,
      TaskCategory.QA_FACTUAL,
      TaskCategory.VISION_ANALYSIS,
      TaskCategory.CODE_GENERATION
    ],
    chronicle_snippet: "500x cheaper than o3 at equivalent performance (Dec 18)."
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    input_cost_per_1m: 2.00,
    output_cost_per_1m: 12.00,
    latency_tier: "medium",
    strengths: ["reasoning", "coding", "agentic", "multimodal"],
    benchmarks: {
      "ARC-AGI-1": "90%",
      "HLE": "45.8%"
    },
    recommended_for: [
      TaskCategory.AGENTIC_MULTISTEP,
      TaskCategory.MATH_PROOF,
      TaskCategory.QA_REASONING,
      TaskCategory.CODE_GENERATION
    ],
    chronicle_snippet: "SOTA on agentic workflows, strong math reasoning."
  },
  {
    id: "gpt-5-2",
    name: "GPT-5.2",
    provider: "OpenAI",
    input_cost_per_1m: 5.00,
    output_cost_per_1m: 20.00,
    latency_tier: "medium",
    strengths: ["reasoning", "general", "coding"],
    benchmarks: {
      "ARC-AGI-1": "90%",
      "GDPval": "70%"
    },
    recommended_for: [
      TaskCategory.QA_REASONING,
      TaskCategory.TECHNICAL_WRITING,
      TaskCategory.AGENTIC_MULTISTEP
    ],
    chronicle_snippet: "Beats human experts on 70% of GDPval (Dec 12)."
  }
];
