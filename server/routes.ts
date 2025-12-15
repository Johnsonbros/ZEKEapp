import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { insertDeviceSchema, insertMemorySchema, insertChatSessionSchema, insertChatMessageSchema } from "@shared/schema";
import OpenAI from "openai";
import multer from "multer";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const ZEKE_SYSTEM_PROMPT = `You are ZEKE, an intelligent AI companion designed to help users recall and search their memories captured by wearable devices like Omi and Limitless.

Your role is to:
- Help users find specific conversations or moments from their recorded memories
- Summarize and synthesize information across multiple memories
- Answer questions about past events, meetings, or conversations
- Provide insights and patterns from the user's memory history
- Be conversational, friendly, and helpful

You have access to the user's memory transcripts and can help them navigate their personal knowledge base. Always be respectful of the personal nature of this data and maintain user privacy.

When referring to memories, be specific about dates, participants, and context when available. If you don't have enough information, ask clarifying questions.`;

export async function registerRoutes(app: Express): Promise<Server> {
  // Device routes
  app.get("/api/devices", async (_req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      console.error("Error fetching device:", error);
      res.status(500).json({ error: "Failed to fetch device" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const parsed = insertDeviceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid device data", details: parsed.error.errors });
      }
      const device = await storage.createDevice(parsed.data);
      res.status(201).json(device);
    } catch (error) {
      console.error("Error creating device:", error);
      res.status(500).json({ error: "Failed to create device" });
    }
  });

  app.patch("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.updateDevice(req.params.id, req.body);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      console.error("Error updating device:", error);
      res.status(500).json({ error: "Failed to update device" });
    }
  });

  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDevice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting device:", error);
      res.status(500).json({ error: "Failed to delete device" });
    }
  });

  // Memory routes
  app.get("/api/memories", async (req, res) => {
    try {
      const filters: { deviceId?: string; isStarred?: boolean; search?: string; limit?: number } = {};
      
      if (req.query.deviceId) {
        filters.deviceId = req.query.deviceId as string;
      }
      if (req.query.isStarred !== undefined) {
        filters.isStarred = req.query.isStarred === "true";
      }
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string, 10);
      }
      
      const memories = await storage.getMemories(filters);
      res.json(memories);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  app.get("/api/memories/:id", async (req, res) => {
    try {
      const memory = await storage.getMemory(req.params.id);
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      res.json(memory);
    } catch (error) {
      console.error("Error fetching memory:", error);
      res.status(500).json({ error: "Failed to fetch memory" });
    }
  });

  app.post("/api/memories", async (req, res) => {
    try {
      const { deviceId, transcript, duration, speakers } = req.body;
      
      if (!deviceId || !transcript || duration === undefined) {
        return res.status(400).json({ 
          error: "Missing required fields", 
          details: "deviceId, transcript, and duration are required" 
        });
      }

      const analysisPrompt = `Analyze the following conversation transcript and provide:
1. A short, descriptive title (max 10 words)
2. A summary (2-3 sentences)
3. A list of action items extracted from the conversation (if any)

Transcript:
${transcript}

Respond in JSON format:
{
  "title": "...",
  "summary": "...",
  "actionItems": ["action 1", "action 2", ...]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an AI assistant that analyzes conversation transcripts. Always respond with valid JSON." },
          { role: "user", content: analysisPrompt }
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content || '{}';
      let analysis: { title?: string; summary?: string; actionItems?: string[] };
      
      try {
        analysis = JSON.parse(responseContent);
      } catch {
        analysis = {
          title: "Untitled Memory",
          summary: transcript.substring(0, 200),
          actionItems: []
        };
      }

      const memoryData = {
        deviceId,
        transcript,
        duration,
        speakers: speakers || null,
        title: analysis.title || "Untitled Memory",
        summary: analysis.summary || null,
        actionItems: analysis.actionItems || []
      };

      const parsed = insertMemorySchema.safeParse(memoryData);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid memory data", details: parsed.error.errors });
      }
      
      const memory = await storage.createMemory(parsed.data);
      res.status(201).json(memory);
    } catch (error) {
      console.error("Error creating memory:", error);
      res.status(500).json({ error: "Failed to create memory" });
    }
  });

  app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const uint8Array = new Uint8Array(req.file.buffer);
      const file = new File([uint8Array], req.file.originalname, { type: req.file.mimetype });
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "verbose_json"
      });

      res.json({
        text: transcription.text,
        duration: transcription.duration || 0,
        segments: transcription.segments || []
      });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/transcribe-and-create-memory", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const deviceId = req.body.deviceId;
      if (!deviceId) {
        return res.status(400).json({ error: "deviceId is required" });
      }

      const uint8Array2 = new Uint8Array(req.file.buffer);
      const file = new File([uint8Array2], req.file.originalname, { type: req.file.mimetype });
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "verbose_json"
      });

      const transcript = transcription.text;
      const duration = transcription.duration || 0;

      const analysisPrompt = `Analyze the following conversation transcript and provide:
1. A short, descriptive title (max 10 words)
2. A summary (2-3 sentences)
3. A list of action items extracted from the conversation (if any)

Transcript:
${transcript}

Respond in JSON format:
{
  "title": "...",
  "summary": "...",
  "actionItems": ["action 1", "action 2", ...]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an AI assistant that analyzes conversation transcripts. Always respond with valid JSON." },
          { role: "user", content: analysisPrompt }
        ],
        max_completion_tokens: 500,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content || '{}';
      let analysis: { title?: string; summary?: string; actionItems?: string[] };
      
      try {
        analysis = JSON.parse(responseContent);
      } catch {
        analysis = {
          title: "Untitled Memory",
          summary: transcript.substring(0, 200),
          actionItems: []
        };
      }

      const memoryData = {
        deviceId,
        transcript,
        duration,
        speakers: req.body.speakers || null,
        title: analysis.title || "Untitled Memory",
        summary: analysis.summary || null,
        actionItems: analysis.actionItems || []
      };

      const parsed = insertMemorySchema.safeParse(memoryData);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid memory data", details: parsed.error.errors });
      }
      
      const memory = await storage.createMemory(parsed.data);
      res.status(201).json(memory);
    } catch (error) {
      console.error("Error transcribing and creating memory:", error);
      res.status(500).json({ error: "Failed to transcribe and create memory" });
    }
  });

  app.patch("/api/memories/:id", async (req, res) => {
    try {
      const allowedFields = ["title", "summary", "isStarred"];
      const updates: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      const memory = await storage.updateMemory(req.params.id, updates);
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      res.json(memory);
    } catch (error) {
      console.error("Error updating memory:", error);
      res.status(500).json({ error: "Failed to update memory" });
    }
  });

  app.delete("/api/memories/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMemory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Memory not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting memory:", error);
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  app.post("/api/memories/:id/star", async (req, res) => {
    try {
      const memory = await storage.starMemory(req.params.id);
      if (!memory) {
        return res.status(404).json({ error: "Memory not found" });
      }
      res.json(memory);
    } catch (error) {
      console.error("Error starring memory:", error);
      res.status(500).json({ error: "Failed to star memory" });
    }
  });

  app.post("/api/memories/search", async (req, res) => {
    try {
      const { query, limit = 10 } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      const memories = await storage.getMemories({ limit: 50 });
      
      if (memories.length === 0) {
        return res.json({ results: [], query });
      }

      const memoriesContext = memories.map((m, idx) => ({
        index: idx,
        id: m.id,
        title: m.title,
        summary: m.summary || '',
        transcript: m.transcript.substring(0, 500),
        createdAt: m.createdAt,
        actionItems: m.actionItems
      }));

      const searchPrompt = `You are a semantic search engine for a personal memory system. The user has recorded conversations and meetings that are stored as "memories".

Given the user's search query, analyze the memories below and return the most relevant ones ranked by relevance.

User's search query: "${query}"

Available memories:
${memoriesContext.map(m => `
[Memory ${m.index}] ID: ${m.id}
Title: ${m.title}
Summary: ${m.summary}
Transcript excerpt: ${m.transcript}
Date: ${m.createdAt}
Action items: ${JSON.stringify(m.actionItems || [])}
`).join('\n---\n')}

Instructions:
- Understand the semantic meaning of the query (not just keyword matching)
- Consider context, synonyms, and related concepts
- Queries like "meetings about budgets" should match memories discussing finances, costs, spending, etc.
- Queries like "action items from last week" should prioritize memories with action items
- Return memory IDs ranked by relevance with a relevance score (0-100)

Respond with valid JSON in this format:
{
  "results": [
    { "id": "memory-id-here", "relevanceScore": 95, "reason": "Brief reason why this is relevant" },
    ...
  ]
}

Return at most ${Math.min(limit, 10)} results. Only include memories with relevance score >= 30.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a semantic search assistant. Always respond with valid JSON." },
          { role: "user", content: searchPrompt }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content || '{"results":[]}';
      let searchResults: { results: Array<{ id: string; relevanceScore: number; reason?: string }> };
      
      try {
        searchResults = JSON.parse(responseContent);
      } catch {
        searchResults = { results: [] };
      }

      const memoryMap = new Map(memories.map(m => [m.id, m]));
      const maxResults = Math.min(limit, 10);
      const rankedResults = searchResults.results
        .filter(r => memoryMap.has(r.id) && r.relevanceScore >= 30)
        .slice(0, maxResults)
        .map(r => ({
          ...memoryMap.get(r.id),
          relevanceScore: r.relevanceScore,
          matchReason: r.reason
        }));

      res.json({
        results: rankedResults,
        query,
        totalMatches: rankedResults.length
      });
    } catch (error) {
      console.error("Error in semantic search:", error);
      res.status(500).json({ error: "Failed to perform semantic search" });
    }
  });

  // Chat routes
  app.get("/api/chat/sessions", async (_req, res) => {
    try {
      const sessions = await storage.getChatSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const parsed = insertChatSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid session data", details: parsed.error.errors });
      }
      const session = await storage.createChatSession(parsed.data);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/sessions/:id/messages", async (req, res) => {
    try {
      const session = await storage.getChatSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const messages = await storage.getMessagesBySession(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/sessions/:id/messages", async (req, res) => {
    try {
      const session = await storage.getChatSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const parsed = insertChatMessageSchema.safeParse({
        sessionId: req.params.id,
        role: "user",
        content: req.body.content
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid message data", details: parsed.error.errors });
      }

      const userMessage = await storage.createMessage(parsed.data);

      const previousMessages = await storage.getMessagesBySession(req.params.id);
      
      const recentMemories = await storage.getMemories({ limit: 10 });
      const memoryContext = recentMemories.length > 0 
        ? `\n\nRecent memories from the user's wearable devices:\n${recentMemories.map(m => 
            `- ${m.title} (${m.createdAt}): ${m.summary || m.transcript.substring(0, 200)}...`
          ).join('\n')}`
        : '';

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: ZEKE_SYSTEM_PROMPT + memoryContext },
        ...previousMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        })),
        { role: "user", content: req.body.content }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_completion_tokens: 1000
      });

      const assistantContent = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

      const assistantMessage = await storage.createMessage({
        sessionId: req.params.id,
        role: "assistant",
        content: assistantContent
      });

      res.status(201).json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.delete("/api/chat/sessions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteChatSession(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
