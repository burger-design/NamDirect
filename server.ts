import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client lazily to prevent load-time errors and allow environment variables to be fully resolved
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || "";
    console.log(`[Diagnostics] Initializing Gemini Client. Key presence:`, {
      has_GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      gemini_key_len: process.env.GEMINI_API_KEY?.length || 0,
      has_GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      has_API_KEY: !process.env.API_KEY,
    });
    
    // If no key is set, we throw a clear informative error to prevent silent ADC scope errors
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please add it in your Secrets / Env settings.");
    }

    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// API endpoints
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const ai = getGeminiClient();
    
    const systemInstruction = `You are the NamDirect AI Support Assistant, an exceptionally professional, welcoming, and helpful guide for NamDirect – Namibia's premier digital marketplace connecting local producers, SMEs, and farmers directly with end-consumers.

Your target audience consists of:
1. SMEs & Vendors (seeking registration, listing items, managing orders)
2. Farmers (seeking onboarding, GPS logistics support, transport info)
3. End consumers (seeking orders, tracking deliveries, browsing marketplace)

Your guidelines:
- Always greet visitors with a warm, professional, respectful Namibian greeting (e.g., "Hello and welcome to NamDirect! How can I assist you with your SME, farm, or customer needs today? / Tate, Meme, hello!").
- Guide them step-by-step through our sign-up workflows:
  - For Customers: they can register using their email, shop fresh produce, and track deliveries with GPS.
  - For Farmers/SMEs: they can register an account, set up their farm/store name, upload products, track WhatsApp inquiries, and manage delivery status.
- Support them with polite, motivating, professional tone. Keep instructions extremely crystal clear, human, direct, and user-friendly.
- Decline any query that is not related to NamDirect, our logistics, Namibia, local farming, or vendor tools. Always pivot back politely to NamDirect support.`;

    const chatHistory = history?.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })) || [];

    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
      },
      history: chatHistory,
    });

    const response = await chat.sendMessage({ message });
    return res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini assistant error:", error);
    return res.status(500).json({ error: error.message || "An error occurred with parent AI components." });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
