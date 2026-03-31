import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpenseClaim } from '../../types';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function PendingClaims() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getManagerPendingClaims()
      .then((res) => setClaims(res.data))
      .catch(() => setError('Failed to load pending claims.'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB');

  return (
    <>
      <div className="top-bar">
        <h1 className="page-title" style={{ margin: 0 }}>Pending Claims for Review</h1>
        <span className="text-muted">{claims.length} claim{claims.length !== 1 ? 's' : ''} awaiting review</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading">Loading claims…</div>
        ) : claims.length === 0 ? (
          <div className="empty-state">
            <div className="icon">✅</div>
            <p>No pending claims to review.</p>
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
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr
                    key={claim.claimId}
                    className="clickable-row"
                    onClick={() => navigate(`/manager/claims/${claim.claimId}`)}
                  >
                    <td>
                      <div style={{ fontWeight: 500 }}>{claim.employee?.fullName ?? '—'}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{claim.employee?.email ?? ''}</div>
                    </td>
                    <td>{claim.employee?.costCentre ?? '—'}</td>
                    <td>{claim.submittedAt ? fmtDate(claim.submittedAt) : '—'}</td>
                    <td>{claim.items.length}</td>
                    <td className="amount">{fmt(claim.totalAmount, claim.currency)}</td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td>
                      <span style={{ color: '#1e7a3e', fontSize: '12px' }}>Review →</span>
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
