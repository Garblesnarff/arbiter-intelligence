
import { GoogleGenAI, Type } from "@google/genai";
import { TaskAnalysis, TaskCategory } from "../types";

const getApiKey = () =>
  import.meta.env.VITE_GEMINI_API_KEY
  || (typeof process !== 'undefined' ? process.env.API_KEY || process.env.GEMINI_API_KEY : undefined);

const createFallbackAnalysis = (reasoning: string): TaskAnalysis => ({
  category: TaskCategory.GENERAL,
  reasoning,
  complexity: "medium",
});

export const analyzeTask = async (prompt: string): Promise<TaskAnalysis> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return createFallbackAnalysis("Gemini API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });

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

    let result: { category?: string; reasoning?: string; complexity?: string } = {};
    try {
      result = JSON.parse(response.text || "{}");
    } catch (error) {
      console.warn("Gemini analysis returned invalid JSON:", error);
      return createFallbackAnalysis("Classification analysis returned an unreadable response.");
    }
    
    const category = Object.values(TaskCategory).includes(result.category as TaskCategory) 
        ? (result.category as TaskCategory) 
        : TaskCategory.GENERAL;
    const complexity = result.complexity === "low" || result.complexity === "medium" || result.complexity === "high"
      ? result.complexity
      : "medium";
    const reasoning = typeof result.reasoning === "string" && result.reasoning.trim()
      ? result.reasoning
      : "No reasoning returned by the model.";

    return {
        category,
        reasoning,
        complexity
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return createFallbackAnalysis("Classification analysis failed or was unavailable.");
  }
};
