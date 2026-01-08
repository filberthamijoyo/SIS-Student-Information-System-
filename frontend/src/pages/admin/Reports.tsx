import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Download,
  Calendar,
  Award,
  PieChart,
} from 'lucide-react';
import api from '../../services/api';

interface ReportData {
  enrollmentsByDepartment?: Array<{ department: string; count: number }>;
  enrollmentTrends?: Array<{ semester: string; year: number; count: number }>;
  popularCourses?: Array<{
    courseCode: string;
    courseName: string;
    enrollments: number;
    capacity: number;
  }>;
  studentsByYear?: Array<{ year: number; count: number }>;
  gpaDistribution?: Array<{ range: string; count: number }>;
}

export function Reports() {
  const [selectedReport, setSelectedReport] = useState<string>('overview');

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const response = await api.get('/admin/reports');
      return response.data.data;
    },
  });

  const reportCategories = [
    {
      id: 'overview',
      name: 'System Overview',
      icon: BarChart3,
      description: 'General statistics and metrics',
    },
    {
      id: 'enrollment',
      name: 'Enrollment Reports',
      icon: Users,
      description: 'Student enrollment analytics',
    },
    {
      id: 'courses',
      name: 'Course Analytics',
      icon: BookOpen,
      description: 'Course performance and popularity',
    },
    {
      id: 'academic',
      name: 'Academic Performance',
      icon: Award,
      description: 'GPA and grade distributions',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            System insights and data visualization
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
          <Download className="h-4 w-4" />
          Export All Reports
        </button>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportCategories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedReport(category.id)}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                selectedReport === category.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  selectedReport === category.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">{category.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-card border border-border rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {selectedReport === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enrollment by Department */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Enrollments by Department
                </h3>
                <div className="space-y-3">
                  {reportData?.enrollmentsByDepartment?.map((dept, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground">{dept.department}</span>
                        <span className="text-sm font-medium text-foreground">{dept.count}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              (dept.count /
                                Math.max(
                                  ...reportData.enrollmentsByDepartment.map((d) => d.count)
                                )) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No data available
                    </p>
                  )}
                </div>
              </div>

              {/* Students by Year */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Students by Year Level
                </h3>
                <div className="space-y-3">
                  {reportData?.studentsByYear?.map((yearData, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground">Year {yearData.year}</span>
                        <span className="text-sm font-medium text-foreground">
                          {yearData.count}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              (yearData.count /
                                Math.max(...reportData.studentsByYear.map((d) => d.count))) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedReport === 'enrollment' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Enrollment Trends
              </h3>
              <div className="space-y-4">
                {reportData?.enrollmentTrends?.map((trend, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-foreground">
                          {trend.semester} {trend.year}
                        </div>
                        <div className="text-sm text-muted-foreground">Academic Term</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">{trend.count}</div>
                      <div className="text-sm text-muted-foreground">Enrollments</div>
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No data available
                  </p>
                )}
              </div>
            </div>
          )}

          {selectedReport === 'courses' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Most Popular Courses
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Course
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Enrollments
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Capacity
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Fill Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData?.popularCourses?.map((course, index) => {
                      const fillRate = (course.enrollments / course.capacity) * 100;
                      return (
                        <tr key={index} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{course.courseCode}</div>
                            <div className="text-sm text-muted-foreground">{course.courseName}</div>
                          </td>
                          <td className="px-4 py-3 text-foreground">{course.enrollments}</td>
                          <td className="px-4 py-3 text-foreground">{course.capacity}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-[100px] bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    fillRate >= 90
                                      ? 'bg-red-500'
                                      : fillRate >= 70
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(fillRate, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-foreground">
                                {fillRate.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }) || (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedReport === 'academic' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                GPA Distribution
              </h3>
              <div className="space-y-4">
                {reportData?.gpaDistribution?.map((range, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{range.range}</span>
                      <span className="text-sm text-foreground">{range.count} students</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (range.count /
                              Math.max(...reportData.gpaDistribution.map((d) => d.count))) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No data available
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
