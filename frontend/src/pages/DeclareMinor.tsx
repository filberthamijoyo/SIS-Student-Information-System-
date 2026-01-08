import { ApplicationForm } from './ApplicationForm';

const MINOR_OPTIONS = [
  { label: 'Economics', value: 'Economics' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Business Analytics', value: 'Business Analytics' },
  { label: 'Computer Science', value: 'Computer Science' },
  { label: 'Psychology', value: 'Psychology' },
  { label: 'Global Studies', value: 'Global Studies' }
];

export function DeclareMinor() {
  return (
    <ApplicationForm
      title="Declare Minor"
      description="Add a secondary concentration to complement your primary major."
      type="MINOR_DECLARATION"
      helperText="Minors typically require 15–18 credits. You must maintain good academic standing and meet the prerequisites for upper-division coursework."
      infoItems={[
        { label: 'Max Minors Allowed', value: '2' },
        { label: 'Minimum GPA', value: '2.0' }
      ]}
      disclaimer="Approval is contingent on course availability and prerequisite completion. You are responsible for ensuring completion of all minor requirements before graduation."
      formFields={[
        {
          name: 'minorChoice',
          label: 'Desired Minor',
          type: 'select',
          required: true,
          options: MINOR_OPTIONS
        },
        {
          name: 'catalogYear',
          label: 'Catalog Year',
          placeholder: 'e.g. 2024-2025',
          required: true
        },
        {
          name: 'progress',
          label: 'Progress Toward Minor',
          type: 'textarea',
          helperText: 'List completed or in-progress courses that satisfy minor requirements.'
        }
      ]}
    />
  );
}
