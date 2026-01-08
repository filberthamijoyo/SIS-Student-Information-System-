import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { testConnection, closePool } from './config/database';
import { testRedisConnection, closeRedis, reconnectRedis, getRedisStatus } from './config/redis';
import { setupEnrollmentWorker, shutdownWorker } from './workers/enrollmentWorker';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { displayServiceStatus } from './utils/startup';

// Import routes
import authRoutes from './routes/authRoutes';
import courseRoutes from './routes/courseRoutes';
import enrollmentRoutes from './routes/enrollmentRoutes';
import adminRoutes from './routes/adminRoutes';
import instructorRoutes from './routes/instructorRoutes';
// New SIS routes
import academicRoutes from './routes/academicRoutes';
import applicationRoutes from './routes/applicationRoutes';
import personalRoutes from './routes/personalRoutes';
import facultyRoutes from './routes/facultyRoutes';
import campusRoutes from './routes/campusRoutes';
// Additional SIS routes
import academicCalendarRoutes from './routes/academicCalendarRoutes';
import addDropRoutes from './routes/addDropRoutes';
import majorChangeRoutes from './routes/majorChangeRoutes';
import courseEvaluationRoutes from './routes/courseEvaluationRoutes';

// Load environment variables
dotenv.config();

// Create Express application
const app: Application = express();
const PORT = process.env.PORT || 5000;

/**
 * Middleware Configuration
 */

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes
app.use(apiLimiter);

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next) => {
    console.log(`${req.method} ${req.path}`, {
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  });
}

/**
 * Routes
 */

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = await testConnection();
  const redisConnected = await testRedisConnection();
  const redisStatus = getRedisStatus();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    services: {
      database: dbConnected ? 'connected' : 'disconnected',
      redis: {
        connected: redisConnected,
        status: redisStatus.status,
      },
      queue: 'active',
    },
  });
});

// Redis reconnect endpoint (for troubleshooting)
app.post('/admin/redis/reconnect', async (_req: Request, res: Response) => {
  try {
    const reconnected = await reconnectRedis();
    const status = getRedisStatus();
    
    res.status(reconnected ? 200 : 503).json({
      success: reconnected,
      message: reconnected 
        ? 'Redis reconnected successfully' 
        : 'Failed to reconnect to Redis. Please ensure Redis is running.',
      status: status.status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// API info endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'CUHK Student Information System API',
    version: '2.0.0',
    description: 'Complete Student Information System with course selection, academic records, financial info, and more',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      courses: '/api/courses',
      enrollments: '/api/enrollments',
      admin: '/api/admin',
      instructor: '/api/instructor',
      academic: '/api/academic',
      applications: '/api/applications',
      personal: '/api/personal',
      faculty: '/api/faculty',
      campus: '/api/campus',
      academicCalendar: '/api/academic-calendar',
      addDrop: '/api/add-drop',
      majorChange: '/api/major-change',
      courseEvaluation: '/api/course-evaluation',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/instructor', instructorRoutes);

// New SIS API Routes
app.use('/api/academic', academicRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/campus', campusRoutes);

// Additional SIS API Routes
app.use('/api/academic-calendar', academicCalendarRoutes);
app.use('/api/add-drop', addDropRoutes);
app.use('/api/major-change', majorChangeRoutes);
app.use('/api/course-evaluation', courseEvaluationRoutes);

/**
 * Error Handling Middleware
 */

// 404 Not Found handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

/**
 * Server Startup
 */
const startServer = async () => {
  try {
    // Wait for database and redis to be ready (important for Docker)
    // await waitForServices();

    // Display service status
    await displayServiceStatus();

    // Setup enrollment queue worker
    console.log('Setting up enrollment worker...');
    setupEnrollmentWorker();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║                                                       ║');
      console.log('║   🚀 CUHK Course Selection System                    ║');
      console.log('║                                                       ║');
      console.log(`║   Server running on: http://localhost:${PORT}        ║`);
      console.log(`║   Environment: ${process.env.NODE_ENV || 'development'}                            ║`);
      console.log('║                                                       ║');
      console.log(`║   📚 API Docs: http://localhost:${PORT}/             ║`);
      console.log(`║   🏥 Health: http://localhost:${PORT}/health         ║`);
      console.log('║                                                       ║');
      console.log('╚═══════════════════════════════════════════════════════╝\n');
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} signal received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('✓ HTTP server closed');

        try {
          // Close enrollment worker
          await shutdownWorker();

          // Close database pool
          await closePool();

          // Close Redis connection
          await closeRedis();

          console.log('✓ All services shut down gracefully');
          process.exit(0);
        } catch (error) {
          console.error('✗ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('✗ Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('✗ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('✗ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
