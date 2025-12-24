import { Claim, ModelEntry, TaskCategory } from "./types";

export const CURRENT_DATE = "Dec 24, 2025";

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
    date: "Dec 24, 2025"
  },
  {
    id: "c2",
    post_id: "p1",
    category: "MODELS",
    claim_text: "Epoch: AI improvement rates have doubled post-April 2024.",
    entities: ["Epoch", "AI Progress"],
    confidence: "medium",
    sentiment: "positive",
    date: "Dec 24, 2025"
  },
  {
    id: "c3",
    post_id: "p2",
    category: "CAPITAL",
    claim_text: "Tesla and Amazon investing in Bolivia Data Centers.",
    entities: ["Tesla", "Amazon", "Bolivia"],
    confidence: "high",
    sentiment: "neutral",
    date: "Dec 22, 2025"
  },
  {
    id: "c4",
    post_id: "p3",
    category: "MODELS",
    claim_text: "Gemini 3 Flash achieves 81.2% on MMMU Pro.",
    entities: ["Gemini 3 Flash", "MMMU Pro"],
    metric_value: "81.2%",
    confidence: "high",
    sentiment: "positive",
    date: "Dec 18, 2025"
  },
  {
    id: "c5",
    post_id: "p3",
    category: "MODELS",
    claim_text: "Gemini 3 Flash beats GPT-5.2 on cost by 6x for equivalent coding tasks.",
    entities: ["Gemini 3 Flash", "GPT-5.2"],
    metric_value: "6x",
    confidence: "high",
    sentiment: "positive",
    date: "Dec 18, 2025"
  },
  {
    id: "c6",
    post_id: "p4",
    category: "ROBOTICS",
    claim_text: "Boston Dynamics Atlas scheduled for CES 2026 consumer demo.",
    entities: ["Boston Dynamics", "Atlas"],
    confidence: "medium",
    sentiment: "neutral",
    date: "Dec 21, 2025"
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
  },
  {
    id: "gpt-5-2-thinking",
    name: "GPT-5.2 Thinking",
    provider: "OpenAI",
    input_cost_per_1m: 10.00,
    output_cost_per_1m: 40.00,
    latency_tier: "slow",
    strengths: ["deep_reasoning", "math", "complex_problems"],
    benchmarks: {
      "METR Autonomy": "3.5 hrs"
    },
    recommended_for: [
      TaskCategory.MATH_PROOF,
      TaskCategory.AGENTIC_MULTISTEP
    ],
    chronicle_snippet: "Highest autonomy score recorded (Dec 13)."
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    input_cost_per_1m: 3.00,
    output_cost_per_1m: 15.00,
    latency_tier: "medium",
    strengths: ["coding", "instruction_following"],
    benchmarks: {
        "SWE-bench": "Verified"
    },
    recommended_for: [
      TaskCategory.CODE_GENERATION,
      TaskCategory.CODE_DEBUGGING,
      TaskCategory.GENERAL
    ],
    chronicle_snippet: "Best instruction following for coding (Nov 20)."
  },
    {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    input_cost_per_1m: 15.00,
    output_cost_per_1m: 75.00,
    latency_tier: "slow",
    strengths: ["creative_writing", "nuance", "long_form"],
    benchmarks: {
        "ARC-AGI-2": "37.64%"
    },
    recommended_for: [
      TaskCategory.CREATIVE_WRITING,
      TaskCategory.TECHNICAL_WRITING
    ],
    chronicle_snippet: "80.9% on SWE-Bench Verified (Nov 25)."
  }
];