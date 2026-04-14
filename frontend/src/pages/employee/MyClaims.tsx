import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExpenseClaim, ClaimStatus } from '../../types';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const ALL_STATUSES: ClaimStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'PAID',
  'WITHDRAWN',
];

export default function MyClaims() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [filter, setFilter] = useState<ClaimStatus | 'ALL'>('ALL');
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

    if (!window.confirm('Are you sure you want to delete this claim?')) return;

    try {
      await api.deleteClaim(claimId);
      setClaims((prev) => prev.filter((c) => c.claimId !== claimId));
    } catch {
      setError('Failed to delete claim');
    }
  };

  const handleWithdraw = async (e: React.MouseEvent, claimId: string) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to withdraw this claim?')) return;

    try {
      await api.withdrawClaim(claimId);
      setClaims((prev) =>
        prev.map((c) =>
          c.claimId === claimId ? { ...c, status: 'WITHDRAWN' } : c
        )
      );
    } catch {
      setError('Failed to withdraw claim');
    }
  };

  const filtered =
    filter === 'ALL'
      ? claims
      : claims.filter((c) => c.status === filter);

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB');

  return (
    <>
      <div className="top-bar">
        <h1 className="page-title" style={{ margin: 0 }}>
          My Expense Claims
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/employee/claims/new')}
        >
          + New Claim
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="filter-bar" style={{ marginBottom: '16px' }}>
          <button
            className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({claims.length})
          </button>

          {ALL_STATUSES.map((s) => {
            const count = claims.filter((c) => c.status === s).length;
            if (count === 0) return null;

            return (
              <button
                key={s}
                className={`filter-btn ${filter === s ? 'active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s.replace('_', ' ')} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="loading">Loading claims…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>
              {filter === 'ALL'
                ? 'No claims yet. Create your first claim.'
                : `No ${filter.replace('_', ' ').toLowerCase()} claims.`}
            </p>
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
                  <tr
                    key={claim.claimId}
                    className="clickable-row"
                    onClick={() => {
                      if (
                        claim.status === 'DRAFT' ||
                        claim.status === 'CHANGES_REQUESTED'
                      ) {
                        navigate(`/employee/claims/${claim.claimId}/edit`);
                      } else {
                        navigate(`/employee/claims/${claim.claimId}`);
                      }
                    }}
                  >
                    <td>{fmtDate(claim.createdAt)}</td>

                    <td>
                      {claim.submittedAt
                        ? fmtDate(claim.submittedAt)
                        : '—'}
                    </td>

                    <td>{claim.items.length}</td>

                    <td className="amount">
                      {fmt(claim.totalAmount, claim.currency)}
                    </td>

                    <td>
                      <StatusBadge status={claim.status} />
                    </td>

                    <td>
                      {claim.status === 'DRAFT' && (
                        <button
                          className="btn btn-danger"
                          onClick={(e) =>
                            handleDelete(e, claim.claimId)
                          }
                        >
                          Delete
                        </button>
                      )}

                      {(claim.status === 'SUBMITTED' ||
                        claim.status === 'CHANGES_REQUESTED') && (
                        <button
                          className="btn btn-warning"
                          onClick={(e) =>
                            handleWithdraw(e, claim.claimId)
                          }
                        >
                          Withdraw
                        </button>
                      )}

                      {!(
                        claim.status === 'DRAFT' ||
                        claim.status === 'SUBMITTED' ||
                        claim.status === 'CHANGES_REQUESTED'
                      ) && (
                        <span
                          style={{
                            color: '#1e7a3e',
                            fontSize: '12px',
                          }}
                        >
                          View →
                        </span>
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