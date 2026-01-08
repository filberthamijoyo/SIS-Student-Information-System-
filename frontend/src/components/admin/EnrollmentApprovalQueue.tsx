import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  BookOpen,
  Calendar,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';

export function EnrollmentApprovalQueue() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: pendingEnrollments, isLoading } = useQuery({
    queryKey: ['pending-enrollments'],
    queryFn: async () => {
      const response = await api.get('/admin/enrollments/pending');
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/admin/enrollments/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post(`/admin/enrollments/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (enrollment_ids: number[]) => {
      const response = await api.post('/admin/enrollments/bulk-approve', { enrollment_ids });
      return response.data;
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
    },
  });

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    await approveMutation.mutateAsync(id);
    setProcessingId(null);
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      setProcessingId(id);
      await rejectMutation.mutateAsync({ id, reason });
      setProcessingId(null);
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) {
      alert('Please select enrollments to approve');
      return;
    }

    if (confirm(`Approve ${selectedIds.length} enrollments?`)) {
      bulkApproveMutation.mutate(selectedIds);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingEnrollments?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingEnrollments?.map((e: any) => e.id) || []);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const enrollmentCount = pendingEnrollments?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-orange-500" />
            Pending Enrollment Approvals
          </h2>
          <p className="text-muted-foreground mt-1">
            {enrollmentCount} enrollment{enrollmentCount !== 1 ? 's' : ''} waiting for review
          </p>
        </div>

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

      {enrollmentCount === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">No pending enrollment approvals at the moment.</p>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="bg-card border border-border rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === enrollmentCount}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">
                Select All ({enrollmentCount} items)
              </span>
            </label>
          </div>

          {/* Enrollment Cards */}
          <div className="space-y-4">
            {pendingEnrollments?.map((enrollment: any) => (
              <div
                key={enrollment.id}
                className={`bg-card border rounded-lg p-6 transition-all ${
                  selectedIds.includes(enrollment.id)
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(enrollment.id)}
                    onChange={() => toggleSelect(enrollment.id)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />

                  {/* Content */}
                  <div className="flex-1">
                    {/* Student Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            {enrollment.user.fullName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({enrollment.user.student?.studentId})
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{enrollment.user.email}</p>
                        {enrollment.user.student && (
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              Year {enrollment.user.student.year}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {enrollment.user.student.major?.name || 'No Major'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="bg-muted/30 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-foreground mb-1">
                            {enrollment.course.courseCode} - {enrollment.course.courseName}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Department:</span>{' '}
                              {enrollment.course.department}
                            </div>
                            <div>
                              <span className="font-medium">Credits:</span>{' '}
                              {enrollment.course.credits}
                            </div>
                            <div>
                              <span className="font-medium">Instructor:</span>{' '}
                              {enrollment.course.instructor?.fullName || 'TBA'}
                            </div>
                            <div>
                              <span className="font-medium">Capacity:</span>{' '}
                              {enrollment.course.currentEnrollment}/{enrollment.course.maxCapacity}
                            </div>
                          </div>

                          {/* Time Slots */}
                          {enrollment.course.timeSlots && enrollment.course.timeSlots.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {enrollment.course.timeSlots.map((slot: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary"
                                >
                                  {slot.dayOfWeek} {slot.startTime}-{slot.endTime}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Warnings/Conflicts */}
                    {enrollment.course.currentEnrollment >= enrollment.course.maxCapacity && (
                      <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg mb-4">
                        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                          Warning: Course is at full capacity
                        </span>
                      </div>
                    )}

                    {/* Enrollment Date */}
                    <div className="text-xs text-muted-foreground mb-4">
                      Requested on {new Date(enrollment.enrolledAt).toLocaleString()}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApprove(enrollment.id)}
                        disabled={processingId === enrollment.id || approveMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === enrollment.id && approveMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleReject(enrollment.id)}
                        disabled={processingId === enrollment.id || rejectMutation.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === enrollment.id && rejectMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
