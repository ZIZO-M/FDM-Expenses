import { db, newId, ClaimStatus } from '../lib/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

function withItems(claim: ReturnType<typeof db.claims.byId>) {
  if (!claim) return null;
  const items = db.items.byClaim(claim.claimId).map((item) => ({
    ...item,
    receipts: db.receipts.byItem(item.itemId),
  }));
  return { ...claim, items };
}

function fullClaim(claim: ReturnType<typeof db.claims.byId>) {
  if (!claim) return null;
  const items = db.items.byClaim(claim.claimId).map((item) => ({
    ...item,
    receipts: db.receipts.byItem(item.itemId),
  }));
  const decisions = db.decisions
    .byClaim(claim.claimId)
    .sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime())
    .map((d) => {
      const manager = db.employees.byId(d.managerId);
      return { ...d, manager: manager ? { fullName: manager.fullName } : null };
    });
  const auditLogs = db.auditlogs
    .byClaim(claim.claimId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return { ...claim, items, decisions, auditLogs };
}

// ── Employee claim operations ─────────────────────────────────────────────────

export async function getEmployeeClaims(employeeId: string) {
  return db.claims
    .byEmployee(employeeId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((claim) => withItems(claim));
}

export async function createClaim(
  employeeId: string,
  data: { currency?: string; employeeComment?: string }
) {
  // get employee
  const employee = db.employees.byId(employeeId);

  if (!employee) {
    throw new Error('Employee not found');
  }

  // block finance officers
  if (employee.role === 'FINANCE_OFFICER') {
    throw new Error('Finance officers are not allowed to create claims');
  }

  const claim = db.claims.insert({
    claimId: newId(),
    employeeId,
    status: 'DRAFT',
    totalAmount: 0,
    currency: data.currency || 'GBP',
    employeeComment: data.employeeComment ?? null,
    managerComment: null,
    financeComment: null,
    createdAt: new Date().toISOString(),
    submittedAt: null,
  });

  return claim;
}

export async function getClaimById(claimId: string, employeeId: string) {
  const claim = db.claims.byId(claimId);
  // get employee

  if (!claim || claim.employeeId !== employeeId) throw new Error('Claim not found');
  return fullClaim(claim);
}

export async function updateClaim(
  claimId: string,
  employeeId: string,
  data: { employeeComment?: string; currency?: string }
) {
  const claim = db.claims.byId(claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Claim not found');
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(claim.status)) {
    throw new Error('Cannot edit a claim in its current status');
  }
  return db.claims.update(claimId, {
    employeeComment: data.employeeComment ?? claim.employeeComment,
    currency: data.currency ?? claim.currency,
  });
}

export async function submitClaim(claimId: string, employeeId: string) {
  const claim = db.claims.byId(claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Claim not found');

  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(claim.status)) {
    throw new Error('Cannot submit a claim in its current status');
  }

  const items = db.items.byClaim(claimId);
  if (items.length === 0) {
    throw new Error('Claim must have at least one expense item before submission');
  }

  const itemWithoutReceipt = items.find(
    (item) => db.receipts.byItem(item.itemId).length === 0
  );
  if (itemWithoutReceipt) {
    throw new Error(`Expense item "${itemWithoutReceipt.description}" is missing a receipt`);
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const oldStatus = claim.status;

  // ✅ Update claim
  db.claims.update(claimId, {
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
    totalAmount: total,
  });

  // ✅ Audit log
  db.auditlogs.insert({
    logId: newId(),
    claimId,
    actorId: employeeId,
    action: 'SUBMITTED',
    oldStatus: oldStatus as ClaimStatus,
    newStatus: 'SUBMITTED',
    comment: null,
    timestamp: new Date().toISOString(),
  });

  // 🔔 NOTIFICATION LOGIC
  const employee = db.employees.byId(employeeId);
  if (!employee) return;

  const manager = employee.managerId
    ? db.employees.byId(employee.managerId)
    : null;

  if (manager) {
    // In-app notification
    db.notifications.insert({
      notificationId: newId(),
      recipientId: manager.employeeId,
      message: `New expense claim submitted by ${employee.fullName}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      claimId: claimId, // 👈 IMPORTANT
    });
   
  }
}

export async function withdrawClaim(claimId: string, employeeId: string) {
  const claim = db.claims.byId(claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Claim not found');
  if (!['SUBMITTED', 'CHANGES_REQUESTED', 'DRAFT'].includes(claim.status)) {
    throw new Error('Cannot withdraw a claim in its current status');
  }

  db.claims.update(claimId, { status: 'WITHDRAWN' });
  db.auditlogs.insert({
    logId: newId(),
    claimId,
    actorId: employeeId,
    action: 'WITHDRAWN',
    oldStatus: claim.status as ClaimStatus,
    newStatus: 'WITHDRAWN',
    comment: null,
    timestamp: new Date().toISOString(),
  });
}

export async function deleteClaim(claimId: string, employeeId: string) {
  const claim = db.claims.byId(claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Claim not found');
  if (claim.status !== 'DRAFT') throw new Error('Only draft claims can be deleted');

  // Cascade: delete receipts → items → claim
  db.items.byClaim(claimId).forEach((item) => db.receipts.deleteByItem(item.itemId));
  db.items.deleteByClaim(claimId);
  db.claims.delete(claimId);
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function addItem(
  claimId: string,
  employeeId: string,
  data: {
    dateIncurred: string;
    category: string;
    description: string;
    amount: number;
    currency?: string;
    vatAmount?: number;
    merchant: string;
  }
) {
  const claim = db.claims.byId(claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Claim not found');
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(claim.status)) {
    throw new Error('Cannot add items to a claim in its current status');
  }
  return db.items.insert({
    itemId: newId(),
    claimId,
    dateIncurred: data.dateIncurred,
    category: data.category,
    description: data.description,
    amount: Number(data.amount),
    currency: data.currency || 'GBP',
    vatAmount: Number(data.vatAmount || 0),
    merchant: data.merchant,
  });
}

export async function updateItem(
  itemId: string,
  employeeId: string,
  data: Partial<{
    dateIncurred: string;
    category: string;
    description: string;
    amount: number;
    currency: string;
    vatAmount: number;
    merchant: string;
  }>
) {
  const item = db.items.byId(itemId);
  if (!item) throw new Error('Item not found');
  const claim = db.claims.byId(item.claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Item not found');
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(claim.status)) {
    throw new Error('Cannot edit items in this claim status');
  }
  return db.items.update(itemId, {
    dateIncurred: data.dateIncurred ?? item.dateIncurred,
    category: data.category ?? item.category,
    description: data.description ?? item.description,
    amount: data.amount !== undefined ? Number(data.amount) : item.amount,
    currency: data.currency ?? item.currency,
    vatAmount: data.vatAmount !== undefined ? Number(data.vatAmount) : item.vatAmount,
    merchant: data.merchant ?? item.merchant,
  });
}

export async function deleteItem(itemId: string, employeeId: string) {
  const item = db.items.byId(itemId);
  if (!item) throw new Error('Item not found');
  const claim = db.claims.byId(item.claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Item not found');
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(claim.status)) {
    throw new Error('Cannot delete items in this claim status');
  }
  db.receipts.deleteByItem(itemId);
  db.items.delete(itemId);
}

// ── Receipts ──────────────────────────────────────────────────────────────────

export async function createReceipt(
  itemId: string,
  employeeId: string,
  file: Express.Multer.File,
  vatNumber?: string,
  totalOnReceipt?: number
) {
  const item = db.items.byId(itemId);
  if (!item) throw new Error('Item not found');
  const claim = db.claims.byId(item.claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Item not found');
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(claim.status)) {
    throw new Error('Cannot upload receipts in this claim status');
  }
  return db.receipts.insert({
    receiptId: newId(),
    itemId,
    fileName: file.originalname,
    fileType: file.mimetype,
    filePath: file.path,
    uploadDate: new Date().toISOString(),
    vatNumber: vatNumber ?? null,
    totalOnReceipt: totalOnReceipt ?? null,
  });
}

export async function deleteReceipt(receiptId: string, employeeId: string) {
  const receipt = db.receipts.byId(receiptId);
  if (!receipt) throw new Error('Receipt not found');
  const item = db.items.byId(receipt.itemId);
  if (!item) throw new Error('Receipt not found');
  const claim = db.claims.byId(item.claimId);
  if (!claim || claim.employeeId !== employeeId) throw new Error('Receipt not found');
  db.receipts.delete(receiptId);
}
