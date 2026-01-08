import Bull, { Queue, QueueOptions } from 'bull';
import dotenv from 'dotenv';
import { EnrollmentQueueJobData } from '../types/enrollment.types';

dotenv.config();

/**
 * Queue Configuration
 */
const queueOptions: QueueOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: parseInt(process.env.QUEUE_ATTEMPTS || '3'),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '5000'),
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

/**
 * Enrollment Queue - Handles course enrollment operations
 */
export const enrollmentQueue: Queue<EnrollmentQueueJobData> = new Bull(
  process.env.QUEUE_NAME || 'enrollment-queue',
  queueOptions
);

/**
 * Queue Event Handlers
 */
enrollmentQueue.on('error', (error) => {
  console.error('✗ Enrollment Queue Error:', error);
});

enrollmentQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`);
});

enrollmentQueue.on('active', (job) => {
  console.log(`Job ${job.id} is now active`);
});

enrollmentQueue.on('completed', (job, result) => {
  console.log(`✓ Job ${job.id} completed successfully:`, result);
});

enrollmentQueue.on('failed', (job, err) => {
  console.error(`✗ Job ${job?.id} failed:`, err.message);
});

enrollmentQueue.on('stalled', (job) => {
  console.warn(`⚠ Job ${job.id} has stalled`);
});

/**
 * Add enrollment job to queue
 */
export const addEnrollmentJob = async (
  data: EnrollmentQueueJobData,
  priority: number = 0
): Promise<Bull.Job<EnrollmentQueueJobData>> => {
  try {
    const job = await enrollmentQueue.add(data, {
      priority,
      jobId: `enrollment-${data.student_id}-${data.course_id}-${Date.now()}`,
    });
    console.log(`Enrollment job added: ${job.id}`);
    return job;
  } catch (error) {
    console.error('Failed to add enrollment job:', error);
    throw error;
  }
};

/**
 * Get job by ID
 */
export const getJob = async (jobId: string): Promise<Bull.Job<EnrollmentQueueJobData> | null> => {
  return await enrollmentQueue.getJob(jobId);
};

/**
 * Get queue statistics
 */
export const getQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    enrollmentQueue.getWaitingCount(),
    enrollmentQueue.getActiveCount(),
    enrollmentQueue.getCompletedCount(),
    enrollmentQueue.getFailedCount(),
    enrollmentQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
};

/**
 * Clean old jobs from queue
 */
export const cleanQueue = async () => {
  await enrollmentQueue.clean(24 * 3600 * 1000, 'completed'); // Remove completed jobs older than 24 hours
  await enrollmentQueue.clean(7 * 24 * 3600 * 1000, 'failed'); // Remove failed jobs older than 7 days
  console.log('Queue cleaned');
};

/**
 * Pause queue
 */
export const pauseQueue = async () => {
  await enrollmentQueue.pause();
  console.log('Enrollment queue paused');
};

/**
 * Resume queue
 */
export const resumeQueue = async () => {
  await enrollmentQueue.resume();
  console.log('Enrollment queue resumed');
};

/**
 * Close queue connection
 */
export const closeQueue = async () => {
  await enrollmentQueue.close();
  console.log('Enrollment queue closed');
};

/**
 * Get failed jobs
 */
export const getFailedJobs = async (): Promise<Bull.Job<EnrollmentQueueJobData>[]> => {
  return await enrollmentQueue.getFailed();
};

/**
 * Retry failed job
 */
export const retryFailedJob = async (jobId: string): Promise<void> => {
  const job = await enrollmentQueue.getJob(jobId);
  if (job) {
    await job.retry();
    console.log(`Job ${jobId} retried`);
  }
};

export default enrollmentQueue;
