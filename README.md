# 🏦 Digital Banking Account & Transaction Management System (P10)
> **Christ University • 5th Semester • CIA-3 Project Assessment**  
> **Course:** Advanced JavaScript Backend Frameworks (Node.js & Express.js)  
> **Domain:** Banking & Financial Technology (Core Banking Engine)  
> **Submission Document:** [P10_Team30_A_B.pdf](./P10_Team30_A_B.pdf)

---

## 👥 Student & Team Details
| # | Student Name | Register No. | Department | Section / Batch |
| :-: | :--- | :-: | :-: | :-: |
| **1** | **PRARTHANA GURURAJ KATTI** | `2460495` | B.Tech Computer Science & Engineering | **5 BTCS B** |
| **2** | **RIDHI M CHABBRIA** | `2460433` | B.Tech Computer Science & Engineering | **5 BTCS B** |
| **3** | **ROSHEL MARIYA RIJO** | `2460438` | B.Tech Computer Science & Engineering | **5 BTCS B** |
| **4** | **RICHARD RAJU** | `2460432` | B.Tech Computer Science & Engineering | **5 BTCS B** |

---

## 🏢 Business Overview & Problem Statement
Conventional core-banking systems frequently suffer from race conditions in balance modifications, lack of point-in-time auditability, and poor role segregation between retail customers and compliance officers.

The **Digital Banking Account & Transaction Management System (P10)** delivers a robust, high-performance financial engine engineered on **Node.js, Express.js, and MongoDB Atlas**:
- **Retail Customers:** Onboard with structured KYC (PAN, Aadhaar), open multi-tier accounts (Savings & Current), execute atomic inter-account fund transfers with daily limit guards, whitelist trusted beneficiaries, and review immutable double-entry ledger statements.
- **Bank Staff:** Review application queues, inspect customer KYC records, approve or reject account opening requests, enact regulatory freeze/unfreeze actions, and review Anti-Money Laundering (AML) high-value transactions.
- **Bank Administrators:** Monitor bank-wide liquidity reserves, oversee operational analytics, and trigger interest accrual batch jobs.

---

## 📑 Formal Submission Report
The comprehensive academic submission report containing system architecture, data models, state machines, API references, test edge cases, and all **20+ Postman & Frontend UI execution screenshots** is available directly in the repository:

👉 **[📄 Download / View P10_Team30_A_B.pdf](./P10_Team30_A_B.pdf)**

---

## 🚀 Key Functional Modules Checklist (All 13 Implemented & Verified)

| # | Required Module | Implementation Status | Core Endpoints & Description |
| :-: | :--- | :-: | :--- |
| **1** | **Customer Onboarding & KYC Capture** | ✅ Verified | `POST /api/auth/register`, `POST /api/auth/login`, `PUT /api/auth/kyc`<br>• Bcryptjs salted password hashing, JWT bearer authentication, structured KYC validation. |
| **2** | **Account Approval Workflow** | ✅ Verified | `GET /api/staff/pending-accounts`, `PUT /api/accounts/:id/approve`<br>• Staff approval queue; enforces initial deposit and transitions status from `PENDING_APPROVAL` to `ACTIVE`. |
| **3** | **Account Lifecycle Management** | ✅ Verified | `POST /api/accounts`, `GET /api/accounts`, `GET /api/accounts/:id`<br>• Supports Savings & Current accounts with independent balances and unique 10-digit account numbers. |
| **4** | **Beneficiary Management** | ✅ Verified | `POST /api/beneficiaries`, `GET /api/beneficiaries`, `DELETE /api/beneficiaries/:id`<br>• Whitelist trusted transfer recipients; compound unique index prevents duplicate entries. |
| **5** | **Atomic Fund Transfer Engine** | ✅ Verified | `POST /api/transactions/transfer`<br>• Atomic dual balance mutations (debit & credit), limit validation, and idempotency guarantees. |
| **6** | **Double-Entry Transaction Ledger** | ✅ Verified | `GET /api/accounts/:id/ledger`<br>• Append-only ledger recording point-in-time running `balanceAfter` on every credit/debit. |
| **7** | **Account Statement Generation** | ✅ Verified | `GET /api/accounts/:id/statement`<br>• Date-range filtering, aggregate credit/debit turnover calculations, and opening/closing balances. |
| **8** | **Minimum Balance & Limit Enforcement** | ✅ Verified | Enforced across all withdrawals and transfers:<br>• Savings: ₹1,000 min balance • Current: ₹5,000 min balance • Daily Transfer Limit: ₹1,00,000. |
| **9** | **AML & Suspicious Transaction Flagging** | ✅ Verified | `GET /api/staff/flagged-transactions`, `PUT /api/staff/flagged-transactions/:id/dismiss`<br>• Automatically flags transactions $\ge$ ₹50,000 into a compliance review queue. |
| **10** | **Account Freezing & Unfreezing** | ✅ Verified | `PUT /api/accounts/:id/freeze`, `PUT /api/accounts/:id/unfreeze`<br>• Staff security control; blocks debit transfers on frozen accounts and logs immutable audit trail. |
| **11** | **Periodic Interest Accrual System** | ✅ Verified | `POST /api/jobs/calculate-interest`<br>• Batch job calculating daily simple interest accrual on active Savings accounts ($4.0\%$ annual rate). |
| **12** | **Staff Operational Dashboard** | ✅ Verified | `GET /api/staff/dashboard`<br>• Aggregate metrics: Total customer deposits, pending approval counts, frozen accounts, and flagged volumes. |
| **13** | **Role-Based Access Control (RBAC)** | ✅ Verified | Multi-tier JWT authorization guards (`CUSTOMER`, `STAFF`, `ADMIN`) returning strict `403 Forbidden` on role violations. |

