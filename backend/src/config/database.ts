import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL Database Configuration
 * Uses DATABASE_URL if available (for Supabase), otherwise falls back to individual parameters
 */
function getPoolConfig(): PoolConfig {
  // If DATABASE_URL is set (e.g., for Supabase), use it directly
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // For Supabase connection pooling, we need to handle SSL
      ssl: process.env.DATABASE_URL?.includes('supabase.com') 
        ? { rejectUnauthorized: false }
        : undefined,
    };
  }

  // Fallback to individual connection parameters (for local development)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'course_selection',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const poolConfig: PoolConfig = getPoolConfig();

/**
 * Create PostgreSQL Connection Pool
 */
export const pool = new Pool(poolConfig);

/**
 * Test database connection
 */
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('✗ Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

/**
 * Query helper function with error handling
 */
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Close database connection pool
 */
export const closePool = async () => {
  await pool.end();
  console.log('Database pool closed');
};

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

export default pool;
