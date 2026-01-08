import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import PDFDocument from 'pdfkit';

interface CourseData {
  courseCode: string;
  courseName: string;
  credits: number;
  grade: string;
  gradePoints: number | null;
  percentAMinus: number;
  isMajorCourse: boolean;
}

interface TermData {
  termName: string;
  courses: CourseData[];
  unitsPassedThisTerm: number;
  termGPA: number;
  cumulativeUnitsPassed: number;
  cumulativeGPA: number;
}

/**
 * Get all grades for the authenticated user
 */
export async function getMyGrades(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const enrollments = await prisma.enrollments.findMany({
      where: { user_id: userId },
      include: {
        courses: {
          select: {
            course_code: true,
            course_name: true,
            credits: true,
            semester: true,
            year: true,
          }
        },
        grades: true,
      },
      orderBy: [
        { enrolled_at: 'desc' },
      ],
    });

    const gradesData = enrollments.map(e => ({
      enrollmentId: e.id,
      semester: e.courses.semester || null,
      year: e.courses.year || null,
      courseCode: e.courses.course_code,
      courseName: e.courses.course_name,
      credits: e.courses.credits,
      letterGrade: e.grades?.letter_grade || 'IP',
      numericGrade: e.grades?.numeric_grade,
      gradePoints: e.grades?.grade_points,
      status: e.grades?.status || 'IN_PROGRESS',
    }));

    res.json({
      success: true,
      data: gradesData,
    });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grades',
    });
  }
}

/**
 * Get grades for a specific term
 */
export async function getGradesByTerm(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { semester, year } = req.query;

    if (!semester || !year) {
      throw new AppError('Semester and year are required', 400);
    }

    const enrollments = await prisma.enrollments.findMany({
      where: {
        user_id: userId,
        courses: {
          semester: semester as any,
          year: parseInt(year as string),
        }
      },
      include: {
        courses: {
          select: {
            course_code: true,
            course_name: true,
            credits: true,
          }
        },
        grades: true,
      },
    });

    const gradesData = enrollments.map(e => ({
      courseCode: e.courses.course_code,
      courseName: e.courses.course_name,
      credits: e.courses.credits,
      letterGrade: e.grades?.letter_grade || 'IP',
      numericGrade: e.grades?.numeric_grade,
      gradePoints: e.grades?.grade_points,
    }));

    res.json({
      success: true,
      data: gradesData,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get grades by term error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch grades',
      });
    }
  }
}

/**
 * Get grade for a specific course
 */
export async function getCourseGrade(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { courseId } = req.params;

    const enrollment = await prisma.enrollments.findFirst({
      where: {
        user_id: userId,
        course_id: parseInt(courseId),
      },
      include: {
        courses: {
          select: {
            course_code: true,
            course_name: true,
            credits: true,
            semester: true,
            year: true,
          }
        },
        grades: true,
      },
    });

    if (!enrollment) {
      throw new AppError('Enrollment not found', 404);
    }

    res.json({
      success: true,
      data: {
        courseCode: enrollment.courses.course_code,
        courseName: enrollment.courses.course_name,
        credits: enrollment.courses.credits,
        semester: enrollment.courses.semester || null,
        year: enrollment.courses.year || null,
        letterGrade: enrollment.grades?.letter_grade || 'IP',
        numericGrade: enrollment.grades?.numeric_grade,
        gradePoints: enrollment.grades?.grade_points,
        status: enrollment.grades?.status || 'IN_PROGRESS',
        comments: enrollment.grades?.comments,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get course grade error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch grade',
      });
    }
  }
}

/**
 * Get complete transcript for the authenticated user
 */
