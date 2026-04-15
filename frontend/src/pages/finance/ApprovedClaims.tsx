import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { ExpenseClaim } from '../../types';
import StatusBadge from '../../components/StatusBadge';

type FilterStatus = 'ALL' | 'APPROVED' | 'PAID';

const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ApprovedClaims() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('APPROVED');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getFinanceApprovedClaims()
      .then((res) => setClaims(res.data))
      .catch(() => setError('Failed to load claims.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = claims
    .filter(c => filter === 'ALL' || c.status === filter)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.claimId.toLowerCase().includes(q) ||
        (c.employee?.fullName || '').toLowerCase().includes(q) ||
        (c.employee?.email || '').toLowerCase().includes(q) ||
        (c.employee?.costCentre || '').toLowerCase().includes(q)
      );
    });

  const totalReady = claims.filter(c => c.status === 'APPROVED').reduce((s, c) => s + c.totalAmount, 0);

  return (
    <>
      <div className="top-bar">
        <h1 className="page-title" style={{ margin: 0 }}>Finance — Approved Claims</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--grey-500)' }}>
            Ready to process: <strong style={{ color: 'var(--green-700)' }}>{fmt(totalReady, 'GBP')}</strong>
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div className="filter-bar">
            {(['APPROVED','PAID','ALL'] as FilterStatus[]).map(s => (
              <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'ALL' ? `All (${claims.length})` : s === 'APPROVED' ? `Ready (${claims.filter(c => c.status === 'APPROVED').length})` : `Paid (${claims.filter(c => c.status === 'PAID').length})`}
              </button>
            ))}
          </div>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search employee, claim ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '7px 12px 7px 32px', borderRadius: 6, border: '1.5px solid var(--grey-200)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, outline: 'none', width: 240 }}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /> Loading claims…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">✅</div>
            <h3>No claims found</h3>
            <p>{search ? 'Try a different search term.' : 'No claims match the current filter.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Cost Centre</th>
                  <th>Submitted</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((claim) => (
                  <tr key={claim.claimId} className="clickable-row" onClick={() => navigate(`/finance/claims/${claim.claimId}`)}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--grey-900)' }}>{claim.employee?.fullName ?? '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--grey-400)' }}>{claim.employee?.email}</div>
                    </td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{claim.employee?.costCentre ?? '—'}</td>
                    <td>{claim.submittedAt ? fmtDate(claim.submittedAt) : '—'}</td>
                    <td>{claim.items.length}</td>
                    <td className="amount">{fmt(claim.totalAmount, claim.currency)}</td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td>
                      <span style={{ color: 'var(--green-600)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {claim.status === 'APPROVED' ? 'Process →' : 'View →'}
                      </span>
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
