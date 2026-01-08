import { prisma } from '../config/prisma';
import { enrollmentQueue } from '../config/queue';
import { EnrollmentStatus, Prisma, Semester } from '@prisma/client';
import { ValidationError } from '../utils/errors';
import { getCurrentTerm } from '../utils/helpers';

/**
 * Enrollment Service with Concurrency Control
 * Implements queue-based enrollment with optimistic locking to prevent race conditions
 */

/**
 * Queue an enrollment request
 * This prevents direct database writes and ensures sequential processing
 */
export async function queueEnrollment(userId: number, courseId: number) {
  // Check if user already has an enrollment for this course
  const existingEnrollment = await prisma.enrollments.findUnique({
    where: {
      user_id_course_id: {
        user_id: userId,
        course_id: courseId
      }
    }
  });

  if (existingEnrollment) {
    if (existingEnrollment.status === EnrollmentStatus.CONFIRMED) {
      throw new ValidationError('You are already enrolled in this course');
    }
    if (existingEnrollment.status === EnrollmentStatus.PENDING) {
      throw new ValidationError('You already have a pending enrollment request for this course');
    }
    if (existingEnrollment.status === EnrollmentStatus.WAITLISTED) {
      throw new ValidationError('You are already on the waitlist for this course');
    }
  }

  // Check course exists
  const course = await prisma.courses.findUnique({
    where: { id: courseId },
    select: { id: true, course_code: true, course_name: true, status: true }
  });

  if (!course) {
    throw new ValidationError('Course not found');
  }

  if (course.status === 'INACTIVE') {
    throw new ValidationError('This course is not available for enrollment');
  }

  // Add to queue
  const job = await enrollmentQueue.add(
    {
      student_id: userId,
      course_id: courseId,
      attempt: 1,
      timestamp: new Date()
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: false, // Keep job data for status checking
      removeOnFail: false
    }
  );

  return {
    jobId: job.id,
    message: 'Enrollment request queued successfully',
    estimatedWaitTime: await estimateWaitTime()
  };
}

/**
 * Process enrollment (called by worker)
 * Implements the core enrollment logic with all business rules
 */