export async function getTranscript(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    // Get all transcripts
    const transcripts = await prisma.transcripts.findMany({
      where: { user_id: userId },
      orderBy: [
        { year: 'asc' },
        { semester: 'asc' },
      ],
    });

    // Get all graded enrollments
    const enrollments = await prisma.enrollments.findMany({
      where: {
        user_id: userId,
        grades: {
          status: 'PUBLISHED'
        },
      },
      include: {
        courses: true,
        grades: true,
      },
      orderBy: [
        { courses: { year: 'asc' } },
        { courses: { semester: 'asc' } },
      ],
    });

    // Group enrollments by term
    const enrollmentsByTerm = enrollments.reduce((acc, e) => {
      const year = e.courses.year || new Date().getFullYear();
      const semester = e.courses.semester || 'UNKNOWN';
      const key = `${year}-${semester}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        courseCode: e.courses.course_code,
        courseName: e.courses.course_name,
        credits: e.courses.credits,
        grade: e.grades?.letter_grade,
        gradePoints: e.grades?.grade_points,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate cumulative GPA
    const latestTranscript = transcripts.length > 0
      ? transcripts[transcripts.length - 1]
      : null;

    const totalCredits = enrollments.reduce((sum, e) => sum + e.courses.credits, 0);

    res.json({
      success: true,
      data: {
        transcripts: transcripts.map(t => ({
          semester: t.semester || null,
          year: t.year || null,
          termGPA: t.term_gpa,
          cumulativeGPA: t.gpa,
          totalCredits: t.total_credits,
          earnedCredits: t.earned_credits,
          academicStanding: t.academic_standing,
        })),
        enrollmentsByTerm,
        summary: {
          cumulativeGPA: latestTranscript?.gpa || 0,
          totalCredits,
          earnedCredits: totalCredits,
          academicStanding: latestTranscript?.academic_standing || 'N/A',
        },
      },
    });
  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transcript',
    });
  }
}

/**
 * Get unofficial transcript (same as transcript but marked as unofficial)
 */
export async function getUnofficialTranscript(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    // Get user info
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        students_students_user_idTousers: {
          include: {
            majors: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const student = user.students_students_user_idTousers;

    // Get transcripts
    const transcripts = await prisma.transcripts.findMany({
      where: { user_id: userId },
      orderBy: [
        { year: 'asc' },
        { semester: 'asc' },
      ],
    });

    // Get all enrollments with grades
    const enrollments = await prisma.enrollments.findMany({
      where: {
        user_id: userId,
        grades: {
          isNot: null,
        },
      },
      include: {
        courses: true,
        grades: true,
      },
      orderBy: [
        { courses: { year: 'asc' } },
        { courses: { semester: 'asc' } },
      ],
    });

    res.json({
      success: true,
      data: {
        isOfficial: false,
        student: {
          fullName: user.full_name,
          studentId: student?.student_id,
          email: user.email,
          major: student?.majors?.name,
          expectedGraduation: student?.expected_grad,
        },
        transcripts,
        courses: enrollments.map(e => ({
          semester: e.courses.semester || null,
          year: e.courses.year || null,
          courseCode: e.courses.course_code,
          courseName: e.courses.course_name,
          credits: e.courses.credits,
          letterGrade: e.grades?.letter_grade,
          numericGrade: e.grades?.numeric_grade,
          gradePoints: e.grades?.grade_points,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get unofficial transcript error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transcript',
      });
    }
  }
}

/**
 * Generate PDF transcript
 */
export async function generateTranscriptPDF(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    // Fetch student data with all relationships
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        students_students_user_idTousers: {
          include: {
            majors: true,
          },
        },
        personal_info: true,
      },
    });

    if (!user || !user.students_students_user_idTousers) {
      throw new AppError('Student record not found', 404);
    }

    const student = user.students_students_user_idTousers;
    const program = student.majors;

    // Get all enrollments with grades
    const enrollments = await prisma.enrollments.findMany({
      where: {
        user_id: userId,
      },
      include: {
        courses: true,
        grades: true,
      },
      orderBy: [
        { courses: { year: 'asc' } },
        { courses: { semester: 'asc' } },
      ],
    });

    // Group by academic year and term
    const termData = processTranscriptData(enrollments, program?.department);

    // Calculate final statistics
    const publishedGrades = enrollments.filter(
      (e) => e.grades && e.grades.status === 'PUBLISHED' && e.grades.grade_points !== null
    );

    const totalUnitsPass = enrollments
      .filter((e) => e.grades && e.grades.status === 'PUBLISHED' && !['W', 'F'].includes(e.grades.letter_grade || ''))
      .reduce((sum, e) => sum + e.courses.credits, 0);

    const cumulativeGPA = calculateCumulativeGPA(publishedGrades);
    const majorGPA = calculateMajorGPA(publishedGrades, program?.department);

    // Create PDF
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 30, bottom: 50, left: 50, right: 50 },
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=CUHK-SZ_TRANSCRIPT_${student.student_id}.pdf`
    );

    doc.pipe(res);

    let currentPage = 1;
    const totalPages = Math.max(1, Math.ceil(termData.length / 2.5) + 1);

    // Helper function to add header
    const addHeader = () => {
      doc.fontSize(7).fillColor('black').text('Invalid unless impressed with the Seal of the University', 50, 25);

      const issueDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      doc.text(`Issue Date: ${issueDate}`, 420, 25);
      doc.text(`Page ${currentPage} of ${totalPages}`, 510, 25);
      doc.fontSize(6).text('The maximum GPA attainable is 4.000', 50, 40);
    };

    // Helper function to add watermark
    const addWatermark = () => {
      doc
        .fontSize(7)
        .fillColor('gray')
        .text(
          'Unofficial Copy. NOT to be used as certificate of academic results. Grades may be subject to amendment.',
          50,
          doc.page.height - 35,
          { align: 'center', width: doc.page.width - 100 }
        );
      doc.fillColor('black');
    };

    // First page - Student info
    addHeader();
    addWatermark();

    // Student Information Header
    doc.fontSize(10).fillColor('black');
    const startY = 65;

    // Line 1: Name
    doc.text('Name:', 50, startY);
    doc.text(user.full_name.toUpperCase(), 150, startY);

    // Line 2: Student ID and Passport
    doc.text('Student ID No.:', 50, startY + 15);
    doc.text(student.student_id, 150, startY + 15);
    doc.text('ID/Passport No.:', 300, startY + 15);
    doc.text(user.user_identifier || 'N/A', 400, startY + 15);

    // Line 3: Date of Birth
    doc.text('Date of Birth:', 300, startY + 30);
    const dob = user.personal_info?.date_of_birth
      ? new Date(user.personal_info.date_of_birth).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      : 'N/A';
    doc.text(dob, 400, startY + 30);

    // Blank line
    const infoY = startY + 50;

    // Academic info
    const admittedYear = student.admission_date ? new Date(student.admission_date).getFullYear() : null;
    doc.text('Admitted in:', 50, infoY);
    doc.text(admittedYear ? `Sep ${admittedYear}` : 'N/A', 150, infoY);

    doc.text('College:', 50, infoY + 15);
    doc.text('N/A', 150, infoY + 15);

    doc.text('School:', 50, infoY + 30);
    doc.text(program?.department || 'School of Science and Engineering', 150, infoY + 30);

    doc.text('Major/Programme:', 50, infoY + 45);
    doc.text(program?.name || 'N/A', 150, infoY + 45);

    doc.text('Mode of Study:', 50, infoY + 60);
    doc.text('Full-time', 150, infoY + 60);

    let currentY = infoY + 90;

    // Process each term
    for (let i = 0; i < termData.length; i++) {
      const term = termData[i];

      // Check if we need a new page (leave room for term summary)
      const estimatedTermHeight = 35 + (term.courses.length * 15) + 40;
      if (currentY + estimatedTermHeight > 700) {
        doc.addPage();
        currentPage++;
        addHeader();
        addWatermark();
        currentY = 65;
      }

      // Term header
      doc.fontSize(11).font('Helvetica-Bold').text(term.termName, 50, currentY);
      currentY += 20;
      doc.font('Helvetica');

      // Course table header
      doc.fontSize(9);
      doc.text('Course Code', 50, currentY);
      doc.text('Course Title', 130, currentY);
      doc.text('Units', 420, currentY);
      doc.text('Grade', 470, currentY);
      doc.text('% of A- and', 510, currentY);
      currentY += 10;
      doc.text('above', 510, currentY);
      currentY += 12;

      // Courses
      doc.fontSize(9);
      for (const course of term.courses) {
        if (currentY > 710) {
          doc.addPage();
          currentPage++;
          addHeader();
          addWatermark();
          currentY = 65;
        }

        doc.text(course.courseCode, 50, currentY);

        // Truncate long course names
        const truncatedName = course.courseName.length > 45
          ? `${course.courseName.substring(0, 42)}...`
          : course.courseName;
        doc.text(truncatedName, 130, currentY);

        doc.text(course.credits.toFixed(1), 425, currentY, { width: 30, align: 'right' });
        doc.text(course.grade, 472, currentY, { width: 30, align: 'center' });
        doc.text(
          course.percentAMinus > 0 ? course.percentAMinus.toFixed(1) : 'N/A',
          515,
          currentY,
          { width: 50, align: 'right' }
        );

        currentY += 15;
      }

      // Term summary
      currentY += 5;
      doc.fontSize(9);

      // Right-aligned term stats
      const termSummaryX = 360;
      doc.text(`Units Passed = ${term.unitsPassedThisTerm.toFixed(1)}`, termSummaryX, currentY, {
        width: 100,
        align: 'right'
      });
      doc.text(`Term GPA = ${term.termGPA.toFixed(3)}`, 480, currentY, {
        width: 80,
        align: 'right'
      });

      currentY += 15;

      doc.text(`Cumulative Units Passed = ${term.cumulativeUnitsPassed.toFixed(1)}`, 300, currentY, {
        width: 160,
        align: 'right'
      });
      doc.text(`Cumulative GPA = ${term.cumulativeGPA.toFixed(3)}`, 480, currentY, {
        width: 80,
        align: 'right'
      });

      currentY += 35;
    }

    // Add final summary page if needed
    if (currentY > 550) {
      doc.addPage();
      currentPage++;
      addHeader();
      addWatermark();
      currentY = 65;
    }

    // Summary section
    currentY += 15;

    // Stars line
    const starsLine = '*'.repeat(130);
    doc.fontSize(9).text(starsLine, 50, currentY, { width: 500 });
    currentY += 12;
    doc.fontSize(10).text('Summary', 250, currentY, { width: 100, align: 'center' });
    currentY += 12;
    doc.fontSize(9).text(starsLine, 50, currentY, { width: 500 });
    currentY += 25;

    // Summary table
    doc.fontSize(9);

    // Table header
    doc.text('Total Units Passed', 150, currentY, { width: 100, align: 'center' });
    doc.text('Cumulative GPA', 280, currentY, { width: 100, align: 'center' });
    doc.text('Major GPA', 430, currentY, { width: 100, align: 'center' });
    currentY += 15;

    // Data row
    doc.text('CUHK(SZ)', 50, currentY);
    doc.text(totalUnitsPass.toFixed(1), 150, currentY, { width: 100, align: 'center' });
    doc.text(`${cumulativeGPA.toFixed(3)}/4.000`, 280, currentY, { width: 100, align: 'center' });
    doc.text(`${majorGPA.toFixed(3)}/4.000`, 430, currentY, { width: 100, align: 'center' });
    currentY += 15;

    // Bottom stars line
    const longStarsLine = '*'.repeat(160);
    doc.text(longStarsLine, 50, currentY, { width: 520 });
    currentY += 5;
    doc.text('****', 50, currentY);
    currentY += 25;

    // Remarks
    doc.fontSize(9).text('Remarks:', 50, currentY);
    currentY += 15;
    doc.fontSize(8).text(
      "Major GPA is the grade point average across a list of Major courses defined by the School Board, as being most relevant to the student's Major.",
      50,
      currentY,
      { width: 500, align: 'justify' }
    );

    currentY += 40;

    // End of transcript
    doc.fontSize(9);
    const endLine = '*'.repeat(25) + ' End of Transcript ' + '*'.repeat(25);
    doc.text(endLine, 50, currentY, { width: 500, align: 'center' });

    currentY += 50;

    // Signature line
    doc.fontSize(8);
    const underscoreLine = '_'.repeat(50);
    doc.text(underscoreLine, 300, currentY, { width: 250, align: 'center' });
    currentY += 15;
    doc.text('Director of Registry Services', 300, currentY, { width: 250, align: 'center' });

    doc.end();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      console.error('Generate transcript PDF error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF',
      });
    }
  }
}

