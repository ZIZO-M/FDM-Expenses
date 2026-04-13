import { useState, useEffect, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import './ProcessReimbursement.css';
import * as api from '../../services/api';
import { ExpenseClaim, ExpenseItem, Receipt, ApprovalDecision } from '../../types';

//Types
interface Receipt {
  receiptId: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
}

interface ExpenseItem {
  itemId: string;
  dateIncurred: string;
  category: string;
  description: string;
  merchant: string;
  amount: number;
  vatAmount: number;
  currency: string;
  receipts: Receipt[];
}

interface ApprovalDecision {
  decisionId: string;
  decisionType: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  decidedAt: string;
  comment: string | null;
  manager: {
    fullName: string;
  };
}

interface Reimbursement {
  reimbursementId: string;
  processedAt: string;
  paidAt: string | null;
  paymentReference: string | null;
  amountPaid: number;
  currency: string;
}

interface Employee {
  fullName: string;
  email: string;
  costCentre: string;
}

interface ExpenseClaim {
  claimId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'WITHDRAWN';
  totalAmount: number;
  currency: string;
  createdAt: string;
  submittedAt: string | null;
  employeeComment: string | null;
  managerComment: string | null;
  financeComment: string | null;
  employee: Employee;
  items: ExpenseItem[];
  decisions: ApprovalDecision[];
  reimbursement: Reimbursement | null;
}

// Props interface
interface ProcessReimbursementProps {
  onPaymentProcessed?: (claimId: string, paymentRef: string, notes: string) => void;
}

// Mock claim data
const getMockClaim = (claimId: string): ExpenseClaim => ({
  claimId: claimId,
  status: "APPROVED",
  totalAmount: 245.50,
  currency: "GBP",
  createdAt: "2024-03-10T10:00:00Z",
  submittedAt: "2024-03-10T14:30:00Z",
  employeeComment: "Client meeting in Manchester, train and meals",
  managerComment: "Approved - all receipts valid",
  financeComment: null,
  employee: {
    fullName: "Alice Johnson",
    email: "alice.johnson@fdm.com",
    costCentre: "CC-ENG-001"
  },
  items: [
    {
      itemId: "itm_001",
      dateIncurred: "2024-03-09T00:00:00Z",
      category: "TRAVEL",
      description: "Train ticket to Manchester",
      merchant: "National Rail",
      amount: 89.50,
      vatAmount: 0,
      currency: "GBP",
      receipts: [{ receiptId: "rcp_001", fileName: "train_ticket.pdf", fileType: "pdf", uploadDate: "2024-03-10T12:00:00Z" }]
    },
    {
      itemId: "itm_002",
      dateIncurred: "2024-03-09T00:00:00Z",
      category: "MEAL",
      description: "Working lunch with client",
      merchant: "Cafe Rouge",
      amount: 45.00,
      vatAmount: 7.50,
      currency: "GBP",
      receipts: [{ receiptId: "rcp_002", fileName: "lunch_receipt.jpg", fileType: "jpg", uploadDate: "2024-03-10T12:30:00Z" }]
    },
    {
      itemId: "itm_003",
      dateIncurred: "2024-03-10T00:00:00Z",
      category: "TAXI",
      description: "Taxi to office",
      merchant: "Uber",
      amount: 111.00,
      vatAmount: 18.50,
      currency: "GBP",
      receipts: [{ receiptId: "rcp_003", fileName: "uber_receipt.pdf", fileType: "pdf", uploadDate: "2024-03-10T13:00:00Z" }]
    }
  ],
  decisions: [{
    decisionId: "dec_001",
    decisionType: "APPROVED",
    decidedAt: "2024-03-11T09:15:00Z",
    comment: "All receipts look good, approved",
    manager: { fullName: "Bob Smith" }
  }],
  reimbursement: null
});

export default function ProcessReimbursement({ onPaymentProcessed }: ProcessReimbursementProps) {
  const { claimId } = useParams();
  
  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [processed, setProcessed] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      const res = await api.getFinanceClaim(claimId!);
      setClaim(res.data);
      setLoading(false);
    }, 500);
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

  await api.processReimbursement(claim.claimId, {
    paymentReference: paymentRef,
    financeComment: notes,
  });

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
          <Link to="/finance/dashboard" className="back-link">
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
            <span className="summary-value">{claim.employee.fullName}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Email</span>
            <span className="summary-value">{claim.employee.email}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Cost Centre</span>
            <span className="summary-value">{claim.employee.costCentre}</span>
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
      {processed ? (
        <div className="paid-card">
          <h3 className="section-title">✓ Reimbursement Complete</h3>
          <div className="alert-success">Claim has been marked as PAID.</div>
          <div className="payment-info">
            <p><strong>Payment Reference:</strong> {paymentRef || 'N/A'}</p>
            <p><strong>Finance Notes:</strong> {notes || 'None'}</p>
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
              />
            </div>

            <div className="form-group">
              <label>Finance Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes about this payment..."
              />
            </div>

            <button type="submit" className="btn-success">
              Confirm Payment — {formatMoney(claim.totalAmount, claim.currency)}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}