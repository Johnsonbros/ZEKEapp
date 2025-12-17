import type { Express, Request, Response } from "express";
import type { IncomingHttpHeaders } from "http";

const ZEKE_BACKEND_URL = process.env.EXPO_PUBLIC_ZEKE_BACKEND_URL || "https://zekeai.replit.app";

const FORWARD_HEADERS = [
  "cookie",
  "authorization",
  "x-api-key",
  "x-user-id",
  "x-session-id",
  "x-request-id",
  "user-agent",
];

interface ProxyResult {
  success: boolean;
  status: number;
  data?: any;
  error?: string;
}

function extractForwardHeaders(reqHeaders: IncomingHttpHeaders): Record<string, string> {
  const headers: Record<string, string> = {};
  
  for (const key of FORWARD_HEADERS) {
    const value = reqHeaders[key];
    if (value) {
      headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }
  }
  
  return headers;
}

async function proxyToZeke(
  method: string,
  path: string,
  body?: any,
  clientHeaders?: Record<string, string>
): Promise<ProxyResult> {
  const url = new URL(path, ZEKE_BACKEND_URL);
  
  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...clientHeaders,
      },
    };
    
    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = JSON.stringify(body);
    }
    
    console.log(`[ZEKE Proxy] ${method} ${url.href}`);
    
    const response = await fetch(url.href, fetchOptions);
    const contentType = response.headers.get("content-type");
    
    let data;
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    console.log(`[ZEKE Proxy] Response: ${response.status}`);
    
    return {
      success: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error(`[ZEKE Proxy] Error:`, error);
    return {
      success: false,
      status: 503,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export function registerZekeProxyRoutes(app: Express): void {
  console.log(`[ZEKE Proxy] Registering routes, backend: ${ZEKE_BACKEND_URL}`);

  app.get("/api/zeke/health", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", "/api/health", undefined, headers);
    res.json({
      proxy: "connected",
      backend: ZEKE_BACKEND_URL,
      backendStatus: result.success ? "connected" : "unreachable",
      backendResponse: result.data,
    });
  });

  app.get("/api/zeke/tasks", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", "/api/tasks", undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch tasks", tasks: [] });
    }
    const tasks = result.data?.tasks || result.data || [];
    res.json({ tasks, source: "zeke-backend" });
  });

  app.post("/api/zeke/tasks", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("POST", "/api/tasks", req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to create task" });
    }
    res.status(201).json(result.data);
  });

  app.patch("/api/zeke/tasks/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("PATCH", `/api/tasks/${req.params.id}`, req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to update task" });
    }
    res.json(result.data);
  });

  app.delete("/api/zeke/tasks/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("DELETE", `/api/tasks/${req.params.id}`, undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to delete task" });
    }
    res.status(204).send();
  });

  app.get("/api/zeke/grocery", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", "/api/grocery", undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch grocery items", items: [] });
    }
    const items = result.data?.items || result.data || [];
    res.json({ items, source: "zeke-backend" });
  });

  app.post("/api/zeke/grocery", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("POST", "/api/grocery", req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to create grocery item" });
    }
    res.status(201).json(result.data);
  });

  app.patch("/api/zeke/grocery/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("PATCH", `/api/grocery/${req.params.id}`, req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to update grocery item" });
    }
    res.json(result.data);
  });

  app.delete("/api/zeke/grocery/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("DELETE", `/api/grocery/${req.params.id}`, undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to delete grocery item" });
    }
    res.status(204).send();
  });

  app.get("/api/zeke/lists", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", "/api/lists", undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch lists", lists: [] });
    }
    const lists = result.data?.lists || result.data || [];
    res.json({ lists, source: "zeke-backend" });
  });

  app.post("/api/zeke/lists", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("POST", "/api/lists", req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to create list" });
    }
    res.status(201).json(result.data);
  });

  app.get("/api/zeke/lists/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", `/api/lists/${req.params.id}`, undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch list" });
    }
    res.json(result.data);
  });

  app.patch("/api/zeke/lists/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("PATCH", `/api/lists/${req.params.id}`, req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to update list" });
    }
    res.json(result.data);
  });

  app.delete("/api/zeke/lists/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("DELETE", `/api/lists/${req.params.id}`, undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to delete list" });
    }
    res.status(204).send();
  });

  app.post("/api/zeke/lists/:id/items", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("POST", `/api/lists/${req.params.id}/items`, req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to add list item" });
    }
    res.status(201).json(result.data);
  });

  app.patch("/api/zeke/lists/:listId/items/:itemId", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("PATCH", `/api/lists/${req.params.listId}/items/${req.params.itemId}`, req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to update list item" });
    }
    res.json(result.data);
  });

  app.delete("/api/zeke/lists/:listId/items/:itemId", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("DELETE", `/api/lists/${req.params.listId}/items/${req.params.itemId}`, undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to delete list item" });
    }
    res.status(204).send();
  });

  app.get("/api/zeke/contacts", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", "/api/contacts", undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch contacts", contacts: [] });
    }
    const contacts = result.data?.contacts || result.data || [];
    res.json({ contacts, source: "zeke-backend" });
  });

  app.post("/api/zeke/contacts", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("POST", "/api/contacts", req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to create contact" });
    }
    res.status(201).json(result.data);
  });

  app.get("/api/zeke/contacts/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", `/api/contacts/${req.params.id}`, undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch contact" });
    }
    res.json(result.data);
  });

  app.patch("/api/zeke/contacts/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("PATCH", `/api/contacts/${req.params.id}`, req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to update contact" });
    }
    res.json(result.data);
  });

  app.delete("/api/zeke/contacts/:id", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("DELETE", `/api/contacts/${req.params.id}`, undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to delete contact" });
    }
    res.status(204).send();
  });

  app.get("/api/zeke/chat/conversations", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", "/api/chat/conversations", undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch conversations", conversations: [] });
    }
    res.json(result.data);
  });

  app.post("/api/zeke/chat", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("POST", "/api/chat", req.body, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to send message" });
    }
    res.json(result.data);
  });

  app.get("/api/zeke/dashboard", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", "/api/dashboard", undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch dashboard" });
    }
    res.json(result.data);
  });

  app.get("/api/zeke/memories", async (req: Request, res: Response) => {
    const headers = extractForwardHeaders(req.headers);
    const result = await proxyToZeke("GET", "/api/memories", undefined, headers);
    if (!result.success) {
      return res.status(result.status).json({ error: result.error || "Failed to fetch memories", memories: [] });
    }
    res.json(result.data);
  });

  console.log("[ZEKE Proxy] Routes registered successfully");
}
