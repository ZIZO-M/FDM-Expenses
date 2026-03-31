import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpenseClaim } from '../../types';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function ApprovedClaims() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getFinanceApprovedClaims()
      .then((res) => setClaims(res.data))
      .catch(() => setError('Failed to load approved claims.'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB');

  // Find the latest approval decision date
  const getApprovedDate = (claim: ExpenseClaim): string => {
    if (!claim.decisions || claim.decisions.length === 0) return '—';
    const approved = claim.decisions
      .filter((d) => d.decisionType === 'APPROVED')
      .sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime())[0];
    return approved ? fmtDate(approved.decidedAt) : '—';
  };

  return (
    <>
      <div className="top-bar">
        <h1 className="page-title" style={{ margin: 0 }}>
          Approved Claims — Ready for Reimbursement
        </h1>
        <span className="text-muted">
          {claims.length} claim{claims.length !== 1 ? 's' : ''} ready to process
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading">Loading claims…</div>
        ) : claims.length === 0 ? (
          <div className="empty-state">
            <div className="icon">💼</div>
            <p>No approved claims awaiting reimbursement.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Cost Centre</th>
                  <th>Approved Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr
                    key={claim.claimId}
                    className="clickable-row"
                    onClick={() => navigate(`/finance/claims/${claim.claimId}`)}
                  >
                    <td>
                      <div style={{ fontWeight: 500 }}>{claim.employee?.fullName ?? '—'}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{claim.employee?.email ?? ''}</div>
                    </td>
                    <td>{claim.employee?.costCentre ?? '—'}</td>
                    <td>{getApprovedDate(claim)}</td>
                    <td>{claim.items.length}</td>
                    <td className="amount">{fmt(claim.totalAmount, claim.currency)}</td>
                    <td>{claim.currency}</td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td>
                      <span style={{ color: '#1e7a3e', fontSize: '12px' }}>Process →</span>
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
