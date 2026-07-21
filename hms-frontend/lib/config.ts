/**
 * Single source of truth for all backend URL references in the frontend.
 *
 * Environment variables (set in .env.local):
 *   NEXT_PUBLIC_API_URL  — full base URL of the backend, e.g. "http://localhost:4000"
 *
 * Keeping one constant here avoids the three different strings that were
 * previously scattered across layout.tsx, useGlobalSettings.ts, and lib/socket.ts:
 *   - "http://127.0.0.1:4000"      (layout.tsx)
 *   - "http://localhost:4000"       (socket.ts)
 *   - NEXT_PUBLIC_BACKEND_URL       (layout.tsx + useGlobalSettings.ts)
 *   - NEXT_PUBLIC_API_URL           (socket.ts)
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';
