import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import api from '../../services/api';

interface SystemStats {
  totalStudents: number;
  totalInstructors: number;
  totalAdmins: number;
  totalCourses: number;
  totalEnrollments: number;
  totalWaitlisted: number;
  activeApplications?: number;
  pendingGrades?: number;
}

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ['admin-statistics'],
    queryFn: async () => {
      const response = await api.get('/admin/statistics');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: '/admin/users?role=STUDENT',
    },
    {
      title: 'Total Instructors',
      value: stats?.totalInstructors || 0,
      icon: GraduationCap,
      color: 'bg-green-500',
      link: '/admin/users?role=INSTRUCTOR',
    },
    {
      title: 'Active Courses',
      value: stats?.totalCourses || 0,
      icon: BookOpen,
      color: 'bg-purple-500',
      link: '/admin/courses',
    },
    {
      title: 'Total Enrollments',
      value: stats?.totalEnrollments || 0,
      icon: FileText,
      color: 'bg-orange-500',
      link: '/admin/enrollments',
    },
    {
      title: 'Waitlisted Students',
      value: stats?.totalWaitlisted || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      link: '/admin/enrollments?status=waitlisted',
    },
    {
      title: 'System Administrators',
      value: stats?.totalAdmins || 0,
      icon: Users,
      color: 'bg-red-500',
      link: '/admin/users?role=ADMINISTRATOR',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'Create, edit, or delete user accounts',
      icon: Users,
      link: '/admin/users',
      color: 'border-blue-200 hover:bg-blue-50',
    },
    {
      title: 'Manage Courses',
      description: 'Create new courses and manage existing ones',
      icon: BookOpen,
      link: '/admin/courses',
      color: 'border-purple-200 hover:bg-purple-50',
    },
    {
      title: 'Manage Programs',
      description: 'Manage academic programs and requirements',
      icon: GraduationCap,
      link: '/admin/programs',
      color: 'border-green-200 hover:bg-green-50',
    },
    {
      title: 'View Enrollments',
      description: 'Monitor and manage course enrollments',
      icon: FileText,
      link: '/admin/enrollments',
      color: 'border-orange-200 hover:bg-orange-50',
    },
    {
      title: 'Reports & Analytics',
      description: 'View system reports and analytics',
      icon: BarChart3,
      link: '/admin/reports',
      color: 'border-indigo-200 hover:bg-indigo-50',
    },
    {
      title: 'Review Applications',
      description: 'Process student applications and requests',
      icon: AlertCircle,
      link: '/admin/applications',
      color: 'border-red-200 hover:bg-red-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          System overview and quick access to administrative functions
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.link}
                className={`bg-card border-2 ${action.color} rounded-lg p-5 transition-all duration-200`}
              >
                <div className="flex items-start gap-4">
                  <Icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-foreground">All systems operational</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span className="text-foreground">
              {stats?.totalEnrollments || 0} enrollments this semester
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="text-foreground">
              {stats?.totalWaitlisted || 0} students on waitlists
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
