import { ApplicationForm } from './ApplicationForm';

const MAJOR_OPTIONS = [
  { label: 'Computer Science', value: 'Computer Science' },
  { label: 'Data Science', value: 'Data Science' },
  { label: 'Electronic Engineering', value: 'Electronic Engineering' },
  { label: 'Mathematics', value: 'Mathematics' },
  { label: 'Statistics', value: 'Statistics' },
  { label: 'Information Engineering', value: 'Information Engineering' },
  { label: 'Applied Mathematics', value: 'Applied Mathematics' },
  { label: 'Quantitative Finance', value: 'Quantitative Finance' }
];

export function DeclareMajor() {
  return (
    <ApplicationForm
      title="Declare Major"
      description="Declare your primary major field of study. This will be your main academic concentration."
      type="MAJOR_DECLARATION"
      helperText="You must declare a major by the end of your second year. Ensure you meet all prerequisites and requirements for your chosen major."
      infoItems={[
        { label: 'Declaration Deadline', value: 'End of Year 2' },
        { label: 'Minimum GPA', value: '2.0' }
      ]}
      disclaimer="Your major declaration will be reviewed by academic advisors. Approval is contingent on meeting program requirements and course availability."
      formFields={[
        {
          name: 'majorChoice',
          label: 'Desired Major',
          type: 'select',
          required: true,
          options: MAJOR_OPTIONS
        },
        {
          name: 'catalogYear',
          label: 'Catalog Year',
          placeholder: 'e.g. 2024-2025',
          required: true
        },
        {
          name: 'academicPlan',
          label: 'Academic Plan',
          type: 'textarea',
          helperText: 'Briefly describe your academic goals and how this major aligns with your career objectives.'
        }
      ]}
    />
  );
}