// Helper function to process enrollment data into terms
function processTranscriptData(enrollments: any[], majorDepartment?: string | null): TermData[] {
  const termMap: Map<string, CourseData[]> = new Map();

  // Group by academic year and term
  enrollments.forEach((enrollment) => {
    if (!enrollment.courses) return;

    const course = enrollment.courses;
    const grade = enrollment.grades;

    if (!grade || !['PUBLISHED', 'IN_PROGRESS'].includes(grade.status)) return;

    const year = course.year;
    const semester = course.semester;

    let termKey: string;
    if (semester === 'FALL') {
      const nextYear = (year + 1).toString().slice(-2);
      termKey = `${year}-${nextYear} Term 1`;
    } else if (semester === 'SPRING') {
      const prevYear = year - 1;
      const currentYearShort = year.toString().slice(-2);
      termKey = `${prevYear}-${currentYearShort} Term 2`;
    } else {
      const prevYear = year - 1;
      const currentYearShort = year.toString().slice(-2);
      termKey = `${prevYear}-${currentYearShort} Summer`;
    }

    if (!termMap.has(termKey)) {
      termMap.set(termKey, []);
    }

    const isMajorCourse = majorDepartment ? course.department === majorDepartment : false;

    termMap.get(termKey)!.push({
      courseCode: course.course_code,
      courseName: course.course_name,
      credits: course.credits,
      grade: grade.letter_grade || 'IP',
      gradePoints: grade.grade_points,
      percentAMinus: 0, // Placeholder - would need to calculate from all enrollments in that course
      isMajorCourse,
    });
  });

  // Calculate cumulative stats
  const termData: TermData[] = [];
  let cumulativeUnits = 0;
  let cumulativeQualityPoints = 0;
  let cumulativeCredits = 0;

  // Sort terms chronologically
  const sortedTerms = Array.from(termMap.entries()).sort((a, b) => {
    const termNameA = a[0];
    const termNameB = b[0];

    // Extract year part (e.g., "2022-23" from "2022-23 Term 1")
    const yearMatchA = termNameA.match(/^(\d{4}-\d{2})/);
    const yearMatchB = termNameB.match(/^(\d{4}-\d{2})/);
    const yearA = yearMatchA ? yearMatchA[1] : '';
    const yearB = yearMatchB ? yearMatchB[1] : '';

    if (yearA !== yearB) return yearA.localeCompare(yearB);

    // Term order: Term 1 < Term 2 < Summer
    const termOrderA = termNameA.includes('Term 1') ? 1 : termNameA.includes('Term 2') ? 2 : 3;
    const termOrderB = termNameB.includes('Term 1') ? 1 : termNameB.includes('Term 2') ? 2 : 3;
    return termOrderA - termOrderB;
  });

  sortedTerms.forEach(([termName, courses]) => {
    let termUnits = 0;
    let termQualityPoints = 0;
    let termCredits = 0;

    courses.forEach((course) => {
      if (!['W', 'F', 'IP'].includes(course.grade)) {
        termUnits += course.credits;
        cumulativeUnits += course.credits;
      }

      // Exclude withdrawn courses (W) from GPA calculation
      if (
        course.gradePoints !== null &&
        course.gradePoints !== undefined &&
        course.grade.toUpperCase() !== 'W'
      ) {
        termQualityPoints += course.gradePoints * course.credits;
        termCredits += course.credits;

        cumulativeQualityPoints += course.gradePoints * course.credits;
        cumulativeCredits += course.credits;
      }
    });

    const termGPA = termCredits > 0 ? termQualityPoints / termCredits : 0;
    const cumulativeGPA = cumulativeCredits > 0 ? cumulativeQualityPoints / cumulativeCredits : 0;

    termData.push({
      termName,
      courses,
      unitsPassedThisTerm: termUnits,
      termGPA,
      cumulativeUnitsPassed: cumulativeUnits,
      cumulativeGPA,
    });
  });

  return termData;
}

