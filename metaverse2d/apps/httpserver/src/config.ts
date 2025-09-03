export const JWT_ACCESS_SECRET = "saojhfof2803hfassl";
export const JWT_REFRESH_SECRET = "f3420hfjsnasnljfndd";
export const ACCESS_TTL = "15m"; // short-lived access token
export const REFRESH_TTL = "7d"; // long-lived refresh token (in HttpOnly cookie)
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 min rolling window
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min lock