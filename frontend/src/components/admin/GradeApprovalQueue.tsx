import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  Users,
  BookOpen,
  TrendingUp,
  Loader2,
  BarChart3,
} from 'lucide-react';
import api from '../../services/api';

export function GradeApprovalQueue() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [groupByCourse, setGroupByCourse] = useState(true);

  const { data: pendingGrades, isLoading } = useQuery({
    queryKey: ['pending-grades'],
    queryFn: async () => {
      const response = await api.get('/admin/grades/pending');
      return response.data.data;
    },
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/admin/grades/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-grades'] });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (grade_ids: number[]) => {
      const response = await api.post('/admin/grades/bulk-approve', { grade_ids });
      return response.data;
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['pending-grades'] });
    },
  });

  const publishGradesMutation = useMutation({
    mutationFn: async (course_id: number) => {
      const response = await api.post('/admin/grades/publish', { course_id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-grades'] });
    },
  });

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) {
      alert('Please select grades to approve');
      return;
    }

    if (confirm(`Approve ${selectedIds.length} grades?`)) {
      bulkApproveMutation.mutate(selectedIds);
    }
  };

  const handlePublishCourse = (courseId: number, courseName: string) => {
    if (confirm(`Publish all approved grades for ${courseName}?`)) {
      publishGradesMutation.mutate(courseId);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingGrades?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingGrades?.map((g: any) => g.id) || []);
    }
  };

  // Group grades by course
  const groupedGrades = pendingGrades?.reduce((acc: any, grade: any) => {
    const courseId = grade.enrollment.course.id;
    if (!acc[courseId]) {
      acc[courseId] = {
        course: grade.enrollment.course,
        grades: [],
      };
    }
    acc[courseId].grades.push(grade);
    return acc;
  }, {});

  const calculateGradeDistribution = (grades: any[]) => {
    const distribution: Record<string, number> = {};
    grades.forEach((grade) => {
      const letter = grade.letterGrade || 'N/A';
      distribution[letter] = (distribution[letter] || 0) + 1;
    });
    return distribution;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const gradeCount = pendingGrades?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            Pending Grade Approvals
          </h2>
          <p className="text-muted-foreground mt-1">
            {gradeCount} grade{gradeCount !== 1 ? 's' : ''} waiting for review
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Group Toggle */}
          <button
            onClick={() => setGroupByCourse(!groupByCourse)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            {groupByCourse ? 'Show All' : 'Group by Course'}
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {bulkApproveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Approve Selected ({selectedIds.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {gradeCount === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">No pending grade approvals at the moment.</p>
        </div>
      ) : groupByCourse ? (
        <>
          {/* Grouped by Course */}
          <div className="space-y-6">
            {Object.values(groupedGrades || {}).map((group: any) => {
              const distribution = calculateGradeDistribution(group.grades);
              const avgGradePoints =
                group.grades.reduce((sum: number, g: any) => sum + (g.gradePoints || 0), 0) /
                group.grades.length;

              return (
                <div key={group.course.id} className="bg-card border border-border rounded-lg p-6">
                  {/* Course Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <BookOpen className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <div className="font-semibold text-lg text-foreground">
                          {group.course.courseCode} - {group.course.courseName}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{group.course.department}</span>
                          <span>•</span>
                          <span>{group.course.instructor?.fullName || 'TBA'}</span>
                          <span>•</span>
                          <span>{group.grades.length} students</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handlePublishCourse(group.course.id, group.course.courseName)
                      }
                      disabled={publishGradesMutation.isPending}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      Approve & Publish All
                    </button>
                  </div>

                  {/* Grade Distribution */}
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <div className="text-sm font-medium text-foreground mb-2">
                      Grade Distribution
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {Object.entries(distribution).map(([grade, count]) => (
                        <span
                          key={grade}
                          className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-primary/10 text-primary"
                        >
                          {grade}: {count}
                        </span>
                      ))}
                      <span className="text-sm text-muted-foreground ml-2">
                        Avg GPA: {avgGradePoints.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Student Grades */}
                  <div className="space-y-2">
                    {group.grades.map((grade: any) => (
                      <div
                        key={grade.id}
                        className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(grade.id)}
                          onChange={() => toggleSelect(grade.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />

                        <Users className="h-4 w-4 text-muted-foreground" />

                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {grade.enrollment.user.fullName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {grade.enrollment.user.student?.studentId}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-lg text-foreground">
                            {grade.letterGrade}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {grade.numericGrade?.toFixed(1)} / {grade.gradePoints?.toFixed(1)} pts
                          </div>
                        </div>

                        <button
                          onClick={() => approveMutation.mutate(grade.id)}
                          disabled={approveMutation.isPending}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Flat List */}
          <div className="bg-card border border-border rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === gradeCount}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">
                Select All ({gradeCount} items)
              </span>
            </label>
          </div>

          <div className="space-y-2">
            {pendingGrades?.map((grade: any) => (
              <div
                key={grade.id}
                className={`flex items-center gap-3 p-4 bg-card border rounded-lg transition-all ${
                  selectedIds.includes(grade.id)
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(grade.id)}
                  onChange={() => toggleSelect(grade.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />

                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {grade.enrollment.user.fullName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {grade.enrollment.course.courseCode} - {grade.enrollment.course.courseName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-xl text-foreground">{grade.letterGrade}</div>
                  <div className="text-sm text-muted-foreground">{grade.gradePoints} pts</div>
                </div>

                <button
                  onClick={() => approveMutation.mutate(grade.id)}
                  disabled={approveMutation.isPending}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
