import { ApplicationForm } from './ApplicationForm';

export function Withdrawal() {
  return (
    <ApplicationForm
      title="University Withdrawal"
      description="Permanently separate from the university before completing your degree."
      type="WITHDRAWAL"
      helperText="Withdrawal requests are final once processed. If you intend to return in the future, apply for a leave of absence instead."
      infoItems={[
        { label: 'Effective Date', value: 'Must be before final exam week' },
        { label: 'Refund Eligibility', value: 'See tuition schedule' }
      ]}
      formFields={[
        {
          name: 'effectiveDate',
          label: 'Requested Withdrawal Date',
          placeholder: 'YYYY-MM-DD',
          required: true
        },
        {
          name: 'postPlan',
          label: 'Post-Withdrawal Plans',
          type: 'textarea',
          helperText: 'Share employment, transfer, or personal plans to help us close out your record.'
        }
      ]}
      disclaimer="Outstanding balances, housing contracts, and library items must be settled prior to separation."
    />
  );
}
