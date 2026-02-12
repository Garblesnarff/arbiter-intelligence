
import { Claim, ModelEntry, TaskCategory, FeedSource } from "./types";

export const CURRENT_DATE = "Dec 24, 2025";

export const FEED_SOURCES: FeedSource[] = [
  { name: "The Innermost Loop", author: "Chronicle", url: "https://theinnermostloop.substack.com/feed", categories: ["MODELS", "CAPITAL", "ROBOTICS"], quality: "High" },
  { name: "Epoch AI Brief", author: "Epoch AI", url: "https://epochai.substack.com/feed", categories: ["MODELS", "COMPUTE", "INFRASTRUCTURE"], quality: "High" },
  { name: "Import AI", author: "Jack Clark", url: "https://importai.substack.com/feed", categories: ["MODELS", "COMPUTE", "GOVERNANCE"], quality: "High" },
  { name: "SemiAnalysis", author: "Dylan Patel", url: "https://semianalysis.com/feed", categories: ["COMPUTE", "INFRASTRUCTURE", "ENERGY"], quality: "High" },
  { name: "Gradient Flow", author: "Ben Lorica", url: "https://gradientflow.substack.com/feed", categories: ["MODELS", "INFRASTRUCTURE", "ENERGY"], quality: "High" },
  { name: "Interconnects AI", author: "Nathan Lambert", url: "https://interconnects.ai/feed", categories: ["MODELS", "COMPUTE"], quality: "High" },
  { name: "Robots & Startups", author: "Andra Keay", url: "https://robotsandstartups.substack.com/feed", categories: ["ROBOTICS", "INFRASTRUCTURE"], quality: "Medium" },
  { name: "Six Degrees of Robotics", author: "Aaron Prather", url: "https://sixdegreesofrobotics.substack.com/feed", categories: ["ROBOTICS", "CAPITAL"], quality: "High" },
  { name: "Longevity Marketcap", author: "Nathan Cheng", url: "https://sub.longevitymarketcap.com/feed", categories: ["BIOLOGY", "CAPITAL"], quality: "High" },
  { name: "Where Tech Meets Bio", author: "BiopharmaTrend", url: "https://www.techlifesci.com/feed", categories: ["BIOLOGY", "INFRASTRUCTURE"], quality: "High" },
  { name: "Data Center Richness", author: "Rich Miller", url: "https://datacenterrichness.substack.com/feed", categories: ["INFRASTRUCTURE", "ENERGY"], quality: "High" },
  { name: "Newcomer", author: "Eric Newcomer", url: "https://www.newcomer.co/feed", categories: ["CAPITAL", "GOVERNANCE"], quality: "High" },
  { name: "Enterprise AI Governance", author: "Oliver Patel", url: "https://oliverpatel.substack.com/feed", categories: ["GOVERNANCE", "INFRASTRUCTURE"], quality: "Medium" },
  { name: "AI Safety Newsletter", author: "Center for AI Safety", url: "https://newsletter.safe.ai/feed", categories: ["GOVERNANCE", "CONSCIOUSNESS"], quality: "High" },
  { name: "Shtetl-Optimized", author: "Scott Aaronson", url: "https://scottaaronson.blog/feed", categories: ["CONSCIOUSNESS", "MODELS"], quality: "Medium" },
  { name: "NVIDIA Blog", author: "NVIDIA", url: "https://blogs.nvidia.com/feed", categories: ["COMPUTE", "INFRASTRUCTURE"], quality: "High" },
  { name: "AWS ML Blog", author: "AWS", url: "https://aws.amazon.com/blogs/machine-learning/feed", categories: ["MODELS", "COMPUTE"], quality: "High" },
  { name: "Fight Aging", author: "Fight Aging", url: "https://www.fightaging.org/feed", categories: ["BIOLOGY"], quality: "High" },
  { name: "Space.com", author: "Space.com", url: "https://www.space.com/feeds/all", categories: ["SPACE"], quality: "Medium" },
  { name: "Reimagine Energy", author: "Reimagine Energy", url: "https://www.reimagine-energy.ai/feed", categories: ["ENERGY", "INFRASTRUCTURE"], quality: "High" },
  { name: "AI Safety Frontier", author: "Johannes Gasteiger", url: "https://aisafetyfrontier.substack.com/feed", categories: ["GOVERNANCE", "MODELS"], quality: "High" }
];

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
    source_name: "The Innermost Loop"
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
