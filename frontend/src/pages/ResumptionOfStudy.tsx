import { ApplicationForm } from './ApplicationForm';

export function ResumptionOfStudy() {
  return (
    <ApplicationForm
      title="Resumption of Study"
      description="Submit documentation to return from an approved leave of absence."
      type="READMISSION"
      helperText="Provide the leave approval letter (if applicable) and explain how the circumstances that prompted your leave have been resolved."
      infoItems={[
        { label: 'Processing Time', value: '10 business days' },
        { label: 'Required Status', value: 'Good academic standing' }
      ]}
      disclaimer="Readmission is contingent on seat availability, clearance of all holds, and the Dean’s approval."
      formFields={[
        {
          name: 'lastEnrolledTerm',
          label: 'Last Enrolled Term',
          placeholder: 'e.g. Term 2 2024',
          required: true
        },
        {
          name: 'returnTerm',
          label: 'Intended Return Term',
          placeholder: 'e.g. Term 1 2025',
          required: true
        },
        {
          name: 'supportingDetails',
          label: 'Supporting Documentation Summary',
          type: 'textarea',
          helperText: 'Outline medical, personal, or administrative documents you are providing.'
        }
      ]}
    />
  );
}
