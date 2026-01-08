import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { formatLocation } from '../utils/locationFormatter';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Calendar,
  FileText,
  User,
  Award,
  CheckCircle
} from 'lucide-react';

interface CourseDetails {
  id: number;
  courseCode: string;
  courseName: string;
  credits: number;
  department: string;
  description: string | null;
  prerequisites: string | null;
  maxCapacity: number;
  currentEnrollment: number;
  instructor: {
    fullName: string;
    email: string;
  } | null;
  timeSlots: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    location: string;
  }>;
  syllabus?: {
    courseOutline: string;
    gradeDistribution: {
      final: number;
      midterm: number;
      assignments: number;
      participation: number;
      projects?: number;
      quizzes?: number;
    };
    learningObjectives: string[];
    requiredMaterials: string[];
  };
}

export function CourseDetails() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery<CourseDetails>({
    queryKey: ['course-details', courseId],
    queryFn: async () => {
      const response = await api.get(`/courses/${courseId}`);
      const courseData = response.data.data;

      return {
        id: courseData.id,
        courseCode: courseData.course_code,
        courseName: courseData.course_name,
        credits: courseData.credits,
        department: courseData.department,
        description: courseData.description,
        prerequisites: courseData.prerequisites,
        maxCapacity: courseData.max_capacity,
        currentEnrollment: courseData.current_enrollment,
        instructor: courseData.users ? {
          fullName: courseData.users.full_name,
          email: courseData.users.email
        } : null,
        timeSlots: (courseData.time_slots || []).map((slot: any) => ({
          dayOfWeek: slot.day_of_week,
          startTime: slot.start_time,
          endTime: slot.end_time,
          location: slot.location || 'TBA'
        })),
        syllabus: {
          courseOutline: courseData.description || 'Course outline not available.',
          gradeDistribution: {
            final: 40,
            midterm: 30,
            assignments: 20,
            participation: 10,
          },
          learningObjectives: [
            'Understand core concepts and principles',
            'Apply knowledge to practical scenarios',
            'Develop critical thinking and problem-solving skills',
            'Demonstrate proficiency through assessments'
          ],
          requiredMaterials: [
            'Textbook (details in syllabus)',
            'Course materials on learning management system',
            'Scientific calculator (if applicable)'
          ]
        }
      };
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: number) => {
      return api.post('/enrollments', { courseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      alert('Successfully enrolled in course!');
      navigate('/enrollments');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to enroll in course');
    }
  });

  const handleEnroll = () => {
    if (course && window.confirm(`Enroll in ${course.courseCode} - ${course.courseName}?`)) {
      enrollMutation.mutate(course.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Course not found</h2>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:text-primary/80">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const spotsLeft = course.maxCapacity - course.currentEnrollment;
  const fillPercentage = (course.currentEnrollment / course.maxCapacity) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Course Search
        </button>

        {/* Course Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                  {course.department}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-full">
                  {course.credits} Credits
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {course.courseCode}
              </h1>
              <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                {course.courseName}
              </h2>
              {course.prerequisites && (
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Prerequisites:</strong> {course.prerequisites}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleEnroll}
              disabled={spotsLeft <= 0 || enrollMutation.isPending}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                spotsLeft <= 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90 hover:shadow-lg'
              }`}
            >
              {enrollMutation.isPending ? 'Enrolling...' : spotsLeft <= 0 ? 'Course Full' : 'Enroll Now'}
            </button>
          </div>

          {/* Enrollment Status */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enrollment: {course.currentEnrollment} / {course.maxCapacity}
              </span>
              <span className={`text-sm font-semibold ${
                spotsLeft <= 5 ? 'text-red-600' : 'text-green-600'
              }`}>
                {spotsLeft} spots left
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  fillPercentage >= 90 ? 'bg-red-500' : fillPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${fillPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Description */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-primary" />
                Course Outline
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {course.description || course.syllabus?.courseOutline}
              </p>
            </div>

            {/* Grade Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-primary" />
                Grade Distribution
              </h3>
              <div className="space-y-3">
                {course.syllabus && Object.entries(course.syllabus.gradeDistribution).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {key}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {value}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/70"
                        style={{ width: `${value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning Objectives */}
            {course.syllabus?.learningObjectives && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-primary" />
                  Learning Objectives
                </h3>
                <ul className="space-y-2">
                  {course.syllabus.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Schedule */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Schedule
              </h3>
              <div className="space-y-3">
                {course.timeSlots.length > 0 ? (
                  course.timeSlots.map((slot, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {slot.dayOfWeek}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <Clock className="w-4 h-4 mr-2" />
                        {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 mr-2" />
                        {formatLocation(slot.location)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Schedule not available</p>
                )}
              </div>
            </div>

            {/* Instructor */}
            {course.instructor && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-primary" />
                  Instructor
                </h3>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg">
                    {course.instructor.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {course.instructor.fullName}
                    </div>
                    <a
                      href={`mailto:${course.instructor.email}`}
                      className="text-sm text-primary hover:text-primary/80"
                    >
                      {course.instructor.email}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Required Materials */}
            {course.syllabus?.requiredMaterials && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-primary" />
                  Required Materials
                </h3>
                <ul className="space-y-2">
                  {course.syllabus.requiredMaterials.map((material, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                      <span className="mr-2">•</span>
                      {material}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
