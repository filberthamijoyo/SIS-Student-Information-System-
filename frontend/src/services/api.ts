import axios from 'axios';

/**
 * API Service Layer
 * Handles all HTTP requests to the backend
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface LoginData {
  userIdentifier?: string;
  email?: string;
  password: string;
}

export interface RegisterData {
  userIdentifier: string;
  email: string;
  password: string;
  fullName: string;
  role?: string;
  major?: string;
  yearLevel?: number;
}

export interface CourseFilters {
  search?: string;
  department?: string;
  semester?: string;
  year?: number;
  credits?: number;
  availableOnly?: boolean;
}

// Auth API
export const authAPI = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

// Course API
export const courseAPI = {
  getAll: (params?: CourseFilters) => api.get('/courses', { params }),
  getById: (id: number) => api.get(`/courses/${id}`),
  search: (query: string) => api.get('/courses/search', { params: { q: query } }),
  getDepartments: () => api.get('/courses/departments'),
};

// Enrollment API
export const enrollmentAPI = {
  enroll: (courseId: number) => api.post('/enrollments', { courseId }),
  getMyCourses: (currentTerm?: boolean) => 
    api.get('/enrollments/my-courses', { params: currentTerm ? { currentTerm: true } : {} }),
  drop: (enrollmentId: number) => api.delete(`/enrollments/${enrollmentId}`),
  getStatus: (jobId: string) => api.get(`/enrollments/status/${jobId}`),
  getWaitlist: (courseId: number) => api.get(`/enrollments/waitlist/${courseId}`),
  getExamSchedules: (currentTermOnly?: boolean, allSchedules?: boolean) =>
    api.get('/enrollments/exam-schedules', { 
      params: { 
        ...(currentTermOnly !== false ? { currentTermOnly: true } : {}),
        ...(allSchedules ? { allSchedules: true } : {})
      } 
    }),
};

// Admin API
export const adminAPI = {
  // Statistics
  getStatistics: () => api.get('/admin/statistics'),
  getStats: () => api.get('/admin/stats'),

  // User Management
  getAllUsers: (params?: { role?: string; page?: number; limit?: number }) =>
    api.get('/admin/users', { params }),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: number, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),

  // Course Management
  getAllCourses: () => api.get('/admin/courses'),
  createCourse: (data: any) => api.post('/admin/courses', data),
  updateCourse: (id: number, data: any) => api.put(`/admin/courses/${id}`, data),
  updateCourseDetails: (id: number, data: any) => api.put(`/admin/courses/${id}/details`, data),
  deleteCourse: (id: number) => api.delete(`/admin/courses/${id}`),
  getCourseEnrollments: (id: number) => api.get(`/admin/courses/${id}/enrollments`),

  // Program Management
  getAllPrograms: () => api.get('/admin/programs'),
  createProgram: (data: any) => api.post('/admin/programs', data),
  updateProgram: (id: number, data: any) => api.put(`/admin/programs/${id}`, data),
  deleteProgram: (id: number) => api.delete(`/admin/programs/${id}`),

  // Enrollment Management
  getAllEnrollments: () => api.get('/admin/enrollments'),
  updateEnrollment: (id: number, data: any) => api.put(`/admin/enrollments/${id}`, data),
  deleteEnrollment: (id: number) => api.delete(`/admin/enrollments/${id}`),

  // Reports
  getReports: () => api.get('/admin/reports'),
  exportReport: (type: string) => api.get(`/admin/reports/export/${type}`),

  // Student Personal Info Management
  getStudentPersonalInfo: (studentId: number) => api.get(`/admin/students/${studentId}/personal-info`),
  updateStudentPersonalInfo: (studentId: number, data: any) => api.put(`/admin/students/${studentId}/personal-info`, data),

  // Campus Information Management
  createAnnouncement: (data: any) => api.post('/admin/announcements', data),
  createEvent: (data: any) => api.post('/admin/events', data),
};

// Academic Records API
export const academicAPI = {
  getGrades: () => api.get('/academic/grades'),
  getGradesByTerm: (semester: string, year: number) =>
    api.get('/academic/grades/term', { params: { semester, year } }),
  getCourseGrade: (courseId: number) => api.get(`/academic/grades/course/${courseId}`),
  getTranscript: () => api.get('/academic/transcript'),
  getUnofficialTranscript: () => api.get('/academic/transcript/unofficial'),
  generateTranscriptPDF: () => api.get('/academic/transcript/pdf', { responseType: 'blob' }),
  getGPA: () => api.get('/academic/gpa'),
  getGPAHistory: () => api.get('/academic/gpa/history'),
  getAlerts: () => api.get('/students/alerts'),
};

// Applications API
export const applicationAPI = {
  getMyApplications: () => api.get('/applications'),
  submitApplication: (data: {
    type: string;
    semester?: string;
    year?: number;
    reason: string;
    supportingDocs?: any;
  }) => api.post('/applications', data),
  getApplication: (id: number) => api.get(`/applications/${id}`),
  withdrawApplication: (id: number) => api.put(`/applications/${id}/withdraw`),
  getPendingApplications: () => api.get('/applications/admin/pending'),
  reviewApplication: (id: number, data: {
    status: string;
    decision: string;
    reviewNotes?: string;
  }) => api.put(`/applications/admin/${id}/review`, data),
};

// Personal Info API
export const personalAPI = {
  getPersonalInfo: () => api.get('/personal'),
  updatePersonalInfo: (data: any) => api.put('/personal', data),
  updateEmergencyContact: (data: {
    emergencyName?: string;
    emergencyRelation?: string;
    emergencyPhone?: string;
    emergencyEmail?: string;
  }) => api.put('/personal/emergency-contact', data),
  updateAddress: (data: {
    permanentAddress?: string;
    mailingAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }) => api.put('/personal/address', data),
};

// Faculty Center API
export const facultyAPI = {
  getMyCourses: () => api.get('/faculty/courses'),
  getRoster: (courseId: number) => api.get(`/faculty/courses/${courseId}/roster`),
  getCourseGrades: (courseId: number) => api.get(`/faculty/courses/${courseId}/grades`),
  submitGrades: (grades: Array<{
    enrollmentId: number;
    numericGrade: number;
    letterGrade: string;
    comments?: string;
  }>) => api.post('/faculty/grades/submit', { grades }),
  updateGrade: (gradeId: number, data: {
    numericGrade?: number;
    letterGrade: string;
    comments?: string;
  }) => api.put(`/faculty/grades/${gradeId}`, data),
  getAttendance: (courseId: number) => api.get(`/faculty/courses/${courseId}/attendance`),
  markAttendance: (attendanceRecords: Array<{
    enrollmentId: number;
    date: string;
    status: string;
    notes?: string;
  }>) => api.post('/faculty/attendance', { attendanceRecords }),
  getMaterials: (courseId: number) => api.get(`/faculty/courses/${courseId}/materials`),
  uploadMaterial: (courseId: number, data: {
    title: string;
    description?: string;
    type: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    isVisible?: boolean;
  }) => api.post(`/faculty/courses/${courseId}/materials`, data),
};

// Campus Information API
export const campusAPI = {
  getAnnouncements: () => api.get('/campus/announcements'),
  getAnnouncement: (id: number) => api.get(`/campus/announcements/${id}`),
  getEvents: (params?: {
    category?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/campus/events', { params }),
  getUpcomingEvents: () => api.get('/campus/events/upcoming'),
  registerForEvent: (id: number) => api.post(`/campus/events/${id}/register`),
};

export default api;
