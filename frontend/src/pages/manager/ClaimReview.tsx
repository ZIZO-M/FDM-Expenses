import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExpenseClaim } from '../../types';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function ClaimReview() {
  const { claimId } = useParams<{ claimId: string }>();

  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionDone, setActionDone] = useState(false);

  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | 'changes' | null>(null);

  useEffect(() => {
    if (!claimId) return;
    api.getManagerClaim(claimId)
      .then((res) => setClaim(res.data))
      .catch(() => setError('Failed to load claim.'))
      .finally(() => setLoading(false));
  }, [claimId]);

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB');
  const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const handleAction = async (type: 'approve' | 'reject' | 'changes') => {
    if (!claimId) return;

    if (type === 'reject' && !comment.trim()) {
      setError('A comment is required when rejecting a claim.');
      return;
    }
    if (type === 'changes' && !comment.trim()) {
      setError('A comment is required when requesting changes.');
      return;
    }

    const confirmMessages = {
      approve: 'Approve this claim?',
      reject: 'Reject this claim? This action cannot be undone.',
      changes: 'Request changes on this claim?',
    };

    if (!window.confirm(confirmMessages[type])) return;

    setActionLoading(type);
    setError('');

    try {
      if (type === 'approve') {
        await api.approveClaim(claimId, comment.trim() || undefined);
        setSuccessMsg('Claim approved successfully.');
      } else if (type === 'reject') {
        await api.rejectClaim(claimId, comment.trim());
        setSuccessMsg('Claim rejected.');
      } else {
        await api.requestChanges(claimId, comment.trim());
        setSuccessMsg('Changes requested from employee.');
      }
      setActionDone(true);
      // Reload claim to reflect new status
      const res = await api.getManagerClaim(claimId);
      setClaim(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Action failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="loading">Loading claim…</div>;
  if (!claim) return <div className="alert alert-error">{error || 'Claim not found.'}</div>;

  const canAct = !actionDone && (claim.status === 'SUBMITTED' || claim.status === 'CHANGES_REQUESTED');

  return (
    <>
      {/* Header */}
      <div className="top-bar">
        <div>
          <Link
            to="/manager/claims"
            style={{ color: '#1e7a3e', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '6px' }}
          >
            ← Back to Pending Claims
          </Link>
          <h1 className="page-title" style={{ margin: 0 }}>Claim Review</h1>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Employee Info & Claim Summary */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">Claim Summary</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '13px', alignContent: 'start' }}>
            <span className="text-muted">Employee:</span>
            <span style={{ fontWeight: 500 }}>{claim.employee?.fullName ?? '—'}</span>
            <span className="text-muted">Email:</span>
            <span>{claim.employee?.email ?? '—'}</span>
            <span className="text-muted">Cost Centre:</span>
            <span>{claim.employee?.costCentre ?? '—'}</span>
            <span className="text-muted">Created:</span>
            <span>{fmtDate(claim.createdAt)}</span>
            {claim.submittedAt && (
              <>
                <span className="text-muted">Submitted:</span>
                <span>{fmtDate(claim.submittedAt)}</span>
              </>
            )}
            <span className="text-muted">Currency:</span>
            <span>{claim.currency}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '4px' }}>Total Amount</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a4d1a' }}>
              {fmt(claim.totalAmount, claim.currency)}
            </div>
            <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>
              {claim.items.length} item{claim.items.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {claim.employeeComment && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Employee Notes
            </div>
            <p style={{ fontSize: '14px', color: '#212529', margin: 0 }}>{claim.employeeComment}</p>
          </div>
        )}
      </div>

      {/* Expense Items */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">Expense Items ({claim.items.length})</div>
        {claim.items.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p>No expense items on this claim.</p>
          </div>
        ) : (
          <div>
            {claim.items.map((item) => (
              <div
                key={item.itemId}
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{
                        background: '#e9ecef', color: '#495057',
                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                      }}>
                        {item.category}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>{fmtDate(item.dateIncurred)}</span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>{item.merchant}</span>
                    </div>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{item.description}</div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#495057' }}>
                      <span className="amount">{fmt(item.amount, item.currency)}</span>
                      {item.vatAmount > 0 && (
                        <span style={{ color: '#6c757d' }}>VAT: {fmt(item.vatAmount, item.currency)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Receipts */}
                <div>
                  {item.receipts.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#856404' }}>No receipts attached</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {item.receipts.map((receipt) => (
                        <span
                          key={receipt.receiptId}
                          style={{
                            background: '#d1e7dd', color: '#0f5132',
                            padding: '3px 10px', borderRadius: '4px', fontSize: '12px',
                          }}
                        >
                          📎 {receipt.fileName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'right', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
              <span className="text-muted" style={{ marginRight: '8px' }}>Total:</span>
              <span className="amount" style={{ fontSize: '16px' }}>{fmt(claim.totalAmount, claim.currency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Decision Panel */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">Decision</div>

        {!canAct ? (
          <div className="alert alert-info" style={{ margin: 0 }}>
            {actionDone
              ? 'Your decision has been recorded.'
              : `This claim has status "${claim.status.replace('_', ' ')}" and cannot be actioned.`}
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Add a comment (required for Reject and Request Changes)…"
                disabled={!!actionLoading}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-success"
                onClick={() => handleAction('approve')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'approve' ? 'Approving…' : '✓ Approve'}
              </button>
              <button
                className="btn btn-warning"
                onClick={() => handleAction('changes')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'changes' ? 'Requesting…' : '↩ Request Changes'}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction('reject')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'reject' ? 'Rejecting…' : '✕ Reject'}
              </button>
            </div>
            <p className="text-muted" style={{ marginTop: '10px', marginBottom: 0 }}>
              A comment is required when rejecting or requesting changes.
            </p>
          </>
        )}
      </div>

      {/* Audit Trail */}
      {claim.auditLogs && claim.auditLogs.length > 0 && (
        <div className="card">
          <div className="section-title">Audit Trail</div>
          <div>
            {claim.auditLogs.map((log, idx) => (
              <div
                key={log.logId}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  paddingBottom: idx < (claim.auditLogs?.length ?? 0) - 1 ? '12px' : '0',
                  marginBottom: idx < (claim.auditLogs?.length ?? 0) - 1 ? '12px' : '0',
                  borderBottom: idx < (claim.auditLogs?.length ?? 0) - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#1e7a3e', flexShrink: 0, marginTop: '5px',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{log.action}</span>
                    <span className="text-muted">{fmtDateTime(log.timestamp)}</span>
                  </div>
                  {(log.oldStatus || log.newStatus) && (
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                      {log.oldStatus && <span>{log.oldStatus.replace('_', ' ')}</span>}
                      {log.oldStatus && log.newStatus && <span> → </span>}
                      {log.newStatus && <span>{log.newStatus.replace('_', ' ')}</span>}
                    </div>
                  )}
                  {log.comment && (
                    <p style={{ fontSize: '12px', color: '#495057', margin: '4px 0 0 0' }}>{log.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
