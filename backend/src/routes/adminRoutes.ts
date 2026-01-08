import { Router } from 'express';
import {
  // Course Management
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  updateCourseDetails,
  updateCourseTimeSlots,
  deleteCourse,
  getCourseEnrollments,
  // Student Management
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus,
  deleteStudent,
  getStudentPersonalInfo,
  updateStudentPersonalInfo,
  // Enrollment Management
  getEnrollments,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment,
  bulkApproveEnrollments,
  dropEnrollment,
  createEnrollment,
  // Grade Management
  getPendingGrades,
  approveGrade,
  bulkApproveGrades,
  publishGrades,
  // User Management
  getAllUsers,
  getUserById,
  updateUser,
  updateUserPersonalInfo,
  updateUserStudentInfo,
  updateUserFacultyInfo,
  // Statistics
  getSystemStatistics,
  getEnrollmentStatistics,
  getGradeStatistics,
  getAdminReports,
  // Waitlist Management
  getCourseWaitlist,
  promoteFromWaitlist,
  // Conflict Detection
  checkConflicts,
  // Program Management
  getPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  // Bulk Operations
  bulkImportStudents,
  exportStudents,
  // Email Notifications
  sendEmail,
  sendBulkEmail,
  // Transcript Generation
  generateTranscript,
  // Academic Calendar
  getAcademicTerms,
  createAcademicTerm,
  updateAcademicTerm,
  // Campus Information
  createAnnouncement,
  createEvent,
  // Exam Schedule Management
  getAllExamSchedules,
  getExamScheduleById,
  createExamSchedule,
  updateExamSchedule,
  deleteExamSchedule,
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);
router.use(adminLimiter);

/**
 * ================
 * COURSE MANAGEMENT
 * ================
 */

/**
 * @route   POST /api/admin/courses
 * @desc    Create a new course
 * @access  Private (Admin)
 */
router.post('/courses', asyncHandler(createCourse));

/**
 * @route   GET /api/admin/courses
 * @desc    Get all courses with full details
 * @access  Private (Admin)
 */
router.get('/courses', asyncHandler(getAllCourses));

/**
 * @route   GET /api/admin/courses/:id
 * @desc    Get course by ID with full details
 * @access  Private (Admin)
 */
router.get('/courses/:id', asyncHandler(getCourseById));

/**
 * @route   PUT /api/admin/courses/:id
 * @desc    Update course basic information
 * @access  Private (Admin)
 */
router.put('/courses/:id', asyncHandler(updateCourse));

/**
 * @route   PUT /api/admin/courses/:id/details
 * @desc    Update course comprehensive details (code, name, instructor, etc.)
 * @access  Private (Admin)
 */
router.put('/courses/:id/details', asyncHandler(updateCourseDetails));

/**
 * @route   PUT /api/admin/courses/:id/time-slots
 * @desc    Update course time slots
 * @access  Private (Admin)
 */
router.put('/courses/:id/time-slots', asyncHandler(updateCourseTimeSlots));

/**
 * @route   DELETE /api/admin/courses/:id
 * @desc    Delete course
 * @access  Private (Admin)
 */
router.delete('/courses/:id', asyncHandler(deleteCourse));

/**
 * @route   GET /api/admin/courses/:id/enrollments
 * @desc    Get all enrollments for a specific course
 * @access  Private (Admin)
 */
router.get('/courses/:id/enrollments', asyncHandler(getCourseEnrollments));

/**
 * ================
 * STUDENT MANAGEMENT
 * ================
 */

/**
 * @route   GET /api/admin/students
 * @desc    Get all students with filters
 * @access  Private (Admin)
 */
router.get('/students', asyncHandler(getStudents));

/**
 * @route   GET /api/admin/students/:id
 * @desc    Get student by ID with full details
 * @access  Private (Admin)
 */
router.get('/students/:id', asyncHandler(getStudentById));

/**
 * @route   POST /api/admin/students
 * @desc    Create a new student
 * @access  Private (Admin)
 */
router.post('/students', asyncHandler(createStudent));

/**
 * @route   PUT /api/admin/students/:id
 * @desc    Update student information
 * @access  Private (Admin)
 */
router.put('/students/:id', asyncHandler(updateStudent));

/**
 * @route   PUT /api/admin/students/:id/status
 * @desc    Update student status
 * @access  Private (Admin)
 */
router.put('/students/:id/status', asyncHandler(updateStudentStatus));

/**
 * @route   DELETE /api/admin/students/:id
 * @desc    Delete (soft delete) student
 * @access  Private (Admin)
 */
router.delete('/students/:id', asyncHandler(deleteStudent));

/**
 * @route   GET /api/admin/students/:id/personal-info
 * @desc    Get student personal information
 * @access  Private (Admin)
 */
router.get('/students/:id/personal-info', asyncHandler(getStudentPersonalInfo));

/**
 * @route   PUT /api/admin/students/:id/personal-info
 * @desc    Update student personal information
 * @access  Private (Admin)
 */
router.put('/students/:id/personal-info', asyncHandler(updateStudentPersonalInfo));

