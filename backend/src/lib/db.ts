import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── Types ────────────────────────────────────────────────────────────────────

export type Role = 'EMPLOYEE' | 'LINE_MANAGER' | 'FINANCE_OFFICER';
export type ClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'WITHDRAWN';
export type DecisionType = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export interface Employee {
  employeeId: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: Role;
  costCentre: string;
  createdAt: string;
}

export interface ExpenseClaim {
  claimId: string;
  employeeId: string;
  status: ClaimStatus;
  totalAmount: number;
  currency: string;
  employeeComment: string | null;
  managerComment: string | null;
  financeComment: string | null;
  createdAt: string;
  submittedAt: string | null;
}

export interface ExpenseItem {
  itemId: string;
  claimId: string;
  dateIncurred: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  vatAmount: number;
  merchant: string;
}

export interface Receipt {
  receiptId: string;
  itemId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  uploadDate: string;
  vatNumber: string | null;
  totalOnReceipt: number | null;
}

export interface ApprovalDecision {
  decisionId: string;
  claimId: string;
  managerId: string;
  decisionType: DecisionType;
  decidedAt: string;
  comment: string | null;
}

export interface Reimbursement {
  reimbursementId: string;
  claimId: string;
  financeOfficerId: string;
  processedAt: string;
  paidAt: string;
  paymentReference: string | null;
  amountPaid: number;
  currency: string;
}

export interface AuditLog {
  logId: string;
  claimId: string;
  actorId: string;
  action: string;
  oldStatus: ClaimStatus | null;
  newStatus: ClaimStatus;
  comment: string | null;
  timestamp: string;
}

// ── File I/O ─────────────────────────────────────────────────────────────────

// Always resolved relative to the working directory (backend/) so it works
// both with ts-node-dev and compiled output.
const DATA_DIR = path.join(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function read<T>(file: string): T[] {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, '[]', 'utf-8');
    return [];
  }
  const raw = fs.readFileSync(fp, 'utf-8').trim();
  return raw ? (JSON.parse(raw) as T[]) : [];
}

function write<T>(file: string, data: T[]): void {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}

export const newId = (): string => crypto.randomUUID();

// ── Collections ───────────────────────────────────────────────────────────────

export const db = {
  employees: {
    all: () => read<Employee>('employees.txt'),
    byId: (id: string) => read<Employee>('employees.txt').find((e) => e.employeeId === id) ?? null,
    byEmail: (email: string) => read<Employee>('employees.txt').find((e) => e.email === email) ?? null,
    insert: (emp: Employee): Employee => {
      write('employees.txt', [...read<Employee>('employees.txt'), emp]);
      return emp;
    },
    upsert: (emp: Employee): Employee => {
      const list = read<Employee>('employees.txt').filter((e) => e.employeeId !== emp.employeeId);
      write('employees.txt', [...list, emp]);
      return emp;
    },
  },

  claims: {
    all: () => read<ExpenseClaim>('claims.txt'),
    byId: (id: string) => read<ExpenseClaim>('claims.txt').find((c) => c.claimId === id) ?? null,
    byEmployee: (employeeId: string) =>
      read<ExpenseClaim>('claims.txt').filter((c) => c.employeeId === employeeId),
    byStatus: (status: ClaimStatus) =>
      read<ExpenseClaim>('claims.txt').filter((c) => c.status === status),
    insert: (claim: ExpenseClaim): ExpenseClaim => {
      write('claims.txt', [...read<ExpenseClaim>('claims.txt'), claim]);
      return claim;
    },
    update: (claimId: string, patch: Partial<ExpenseClaim>): ExpenseClaim | null => {
      const list = read<ExpenseClaim>('claims.txt');
      const idx = list.findIndex((c) => c.claimId === claimId);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch };
      write('claims.txt', list);
      return list[idx];
    },
    delete: (claimId: string): void => {
      write(
        'claims.txt',
        read<ExpenseClaim>('claims.txt').filter((c) => c.claimId !== claimId)
      );
    },
  },

  items: {
    all: () => read<ExpenseItem>('items.txt'),
    byId: (id: string) => read<ExpenseItem>('items.txt').find((i) => i.itemId === id) ?? null,
    byClaim: (claimId: string) =>
      read<ExpenseItem>('items.txt').filter((i) => i.claimId === claimId),
    insert: (item: ExpenseItem): ExpenseItem => {
      write('items.txt', [...read<ExpenseItem>('items.txt'), item]);
      return item;
    },
    update: (itemId: string, patch: Partial<ExpenseItem>): ExpenseItem | null => {
      const list = read<ExpenseItem>('items.txt');
      const idx = list.findIndex((i) => i.itemId === itemId);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch };
      write('items.txt', list);
      return list[idx];
    },
    delete: (itemId: string): void => {
      write('items.txt', read<ExpenseItem>('items.txt').filter((i) => i.itemId !== itemId));
    },
    deleteByClaim: (claimId: string): void => {
      write('items.txt', read<ExpenseItem>('items.txt').filter((i) => i.claimId !== claimId));
    },
  },

  receipts: {
    all: () => read<Receipt>('receipts.txt'),
    byId: (id: string) => read<Receipt>('receipts.txt').find((r) => r.receiptId === id) ?? null,
    byItem: (itemId: string) =>
      read<Receipt>('receipts.txt').filter((r) => r.itemId === itemId),
    insert: (receipt: Receipt): Receipt => {
      write('receipts.txt', [...read<Receipt>('receipts.txt'), receipt]);
      return receipt;
    },
    delete: (receiptId: string): void => {
      write(
        'receipts.txt',
        read<Receipt>('receipts.txt').filter((r) => r.receiptId !== receiptId)
      );
    },
    deleteByItem: (itemId: string): void => {
      write('receipts.txt', read<Receipt>('receipts.txt').filter((r) => r.itemId !== itemId));
    },
  },

  decisions: {
    byClaim: (claimId: string) =>
      read<ApprovalDecision>('decisions.txt').filter((d) => d.claimId === claimId),
    insert: (dec: ApprovalDecision): ApprovalDecision => {
      write('decisions.txt', [...read<ApprovalDecision>('decisions.txt'), dec]);
      return dec;
    },
  },

  reimbursements: {
    byClaim: (claimId: string) =>
      read<Reimbursement>('reimbursements.txt').find((r) => r.claimId === claimId) ?? null,
    insert: (r: Reimbursement): Reimbursement => {
      write('reimbursements.txt', [...read<Reimbursement>('reimbursements.txt'), r]);
      return r;
    },
  },

  auditlogs: {
    byClaim: (claimId: string) =>
      read<AuditLog>('auditlogs.txt').filter((l) => l.claimId === claimId),
    insert: (log: AuditLog): AuditLog => {
      write('auditlogs.txt', [...read<AuditLog>('auditlogs.txt'), log]);
      return log;
    },
  },
};
