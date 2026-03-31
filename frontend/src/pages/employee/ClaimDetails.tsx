import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ExpenseClaim } from '../../types';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function ClaimDetails() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();

  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadClaim = () => {
    if (!claimId) return;
    api.getClaim(claimId)
      .then((res) => setClaim(res.data))
      .catch(() => setError('Failed to load claim.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClaim();
  }, [claimId]);

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB');
  const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const handleWithdraw = async () => {
    if (!claimId) return;
    if (!window.confirm('Are you sure you want to withdraw this claim? It will return to draft status.')) return;
    setWithdrawing(true);
    setError('');
    try {
      await api.withdrawClaim(claimId);
      setSuccessMsg('Claim withdrawn successfully.');
      loadClaim();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to withdraw claim.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <div className="loading">Loading claim…</div>;
  if (!claim) return <div className="alert alert-error">{error || 'Claim not found.'}</div>;

  const canWithdraw = claim.status === 'SUBMITTED' || claim.status === 'CHANGES_REQUESTED';
  const canEdit = claim.status === 'DRAFT' || claim.status === 'CHANGES_REQUESTED';

  // Manager comment alert style
  const managerAlertClass =
    claim.status === 'REJECTED' ? 'alert-error' :
    claim.status === 'CHANGES_REQUESTED' ? 'alert-warning' :
    claim.status === 'APPROVED' || claim.status === 'PAID' ? 'alert-success' :
    'alert-info';

  return (
    <>
      {/* Header */}
      <div className="top-bar">
        <div>
          <Link
            to="/employee/claims"
            style={{ color: '#1e7a3e', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '6px' }}
          >
            ← Back to My Claims
          </Link>
          <h1 className="page-title" style={{ margin: 0 }}>Claim Details</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {canEdit && (
            <button
              className="btn btn-outline"
              onClick={() => navigate(`/employee/claims/${claimId}/edit`)}
            >
              Edit Claim
            </button>
          )}
          {canWithdraw && (
            <button
              className="btn btn-warning"
              onClick={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? 'Withdrawing…' : 'Withdraw Claim'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Claim Summary Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ marginBottom: '8px' }}>
              <StatusBadge status={claim.status} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '13px' }}>
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
              <span className="text-muted">Items:</span>
              <span>{claim.items.length}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '4px' }}>Total Amount</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a4d1a' }}>
              {fmt(claim.totalAmount, claim.currency)}
            </div>
          </div>
        </div>

        {claim.employeeComment && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Your Notes
            </div>
            <p style={{ fontSize: '14px', color: '#212529' }}>{claim.employeeComment}</p>
          </div>
        )}
      </div>

      {/* Manager Comment */}
      {claim.managerComment && (
        <div className={`alert ${managerAlertClass}`} style={{ marginBottom: '20px' }}>
          <strong>Manager Comment:</strong> {claim.managerComment}
        </div>
      )}

      {/* Finance Comment */}
      {claim.financeComment && (
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          <strong>Finance Comment:</strong> {claim.financeComment}
        </div>
      )}

      {/* Reimbursement Info */}
      {claim.reimbursement && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #198754' }}>
          <div className="section-title">Reimbursement Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '13px' }}>
            <span className="text-muted">Amount Paid:</span>
            <span className="amount">{fmt(claim.reimbursement.amountPaid, claim.reimbursement.currency)}</span>
            <span className="text-muted">Processed:</span>
            <span>{fmtDateTime(claim.reimbursement.processedAt)}</span>
            {claim.reimbursement.paidAt && (
              <>
                <span className="text-muted">Paid At:</span>
                <span>{fmtDateTime(claim.reimbursement.paidAt)}</span>
              </>
            )}
            {claim.reimbursement.paymentReference && (
              <>
                <span className="text-muted">Reference:</span>
                <span style={{ fontFamily: 'monospace' }}>{claim.reimbursement.paymentReference}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Expense Items */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">Expense Items ({claim.items.length})</div>
        {claim.items.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <p>No expense items on this claim.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>VAT</th>
                  <th>Receipts</th>
                </tr>
              </thead>
              <tbody>
                {claim.items.map((item) => (
                  <tr key={item.itemId}>
                    <td>{fmtDate(item.dateIncurred)}</td>
                    <td>
                      <span style={{
                        background: '#e9ecef', color: '#495057',
                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td>{item.description}</td>
                    <td>{item.merchant}</td>
                    <td className="amount">{fmt(item.amount, item.currency)}</td>
                    <td className="amount">{fmt(item.vatAmount, item.currency)}</td>
                    <td>
                      {item.receipts.length === 0 ? (
                        <span style={{ color: '#856404', fontSize: '12px' }}>None</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {item.receipts.map((r) => (
                            <span key={r.receiptId} style={{ fontSize: '12px', color: '#0f5132' }}>
                              📎 {r.fileName}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0', textAlign: 'right' }}>
          <span className="text-muted" style={{ marginRight: '8px' }}>Total:</span>
          <span className="amount" style={{ fontSize: '16px' }}>{fmt(claim.totalAmount, claim.currency)}</span>
        </div>
      </div>

      {/* Approval Decisions */}
      {claim.decisions && claim.decisions.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="section-title">Approval History</div>
          <div>
            {claim.decisions.map((decision) => {
              const badgeStyle =
                decision.decisionType === 'APPROVED' ? { background: '#d1e7dd', color: '#0f5132' } :
                decision.decisionType === 'REJECTED' ? { background: '#f8d7da', color: '#842029' } :
                { background: '#fff3cd', color: '#856404' };

              return (
                <div
                  key={decision.decisionId}
                  style={{
                    padding: '12px',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{
                        ...badgeStyle,
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>
                        {decision.decisionType.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{decision.manager.fullName}</span>
                    </div>
                    <span className="text-muted">{fmtDateTime(decision.decidedAt)}</span>
                  </div>
                  {decision.comment && (
                    <p style={{ fontSize: '13px', color: '#495057', margin: 0 }}>"{decision.comment}"</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Trail */}
      {claim.auditLogs && claim.auditLogs.length > 0 && (
        <div className="card">
          <div className="section-title">Audit Trail</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
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
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#1e7a3e',
                  flexShrink: 0,
                  marginTop: '5px',
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
                    <p style={{ fontSize: '12px', color: '#495057', marginTop: '4px', margin: '4px 0 0 0' }}>
                      {log.comment}
                    </p>
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
