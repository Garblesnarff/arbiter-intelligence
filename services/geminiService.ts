
import { GoogleGenAI, Type } from "@google/genai";
import { TaskAnalysis, TaskCategory } from "../types";

export const analyzeTask = async (prompt: string): Promise<TaskAnalysis> => {
  // Always initialize GoogleGenAI using the API key from process.env.API_KEY directly
  // Create a new instance right before the call to ensure the latest key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    // Access text directly from response.text property
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
    // Return a default object instead of simulation logic to maintain standard behavior
    return {
      category: TaskCategory.GENERAL,
      reasoning: "Classification analysis failed or was unavailable.",
      complexity: "medium"
    };
  }
};
