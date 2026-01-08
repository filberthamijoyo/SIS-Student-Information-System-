import { useQuery } from '@tanstack/react-query';
import { academicAPI } from '../services/api';
import { formatTermString, sortTermsChronologically } from '../utils/semesterFormatter';

export function MyGrades() {

  const { data: gradesData, isLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => academicAPI.getGrades().then(res => res.data.data),
  });

  const { data: gpaData } = useQuery({
    queryKey: ['gpa'],
    queryFn: () => academicAPI.getGPA().then(res => res.data.data),
  });

  // Group grades by term
  const gradesByTerm = gradesData?.reduce((acc: any, grade: any) => {
    const termKey = `${grade.semester} ${grade.year}`;
    if (!acc[termKey]) {
      acc[termKey] = [];
    }
    acc[termKey].push(grade);
    return acc;
  }, {}) || {};

  const getGradeColor = (letterGrade: string) => {
    if (letterGrade.startsWith('A')) return 'text-green-600 dark:text-green-400 font-semibold';
    if (letterGrade.startsWith('B')) return 'text-blue-600 dark:text-blue-400 font-semibold';
    if (letterGrade.startsWith('C')) return 'text-yellow-600 dark:text-yellow-400 font-semibold';
    if (letterGrade.startsWith('D')) return 'text-orange-600 dark:text-orange-400 font-semibold';
    if (letterGrade === 'F') return 'text-red-600 dark:text-red-400 font-bold';
    return 'text-muted-foreground';
  };

  const calculateTermGPA = (grades: any[]) => {
    // Filter out withdrawn courses (W) and courses without grade points
    const validGrades = grades.filter(
      (g) => g.letterGrade?.toUpperCase() !== 'W' && g.gradePoints !== null && g.gradePoints !== undefined
    );
    
    if (!validGrades.length) return '0.00';
    
    // Calculate GPA using credits (quality points / credits)
    const totalQualityPoints = validGrades.reduce(
      (sum, g) => sum + (g.gradePoints || 0) * (g.credits || 0),
      0
    );
    const totalCredits = validGrades.reduce((sum, g) => sum + (g.credits || 0), 0);
    
    return totalCredits > 0 ? (totalQualityPoints / totalCredits).toFixed(2) : '0.00';
  };

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Grades</h1>
        <p className="mt-2 text-muted-foreground">View your grades and academic performance</p>
      </div>

      {/* GPA Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="text-sm font-medium opacity-90">Cumulative GPA</div>
          <div className="mt-2 text-4xl font-bold">
            {gpaData?.cumulativeGPA?.toFixed(2) || '—'}
          </div>
          <div className="mt-1 text-sm opacity-90">{gpaData?.academicStanding}</div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="text-sm font-medium text-muted-foreground">Current Term GPA</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {gpaData?.currentTermGPA?.toFixed(2) || '—'}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="text-sm font-medium text-muted-foreground">Total Credits</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {gpaData?.totalCredits || 0}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow p-6 border-l-4 border-indigo-500">
          <div className="text-sm font-medium text-muted-foreground">Quality Points</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {gpaData?.qualityPoints?.toFixed(1) || 0}
          </div>
        </div>
      </div>

      {/* Grades by Term */}
      <div className="space-y-8">
        {Object.entries(gradesByTerm)
          .sort(([termA], [termB]) => sortTermsChronologically(termA, termB))
          .reverse()
          .map(([term, grades]: [string, any]) => {
          const termGrades = grades as any[];
          const termGPA = calculateTermGPA(termGrades.filter(g => g.status === 'PUBLISHED'));

          return (
            <div key={term} className="bg-card border border-border rounded-lg shadow overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{formatTermString(term)}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {termGrades.length} courses
                  </p>
                </div>
                {termGPA !== '0.00' && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-muted-foreground">Term GPA</div>
                    <div className="text-2xl font-bold text-foreground">{termGPA}</div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Course Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Course Name
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Numeric Grade
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Letter Grade
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Grade Points
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {termGrades.map((grade: any, index: number) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {grade.courseCode}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {grade.courseName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-foreground">
                          {grade.credits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-foreground">
                          {grade.numericGrade ? grade.numericGrade.toFixed(1) : '—'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${getGradeColor(grade.letterGrade)}`}>
                          {grade.letterGrade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-foreground">
                          {grade.gradePoints ? grade.gradePoints.toFixed(2) : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            grade.status === 'PUBLISHED'
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          }`}>
                            {grade.status === 'PUBLISHED' ? 'Final' : 'In Progress'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {Object.keys(gradesByTerm).length === 0 && (
          <div className="bg-card border border-border rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No grades yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Grades will appear here once they are published by your instructors.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
