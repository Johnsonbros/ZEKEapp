import { getApiUrl, getLocalApiUrl, getAuthHeaders } from './query-client';

/**
 * Custom API error with detailed context
 */
export class ApiError extends Error {
  status?: number;
  url: string;
  method: string;
  bodyText?: string;
  details?: unknown;

  constructor(message: string, init: { status?: number; url: string; method: string; bodyText?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = init.status;
    this.url = init.url;
    this.method = init.method;
    this.bodyText = init.bodyText;
    this.details = init.details;
  }
}

/**
 * Request configuration options
 */
export type RequestOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  emptyArrayOn404?: boolean;
};

/**
 * Determines if an endpoint should use local API URL instead of main API URL
 * Local endpoints are integrations and core app features available only on the local backend:
 * - Google Calendar (/api/calendar/*)
 * - Twilio SMS & Calls (/api/twilio/*)
 * - SMS Log (/api/sms-log)
 * - Conversations & Messages (/api/conversations/*)
 * - ZEKE Core Chat & Tasks (/api/zeke/*)
 */
function isLocalEndpoint(endpoint: string): boolean {
  const localPrefixes = [
    '/api/calendar/',
    '/api/twilio/',
    '/api/sms-log',
    '/api/conversations',
    '/api/zeke/',
  ];
  return localPrefixes.some(prefix => endpoint.startsWith(prefix));
}

/**
 * Parse response body based on content-type
 */
async function parseResponseBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return await response.json();
  }

  // Non-JSON response with ok status
  const text = await response.text();
  if (text) {
    // Return text as-is for non-JSON types
    return text as unknown as T;
  }

  // Empty response body - return undefined
  return undefined as unknown as T;
}

/**
 * Centralized API client with singleton pattern
 * Handles:
 * - Timeout management (10s default via AbortController)
 * - Retry logic with exponential backoff (3 attempts: 1s, 2s, 4s)
 * - Automatic auth header injection
 * - Automatic routing (local vs core API)
 * - Query parameter handling
 * - Proper error reporting via ApiError
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
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const { timeoutMs = this.DEFAULT_TIMEOUT_MS, signal, headers: customHeaders = {}, query, emptyArrayOn404 } = options;

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

    // Add Content-Type for requests with body
    if (body && !finalHeaders['Content-Type']) {
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

    let lastError: ApiError | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method,
          headers: finalHeaders,
          signal: finalSignal,
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        });

        // Clear timeout on success
        if (timeoutId) clearTimeout(timeoutId);

        // Handle 404 with emptyArrayOn404 fallback
        if (response.status === 404 && emptyArrayOn404) {
          if (__DEV__) {
            console.log(`[ZekeApiClient] ${method} ${endpoint} - 404, returning empty array`);
          }
          return [] as unknown as T;
        }

        // Handle non-ok responses
        if (!response.ok) {
          const bodyText = await response.text();
          const errorMsg = `${response.status} ${response.statusText}`;

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

          // Create ApiError for non-retryable failures
          lastError = new ApiError(errorMsg, {
            status: response.status,
            url: url.toString(),
            method,
            bodyText,
          });

          throw lastError;
        }

        // Parse response
        const data = await parseResponseBody<T>(response);

        if (__DEV__) {
          console.log(`[ZekeApiClient] ${method} ${endpoint} (${attempt + 1}/${maxAttempts}) - OK`);
        }

        return data;
      } catch (error) {
        // If already an ApiError, keep it
        if (error instanceof ApiError) {
          lastError = error;
          throw lastError;
        }

        // Convert other errors to ApiError
        const message = error instanceof Error ? error.message : String(error);
        lastError = new ApiError(message, {
          url: url.toString(),
          method,
          bodyText: error instanceof Error ? error.message : undefined,
        });

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
        throw lastError;
      }
    }

    // Clear timeout on final error
    if (timeoutId) clearTimeout(timeoutId);

    if (__DEV__) {
      console.log(`[ZekeApiClient] ${method} ${endpoint} - FAILED after ${maxAttempts} attempts`);
    }

    throw lastError || new ApiError(`Failed to ${method} ${endpoint}`, {
      url: url.toString(),
      method,
    });
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  /**
   * DELETE request (returns void)
   */
  async delete(endpoint: string, options?: RequestOptions): Promise<void> {
    await this.request<void>('DELETE', endpoint, undefined, options);
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
