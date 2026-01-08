import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Download,
  BookOpen,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

interface Enrollment {
  id: number;
  status: string;
  enrolledAt: string;
  waitlistPosition?: number;
  student: {
    id: number;
    userIdentifier: string;
    fullName: string;
    email: string;
    major?: string;
    yearLevel?: number;
  };
  course: {
    id: number;
    courseCode: string;
    courseName: string;
    department: string;
    semester: string;
    year: number;
    credits: number;
  };
}

export function EnrollmentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');

  const { data: enrollments, isLoading } = useQuery<Enrollment[]>({
    queryKey: ['admin-enrollments'],
    queryFn: async () => {
      const response = await api.get('/admin/enrollments');
      return response.data.data;
    },
  });

  const filteredEnrollments = enrollments?.filter((enrollment) => {
    const matchesSearch =
      enrollment.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.student.userIdentifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.course.courseName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || enrollment.status === statusFilter;
    const matchesSemester =
      semesterFilter === 'ALL' ||
      `${enrollment.course.semester}_${enrollment.course.year}` === semesterFilter;
    return matchesSearch && matchesStatus && matchesSemester;
  });

  const semesters = Array.from(
    new Set(enrollments?.map((e) => `${e.course.semester}_${e.course.year}`) || [])
  );

  const getStatusBadge = (status: string, waitlistPosition?: number) => {
    const styles = {
      ENROLLED: {
        class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: CheckCircle,
      },
      WAITLISTED: {
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: Clock,
      },
      DROPPED: {
        class: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        icon: AlertCircle,
      },
      PENDING: {
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: Clock,
      },
    };

    const config = styles[status as keyof typeof styles] || styles.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        <Icon className="h-3 w-3" />
        {status}
        {status === 'WAITLISTED' && waitlistPosition && ` (#${waitlistPosition})`}
      </span>
    );
  };

  const stats = {
    total: enrollments?.length || 0,
    enrolled: enrollments?.filter((e) => e.status === 'ENROLLED').length || 0,
    waitlisted: enrollments?.filter((e) => e.status === 'WAITLISTED').length || 0,
    dropped: enrollments?.filter((e) => e.status === 'DROPPED').length || 0,
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Enrollment Management</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage all course enrollments</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Enrollments</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.total}</div>
        </div>
        <div className="bg-card border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="text-sm text-green-600 dark:text-green-400">Enrolled</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.enrolled}</div>
        </div>
        <div className="bg-card border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="text-sm text-yellow-600 dark:text-yellow-400">Waitlisted</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.waitlisted}</div>
        </div>
        <div className="bg-card border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Dropped</div>
          <div className="text-2xl font-bold text-foreground mt-1">{stats.dropped}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student name, ID, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="WAITLISTED">Waitlisted</option>
              <option value="DROPPED">Dropped</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Semester Filter */}
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Semesters</option>
            {semesters.map((sem) => {
              const [semester, year] = sem.split('_');
              return (
                <option key={sem} value={sem}>
                  {semester} {year}
                </option>
              );
            })}
          </select>

          {/* Export */}
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Showing {filteredEnrollments?.length || 0} of {enrollments?.length || 0} enrollments
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Enrolled At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEnrollments?.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {enrollment.student.fullName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.student.userIdentifier}
                        </div>
                        {enrollment.student.major && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {enrollment.student.major} • Year {enrollment.student.yearLevel}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {enrollment.course.courseCode}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.course.courseName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {enrollment.course.department} • {enrollment.course.credits} Credits
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {enrollment.course.semester} {enrollment.course.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(enrollment.status, enrollment.waitlistPosition)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEnrollments?.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No enrollments found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
