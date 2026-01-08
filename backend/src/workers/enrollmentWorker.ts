import { Job } from 'bull';
import { enrollmentQueue } from '../config/queue';
import { processEnrollment } from '../services/enrollmentService';
import { ValidationError } from '../utils/errors';

/**
 * Enrollment Worker (Prisma-based)
 * Processes enrollment jobs from the queue
 */

/**
 * Process a single enrollment job
 */
async function handleEnrollmentJob(job: Job): Promise<any> {
  const { userId, courseId, timestamp } = job.data;

  console.log(`[Worker] Processing enrollment job ${job.id}:`, {
    userId,
    courseId,
    timestamp,
    attempt: job.attemptsMade + 1
  });

  try {
    const result = await processEnrollment(userId, courseId);

    console.log(`[Worker] ✓ Job ${job.id} completed:`, result.status);

    return result;
  } catch (error: any) {
    console.error(`[Worker] ✗ Job ${job.id} failed:`, error.message);

    // Validation errors should not be retried - fail immediately
    if (error instanceof ValidationError) {
      console.log(`[Worker] ValidationError detected - failing job immediately without retry`);
      // Discard the job to prevent retries
      await job.discard();
      throw error;
    }

    // Check for Prisma unique constraint errors (P2002)
    if (error.code === 'P2002' || error.message?.includes('Unique constraint failed')) {
      console.log(`[Worker] Prisma unique constraint error - treating as ValidationError`);
      const validationError = new ValidationError('You are already enrolled in this course');
      // Discard the job to prevent retries
      await job.discard();
      throw validationError;
    }

    // Other errors (transient) can be retried
    throw error;
  }
}

/**
 * Setup enrollment queue processor
 */
export function setupEnrollmentWorker() {
  // Process jobs
  enrollmentQueue.process(async (job: Job) => {
    return await handleEnrollmentJob(job);
  });

  // Job completed
  enrollmentQueue.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed successfully:`, {
      status: result.status,
      message: result.message
    });
  });

  // Job failed
  enrollmentQueue.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job.id} failed after ${job.attemptsMade} attempts:`, error.message);
  });

  // Job active
  enrollmentQueue.on('active', (job) => {
    console.log(`[Worker] Job ${job.id} started processing`);
  });

  // Queue stalled
  enrollmentQueue.on('stalled', (job) => {
    console.warn(`[Worker] Job ${job.id} stalled`);
  });

  console.log('✓ Enrollment worker started and listening for jobs');
}

/**
 * Graceful shutdown
 */
export async function shutdownWorker() {
  console.log('Shutting down enrollment worker...');
  await enrollmentQueue.close();
  console.log('✓ Enrollment worker shut down');
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received');
  await shutdownWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received');
  await shutdownWorker();
  process.exit(0);
});

// Start worker if this file is run directly
if (require.main === module) {
  setupEnrollmentWorker();
  console.log('Enrollment worker is running. Press Ctrl+C to stop.');
}

export default setupEnrollmentWorker;
