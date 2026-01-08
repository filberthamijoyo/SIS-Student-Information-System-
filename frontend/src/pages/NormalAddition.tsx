import { ApplicationForm } from './ApplicationForm';

export function NormalAddition() {
  return (
    <ApplicationForm
      title="Normal Course Addition"
      description="Request enrollment in an additional class during the standard registration period."
      type="OVERLOAD_REQUEST"
      helperText="Provide detailed justification (graduation requirement, instructor approval, etc.). Attach proof of instructor consent if available."
      infoItems={[
        { label: 'Max Credits', value: '18 (without overload)' },
        { label: 'Decision SLA', value: '3–5 business days' }
      ]}
      formFields={[
        {
          name: 'courseCode',
          label: 'Course Code',
          placeholder: 'e.g. CSCI2100',
          required: true
        },
        {
          name: 'sectionInfo',
          label: 'Section / Instructor',
          placeholder: 'e.g. L1 · Prof. Chen'
        },
        {
          name: 'justification',
          label: 'Business Justification',
          type: 'textarea',
          helperText: 'Explain the impact if this course is not added this term.',
          required: true
        }
      ]}
    />
  );
}
