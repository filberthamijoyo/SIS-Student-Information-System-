import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatLocation } from '../utils/locationFormatter';

interface CourseCardProps {
  course: {
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
  };
}

export function CourseCard({ course }: CourseCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const seatsAvailable = course.maxCapacity - course.currentEnrollment;
  const isFull = seatsAvailable <= 0;
  const fillPercentage = (course.currentEnrollment / course.maxCapacity) * 100;

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/enrollments', {
        courseId: course.id,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const jobId = data.data.jobId;
      setEnrollmentStatus('Processing enrollment...');
      setIsPolling(true);
      pollEnrollmentStatus(jobId);
    },
    onError: (error: any) => {
      setEnrollmentStatus(
        error.response?.data?.error || 'Failed to enroll in course'
      );
      setTimeout(() => setEnrollmentStatus(null), 5000);
    },
  });

  const pollEnrollmentStatus = async (jobId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await api.get(`/enrollments/status/${jobId}`);
        const status = response.data.data.status;

        if (status === 'completed') {
          setEnrollmentStatus('Successfully enrolled!');
          setIsPolling(false);
          queryClient.invalidateQueries({ queryKey: ['courses'] });
          queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
          setTimeout(() => setEnrollmentStatus(null), 3000);
        } else if (status === 'failed') {
          setEnrollmentStatus(
            response.data.data.error || 'Enrollment failed'
          );
          setIsPolling(false);
          setTimeout(() => setEnrollmentStatus(null), 5000);
        } else if (status === 'waiting' || status === 'active') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            setEnrollmentStatus('Enrollment is taking longer than expected...');
            setIsPolling(false);
            setTimeout(() => setEnrollmentStatus(null), 5000);
          }
        }
      } catch (error) {
        setEnrollmentStatus('Error checking enrollment status');
        setIsPolling(false);
        setTimeout(() => setEnrollmentStatus(null), 5000);
      }
    };

    poll();
  };

  const handleEnroll = () => {
    if (user?.role !== 'STUDENT') {
      setEnrollmentStatus('Only students can enroll in courses');
      setTimeout(() => setEnrollmentStatus(null), 3000);
      return;
    }
    enrollMutation.mutate();
  };

  const getCategoryBadge = () => {
    if (!course.category) return null;

    const badges = {
      CORE: { label: 'Core', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      MAJOR_REQUIRED: { label: 'Major Required', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      MAJOR_ELECTIVE: { label: 'Major Elective', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      FREE_ELECTIVE: { label: 'Free Elective', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
    };

    const badge = badges[course.category];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      {/* Recommendation Banner */}
      {course.recommendation && (
        <div className={`mb-3 p-2 rounded-lg border-l-4 flex items-start gap-2 ${
          course.recommendation.priority === 'HIGH'
            ? 'bg-red-50 dark:bg-red-950/30 border-red-500'
            : course.recommendation.priority === 'MEDIUM'
            ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500'
            : 'bg-green-50 dark:bg-green-950/30 border-green-500'
        }`}>
          <Award className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
            course.recommendation.priority === 'HIGH'
              ? 'text-red-600 dark:text-red-400'
              : course.recommendation.priority === 'MEDIUM'
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-green-600 dark:text-green-400'
          }`} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground">Recommended</div>
            <div className="text-xs text-muted-foreground">{course.recommendation.reason}</div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-foreground">
            {course.courseCode}
          </h3>
          <p className="text-foreground font-medium">{course.courseName}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {getCategoryBadge()}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {course.credits} Credits
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center text-muted-foreground">
          <span className="font-medium w-24">Instructor:</span>
          <span>{course.instructor?.fullName || 'TBA'}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <span className="font-medium w-24">Department:</span>
          <span>{course.department}</span>
        </div>
        {course.prerequisites && (
          <div className="flex items-start text-muted-foreground">
            <span className="font-medium w-24 flex-shrink-0">Prerequisites:</span>
            <span className="flex-1">{course.prerequisites}</span>
          </div>
        )}
      </div>

      {/* Time Slots */}
      {course.timeSlots.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-foreground mb-2">Schedule:</p>
          <div className="space-y-1">
            {course.timeSlots.map((slot, index) => (
              <div
                key={index}
                className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded"
              >
                <span className="font-medium">{slot.dayOfWeek}</span> {slot.startTime} -{' '}
                {slot.endTime} • {formatLocation(slot.location)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {course.description && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {course.description}
          </p>
        </div>
      )}

      {/* Capacity Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Enrollment</span>
          <span className={`font-medium ${isFull ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
            {course.currentEnrollment} / {course.maxCapacity}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              fillPercentage >= 100
                ? 'bg-red-500 dark:bg-red-600'
                : fillPercentage >= 80
                ? 'bg-yellow-500 dark:bg-yellow-600'
                : 'bg-green-500 dark:bg-green-600'
            }`}
            style={{ width: `${Math.min(fillPercentage, 100)}%` }}
          ></div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isFull ? 'Course is full - will be added to waitlist' : `${seatsAvailable} seats available`}
        </p>
      </div>

      {/* Enrollment Status Message */}
      {enrollmentStatus && (
        <div
          className={`mb-4 px-4 py-2 rounded text-sm ${
            enrollmentStatus.includes('Success')
              ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
              : enrollmentStatus.includes('Processing')
              ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
          }`}
        >
          {enrollmentStatus}
        </div>
      )}

      {/* Enroll Button */}
      {user?.role === 'STUDENT' && (
        <button
          onClick={handleEnroll}
          disabled={enrollMutation.isPending || isPolling}
          className={`btn-primary w-full ${
            enrollMutation.isPending || isPolling
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        >
          {enrollMutation.isPending || isPolling ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Enroll in Course'
          )}
        </button>
      )}
    </div>
  );
}
