import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { AuthRequest } from '../types/express.types';

/**
 * Authentication Controller (Prisma-based)
 * Handles HTTP requests for authentication endpoints
 */

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const result = await authService.login(req.body, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId || (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const user = await authService.getUserProfile(userId);

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'User not found'
    });
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Token refresh failed'
    });
  }
}

/**
 * Logout (client-side token invalidation)
 * POST /api/auth/logout
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
}

/**
 * Change user password
 * POST /api/auth/change-password
 */
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId || (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Old password and new password are required'
      });
      return;
    }

    const result = await authService.changePassword(userId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Password change failed'
    });
  }
}