// Calculate cumulative GPA
function calculateCumulativeGPA(enrollments: any[]): number {
  let totalQualityPoints = 0;
  let totalCredits = 0;

  enrollments.forEach((enrollment) => {
    const grade = enrollment.grades;
    const credits = enrollment.courses.credits;

    // Exclude withdrawn courses (W) from GPA calculation
    if (grade && grade.letter_grade && grade.letter_grade.toUpperCase() === 'W') {
      return;
    }

    if (grade && grade.grade_points !== null && grade.grade_points !== undefined) {
      totalQualityPoints += grade.grade_points * credits;
      totalCredits += credits;
    }
  });

  return totalCredits > 0 ? totalQualityPoints / totalCredits : 0;
}

// Calculate Major GPA (courses from the same department as the major)
function calculateMajorGPA(enrollments: any[], majorDepartment?: string | null): number {
  if (!majorDepartment) return 0;

  let totalQualityPoints = 0;
  let totalCredits = 0;

  enrollments.forEach((enrollment) => {
    const course = enrollment.courses;
    const grade = enrollment.grades;
    const credits = course.credits;

    // Exclude withdrawn courses (W) from GPA calculation
    if (grade && grade.letter_grade && grade.letter_grade.toUpperCase() === 'W') {
      return;
    }

    // Only include courses from the same department as the major
    if (
      course.department === majorDepartment &&
      grade &&
      grade.grade_points !== null &&
      grade.grade_points !== undefined
    ) {
      totalQualityPoints += grade.grade_points * credits;
      totalCredits += credits;
    }
  });

  return totalCredits > 0 ? totalQualityPoints / totalCredits : 0;
}

