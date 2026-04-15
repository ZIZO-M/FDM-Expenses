import { db, newId } from '../lib/db';

export async function getApprovedClaims() {
  return db.claims
    .byStatus('APPROVED')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((claim) => {
      const employee = db.employees.byId(claim.employeeId);
      const items = db.items.byClaim(claim.claimId);
      return {
        ...claim,
        employee: employee
          ? { fullName: employee.fullName, email: employee.email, costCentre: employee.costCentre }
          : null,
        items,
      };
    });
}

export async function getClaimForProcessing(claimId: string) {
  const claim = db.claims.byId(claimId);
  if (!claim) throw new Error('Claim not found');

  const employee = db.employees.byId(claim.employeeId);
  const items = db.items.byClaim(claimId).map((item) => ({
    ...item,
    receipts: db.receipts.byItem(item.itemId),
  }));
  const decisions = db.decisions
    .byClaim(claimId)
    .sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime())
    .map((d) => {
      const manager = db.employees.byId(d.managerId);
      return { ...d, manager: manager ? { fullName: manager.fullName } : null };
    });
  const reimbursement = db.reimbursements.byClaim(claimId);
  const auditLogs = db.auditlogs
    .byClaim(claimId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    ...claim,
    employee: employee
      ? { fullName: employee.fullName, email: employee.email, costCentre: employee.costCentre }
      : null,
    items,
    decisions,
    reimbursement,
    auditLogs,
  };
}

export async function processReimbursement(
  claimId: string,
  financeOfficerId: string,
  data: { paymentReference?: string; financeComment?: string }
) {
  const claim = db.claims.byId(claimId);
  if (!claim) throw new Error('Claim not found');
  if (claim.status !== 'APPROVED') {
    throw new Error('Only approved claims can be processed for reimbursement');
  }

  const now = new Date().toISOString();
  db.reimbursements.insert({
    reimbursementId: newId(),
    claimId,
    financeOfficerId,
    processedAt: now,
    paidAt: now,
    paymentReference: data.paymentReference ?? null,
    amountPaid: claim.totalAmount,
    currency: claim.currency,
  });
  db.claims.update(claimId, {
    status: 'PAID',
    financeComment: data.financeComment ?? null,
  });
  db.auditlogs.insert({
    logId: newId(),
    claimId,
    actorId: financeOfficerId,
    action: 'PAID',
    oldStatus: 'APPROVED',
    newStatus: 'PAID',
    comment: data.financeComment ?? null,
    timestamp: now,
  });
}
