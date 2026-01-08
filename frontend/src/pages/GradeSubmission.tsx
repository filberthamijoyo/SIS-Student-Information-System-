import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { facultyAPI } from '../services/api';

export function GradeSubmission() {
  const { courseId } = useParams<{ courseId: string }>();
  const [grades, setGrades] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: roster, isLoading } = useQuery({
    queryKey: ['course-roster', courseId],
    queryFn: () => facultyAPI.getRoster(parseInt(courseId!)).then(res => res.data.data),
  });

  const { data: courseGrades } = useQuery({
    queryKey: ['course-grades', courseId],
    queryFn: () => facultyAPI.getCourseGrades(parseInt(courseId!)).then(res => res.data.data),
  });

  useEffect(() => {
    if (roster && courseGrades) {
      // Merge roster with existing grades
      const mergedData = roster.map((student: any) => {
        const existingGrade = courseGrades.find((g: any) => g.enrollmentId === student.enrollmentId);
        return {
          enrollmentId: student.enrollmentId,
          studentId: student.studentId,
          studentName: student.fullName,
          email: student.email,
          numericGrade: existingGrade?.numericGrade || '',
          letterGrade: existingGrade?.letterGrade || '',
          comments: existingGrade?.comments || '',
        };
      });
      setGrades(mergedData);
    }
  }, [roster, courseGrades]);

  const submitMutation = useMutation({
    mutationFn: (gradesData: any[]) => facultyAPI.submitGrades(gradesData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-grades', courseId] });
      setHasChanges(false);
      alert('Grades submitted successfully!');
    },
    onError: () => {
      alert('Failed to submit grades. Please try again.');
    },
  });

  const calculateLetterGrade = (numeric: number): string => {
    if (numeric >= 93) return 'A+';
    if (numeric >= 90) return 'A';
    if (numeric >= 87) return 'A-';
    if (numeric >= 83) return 'B+';
    if (numeric >= 80) return 'B';
    if (numeric >= 77) return 'B-';
    if (numeric >= 73) return 'C+';
    if (numeric >= 70) return 'C';
    if (numeric >= 67) return 'C-';
    if (numeric >= 60) return 'D';
    return 'F';
  };

  const handleNumericGradeChange = (enrollmentId: number, value: string) => {
    const numericValue = parseFloat(value);
    const letterGrade = !isNaN(numericValue) ? calculateLetterGrade(numericValue) : '';

    setGrades(prevGrades =>
      prevGrades.map(g =>
        g.enrollmentId === enrollmentId
          ? { ...g, numericGrade: value, letterGrade }
          : g
      )
    );
    setHasChanges(true);
  };

  const handleLetterGradeChange = (enrollmentId: number, value: string) => {
    setGrades(prevGrades =>
      prevGrades.map(g =>
        g.enrollmentId === enrollmentId
          ? { ...g, letterGrade: value }
          : g
      )
    );
    setHasChanges(true);
  };

  const handleCommentsChange = (enrollmentId: number, value: string) => {
    setGrades(prevGrades =>
      prevGrades.map(g =>
        g.enrollmentId === enrollmentId
          ? { ...g, comments: value }
          : g
      )
    );
    setHasChanges(true);
  };

  const handleSubmitGrades = () => {
    if (!hasChanges) {
      alert('No changes to submit.');
      return;
    }

    // Filter out students without grades
    const gradesToSubmit = grades
      .filter(g => g.numericGrade && g.letterGrade)
      .map(g => ({
        enrollmentId: g.enrollmentId,
        numericGrade: parseFloat(g.numericGrade),
        letterGrade: g.letterGrade,
        comments: g.comments || undefined,
      }));

    if (gradesToSubmit.length === 0) {
      alert('Please enter at least one grade before submitting.');
      return;
    }

    if (window.confirm(`Submit grades for ${gradesToSubmit.length} student(s)?`)) {
      submitMutation.mutate(gradesToSubmit);
    }
  };

  const getGradeColor = (letterGrade: string) => {
    if (letterGrade.startsWith('A')) return 'text-green-600 font-semibold';
    if (letterGrade.startsWith('B')) return 'text-blue-600 font-semibold';
    if (letterGrade.startsWith('C')) return 'text-yellow-600 font-semibold';
    if (letterGrade.startsWith('D')) return 'text-orange-600 font-semibold';
    if (letterGrade === 'F') return 'text-red-600 font-bold';
    return 'text-gray-600';
  };

  const calculateStatistics = () => {
    const validGrades = grades.filter(g => g.numericGrade && !isNaN(parseFloat(g.numericGrade)));
    if (validGrades.length === 0) return null;

    const numericGrades = validGrades.map(g => parseFloat(g.numericGrade));
    const average = numericGrades.reduce((sum, g) => sum + g, 0) / numericGrades.length;
    const highest = Math.max(...numericGrades);
    const lowest = Math.min(...numericGrades);

    return { average, highest, lowest, count: validGrades.length };
  };

  const stats = calculateStatistics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grade Submission</h1>
          <p className="mt-2 text-gray-600">
            {roster && roster[0]?.course?.courseCode} - {roster && roster[0]?.course?.courseName}
          </p>
        </div>
        <button
          onClick={handleSubmitGrades}
          disabled={!hasChanges || submitMutation.isPending}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitMutation.isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Grades
            </>
          )}
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-600">Average Grade</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {stats.average.toFixed(1)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-sm font-medium text-gray-600">Highest Grade</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {stats.highest.toFixed(1)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="text-sm font-medium text-gray-600">Lowest Grade</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {stats.lowest.toFixed(1)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-sm font-medium text-gray-600">Graded Students</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {stats.count} / {grades.length}
            </div>
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You have unsaved changes. Don't forget to submit your grades before leaving this page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grade Entry Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Student Roster & Grades</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numeric Grade
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Letter Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comments
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grades.map((student) => (
                <tr key={student.enrollmentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.studentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={student.numericGrade}
                      onChange={(e) => handleNumericGradeChange(student.enrollmentId, e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0-100"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <select
                      value={student.letterGrade}
                      onChange={(e) => handleLetterGradeChange(student.enrollmentId, e.target.value)}
                      className={`w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${getGradeColor(student.letterGrade)}`}
                    >
                      <option value="">-</option>
                      <option value="A+">A+</option>
                      <option value="A">A</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B">B</option>
                      <option value="B-">B-</option>
                      <option value="C+">C+</option>
                      <option value="C">C</option>
                      <option value="C-">C-</option>
                      <option value="D">D</option>
                      <option value="F">F</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={student.comments}
                      onChange={(e) => handleCommentsChange(student.enrollmentId, e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional comments"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {grades.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students enrolled</h3>
            <p className="mt-1 text-sm text-gray-500">
              This course has no enrolled students yet.
            </p>
          </div>
        )}
      </div>

      {/* Grading Scale Reference */}
      <div className="mt-8 bg-gray-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading Scale Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="font-medium text-green-600">A+ (93-100)</span>
            <span className="text-gray-600"> = 4.0</span>
          </div>
          <div>
            <span className="font-medium text-green-600">A (90-92)</span>
            <span className="text-gray-600"> = 4.0</span>
          </div>
          <div>
            <span className="font-medium text-green-600">A- (87-89)</span>
            <span className="text-gray-600"> = 3.7</span>
          </div>
          <div>
            <span className="font-medium text-blue-600">B+ (83-86)</span>
            <span className="text-gray-600"> = 3.3</span>
          </div>
          <div>
            <span className="font-medium text-blue-600">B (80-82)</span>
            <span className="text-gray-600"> = 3.0</span>
          </div>
          <div>
            <span className="font-medium text-blue-600">B- (77-79)</span>
            <span className="text-gray-600"> = 2.7</span>
          </div>
          <div>
            <span className="font-medium text-yellow-600">C+ (73-76)</span>
            <span className="text-gray-600"> = 2.3</span>
          </div>
          <div>
            <span className="font-medium text-yellow-600">C (70-72)</span>
            <span className="text-gray-600"> = 2.0</span>
          </div>
          <div>
            <span className="font-medium text-yellow-600">C- (67-69)</span>
            <span className="text-gray-600"> = 1.7</span>
          </div>
          <div>
            <span className="font-medium text-orange-600">D (60-66)</span>
            <span className="text-gray-600"> = 1.0</span>
          </div>
          <div>
            <span className="font-medium text-red-600">F (0-59)</span>
            <span className="text-gray-600"> = 0.0</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Grade Submission Instructions</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Enter numeric grades (0-100) and the letter grade will be automatically calculated</li>
          <li>• You can also manually adjust letter grades if needed</li>
          <li>• Add optional comments for individual students</li>
          <li>• Click "Submit Grades" to save your changes</li>
          <li>• Grades will be visible to students once submitted and published</li>
        </ul>
      </div>
    </div>
  );
}
