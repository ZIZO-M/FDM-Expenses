import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExpenseClaim } from '../../types';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function ReimbursementProcessing() {
  const { claimId } = useParams<{ claimId: string }>();

  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [paymentReference, setPaymentReference] = useState('');
  const [financeComment, setFinanceComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (!claimId) return;
    api.getFinanceClaim(claimId)
      .then((res) => {
        const c: ExpenseClaim = res.data;
        setClaim(c);
        if (c.status === 'PAID') setProcessed(true);
      })
      .catch(() => setError('Failed to load claim.'))
      .finally(() => setLoading(false));
  }, [claimId]);

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB');
  const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const handleProcess = async (e: FormEvent) => {
    e.preventDefault();
    if (!claimId) return;
    if (!window.confirm('Process reimbursement for this claim? This will mark it as PAID.')) return;

    setProcessing(true);
    setError('');
    try {
      await api.processReimbursement(claimId, {
        paymentReference: paymentReference.trim() || undefined,
        financeComment: financeComment.trim() || undefined,
      });
      setSuccessMsg('Reimbursement processed successfully. The claim is now marked as PAID.');
      setProcessed(true);
      // Reload to show reimbursement details
      const res = await api.getFinanceClaim(claimId);
      setClaim(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to process reimbursement.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="loading">Loading claim…</div>;
  if (!claim) return <div className="alert alert-error">{error || 'Claim not found.'}</div>;

  // Get the approved decision
  const approvedDecision = claim.decisions?.find((d) => d.decisionType === 'APPROVED');

  return (
    <>
      {/* Header */}
      <div className="top-bar">
        <div>
          <Link
            to="/finance/claims"
            style={{ color: '#1e7a3e', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '6px' }}
          >
            ← Back to Approved Claims
          </Link>
          <h1 className="page-title" style={{ margin: 0 }}>Process Reimbursement</h1>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Employee & Claim Summary */}
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
            <span className="text-muted">Items:</span>
            <span>{claim.items.length}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '4px' }}>Total Amount</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a4d1a' }}>
              {fmt(claim.totalAmount, claim.currency)}
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

      {/* Manager Approval */}
      {approvedDecision && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #198754' }}>
          <div className="section-title">Manager Approval</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '13px' }}>
            <span className="text-muted">Approved By:</span>
            <span style={{ fontWeight: 500 }}>{approvedDecision.manager.fullName}</span>
            <span className="text-muted">Approved On:</span>
            <span>{fmtDateTime(approvedDecision.decidedAt)}</span>
          </div>
          {approvedDecision.comment && (
            <div style={{ marginTop: '12px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontSize: '13px', color: '#495057' }}>
              <strong>Comment:</strong> {approvedDecision.comment}
            </div>
          )}
        </div>
      )}

      {/* Expense Items */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">Expense Items ({claim.items.length})</div>
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
                      <span style={{ color: '#6c757d', fontSize: '12px' }}>None</span>
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
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0', textAlign: 'right' }}>
          <span className="text-muted" style={{ marginRight: '8px' }}>Total:</span>
          <span className="amount" style={{ fontSize: '18px' }}>{fmt(claim.totalAmount, claim.currency)}</span>
        </div>
      </div>

      {/* Reimbursement Section */}
      {claim.status === 'PAID' && claim.reimbursement ? (
        // Already paid — show details
        <div className="card" style={{ borderLeft: '4px solid #198754' }}>
          <div className="section-title" style={{ color: '#0f5132' }}>Reimbursement Processed</div>
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            This claim has been paid. No further action required.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '13px' }}>
            <span className="text-muted">Amount Paid:</span>
            <span className="amount" style={{ fontWeight: 700, fontSize: '16px' }}>
              {fmt(claim.reimbursement.amountPaid, claim.reimbursement.currency)}
            </span>
            <span className="text-muted">Processed At:</span>
            <span>{fmtDateTime(claim.reimbursement.processedAt)}</span>
            {claim.reimbursement.paidAt && (
              <>
                <span className="text-muted">Paid At:</span>
                <span>{fmtDateTime(claim.reimbursement.paidAt)}</span>
              </>
            )}
            {claim.reimbursement.paymentReference && (
              <>
                <span className="text-muted">Payment Reference:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {claim.reimbursement.paymentReference}
                </span>
              </>
            )}
          </div>
          {claim.financeComment && (
            <div style={{ marginTop: '12px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontSize: '13px', color: '#495057' }}>
              <strong>Finance Comment:</strong> {claim.financeComment}
            </div>
          )}
        </div>
      ) : (
        // Form to process reimbursement
        <div className="card">
          <div className="section-title">Process Reimbursement</div>

          {processed ? (
            <div className="alert alert-success">
              Reimbursement has been processed successfully.
            </div>
          ) : (
            <>
              <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                Processing this reimbursement will mark the claim as <strong>PAID</strong> and notify the employee.
              </div>

              <form onSubmit={handleProcess}>
                <div className="form-group">
                  <label>Payment Reference (optional)</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. BACS-20240315-001"
                    disabled={processing}
                  />
                </div>

                <div className="form-group">
                  <label>Finance Comment (optional)</label>
                  <textarea
                    value={financeComment}
                    onChange={(e) => setFinanceComment(e.target.value)}
                    rows={3}
                    placeholder="Any notes regarding this payment…"
                    disabled={processing}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px' }}>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={processing}
                  >
                    {processing ? 'Processing…' : `Process Reimbursement — ${fmt(claim.totalAmount, claim.currency)}`}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