/**
 * ================
 * ENROLLMENT MANAGEMENT
 * ================
 */

/**
 * @route   GET /api/admin/enrollments
 * @desc    Get all enrollments with filters
 * @access  Private (Admin)
 */
router.get('/enrollments', asyncHandler(getEnrollments));

/**
 * @route   GET /api/admin/enrollments/pending
 * @desc    Get pending enrollment approvals
 * @access  Private (Admin)
 */
router.get('/enrollments/pending', asyncHandler(getPendingEnrollments));

/**
 * @route   POST /api/admin/enrollments
 * @desc    Create manual enrollment
 * @access  Private (Admin)
 */
router.post('/enrollments', asyncHandler(createEnrollment));

/**
 * @route   POST /api/admin/enrollments/:id/approve
 * @desc    Approve enrollment
 * @access  Private (Admin)
 */
router.post('/enrollments/:id/approve', asyncHandler(approveEnrollment));

/**
 * @route   POST /api/admin/enrollments/:id/reject
 * @desc    Reject enrollment
 * @access  Private (Admin)
 */
router.post('/enrollments/:id/reject', asyncHandler(rejectEnrollment));

/**
 * @route   POST /api/admin/enrollments/bulk-approve
 * @desc    Bulk approve enrollments
 * @access  Private (Admin)
 */
router.post('/enrollments/bulk-approve', asyncHandler(bulkApproveEnrollments));

/**
 * @route   DELETE /api/admin/enrollments/:id
 * @desc    Drop student from course
 * @access  Private (Admin)
 */
router.delete('/enrollments/:id', asyncHandler(dropEnrollment));

/**
 * ================
 * GRADE MANAGEMENT
 * ================
 */

/**
 * @route   GET /api/admin/grades/pending
 * @desc    Get pending grade approvals
 * @access  Private (Admin)
 */
router.get('/grades/pending', asyncHandler(getPendingGrades));

/**
 * @route   POST /api/admin/grades/:id/approve
 * @desc    Approve grade
 * @access  Private (Admin)
 */
router.post('/grades/:id/approve', asyncHandler(approveGrade));

/**
 * @route   POST /api/admin/grades/bulk-approve
 * @desc    Bulk approve grades
 * @access  Private (Admin)
 */
router.post('/grades/bulk-approve', asyncHandler(bulkApproveGrades));

/**
 * @route   POST /api/admin/grades/publish
 * @desc    Publish grades
 * @access  Private (Admin)
 */
router.post('/grades/publish', asyncHandler(publishGrades));

/**
 * ================
 * USER MANAGEMENT
 * ================
 */

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with optional role filter
 * @access  Private (Admin)
 */
router.get('/users', asyncHandler(getAllUsers));

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID with full details (including personal info, student/faculty info)
 * @access  Private (Admin)
 */
router.get('/users/:id', asyncHandler(getUserById));

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user basic information (name, email, identifier, role, etc.)
 * @access  Private (Admin)
 */
router.put('/users/:id', asyncHandler(updateUser));

/**
 * @route   PUT /api/admin/users/:id/personal-info
 * @desc    Update user personal information (contact, address, emergency contacts, etc.)
 * @access  Private (Admin)
 */
router.put('/users/:id/personal-info', asyncHandler(updateUserPersonalInfo));

/**
 * @route   PUT /api/admin/users/:id/student-info
 * @desc    Update student-specific information (student ID, major, advisor, year, etc.)
 * @access  Private (Admin)
 */
router.put('/users/:id/student-info', asyncHandler(updateUserStudentInfo));

/**
 * @route   PUT /api/admin/users/:id/faculty-info
 * @desc    Update faculty-specific information (employee ID, title, office, research areas, etc.)
 * @access  Private (Admin)
 */
router.put('/users/:id/faculty-info', asyncHandler(updateUserFacultyInfo));

/**
 * ================
 * STATISTICS & ANALYTICS
 * ================
 */

/**
 * @route   GET /api/admin/statistics
 * @desc    Get system statistics
 * @access  Private (Admin)
 */
router.get('/statistics', asyncHandler(getSystemStatistics));

/**
 * @route   GET /api/admin/statistics/enrollments
 * @desc    Get enrollment statistics
 * @access  Private (Admin)
 */
router.get('/statistics/enrollments', asyncHandler(getEnrollmentStatistics));

/**
 * @route   GET /api/admin/statistics/grades
 * @desc    Get grade distribution statistics
 * @access  Private (Admin)
 */
router.get('/statistics/grades', asyncHandler(getGradeStatistics));

/**
 * @route   GET /api/admin/reports
 * @desc    Get aggregated analytics reports
 * @access  Private (Admin)
 */
router.get('/reports', asyncHandler(getAdminReports));

/**
 * ================
 * WAITLIST MANAGEMENT
 * ================
 */

/**
 * @route   GET /api/admin/courses/:id/waitlist
 * @desc    Get course waitlist
 * @access  Private (Admin)
 */
router.get('/courses/:id/waitlist', asyncHandler(getCourseWaitlist));

/**
 * @route   POST /api/admin/enrollments/:id/promote
 * @desc    Promote student from waitlist
 * @access  Private (Admin)
 */
