import { prisma } from '../config/prisma';

/**
 * Utility script to clear all enrollments for a specific user
 * Run with: npx ts-node src/scripts/clearEnrollments.ts [userId]
 */

async function clearEnrollments() {
  const userId = process.argv[2] ? parseInt(process.argv[2]) : 1;

  console.log(`Clearing enrollments for user ID: ${userId}`);

  try {
    const deleted = await prisma.enrollment.deleteMany({
      where: {
        userId: userId
      }
    });

    console.log(`✓ Deleted ${deleted.count} enrollment records`);
    process.exit(0);
  } catch (error) {
    console.error('Error clearing enrollments:', error);
    process.exit(1);
  }
}

clearEnrollments();
