import { enrollmentQueue } from '../config/queue';

/**
 * Utility script to clear stuck jobs from the enrollment queue
 */

async function clearStuckJobs() {
  console.log('Connecting to queue...');

  try {
    // Get all jobs in different states
    const waitingJobs = await enrollmentQueue.getWaiting();
    const activeJobs = await enrollmentQueue.getActive();
    const failedJobs = await enrollmentQueue.getFailed();

    console.log('\n=== Queue Status ===');
    console.log(`Waiting jobs: ${waitingJobs.length}`);
    console.log(`Active jobs: ${activeJobs.length}`);
    console.log(`Failed jobs: ${failedJobs.length}`);

    // Remove failed jobs
    if (failedJobs.length > 0) {
      console.log('\nRemoving failed jobs...');
      for (const job of failedJobs) {
        await job.remove();
        console.log(`  - Removed failed job ${job.id}: ${job.failedReason}`);
      }
    }

    // Clean stuck waiting jobs (optional - uncomment if needed)
    if (waitingJobs.length > 0) {
      console.log('\nClearing waiting jobs...');
      for (const job of waitingJobs) {
        await job.remove();
        console.log(`  - Removed waiting job ${job.id}`);
      }
    }

    // Clean stuck active jobs (optional - uncomment if needed)
    if (activeJobs.length > 0) {
      console.log('\nClearing active jobs...');
      for (const job of activeJobs) {
        await job.remove();
        console.log(`  - Removed active job ${job.id}`);
      }
    }

    console.log('\n✓ Queue cleaned successfully');

    // Clean all completed jobs older than 1 hour
    await enrollmentQueue.clean(3600000, 'completed');
    console.log('✓ Cleaned old completed jobs');

    process.exit(0);
  } catch (error) {
    console.error('Error clearing queue:', error);
    process.exit(1);
  }
}

clearStuckJobs();