export async function processEnrollment(userId: number, courseId: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock and fetch the course with current version
    const course = await tx.courses.findUnique({
      where: { id: courseId },
      include: {
        time_slots: true,
        users: {
          select: {
            full_name: true
          }
        }
      }
    });

    if (!course) {
      throw new ValidationError('Course not found');
    }

    if (course.status === 'INACTIVE') {
      throw new ValidationError('Course is inactive');
    }

    // 2. Fetch user
    const user = await tx.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // 2b. Check for existing enrollment (prevents duplicate enrollments on retry)
    const existingEnrollment = await tx.enrollments.findUnique({
      where: {
        user_id_course_id: {
          user_id: userId,
          course_id: courseId
        }
      }
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === EnrollmentStatus.CONFIRMED) {
        throw new ValidationError('You are already enrolled in this course');
      }
      if (existingEnrollment.status === EnrollmentStatus.PENDING) {
        throw new ValidationError('You already have a pending enrollment request for this course');
      }
      if (existingEnrollment.status === EnrollmentStatus.WAITLISTED) {
        throw new ValidationError('You are already on the waitlist for this course');
      }
      if (existingEnrollment.status === EnrollmentStatus.REJECTED) {
        // Delete rejected enrollment so we can try again
        await tx.enrollments.delete({
          where: { id: existingEnrollment.id }
        });
      }
    }

    // 3. Check prerequisites
    if (course.prerequisites) {
      // Parse prerequisites (comma-separated course codes)
      const requiredCourses = course.prerequisites.split(',').map((c: string) => c.trim());

      const completedCourses = await tx.enrollments.findMany({
        where: {
          user_id: userId,
          status: EnrollmentStatus.CONFIRMED,
          grades: {
            isNot: null
          }
        },
        include: {
          courses: {
            select: {
              course_code: true
            }
          }
        }
      });

      const completedCourseCodes = completedCourses.map((e: any) => e.courses.course_code);

      const missingPrereqs = requiredCourses.filter(
        (req: string) => !completedCourseCodes.includes(req)
      );

      if (missingPrereqs.length > 0) {
        throw new ValidationError(`Missing prerequisites: ${missingPrereqs.join(', ')}`);
      }
    }

    // 4. Check time conflicts (lectures and tutorials cannot overlap)
    const userEnrollments = await tx.enrollments.findMany({
      where: {
        user_id: userId,
        status: EnrollmentStatus.CONFIRMED
      },
      include: {
        courses: {
          include: {
            time_slots: true
          }
        }
      }
    });

    const existingSlots = userEnrollments.flatMap((e: any) => e.courses.time_slots);
    const newSlots = course.time_slots;

    const hasConflict = checkTimeConflict(existingSlots, newSlots);

    if (hasConflict) {
      // Create rejected enrollment
      const enrollment = await tx.enrollments.create({
        data: {
          user_id: userId,
          course_id: courseId,
          status: EnrollmentStatus.REJECTED,
          updated_at: new Date()
        }
      });

      await createAuditLog(tx, userId, 'ENROLL_REJECTED', enrollment.id, {
        reason: 'Time conflict detected with existing schedule'
      });

      throw new ValidationError('Time conflict detected: You cannot enroll in sessions that overlap with your existing schedule');
    }

    // 5. Check credit limit (optional business rule)
    const currentSemesterEnrollments = await tx.enrollments.findMany({
      where: {
        user_id: userId,
        status: EnrollmentStatus.CONFIRMED,
        courses: {
          semester: course.semester,
          year: course.year
        }
      },
      include: {
        courses: {
          select: {
            credits: true
          }
        }
      }
    });

    const currentCredits = currentSemesterEnrollments.reduce(
      (sum: number, e: any) => sum + e.courses.credits,
      0
    );

    const maxCredits = parseInt(process.env.MAX_CREDITS_PER_SEMESTER || '18');

    if (currentCredits + course.credits > maxCredits) {
      throw new ValidationError(`Enrollment would exceed maximum credits (${maxCredits}) for this semester`);
    }

    // 6. Check capacity with optimistic locking
    if (course.current_enrollment >= course.max_capacity) {
      // Add to waitlist
      const waitlistCount = await tx.enrollments.count({
        where: {
          course_id: courseId,
          status: EnrollmentStatus.WAITLISTED
        }
      });

      const enrollment = await tx.enrollments.create({
        data: {
          user_id: userId,
          course_id: courseId,
          status: EnrollmentStatus.WAITLISTED,
          waitlist_position: waitlistCount + 1,
          updated_at: new Date()
        },
        include: {
          courses: {
            select: {
              course_code: true,
              course_name: true
            }
          }
        }
      });

      await createAuditLog(tx, userId, 'WAITLISTED', enrollment.id, {
        courseId,
        waitlistPosition: enrollment.waitlist_position
      });

      return {
        success: true,
        status: 'WAITLISTED',
        enrollment,
        message: `You have been added to the waitlist at position ${enrollment.waitlist_position}`
      };
    }

    // 7. Enroll with version check (optimistic locking)
    const updatedCourse = await tx.courses.updateMany({
      where: {
        id: courseId,
        version: course.version // Optimistic locking check
      },
      data: {
        current_enrollment: {
          increment: 1
        },
        version: {
          increment: 1
        },
        status: course.current_enrollment + 1 >= course.max_capacity ? 'FULL' : course.status
      }
    });

    if (updatedCourse.count === 0) {
      // Version mismatch - concurrent modification detected
      throw new Error('Concurrent modification detected. Please retry your enrollment.');
    }

    // 8. Create confirmed enrollment
    const enrollment = await tx.enrollments.create({
      data: {
        user_id: userId,
        course_id: courseId,
        status: EnrollmentStatus.CONFIRMED,
        updated_at: new Date()
      },
      include: {
        courses: {
          select: {
            course_code: true,
            course_name: true,
            credits: true,
            users: {
              select: {
                full_name: true
              }
            }
          }
        }
      }
    });

    // 9. Create audit log
    await createAuditLog(tx, userId, 'ENROLL', enrollment.id, {
      courseId,
      courseCode: course.course_code,
      status: 'CONFIRMED'
    });

    return {
      success: true,
      status: 'CONFIRMED',
      enrollment,
      message: 'Successfully enrolled in course'
    };
  }, {
    maxWait: 10000, // 10 seconds
    timeout: 30000, // 30 seconds
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  });
}

