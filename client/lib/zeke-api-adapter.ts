import { getApiUrl, isZekeSyncMode, apiRequest } from "./query-client";

export interface ZekeConversation {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ZekeMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ZekeMemory {
  id: string;
  title: string;
  summary?: string;
  transcript: string;
  speakers?: any;
  actionItems?: string[];
  duration: number;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  deviceId?: string;
}

export interface ZekeDevice {
  id: string;
  name: string;
  type: string;
  macAddress?: string;
  batteryLevel?: number;
  isConnected: boolean;
  lastSyncAt?: string;
  createdAt: string;
}

export async function getConversations(): Promise<ZekeConversation[]> {
  const baseUrl = getApiUrl();
  const url = new URL('/api/conversations', baseUrl);
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch conversations: ${res.statusText}`);
  }
  return res.json();
}

export async function createConversation(title?: string): Promise<ZekeConversation> {
  const baseUrl = getApiUrl();
  const url = new URL('/api/conversations', baseUrl);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || 'Chat with ZEKE' }),
    credentials: 'include',
  });
  
  if (!res.ok) {
    throw new Error(`Failed to create conversation: ${res.statusText}`);
  }
  return res.json();
}

export async function getConversationMessages(conversationId: string): Promise<ZekeMessage[]> {
  const baseUrl = getApiUrl();
  const url = new URL(`/api/conversations/${conversationId}/messages`, baseUrl);
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch messages: ${res.statusText}`);
  }
  return res.json();
}

export async function sendMessage(conversationId: string, content: string): Promise<{ userMessage: ZekeMessage; assistantMessage: ZekeMessage }> {
  const baseUrl = getApiUrl();
  const url = new URL(`/api/conversations/${conversationId}/messages`, baseUrl);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    credentials: 'include',
  });
  
  if (!res.ok) {
    throw new Error(`Failed to send message: ${res.statusText}`);
  }
  return res.json();
}

export async function chatWithZeke(message: string, phone?: string): Promise<{ response: string; conversationId?: string }> {
  const baseUrl = getApiUrl();
  const url = new URL('/api/chat', baseUrl);
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message,
      phone: phone || 'mobile-app'
    }),
    credentials: 'include',
  });
  
  if (!res.ok) {
    throw new Error(`Failed to chat: ${res.statusText}`);
  }
  return res.json();
}

export async function getRecentMemories(limit: number = 10): Promise<ZekeMemory[]> {
  const baseUrl = getApiUrl();
  
  if (isZekeSyncMode()) {
    const url = new URL('/api/omi/memories', baseUrl);
    url.searchParams.set('limit', limit.toString());
    
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch memories: ${res.statusText}`);
    }
    const data = await res.json();
    return data.memories || data || [];
  } else {
    const url = new URL(`/api/memories?limit=${limit}`, baseUrl);
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      return [];
    }
    return res.json();
  }
}

export async function searchMemories(query: string): Promise<ZekeMemory[]> {
  const baseUrl = getApiUrl();
  
  if (isZekeSyncMode()) {
    const url = new URL('/api/semantic-search', baseUrl);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 20 }),
      credentials: 'include',
    });
    
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.results || [];
  } else {
    const url = new URL('/api/memories/search', baseUrl);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      credentials: 'include',
    });
    
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.results || [];
  }
}

export async function getTasks(): Promise<any[]> {
  const baseUrl = getApiUrl();
  const url = new URL('/api/tasks', baseUrl);
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function getGroceryItems(): Promise<any[]> {
  const baseUrl = getApiUrl();
  const url = new URL('/api/grocery', baseUrl);
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function getReminders(): Promise<any[]> {
  const baseUrl = getApiUrl();
  const url = new URL('/api/reminders', baseUrl);
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function getContacts(): Promise<any[]> {
  const baseUrl = getApiUrl();
  const url = new URL('/api/contacts', baseUrl);
  
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function getHealthStatus(): Promise<{ status: string; connected: boolean }> {
  try {
    const baseUrl = getApiUrl();
    const url = new URL('/healthz', baseUrl);
    
    const res = await fetch(url, { 
      credentials: 'include',
      signal: AbortSignal.timeout(5000)
    });
    
    return { 
      status: res.ok ? 'healthy' : 'unhealthy', 
      connected: res.ok 
    };
  } catch {
    return { status: 'unreachable', connected: false };
  }
}

export async function getZekeDevices(): Promise<ZekeDevice[]> {
  try {
    const baseUrl = getApiUrl();
    
    if (isZekeSyncMode()) {
      const url = new URL('/api/omi/devices', baseUrl);
      
      const res = await fetch(url, { 
        credentials: 'include',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!res.ok) {
        return getDefaultZekeDevices();
      }
      
      const data = await res.json();
      return data.devices || data || getDefaultZekeDevices();
    }
    
    return getDefaultZekeDevices();
  } catch {
    return getDefaultZekeDevices();
  }
}

function getDefaultZekeDevices(): ZekeDevice[] {
  return [
    {
      id: 'zeke-omi',
      name: 'ZEKE Omi',
      type: 'omi',
      isConnected: true,
      createdAt: new Date().toISOString(),
    }
  ];
}
