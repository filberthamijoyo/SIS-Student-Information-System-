import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Award, AlertCircle, BarChart3 } from 'lucide-react';
import { academicAPI } from '../services/api';
import { formatTermString, sortTermsChronologically } from '../utils/semesterFormatter';

interface GradeData {
  courseCode: string;
  courseName: string;
  semester: string;
  year: number;
  letterGrade: string;
  numericGrade: number;
  gradePoints: number;
  credits: number;
  status: string;
}

interface GPAHistory {
  term: string;
  gpa: number;
  credits: number;
}

export function GradeAnalytics() {
  const { data: gradesData, isLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => academicAPI.getGrades().then(res => res.data.data),
  });

  const { data: gpaData } = useQuery({
    queryKey: ['gpa'],
    queryFn: () => academicAPI.getGPA().then(res => res.data.data),
  });

  // Calculate GPA history by term
  const gpaHistory: GPAHistory[] = [];
  const gradesByTerm = gradesData?.reduce((acc: any, grade: GradeData) => {
    const termKey = `${grade.semester} ${grade.year}`;
    if (!acc[termKey]) {
      acc[termKey] = [];
    }
    acc[termKey].push(grade);
    return acc;
  }, {}) || {};

  Object.entries(gradesByTerm)
    .sort(([termA], [termB]) => sortTermsChronologically(termA, termB))
    .forEach(([term, grades]: [string, any]) => {
      // Filter published grades and exclude withdrawn courses
      const publishedGrades = grades.filter((g: GradeData) => 
        g.status === 'PUBLISHED' && 
        g.gradePoints !== null && 
        g.gradePoints !== undefined &&
        g.letterGrade?.toUpperCase() !== 'W'
      );
      
      if (publishedGrades.length > 0) {
        // Calculate GPA using quality points weighted by credits
        const totalQualityPoints = publishedGrades.reduce(
          (sum: number, g: GradeData) => sum + (g.gradePoints || 0) * (g.credits || 0),
          0
        );
        const totalCredits = publishedGrades.reduce((sum: number, g: GradeData) => sum + (g.credits || 0), 0);
        const termGPA = totalCredits > 0 ? totalQualityPoints / totalCredits : 0;
        
        if (termGPA > 0) {
          gpaHistory.push({
            term,
            gpa: termGPA,
            credits: totalCredits,
          });
        }
      }
    });

  // Calculate grade distribution
  const gradeDistribution = gradesData?.reduce((acc: any, grade: GradeData) => {
    if (grade.status === 'PUBLISHED') {
      const letter = grade.letterGrade;
      acc[letter] = (acc[letter] || 0) + 1;
    }
    return acc;
  }, {}) || {};

  // Find best and worst performing courses (only published grades with numeric values)
  const publishedGrades = gradesData?.filter((g: GradeData) => 
    g.status === 'PUBLISHED' && 
    g.numericGrade !== null && 
    g.numericGrade !== undefined &&
    g.letterGrade?.toUpperCase() !== 'W'
  ) || [];
  
  const bestCourses = [...publishedGrades]
    .filter((g: GradeData) => g.numericGrade !== null && g.numericGrade !== undefined)
    .sort((a, b) => (b.numericGrade || 0) - (a.numericGrade || 0))
    .slice(0, 5);
    
  const worstCourses = [...publishedGrades]
    .filter((g: GradeData) => g.numericGrade !== null && g.numericGrade !== undefined)
    .sort((a, b) => (a.numericGrade || 0) - (b.numericGrade || 0))
    .slice(0, 5);

  // Calculate current term GPA from most recent term
  const currentTermGPA = gpaHistory.length > 0 
    ? gpaHistory[gpaHistory.length - 1].gpa 
    : null;

  // Calculate GPA trend (increasing, decreasing, stable)
  const trend = gpaHistory.length >= 2
    ? gpaHistory[gpaHistory.length - 1].gpa - gpaHistory[gpaHistory.length - 2].gpa
    : 0;

  const getGradeColor = (letterGrade: string) => {
    if (!letterGrade) return 'bg-gray-500 dark:bg-gray-600';
    if (letterGrade.startsWith('A')) return 'bg-green-500 dark:bg-green-600';
    if (letterGrade.startsWith('B')) return 'bg-blue-500 dark:bg-blue-600';
    if (letterGrade.startsWith('C')) return 'bg-yellow-500 dark:bg-yellow-600';
    if (letterGrade.startsWith('D')) return 'bg-orange-500 dark:bg-orange-600';
    if (letterGrade === 'F') return 'bg-red-500 dark:bg-red-600';
    return 'bg-gray-500 dark:bg-gray-600';
  };

  const getLetterGradeColor = (letterGrade: string) => {
    if (!letterGrade) return 'text-muted-foreground';
    if (letterGrade.startsWith('A')) return 'text-green-600 dark:text-green-400';
    if (letterGrade.startsWith('B')) return 'text-blue-600 dark:text-blue-400';
    if (letterGrade.startsWith('C')) return 'text-yellow-600 dark:text-yellow-400';
    if (letterGrade.startsWith('D')) return 'text-orange-600 dark:text-orange-400';
    if (letterGrade === 'F') return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
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
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Grade Analytics
        </h1>
        <p className="mt-2 text-muted-foreground">Visual insights into your academic performance</p>
      </div>

      {/* GPA Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="text-sm font-medium opacity-90">Cumulative GPA</div>
          <div className="mt-2 text-4xl font-bold">
            {gpaData?.cumulativeGPA?.toFixed(2) || '—'}
          </div>
          <div className="mt-1 text-sm opacity-90">{gpaData?.academicStanding}</div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Current Term GPA</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {currentTermGPA !== null ? currentTermGPA.toFixed(2) : '—'}
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm">
            {trend > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400 font-medium">+{trend.toFixed(2)}</span>
              </>
            ) : trend < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400 font-medium">{trend.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No change</span>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Courses</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {publishedGrades.length}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">Completed</div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Credits</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {gpaData?.totalCredits || 0}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">Earned</div>
        </div>
      </div>

      {/* GPA Trend Chart */}
      <div className="bg-card border border-border rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">GPA Trend Over Time</h2>

        {gpaHistory.length > 0 ? (
          <div className="space-y-4">
            {/* Simple bar chart */}
            <div className="h-64 flex items-end gap-2">
              {gpaHistory.map((item, index) => {
                const maxGPA = 4.0;
                const validGPA = item.gpa && !isNaN(item.gpa) && isFinite(item.gpa) ? item.gpa : 0;
                const height = Math.max((validGPA / maxGPA) * 100, 2); // Minimum 2% height for visibility
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-medium text-foreground">
                      {validGPA > 0 ? validGPA.toFixed(2) : '—'}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary/70 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${formatTermString(item.term)}: ${validGPA > 0 ? validGPA.toFixed(2) : 'N/A'} GPA`}
                    ></div>
                    <div className="text-xs text-muted-foreground text-center break-words w-full">
                      {(() => {
                        const formatted = formatTermString(item.term);
                        const parts = formatted.split(' ');
                        if (parts.length >= 2) {
                          // Extract "Term 1" or "Term 2" and year
                          const termPart = parts[0] === 'Term' ? `T${parts[1]}` : parts[0];
                          const year = parts[parts.length - 1];
                          return `${termPart} '${year.substring(2)}`;
                        }
                        return formatted;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-sm border-t border-border pt-4">
              <div className="text-muted-foreground">
                <span className="font-medium">{gpaHistory.length}</span> terms completed
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span className="text-muted-foreground">Term GPA</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No GPA history available yet
          </div>
        )}
      </div>

      {/* Grade Distribution */}
      <div className="bg-card border border-border rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Grade Distribution</h2>

        {Object.keys(gradeDistribution).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(gradeDistribution)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([grade, count]: [string, any]) => {
                const total = Object.values(gradeDistribution).reduce((sum: number, c: any) => sum + c, 0) as number;
                const percentage = ((count / total) * 100).toFixed(1);
                return (
                  <div key={grade} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-semibold ${getLetterGradeColor(grade)}`}>
                        {grade}
                      </span>
                      <span className="text-muted-foreground">
                        {count} course{count !== 1 ? 's' : ''} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getGradeColor(grade)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No grade distribution data available
          </div>
        )}
      </div>

      {/* Best and Worst Performing Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Performing */}
        <div className="bg-card border border-border rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
            Top Performing Courses
          </h2>

          {bestCourses.length > 0 ? (
            <div className="space-y-3">
              {bestCourses.map((course, index) => (
                <div
                  key={`${course.courseCode}-${index}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {course.courseCode || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {course.courseName || 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getLetterGradeColor(course.letterGrade || '')}`}>
                        {course.letterGrade || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {course.numericGrade !== null && course.numericGrade !== undefined 
                          ? course.numericGrade.toFixed(1) 
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No course data available
            </div>
          )}
        </div>

        {/* Worst Performing */}
        <div className="bg-card border border-border rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Areas for Improvement
          </h2>

          {worstCourses.length > 0 ? (
            <div className="space-y-3">
              {worstCourses.map((course, index) => (
                <div
                  key={`${course.courseCode}-${index}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {course.courseCode || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {course.courseName || 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getLetterGradeColor(course.letterGrade || '')}`}>
                        {course.letterGrade || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {course.numericGrade !== null && course.numericGrade !== undefined 
                          ? course.numericGrade.toFixed(1) 
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No course data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
