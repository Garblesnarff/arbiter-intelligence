
import { FeedSource } from "../types";

export interface FeedConfig extends FeedSource {}

export const FEEDS: FeedConfig[] = [
  { id: "inner-loop", name: "The Innermost Loop", author: "Chronicle", url: "https://theinnermostloop.substack.com/feed", categories: ["MODELS", "CAPITAL", "ROBOTICS"], quality: "High" },
  { id: "epoch-ai", name: "Epoch AI Brief", author: "Epoch AI", url: "https://epochai.substack.com/feed", categories: ["MODELS", "COMPUTE", "INFRASTRUCTURE"], quality: "High" },
  { id: "import-ai", name: "Import AI", author: "Jack Clark", url: "https://importai.substack.com/feed", categories: ["MODELS", "COMPUTE", "GOVERNANCE"], quality: "High" },
  { id: "semianalysis", name: "SemiAnalysis", author: "Dylan Patel", url: "https://semianalysis.com/feed", categories: ["COMPUTE", "INFRASTRUCTURE", "ENERGY"], quality: "High" },
  { id: "gradient-flow", name: "Gradient Flow", author: "Ben Lorica", url: "https://gradientflow.substack.com/feed", categories: ["MODELS", "INFRASTRUCTURE", "ENERGY"], quality: "High" },
  { id: "interconnects", name: "Interconnects AI", author: "Nathan Lambert", url: "https://interconnects.ai/feed", categories: ["MODELS", "COMPUTE"], quality: "High" },
  { id: "robots-startups", name: "Robots & Startups", author: "Andra Keay", url: "https://robotsandstartups.substack.com/feed", categories: ["ROBOTICS", "INFRASTRUCTURE"], quality: "Medium" },
  { id: "robotics-six", name: "Six Degrees of Robotics", author: "Aaron Prather", url: "https://sixdegreesofrobotics.substack.com/feed", categories: ["ROBOTICS", "CAPITAL"], quality: "High" },
  { id: "longevity-mkt", name: "Longevity Marketcap", author: "Nathan Cheng", url: "https://sub.longevitymarketcap.com/feed", categories: ["BIOLOGY", "CAPITAL"], quality: "High" },
  { id: "tech-meets-bio", name: "Where Tech Meets Bio", author: "BiopharmaTrend", url: "https://www.techlifesci.com/feed", categories: ["BIOLOGY", "INFRASTRUCTURE"], quality: "High" },
  { id: "dc-richness", name: "Data Center Richness", author: "Rich Miller", url: "https://datacenterrichness.substack.com/feed", categories: ["INFRASTRUCTURE", "ENERGY"], quality: "High" },
  { id: "newcomer", name: "Newcomer", author: "Eric Newcomer", url: "https://www.newcomer.co/feed", categories: ["CAPITAL", "GOVERNANCE"], quality: "High" },
  { id: "enterprise-gov", name: "Enterprise AI Governance", author: "Oliver Patel", url: "https://oliverpatel.substack.com/feed", categories: ["GOVERNANCE", "INFRASTRUCTURE"], quality: "Medium" },
  { id: "ai-safety-nl", name: "AI Safety Newsletter", author: "Center for AI Safety", url: "https://newsletter.safe.ai/feed", categories: ["GOVERNANCE", "CONSCIOUSNESS"], quality: "High" },
  { id: "shtetl", name: "Shtetl-Optimized", author: "Scott Aaronson", url: "https://scottaaronson.blog/feed", categories: ["CONSCIOUSNESS", "MODELS"], quality: "Medium" },
  { id: "nvidia-blog", name: "NVIDIA Blog", author: "NVIDIA", url: "https://blogs.nvidia.com/feed", categories: ["COMPUTE", "INFRASTRUCTURE"], quality: "High" },
  { id: "aws-ml", name: "AWS ML Blog", author: "AWS", url: "https://aws.amazon.com/blogs/machine-learning/feed", categories: ["MODELS", "COMPUTE"], quality: "High" },
  { id: "fight-aging", name: "Fight Aging", author: "Fight Aging", url: "https://www.fightaging.org/feed", categories: ["BIOLOGY"], quality: "High" },
  { id: "space-com", name: "Space.com", author: "Space.com", url: "https://www.space.com/feeds/all", categories: ["SPACE"], quality: "Medium" },
  { id: "reimagine-energy", name: "Reimagine Energy", author: "Reimagine Energy", url: "https://www.reimagine-energy.ai/feed", categories: ["ENERGY", "INFRASTRUCTURE"], quality: "High" },
  { id: "ai-safety-frontier", name: "AI Safety Frontier", author: "Johannes Gasteiger", url: "https://aisafetyfrontier.substack.com/feed", categories: ["GOVERNANCE", "MODELS"], quality: "High" }
];
