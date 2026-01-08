import { ApplicationForm } from './ApplicationForm';

export function LateCourseAddDrop() {
  return (
    <ApplicationForm
      title="Late Course Add / Drop"
      description="Petition to add or drop a course after the official deadline."
      type="OVERLOAD_REQUEST"
      helperText="Late requests must include instructor consent and a clear explanation of extenuating circumstances."
      infoItems={[
        { label: 'Late Add Window', value: 'Weeks 3–4' },
        { label: 'Late Drop Window', value: 'Weeks 5–8' }
      ]}
      disclaimer="Approved late drops may result in a W on your transcript. Tuition adjustments follow the university refund schedule."
      formFields={[
        {
          name: 'requestAction',
          label: 'Action Requested',
          type: 'select',
          required: true,
          options: [
            { label: 'Add Course', value: 'LATE_ADD' },
            { label: 'Drop Course', value: 'LATE_DROP' }
          ]
        },
        {
          name: 'courseCode',
          label: 'Course Code',
          placeholder: 'e.g. STAT3010',
          required: true
        },
        {
          name: 'instructorConsent',
          label: 'Instructor Approval / Notes',
          type: 'textarea',
          helperText: 'Paste email confirmation or describe verbal approval.'
        }
      ]}
    />
  );
}
