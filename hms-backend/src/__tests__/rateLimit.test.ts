import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for the login rate limiter middleware.
 *
 * Verifies that the rate limiter:
 *   - Allows requests under the limit (≤10)
 *   - Blocks the 11th request with 429 status
 *   - Returns the correct error message
 *   - Sets standard rate-limit headers
 */

// We test the rate limiter by importing it and using express-rate-limit's
// configuration. Since express-rate-limit is middleware, we simulate
// requests via a lightweight Express app.

import express from 'express';
import http from 'http';
import { loginRateLimiter } from '../middleware/rateLimiter';

function createTestApp() {
  const app = express();
  app.post('/api/auth/login', loginRateLimiter, (_req, res) => {
    res.json({ message: 'Login successful' });
  });
  return app;
}

async function makeRequest(server: http.Server): Promise<{ status: number; body: any; headers: any }> {
  const address = server.address() as { port: number };
  const res = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'pass' }),
  });
  const body = await res.json();
  return {
    status: res.status,
    body,
    headers: Object.fromEntries(res.headers.entries()),
  };
}

describe('loginRateLimiter', () => {
  let server: http.Server;

  beforeEach(() => {
    return new Promise<void>((resolve) => {
      const app = createTestApp();
      server = app.listen(0, () => resolve());
    });
  });

  afterEach(() => {
    return new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should allow the first 10 requests', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await makeRequest(server);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
    }
  });

  it('should block the 11th request with 429', async () => {
    // Exhaust the 10-request limit
    for (let i = 0; i < 10; i++) {
      await makeRequest(server);
    }

    // The 11th request should be rate-limited
    const res = await makeRequest(server);
    expect(res.status).toBe(429);
    expect(res.body.message).toContain('Too many login attempts');
  });

  it('should include rate-limit headers', async () => {
    const res = await makeRequest(server);
    // express-rate-limit sets RateLimit-Limit header when standardHeaders is true
    expect(
      res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']
    ).toBeDefined();
  });
});
