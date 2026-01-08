import { ApplicationForm } from './ApplicationForm';

const SECOND_MAJOR_OPTIONS = [
  { label: 'Applied Mathematics', value: 'Applied Mathematics' },
  { label: 'Statistics', value: 'Statistics' },
  { label: 'Information Engineering', value: 'Information Engineering' },
  { label: 'Quantitative Finance', value: 'Quantitative Finance' },
  { label: 'Public Policy', value: 'Public Policy' }
];

export function DeclareSecondMajor() {
  return (
    <ApplicationForm
      title="Declare Second Major"
      description="Request approval to pursue an additional major. Provide a term-by-term completion plan."
      type="MAJOR_CHANGE"
      helperText="Students must have completed at least 30 credits with a cumulative GPA of 3.0 or higher to pursue a second major."
      infoItems={[
        { label: 'Credit Cap', value: '21 credits / term' },
        { label: 'Approval Timeline', value: '2–3 weeks' }
      ]}
      disclaimer="You must meet all graduation requirements for both majors. Additional tuition or time-to-degree impacts are your responsibility."
      formFields={[
        {
          name: 'secondMajor',
          label: 'Second Major Preference',
          type: 'select',
          required: true,
          options: SECOND_MAJOR_OPTIONS
        },
        {
          name: 'completionPlan',
          label: 'Completion Plan',
          type: 'textarea',
          required: true,
          helperText: 'Provide a semester-by-semester outline showing how you will satisfy both majors.'
        },
        {
          name: 'advisorSupport',
          label: 'Advisor Approval',
          placeholder: 'Advisor name or confirmation (if available)'
        }
      ]}
    />
  );
}
