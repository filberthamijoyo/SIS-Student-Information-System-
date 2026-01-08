import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationAPI } from '../services/api';
import { FileAttachment } from '../components/FileAttachment';

type Semester = 'FALL' | 'SPRING' | 'SUMMER';

interface ApplicationField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  helperText?: string;
}

interface ApplicationFormProps {
  title: string;
  description: string;
  type: string;
  formFields?: ApplicationField[];
  infoItems?: Array<{ label: string; value: string }>;
  helperText?: string;
  disclaimer?: string;
  defaultSemester?: Semester;
}

const determineDefaultTerm = (): { semester: Semester; year: number } => {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  if (month >= 0 && month <= 4) {
    return { semester: 'SPRING', year };
  }
  if (month >= 5 && month <= 7) {
    return { semester: 'SUMMER', year };
  }
  return { semester: 'FALL', year };
};

export function ApplicationForm({
  title,
  description,
  type,
  formFields,
  infoItems,
  helperText,
  disclaimer,
  defaultSemester
}: ApplicationFormProps) {
  const queryClient = useQueryClient();
  const defaultTerm = determineDefaultTerm();
  const [semester, setSemester] = useState<Semester>(defaultSemester ?? defaultTerm.semester);
  const [year, setYear] = useState<number>(defaultTerm.year);
  const [reason, setReason] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      await applicationAPI.submitApplication({
        type,
        semester,
        year,
        reason: reason.trim(),
        supportingDocs: Object.keys(fieldValues).length ? fieldValues : undefined
      });
    },
    onSuccess: () => {
      setSuccessMessage('Application submitted successfully. You can view its status in My Applications.');
      setReason('');
      setFieldValues({});
      setSupportingFile(null);
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to submit application';
      setErrorMessage(message);
    }
  });

  const handleFieldChange = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!reason.trim()) {
      setErrorMessage('Please provide a detailed reason for your request.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/applications"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Applications</span>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {infoItems && infoItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {infoItems.map((item) => (
            <div key={item.label} className="border border-border rounded-lg p-4 bg-card/60">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {helperText && (
        <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <p className="text-sm">{helperText}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          <CheckCircle2 className="w-5 h-5 mt-0.5" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as Semester)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="FALL">Term 1</option>
                <option value="SPRING">Term 2</option>
                <option value="SUMMER">Summer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Year</label>
              <input
                type="number"
                min={2020}
                max={2035}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {formFields && formFields.length > 0 && (
            <div className="space-y-4">
              {formFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={fieldValues[field.name] ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={fieldValues[field.name] ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={fieldValues[field.name] ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}
                  {field.helperText && (
                    <p className="text-xs text-muted-foreground mt-1">{field.helperText}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason / Supporting Details <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Provide context, approvals obtained, and any relevant academic impact."
              required
            />
          </div>

          <FileAttachment
            label="Supporting Documents (optional)"
            value={supportingFile}
            onChange={setSupportingFile}
            maxSizeMB={10}
            helperText="Upload any supporting documents for your application (PDF, DOC, DOCX, images)"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />

          {disclaimer && (
            <div className="flex items-start gap-3 bg-muted/40 border border-border rounded-lg p-4 text-sm text-muted-foreground">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <p>{disclaimer}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => {
                setReason('');
                setFieldValues({});
                setSupportingFile(null);
              }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted/40"
              disabled={mutation.isPending}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
