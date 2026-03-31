import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExpenseClaim, ExpenseItem } from '../../types';
import * as api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const CURRENCIES = ['GBP', 'USD', 'EUR', 'CHF', 'JPY', 'AUD', 'CAD'];
const CATEGORIES = [
  'Meals',
  'Travel',
  'Accommodation',
  'Equipment',
  'Software',
  'Training',
  'Entertainment',
  'Other',
];

interface ItemForm {
  dateIncurred: string;
  category: string;
  description: string;
  merchant: string;
  amount: string;
  currency: string;
  vatAmount: string;
}

const emptyItemForm = (): ItemForm => ({
  dateIncurred: new Date().toISOString().split('T')[0],
  category: 'Meals',
  description: '',
  merchant: '',
  amount: '',
  currency: 'GBP',
  vatAmount: '0',
});

export default function EditClaim() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();

  const [claim, setClaim] = useState<ExpenseClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Header editing state
  const [currency, setCurrency] = useState('GBP');
  const [employeeComment, setEmployeeComment] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());
  const [addingItem, setAddingItem] = useState(false);
  const [addItemError, setAddItemError] = useState('');

  // Receipt upload state: keyed by itemId
  const [uploadingReceipt, setUploadingReceipt] = useState<Record<string, boolean>>({});
  const [deletingItem, setDeletingItem] = useState<Record<string, boolean>>({});
  const [deletingReceipt, setDeletingReceipt] = useState<Record<string, boolean>>({});

  // Submit state
  const [submitting, setSubmitting] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadClaim = () => {
    if (!claimId) return;
    api.getClaim(claimId)
      .then((res) => {
        const c: ExpenseClaim = res.data;
        setClaim(c);
        setCurrency(c.currency);
        setEmployeeComment(c.employeeComment ?? '');
      })
      .catch(() => setError('Failed to load claim.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClaim();
  }, [claimId]);

  const fmt = (n: number, cur: string) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur }).format(n);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB');

  // ── Header Save ──────────────────────────────────────
  const handleSaveHeader = async () => {
    if (!claimId) return;
    setSavingHeader(true);
    setError('');
    try {
      await api.updateClaim(claimId, {
        currency,
        employeeComment: employeeComment || undefined,
      });
      setSuccessMsg('Claim details saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadClaim();
    } catch {
      setError('Failed to save claim details.');
    } finally {
      setSavingHeader(false);
    }
  };

  // ── Add Item ─────────────────────────────────────────
  const handleItemFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setItemForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!claimId) return;
    setAddItemError('');
    setAddingItem(true);
    try {
      await api.addItem(claimId, {
        dateIncurred: itemForm.dateIncurred,
        category: itemForm.category,
        description: itemForm.description,
        merchant: itemForm.merchant,
        amount: parseFloat(itemForm.amount),
        currency: itemForm.currency,
        vatAmount: parseFloat(itemForm.vatAmount) || 0,
      });
      setItemForm(emptyItemForm());
      setShowAddItem(false);
      loadClaim();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setAddItemError(msg || 'Failed to add item.');
    } finally {
      setAddingItem(false);
    }
  };

  // ── Delete Item ──────────────────────────────────────
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Delete this expense item?')) return;
    setDeletingItem((prev) => ({ ...prev, [itemId]: true }));
    try {
      await api.deleteItem(itemId);
      loadClaim();
    } catch {
      setError('Failed to delete item.');
    } finally {
      setDeletingItem((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // ── Upload Receipt ────────────────────────────────────
  const handleUploadReceipt = async (itemId: string, file: File) => {
    setUploadingReceipt((prev) => ({ ...prev, [itemId]: true }));
    setError('');
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      await api.uploadReceipt(itemId, formData);
      loadClaim();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to upload receipt.');
    } finally {
      setUploadingReceipt((prev) => ({ ...prev, [itemId]: false }));
      // Reset the file input
      if (fileInputRefs.current[itemId]) {
        fileInputRefs.current[itemId]!.value = '';
      }
    }
  };

  // ── Delete Receipt ────────────────────────────────────
  const handleDeleteReceipt = async (receiptId: string) => {
    if (!window.confirm('Remove this receipt?')) return;
    setDeletingReceipt((prev) => ({ ...prev, [receiptId]: true }));
    try {
      await api.deleteReceipt(receiptId);
      loadClaim();
    } catch {
      setError('Failed to delete receipt.');
    } finally {
      setDeletingReceipt((prev) => ({ ...prev, [receiptId]: false }));
    }
  };

  // ── Submit Claim ─────────────────────────────────────
  const canSubmit =
    claim &&
    claim.items.length > 0 &&
    claim.items.every((item) => item.receipts.length > 0);

  const handleSubmit = async () => {
    if (!claimId || !canSubmit) return;
    if (!window.confirm('Submit this claim for manager approval? You will not be able to edit it after submission.')) return;
    setSubmitting(true);
    setError('');
    try {
      await api.submitClaim(claimId);
      navigate(`/employee/claims/${claimId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to submit claim.');
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────
  if (loading) return <div className="loading">Loading claim…</div>;
  if (!claim) return <div className="alert alert-error">{error || 'Claim not found.'}</div>;

  const isEditable = claim.status === 'DRAFT' || claim.status === 'CHANGES_REQUESTED';
  if (!isEditable) {
    navigate(`/employee/claims/${claimId}`);
    return null;
  }

  return (
    <>
      {/* Page header */}
      <div className="top-bar">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {claim.status === 'CHANGES_REQUESTED' ? 'Edit Claim (Changes Requested)' : 'Edit Claim'}
          </h1>
          <span style={{ marginLeft: '0', marginTop: '6px', display: 'inline-block' }}>
            <StatusBadge status={claim.status} />
          </span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/employee/claims')}
        >
          ← Back to My Claims
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Changes requested alert */}
      {claim.status === 'CHANGES_REQUESTED' && claim.managerComment && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          <strong>Manager requested changes:</strong> {claim.managerComment}
        </div>
      )}

      {/* ── Claim Header Card ── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">Claim Details</div>
        <div className="form-row">
          <div className="form-group">
            <label>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Notes (optional)</label>
            <textarea
              value={employeeComment}
              onChange={(e) => setEmployeeComment(e.target.value)}
              rows={2}
              placeholder="e.g. Client visit, project code, trip purpose…"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleSaveHeader}
            disabled={savingHeader}
          >
            {savingHeader ? 'Saving…' : 'Save Details'}
          </button>
          <span className="text-muted">
            Total: <strong>{fmt(claim.totalAmount, claim.currency)}</strong>
          </span>
        </div>
      </div>

      {/* ── Expense Items ── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-title" style={{ margin: 0 }}>
            Expense Items ({claim.items.length})
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setShowAddItem(!showAddItem); setAddItemError(''); }}
          >
            {showAddItem ? '✕ Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* Add Item Form */}
        {showAddItem && (
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', color: '#1a4d1a' }}>
              New Expense Item
            </div>
            {addItemError && <div className="alert alert-error">{addItemError}</div>}
            <form onSubmit={handleAddItem}>
              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="dateIncurred"
                    value={itemForm.dateIncurred}
                    onChange={handleItemFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={itemForm.category}
                    onChange={handleItemFormChange}
                    required
                  >
                    {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Merchant *</label>
                  <input
                    type="text"
                    name="merchant"
                    value={itemForm.merchant}
                    onChange={handleItemFormChange}
                    placeholder="e.g. Tesco, Uber"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  name="description"
                  value={itemForm.description}
                  onChange={handleItemFormChange}
                  placeholder="Brief description of the expense"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={itemForm.amount}
                    onChange={handleItemFormChange}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Currency *</label>
                  <select
                    name="currency"
                    value={itemForm.currency}
                    onChange={handleItemFormChange}
                  >
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>VAT Amount</label>
                  <input
                    type="number"
                    name="vatAmount"
                    value={itemForm.vatAmount}
                    onChange={handleItemFormChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-success btn-sm" disabled={addingItem}>
                  {addingItem ? 'Adding…' : 'Add Item'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowAddItem(false); setItemForm(emptyItemForm()); setAddItemError(''); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Items List */}
        {claim.items.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="icon">🧾</div>
            <p>No items yet. Add your first expense item above.</p>
          </div>
        ) : (
          <div>
            {claim.items.map((item: ExpenseItem, idx: number) => (
              <div
                key={item.itemId}
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: idx < claim.items.length - 1 ? '12px' : '0',
                  background: item.receipts.length === 0 ? '#fffbf0' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{
                        background: '#e9ecef',
                        color: '#495057',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>
                        {item.category}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>{fmtDate(item.dateIncurred)}</span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>{item.merchant}</span>
                    </div>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{item.description}</div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#495057' }}>
                      <span className="amount">{fmt(item.amount, item.currency)}</span>
                      {item.vatAmount > 0 && (
                        <span style={{ color: '#6c757d' }}>VAT: {fmt(item.vatAmount, item.currency)}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Upload Receipt */}
                    <div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        ref={(el) => { fileInputRefs.current[item.itemId] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadReceipt(item.itemId, file);
                        }}
                      />
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={uploadingReceipt[item.itemId]}
                        onClick={() => fileInputRefs.current[item.itemId]?.click()}
                      >
                        {uploadingReceipt[item.itemId] ? 'Uploading…' : '+ Receipt'}
                      </button>
                    </div>

                    {/* Delete Item */}
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={deletingItem[item.itemId]}
                      onClick={() => handleDeleteItem(item.itemId)}
                    >
                      {deletingItem[item.itemId] ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>

                {/* Receipts */}
                <div style={{ marginTop: '10px' }}>
                  {item.receipts.length === 0 ? (
                    <div style={{
                      fontSize: '12px',
                      color: '#856404',
                      background: '#fff3cd',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      display: 'inline-block',
                    }}>
                      ⚠ No receipt attached — required before submission
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {item.receipts.map((receipt) => (
                        <div
                          key={receipt.receiptId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#d1e7dd',
                            color: '#0f5132',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <span>📎 {receipt.fileName}</span>
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#842029',
                              cursor: 'pointer',
                              padding: '0 2px',
                              fontSize: '13px',
                              lineHeight: 1,
                            }}
                            disabled={deletingReceipt[receipt.receiptId]}
                            onClick={() => handleDeleteReceipt(receipt.receiptId)}
                            title="Remove receipt"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Action Bar ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            {!canSubmit && claim.items.length > 0 && (
              <div className="alert alert-warning" style={{ margin: 0, fontSize: '12px' }}>
                All items must have at least one receipt before you can submit.
              </div>
            )}
            {claim.items.length === 0 && (
              <div className="alert alert-info" style={{ margin: 0, fontSize: '12px' }}>
                Add at least one expense item to submit this claim.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/employee/claims')}
            >
              Save as Draft
            </button>
            <button
              className="btn btn-success"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Submitting…' : 'Submit Claim →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
