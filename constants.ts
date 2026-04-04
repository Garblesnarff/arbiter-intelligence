
import { Claim } from "./types";
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
