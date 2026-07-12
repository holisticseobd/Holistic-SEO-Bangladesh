import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON bodies
app.use(express.json({ limit: "10mb" }));

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add your Gemini API key in the Settings > Secrets panel of AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Smart clustering API endpoint
app.post("/api/smart-cluster", async (req, res) => {
  try {
    const { topics, existingClusters } = req.body;

    if (!topics || !Array.isArray(topics)) {
      res.status(400).json({ error: "Invalid topics list provided." });
      return;
    }

    // Filter to find the unclustered topics.
    // Unclustered topics are defined as having cluster name "Unclustered", "Uncategorized", empty string, "none", or similar generic fallbacks.
    const unclusteredTopics = topics.filter((t: any) => {
      const clusterLower = (t.cluster || "").toLowerCase().trim();
      return (
        !clusterLower ||
        clusterLower === "unclustered" ||
        clusterLower === "uncategorized" ||
        clusterLower === "none" ||
        clusterLower === "general" ||
        clusterLower === "target hub" ||
        clusterLower === "seo focus"
      );
    });

    if (unclusteredTopics.length === 0) {
      res.json({
        success: true,
        message: "No unclustered topics found to group.",
        updatedTopics: [],
      });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `
You are an elite SEO strategist and NLP taxonomy modeler.
You are tasked with grouping the following unclustered SEO topics into logically consistent, high-level semantic clusters.

Existing valid clusters in this dataset are: ${JSON.stringify(existingClusters || [])}.

GUIDELINES:
1. If an unclustered topic fits exceptionally well into one of the existing clusters, assign it there.
2. If a topic does not fit existing clusters, propose a new, highly professional cluster name (e.g., "Performance Engineering", "Local Search Dominance", "AI Search Optimization", "Content Velocity"). Keep names concise (2-4 words).
3. Generate a fresh, professional SEO summary description for each topic explaining its role inside its newly assigned cluster.

Unclustered Topics to group:
${JSON.stringify(
  unclusteredTopics.map((t: any) => ({
    id: t.id,
    label: t.label,
    description: t.description,
  }))
)}

Provide the output as a valid JSON array containing objects with keys: "id", "cluster", and "description".
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "The ID of the topic." },
              cluster: { type: Type.STRING, description: "The assigned or proposed semantic cluster name." },
              description: { type: Type.STRING, description: "Refined professional description explaining the topic's SEO function in the new cluster." }
            },
            required: ["id", "cluster", "description"]
          }
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Received empty response from Gemini.");
    }

    const updatedTopics = JSON.parse(textOutput.trim());
    res.json({
      success: true,
      updatedTopics,
    });
  } catch (error: any) {
    console.error("Smart Cluster Error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred during semantic clustering.",
    });
  }
});

// Set up Vite or static serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupServer();
