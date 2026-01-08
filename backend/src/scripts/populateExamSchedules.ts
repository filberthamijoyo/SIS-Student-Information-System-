import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExamScheduleData {
  courseCode: string;
  courseName: string;
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  term: string;
  year: number;
}

/**
 * Parse date and time from courseName field
 * Format: "Course Name December 14 2025 (Sunday) 08:30:00 10:00:00"
 * Returns: { courseName, examDate, startTime, endTime }
 */
function parseExamInfoFromCourseName(courseName: string): {
  courseName: string;
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
} {
  // Pattern: "Course Name Month Day Year (DayOfWeek) HH:MM:SS HH:MM:SS"
  // Example: "Integrated Marketing Communication December 14 2025 (Sunday) 08:30:00 10:00:00"
  const dateTimePattern = /(.+?)\s+([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})\s+\([^)]+\)\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/;
  const match = courseName.match(dateTimePattern);

  if (match) {
    const [, namePart, month, day, year, startH, startM, _startS, endH, endM, _endS] = match;
    
    // Parse date
    const monthMap: { [key: string]: number } = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const monthIndex = monthMap[month.toLowerCase()];
    if (monthIndex !== undefined) {
      // Format date as YYYY-MM-DD (avoid timezone issues)
      const dayStr = parseInt(day).toString().padStart(2, '0');
      const monthStr = (monthIndex + 1).toString().padStart(2, '0');
      const examDate = `${year}-${monthStr}-${dayStr}`;
      
      // Format times as HH:MM
      const startTime = `${startH}:${startM}`;
      const endTime = `${endH}:${endM}`;
      
      return {
        courseName: namePart.trim(),
        examDate,
        startTime,
        endTime
      };
    }
  }

  return {
    courseName,
    examDate: null,
    startTime: null,
    endTime: null
  };
}

/**
 * Populate database with exam schedules from JSON
 */
async function populateExamSchedules() {
  console.log('🚀 Starting exam schedules population from JSON...');

  // Read JSON file - use process.cwd() which should be the backend directory
  // Go up one level to project root
  const projectRoot = path.resolve(process.cwd(), '..');
  const jsonPath = path.join(projectRoot, 'Course Examinations for Full-time Undergraduate Programmes of Term 1, 2025-26 - Timetable_0_exams.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`);
    process.exit(1);
  }

  const examData: ExamScheduleData[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📄 Loaded ${examData.length} exam entries`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let matchedCourses = 0;
  let parsedFromCourseName = 0;

  for (let i = 0; i < examData.length; i++) {
    const exam = examData[i];
    
    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`   Processing exam ${i + 1}/${examData.length}...`);
    }

    // Skip if missing course code
    if (!exam.courseCode) {
      console.log(`   ⚠️  Skipping entry: missing courseCode`);
      skipped++;
      continue;
    }

    // If examDate is missing, try to parse from courseName
    let examDate = exam.examDate;
    let startTime = exam.startTime;
    let endTime = exam.endTime;
    let courseName = exam.courseName;

    if (!examDate && courseName) {
      const parsed = parseExamInfoFromCourseName(courseName);
      if (parsed.examDate) {
        examDate = parsed.examDate;
        startTime = parsed.startTime || startTime;
        endTime = parsed.endTime || endTime;
        courseName = parsed.courseName || courseName;
        parsedFromCourseName++;
      }
    }

    // Skip if still missing examDate
    if (!examDate) {
      console.log(`   ⚠️  Skipping exam ${exam.courseCode}: missing examDate`);
      skipped++;
      continue;
    }

    try {
      // Try to find matching course in database
      let courseId: number | null = null;
      const course = await prisma.courses.findUnique({
        where: { course_code: exam.courseCode },
      });

      if (course) {
        courseId = course.id;
        matchedCourses++;
      }

      // Parse exam date
      const examDateObj = new Date(examDate);

      // Check if exam schedule already exists
      const existing = await (prisma as any).exam_schedules.findFirst({
        where: {
          course_code: exam.courseCode,
          exam_date: examDateObj,
          term: exam.term,
          year: exam.year,
        },
      });

      if (existing) {
        // Update existing exam schedule
        await (prisma as any).exam_schedules.update({
          where: { id: existing.id },
          data: {
            course_id: courseId,
            course_name: courseName,
            start_time: startTime,
            end_time: endTime,
            location: exam.location,
            updated_at: new Date(),
          },
        });
        updated++;
      } else {
        // Create new exam schedule
        await (prisma as any).exam_schedules.create({
          data: {
            course_id: courseId,
            course_code: exam.courseCode,
            course_name: courseName,
            exam_date: examDateObj,
            start_time: startTime,
            end_time: endTime,
            location: exam.location,
            term: exam.term,
            year: exam.year,
          },
        });
        created++;
      }
    } catch (error: any) {
      console.error(`   ⚠️  Error processing exam ${exam.courseCode}: ${error.message}`);
      skipped++;
    }
  }

  console.log('\n✨ Exam schedules population completed!');
  console.log(`\nSummary:`);
  console.log(`   - Created: ${created} exam schedules`);
  console.log(`   - Updated: ${updated} exam schedules`);
  console.log(`   - Skipped: ${skipped} exam schedules`);
  console.log(`   - Matched courses: ${matchedCourses}/${examData.length}`);
  console.log(`   - Parsed from courseName: ${parsedFromCourseName} entries`);
}

// Run the population
populateExamSchedules()
  .catch((error) => {
    console.error('❌ Error populating exam schedules:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