/**
 * Get GPA information
 */
export async function getGPA(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    // Calculate GPA directly from grades
    const enrollmentsWithGrades = await prisma.enrollments.findMany({
      where: {
        user_id: userId,
        grades: {
          status: 'PUBLISHED',
          grade_points: {
            not: null
          }
        }
      },
      include: {
        grades: true,
        courses: {
          select: {
            credits: true,
          }
        }
      },
    });

    let totalQualityPoints = 0;
    let totalCredits = 0;

    enrollmentsWithGrades.forEach(enrollment => {
      // Exclude withdrawn courses (W) from GPA calculation
      if (enrollment.grades?.letter_grade && enrollment.grades.letter_grade.toUpperCase() === 'W') {
        return;
      }

      if (enrollment.grades?.grade_points !== null && enrollment.grades?.grade_points !== undefined) {
        const credits = enrollment.courses.credits || 0;
        totalQualityPoints += enrollment.grades.grade_points * credits;
        totalCredits += credits;
      }
    });

    const cumulativeGPA = totalCredits > 0 ? totalQualityPoints / totalCredits : 0;

    // Determine academic standing
    let academicStanding = 'N/A';
    if (cumulativeGPA >= 3.5) academicStanding = 'Dean\'s List';
    else if (cumulativeGPA >= 3.0) academicStanding = 'Good Standing';
    else if (cumulativeGPA >= 2.0) academicStanding = 'Satisfactory';
    else if (cumulativeGPA > 0) academicStanding = 'Academic Warning';

    res.json({
      success: true,
      data: {
        cumulativeGPA: Math.round(cumulativeGPA * 100) / 100,
        totalCredits: totalCredits,
        earnedCredits: totalCredits,
        academicStanding: academicStanding,
        qualityPoints: Math.round(totalQualityPoints * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error('Get GPA error:', error);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GPA',
      error: error.message || 'Unknown error',
    });
  }
}

/**
 * Get GPA history over multiple terms
 */
export async function getGPAHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const transcripts = await prisma.transcripts.findMany({
      where: { user_id: userId },
      orderBy: [
        { year: 'asc' },
        { semester: 'asc' },
      ],
      select: {
        term_gpa: true,
        gpa: true,
        total_credits: true,
        academic_standing: true,
        semester: true,
        year: true,
      },
    });

    res.json({
      success: true,
      data: transcripts.map(t => {
        const semester = t.semester || null;
        const year = t.year || null;
        return {
          term: semester && year ? `${semester} ${year}` : 'Unknown',
          semester,
          year,
          termGPA: t.term_gpa,
          cumulativeGPA: t.gpa,
          totalCredits: t.total_credits,
          academicStanding: t.academic_standing,
        };
      }),
    });
  } catch (error) {
    console.error('Get GPA history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GPA history',
    });
  }
}
