import axios from "axios";

// Use project-specific keys to avoid conflicts with other projects
const PROJECT_PREFIX = "airec_chat_";
const ACCESS_TOKEN_KEY = PROJECT_PREFIX + "access_token";
const REFRESH_TOKEN_KEY = PROJECT_PREFIX + "refresh_token";
const DEVICE_ID_KEY = PROJECT_PREFIX + "device_id";
const USER_IS_GUEST_KEY = PROJECT_PREFIX + "user_is_guest";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

// Create an unauthenticated axios instance for guest token generation
const unauthenticatedApi = axios.create({
  baseURL,
});

/**
 * Decode JWT token without verification (safe for reading payload only)
 */
const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const getAccessToken = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  // Basic JWT validation - should have 3 parts separated by dots
  if (token && token.split('.').length !== 3) {
    console.warn("Invalid token format detected, clearing tokens");
    clearTokens();
    return null;
  }
  return token;
};

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const setTokens = (access: string, refresh?: string, isGuest?: boolean) => {
  console.log("[setTokens] Setting tokens, access token length:", access?.length);
  if (!access || typeof access !== 'string') {
    console.error("[setTokens] Invalid access token provided:", access);
    return;
  }
  // Basic JWT validation - should have 3 parts separated by dots
  if (access.split('.').length !== 3) {
    console.error("[setTokens] Access token does not appear to be a valid JWT, parts:", access.split('.').length);
    return;
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  console.log("[setTokens] Access token stored in localStorage with key:", ACCESS_TOKEN_KEY);
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    console.log("[setTokens] Refresh token stored in localStorage with key:", REFRESH_TOKEN_KEY);
  }
  
  // Store guest status if provided
  if (isGuest !== undefined) {
    localStorage.setItem(USER_IS_GUEST_KEY, String(isGuest));
    console.log("[setTokens] User isGuest status stored:", isGuest);
  }
  
  // Verify token was stored
  const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  console.log("[setTokens] Verification - stored token exists:", !!storedToken);
  if (storedToken) {
    const decoded = decodeToken(storedToken);
    console.log("[setTokens] Stored token decoded:", decoded ? { type: decoded.type, sub: decoded.sub } : "failed to decode");
  }
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_IS_GUEST_KEY);
};

export const isAuthenticated = () => Boolean(getAccessToken());

/**
 * Check if the current user is a guest user
 */
export const isGuestUser = (): boolean => {
  // First check stored guest status
  const storedIsGuest = localStorage.getItem(USER_IS_GUEST_KEY);
  if (storedIsGuest !== null) {
    return storedIsGuest === "true";
  }
  
  // Fallback: check token
  const token = getAccessToken();
  if (!token) return true; // No token means guest
  
  const decoded = decodeToken(token);
  if (!decoded) return true; // Can't decode, assume guest
  
  // Check if token type is "guest" or sub is "guest"
  return decoded.type === "guest" || decoded.sub === "guest";
};

/**
 * Check if the current user is a real (non-guest) user
 */
export const isRealUser = (): boolean => {
  if (!isAuthenticated()) return false;
  return !isGuestUser();
};

export const handleUnauthorized = () => {
  clearTokens();
  if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
    window.location.href = "/login";
  }
};

/**
 * Ensures user has a valid token. If not authenticated, generates a guest token.
 * Returns a promise that resolves when token is available.
 * For guest users (without login), always ensures a guest token exists.
 */
export const ensureToken = async (): Promise<void> => {
  console.log("[ensureToken] Starting token check...");
  const existingToken = getAccessToken();
  console.log("[ensureToken] Existing token:", existingToken ? "EXISTS" : "NOT FOUND");
  
  // If no token exists, generate guest token
  if (!existingToken) {
    try {
      const deviceId = getDeviceId();
      console.log("[ensureToken] No token found, generating guest token with deviceId:", deviceId);
      const res = await unauthenticatedApi.post("/auth/guest-token", { deviceId });
      console.log("[ensureToken] Guest token API response:", res.data);
      const responseData = res.data.data || res.data;
      console.log("[ensureToken] Response data:", responseData);
      
      if (responseData.accessToken) {
        setTokens(responseData.accessToken, responseData.refreshToken);
        console.log("[ensureToken] Guest token generated and stored successfully");
        console.log("[ensureToken] Token stored:", responseData.accessToken.substring(0, 20) + "...");
      } else {
        console.error("[ensureToken] No accessToken in response:", responseData);
        throw new Error("No access token in guest token response");
      }
    } catch (error) {
      console.error("[ensureToken] Failed to generate guest token:", error);
      throw error;
    }
    return;
  }

  // Token exists - check if it's a guest token
  console.log("[ensureToken] Token exists, decoding to check type...");
  const decoded = decodeToken(existingToken);
  console.log("[ensureToken] Decoded token:", decoded);
  
  if (decoded && (decoded.type === "guest" || decoded.sub === "guest")) {
    console.log("[ensureToken] Guest token found, using existing token");
    return;
  }

  // Have a real user token, use it
  console.log("[ensureToken] Real user token found, using existing token");
  return;
};