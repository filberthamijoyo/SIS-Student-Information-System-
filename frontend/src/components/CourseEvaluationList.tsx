import React, { useState, useEffect } from 'react';
import { courseEvaluationService } from '../services/courseEvaluationService';
import type { PendingEvaluation } from '../types';
import CourseEvaluation from './CourseEvaluation';

interface CourseEvaluationListProps {
  studentId: number;
}

const CourseEvaluationList: React.FC<CourseEvaluationListProps> = ({ studentId }) => {
  const [pendingEvaluations, setPendingEvaluations] = useState<PendingEvaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<PendingEvaluation | null>(null);
  const [showEvaluationForm, setShowEvaluationForm] = useState<boolean>(false);

  useEffect(() => {
    loadPendingEvaluations();
  }, [studentId]);

  const loadPendingEvaluations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseEvaluationService.getPendingEvaluations(studentId);
      setPendingEvaluations(data);
    } catch (err: any) {
      console.error('Load pending evaluations error:', err);
      setError(err.response?.data?.error || 'Failed to load pending evaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateCourse = (course: PendingEvaluation) => {
    setSelectedCourse(course);
    setShowEvaluationForm(true);
  };

  const handleEvaluationSuccess = () => {
    setShowEvaluationForm(false);
    setSelectedCourse(null);
    loadPendingEvaluations(); // Reload the list
  };

  const handleBack = () => {
    setShowEvaluationForm(false);
    setSelectedCourse(null);
  };

  if (showEvaluationForm && selectedCourse) {
    return (
      <div>
        <button
          onClick={handleBack}
          className="mb-4 flex items-center text-blue-600 hover:text-blue-700 font-medium"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Pending Evaluations
        </button>
        <CourseEvaluation
          course={{
            id: selectedCourse.id,
            course_code: selectedCourse.course_code,
            course_name: selectedCourse.course_name,
            department: selectedCourse.department,
            instructor_name: selectedCourse.instructor_name,
            semester: selectedCourse.semester as 'FALL' | 'SPRING' | 'SUMMER',
            year: selectedCourse.year,
          }}
          studentId={studentId}
          onSubmitSuccess={handleEvaluationSuccess}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Pending Course Evaluations</h2>
        <button
          onClick={loadPendingEvaluations}
          disabled={loading}
          className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
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
            <span className="text-gray-600">Loading pending evaluations...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && pendingEvaluations.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
          <h3 className="text-lg font-semibold text-gray-700 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">You have no pending course evaluations at this time.</p>
        </div>
      )}

      {/* Evaluations List */}
      {!loading && !error && pendingEvaluations.length > 0 && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  You have {pendingEvaluations.length} course{pendingEvaluations.length !== 1 ? 's' : ''} pending evaluation
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Your feedback helps improve the quality of education for future students
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {pendingEvaluations.map((course) => (
              <div
                key={course.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {course.course_code}
                        </h3>
                        <p className="text-gray-600 mt-1">{course.course_name}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1.5 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            <span>{course.department}</span>
                          </div>
                          <div className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1.5 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {course.semester} {course.year}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-1.5 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                              />
                            </svg>
                            <span>{course.credits} Credits</span>
                          </div>
                          {course.instructor_name && (
                            <div className="flex items-center">
                              <svg
                                className="w-4 h-4 mr-1.5 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              <span>{course.instructor_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 md:ml-6">
                    <button
                      onClick={() => handleEvaluateCourse(course)}
                      className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Evaluate Course
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseEvaluationList;
