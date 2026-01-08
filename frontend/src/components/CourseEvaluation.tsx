import React, { useState, useEffect } from 'react';
import { courseEvaluationService } from '../services/courseEvaluationService';
import type { SubmitEvaluationData } from '../types';

interface CourseInfo {
  id: number;
  course_code: string;
  course_name: string;
  department: string;
  instructor_name?: string;
  semester: 'FALL' | 'SPRING' | 'SUMMER';
  year: number;
}

interface CourseEvaluationProps {
  course: CourseInfo;
  studentId: number;
  onSubmitSuccess?: () => void;
}

const CourseEvaluation: React.FC<CourseEvaluationProps> = ({ course, studentId, onSubmitSuccess }) => {
  const [overallRating, setOverallRating] = useState<number>(0);
  const [instructorRating, setInstructorRating] = useState<number>(0);
  const [courseContentRating, setCourseContentRating] = useState<number>(0);
  const [workloadRating, setWorkloadRating] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [hoveredStar, setHoveredStar] = useState<{ category: string; value: number } | null>(null);

  const ratingCategories = [
    {
      key: 'overall',
      label: 'Overall Satisfaction',
      value: overallRating,
      setter: setOverallRating,
      description: 'How satisfied are you with this course overall?'
    },
    {
      key: 'instructor',
      label: 'Instructor Effectiveness',
      value: instructorRating,
      setter: setInstructorRating,
      description: 'How effective was the instructor in teaching the material?'
    },
    {
      key: 'content',
      label: 'Course Content',
      value: courseContentRating,
      setter: setCourseContentRating,
      description: 'How would you rate the quality and relevance of course content?'
    },
    {
      key: 'workload',
      label: 'Workload',
      value: workloadRating,
      setter: setWorkloadRating,
      description: 'How appropriate was the course workload? (1 = Too light, 3 = Appropriate, 5 = Too heavy)'
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (overallRating === 0 || instructorRating === 0 || courseContentRating === 0 || workloadRating === 0) {
      setError('Please provide ratings for all categories');
      return;
    }

    try {
      setLoading(true);

      const evaluationData: SubmitEvaluationData = {
        student_id: studentId,
        course_id: course.id,
        term: course.semester,
        year: course.year,
        overall_rating: overallRating,
        instructor_rating: instructorRating,
        course_content_rating: courseContentRating,
        workload_rating: workloadRating,
        comments: comments.trim() || undefined,
        is_anonymous: isAnonymous,
      };

      await courseEvaluationService.submitEvaluation(evaluationData);
      setSuccess(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      }, 2000);
    } catch (err: any) {
      console.error('Submit evaluation error:', err);
      setError(err.response?.data?.error || 'Failed to submit evaluation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (category: { key: string; label: string; value: number; setter: (val: number) => void; description: string }) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {category.label} <span className="text-red-500">*</span>
          </label>
          {category.value > 0 && (
            <span className="text-sm text-gray-600">{category.value} / 5</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-2">{category.description}</p>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const isHovered = hoveredStar?.category === category.key && hoveredStar.value >= star;
            const isSelected = category.value >= star;
            const shouldFill = isHovered || isSelected;

            return (
              <button
                key={star}
                type="button"
                onClick={() => category.setter(star)}
                onMouseEnter={() => setHoveredStar({ category: category.key, value: star })}
                onMouseLeave={() => setHoveredStar(null)}
                className="focus:outline-none transition-transform hover:scale-110"
                disabled={loading || success}
              >
                <svg
                  className={`w-8 h-8 ${
                    shouldFill ? 'text-yellow-400' : 'text-gray-300'
                  } ${loading || success ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  fill={shouldFill ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-green-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h3>
          <p className="text-gray-600">
            Your course evaluation has been submitted successfully.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Your feedback helps improve the quality of education.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Course Evaluation</h2>

      {/* Course Information */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Course Code</p>
            <p className="font-semibold text-gray-800">{course.course_code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Course Name</p>
            <p className="font-semibold text-gray-800">{course.course_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Department</p>
            <p className="font-semibold text-gray-800">{course.department}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Instructor</p>
            <p className="font-semibold text-gray-800">{course.instructor_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Term</p>
            <p className="font-semibold text-gray-800">
              {course.semester} {course.year}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Evaluation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Ratings */}
        {ratingCategories.map((category) => (
          <div key={category.key} className="pb-4 border-b border-gray-200">
            {renderStarRating(category)}
          </div>
        ))}

        {/* Comments */}
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Share any additional thoughts or suggestions about the course.
          </p>
          <textarea
            id="comments"
            rows={5}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your comments here..."
            disabled={loading}
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comments.length} / 1000 characters
          </p>
        </div>

        {/* Anonymous Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isAnonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={loading}
          />
          <label htmlFor="isAnonymous" className="text-sm text-gray-700">
            Submit anonymously (Your name will not be visible to instructors)
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-6 py-3 text-white font-semibold rounded-lg transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
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
                Submitting...
              </span>
            ) : (
              'Submit Evaluation'
            )}
          </button>
        </div>
      </form>

      {/* Disclaimer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Your honest feedback is valuable for improving course quality. All evaluations are confidential
          {isAnonymous && ' and anonymous'}.
        </p>
      </div>
    </div>
  );
};

export default CourseEvaluation;
