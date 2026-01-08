import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.types';
import { verifyAccessToken } from '../services/authService';
import { prisma } from '../config/prisma';

// Export AuthRequest type for use in controllers
export { AuthRequest };

/**
 * Authentication Middleware (Prisma-based)
 */

/**
 * Authenticate JWT token
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user to ensure they still exist
    let user;
    try {
      user = await prisma.users.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          user_identifier: true,
          email: true,
          full_name: true,
          role: true,
          major: true,
          year_level: true,
          department: true
        }
      });
    } catch (dbError: any) {
      // Log database errors but don't expose them to the client
      console.error('Database error in auth middleware:', dbError.message);
      
      // If it's a connection/prepared statement error, return 503 (Service Unavailable)
      // instead of 401, so the frontend doesn't redirect to login
      if (dbError.code === '42P05' || dbError.message?.includes('prepared statement')) {
        res.status(503).json({
          success: false,
          message: 'Database connection issue. Please try again in a moment.',
          retry: true
        });
        return;
      }
      
      // For other database errors, return 500
      res.status(500).json({
        success: false,
        message: 'Internal server error. Please try again later.'
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Attach user to request
    (req as any).user = user;
    (req as any).userId = user.id;
    (req as any).userRole = user.role;
    (req as any).token = token;

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid token'
    });
    return;
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;

    if (!userRole) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}

/**
 * Pre-defined role middlewares
 */
export const requireStudent = requireRole('STUDENT');
export const requireInstructor = requireRole('INSTRUCTOR');
export const requireAdmin = requireRole('ADMINISTRATOR');
export const requireInstructorOrAdmin = requireRole('INSTRUCTOR', 'ADMINISTRATOR');

/**
 * Optional authentication
 */
export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId }
    });

    if (user) {
      (req as any).user = user;
      (req as any).userId = user.id;
      (req as any).userRole = user.role;
    }

    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
}
