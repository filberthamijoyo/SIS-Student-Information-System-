import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Redis connection state tracking
 */
let isConnected = false;
let connectionAttempts = 0;

/**
 * Redis Client Configuration
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    connectionAttempts = times;
    // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, 1600ms, max 3000ms
    const delay = Math.min(times * 50, 3000);
    
    // Stop retrying after 60 attempts (about 5 minutes)
    if (times > 60) {
      console.error('✗ Redis: Max retry attempts reached. Please check if Redis is running.');
      return null; // Stop retrying
    }
    
    if (times > 1) {
      console.log(`Redis reconnecting (attempt ${times}) in ${delay}ms...`);
    }
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true, // Queue commands when offline (allows graceful startup)
  lazyConnect: false, // Connect immediately
  connectTimeout: 10000, // 10 second connection timeout
  keepAlive: 30000, // 30 seconds
};

/**
 * Create Redis Client
 */
export const redisClient = new Redis(redisConfig);

/**
 * Redis Event Handlers
 */
redisClient.on('connect', () => {
  isConnected = false; // Not ready yet, just connected
  connectionAttempts = 0;
  console.log(`✓ Redis: Connecting to ${redisConfig.host}:${redisConfig.port}...`);
});

redisClient.on('ready', () => {
  isConnected = true;
  connectionAttempts = 0;
  console.log('✓ Redis: Client is ready and connected');
});

redisClient.on('error', (err) => {
  isConnected = false;
  // Only log connection errors, not command errors (those are handled in try/catch)
  if (err.message.includes('ECONNREFUSED')) {
    console.error(`✗ Redis: Connection refused. Is Redis running on ${redisConfig.host}:${redisConfig.port}?`);
    console.error('   Start Redis with: docker-compose up -d redis');
    console.error('   Or install locally: brew install redis && brew services start redis');
  } else if (err.message.includes('ENOTFOUND')) {
    console.error(`✗ Redis: Host not found: ${redisConfig.host}`);
  } else if (err.message.includes('timeout')) {
    console.error(`✗ Redis: Connection timeout to ${redisConfig.host}:${redisConfig.port}`);
  } else {
    console.error('✗ Redis Client Error:', err.message);
  }
});

redisClient.on('close', () => {
  isConnected = false;
  console.log('⚠ Redis: Connection closed');
});

redisClient.on('reconnecting', (delay: number) => {
  isConnected = false;
  console.log(`🔄 Redis: Reconnecting in ${delay}ms... (attempt ${connectionAttempts + 1})`);
});

redisClient.on('end', () => {
  isConnected = false;
  console.log('⚠ Redis: Connection ended');
});

/**
 * Cache key prefixes for organization
 */
export const CACHE_KEYS = {
  USER: 'user:',
  COURSE: 'course:',
  ENROLLMENT: 'enrollment:',
  SESSION: 'session:',
  RATE_LIMIT: 'rate_limit:',
  WAITLIST: 'waitlist:',
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  DAY: 86400,      // 24 hours
} as const;

/**
 * Helper function to get cached data
 */
export const getCached = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

/**
 * Helper function to set cached data
 */
export const setCached = async (
  key: string,
  value: any,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<boolean> => {
  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
};

/**
 * Helper function to delete cached data
 */
export const deleteCached = async (key: string): Promise<boolean> => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

/**
 * Helper function to delete cached data by pattern
 */
export const deleteCachedPattern = async (pattern: string): Promise<number> => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      return await redisClient.del(...keys);
    }
    return 0;
  } catch (error) {
    console.error('Redis pattern delete error:', error);
    return 0;
  }
};

/**
 * Get Redis connection status
 */
export const getRedisStatus = (): { connected: boolean; status: string } => {
  const status = redisClient.status;
  return {
    connected: isConnected && status === 'ready',
    status: status || 'unknown',
  };
};

/**
 * Test Redis connection
 */
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    // Check if client is ready
    if (redisClient.status !== 'ready') {
      return false;
    }
    
    const pong = await redisClient.ping();
    const connected = pong === 'PONG';
    
    if (connected) {
      isConnected = true;
    }
    
    return connected;
  } catch (error: any) {
    isConnected = false;
    // Don't log here - error handler already logs connection issues
    return false;
  }
};

/**
 * Reconnect to Redis manually
 */
export const reconnectRedis = async (): Promise<boolean> => {
  try {
    console.log('Attempting to reconnect to Redis...');
    await redisClient.connect();
    return await testRedisConnection();
  } catch (error: any) {
    console.error('Failed to reconnect to Redis:', error.message);
    return false;
  }
};

/**
 * Close Redis connection
 */
export const closeRedis = async () => {
  await redisClient.quit();
  console.log('Redis connection closed');
};

export default redisClient;