/**
 * Drop a course
 */
export async function dropEnrollment(enrollmentId: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollments.findFirst({
      where: {
        id: enrollmentId,
        user_id: userId
      },
      include: {
        courses: true
      }
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status === EnrollmentStatus.DROPPED) {
      throw new Error('Course already dropped');
    }

    // Update enrollment status to DROPPED
    await tx.enrollments.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.DROPPED }
    });

    // If was confirmed, decrement course enrollment and process waitlist
    if (enrollment.status === EnrollmentStatus.CONFIRMED) {
      await tx.courses.update({
        where: { id: enrollment.course_id },
        data: {
          current_enrollment: {
            decrement: 1
          },
          version: {
            increment: 1
          },
          status: 'ACTIVE' // Reopen course if it was full
        }
      });

      // Promote next waitlisted student
      await promoteFromWaitlist(tx, enrollment.course_id);
    }

    // Create audit log
    await createAuditLog(tx, userId, 'DROP', enrollmentId, {
      courseId: enrollment.course_id,
      courseCode: enrollment.courses.course_code
    });

    return {
      success: true,
      message: 'Course dropped successfully'
    };
  });
}

/**
 * Get user's enrollments
 * @param userId - User ID
 * @param options - Optional filters for semester and year
 */
export async function getUserEnrollments(
  userId: number,
  options?: { semester?: Semester; year?: number }
) {
  const whereClause: Prisma.enrollmentsWhereInput = {
    user_id: userId,
    status: {
      in: [EnrollmentStatus.CONFIRMED, EnrollmentStatus.PENDING, EnrollmentStatus.WAITLISTED]
    }
  };

  // Filter by term if provided
  if (options?.semester || options?.year) {
    whereClause.courses = {
      ...(options.semester && { semester: options.semester }),
      ...(options.year && { year: options.year })
    };
  }

  const enrollments = await prisma.enrollments.findMany({
    where: whereClause,
    include: {
      courses: {
        include: {
          users: {
            select: {
              full_name: true
            }
          },
          time_slots: true
        }
      }
    },
    orderBy: {
      enrolled_at: 'desc'
    }
  });

  return enrollments;
}

/**
 * Get user's enrollments for the current term
 */
export async function getCurrentTermEnrollments(userId: number) {
  const { semester, year } = getCurrentTerm();
  return getUserEnrollments(userId, { semester, year });
}

/**
 * Get exam schedules for user's enrolled courses
 * Returns exam schedules for courses the user is currently enrolled in
 */
export async function getExamSchedules(userId: number, currentTermOnly: boolean = true, allSchedules: boolean = false) {
  // Get user's enrollments (only needed if not showing all schedules)
  let courseCodes: string[] = [];
  
  if (!allSchedules) {
    const enrollments = currentTermOnly
      ? await getCurrentTermEnrollments(userId)
      : await getUserEnrollments(userId);

    // Extract course codes from enrollments
    courseCodes = enrollments
      .filter(e => e.status === EnrollmentStatus.CONFIRMED)
      .map(e => e.courses.course_code);

    if (courseCodes.length === 0) {
      return [];
    }
  }

  // Get exam schedules
  const { semester, year } = getCurrentTerm();
  // Database uses format like "2025-26 Term 1", so we need to match that format
  const termNumber = semester === Semester.FALL ? '1' : semester === Semester.SPRING ? '2' : '3';
  // Construct academic year format (e.g., "2025-26" for year 2025)
  const academicYearStr = `${year}-${String(year + 1).slice(-2)}`;
  const term = `${academicYearStr} Term ${termNumber}`;

  const examSchedules = await (prisma as any).exam_schedules.findMany({
    where: {
      ...(allSchedules ? {} : {
        course_code: {
          in: courseCodes
        }
      }),
      ...(currentTermOnly ? {
        term: term,
        year: year
      } : {})
    },
    orderBy: [
      { exam_date: 'asc' },
      { start_time: 'asc' }
    ]
  });

  // Deduplicate: keep only the first exam schedule per course_code per term
  // This handles cases where duplicate exam schedules exist in the database
  const uniqueExams = new Map<string, any>();
  for (const exam of examSchedules) {
    const key = `${exam.course_code}_${exam.term}_${exam.year}`;
    if (!uniqueExams.has(key)) {
      uniqueExams.set(key, exam);
    }
  }

  return Array.from(uniqueExams.values()).map((exam: any) => ({
    id: exam.id,
    courseCode: exam.course_code,
    courseName: exam.course_name,
    examDate: exam.exam_date,
    startTime: exam.start_time,
    endTime: exam.end_time,
    location: exam.location,
    term: exam.term,
    year: exam.year
  }));
}

