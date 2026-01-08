import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { academicAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, ChevronUp, Download, Award, TrendingUp } from 'lucide-react';
import { formatSemesterYear } from '../utils/semesterFormatter';

export function Transcript() {
  const { user } = useAuth();
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  const { data: transcript, isLoading } = useQuery({
    queryKey: ['transcript'],
    queryFn: () => academicAPI.getTranscript().then(res => res.data.data),
  });

  const toggleTerm = (termKey: string) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(termKey)) {
      newExpanded.delete(termKey);
    } else {
      newExpanded.add(termKey);
    }
    setExpandedTerms(newExpanded);
  };

  const expandAll = () => {
    if (transcript) {
      const allTerms = transcript.map((_: any, index: number) => `term-${index}`);
      setExpandedTerms(new Set(allTerms));
    }
  };

  const collapseAll = () => {
    setExpandedTerms(new Set());
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await academicAPI.generateTranscriptPDF();

      // Check if response data exists
      if (!response.data) {
        throw new Error('No PDF data received from server');
      }

      // The response.data is already a Blob when responseType is 'blob'
      let blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/pdf' });

      // Verify it's a valid blob with content
      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }

      // Check if the blob is actually a JSON error response
      if (blob.type === 'application/json' || blob.type === 'text/plain') {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || errorData.message || 'Server error while generating PDF');
        } catch (parseError) {
          throw new Error(`Server returned an error: ${text}`);
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript_${user?.userIdentifier}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to download PDF. Please try again.';
      alert(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Academic Transcript</h1>
          <p className="mt-2 text-muted-foreground">Your official academic record</p>
        </div>
        <div className="flex items-center gap-3">
          {transcript && transcript.length > 0 && (
            <>
              <button
                onClick={expandAll}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
              >
                Collapse All
              </button>
            </>
          )}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {transcript && transcript.length > 0 ? (
        <div className="space-y-6">
          {/* Student Information Card */}
          <div className="bg-card border border-border rounded-lg shadow-lg p-6">
            <div className="border-b border-border pb-4 mb-4">
              <h2 className="text-2xl font-bold text-foreground text-center">
                The Chinese University of Hong Kong, Shenzhen
              </h2>
              <h3 className="text-lg text-muted-foreground text-center mt-2">Official Academic Transcript</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Student Name</div>
                    <div className="text-base font-semibold text-foreground">{user?.fullName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Student ID</div>
                    <div className="text-base font-semibold text-foreground">{user?.userIdentifier}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Email</div>
                    <div className="text-base text-foreground">{user?.email}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Major</div>
                    <div className="text-base font-semibold text-foreground">{user?.major || 'Undeclared'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Year Level</div>
                    <div className="text-base font-semibold text-foreground">Year {user?.yearLevel || 1}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Date Generated</div>
                    <div className="text-base text-foreground">{new Date().toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Summary */}
          {transcript[transcript.length - 1] && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5" />
                  <div className="text-sm font-medium opacity-90">Cumulative GPA</div>
                </div>
                <div className="text-4xl font-bold">
                  {transcript[transcript.length - 1].gpa?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs opacity-75 mt-1">/ 4.00</div>
              </div>

              <div className="bg-card border border-border rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="text-sm font-medium text-muted-foreground">Total Credits</div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {transcript[transcript.length - 1].totalCredits || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Credits Earned</div>
              </div>

              <div className="bg-card border border-border rounded-lg shadow p-6 border-l-4 border-purple-500">
                <div className="text-sm font-medium text-muted-foreground">Quality Points</div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {transcript[transcript.length - 1].qualityPoints?.toFixed(1) || '0.0'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total QP</div>
              </div>

              <div className="bg-card border border-border rounded-lg shadow p-6 border-l-4 border-indigo-500">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium text-muted-foreground">Academic Standing</div>
                </div>
                <div className="text-xl font-bold text-foreground">
                  {transcript[transcript.length - 1].academicStanding || 'Good Standing'}
                </div>
              </div>
            </div>
          )}

          {/* Term-by-Term Transcript */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Academic History</h2>
            {transcript.map((term: any, index: number) => {
              const termKey = `term-${index}`;
              const isExpanded = expandedTerms.has(termKey);

              return (
                <div key={index} className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {/* Term Header - Clickable */}
                  <button
                    onClick={() => toggleTerm(termKey)}
                    className="w-full bg-muted/50 px-6 py-4 border-b border-border hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <h3 className="text-xl font-semibold text-foreground">
                            {formatSemesterYear(term.semester, term.year)}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {term.courses?.length || 0} courses • {term.termCredits || 0} credits
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Term GPA</div>
                          <div className="text-2xl font-bold text-foreground">
                            {term.termGPA?.toFixed(2) || '—'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Cumulative GPA</div>
                          <div className="text-2xl font-bold text-primary">
                            {term.gpa?.toFixed(2) || '—'}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Term Content - Expandable */}
                  {isExpanded && (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Course Code
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Course Title
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Credits
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Grade
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Points
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {term.courses && term.courses.map((course: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                  {course.courseCode}
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                  {course.courseName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-foreground">
                                  {course.credits}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <span className={`font-semibold ${
                                    course.letterGrade?.startsWith('A')
                                      ? 'text-green-600 dark:text-green-400'
                                      : course.letterGrade?.startsWith('B')
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : course.letterGrade?.startsWith('C')
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : course.letterGrade === 'F'
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-muted-foreground'
                                  }`}>
                                    {course.letterGrade || '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-foreground">
                                  {course.gradePoints?.toFixed(2) || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-muted/50 font-semibold">
                            <tr>
                              <td colSpan={2} className="px-6 py-3 text-sm text-foreground">
                                Term Totals
                              </td>
                              <td className="px-6 py-3 text-sm text-center text-foreground">
                                {term.termCredits || 0}
                              </td>
                              <td className="px-6 py-3 text-sm text-center text-foreground">
                                GPA: {term.termGPA?.toFixed(2) || '—'}
                              </td>
                              <td className="px-6 py-3 text-sm text-center text-foreground">
                                {term.termQualityPoints?.toFixed(1) || '—'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Cumulative Summary for this term */}
                      <div className="bg-blue-50 dark:bg-blue-950/30 px-6 py-4 border-t border-border">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Cumulative Credits: </span>
                            <span className="font-semibold text-foreground">{term.totalCredits || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cumulative GPA: </span>
                            <span className="font-semibold text-foreground">{term.gpa?.toFixed(2) || '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Academic Standing: </span>
                            <span className="font-semibold text-foreground">{term.academicStanding || 'Good Standing'}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="bg-card border border-border rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Grading Scale</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="font-medium text-green-600 dark:text-green-400">A+, A</span>
                <span className="text-muted-foreground"> = 4.0</span>
              </div>
              <div>
                <span className="font-medium text-green-600 dark:text-green-400">A-</span>
                <span className="text-muted-foreground"> = 3.7</span>
              </div>
              <div>
                <span className="font-medium text-blue-600 dark:text-blue-400">B+</span>
                <span className="text-muted-foreground"> = 3.3</span>
              </div>
              <div>
                <span className="font-medium text-blue-600 dark:text-blue-400">B</span>
                <span className="text-muted-foreground"> = 3.0</span>
              </div>
              <div>
                <span className="font-medium text-blue-600 dark:text-blue-400">B-</span>
                <span className="text-muted-foreground"> = 2.7</span>
              </div>
              <div>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">C+</span>
                <span className="text-muted-foreground"> = 2.3</span>
              </div>
              <div>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">C</span>
                <span className="text-muted-foreground"> = 2.0</span>
              </div>
              <div>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">C-</span>
                <span className="text-muted-foreground"> = 1.7</span>
              </div>
              <div>
                <span className="font-medium text-orange-600 dark:text-orange-400">D</span>
                <span className="text-muted-foreground"> = 1.0</span>
              </div>
              <div>
                <span className="font-medium text-red-600 dark:text-red-400">F</span>
                <span className="text-muted-foreground"> = 0.0</span>
              </div>
            </div>
          </div>

          {/* Official Notice */}
          <div className="bg-muted/50 border-l-4 border-muted-foreground/50 p-6 rounded">
            <h4 className="text-sm font-medium text-foreground mb-2">Official Transcript Notice</h4>
            <p className="text-sm text-muted-foreground">
              This is an unofficial transcript for your personal records. For official transcripts, please submit a request through the Registrar's Office. Official transcripts are sealed and sent directly to the requesting institution.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Generated on: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-foreground">No transcript available</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your transcript will be available once grades are posted.
          </p>
        </div>
      )}
    </div>
  );
}
