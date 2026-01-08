import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  FileText,
  Calendar,
  Loader2,
  Mail,
  GraduationCap,
} from 'lucide-react';
import { applicationAPI } from '../../services/api';

type ApplicationType =
  | 'leave-of-absence'
  | 'readmission'
  | 'overload'
  | 'exchange'
  | 'graduation';

type ApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

interface Application {
  id: number;
  type: ApplicationType;
  semester: string | null;
  year: number | null;
  status: ApplicationStatus;
  requested_date: string;
  reason: string;
  supporting_docs: any;
  review_notes: string | null;
  decision: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  users_applications_user_idTousers: {
    full_name: string;
    email: string;
    students_students_user_idTousers: {
      student_id: string;
      majors: {
        name: string;
      } | null;
    } | null;
  };
}

const typeLabels: Record<ApplicationType, string> = {
  'leave-of-absence': 'Leave of Absence',
  readmission: 'Readmission',
  overload: 'Credit Overload',
  exchange: 'Exchange Program',
  graduation: 'Graduation Audit',
};

const statusConfig: Record<
  ApplicationStatus,
  { label: string; color: string; Icon: typeof Clock }
> = {
  PENDING: {
    label: 'Pending',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
    Icon: Clock,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    Icon: AlertTriangle,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    Icon: CheckCircle,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    Icon: XCircle,
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
    Icon: Clock,
  },
};

export function ApplicationReviewQueue() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState<number | null>(null);
  const [reviewData, setReviewData] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW',
    decision: '',
    reviewNotes: '',
  });

  const { data: pendingApplications, isLoading } = useQuery<Application[]>({
    queryKey: ['pending-applications'],
    queryFn: async () => {
      const response = await applicationAPI.getPendingApplications();
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof reviewData }) => {
      await applicationAPI.reviewApplication(id, {
        status: data.status,
        decision: data.decision,
        reviewNotes: data.reviewNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-applications'] });
      setReviewModalOpen(null);
      setReviewData({
        status: 'APPROVED',
        decision: '',
        reviewNotes: '',
      });
    },
  });

  const handleApprove = (id: number) => {
    setReviewModalOpen(id);
    setReviewData({
      status: 'APPROVED',
      decision: 'Approved',
      reviewNotes: '',
    });
  };

  const handleReject = (id: number) => {
    setReviewModalOpen(id);
    setReviewData({
      status: 'REJECTED',
      decision: 'Rejected',
      reviewNotes: '',
    });
  };

  const handleSubmitReview = (id: number) => {
    if (!reviewData.decision.trim()) {
      alert('Please provide a decision summary');
      return;
    }
    reviewMutation.mutate({ id, data: reviewData });
  };

  const handleSetUnderReview = (id: number) => {
    setReviewModalOpen(id);
    setReviewData({
      status: 'UNDER_REVIEW',
      decision: 'Under Review',
      reviewNotes: '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const applicationCount = pendingApplications?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" />
            Pending Application Reviews
          </h2>
          <p className="text-muted-foreground mt-1">
            {applicationCount} application{applicationCount !== 1 ? 's' : ''} waiting for review
          </p>
        </div>
      </div>

      {applicationCount === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
          <p className="text-muted-foreground">No pending applications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApplications?.map((application) => {
            const status = statusConfig[application.status];
            const StatusIcon = status.Icon;
            const student = application.users_applications_user_idTousers;
            const studentInfo = student.students_students_user_idTousers;

            return (
              <div
                key={application.id}
                className="bg-card border border-border rounded-lg p-6 transition-all"
              >
                <div className="space-y-4">
                  {/* Header with Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{application.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {status.label}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                          {typeLabels[application.type]}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Submitted on {new Date(application.requested_date).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-foreground mb-1">
                          {student.full_name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Mail className="h-4 w-4" />
                          {student.email}
                        </div>
                        {studentInfo && (
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">
                              Student ID: {studentInfo.student_id}
                            </span>
                            {studentInfo.majors && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">
                                  Major: {studentInfo.majors.name}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <FileText className="h-4 w-4" />
                      Application Details
                    </div>
                    <div className="bg-muted/20 rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        {application.semester && (
                          <div>
                            <span className="font-medium text-foreground">Semester:</span>{' '}
                            <span className="text-muted-foreground">{application.semester}</span>
                          </div>
                        )}
                        {application.year && (
                          <div>
                            <span className="font-medium text-foreground">Year:</span>{' '}
                            <span className="text-muted-foreground">{application.year}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-foreground">Reason:</span>
                          <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                            {application.reason}
                          </p>
                        </div>
                        {application.supporting_docs && (
                          <div className="mt-2">
                            <span className="font-medium text-foreground">Supporting Documents:</span>
                            <p className="text-muted-foreground text-xs mt-1">
                              Documents attached
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Review Notes (if already reviewed) */}
                  {application.review_notes && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="text-sm">
                        <span className="font-medium text-blue-900 dark:text-blue-200">
                          Previous Review Notes:
                        </span>
                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                          {application.review_notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <button
                      onClick={() => handleApprove(application.id)}
                      disabled={reviewMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>

                    <button
                      onClick={() => handleReject(application.id)}
                      disabled={reviewMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>

                    <button
                      onClick={() => handleSetUnderReview(application.id)}
                      disabled={reviewMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Clock className="h-4 w-4" />
                      Set Under Review
                    </button>
                  </div>
                </div>

                {/* Review Modal */}
                {reviewModalOpen === application.id && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                      <h3 className="text-xl font-semibold text-foreground mb-4">
                        Review Application #{application.id}
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Status
                          </label>
                          <select
                            value={reviewData.status}
                            onChange={(e) =>
                              setReviewData((prev) => ({
                                ...prev,
                                status: e.target.value as typeof reviewData.status,
                              }))
                            }
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                          >
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Decision Summary <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={reviewData.decision}
                            onChange={(e) =>
                              setReviewData((prev) => ({ ...prev, decision: e.target.value }))
                            }
                            placeholder="Brief decision summary"
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Review Notes (Optional)
                          </label>
                          <textarea
                            value={reviewData.reviewNotes}
                            onChange={(e) =>
                              setReviewData((prev) => ({ ...prev, reviewNotes: e.target.value }))
                            }
                            placeholder="Additional notes for the student..."
                            rows={4}
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-border">
                          <button
                            onClick={() => handleSubmitReview(application.id)}
                            disabled={reviewMutation.isPending || !reviewData.decision.trim()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {reviewMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Submit Review
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setReviewModalOpen(null);
                              setReviewData({
                                status: 'APPROVED',
                                decision: '',
                                reviewNotes: '',
                              });
                            }}
                            disabled={reviewMutation.isPending}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}







