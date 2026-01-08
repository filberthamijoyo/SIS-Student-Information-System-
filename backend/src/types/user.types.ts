/**
 * User Role Types
 */
export type UserRole = 'student' | 'administrator' | 'instructor';

/**
 * User Interface - Represents a user in the system
 */
export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  student_id?: string;
  major?: string;
  year?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * User without sensitive information (for API responses)
 */
export interface SafeUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  student_id?: string;
  major?: string;
  year?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Registration Request Interface
 */
export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  student_id?: string;
  major?: string;
  year?: number;
}

/**
 * Login Request Interface
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Auth Response Interface
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: SafeUser;
    token: string;
    refreshToken?: string;
  };
}

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Password Change Request
 */
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * User Update Request
 */
export interface UserUpdateRequest {
  first_name?: string;
  last_name?: string;
  major?: string;
  year?: number;
}
