import { GoogleGenAI, Type } from "@google/genai";
import { TaskAnalysis, TaskCategory } from "../types";

// This simulates the backend analysis logic
// In a real app, the API key would be hidden in an Edge Function
const apiKey = process.env.API_KEY || ""; 
const ai = new GoogleGenAI({ apiKey });

export const analyzeTask = async (prompt: string): Promise<TaskAnalysis> => {
  if (!apiKey) {
    // Fallback simulation if no API key is present for the demo
    console.warn("No API Key present. Using simulation mode for Task Analysis.");
    return simulateAnalysis(prompt);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following user prompt and classify it into one of these categories: 
      [${Object.values(TaskCategory).join(", ")}].
      Also provide a short reasoning and complexity estimate.
      
      User Prompt: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            complexity: { type: Type.STRING, enum: ["low", "medium", "high"] },
          },
          required: ["category", "reasoning", "complexity"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    // Validate that the category is a valid TaskCategory, fallback if not
    const category = Object.values(TaskCategory).includes(result.category as TaskCategory) 
        ? (result.category as TaskCategory) 
        : TaskCategory.GENERAL;

    return {
        category,
        reasoning: result.reasoning,
        complexity: result.complexity
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return simulateAnalysis(prompt);
  }
};

// Robust simulation for demo purposes
const simulateAnalysis = (prompt: string): TaskAnalysis => {
  const p = prompt.toLowerCase();
  
  if (p.includes("code") || p.includes("function") || p.includes("react") || p.includes("bug")) {
    return {
      category: p.includes("review") || p.includes("check") ? TaskCategory.CODE_REVIEW : TaskCategory.CODE_GENERATION,
      reasoning: "Prompt contains coding keywords or syntax patterns.",
      complexity: "medium"
    };
  }
  
  if (p.includes("write") || p.includes("story") || p.includes("creative") || p.includes("poem")) {
    return {
      category: TaskCategory.CREATIVE_WRITING,
      reasoning: "Request involves generative creative content.",
      complexity: "high"
    };
  }

  if (p.includes("extract") || p.includes("json") || p.includes("data") || p.includes("list")) {
    return {
      category: TaskCategory.DATA_EXTRACTION,
      reasoning: "User is asking for structured data extraction.",
      complexity: "low"
    };
  }

  if (p.includes("solve") || p.includes("math") || p.includes("calc")) {
    return {
      category: TaskCategory.MATH_PROOF,
      reasoning: "Quantitative or logic puzzle detected.",
      complexity: "high"
    };
  }

  return {
    category: TaskCategory.GENERAL,
    reasoning: "No specific specialized domain detected.",
    complexity: "medium"
  };
};
