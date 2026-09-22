/**
 * STAT-GAP AI — Frontend API Client
 * Centralized HTTP communication layer for FastAPI backend endpoints.
 * Automatically injects JWT Bearer tokens and standardizes error handling.
 */

const AUTH_TOKEN_KEY = 'stat_gap_auth_token';

export interface HealthResponse {
  status: string;
  service: string;
}

export interface ApiClientConfig {
  baseUrl: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // Configurable via VITE_API_BASE_URL; falls back to local FastAPI development port 8000
    this.baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';
    try {
      this.token = localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      this.token = null;
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Centralized token management.
   * Stores the JWT in localStorage for prototype session persistence.
   */
  public setAuthToken(token: string | null): void {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch {
      // ignore storage failures in restricted contexts
    }
  }

  public getAuthToken(): string | null {
    if (!this.token) {
      try {
        this.token = localStorage.getItem(AUTH_TOKEN_KEY);
      } catch {
        this.token = null;
      }
    }
    return this.token;
  }

  public clearAuthToken(): void {
    this.setAuthToken(null);
  }

  /**
   * Reusable fetch abstraction with JSON parsing, Bearer token injection,
   * and standardized error handling.
   */
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Automatically attach Bearer token if available
    const token = this.getAuthToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError: unknown) {
      const msg = networkError instanceof Error ? networkError.message : 'Network connection failure';
      throw new Error(`Cannot connect to STAT-GAP AI Backend at ${this.baseUrl}: ${msg}. Please ensure the backend is running.`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      let parsedMessage = errorBody;
      try {
        const parsedJson = JSON.parse(errorBody);
        parsedMessage = parsedJson.detail || parsedJson.message || errorBody;
      } catch {
        // use raw text
      }
      throw new Error(parsedMessage);
    }

    return response.json() as Promise<T>;
  }

  public async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Health check endpoint: GET /api/health
   */
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  /**
   * Non-throwing liveness probe to verify backend availability.
   * Returns true if backend responds with status: ok, false otherwise.
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const res = await this.getHealth();
      return res && res.status === 'ok';
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();

export const setAuthToken = (token: string | null): void => apiClient.setAuthToken(token);
export const getAuthToken = (): string | null => apiClient.getAuthToken();
export const clearAuthToken = (): void => apiClient.clearAuthToken();
export const isBackendAvailable = (): Promise<boolean> => apiClient.isAvailable();
