import { ApplicationForm } from './ApplicationForm';

export function ExchangeVisiting() {
  return (
    <ApplicationForm
      title="Exchange & Visiting Program Application"
      description="Request approval to study abroad or participate in a visiting student experience."
      type="CREDIT_TRANSFER"
      helperText="Attach host school details and confirm that credits earned abroad will be transferable to CUHK(SZ)."
      infoItems={[
        { label: 'Lead Time Required', value: '8+ weeks' },
        { label: 'Max Transferable Credits', value: '18' }
      ]}
      disclaimer="Approval is contingent on partner-school availability, visa eligibility, and the Registrar’s evaluation of transfer credits."
      formFields={[
        {
          name: 'hostInstitution',
          label: 'Host Institution',
          placeholder: 'e.g. University of Toronto',
          required: true
        },
        {
          name: 'programTerm',
          label: 'Program Term',
          placeholder: 'Term 1 2025, Term 2 2026, etc.',
          required: true
        },
        {
          name: 'creditsRequested',
          label: 'Credits to Transfer',
          type: 'number',
          helperText: 'Estimate the total credits you plan to take while abroad.'
        },
        {
          name: 'courseMapping',
          label: 'Course Mapping / Equivalencies',
          type: 'textarea',
          helperText: 'List host courses and the CUHK(SZ) equivalents you expect them to satisfy.'
        }
      ]}
    />
  );
}
