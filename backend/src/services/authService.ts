import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

export interface RegisterData {
  userIdentifier: string;
  email: string;
  password: string;
  fullName: string;
  role?: Role;
  major?: string;
  yearLevel?: number;
  department?: string;
}

export interface LoginData {
  userIdentifier?: string;
  email?: string;
  password: string;
}

export interface TokenPayload {
  userId: number;
  userIdentifier: string;
  email: string;
  role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-this';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Register a new user
 */
export async function register(data: RegisterData) {
  // Check if user already exists
  const existingUser = await prisma.users.findFirst({
    where: {
      OR: [
        { email: data.email },
        { user_identifier: data.userIdentifier }
      ]
    }
  });

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new Error('Email already registered');
    }
    if (existingUser.user_identifier === data.userIdentifier) {
      throw new Error('User identifier already taken');
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user
  const user = await prisma.users.create({
    data: {
      user_identifier: data.userIdentifier,
      email: data.email,
      password_hash: passwordHash,
      full_name: data.fullName,
      role: data.role || Role.STUDENT,
      major: data.major,
      year_level: data.yearLevel,
      department: data.department,
      updated_at: new Date()
    },
    select: {
      id: true,
      user_identifier: true,
      email: true,
      full_name: true,
      role: true,
      major: true,
      year_level: true,
      department: true,
      created_at: true
    }
  });

  // Generate tokens
  const token = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Create audit log
  await prisma.audit_logs.create({
    data: {
      user_id: user.id,
      action: 'REGISTER',
      entity_type: 'user',
      entity_id: user.id,
      changes: {
        email: user.email,
        role: user.role
      }
    }
  });

  return {
    user: {
      id: user.id,
      userIdentifier: user.user_identifier,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      major: user.major,
      yearLevel: user.year_level,
      department: user.department,
      createdAt: user.created_at
    },
    token,
    refreshToken
  };
}

/**
 * Login user
 */
export async function login(data: LoginData, ipAddress?: string) {
  // Find user by email or userIdentifier
  if (!data.userIdentifier && !data.email) {
    throw new Error('Email or user identifier is required');
  }

  const user = await prisma.users.findFirst({
    where: {
      OR: [
        { email: data.email || '' },
        { user_identifier: data.userIdentifier || '' }
      ]
    }
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compareSync(data.password, user.password_hash);

  if (!isPasswordValid) {
    // Create failed login audit log
    await prisma.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'LOGIN_FAILED',
        entity_type: 'user',
        entity_id: user.id,
        ip_address: ipAddress
      }
    });

    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const token = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Create successful login audit log
  await prisma.audit_logs.create({
    data: {
      user_id: user.id,
      action: 'LOGIN',
      entity_type: 'user',
      entity_id: user.id,
      ip_address: ipAddress
    }
  });

  // Return user without password
  const { password_hash, ...userWithoutPassword } = user;

  return {
    user: {
      id: userWithoutPassword.id,
      userIdentifier: userWithoutPassword.user_identifier,
      email: userWithoutPassword.email,
      fullName: userWithoutPassword.full_name,
      role: userWithoutPassword.role,
      major: userWithoutPassword.major,
      yearLevel: userWithoutPassword.year_level,
      department: userWithoutPassword.department,
      createdAt: userWithoutPassword.created_at,
      updatedAt: userWithoutPassword.updated_at
    },
    token,
    refreshToken
  };
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: number) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      user_identifier: true,
      email: true,
      full_name: true,
      role: true,
      major: true,
      year_level: true,
      department: true,
      created_at: true,
      updated_at: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    userIdentifier: user.user_identifier,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    major: user.major,
    yearLevel: user.year_level,
    department: user.department,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * Generate access token
 */
function generateAccessToken(user: any): string {
  const payload: TokenPayload = {
    userId: user.id,
    userIdentifier: user.user_identifier || user.userIdentifier,
    email: user.email,
    role: user.role
  };

  // @ts-expect-error - expiresIn accepts string values like '24h', '7d', etc.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(user: any): string {
  const payload: TokenPayload = {
    userId: user.id,
    userIdentifier: user.user_identifier || user.userIdentifier,
    email: user.email,
    role: user.role
  };

  // @ts-expect-error - expiresIn accepts string values like '24h', '7d', etc.
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);

  const user = await prisma.users.findUnique({
    where: { id: payload.userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const newAccessToken = generateAccessToken(user);

  return {
    token: newAccessToken
  };
}

/**
 * Change user password
 */
export async function changePassword(userId: number, oldPassword: string, newPassword: string) {
  // Find user
  const user = await prisma.users.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify old password
  const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);

  if (!isPasswordValid) {
    // Create failed password change audit log
    await prisma.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'PASSWORD_CHANGE_FAILED',
        entity_type: 'user',
        entity_id: user.id
      }
    });

    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.users.update({
    where: { id: userId },
    data: { password_hash: newPasswordHash }
  });

  // Create successful password change audit log
  await prisma.audit_logs.create({
    data: {
      user_id: user.id,
      action: 'PASSWORD_CHANGED',
      entity_type: 'user',
      entity_id: user.id
    }
  });

  return {
    message: 'Password changed successfully'
  };
}
