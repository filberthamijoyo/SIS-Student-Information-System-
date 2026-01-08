import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { facultyAPI } from '../services/api';
import { Link } from 'react-router-dom';

export function FacultyDashboard() {
  const { user } = useAuth();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['faculty-courses'],
    queryFn: () => facultyAPI.getMyCourses().then(res => res.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Grade Submission',
      description: 'Submit or update student grades',
      link: '/faculty/grades',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Attendance',
      description: 'Mark student attendance',
      link: '/faculty/attendance',
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'Course Materials',
      description: 'Upload and manage materials',
      link: '/faculty/materials',
      color: 'bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {user?.fullName}
        </h1>
        <p className="mt-2 text-muted-foreground">Faculty Center - Manage your courses and students</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium opacity-90">Teaching Courses</div>
              <div className="mt-2 text-4xl font-bold">{courses?.length || 0}</div>
              <div className="mt-1 text-sm opacity-90">This Semester</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Total Students</div>
              <div className="mt-2 text-3xl font-bold text-foreground">
                {courses?.reduce((sum: number, course: any) => sum + (course.enrollment?.length || 0), 0) || 0}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Across all courses</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Office Hours</div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {user?.faculty?.officeHours || 'Not set'}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{user?.faculty?.office || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.link}
              className={`block ${action.color} border-2 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1`}
            >
              <div>
                <h3 className="text-lg font-semibold text-foreground">{action.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* My Courses */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">My Courses</h2>
        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {courses.map((course: any) => (
              <div
                key={course.id}
                className="bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {course.courseCode}
                        </h3>
                        <p className="text-sm text-muted-foreground">{course.courseName}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {course.credits} Credits
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Schedule</div>
                      <div className="font-medium text-foreground">
                        {course.schedule || 'TBD'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Room</div>
                      <div className="font-medium text-foreground">
                        {course.location || 'TBD'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Enrolled Students</div>
                      <div className="font-medium text-foreground">
                        {course.enrollment?.length || 0} / {course.capacity || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Department</div>
                      <div className="font-medium text-foreground">
                        {course.department || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Enrollment */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Enrollment</span>
                      <span>{((course.enrollment?.length || 0) / (course.capacity || 1) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
                      <div
                        style={{ width: `${((course.enrollment?.length || 0) / (course.capacity || 1) * 100)}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                      ></div>
                    </div>
                  </div>

                  {/* Course Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Link
                      to={`/faculty/courses/${course.id}/roster`}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      View Roster
                    </Link>
                    <Link
                      to={`/faculty/courses/${course.id}/grades`}
                      className="inline-flex items-center text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Manage Grades
                    </Link>
                    <Link
                      to={`/faculty/courses/${course.id}/attendance`}
                      className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Attendance
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No courses assigned</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You don't have any courses assigned this semester.
            </p>
          </div>
        )}
      </div>

      {/* Help & Support */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Faculty Support</h4>
        <p className="text-sm text-blue-700 mb-4">
          Need assistance with the faculty portal? Contact the following departments:
        </p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Academic Technology Support: techsupport@cuhk.edu.cn</li>
          <li>• Registrar's Office: registrar@cuhk.edu.cn</li>
          <li>• Help Desk: +86 (755) 8427-3500</li>
        </ul>
      </div>
    </div>
  );
}
