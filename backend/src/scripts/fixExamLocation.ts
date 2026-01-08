import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix exam schedules where location incorrectly equals course_code
 * This should be set to NULL since location information is not available in the PDF
 */
async function fixExamLocation() {
  console.log('🔧 Starting exam location fix...');

  try {
    // Find all exam schedules where location equals course_code
    const examsToFix = await (prisma as any).exam_schedules.findMany({
      where: {
        location: {
          not: null,
        },
      },
      select: {
        id: true,
        course_code: true,
        location: true,
      },
    });

    console.log(`📊 Found ${examsToFix.length} exam schedules with location data`);

    let fixed = 0;
    let alreadyCorrect = 0;

    for (const exam of examsToFix) {
      // If location equals course_code, it's incorrect data
      if (exam.location === exam.course_code) {
        await (prisma as any).exam_schedules.update({
          where: { id: exam.id },
          data: {
            location: null,
          },
        });
        fixed++;
        if (fixed % 10 === 0) {
          console.log(`   Fixed ${fixed} exam schedules...`);
        }
      } else {
        alreadyCorrect++;
      }
    }

    console.log('\n✨ Exam location fix completed!');
    console.log(`\nSummary:`);
    console.log(`   - Fixed (set to NULL): ${fixed} exam schedules`);
    console.log(`   - Already correct: ${alreadyCorrect} exam schedules`);
    console.log(`   - Total checked: ${examsToFix.length} exam schedules`);
  } catch (error: any) {
    console.error('❌ Error fixing exam locations:', error);
    throw error;
  }
}

// Run the fix
fixExamLocation()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });







