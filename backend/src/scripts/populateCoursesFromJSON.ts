import { PrismaClient, Role, Semester, CourseStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CourseData {
  course_code: string;
  course_name: string;
  department: string;
  instructor_name: string;
  instructor_email: string;
  credits: number;
  semester: string;
  year: number;
}

interface InstructorData {
  name: string;
  email: string;
  department: string;
}

interface JSONData {
  courses: CourseData[];
  instructors: InstructorData[];
  metadata: {
    total_courses: number;
    total_course_instructor_pairs: number;
    total_instructors: number;
    semester: string;
    year: number;
  };
}

/**
 * Generate a user identifier from instructor name
 */
function generateUserIdentifier(name: string): string {
  // Remove spaces and special characters, take first 6 chars
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `inst_${cleaned.substring(0, 10)}`;
}

/**
 * Generate email from instructor name if not provided
 */
function generateEmail(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const parts = name.split(' ');
  if (parts.length >= 2) {
    // Use first letter of first name + last name
    const firstName = parts[0].toLowerCase();
    const lastName = parts[parts.length - 1].toLowerCase().replace(/[^a-zA-Z]/g, '');
    return `${firstName.charAt(0)}${lastName}@cuhk.edu.cn`;
  }
  return `${cleaned}@cuhk.edu.cn`;
}

/**
 * Populate database with courses and instructors from JSON
 */
async function populateDatabase() {
  console.log('🚀 Starting database population from JSON...');

  // Read JSON file
  const jsonPath = path.join(__dirname, '../../../course_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON file not found: ${jsonPath}`);
    process.exit(1);
  }

  const jsonData: JSONData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📄 Loaded JSON data:`);
  console.log(`   - Courses: ${jsonData.metadata.total_course_instructor_pairs}`);
  console.log(`   - Unique Instructors: ${jsonData.metadata.total_instructors}`);
  console.log(`   - Unique Courses: ${jsonData.metadata.total_courses}`);

  // Hash password for instructors
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Step 1: Create/update instructors
  console.log('\n👨‍🏫 Creating/updating instructors...');
  const instructorMap = new Map<string, number>(); // name -> user_id

  // Get unique instructors from the courses
  const uniqueInstructors = new Map<string, { name: string; email: string; department: string }>();
  
  for (const course of jsonData.courses) {
    if (course.instructor_name && course.instructor_name.trim()) {
      const name = course.instructor_name.trim();
      if (!uniqueInstructors.has(name)) {
        uniqueInstructors.set(name, {
          name,
          email: course.instructor_email || generateEmail(name),
          department: course.department,
        });
      }
    }
  }

  // Also add instructors from the instructors array
  for (const instructor of jsonData.instructors) {
    if (instructor.name && instructor.name.trim()) {
      const name = instructor.name.trim();
      if (!uniqueInstructors.has(name)) {
        uniqueInstructors.set(name, {
          name,
          email: instructor.email || generateEmail(name),
          department: instructor.department,
        });
      }
    }
  }

  console.log(`   Found ${uniqueInstructors.size} unique instructors`);

  // Create instructor users
  let createdInstructors = 0;
  let updatedInstructors = 0;
  let processedCount = 0;
  const totalInstructors = uniqueInstructors.size;

  for (const [name, instructorData] of uniqueInstructors) {
    processedCount++;
    if (processedCount % 50 === 0 || processedCount === 1) {
      console.log(`   Processing instructor ${processedCount}/${totalInstructors}...`);
    }

    const userIdentifier = generateUserIdentifier(name);
    const email = instructorData.email || generateEmail(name);

    try {
      // Check if user already exists by email or user_identifier
      const existingUser = await prisma.users.findFirst({
        where: {
          OR: [
            { email },
            { user_identifier: userIdentifier },
          ],
        },
      });

      if (existingUser) {
        // Update existing user to be instructor if not already
        if (existingUser.role !== Role.INSTRUCTOR) {
          await prisma.users.update({
            where: { id: existingUser.id },
            data: {
              role: Role.INSTRUCTOR,
              department: instructorData.department,
              updated_at: new Date(),
            },
          });
          updatedInstructors++;
        }
        instructorMap.set(name, existingUser.id);
      } else {
        // Create new instructor
        const user = await prisma.users.create({
          data: {
            user_identifier: userIdentifier,
            email,
            password_hash: hashedPassword,
            full_name: name,
            role: Role.INSTRUCTOR,
            department: instructorData.department,
            updated_at: new Date(),
          },
        });
        instructorMap.set(name, user.id);
        createdInstructors++;
      }
    } catch (error: any) {
      console.error(`   ⚠️  Error creating instructor ${name}: ${error.message}`);
      // Try with a different identifier if there's a conflict
      if (error.code === 'P2002') {
        const altIdentifier = `${userIdentifier}_${Date.now()}`;
        try {
          const user = await prisma.users.create({
            data: {
              user_identifier: altIdentifier,
              email: `${Date.now()}_${email}`,
              password_hash: hashedPassword,
              full_name: name,
              role: Role.INSTRUCTOR,
              department: instructorData.department,
              updated_at: new Date(),
            },
          });
          instructorMap.set(name, user.id);
          createdInstructors++;
        } catch (retryError: any) {
          console.error(`   ❌ Failed to create instructor ${name} after retry: ${retryError.message}`);
        }
      }
    }
  }

  console.log(`   ✅ Created ${createdInstructors} new instructors`);
  console.log(`   ✅ Updated ${updatedInstructors} existing users to instructors`);

  // Step 2: Create/update courses
  console.log('\n📚 Creating/updating courses...');
  
  // Group courses by course_code (since one course can have multiple instructors)
  const coursesByCode = new Map<string, CourseData[]>();
  for (const course of jsonData.courses) {
    if (!coursesByCode.has(course.course_code)) {
      coursesByCode.set(course.course_code, []);
    }
    coursesByCode.get(course.course_code)!.push(course);
  }

  console.log(`   Found ${coursesByCode.size} unique courses`);

  let createdCourses = 0;
  let updatedCourses = 0;
  let skippedCourses = 0;
  let processedCourses = 0;
  const totalCourses = coursesByCode.size;

  // Convert semester string to enum
  const semesterMap: Record<string, Semester> = {
    'FALL': Semester.FALL,
    'SPRING': Semester.SPRING,
    'SUMMER': Semester.SUMMER,
    'Fall': Semester.FALL,
    'Spring': Semester.SPRING,
    'Summer': Semester.SUMMER,
  };

  for (const [courseCode, courseVariants] of coursesByCode) {
    processedCourses++;
    if (processedCourses % 50 === 0 || processedCourses === 1) {
      console.log(`   Processing course ${processedCourses}/${totalCourses}...`);
    }
    // Use the first variant for base course data
    const baseCourse = courseVariants[0];
    
    // Get the first available instructor for this course
    let instructorId: number | null = null;
    for (const variant of courseVariants) {
      if (variant.instructor_name && instructorMap.has(variant.instructor_name.trim())) {
        instructorId = instructorMap.get(variant.instructor_name.trim())!;
        break;
      }
    }

    const semester = semesterMap[baseCourse.semester.toUpperCase()] || Semester.FALL;

    try {
      // Check if course already exists
      const existingCourse = await prisma.courses.findUnique({
        where: { course_code: courseCode },
      });

      if (existingCourse) {
        // Update existing course
        await prisma.courses.update({
          where: { course_code: courseCode },
          data: {
            course_name: baseCourse.course_name,
            department: baseCourse.department,
            credits: baseCourse.credits,
            semester,
            year: baseCourse.year,
            instructor_id: instructorId || existingCourse.instructor_id,
            updated_at: new Date(),
          },
        });
        updatedCourses++;
      } else {
        // Create new course
        await prisma.courses.create({
          data: {
            course_code: courseCode,
            course_name: baseCourse.course_name,
            department: baseCourse.department,
            credits: baseCourse.credits,
            max_capacity: 100, // Default capacity
            current_enrollment: 0,
            semester,
            year: baseCourse.year,
            status: CourseStatus.ACTIVE,
            instructor_id: instructorId,
            updated_at: new Date(),
          },
        });
        createdCourses++;
      }
    } catch (error: any) {
      console.error(`   ⚠️  Error processing course ${courseCode}: ${error.message}`);
      skippedCourses++;
    }
  }

  console.log(`   ✅ Created ${createdCourses} new courses`);
  console.log(`   ✅ Updated ${updatedCourses} existing courses`);
  if (skippedCourses > 0) {
    console.log(`   ⚠️  Skipped ${skippedCourses} courses due to errors`);
  }

  console.log('\n✨ Database population completed!');
  console.log(`\nSummary:`);
  console.log(`   - Instructors: ${instructorMap.size} total`);
  console.log(`   - Courses: ${coursesByCode.size} total`);
}

// Run the population
populateDatabase()
  .catch((error) => {
    console.error('❌ Error populating database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