---

## 🛠️ Technology Stack Architecture

```
                                    +-----------------------------------------------+
                                    |    Client Tier (Web Portal / Hoppscotch)      |
                                    |  HTML5 • Vanilla CSS • Bootstrap 5 • EB Garamond|
                                    +-----------------------+-----------------------+
                                                            | HTTP / JSON (REST)
                                                            v
+-------------------------------------------------------------------------------------------------------------------+
| Node.js & Express.js Backend Server (MVC Architecture)                                                            |
|                                                                                                                   |
|  [Middleware Pipeline]                                                                                            |
|   ├── CORS & express.json() Body Parser                                                                          |
|   ├── Morgan HTTP Request Logger                                                                                  |
|   ├── JWT Authentication Guard (middleware/auth.js) -> verifies Bearer token & attaches req.user                  |
|   ├── RBAC Authorization Guard (authorize('STAFF', 'ADMIN')) -> enforces role boundaries                         |
|   └── Input Validator (middleware/validate.js) -> enforces schemas, data types & limits                         |
|                                                                                                                   |
|  [Controllers & Core Business Logic]                                                                              |
|   ├── authController.js     ──► Registration, JWT generation, KYC update                                          |
|   ├── accountController.js  ──► Account application, approval, freeze/unfreeze, audit trail                      |
|   ├── transactionController ──► Atomic fund transfer engine, ledger recording, statements, AML flagging           |
|   └── jobController.js      ──► Interest calculation batch job                                                    |
+----------------------------------------------------+--------------------------------------------------------------+
                                                     | Mongoose ODM (v8.3)
                                                     v
                                    +-----------------------------------------------+
                                    |       MongoDB Atlas Cloud Database            |
                                    |  Collections: users, accounts, beneficiaries, |
                                    |  transactions (ledger), approvals (audit)     |
                                    +-----------------------------------------------+
```

---

## 🗄️ Database Design & Schema Rationale

### 1. Referencing vs. Embedding Decisions
- **`kycDetails` (Embedded in `users`):** Embedded because KYC is a 1-to-1 relationship with customer identity and is consistently accessed during login and profile queries.
- **`accounts` (Referenced to `users`):** Referenced via `userId` because customers can own multiple accounts (Savings & Current) with independent balances and lifecycles.
- **`transactions` (Referenced & Immutable):** Stored in a separate append-only collection to prevent document bloat and avoid MongoDB's 16MB BSON limit.
- **`beneficiaries` (Referenced):** Saved separately with a compound unique index `{ userId: 1, beneficiaryAccountNumber: 1 }` to prevent duplicate counterparty additions.
- **`approvals` (Referenced):** Maintains an audit log linking `accountId` and `staffId` with decision timestamps and reasons.

### 2. High-Performance Indexes
```javascript
// users collection
db.users.createIndex({ email: 1 }, { unique: true });

// accounts collection
db.accounts.createIndex({ accountNumber: 1 }, { unique: true });
db.accounts.createIndex({ userId: 1 });
db.accounts.createIndex({ status: 1 });

// beneficiaries collection
db.beneficiaries.createIndex({ userId: 1, beneficiaryAccountNumber: 1 }, { unique: true });

// transactions collection (ledger)
db.transactions.createIndex({ accountId: 1, createdAt: -1 });
db.transactions.createIndex({ flagged: 1 });
```

---

## ⚡ Setup & Run Instructions

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MongoDB:** MongoDB Atlas connection string or local MongoDB instance

### 2. Clone Repository
```bash
git clone https://github.com/RichardRajuChirayath/L-T-5th-sem-Digital-_Banking-_Account_P10.git
cd L-T-5th-sem-Digital-_Banking-_Account_P10
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Variables Configuration
Create a `.env` file in the root directory (or copy from `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.hp0qjmx.mongodb.net/digital_banking_db?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_digital_banking_key_2026_secure
JWT_EXPIRES_IN=7d

