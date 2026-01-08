import { FormEvent, useState } from 'react';
import { Send, Clock, CheckCircle, AlertCircle, FileText, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FileAttachment } from '../components/FileAttachment';

type ApplicationType =
  | 'leave-of-absence'
  | 'readmission'
  | 'overload'
  | 'exchange'
  | 'graduation';

interface Application {
  id: string;
  type: ApplicationType;
  submittedAt: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  advisor?: string;
  comments?: string;
}

interface ApplicationFormState {
  type: ApplicationType;
  reason: string;
  supportingDocument?: File | null;
}

const typeLabels: Record<ApplicationType, string> = {
  'leave-of-absence': 'Leave of Absence',
  readmission: 'Readmission',
  overload: 'Credit Overload',
  exchange: 'Exchange Program',
  graduation: 'Graduation Audit',
};

const statusConfig: Record<
  Application['status'],
  { label: string; color: string; Icon: typeof Clock }
> = {
  PENDING: {
    label: 'Pending Submission',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
    Icon: Clock,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    Icon: AlertCircle,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    Icon: CheckCircle,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    Icon: AlertCircle,
  },
};

export function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([
    {
      id: 'APP-2025-013',
      type: 'leave-of-absence',
      submittedAt: '2025-09-04T10:15:00Z',
      status: 'UNDER_REVIEW',
      advisor: 'Dr. Emily Wong',
      comments: 'Awaiting supporting medical certificate',
    },
    {
      id: 'APP-2025-010',
      type: 'overload',
      submittedAt: '2025-08-28T09:00:00Z',
      status: 'APPROVED',
      advisor: 'Prof. Daniel Lee',
      comments: 'Approved for 21 credits due to outstanding GPA.',
    },
    {
      id: 'APP-2025-006',
      type: 'exchange',
      submittedAt: '2025-07-15T14:45:00Z',
      status: 'REJECTED',
      advisor: 'International Programs Office',
      comments: 'Missing language proficiency proof. Please resubmit next round.',
    },
  ]);

  const [formState, setFormState] = useState<ApplicationFormState>({
    type: 'leave-of-absence',
    reason: '',
    supportingDocument: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.reason.trim()) {
      setError('Please provide a reason for your application.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Placeholder API interaction to show intent
      await api.post('/applications', {
        type: formState.type,
        reason: formState.reason.trim(),
        hasAttachment: Boolean(formState.supportingDocument),
      });

      const newApplication: Application = {
        id: `APP-${new Date().getFullYear()}-${(applications.length + 10)
          .toString()
          .padStart(3, '0')}`,
        type: formState.type,
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
        advisor: 'Advising Office',
        comments: 'Received and pending initial review.',
      };

      setApplications((prev) => [newApplication, ...prev]);
      setFormState((prev) => ({ ...prev, reason: '', supportingDocument: null }));
      setSuccessMessage('Application submitted successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (submissionError: any) {
      setError(
        submissionError?.response?.data?.error ||
          'Failed to submit application. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
            <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-wider text-indigo-500 font-semibold">
              Application Center
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Submit New Application
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Provide the required details and supporting documents to start a new request.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Application Type
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formState.type}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    type: event.target.value as ApplicationType,
                  }))
                }
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Student
              </label>
              <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-white">
                {user?.full_name || user?.email || 'Current Student'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason / Details
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[120px]"
              value={formState.reason}
              placeholder="Explain the background, reason, and desired outcome..."
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, reason: event.target.value }))
              }
            />
          </div>

          <FileAttachment
            label="Supporting Document (optional)"
            value={formState.supportingDocument}
            onChange={(file) =>
              setFormState((prev) => ({
                ...prev,
                supportingDocument: file,
              }))
            }
            maxSizeMB={10}
            helperText="Upload any supporting documents for your application (PDF, DOC, DOCX, images)"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Applications
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Track status updates and reviewer feedback in real time.
            </p>
          </div>
          <span className="px-4 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium">
            {applications.length} total
          </span>
        </div>

        <div className="space-y-3">
          {applications.map((application) => {
            const status = statusConfig[application.status];
            return (
              <div
                key={application.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-4"
              >
                <div className="flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-gray-500">{application.id}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                      {typeLabels[application.type]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Submitted {new Date(application.submittedAt).toLocaleString()}
                  </p>
                  {application.comments && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">
                      <span className="font-semibold">Latest update:</span> {application.comments}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    <status.Icon className="w-4 h-4" />
                    {status.label}
                  </div>
                  {application.advisor && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Advisor: {application.advisor}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
