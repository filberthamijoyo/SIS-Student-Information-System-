import React from 'react';
import { useAuth } from '../context/AuthContext';
import CourseEvaluationList from '../components/CourseEvaluationList';

const EvaluationsPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            Please log in to access course evaluations.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Course Evaluations</h1>
          <p className="mt-2 text-muted-foreground">
            Provide feedback on your courses to help improve education quality
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-purple-600"
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
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-purple-800">Why Evaluate?</h3>
              <div className="mt-2 text-sm text-purple-700">
                <p>
                  Course evaluations help instructors improve their teaching methods and course content.
                  Your honest feedback is valuable and can be submitted anonymously.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Course Evaluation List Component */}
        <CourseEvaluationList studentId={user.id} />
      </div>
    </div>
  );
};

export default EvaluationsPage;