MIN_BALANCE_SAVINGS=1000
MIN_BALANCE_CURRENT=5000
DAILY_TRANSFER_LIMIT=100000
FLAGGED_TRANSACTION_THRESHOLD=50000
SAVINGS_INTEREST_RATE_ANNUAL=4.0
```

### 5. Seed Demonstration Database
Populate pre-configured test users, accounts, and ledger history:
```bash
npm run seed
```

### 6. Start Application Server
```bash
npm start
```
The server will initialize on `http://localhost:5000` with the web portal and REST API endpoints accessible.

---

## 👥 Demo Pre-Seeded Credentials for Viva & Evaluation

| Role | Name | Email | Password | Pre-configured Accounts & Status |
| :--- | :--- | :--- | :--- | :--- |
| **Bank Admin** | Executive Admin | `admin@digitalbank.com` | `Password@123` | System oversight & batch job trigger |
| **Bank Staff** | Sarah Staff | `staff@digitalbank.com` | `Password@123` | Approval queue & flagged transaction reviewer |
| **Customer 1** | Alice Sharma | `alice@customer.com` | `Password@123` | **Savings:** `1008001001` (Active)<br>**Current:** `1008001002` (Active) |
| **Customer 2** | Bob Patel | `bob@customer.com` | `Password@123` | **Savings:** `1008002001` (Active)<br>**Current:** `1008002002` (**Frozen**) |
| **Customer 3** | Charlie Verma | `charlie@customer.com` | `Password@123` | **Savings:** `1008003001` (**Pending Approval**) |

---

## 📡 Complete REST API Endpoint Directory

### Authentication & KYC
- `POST /api/auth/register` — Register customer with personal details & KYC credentials
- `POST /api/auth/login` — Authenticate user and issue signed JWT token
- `GET /api/auth/me` — Fetch currently authenticated user profile
- `PUT /api/auth/kyc` — Update PAN, Aadhaar, address, and annual income

### Account Management
- `POST /api/accounts` — Apply for a new Savings or Current account
- `GET /api/accounts` — List user's accounts (Staff/Admin retrieves all accounts)
- `GET /api/accounts/:id` — Retrieve detailed single account profile
- `PUT /api/accounts/:id/freeze` — Staff freezes an account under compliance review
- `PUT /api/accounts/:id/unfreeze` — Staff restores account to active state

### Staff Operations & Compliance
- `GET /api/staff/pending-accounts` — View queue of accounts awaiting approval
- `PUT /api/accounts/:id/approve` — Approve account and credit initial deposit
- `PUT /api/accounts/:id/reject` — Reject account application with remarks
- `GET /api/staff/audit-trail/:accountId` — Retrieve full lifecycle decision history
- `GET /api/staff/dashboard` — Bank-wide aggregated metrics & liquidity totals
- `GET /api/staff/flagged-transactions` — List AML flagged transfers ($\ge$ ₹50,000)
- `PUT /api/staff/flagged-transactions/:id/dismiss` — Resolve flagged transaction after review

### Beneficiary Management
- `POST /api/beneficiaries` — Add trusted counterparty recipient
- `GET /api/beneficiaries` — List customer's saved beneficiaries
- `DELETE /api/beneficiaries/:id` — Remove saved beneficiary

### Fund Transfers & Immutable Ledger
- `POST /api/transactions/transfer` — Execute atomic fund transfer between accounts
- `POST /api/transactions/deposit` — Deposit funds into active account
- `POST /api/transactions/withdraw` — Withdraw funds subject to minimum balance
- `GET /api/accounts/:id/ledger` — Fetch immutable ledger with running `balanceAfter`
- `GET /api/accounts/:id/statement` — Generate point-in-time statement with date filters

### Batch Processing Jobs
- `POST /api/jobs/calculate-interest` — Trigger daily interest accrual batch calculation

---

## 🎨 Frontend Portal Showcase
The web application features an elegant **Cream & Champagne Gold** aesthetic with **EB Garamond** typography:
1. **Landing & Authentication Portal:** Role selector modal and interactive login.
2. **Customer Banking Console:** Live account summary cards, transfer modal with beneficiary selector, and real-time transaction ledger.
3. **Staff Operations Center:** Pending account approval queue, audit logs, and AML compliance monitor.

---

## 🧪 Automated Testing & Postman Collection
- **Automated API Test Suite:** Run `node test-api.js` to execute automated assertions covering all 13 modules and negative edge cases.
- **Postman Collection:** Import [`postman_collection.json`](./postman_collection.json) to execute pre-configured requests organized by module with environment variables and Bearer tokens.

---

## ⚖️ Academic License & Evaluation
Developed for **Christ University School of Sciences, Department of Computer Science (5th Semester • CIA-3 Assessment)**.  
All rights reserved © 2026.
