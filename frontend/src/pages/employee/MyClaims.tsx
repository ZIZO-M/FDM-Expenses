import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpenseClaim, ClaimStatus } from '../../types';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const ALL_STATUSES: ClaimStatus[] = ['DRAFT','SUBMITTED','CHANGES_REQUESTED','APPROVED','REJECTED','PAID','WITHDRAWN'];

const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function MyClaims() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [filter, setFilter] = useState<ClaimStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getMyClaims()
      .then((res) => setClaims(res.data))
      .catch(() => setError('Failed to load claims'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, claimId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this draft claim?')) return;
    try {
      await api.deleteClaim(claimId);
      setClaims((prev) => prev.filter((c) => c.claimId !== claimId));
    } catch { setError('Failed to delete claim'); }
  };

  const handleWithdraw = async (e: React.MouseEvent, claimId: string) => {
    e.stopPropagation();
    if (!window.confirm('Withdraw this claim?')) return;
    try {
      await api.withdrawClaim(claimId);
      setClaims((prev) => prev.map((c) => c.claimId === claimId ? { ...c, status: 'WITHDRAWN' } : c));
    } catch { setError('Failed to withdraw claim'); }
  };

  const filtered = claims
    .filter(c => filter === 'ALL' || c.status === filter)
    .filter(c => !search || c.claimId.toLowerCase().includes(search.toLowerCase()) || (c.employeeComment || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="top-bar">
        <h1 className="page-title" style={{ margin: 0 }}>My Expense Claims</h1>
        <button className="btn btn-primary" onClick={() => navigate('/employee/claims/new')}>
          + New Claim
        </button>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div className="filter-bar">
            <button className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
              All ({claims.length})
            </button>
            {ALL_STATUSES.map((s) => {
              const count = claims.filter((c) => c.status === s).length;
              if (count === 0) return null;
              return (
                <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                  {s.replace(/_/g, ' ')} ({count})
                </button>
              );
            })}
          </div>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search claims…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '7px 12px 7px 32px', borderRadius: 6, border: '1.5px solid var(--grey-200)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', width: 200 }}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading claims…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>{filter === 'ALL' && !search ? 'No claims yet' : 'No matching claims'}</h3>
            <p>{filter === 'ALL' && !search ? 'Create your first expense claim to get started.' : 'Try adjusting your filters.'}</p>
            {filter === 'ALL' && !search && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/employee/claims/new')}>
                + New Claim
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Submitted</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((claim) => (
                  <tr key={claim.claimId} className="clickable-row"
                    onClick={() => navigate(
                      claim.status === 'DRAFT' || claim.status === 'CHANGES_REQUESTED'
                        ? `/employee/claims/${claim.claimId}/edit`
                        : `/employee/claims/${claim.claimId}`
                    )}>
                    <td>{fmtDate(claim.createdAt)}</td>
                    <td>{claim.submittedAt ? fmtDate(claim.submittedAt) : <span className="text-muted">—</span>}</td>
                    <td>{claim.items.length}</td>
                    <td className="amount">{fmt(claim.totalAmount, claim.currency)}</td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      {claim.status === 'DRAFT' && (
                        <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, claim.claimId)}>
                          Delete
                        </button>
                      )}
                      {(claim.status === 'SUBMITTED' || claim.status === 'CHANGES_REQUESTED') && (
                        <button className="btn btn-warning btn-sm" onClick={(e) => handleWithdraw(e, claim.claimId)}>
                          Withdraw
                        </button>
                      )}
                      {!['DRAFT','SUBMITTED','CHANGES_REQUESTED'].includes(claim.status) && (
                        <span style={{ color: 'var(--green-600)', fontSize: 12, fontWeight: 600 }}>View →</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
