import { useState, useEffect, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../../services/api';
import { ExpenseClaim } from '../../types';

export default function ProcessReimbursement() {
  const { claimId } = useParams();
  
  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [processed, setProcessed] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadClaim = async () => {
      if (!claimId) return;
      try {
        setLoading(true);
        const res = await api.getFinanceClaim(claimId);
        setClaim(res.data);
        if (res.data.status === 'PAID') setProcessed(true);
      } catch (err) {
        setError('Failed to load claim');
      } finally {
        setLoading(false);
      }
    };
    
    loadClaim();
  }, [claimId]);

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: currency 
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!claim) return;
    
    if (window.confirm(`Process payment of ${formatMoney(claim.totalAmount, claim.currency)}?`)) {
      setProcessing(true);
      setError('');
      try {
        await api.processReimbursement(claim.claimId, {
          paymentReference: paymentRef.trim() || undefined,
          financeComment: notes.trim() || undefined,
        });
        setProcessed(true);
      } catch (err) {
        setError('Failed to process payment');
      } finally {
        setProcessing(false);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading claim details...</div>;
  }

  if (!claim) {
    return <div className="empty-state">Claim not found</div>;
  }

  const approvedDecision = claim.decisions?.find(d => d.decisionType === 'APPROVED');

  return (
    <>
      <div className="top-bar">
        <div>
          <Link to="/finance/claims" style={{ color: '#1e7a3e', fontSize: '13px', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
          <h1 className="page-title" style={{ marginTop: '8px', marginBottom: 0 }}>
            Process Reimbursement
          </h1>
          <div className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
            Claim ID: {claim.claimId}
          </div>
        </div>
        <span className="amount" style={{ fontSize: '24px' }}>
          {formatMoney(claim.totalAmount, claim.currency)}
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Claim Summary */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">Claim Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div className="text-muted" style={{ fontSize: '12px' }}>Employee</div>
            <div style={{ fontWeight: 500 }}>{claim.employee?.fullName ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '12px' }}>Email</div>
            <div>{claim.employee?.email ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '12px' }}>Cost Centre</div>
            <div>{claim.employee?.costCentre ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '12px' }}>Submitted</div>
            <div>{claim.submittedAt ? formatDate(claim.submittedAt) : '—'}</div>
          </div>
        </div>
        
        {claim.employeeComment && (
          <>
            <div className="divider"></div>
            <div style={{ marginTop: '16px' }}>
              <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Employee Notes</div>
              <p style={{ marginTop: '8px', fontSize: '14px' }}>{claim.employeeComment}</p>
            </div>
          </>
        )}
      </div>

      {/* Manager Approval */}
      {approvedDecision && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #198754' }}>
          <div className="section-title">✓ Manager Approval</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '13px' }}>
            <span className="text-muted">Approved by:</span>
            <span style={{ fontWeight: 500 }}>{approvedDecision.manager.fullName}</span>
            <span className="text-muted">Approved on:</span>
            <span>{formatDateTime(approvedDecision.decidedAt)}</span>
          </div>
          {approvedDecision.comment && (
            <div style={{ marginTop: '12px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontSize: '13px' }}>
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
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {claim.items.map((item) => (
                <tr key={item.itemId}>
                  <td>{formatDate(item.dateIncurred)}</td>
                  <td>
                    <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                      {item.category}
                    </span>
                  </td>
                  <td>{item.description}</td>
                  <td>{item.merchant}</td>
                  <td className="amount">{formatMoney(item.amount, item.currency)}</td>
                  <td className="amount">{formatMoney(item.vatAmount, item.currency)}</td>
                  <td>
                    {item.receipts.length > 0 ? (
                      <span style={{ color: '#1e7a3e', fontSize: '12px' }}>✓ {item.receipts[0].fileName}</span>
                    ) : (
                      <span style={{ color: '#dc3545', fontSize: '12px' }}>❌ Missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-right" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
          <span className="text-muted">Total: </span>
          <span className="amount" style={{ fontSize: '18px' }}>{formatMoney(claim.totalAmount, claim.currency)}</span>
        </div>
      </div>

      {/* Payment Section */}
      {processed || claim.status === 'PAID' ? (
        <div className="card" style={{ borderLeft: '4px solid #198754' }}>
          <div className="section-title" style={{ color: '#0f5132' }}>✓ Reimbursement Complete</div>
          <div className="alert alert-success">Claim has been marked as PAID.</div>
          <div style={{ marginTop: '16px' }}>
            <p><strong>Payment Reference:</strong> {claim.reimbursement?.paymentReference || paymentRef || 'N/A'}</p>
            <p><strong>Finance Notes:</strong> {claim.financeComment || notes || 'None'}</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="section-title">Process Payment</div>
          
          <div className="alert alert-info">
            This will mark the claim as <strong>PAID</strong> and notify the employee.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Payment Reference (optional)</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g., BACS-001, TRANSFER-15032024"
                disabled={processing}
              />
            </div>

            <div className="form-group">
              <label>Finance Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes about this payment..."
                disabled={processing}
              />
            </div>

            <div className="flex-end">
              <button type="submit" className="btn btn-success" disabled={processing}>
                {processing ? 'Processing...' : `Confirm Payment — ${formatMoney(claim.totalAmount, claim.currency)}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}