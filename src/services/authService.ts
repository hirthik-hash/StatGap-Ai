import { User } from '../types';
import { apiClient, setAuthToken, getAuthToken, clearAuthToken } from './apiClient';

const CURRENT_USER_SESSION_KEY = 'stat_gap_current_session';

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export class AuthService {
  /**
   * Retrieves the currently active officer profile from local session cache.
   * If no JWT token is stored, returns null.
   */
  public static getCurrentUser(): User | null {
    const token = getAuthToken();
    if (!token) {
      return null;
    }
    try {
      const session =
        sessionStorage.getItem(CURRENT_USER_SESSION_KEY) ||
        localStorage.getItem(CURRENT_USER_SESSION_KEY);
      if (session) {
        return JSON.parse(session);
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Revalidates and synchronizes the active session against GET /api/auth/me.
   */
  public static async fetchCurrentUser(): Promise<User | null> {
    const token = getAuthToken();
    if (!token) {
      this.logout();
      return null;
    }
    try {
      const user = await apiClient.request<User>('/api/auth/me');
      // Update session cache with safe officer profile
      const remember = Boolean(localStorage.getItem(CURRENT_USER_SESSION_KEY));
      const serialized = JSON.stringify(user);
      if (remember) {
        localStorage.setItem(CURRENT_USER_SESSION_KEY, serialized);
      } else {
        sessionStorage.setItem(CURRENT_USER_SESSION_KEY, serialized);
      }
      return user;
    } catch {
      this.logout();
      return null;
    }
  }

  /**
   * Authenticates against FastAPI backend via POST /api/auth/login.
   * Stores the JWT token and persists safe officer profile in session.
   * STRICT: Never falls back to local plaintext authentication.
   */
  public static async login(
    iGotId: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; user?: User; message: string }> {
    const trimmedId = iGotId.trim();
    if (!trimmedId) {
      return { success: false, message: 'Please enter your official iGOT ID.' };
    }
    if (!password) {
      return { success: false, message: 'Please enter your password.' };
    }

    try {
      const res = await apiClient.request<TokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          iGotId: trimmedId,
          password,
          rememberMe,
        }),
      });

      // Save token to centralized API client
      setAuthToken(res.access_token);

      // Save safe user identity to session (never includes password)
      const sessionData = JSON.stringify(res.user);
      if (rememberMe) {
        localStorage.setItem(CURRENT_USER_SESSION_KEY, sessionData);
      } else {
        sessionStorage.setItem(CURRENT_USER_SESSION_KEY, sessionData);
      }

      return {
        success: true,
        user: res.user,
        message: `Welcome back, ${res.user.name}!`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Registers a new officer with the backend via POST /api/auth/register.
   * Rejects duplicate accounts cleanly via HTTP 409 from server.
   */
  public static async register(user: User): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.request<User>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(user),
      });

      return {
        success: true,
        message: 'Registration successful. Please login with your official credentials.',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Updates officer profile via PUT /api/officer/profile.
   */
  public static async updateUserProfile(
    updated: Partial<User>
  ): Promise<{ success: boolean; user: User }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No officer session currently active');
    }

    const updatedUser = await apiClient.request<User>('/api/officer/profile', {
      method: 'PUT',
      body: JSON.stringify(updated),
    });

    const sessionData = JSON.stringify(updatedUser);
    if (localStorage.getItem(CURRENT_USER_SESSION_KEY)) {
      localStorage.setItem(CURRENT_USER_SESSION_KEY, sessionData);
    } else {
      sessionStorage.setItem(CURRENT_USER_SESSION_KEY, sessionData);
    }

    return { success: true, user: updatedUser };
  }

  /**
   * Terminates active officer session and removes tokens.
   */
  public static logout(): void {
    clearAuthToken();
    try {
      sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
      localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  public static isLoggedIn(): boolean {
    return Boolean(getAuthToken() && this.getCurrentUser());
  }
}
