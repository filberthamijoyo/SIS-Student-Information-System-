import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Star,
  Clock,
  Users,
  Edit3,
  RotateCcw,
  Mail
} from 'lucide-react';
import AddDropCourse from '../components/AddDropCourse';
import MajorChangeRequest from '../components/MajorChangeRequest';
import CourseEvaluationList from '../components/CourseEvaluationList';
import { Applications } from './Applications';

interface Enrollment {
  id: number;
  status: string;
  enrolledAt: string;
  course: {
    id: number;
    courseCode: string;
    courseName: string;
    credits: number;
    department: string;
    instructor: {
      fullName: string;
    } | null;
    timeSlots: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      location: string;
    }>;
  };
}

interface Course {
  id: number;
  courseCode: string;
  courseName: string;
  credits: number;
  department: string;
  instructor: {
    fullName: string;
  } | null;
}

export function MyEnrollments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'enrollments' | 'search' | 'add-drop' | 'major-change' | 'evaluations' | 'applications'>('enrollments');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [dropMessage, setDropMessage] = useState<{ enrollmentId: number; message: string } | null>(null);

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const response = await api.get('/enrollments/my-courses');
      return response.data.data.map((enrollment: any) => ({
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolled_at,
        course: {
          id: enrollment.courses.id,
          courseCode: enrollment.courses.course_code,
          courseName: enrollment.courses.course_name,
          credits: enrollment.courses.credits,
          department: enrollment.courses.department,
          instructor: enrollment.courses.users ? {
            fullName: enrollment.courses.users.full_name
          } : null,
          timeSlots: (enrollment.courses.time_slots || []).map((slot: any) => ({
            dayOfWeek: slot.day_of_week,
            startTime: slot.start_time,
            endTime: slot.end_time,
            location: slot.location || ''
          }))
        }
      }));
    },
  });

  const { data: allCourses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['all-courses'],
    queryFn: async () => {
      const response = await api.get('/courses');
      return response.data.data.map((course: any) => ({
        id: course.id,
        courseCode: course.course_code,
        courseName: course.course_name,
        credits: course.credits,
        department: course.department,
        instructor: course.users ? {
          fullName: course.users.full_name
        } : null,
      }));
    },
    enabled: activeTab === 'search',
  });

  const { data: departments } = useQuery<string[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/courses/departments');
      return response.data.data;
    },
    enabled: activeTab === 'search',
  });

  const dropMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      await api.delete(`/enrollments/${enrollmentId}`);
    },
    onSuccess: (_, enrollmentId) => {
      setDropMessage({
        enrollmentId,
        message: 'Successfully dropped course',
      });
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      setTimeout(() => setDropMessage(null), 3000);
    },
    onError: (error: any, enrollmentId) => {
      setDropMessage({
        enrollmentId,
        message: error.response?.data?.error || 'Failed to drop course',
      });
      setTimeout(() => setDropMessage(null), 5000);
    },
  });

  const handleDrop = (enrollmentId: number) => {
    if (window.confirm('Are you sure you want to drop this course?')) {
      dropMutation.mutate(enrollmentId);
    }
  };

  const toggleDepartment = (dept: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(dept)) {
      newExpanded.delete(dept);
    } else {
      newExpanded.add(dept);
    }
    setExpandedDepartments(newExpanded);
  };

  const confirmedEnrollments = enrollments?.filter((e) => e.status === 'CONFIRMED') || [];
  const waitlistedEnrollments = enrollments?.filter((e) => e.status === 'WAITLISTED') || [];
  const totalCredits = confirmedEnrollments.reduce((sum, enrollment) => sum + enrollment.course.credits, 0);

  // Filter courses for search
  const filteredCourses = allCourses?.filter((course) => {
    const matchesSearch =
      searchQuery === '' ||
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.instructor?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesDepartment =
      selectedDepartment === '' || course.department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // Group courses by department
  const coursesByDepartment = filteredCourses?.reduce((acc, course) => {
    const dept = course.department;
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  // Check for pending evaluations (mock data for now)
  const pendingEvaluations = confirmedEnrollments.filter(() => Math.random() > 0.7);

  if (enrollmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Enrollments</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {confirmedEnrollments.length} courses enrolled • {totalCredits} credits
          </p>
        </div>

        {/* Pending Evaluations Alert */}
        {pendingEvaluations.length > 0 && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                  Course Evaluations Pending
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  You have {pendingEvaluations.length} course evaluation{pendingEvaluations.length !== 1 ? 's' : ''} waiting for your feedback.
                </p>
                <div className="mt-3 space-y-2">
                  {pendingEvaluations.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      to="/evaluations"
                      className="flex items-center text-sm text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      <span className="font-medium">{enrollment.course.courseCode}</span>
                      <span className="mx-2">-</span>
                      <span>{enrollment.course.courseName}</span>
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Link>
                  ))}
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('enrollments')}
              className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'enrollments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              My Courses
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'search'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Search className="w-4 h-4" />
              Course Search
            </button>
            <button
              onClick={() => setActiveTab('add-drop')}
              className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'add-drop'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Add/Drop
            </button>
            <button
              onClick={() => setActiveTab('major-change')}
              className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'major-change'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Major Change
            </button>
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'evaluations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Star className="w-4 h-4" />
              Evaluations
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === 'applications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Mail className="w-4 h-4" />
              Applications
            </button>
          </nav>
          </div>

        {/* My Courses Tab */}
        {activeTab === 'enrollments' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Enrolled Courses</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {confirmedEnrollments.length}
                    </p>
              </div>
                  <div className="bg-green-100 dark:bg-green-950 p-3 rounded-lg">
                    <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Credits</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totalCredits}</p>
              </div>
                  <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Waitlisted</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {waitlistedEnrollments.length}
                          </p>
                        </div>
                  <div className="bg-yellow-100 dark:bg-yellow-950 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Courses List */}
            {confirmedEnrollments.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Enrolled Courses</h3>
            <div className="space-y-4">
              {confirmedEnrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                          {enrollment.course.courseCode}
                        </h4>
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                          Enrolled
                        </span>
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
                          {enrollment.course.credits} Credits
                        </span>
                      </div>
                          <p className="text-lg text-gray-700 dark:text-gray-300 mb-3">
                        {enrollment.course.courseName}
                      </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div>
                          <span className="font-medium">Instructor:</span>{' '}
                              {enrollment.course.instructor?.fullName || 'TBA'}
                            </div>
                            <div>
                              <span className="font-medium">Department:</span> {enrollment.course.department}
                            </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDrop(enrollment.id)}
                      disabled={dropMutation.isPending}
                          className="ml-4 px-4 py-2 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg font-medium transition-colors"
                    >
                      Drop Course
                    </button>
                  </div>

                  {dropMessage?.enrollmentId === enrollment.id && (
                    <div
                          className={`mt-4 px-4 py-2 rounded-lg text-sm ${
                        dropMessage.message.includes('Success')
                              ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800'
                              : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {dropMessage.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No enrollments yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Start by browsing available courses and enrolling in classes.
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
                >
                  Browse Courses
                </button>
          </div>
        )}

        {/* Waitlisted Courses */}
        {waitlistedEnrollments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Waitlisted Courses</h3>
            <div className="space-y-4">
              {waitlistedEnrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="bg-yellow-50 dark:bg-yellow-950/30 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800"
                    >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                          {enrollment.course.courseCode}
                        </h4>
                            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded-full">
                          Waitlisted
                        </span>
                      </div>
                          <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                        {enrollment.course.courseName}
                      </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        You will be automatically enrolled when a seat becomes available.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDrop(enrollment.id)}
                      disabled={dropMutation.isPending}
                          className="ml-4 px-4 py-2 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg font-medium transition-colors"
                    >
                      Leave Waitlist
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        )}

        {/* Course Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Courses
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="search"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Search by code, name, or instructor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <select
                    id="department"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departments?.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                {filteredCourses?.length || 0} courses found
              </div>
            </div>

            {/* Courses by Department */}
            {coursesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : coursesByDepartment && Object.keys(coursesByDepartment).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(coursesByDepartment)
                  .sort(([deptA], [deptB]) => deptA.localeCompare(deptB))
                  .map(([department, deptCourses]) => {
                    const isExpanded = expandedDepartments.has(department);
                    return (
                      <div
                        key={department}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        {/* Department Header */}
                        <button
                          onClick={() => toggleDepartment(department)}
                          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold">
                              {department.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{department}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {deptCourses.length} course{deptCourses.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Course List */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 dark:border-gray-700">
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                              {deptCourses.map((course) => (
                                <button
                                  key={course.id}
                                  onClick={() => navigate(`/courses/${course.id}`)}
                                  className="w-full px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-1">
                                        <span className="font-semibold text-primary">{course.courseCode}</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {course.credits} credits
                                        </span>
                                      </div>
                                      <h4 className="text-gray-900 dark:text-white font-medium mb-1">
                                        {course.courseName}
                                      </h4>
                                      {course.instructor && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                          {course.instructor.fullName}
                                        </p>
                                      )}
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search criteria
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add/Drop Tab */}
        {activeTab === 'add-drop' && user && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Important Information
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Submit requests to add or drop courses for the current term. Check add/drop deadlines in the Academic Calendar.
                  </p>
                </div>
              </div>
            </div>
            <AddDropCourse currentUser={user} />
          </div>
        )}

        {/* Major Change Tab */}
        {activeTab === 'major-change' && user && (
          <div className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-950/30 border-l-4 border-purple-500 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                    Eligibility Requirements
                  </h3>
                  <div className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Minimum GPA of 3.0 OR at least 6 units completed</li>
                      <li>Supporting documents may be required for certain majors</li>
                      <li>Requests are typically processed within 2-4 weeks</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <MajorChangeRequest currentUser={user} />
          </div>
        )}

        {/* Evaluations Tab */}
        {activeTab === 'evaluations' && user && (
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500 p-4 rounded-lg">
              <div className="flex items-start">
                <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                    Why Evaluate?
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    Course evaluations help instructors improve their teaching methods and course content.
                    Your honest feedback is valuable and can be submitted anonymously.
                  </p>
                </div>
              </div>
            </div>
            <CourseEvaluationList studentId={user.id} />
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && user && (
          <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border-l-4 border-indigo-500 p-4 rounded-lg">
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                    Submit Academic Applications
                  </h3>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">
                    Track and manage your academic applications including leave of absence, readmission, and other requests.
                  </p>
                </div>
              </div>
            </div>
            <Applications />
          </div>
        )}
      </div>
    </div>
  );
}
