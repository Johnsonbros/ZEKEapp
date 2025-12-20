import { getApiUrl, getLocalApiUrl, getAuthHeaders } from './query-client';

/**
 * Request configuration options
 */
export type RequestOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
};

/**
 * Determines if an endpoint should use local API URL instead of main API URL
 * Local endpoints are integrations available only on the local backend:
 * - Google Calendar (/api/calendar/*)
 * - Twilio SMS & Calls (/api/twilio/*)
 * - SMS Log (/api/sms-log)
 */
function isLocalEndpoint(endpoint: string): boolean {
  const localPrefixes = [
    '/api/calendar/',
    '/api/twilio/',
    '/api/sms-log',
  ];
  return localPrefixes.some(prefix => endpoint.startsWith(prefix));
}

/**
 * Centralized API client with singleton pattern
 * Handles:
 * - Timeout management (10s default via AbortController)
 * - Retry logic with exponential backoff (3 attempts: 1s, 2s, 4s)
 * - Automatic auth header injection
 * - Automatic routing (local vs core API)
 * - Query parameter handling
 */
class ZekeApiClient {
  private static instance: ZekeApiClient;
  private readonly DEFAULT_TIMEOUT_MS = 10000;

  private constructor() {}

  /**
   * Get or create singleton instance
   */
  static getInstance(): ZekeApiClient {
    if (!ZekeApiClient.instance) {
      ZekeApiClient.instance = new ZekeApiClient();
    }
    return ZekeApiClient.instance;
  }

  /**
   * Internal request method with retry, timeout, and auth handling
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { timeoutMs = this.DEFAULT_TIMEOUT_MS, signal, headers: customHeaders = {}, query } = options;

    // Determine base URL based on endpoint type
    const baseUrl = isLocalEndpoint(endpoint) ? getLocalApiUrl() : getApiUrl();

    // Build URL with query parameters
    const url = new URL(endpoint, baseUrl);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Prepare headers: auth + custom headers
    const authHeaders = getAuthHeaders();
    const finalHeaders: Record<string, string> = {
      ...authHeaders,
      ...customHeaders,
    };

    // Add Content-Type for non-GET requests with body
    if (method !== 'GET' && !('body' in options) && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    // Create abort controller for timeout if signal not provided
    let controller = signal ? undefined : new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    if (!signal && controller) {
      timeoutId = setTimeout(() => {
        if (__DEV__) {
          console.log(`[ZekeApiClient] Timeout (${timeoutMs}ms) for ${method} ${endpoint}`);
        }
        controller!.abort();
      }, timeoutMs);
    }

    const finalSignal = signal || controller?.signal;

    // Retry logic with exponential backoff
    const maxAttempts = 3;
    const retryDelays = [1000, 2000, 4000]; // ms

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method,
          headers: finalHeaders,
          signal: finalSignal,
          credentials: 'include',
        });

        // Clear timeout on success
        if (timeoutId) clearTimeout(timeoutId);

        // Handle non-ok responses
        if (!response.ok) {
          const text = await response.text();
          const errorMsg = `${response.status}: ${text || response.statusText}`;
          
          // Only retry on specific status codes
          const retryableStatuses = [408, 429, 500, 502, 503, 504];
          if (retryableStatuses.includes(response.status) && attempt < maxAttempts - 1) {
            if (__DEV__) {
              console.log(
                `[ZekeApiClient] Retrying ${method} ${endpoint} (attempt ${attempt + 1}/${maxAttempts}) - got status ${response.status}`,
              );
            }
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
            continue;
          }

          throw new Error(errorMsg);
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        let data: T;
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = (await response.text()) as unknown as T;
        }

        if (__DEV__) {
          console.log(`[ZekeApiClient] ${method} ${endpoint} (${attempt + 1}/${maxAttempts}) - OK`);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if this is a network error or retryable status
        const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
        const shouldRetry = isNetworkError && attempt < maxAttempts - 1;

        if (shouldRetry) {
          if (__DEV__) {
            console.log(
              `[ZekeApiClient] Network error, retrying ${method} ${endpoint} (attempt ${attempt + 1}/${maxAttempts})`,
            );
          }
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
          continue;
        }

        // Don't retry further
        break;
      }
    }

    // Clear timeout on final error
    if (timeoutId) clearTimeout(timeoutId);

    if (__DEV__) {
      console.log(`[ZekeApiClient] ${method} ${endpoint} - FAILED after ${maxAttempts} attempts`);
    }

    throw lastError || new Error(`Failed to ${method} ${endpoint}`);
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, options);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const finalOptions: RequestOptions = { ...options };
    const headers: Record<string, string> = { ...options?.headers };

    // Add Content-Type for JSON body
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(
      new URL(
        endpoint,
        isLocalEndpoint(endpoint) ? getLocalApiUrl() : getApiUrl(),
      ).toString(),
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal,
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text || response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return (await response.text()) as unknown as T;
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const headers: Record<string, string> = { ...options?.headers };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(
      new URL(
        endpoint,
        isLocalEndpoint(endpoint) ? getLocalApiUrl() : getApiUrl(),
      ).toString(),
      {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal,
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text || response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return (await response.text()) as unknown as T;
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(
      new URL(
        endpoint,
        isLocalEndpoint(endpoint) ? getLocalApiUrl() : getApiUrl(),
      ).toString(),
      {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
          ...options?.headers,
        },
        signal: options?.signal,
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text || response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return (await response.text()) as unknown as T;
  }
}

/**
 * Export singleton instance for convenient access
 */
export const apiClient = ZekeApiClient.getInstance();

/**
 * Re-export for direct class access if needed
 */
export default ZekeApiClient;