router.post('/enrollments/:id/promote', asyncHandler(promoteFromWaitlist));

/**
 * ================
 * CONFLICT DETECTION
 * ================
 */

/**
 * @route   POST /api/admin/conflicts/check
 * @desc    Check for schedule and enrollment conflicts
 * @access  Private (Admin)
 */
router.post('/conflicts/check', asyncHandler(checkConflicts));

/**
 * ================
 * DEGREE AUDIT
 * ================
 */

/**
 * @route   GET /api/admin/students/:id/degree-audit
 * @desc    Get degree audit for student
 * @access  Private (Admin)
 */

/**
 * ================
 * PROGRAM MANAGEMENT
 * ================
 */

/**
 * @route   GET /api/admin/programs
 * @desc    Get all programs/majors
 * @access  Private (Admin)
 */
router.get('/programs', asyncHandler(getPrograms));

/**
 * @route   GET /api/admin/programs/:id
 * @desc    Get program by ID
 * @access  Private (Admin)
 */
router.get('/programs/:id', asyncHandler(getProgramById));

/**
 * @route   POST /api/admin/programs
 * @desc    Create new program
 * @access  Private (Admin)
 */
router.post('/programs', asyncHandler(createProgram));

/**
 * @route   PUT /api/admin/programs/:id
 * @desc    Update program
 * @access  Private (Admin)
 */
router.put('/programs/:id', asyncHandler(updateProgram));

/**
 * ================
 * BULK OPERATIONS
 * ================
 */

/**
 * @route   POST /api/admin/students/import
 * @desc    Bulk import students from CSV
 * @access  Private (Admin)
 */
router.post('/students/import', asyncHandler(bulkImportStudents));

/**
 * @route   GET /api/admin/students/export
 * @desc    Export students to CSV
 * @access  Private (Admin)
 */
router.get('/students/export', asyncHandler(exportStudents));

/**
 * ================
 * EMAIL NOTIFICATIONS
 * ================
 */

/**
 * @route   POST /api/admin/emails/send
 * @desc    Send email to specific students
 * @access  Private (Admin)
 */
router.post('/emails/send', asyncHandler(sendEmail));

/**
 * @route   POST /api/admin/emails/bulk
 * @desc    Send bulk email to students by filter
 * @access  Private (Admin)
 */
router.post('/emails/bulk', asyncHandler(sendBulkEmail));

/**
 * ================
 * TRANSCRIPT GENERATION
 * ================
 */

/**
 * @route   GET /api/admin/transcripts/:studentId/generate
 * @desc    Generate transcript for student
 * @access  Private (Admin)
 */
router.get('/transcripts/:studentId/generate', asyncHandler(generateTranscript));

/**
 * ================
 * ACADEMIC CALENDAR
 * ================
 */

/**
 * @route   GET /api/admin/calendar/terms
 * @desc    Get all academic terms
 * @access  Private (Admin)
 */
router.get('/calendar/terms', asyncHandler(getAcademicTerms));

/**
 * @route   POST /api/admin/calendar/terms
 * @desc    Create academic term
 * @access  Private (Admin)
 */
router.post('/calendar/terms', asyncHandler(createAcademicTerm));

/**
 * @route   PUT /api/admin/calendar/terms/:id
 * @desc    Update academic term
 * @access  Private (Admin)
 */
router.put('/calendar/terms/:id', asyncHandler(updateAcademicTerm));

/**
 * ================
 * CAMPUS INFORMATION
 * ================
 */

/**
 * @route   POST /api/admin/announcements
 * @desc    Create a new announcement
 * @access  Private (Admin)
 */
router.post('/announcements', asyncHandler(createAnnouncement));

/**
 * @route   POST /api/admin/events
 * @desc    Create a new event
 * @access  Private (Admin)
 */
router.post('/events', asyncHandler(createEvent));

/**
 * ===================
 * EXAM SCHEDULE MANAGEMENT
 * ===================
 */

/**
 * @route   GET /api/admin/exam-schedules
 * @desc    Get all exam schedules
 * @access  Private (Admin)
 */
router.get('/exam-schedules', asyncHandler(getAllExamSchedules));

/**
 * @route   GET /api/admin/exam-schedules/:id
 * @desc    Get exam schedule by ID
 * @access  Private (Admin)
 */
router.get('/exam-schedules/:id', asyncHandler(getExamScheduleById));

/**
 * @route   POST /api/admin/exam-schedules
 * @desc    Create a new exam schedule
 * @access  Private (Admin)
 */
router.post('/exam-schedules', asyncHandler(createExamSchedule));

/**
 * @route   PUT /api/admin/exam-schedules/:id
 * @desc    Update exam schedule
 * @access  Private (Admin)
 */
router.put('/exam-schedules/:id', asyncHandler(updateExamSchedule));

/**
 * @route   DELETE /api/admin/exam-schedules/:id
 * @desc    Delete exam schedule
 * @access  Private (Admin)
 */
router.delete('/exam-schedules/:id', asyncHandler(deleteExamSchedule));

export default router;
