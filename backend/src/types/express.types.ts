import { Request } from 'express';
import { JWTPayload, SafeUser, UserRole } from './user.types';

/**
 * Extend Express Request to include rateLimit property from express-rate-limit
 */
declare module 'express-serve-static-core' {
  interface Request {
    rateLimit?: {
      limit: number;
      remaining: number;
      resetTime: Date;
      totalHits: number;
    };
  }
}

/**
 * Authenticated Request - Extends Express Request with user information
 */
export interface AuthRequest extends Request {
  user?: SafeUser;
  userId?: number;
  userRole?: UserRole;
  token?: string;
}

/**
 * Request with JWT Payload
 */
export interface RequestWithJWT extends Request {
  jwt?: JWTPayload;
}

/**
 * Request with Pagination
 */
export interface PaginatedRequest extends Request {
  pagination?: {
    page: number;
    limit: number;
    offset: number;
  };
}

/**
 * Request with File Upload
 */
export interface FileUploadRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

/**
 * Combined Auth and Paginated Request
 */
export interface AuthPaginatedRequest extends AuthRequest {
  pagination?: {
    page: number;
    limit: number;
    offset: number;
  };
}
