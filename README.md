# FDM Expenses App

A full-stack expense management system for FDM Group employees to submit, review, and process expense claims.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (8h expiry) |
| File uploads | Multer (local, `backend/uploads/`) |

---

## Project Structure

```
FDM/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Data model
│   │   └── seed.ts           # Demo users
│   ├── src/
│   │   ├── controllers/      # HTTP handlers
│   │   ├── services/         # Business logic
│   │   ├── routes/           # Express routers
│   │   ├── middleware/       # Auth, error handler
│   │   ├── utils/            # JWT helpers
│   │   ├── lib/prisma.ts     # Prisma client singleton
│   │   └── index.ts          # App entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── auth/         # Login
    │   │   ├── employee/     # MyClaims, NewClaim, EditClaim, ClaimDetails
    │   │   ├── manager/      # PendingClaims, ClaimReview
    │   │   └── finance/      # ApprovedClaims, ReimbursementProcessing
    │   ├── components/       # Layout, StatusBadge, ProtectedRoute
    │   ├── contexts/         # AuthContext
    │   ├── services/api.ts   # Axios API layer
    │   ├── types/index.ts    # TypeScript interfaces
    │   └── App.tsx           # Router
    ├── package.json
    └── vite.config.ts
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (default port 5432)

---

### 1. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE fdm_expenses;
```

---

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

# Push schema to database
npm run db:push

# Seed demo users
npm run db:seed

# Start dev server (port 5000)
npm run dev
```

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev
```

Open **http://localhost:3000**

---

## Demo Accounts

All accounts use password: **`password123`**

| Role | Email |
|------|-------|
| Employee | employee@fdm.com |
| Line Manager | manager@fdm.com |
| Finance Officer | finance@fdm.com |

---

## API Routes

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |

### Claims (Employee)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/claims` | Get my claims |
| POST | `/api/claims` | Create draft |
| GET | `/api/claims/:id` | Get claim detail |
| PUT | `/api/claims/:id` | Update draft |
| DELETE | `/api/claims/:id` | Delete draft |
| POST | `/api/claims/:id/submit` | Submit claim |
| POST | `/api/claims/:id/withdraw` | Withdraw claim |
| POST | `/api/claims/:id/items` | Add expense item |
| PUT | `/api/claims/items/:id` | Update item |
| DELETE | `/api/claims/items/:id` | Delete item |
| POST | `/api/claims/items/:id/receipts` | Upload receipt |
| DELETE | `/api/claims/receipts/:id` | Delete receipt |

### Manager
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/manager/claims` | Pending (submitted) claims |
| GET | `/api/manager/claims/:id` | Claim detail |
| POST | `/api/manager/claims/:id/approve` | Approve |
| POST | `/api/manager/claims/:id/reject` | Reject (comment required) |
| POST | `/api/manager/claims/:id/request-changes` | Request changes (comment required) |

### Finance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/finance/claims` | Approved claims |
| GET | `/api/finance/claims/:id` | Claim detail |
| POST | `/api/finance/claims/:id/reimburse` | Process reimbursement |

---

## Claim Lifecycle

```
DRAFT → SUBMITTED → APPROVED → PAID
           ↓              ↑
     CHANGES_REQUESTED ───┘
           ↓
        REJECTED
           
Any pre-approval state → WITHDRAWN
```

---

## Business Rules

- A claim must have at least one expense item to be submitted
- Every expense item must have at least one receipt before submission
- Only `SUBMITTED` claims can be approved, rejected, or sent back for changes
- Only `APPROVED` claims can be processed by Finance
- Claims can only be withdrawn before approval
- Employees can only view and manage their own claims

---

## Environment Variables

```env
# backend/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/fdm_expenses"
JWT_SECRET="change-this-to-a-long-random-string"
PORT=5001
FRONTEND_URL="http://localhost:3000"
```
## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) running locally

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/ZIZO-M/FDM-Expenses.git
   cd FDM-Expenses
```

2. **Set up the backend**
```bash
   cd backend
   npm install
```
   Create a `.env` file in the `backend/` folder:
```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/fdm_expenses"
   JWT_SECRET="change-this-to-a-long-random-string"
   PORT=5001
   FRONTEND_URL="http://localhost:3000"
```

3. **Set up the frontend**
```bash
   cd ../frontend
   npm install
```

4. **Run the app**

   In one terminal (backend):
```bash
   cd backend
   npm run dev
```
   In another terminal (frontend):
```bash
   cd frontend
   npm run dev
```

5. **Open your browser**
```
   http://localhost:3000
```