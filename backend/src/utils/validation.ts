import Joi from 'joi';
import { RegisterRequest, LoginRequest, PasswordChangeRequest } from '../types/user.types';
import { EnrollmentRequest } from '../types/enrollment.types';
import { CourseCreateRequest, CourseUpdateRequest } from '../types/course.types';

/**
 * Validation schema for user registration
 */
export const registerSchema = Joi.object<RegisterRequest>({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required',
    }),

  first_name: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name is required',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required',
    }),

  last_name: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required',
    }),

  role: Joi.string()
    .valid('student', 'administrator', 'instructor')
    .required()
    .messages({
      'any.only': 'Role must be either student, administrator, or instructor',
      'any.required': 'Role is required',
    }),

  student_id: Joi.string()
    .max(20)
    .optional()
    .allow(null, ''),

  major: Joi.string()
    .max(100)
    .optional()
    .allow(null, ''),

  year: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .allow(null),
});

/**
 * Validation schema for user login
 */
export const loginSchema = Joi.object<LoginRequest>({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});

/**
 * Validation schema for password change
 */
export const passwordChangeSchema = Joi.object<PasswordChangeRequest>({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),

  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required',
    }),
});

/**
 * Validation schema for course creation
 */
export const courseCreateSchema = Joi.object<CourseCreateRequest>({
  course_code: Joi.string()
    .max(20)
    .required()
    .messages({
      'string.max': 'Course code must not exceed 20 characters',
      'any.required': 'Course code is required',
    }),

  course_name: Joi.string()
    .max(200)
    .required()
    .messages({
      'string.max': 'Course name must not exceed 200 characters',
      'any.required': 'Course name is required',
    }),

  description: Joi.string()
    .required()
    .messages({
      'any.required': 'Course description is required',
    }),

  credits: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.min': 'Credits must be at least 1',
      'number.max': 'Credits must not exceed 10',
      'any.required': 'Credits is required',
    }),

  instructor_id: Joi.number()
    .integer()
    .required()
    .messages({
      'any.required': 'Instructor ID is required',
    }),

  department: Joi.string()
    .max(100)
    .required()
    .messages({
      'any.required': 'Department is required',
    }),

  semester: Joi.string()
    .valid('Fall', 'Spring', 'Summer')
    .required()
    .messages({
      'any.only': 'Semester must be Fall, Spring, or Summer',
      'any.required': 'Semester is required',
    }),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(2100)
    .required()
    .messages({
      'any.required': 'Year is required',
    }),

  max_enrollment: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .required()
    .messages({
      'number.min': 'Max enrollment must be at least 1',
      'number.max': 'Max enrollment must not exceed 500',
      'any.required': 'Max enrollment is required',
    }),

  prerequisites: Joi.array()
    .items(Joi.string())
    .optional(),

  time_slots: Joi.array()
    .items(
      Joi.object({
        day_of_week: Joi.string()
          .valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
          .required(),
        start_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
          .required(),
        end_time: Joi.string()
          .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
          .required(),
        location: Joi.string()
          .max(100)
          .required(),
        type: Joi.string()
          .valid('LECTURE', 'TUTORIAL')
          .optional()
          .default('LECTURE'),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one time slot is required',
    }),
});

/**
 * Validation schema for course update
 */
export const courseUpdateSchema = Joi.object<CourseUpdateRequest>({
  course_name: Joi.string()
    .max(200)
    .optional(),

  description: Joi.string()
    .optional(),

  max_enrollment: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .optional(),

  status: Joi.string()
    .valid('active', 'inactive', 'cancelled')
    .optional(),

  prerequisites: Joi.array()
    .items(Joi.string())
    .optional(),
}).min(1);

/**
 * Validation schema for enrollment request
 */
export const enrollmentRequestSchema = Joi.object<EnrollmentRequest>({
  course_id: Joi.number()
    .integer()
    .required()
    .messages({
      'any.required': 'Course ID is required',
    }),
});

/**
 * Generic validation function
 */
export const validate = <T>(schema: Joi.ObjectSchema<T>, data: any): { error?: string; value?: T } => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    return { error: errorMessage };
  }

  return { value };
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validate time format (HH:MM or HH:MM:SS)
 */
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return timeRegex.test(time);
};
