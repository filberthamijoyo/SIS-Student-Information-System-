import { ApplicationForm } from './ApplicationForm';

export function Suspension() {
  return (
    <ApplicationForm
      title="Suspension of Study"
      description="Pause your enrollment for medical, personal, or academic reasons."
      type="LEAVE_OF_ABSENCE"
      helperText="Suspensions are typically granted in semester-long increments. Attach relevant documentation (medical certificates, advisor recommendations, etc.)."
      infoItems={[
        { label: 'Maximum Duration', value: '2 consecutive terms' },
        { label: 'Application Deadline', value: '10 business days before term start' }
      ]}
      formFields={[
        {
          name: 'suspensionTerm',
          label: 'Term(s) Requested for Suspension',
          placeholder: 'e.g. Term 2 2025 – Term 1 2025',
          required: true
        },
        {
          name: 'reasonCategory',
          label: 'Reason Category',
          type: 'select',
          required: true,
          options: [
            { label: 'Medical', value: 'Medical' },
            { label: 'Personal', value: 'Personal' },
            { label: 'Academic', value: 'Academic' },
            { label: 'Other', value: 'Other' }
          ]
        },
        {
          name: 'returnPlan',
          label: 'Return Plan',
          type: 'textarea',
          helperText: 'Describe how you will stay on track and when you intend to resume studies.'
        }
      ]}
      disclaimer="Suspending studies may affect financial aid, visa status, and housing. Consult the relevant offices before submitting this request."
    />
  );
}
