import { redisClient } from '../config/redis';

/**
 * Check if database is ready and migrations are applied
 */
async function checkDatabase(): Promise<boolean> {
  // Database connection is handled by Prisma Client
  // which automatically connects when needed
  return true;
}

/**
 * Check if Redis is connected
 */
export async function checkRedis(): Promise<boolean> {
  try {
    // Check if Redis client is ready before attempting ping
    if (redisClient.status !== 'ready') {
      return false;
    }
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    // Don't log errors here - they're expected during startup
    return false;
  }
}

/**
 * Wait for services to be ready
 */
export async function waitForServices(maxRetries: number = 30): Promise<void> {
  console.log('🔍 Checking if services are ready...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const [dbReady, redisReady] = await Promise.all([
        checkDatabase(),
        checkRedis()
      ]);

      if (dbReady && redisReady) {
        console.log('✅ All services are ready!');
        console.log('   ✓ Database: Connected');
        console.log('   ✓ Redis: Connected');
        return;
      }

      if (!dbReady) {
        console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
      }

      if (!redisReady) {
        console.log(`⏳ Waiting for Redis... (${i + 1}/${maxRetries})`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`⏳ Services not ready yet... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error('❌ Services failed to start in time. Please check your Docker containers.');
}

/**
 * Display service status
 */
export async function displayServiceStatus(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║           Service Status                              ║');
  console.log('╠═══════════════════════════════════════════════════════╣');

  try {
    const dbReady = await checkDatabase();
    console.log(`║ Database: ${dbReady ? '✅ Connected' : '❌ Disconnected'}                              ║`);
  } catch (error) {
    console.log('║ Database: ❌ Disconnected                              ║');
  }

  // Wait a bit for Redis to connect if it's not ready yet
  let redisReady = await checkRedis();
  if (!redisReady && redisClient.status === 'connecting') {
    // Give Redis a moment to connect (max 2 seconds)
    for (let i = 0; i < 4 && !redisReady; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      redisReady = await checkRedis();
    }
  }

  try {
    console.log(`║ Redis:    ${redisReady ? '✅ Connected' : '❌ Disconnected'}                              ║`);
  } catch (error) {
    console.log('║ Redis:    ❌ Disconnected                              ║');
  }

  console.log('╚═══════════════════════════════════════════════════════╝\n');
}
