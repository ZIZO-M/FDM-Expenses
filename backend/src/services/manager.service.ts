import { db, newId } from '../lib/db';

function fullClaimForReview(claimId: string) {
  const claim = db.claims.byId(claimId);
  if (!claim) return null;
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
    auditLogs,
  };
}

export async function getPendingClaims(managerId: string) {
  return db.claims
    .byStatus('SUBMITTED')
    .filter((claim) => {
      const employee = db.employees.byId(claim.employeeId);
      return employee?.managerId === managerId;
    })
    .sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return aTime - bTime;
    })
    .map((claim) => {
      const employee = db.employees.byId(claim.employeeId);
      const items = db.items.byClaim(claim.claimId);

      return {
        ...claim,
        employee: employee
          ? {
              fullName: employee.fullName,
              email: employee.email,
              costCentre: employee.costCentre,
            }
          : null,
        items,
      };
    });
}

export async function getClaimForReview(claimId: string, managerId: string) {
  const claim = db.claims.byId(claimId);
  if (!claim) throw new Error('Claim not found');

  const employee = db.employees.byId(claim.employeeId);

  if (!employee || employee.managerId !== managerId) {
    throw new Error('Unauthorized');
  }

  const result = fullClaimForReview(claimId);
  return result;
}

export async function approveClaim(claimId: string, managerId: string, comment?: string) {
  const claim = db.claims.byId(claimId);
  if (!claim) throw new Error('Claim not found');

  const employee = db.employees.byId(claim.employeeId);
  if (!employee || employee.managerId !== managerId) {
    throw new Error('Unauthorized');
  }

  if (claim.status !== 'SUBMITTED') {
    throw new Error('Only submitted claims can be approved');
  }

  db.claims.update(claimId, { status: 'APPROVED', managerComment: comment ?? null });

  db.decisions.insert({
    decisionId: newId(),
    claimId,
    managerId,
    decisionType: 'APPROVED',
    decidedAt: new Date().toISOString(),
    comment: comment ?? null,
  });

  db.auditlogs.insert({
    logId: newId(),
    claimId,
    actorId: managerId,
    action: 'APPROVED',
    oldStatus: 'SUBMITTED',
    newStatus: 'APPROVED',
    comment: comment ?? null,
    timestamp: new Date().toISOString(),
  });


    db.notifications.insert({
      notificationId: newId(),
      recipientId: claim.employeeId, //employee gets notified
      message: `Your claim has been approved`,
      isRead: false,
      createdAt: new Date().toISOString(),
      claimId: claimId, // CRITICAL for frontend navigation
    });
}

export async function rejectClaim(claimId: string, managerId: string, comment: string) {
  const claim = db.claims.byId(claimId);
  if (!claim) throw new Error('Claim not found');
  if (claim.status !== 'SUBMITTED') throw new Error('Only submitted claims can be rejected');
  const employee = db.employees.byId(claim.employeeId);
  if (!employee || employee.managerId !== managerId) {
    throw new Error('Unauthorized');
  }

  db.claims.update(claimId, { status: 'REJECTED', managerComment: comment });
  db.decisions.insert({
    decisionId: newId(),
    claimId,
    managerId,
    decisionType: 'REJECTED',
    decidedAt: new Date().toISOString(),
    comment,
  });
  db.auditlogs.insert({
    logId: newId(),
    claimId,
    actorId: managerId,
    action: 'REJECTED',
    oldStatus: 'SUBMITTED',
    newStatus: 'REJECTED',
    comment,
    timestamp: new Date().toISOString(),
  });
}

export async function requestChanges(claimId: string, managerId: string, comment: string) {
  const claim = db.claims.byId(claimId);
  if (!claim) throw new Error('Claim not found');
  if (claim.status !== 'SUBMITTED') {
    throw new Error('Only submitted claims can be sent back for changes');
  }

  db.claims.update(claimId, { status: 'CHANGES_REQUESTED', managerComment: comment });
  db.decisions.insert({
    decisionId: newId(),
    claimId,
    managerId,
    decisionType: 'CHANGES_REQUESTED',
    decidedAt: new Date().toISOString(),
    comment,
  });
  db.auditlogs.insert({
    logId: newId(),
    claimId,
    actorId: managerId,
    action: 'CHANGES_REQUESTED',
    oldStatus: 'SUBMITTED',
    newStatus: 'CHANGES_REQUESTED',
    comment,
    timestamp: new Date().toISOString(),
  });
}
