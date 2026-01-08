import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  BookOpen,
  Users,
  Calendar,
  AlertCircle,
  Clock,
  MapPin,
  X,
} from 'lucide-react';
import api, { adminAPI } from '../../services/api';
import { formatLocation } from '../../utils/locationFormatter';
import { Modal, ModalFooter } from '../../components/ui/Modal';

interface Course {
  id: number;
  courseCode?: string;
  course_code?: string;
  courseName?: string;
  course_name?: string;
  department: string;
  credits: number;
  maxCapacity?: number;
  max_capacity?: number;
  currentEnrollment?: number;
  current_enrollment?: number;
  semester: string;
  year: number;
  status: string;
  description?: string;
  prerequisites?: string[] | string;
  instructor?: {
    id: number;
    fullName?: string;
    full_name?: string;
  };
  users?: {
    id: number;
    full_name: string;
    email: string;
  };
  timeSlots?: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    location: string;
  }>;
  time_slots?: Array<{
    day_of_week: string;
    start_time: string;
    end_time: string;
    location: string;
  }>;
}

export function CourseManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const response = await adminAPI.getAllCourses();
      // Transform snake_case to camelCase for consistency
      return (response.data.data || []).map((course: any) => ({
        id: course.id,
        courseCode: course.course_code || course.courseCode,
        course_name: course.course_name,
        courseName: course.course_name || course.courseName,
        department: course.department,
        credits: course.credits,
        maxCapacity: course.max_capacity || course.maxCapacity,
        max_capacity: course.max_capacity,
        currentEnrollment: course.current_enrollment || course.currentEnrollment || 0,
        current_enrollment: course.current_enrollment,
        semester: course.semester,
        year: course.year,
        status: course.status,
        description: course.description,
        prerequisites: course.prerequisites,
        instructor: course.users
          ? {
              id: course.users.id,
              fullName: course.users.full_name || course.users.fullName,
              full_name: course.users.full_name,
            }
          : course.instructor,
        users: course.users,
        timeSlots: course.time_slots
          ? course.time_slots.map((slot: any) => ({
              dayOfWeek: slot.day_of_week || slot.dayOfWeek,
              startTime: slot.start_time || slot.startTime,
              endTime: slot.end_time || slot.endTime,
              location: slot.location || '',
            }))
          : course.timeSlots,
        time_slots: course.time_slots,
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (courseId: number) => api.delete(`/admin/courses/${courseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      adminAPI.updateCourseDetails(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setEditingCourse(null);
    },
  });

  // Fetch instructors for the edit form
  const { data: instructors } = useQuery({
    queryKey: ['instructors'],
    queryFn: async () => {
      const response = await adminAPI.getAllUsers({ role: 'INSTRUCTOR' });
      return response.data.data || [];
    },
  });

  const handleDeleteCourse = async (courseId: number, courseName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${courseName}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteMutation.mutateAsync(courseId);
        alert('Course deleted successfully');
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to delete course');
      }
    }
  };

  const departments = Array.from(new Set(courses?.map((c) => c.department) || []));

  const filteredCourses = courses?.filter((course) => {
    const matchesSearch =
      (course.courseName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (course.courseCode?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'ALL' || course.department === departmentFilter;
    const matchesStatus = statusFilter === 'ALL' || course.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      FULL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  const getEnrollmentStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return { color: 'bg-red-500', text: 'Full' };
    if (percentage >= 80) return { color: 'bg-yellow-500', text: 'Almost Full' };
    return { color: 'bg-green-500', text: 'Available' };
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage course offerings</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Course
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by course code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          Showing {filteredCourses?.length || 0} of {courses?.length || 0} courses
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCourses?.map((course) => {
            const enrollmentStatus = getEnrollmentStatus(
              course.currentEnrollment || course.current_enrollment || 0,
              course.maxCapacity || course.max_capacity || 1
            );
            return (
              <div
                key={course.id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-200"
              >
                {/* Course Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {course.courseCode || course.course_code}
                      </h3>
                      {getStatusBadge(course.status)}
                    </div>
                    <p className="text-foreground font-medium">
                      {course.courseName || course.course_name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{course.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingCourse(course)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                      title="Edit course"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.courseName)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      title="Delete course"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Course Details */}
                <div className="space-y-3">
                  {/* Instructor */}
                  {(course.instructor || course.users) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {course.instructor?.fullName ||
                          course.instructor?.full_name ||
                          course.users?.full_name}
                      </span>
                    </div>
                  )}

                  {/* Semester */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {course.semester} {course.year} • {course.credits} Credits
                    </span>
                  </div>

                  {/* Time Slots */}
                  {(course.timeSlots || course.time_slots) &&
                    (course.timeSlots || course.time_slots)!.length > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          {(course.timeSlots || course.time_slots)!.map((slot: any, index: number) => (
                            <div key={index} className="text-foreground">
                              {slot.dayOfWeek || slot.day_of_week}:{' '}
                              {slot.startTime || slot.start_time} - {slot.endTime || slot.end_time}
                              {slot.location && (
                                <span className="text-muted-foreground ml-2">
                                  ({formatLocation(slot.location)})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Enrollment */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Enrollment</span>
                      <span className="text-sm font-medium text-foreground">
                        {course.currentEnrollment || course.current_enrollment || 0} /{' '}
                        {course.maxCapacity || course.max_capacity}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`${enrollmentStatus.color} h-2 rounded-full transition-all duration-300`}
                        style={{
                          width: `${Math.min(
                            ((course.currentEnrollment || course.current_enrollment || 0) /
                              (course.maxCapacity || course.max_capacity || 1)) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredCourses?.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No courses found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <EditCourseModal
          course={editingCourse}
          isOpen={!!editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={(data) => {
            updateMutation.mutate({ id: editingCourse.id, data });
          }}
          instructors={instructors || []}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Edit Course Modal Component
interface EditCourseModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  instructors: Array<{ id: number; full_name: string; email: string }>;
  isLoading: boolean;
}

function EditCourseModal({
  course,
  isOpen,
  onClose,
  onSave,
  instructors,
  isLoading,
}: EditCourseModalProps) {
  const [formData, setFormData] = useState({
    course_code: course.courseCode || course.course_code || '',
    course_name: course.courseName || course.course_name || '',
    description: course.description || '',
    credits: course.credits || 0,
    instructor_id: course.instructor?.id || course.users?.id || '',
    department: course.department || '',
    semester: course.semester || 'Fall',
    year: course.year || new Date().getFullYear(),
    max_capacity: course.maxCapacity || course.max_capacity || 0,
    status: course.status || 'ACTIVE',
    prerequisites:
      typeof course.prerequisites === 'string'
        ? JSON.parse(course.prerequisites)
        : course.prerequisites || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Course"
      description="Update course information"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Course Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.course_code}
              onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Course Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.course_name}
              onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Credits <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              max="10"
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Instructor
            </label>
            <select
              value={formData.instructor_id}
              onChange={(e) =>
                setFormData({ ...formData, instructor_id: e.target.value ? parseInt(e.target.value) : '' })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="">Select Instructor</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.full_name} ({instructor.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Max Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.max_capacity}
              onChange={(e) =>
                setFormData({ ...formData, max_capacity: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Semester <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="Fall">Fall</option>
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="2020"
              max="2100"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
