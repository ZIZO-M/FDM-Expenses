import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { ExpenseClaim } from '../../types';

type FilterStatus = 'ALL' | 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'PAID';

export default function FinanceClaimsDashboard() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('APPROVED');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
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

  useEffect(() => {
    let filtered = [...claims];
    
    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(claim => claim.status === activeFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(claim => 
        claim.claimId.toLowerCase().includes(term) ||
        claim.employee?.fullName?.toLowerCase().includes(term) ||
        claim.employee?.email?.toLowerCase().includes(term) ||
        claim.employee?.costCentre?.toLowerCase().includes(term)
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
    navigate(`/finance/claims/${claim.claimId}`);
  };

  const getFilterCount = (status: FilterStatus) => {
    if (status === 'ALL') return claims.length;
    return claims.filter(c => c.status === status).length;
  };

  if (loading) {
    return <div className="loading">Loading claims...</div>;
  }

  return (
    <>
      <div className="top-bar">
        <h1 className="page-title">Finance Dashboard</h1>
        <span className="text-muted">
          {getFilterCount('APPROVED')} ready · {getFilterCount('PAID')} completed
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-bar">
        <button
          className={`filter-btn ${activeFilter === 'APPROVED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('APPROVED')}
        >
          Approved ({getFilterCount('APPROVED')})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'SUBMITTED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('SUBMITTED')}
        >
          Pending ({getFilterCount('SUBMITTED')})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('REJECTED')}
        >
          Rejected ({getFilterCount('REJECTED')})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'PAID' ? 'active' : ''}`}
          onClick={() => setActiveFilter('PAID')}
        >
          Paid ({getFilterCount('PAID')})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          All ({getFilterCount('ALL')})
        </button>
      </div>

      <div className="card">
        {filteredClaims.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : ''} claims found</p>
            {searchTerm && <p className="text-muted">Try adjusting your search</p>}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Employee</th>
                  <th>Cost Centre</th>
                  <th>Submitted</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Items</th>
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
                    <td style={{ fontWeight: 600, color: '#1e7a3e', fontFamily: 'monospace' }}>
                      {claim.claimId}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{claim.employee?.fullName ?? '—'}</div>
                      <div style={{ fontSize: '11px', color: '#6c757d' }}>{claim.employee?.email ?? ''}</div>
                    </td>
                    <td>{claim.employee?.costCentre ?? '—'}</td>
                    <td>{claim.submittedAt ? formatDate(claim.submittedAt) : '—'}</td>
                    <td className="amount">{formatMoney(claim.totalAmount, claim.currency)}</td>
                    <td>{getStatusText(claim.status)}</td>
                    <td>{claim.items.length}</td>
                    <td>
                      <span style={{ color: '#1e7a3e', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                        {claim.status === 'APPROVED' ? 'Process →' : 'View'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="divider"></div>

      <div className="filter-bar" style={{ marginTop: '16px' }}>
        <input
          type="text"
          placeholder="Search by employee name, email, claim ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            flex: 1, 
            padding: '8px 12px', 
            border: '1px solid #dee2e6', 
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
        {searchTerm && (
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchTerm('')}
          >
            Clear
          </button>
        )}
      </div>
    </>
  );
}