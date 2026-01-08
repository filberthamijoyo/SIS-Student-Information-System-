import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API Rate Limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Strict Rate Limiter for Authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Rate Limiter for Enrollment endpoints
 * Limits: 30 requests per 5 minutes per IP
 * Prevents enrollment spam during high-demand periods
 */
export const enrollmentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: {
    success: false,
    message: 'Too many enrollment requests, please slow down.',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many enrollment requests. Please wait before trying again.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Rate Limiter for Course Search endpoints
 * Limits: 50 requests per minute per IP
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: {
    success: false,
    message: 'Too many search requests, please slow down.',
  },
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Search rate limit exceeded. Please wait a moment.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Rate Limiter for Admin operations
 * Limits: 200 requests per 15 minutes per IP
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Admin rate limit exceeded. Please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Rate Limiter for Password Reset endpoints
 * Limits: 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again in an hour.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Create custom rate limiter with specific options
 */
export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
