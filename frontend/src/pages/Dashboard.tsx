import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ExpenseClaim } from '../types';
import * as api from '../services/api';
import StatusBadge from '../components/StatusBadge';

const fmt = (n: number, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getMyClaims();
        setClaims(res.data);
        if (user?.role === 'LINE_MANAGER' || user?.role === 'FINANCE_OFFICER') {
          try {
            const mgrRes = await api.getManagerPendingClaims();
            setPendingCount(mgrRes.data.length);
          } catch { setPendingCount(0); }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const totalAmount = claims.filter(c => c.status === 'PAID').reduce((s, c) => s + c.totalAmount, 0);
  const pendingApproval = claims.filter(c => c.status === 'SUBMITTED').length;
  const drafts = claims.filter(c => c.status === 'DRAFT').length;
  const recentClaims = [...claims].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--grey-900)', letterSpacing: '-0.4px', marginBottom: 4 }}>
          {greet()}, {user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted">Here's an overview of your expense activity.</p>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon green">📋</div>
          <div className="stat-card-value">{loading ? '—' : claims.length}</div>
          <div className="stat-card-label">Total Claims</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon amber">⏳</div>
          <div className="stat-card-value">{loading ? '—' : pendingApproval}</div>
          <div className="stat-card-label">Awaiting Approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon grey">📝</div>
          <div className="stat-card-value">{loading ? '—' : drafts}</div>
          <div className="stat-card-label">Drafts</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">💰</div>
          <div className="stat-card-value" style={{ fontSize: 18 }}>{loading ? '—' : fmt(totalAmount)}</div>
          <div className="stat-card-label">Total Reimbursed</div>
        </div>
        {(user?.role === 'LINE_MANAGER' || user?.role === 'FINANCE_OFFICER') && (
          <div className="stat-card" style={{ borderColor: pendingCount ? 'var(--amber-500)' : undefined }}>
            <div className="stat-card-icon amber">🔍</div>
            <div className="stat-card-value">{pendingCount ?? '—'}</div>
            <div className="stat-card-label">Claims Needing Review</div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="section-title">Quick Actions</div>
      <div className="quick-actions">
       
        {user?.role !== 'FINANCE_OFFICER' && (
          <>
            <Link to="/employee/claims/new" className="quick-action-btn">
              <span className="qa-icon">➕</span> New Claim
            </Link>

            <Link to="/employee/claims" className="quick-action-btn">
              <span className="qa-icon">📋</span> View My Claims
            </Link>
          </>
        )}
        {(user?.role === 'LINE_MANAGER' || user?.role === 'FINANCE_OFFICER') && (
          <Link to="/manager/claims" className="quick-action-btn">
            <span className="qa-icon">🔍</span> Review Pending
            {pendingCount ? <span className="sidebar-badge">{pendingCount}</span> : null}
          </Link>
        )}
        {user?.role === 'FINANCE_OFFICER' && (
          <Link to="/finance/claims" className="quick-action-btn">
            <span className="qa-icon">💳</span> Process Reimbursements
          </Link>
        )}
      </div>

      {/* Recent Claims */}
      { user?.role !== 'FINANCE_OFFICER' && (
      <div className="card">
        <div className="card-header">
          <span className="section-title" style={{ margin: 0 }}>Recent Claims</span>
          <Link to="/employee/claims" style={{ fontSize: 13, color: 'var(--green-600)', fontWeight: 600 }}>
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading…</div>
        ) : recentClaims.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="icon">📋</div>
            <h3>No claims yet</h3>
            <p>Start by creating your first expense claim.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/employee/claims/new')}>
              + New Claim
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentClaims.map(claim => (
                  <tr key={claim.claimId} className="clickable-row"
                    onClick={() => navigate(
                      claim.status === 'DRAFT' || claim.status === 'CHANGES_REQUESTED'
                        ? `/employee/claims/${claim.claimId}/edit`
                        : `/employee/claims/${claim.claimId}`
                    )}>
                    <td>{fmtDate(claim.createdAt)}</td>
                    <td>{claim.items.length} item{claim.items.length !== 1 ? 's' : ''}</td>
                    <td className="amount">{fmt(claim.totalAmount, claim.currency)}</td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td style={{ color: 'var(--green-600)', fontSize: 13 }}>View →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div> )}
    </>
  );
}
