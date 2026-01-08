import { PrismaClient } from '@prisma/client';

type GlobalPrisma = {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

// Helper function to ensure DATABASE_URL has proper connection parameters
function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || '';
  
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Parse URL to handle query parameters properly
  try {
    const urlObj = new URL(url);
    
    // For connection poolers (PgBouncer, Supabase pooler), we need to:
    // 1. Set connection_limit=1 to avoid prepared statement conflicts
    // 2. Use transaction mode (pgbouncer=true) if using Supabase
    if (!urlObj.searchParams.has('connection_limit')) {
      urlObj.searchParams.set('connection_limit', '1');
    }
    
    // If using Supabase pooler, ensure pgbouncer mode is set
    if (url.includes('pooler.supabase.com') && !urlObj.searchParams.has('pgbouncer')) {
      urlObj.searchParams.set('pgbouncer', 'true');
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, try simple string manipulation
    const separator = url.includes('?') ? '&' : '?';
    if (!url.includes('connection_limit=')) {
      url = `${url}${separator}connection_limit=1`;
    }
    return url;
  }
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Prisma manages connections automatically - no need to call $connect() explicitly
// Explicit $connect() can cause issues with connection pooling and prepared statements
// The first query will establish the connection automatically

// Handle Prisma disconnection on process termination
const gracefulShutdown = async () => {
  await prisma.$disconnect();
};

process.on('beforeExit', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export { prisma };
export default prisma;