/**
 * Get enrollment job status
 */
export async function getEnrollmentJobStatus(jobId: string) {
  const job = await enrollmentQueue.getJob(jobId);

  if (!job) {
    return { status: 'not_found', message: 'Job not found' };
  }

  const state = await job.getState();
  const progress = job.progress();

  if (state === 'completed') {
    return {
      status: 'completed',
      result: job.returnvalue,
      message: 'Enrollment processed successfully'
    };
  }

  if (state === 'failed') {
    return {
      status: 'failed',
      error: job.failedReason,
      message: 'Enrollment failed'
    };
  }

  return {
    status: state,
    progress,
    message: 'Enrollment is being processed'
  };
}

/**
 * Helper: Check time conflicts
 */
function checkTimeConflict(existingSlots: any[], newSlots: any[]): boolean {
  for (const existing of existingSlots) {
    for (const newSlot of newSlots) {
      if (existing.day_of_week === newSlot.day_of_week) {
        const existingStart = timeToMinutes(existing.start_time);
        const existingEnd = timeToMinutes(existing.end_time);
        const newStart = timeToMinutes(newSlot.start_time);
        const newEnd = timeToMinutes(newSlot.end_time);

        // Check for overlap
        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Helper: Convert time string to minutes
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper: Promote next student from waitlist
 */
async function promoteFromWaitlist(tx: any, courseId: number) {
  const nextWaitlisted = await tx.enrollments.findFirst({
    where: {
      course_id: courseId,
      status: EnrollmentStatus.WAITLISTED
    },
    orderBy: {
      waitlist_position: 'asc'
    }
  });

  if (nextWaitlisted) {
    // Update enrollment to confirmed
    await tx.enrollments.update({
      where: { id: nextWaitlisted.id },
      data: {
        status: EnrollmentStatus.CONFIRMED,
        waitlist_position: null
      }
    });

    // Increment course enrollment
    await tx.courses.update({
      where: { id: courseId },
      data: {
        current_enrollment: {
          increment: 1
        },
        version: {
          increment: 1
        }
      }
    });

    // Update remaining waitlist positions
    await tx.enrollments.updateMany({
      where: {
        course_id: courseId,
        status: EnrollmentStatus.WAITLISTED
      },
      data: {
        waitlist_position: {
          decrement: 1
        }
      }
    });

    // Create audit log
    await createAuditLog(tx, nextWaitlisted.user_id, 'PROMOTED_FROM_WAITLIST', nextWaitlisted.id, {
      courseId
    });
  }
}

/**
 * Helper: Create audit log
 */
async function createAuditLog(tx: any, userId: number, action: string, entityId: number, changes: any) {
  await tx.audit_logs.create({
    data: {
      user_id: userId,
      action,
      entity_type: 'enrollment',
      entity_id: entityId,
      changes
    }
  });
}

/**
 * Helper: Estimate wait time
 */
async function estimateWaitTime(): Promise<number> {
  const waitingCount = await enrollmentQueue.getWaitingCount();
  const activeCount = await enrollmentQueue.getActiveCount();

  // Estimate ~2 seconds per enrollment
  return (waitingCount + activeCount) * 2;
}

/**
 * Get course waitlist
 */
export async function getCourseWaitlist(courseId: number) {
  const waitlist = await prisma.enrollments.findMany({
    where: {
      course_id: courseId,
      status: EnrollmentStatus.WAITLISTED
    },
    include: {
      users: {
        select: {
          user_identifier: true,
          full_name: true
        }
      }
    },
    orderBy: {
      waitlist_position: 'asc'
    }
  });

  return waitlist;
}
