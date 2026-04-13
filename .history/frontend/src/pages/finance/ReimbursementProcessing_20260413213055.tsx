import { useState, useEffect, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import './ProcessReimbursement.css';
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
    return <div className="loading-container">Loading claim details...</div>;
  }

  if (!claim) {
    return <div className="empty-state">Claim not found</div>;
  }

  const approvedDecision = claim.decisions?.find(d => d.decisionType === 'APPROVED');

  return (
    <div className="reimbursement-container">
      <div className="reimbursement-header">
        <div>
          <Link to="/finance/claims" className="back-link">
            ← Back to Dashboard
          </Link>
          <h1>Process Reimbursement</h1>
          <p className="claim-id-ref">Claim ID: {claim.claimId}</p>
        </div>
        <span className={`status-pill ${claim.status}`}>
          {claim.status}
        </span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Claim Summary */}
      <div className="summary-card">
        <h3 className="section-title">Claim Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Employee</span>
            <span className="summary-value">{claim.employee?.fullName ?? '—'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Email</span>
            <span className="summary-value">{claim.employee?.email ?? '—'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Cost Centre</span>
            <span className="summary-value">{claim.employee?.costCentre ?? '—'}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Submitted</span>
            <span className="summary-value">{claim.submittedAt ? formatDate(claim.submittedAt) : '—'}</span>
          </div>
        </div>
        <div className="total-box">
          <div className="total-label-small">Total Amount</div>
          <div className="total-amount-large">
            {formatMoney(claim.totalAmount, claim.currency)}
          </div>
        </div>
        {claim.employeeComment && (
          <div className="employee-notes">
            <div className="notes-heading">EMPLOYEE NOTES</div>
            <p className="notes-text">{claim.employeeComment}</p>
          </div>
        )}
      </div>

      {/* Manager Approval */}
      {approvedDecision && (
        <div className="approval-card">
          <h3 className="section-title">✓ Manager Approval</h3>
          <div className="approval-grid">
            <span className="text-muted">Approved by:</span>
            <span className="summary-value">{approvedDecision.manager.fullName}</span>
            <span className="text-muted">Approved on:</span>
            <span>{formatDateTime(approvedDecision.decidedAt)}</span>
          </div>
          {approvedDecision.comment && (
            <div className="approval-comment">
              <strong>Comment:</strong> {approvedDecision.comment}
            </div>
          )}
        </div>
      )}

      {/* Expense Items */}
      <div className="items-card">
        <h3 className="section-title">Expense Items ({claim.items.length})</h3>
        <div className="table-wrap">
          <table className="items-table">
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
                  <td><span className="category-tag">{item.category}</span></td>
                  <td>{item.description}</td>
                  <td>{item.merchant}</td>
                  <td className="amount">{formatMoney(item.amount, item.currency)}</td>
                  <td className="amount">{formatMoney(item.vatAmount, item.currency)}</td>
                  <td>
                    {item.receipts.length > 0 ? (
                      <span className="receipt-item">✓ {item.receipts[0].fileName}</span>
                    ) : (
                      <span className="no-receipt">❌ Missing receipt</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}></td>
                <td className="table-total-label">Total:</td>
                <td className="table-total-amount amount" colSpan={2}>
                  {formatMoney(claim.totalAmount, claim.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Section */}
      {processed || claim.status === 'PAID' ? (
        <div className="paid-card">
          <h3 className="section-title">✓ Reimbursement Complete</h3>
          <div className="alert-success">Claim has been marked as PAID.</div>
          <div className="payment-info">
            <p><strong>Payment Reference:</strong> {claim.reimbursement?.paymentReference || paymentRef || 'N/A'}</p>
            <p><strong>Finance Notes:</strong> {claim.financeComment || notes || 'None'}</p>
          </div>
        </div>
      ) : (
        <div className="payment-card">
          <h3 className="section-title">Process Payment</h3>
          
          <div className="alert-info">
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

            <button type="submit" className="btn-success" disabled={processing}>
              {processing ? 'Processing...' : `Confirm Payment — ${formatMoney(claim.totalAmount, claim.currency)}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}