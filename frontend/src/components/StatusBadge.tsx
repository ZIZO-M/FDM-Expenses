import { ClaimStatus } from '../types';

const STATUS_STYLES: Record<
  ClaimStatus,
  { background: string; color: string; label: string }
> = {
  DRAFT: { background: '#e9ecef', color: '#495057', label: 'Draft' },
  SUBMITTED: { background: '#d4edda', color: '#155724', label: 'Submitted' },
  CHANGES_REQUESTED: { background: '#fff3cd', color: '#856404', label: 'Changes Requested' },
  APPROVED: { background: '#d1e7dd', color: '#0f5132', label: 'Approved' },
  REJECTED: { background: '#f8d7da', color: '#842029', label: 'Rejected' },
  PAID: { background: '#d0f0c0', color: '#1a5c38', label: 'Paid' },
  WITHDRAWN: { background: '#e2e3e5', color: '#41464b', label: 'Withdrawn' },
};

export default function StatusBadge({ status }: { status: ClaimStatus }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: style.background,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}