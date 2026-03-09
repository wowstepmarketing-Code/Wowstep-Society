import { GoogleGenAI, Type } from "@google/genai";

/**
 * Initialize Gemini with the current environment key.
 * Creating a fresh instance inside each call ensures the most up-to-date 
 * API key from process.env.API_KEY is used (crucial for Veo/Imagen).
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Helper to identify permission-related errors from the Gemini API.
 */
const isPermissionError = (error: any): boolean => {
  // Check for various structures where 403 or PERMISSION_DENIED might hide
  const code = error?.code || error?.error?.code || error?.status;
  const message = (error?.message || error?.error?.message || "").toLowerCase();
  const status = error?.status || error?.error?.status;

  return (
    code === 403 || 
    status === "PERMISSION_DENIED" || 
    message.includes("permission") || 
    message.includes("not have permission")
  );
};

export const getStrategyAdvice = async (brandName: string, phase: string, userMessage: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are Society AI, the executive strategic advisor for WowSociety. 
              The brand is "${brandName}" in the "${phase}" phase.
              Provide sophisticated, concise advice under 150 words.
              User request: ${userMessage}`
    });
    return response.text || "Strategic pathways currently obscured.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Intelligence offline.";
  }
};

export const generateStrategicRoadmap = async (brandName: string, niche: string, phase: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a high-fidelity growth roadmap for "${brandName}" in the "${niche}" niche. 
                 They are currently in the "${phase}" phase. 
                 Return 4-6 high-impact strategic milestones for THIS PHASE ONLY. 
                 Each milestone must have a clear title, descriptive objective, and a weight (1-10).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              weight: { type: Type.NUMBER },
              phase: { type: Type.STRING }
            },
            required: ["title", "description", "weight", "phase"]
          }
        }
      }
    });
    return JSON.parse(response.text?.trim() || "[]");
  } catch (error) {
    console.error("Roadmap Generation Error:", error);
    return [];
  }
};

export const suggestNextObjective = async (brandName: string, phase: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest the next strategic objective for "${brandName}" currently in "${phase}" phase. 
                 Return a JSON object with title, description, and a weight (1-10).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            weight: { type: Type.NUMBER }
          },
          required: ["title", "description", "weight"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return null;
  }
};

export const getLocalMarketIntelligence = async (brandName: string, location: string, niche: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: `Identify key competitors and luxury market trends for the brand "${brandName}" in "${niche}" located in "${location}".`,
      config: {
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
      },
    });
    return { 
      text: response.text || "Geography data unavailable.", 
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
    };
  } catch (error) {
    return { text: "Location intelligence offline.", sources: [] };
  }
};

export const getMarketTrends = async (niche: string, brandName: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for the latest 3 luxury market trends for a brand named "${brandName}" in "${niche}".`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return { 
      text: response.text || "Scanning global markets...", 
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
    };
  } catch (error) {
    return { text: "Market intelligence stream interrupted.", sources: [] };
  }
};

export const getGrowthForecast = async (brandName: string, metrics: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Perform a deep strategic analysis for "${brandName}" with these metrics: ${metrics}. Provide a 12-month ROI projection.`,
      config: { thinkingConfig: { thinkingBudget: 16000 } }
    });
    return response.text || "Forecasting engines stabilizing...";
  } catch (error) {
    return "Intelligence recalibrating.";
  }
};

export const getAnalyticsInsight = async (brandName: string, metricsSummary: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `As Society Intelligence, provide an executive insight for "${brandName}" based on: ${metricsSummary}. Under 50 words.`
    });
    return response.text || "Strategic insight unavailable.";
  } catch (error) {
    return "Intelligence offline.";
  }
};

export const getGlobalEcosystemBriefing = async (totalArr: string, clientCount: number, tiers: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Society Master Intelligence briefing for Agency CEO. Context: ARR ${totalArr}, ${clientCount} clients, Tiers: ${tiers}. Tone: Sovereign.`
    });
    return response.text || "Global metrics stabilizing.";
  } catch (error) {
    return "Intelligence recalibrating.";
  }
};

export const generateLeadOutreach = async (brandName: string, leadName: string, company: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a sophisticated outreach from "${brandName}" CEO to "${leadName}" at "${company}". Under 60 words.`
    });
    return response.text || "Outreach strategy pending.";
  } catch (error) {
    return "Outreach offline.";
  }
};

export const generateCopywriting = async (brandName: string, target: string, context: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Elite executive copywriting for "${brandName}". Target: ${target}. Context: ${context}. Tone: Rolex-level luxury.`
    });
    return response.text || "Creative stream restricted.";
  } catch (error) {
    return "Neural copy engine offline.";
  }
};

/**
 * High-fidelity brand asset generation using Pro models.
 */
export const generateBrandAsset = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: `A high-end, luxury brand asset: ${prompt}. Cinematic lighting, premium aesthetic, minimal, high-fashion.` }] },
      config: { 
        imageConfig: { 
          aspectRatio,
          imageSize: "1K" 
        } 
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error: any) {
    if (isPermissionError(error)) {
      throw error;
    }
    console.error("Asset Gen Error:", error);
    return null;
  }
};

/**
 * Cinematic video generation using Veo.
 */
export const generateBrandVideo = async (prompt: string) => {
  const ai = getAI();
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic brand trailer: ${prompt}. Elegant movement, luxury aesthetic.`,
      config: { 
        numberOfVideos: 1, 
        resolution: '720p', 
        aspectRatio: '16:9' 
      }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      const fetchResponse = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': process.env.API_KEY || '',
        },
      });
      if (!fetchResponse.ok) {
        if (fetchResponse.status === 403) {
          throw new Error("403 Permission Denied during asset retrieval.");
        }
        throw new Error(`Failed to fetch video: ${fetchResponse.statusText}`);
      }
      const blob = await fetchResponse.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error: any) {
    if (isPermissionError(error)) {
      throw error;
    }
    console.error("Video Generation Error:", error);
    return null;
  }
};