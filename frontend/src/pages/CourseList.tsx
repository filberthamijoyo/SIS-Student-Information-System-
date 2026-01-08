import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, X, Calendar, BookOpen, Award } from 'lucide-react';
import api from '../services/api';
import { CourseCard } from '../components/CourseCard';

interface Course {
  id: number;
  courseCode: string;
  courseName: string;
  credits: number;
  department: string;
  maxCapacity: number;
  currentEnrollment: number;
  description: string | null;
  prerequisites: string | null;
  category?: 'CORE' | 'MAJOR_REQUIRED' | 'MAJOR_ELECTIVE' | 'FREE_ELECTIVE';
  instructor: {
    fullName: string;
  } | null;
  timeSlots: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    location: string;
  }>;
  recommendation?: {
    reason: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

interface CourseFilter {
  searchText: string;
  department: string;
  category: string[];
  credits: number[];
  dayOfWeek: string[];
  showRecommendedOnly: boolean;
}

export function CourseList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CourseFilter>({
    searchText: '',
    department: '',
    category: [],
    credits: [],
    dayOfWeek: [],
    showRecommendedOnly: false,
  });

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await api.get('/courses');
      // Transform backend data (snake_case) to frontend format (camelCase)
      return response.data.data.map((course: any) => ({
        id: course.id,
        courseCode: course.course_code,
        courseName: course.course_name,
        credits: course.credits,
        department: course.department,
        maxCapacity: course.max_capacity,
        currentEnrollment: course.current_enrollment,
        description: course.description,
        prerequisites: course.prerequisites,
        category: course.category,
        instructor: course.users ? {
          fullName: course.users.full_name
        } : null,
        timeSlots: (course.time_slots || []).map((slot: any) => ({
          dayOfWeek: slot.day_of_week,
          startTime: slot.start_time,
          endTime: slot.end_time,
          location: slot.location || ''
        })),
        recommendation: course.recommendation ? {
          reason: course.recommendation.reason,
          priority: course.recommendation.priority
        } : undefined
      }));
    },
  });

  const { data: departments } = useQuery<string[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/courses/departments');
      return response.data.data;
    },
  });

  const filteredCourses = courses?.filter((course) => {
    // Text search
    const matchesSearch =
      searchQuery === '' ||
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.instructor?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    // Department filter
    const matchesDepartment =
      selectedDepartment === '' || course.department === selectedDepartment;

    // Category filter
    const matchesCategory =
      filters.category.length === 0 ||
      (course.category && filters.category.includes(course.category));

    // Credits filter
    const matchesCredits =
      filters.credits.length === 0 ||
      filters.credits.includes(course.credits);

    // Day of week filter
    const matchesDayOfWeek =
      filters.dayOfWeek.length === 0 ||
      course.timeSlots.some((slot) => filters.dayOfWeek.includes(slot.dayOfWeek));

    // Recommended only filter
    const matchesRecommended =
      !filters.showRecommendedOnly || course.recommendation !== undefined;

    return matchesSearch && matchesDepartment && matchesCategory &&
           matchesCredits && matchesDayOfWeek && matchesRecommended;
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

  const toggleDepartment = (dept: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(dept)) {
      newExpanded.delete(dept);
    } else {
      newExpanded.add(dept);
    }
    setExpandedDepartments(newExpanded);
  };

  const expandAll = () => {
    if (coursesByDepartment) {
      setExpandedDepartments(new Set(Object.keys(coursesByDepartment)));
    }
  };

  const collapseAll = () => {
    setExpandedDepartments(new Set());
  };

  const viewAll = () => {
    clearAllFilters();
    expandAll();
  };

  const toggleFilter = (filterType: keyof Pick<CourseFilter, 'category' | 'credits' | 'dayOfWeek'>, value: any) => {
    setFilters((prev) => {
      const currentValues = prev[filterType] as any[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [filterType]: newValues };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      searchText: '',
      department: '',
      category: [],
      credits: [],
      dayOfWeek: [],
      showRecommendedOnly: false,
    });
    setSearchQuery('');
    setSelectedDepartment('');
  };

  const activeFilterCount = filters.category.length + filters.credits.length + filters.dayOfWeek.length +
                           (filters.showRecommendedOnly ? 1 : 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Browse Courses</h2>
            <p className="text-muted-foreground">Term 1 2025 Course Offerings</p>
          </div>
          <button
            onClick={viewAll}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            View All
          </button>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-foreground mb-1">
                Search Courses
              </label>
              <input
                type="text"
                id="search"
                className="input"
                placeholder="Search by course code, name, or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-foreground mb-1">
                Department
              </label>
              <select
                id="department"
                className="input"
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

          {/* Advanced Filters Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Filter className="h-4 w-4" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border space-y-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Course Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'CORE', label: 'Core' },
                    { value: 'MAJOR_REQUIRED', label: 'Major Required' },
                    { value: 'MAJOR_ELECTIVE', label: 'Major Elective' },
                    { value: 'FREE_ELECTIVE', label: 'Free Elective' },
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => toggleFilter('category', cat.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filters.category.includes(cat.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Credits Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Credit Hours
                </label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((credit) => (
                    <button
                      key={credit}
                      onClick={() => toggleFilter('credits', credit)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filters.credits.includes(credit)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {credit} {credit === 1 ? 'Credit' : 'Credits'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of Week Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleFilter('dayOfWeek', day)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filters.dayOfWeek.includes(day)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommended Only Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showRecommendedOnly}
                    onChange={(e) => setFilters({ ...filters, showRecommendedOnly: e.target.checked })}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    Show only recommended courses
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredCourses?.length || 0} courses across {Object.keys(coursesByDepartment || {}).length} departments
            </div>
            <div className="flex gap-2">
              <button
                onClick={viewAll}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                View All
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={expandAll}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Expand All
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* Courses Grouped by Department */}
        {coursesByDepartment && Object.keys(coursesByDepartment).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(coursesByDepartment)
              .sort(([deptA], [deptB]) => deptA.localeCompare(deptB))
              .map(([department, deptCourses]) => {
                const isExpanded = expandedDepartments.has(department);
                return (
                  <div key={department} className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
                    {/* Department Header */}
                    <button
                      onClick={() => toggleDepartment(department)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-semibold">
                          {department.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-foreground">{department}</h3>
                          <p className="text-sm text-muted-foreground">{deptCourses.length} course{deptCourses.length !== 1 ? 's' : ''} available</p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Department Courses */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-muted/50 border-t border-border">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {deptCourses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg shadow-md">
            <p className="text-muted-foreground text-lg">No courses found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
