/**
 * Generic API Response Interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp?: Date;
}

/**
 * Error Response Interface
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: ValidationError[];
  statusCode: number;
  timestamp: Date;
  path?: string;
}

/**
 * Validation Error Interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Paginated Response Interface
 */
export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Pagination Metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Pagination Query Parameters
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Sort Options
 */
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Filter Options
 */
export interface FilterOptions {
  [key: string]: any;
}

/**
 * Query Options - Combines pagination, sorting, and filtering
 */
export interface QueryOptions {
  pagination?: PaginationQuery;
  sort?: SortOptions;
  filters?: FilterOptions;
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: Date;
  uptime: number;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    queue: 'active' | 'inactive';
  };
}

/**
 * Bulk Operation Result
 */
export interface BulkOperationResult<T = any> {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    item: T;
    success: boolean;
    error?: string;
  }>;
}

/**
 * File Upload Response
 */
export interface FileUploadResponse {
  success: boolean;
  message: string;
  data?: {
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
    path: string;
    url: string;
  };
}

/**
 * Statistics Response
 */
export interface StatisticsResponse {
  success: boolean;
  data: {
    [key: string]: number | string | object;
  };
  period?: {
    start: Date;
    end: Date;
  };
}
