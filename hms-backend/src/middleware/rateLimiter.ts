import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for the login endpoint.
 * Max 10 requests per minute per IP address.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again after 1 minute.' },
});
