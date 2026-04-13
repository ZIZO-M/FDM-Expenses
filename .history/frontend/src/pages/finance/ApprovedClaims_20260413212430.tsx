import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './FinanceClaimsDashboard.css';
import * as api from '../../services/api';
import { ExpenseClaim, ExpenseItem, Receipt, ApprovalDecision } from '../../types';

// Types
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

interface Employee {
  fullName: string;
  email: string;
  costCentre: string;
  employeeId: string;
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
}

type FilterStatus = 'ALL' | 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'PAID';

export default function FinanceClaimsDashboard() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('APPROVED');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data for demonstration - replace with actual API call
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const res = await api.getFinanceApprovedClaims();
        setClaims(res.data);
        
      } catch (err) {
        setError('Failed to load claims');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClaims();
  }, []);

  // Filter claims based on status and search
  useEffect(() => {
    let filtered = [...claims];
    
    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(claim => claim.status === activeFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(claim => 
        claim.claimId.toLowerCase().includes(term) ||
        claim.employee.fullName.toLowerCase().includes(term) ||
        claim.employee.email.toLowerCase().includes(term) ||
        claim.employee.costCentre.toLowerCase().includes(term)
      );
    }
    
    setFilteredClaims(filtered);
  }, [claims, activeFilter, searchTerm]);

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: currency 
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'APPROVED': return 'status-badge approved';
      case 'REJECTED': return 'status-badge rejected';
      case 'SUBMITTED': return 'status-badge pending';
      case 'PAID': return 'status-badge paid';
      default: return 'status-badge';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'SUBMITTED': return 'Pending';
      case 'PAID': return 'Paid';
      default: return status;
    }
  };

  const handleViewClaim = (claim: ExpenseClaim) => {
    if (claim.status === 'APPROVED') {
      navigate(`/finance/process/${claim.claimId}`);
    } else {
      setSelectedClaim(claim);
      setShowDetailModal(true);
    }
  };

  const getActionButtonText = (status: string) => {
    switch(status) {
      case 'APPROVED': return 'Process →';
      case 'PAID': return 'View';
      default: return 'View Details';
    }
  };

  const getFilterCount = (status: FilterStatus) => {
    if (status === 'ALL') return claims.length;
    return claims.filter(c => c.status === status).length;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading claims...</p>
      </div>
    );
  }

  return (
    <div className="finance-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Finance Dashboard</h1>
          <p className="text-muted">Manage and process expense claims</p>
        </div>
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-value">{getFilterCount('APPROVED')}</div>
            <div className="stat-label">Ready to Process</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{getFilterCount('PAID')}</div>
            <div className="stat-label">Completed</div>
          </div>
          
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeFilter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('APPROVED')}
          >
            Approved to Process
            <span className="filter-count">{getFilterCount('APPROVED')}</span>
          </button>
          <button
            className={`filter-tab ${activeFilter === 'SUBMITTED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('SUBMITTED')}
          >
            Pending Review
            <span className="filter-count">{getFilterCount('SUBMITTED')}</span>
          </button>
          <button
            className={`filter-tab ${activeFilter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('REJECTED')}
          >
            Rejected
            <span className="filter-count">{getFilterCount('REJECTED')}</span>
          </button>
          <button
            className={`filter-tab ${activeFilter === 'PAID' ? 'active' : ''}`}
            onClick={() => setActiveFilter('PAID')}
          >
            Paid
            <span className="filter-count">{getFilterCount('PAID')}</span>
          </button>
          <button
            className={`filter-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All Claims
            <span className="filter-count">{getFilterCount('ALL')}</span>
          </button>
        </div>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by employee name, email, claim ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="search-clear"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Claims Table */}
      <div className="card">
        {filteredClaims.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No {activeFilter !== 'ALL' ? getStatusText(activeFilter).toLowerCase() : ''} claims found</p>
            {searchTerm && <p className="text-muted">Try adjusting your search</p>}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="claims-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Employee</th>
                  <th>Cost Centre</th>
                  <th>Submitted</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Manager Decision</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr 
                    key={claim.claimId}
                    className="clickable-row"
                    onClick={() => handleViewClaim(claim)}
                  >
                    <td>
                      <div className="claim-id">{claim.claimId}</div>
                    </td>
                    <td>
                      <div className="employee-name">{claim.employee.fullName}</div>
                      <div className="employee-email">{claim.employee.email}</div>
                    </td>
                    <td>{claim.employee.costCentre}</td>
                    <td>{claim.submittedAt ? formatDate(claim.submittedAt) : '—'}</td>
                    <td className="amount">{formatMoney(claim.totalAmount, claim.currency)}</td>
                    <td>
                      <span className={getStatusBadgeClass(claim.status)}>
                        {getStatusText(claim.status)}
                      </span>
                    </td>
                    <td>
                      {claim.decisions[0]?.decisionType === 'APPROVED' && (
                        <span className="decision-approved">✓ Approved</span>
                      )}
                      {claim.decisions[0]?.decisionType === 'REJECTED' && (
                        <span className="decision-rejected">✗ Rejected</span>
                      )}
                      {(!claim.decisions[0] || claim.status === 'SUBMITTED') && (
                        <span className="decision-pending">—</span>
                      )}
                    </td>
                    <td>
                      <span className="action-link">
                        {getActionButtonText(claim.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedClaim && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Claim Details</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Claim ID:</span>
                <span>{selectedClaim.claimId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Employee:</span>
                <span>{selectedClaim.employee.fullName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Total:</span>
                <span className="amount">{formatMoney(selectedClaim.totalAmount, selectedClaim.currency)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={getStatusBadgeClass(selectedClaim.status)}>
                  {getStatusText(selectedClaim.status)}
                </span>
              </div>
              {selectedClaim.decisions[0]?.comment && (
                <div className="detail-row">
                  <span className="detail-label">Manager Comment:</span>
                  <span>{selectedClaim.decisions[0].comment}</span>
                </div>
              )}
              {selectedClaim.employeeComment && (
                <div className="detail-row">
                  <span className="detail-label">Employee Notes:</span>
                  <span>{selectedClaim.employeeComment}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}