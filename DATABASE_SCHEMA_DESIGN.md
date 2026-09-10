# Database Schema Design & Data Modeling Specification
**Project:** P10 — Digital Banking Account Management Platform (Apex Digital Bank)  
**Deliverable:** Database Schema Design & Entity-Relationship Specification (Member 4 Ownership)  
**Database Technology:** MongoDB Atlas Cloud Database with Mongoose ODM (v8.3)

---

## 1. Executive Summary & Architecture
The Apex Digital Bank database is structured to balance strict ACID consistency for financial ledger transactions with rapid query latency for real-time customer and staff operations. Data modeling uses MongoDB document schemas through Mongoose ODM, strictly separating volatile mutable account state from immutable audit and ledger streams.

---

## 2. Entity-Relationship (ER) Architecture Diagram

```
                 ┌──────────────────────────────┐
                 │          users               │
                 ├──────────────────────────────┤
                 │ _id (ObjectId)               │
                 │ email (String, Unique)       │
                 │ password (Hash, Select:false)│
                 │ role (CUSTOMER|STAFF|ADMIN)  │
                 │ kycStatus (PENDING|VERIFIED) │
                 │ kycDetails (Embedded 1:1)    │
                 │ createdAt, updatedAt         │
                 └──────────────┬───────────────┘
                                │
                  1:N (userId)  │  1:N (userId)
         ┌──────────────────────┴──────────────────────┐
         ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│          accounts            │              │        beneficiaries         │
├──────────────────────────────┤              ├──────────────────────────────┤
│ _id (ObjectId)               │              │ _id (ObjectId)               │
│ userId (Ref -> users._id)    │              │ userId (Ref -> users._id)    │
│ accountNumber (String, 10-d) │              │ sourceAccountId (Ref->account│
│ type (SAVINGS | CURRENT)     │              │ beneficiaryAccountNumber (Str│
│ balance (Number, >= 0)       │              │ beneficiaryName (String)     │
│ status (ACTIVE|FROZEN|PENDING│              │ bankName, ifscCode           │
│ dailyTransferLimit (Number)  │              │ nickname (String)            │
│ interestEarnedTotal (Number) │              │ createdAt, updatedAt         │
│ createdAt, updatedAt         │              └──────────────────────────────┘
└──────────────┬───────────────┘               * Compound Unique: {userId,
               │                                                  beneficiaryAccountNumber}
 1:N (accountId│ 1:N (accountId)
       ┌───────┴───────┐
       ▼               ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│        transactions          │              │          approvals           │
├──────────────────────────────┤              ├──────────────────────────────┤
│ _id (ObjectId)               │              │ _id (ObjectId)               │
│ accountId (Ref -> accounts)  │              │ accountId (Ref -> accounts)  │
│ type (DEBIT | CREDIT)        │              │ staffId (Ref -> users._id)   │
│ amount (Number, > 0)         │              │ decision (APPROVED|REJECTED) │
│ balanceAfter (Number)        │              │ remarks (String)             │
│ description (String)         │              │ previousStatus (String)      │
│ referenceNumber (UUIDv4)     │              │ newStatus (String)           │
│ flagged (Boolean, AML guard) │              │ createdAt, updatedAt         │
│ counterpartyAccount (String) │              └──────────────────────────────┘
│ createdAt (Immutable)        │
└──────────────────────────────┘
```

---

## 3. Detailed Data Dictionary

### 3.1 `users` Collection (`models/User.js`)
Stores authentication credentials, authorization roles, and customer identity verification data.

| Field Name | Data Type | Constraints / Options | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key, Auto-generated | Unique identifier for the user |
| `name` | String | Required, Trimmed | Full legal name of customer or staff member |
| `email` | String | Required, Unique, Lowercase, Trimmed | Login identifier with strict RFC-compliant regex |
| `password` | String | Required, Min length 6, `select: false` | Passwords hashed using bcrypt salt rounds (10) |
| `role` | String | Enum: `['CUSTOMER', 'STAFF', 'ADMIN']`, Default: `CUSTOMER` | Role-Based Access Control (RBAC) token claim |
| `kycStatus` | String | Enum: `['PENDING', 'VERIFIED', 'REJECTED']`, Default: `PENDING` | Customer KYC verification status |
| `kycDetails` | Subdocument | Embedded schema | 1-to-1 customer compliance document payload |
| `kycDetails.panNumber` | String | Uppercase, Matches `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` | Indian Income Tax PAN identifier |
| `kycDetails.aadhaarNumber`| String | Matches `^[0-9]{12}$` | 12-digit national Aadhaar identifier |
| `kycDetails.address` | String | Required if KYC submitted | Residential address for compliance records |
| `kycDetails.annualIncome` | Number | Non-negative numeric | Financial profiling for daily limits |
| `createdAt` | Date | Auto-timestamp | Account registration timestamp |
| `updatedAt` | Date | Auto-timestamp | Last profile/KYC update timestamp |

### 3.2 `accounts` Collection (`models/Account.js`)
Represents savings and current deposit accounts maintained by customers.

| Field Name | Data Type | Constraints / Options | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique account entity ID |
| `userId` | ObjectId | Required, Ref: `User`, Indexed | Owner reference linking to the `users` collection |
| `accountNumber` | String | Required, Unique, Length: 10, Indexed | Randomly generated 10-digit numeric banking routing number |
| `type` | String | Enum: `['SAVINGS', 'CURRENT']`, Required | Account product type governing minimum balances |
| `balance` | Number | Required, Default: 0, Min: 0 | Current ledger balance in INR |
| `status` | String | Enum: `['PENDING_APPROVAL', 'ACTIVE', 'FROZEN', 'CLOSED']` | Current operational state of the account |
| `dailyTransferLimit` | Number | Default: 100,000 | Daily cumulative debit ceiling for AML control |
| `interestEarnedTotal` | Number | Default: 0 | Cumulative interest paid to savings account |
| `lastInterestCalculated`| Date | Optional | Timestamp of last interest calculation run |
| `createdAt` | Date | Auto-timestamp | Application submission timestamp |
| `updatedAt` | Date | Auto-timestamp | Last state transition or balance mutation |

### 3.3 `transactions` Collection (`models/Transaction.js`)
Immutable, append-only double-entry financial ledger recording all credits, debits, and transfers.

| Field Name | Data Type | Constraints / Options | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Ledger entry identifier |
| `accountId` | ObjectId | Required, Ref: `Account`, Indexed | Target account for the ledger posting |
| `type` | String | Enum: `['DEBIT', 'CREDIT']`, Required | Transaction direction |
| `amount` | Number | Required, Min: 1 | Transaction amount in INR |
| `balanceAfter` | Number | Required | Running post-transaction balance snapshot |
| `description` | String | Required, Max length 255 | Audit narrative / remarks for statement |
| `referenceNumber` | String | Required, Unique, Indexed, Default: UUID | Bank reference number for counterparty tracking |
| `flagged` | Boolean | Default: `false`, Indexed | AML compliance flag (auto-set if amount >= threshold) |
| `flagReason` | String | Optional | Regulatory reason for suspicious activity flag |
| `counterpartyAccount` | String | Optional | Inter-account source/destination account number |
| `createdAt` | Date | Auto-timestamp, Immutable | Transaction settlement time |

### 3.4 `beneficiaries` Collection (`models/Beneficiary.js`)
Customer payee whitelist enabling intra-bank and inter-bank fund transfers.

| Field Name | Data Type | Constraints / Options | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Beneficiary record identifier |
| `userId` | ObjectId | Required, Ref: `User`, Indexed | Owner customer profile |
| `sourceAccountId` | ObjectId | Required, Ref: `Account` | Linked account authorized for quick transfers |
| `beneficiaryAccountNumber` | String | Required, Length: 10 | Target account number |
| `beneficiaryName` | String | Required, Trimmed | Counterparty legal account holder name |
| `bankName` | String | Default: `'Apex Digital Bank'` | Bank institution name |
| `ifscCode` | String | Default: `'APEX0001030'` | Branch routing code |
| `nickname` | String | Optional, Trimmed | Personalized alias for customer dashboard |
| `createdAt` | Date | Auto-timestamp | Date beneficiary was whitelisted |

### 3.5 `approvals` Collection (`models/Approval.js`)
Regulatory and internal compliance audit trail capturing all staff administrative actions.

| Field Name | Data Type | Constraints / Options | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Approval log entry ID |
| `accountId` | ObjectId | Required, Ref: `Account`, Indexed | Subject bank account |
| `staffId` | ObjectId | Required, Ref: `User`, Indexed | Staff / Officer user who performed the action |
| `decision` | String | Enum: `['APPROVED', 'REJECTED', 'FROZEN', 'UNFROZEN']` | Administrative compliance action taken |
| `remarks` | String | Required, Min: 5, Max: 500 | Regulatory justification / compliance remarks |
| `previousStatus` | String | Required | State of account prior to decision |
| `newStatus` | String | Required | State of account post-decision |
| `createdAt` | Date | Auto-timestamp | Exact execution timestamp |

---

## 4. Modeling Decisions: Embedding vs. Referencing Rationale

| Relationship | Strategy | Architecture Rationale |
| :--- | :--- | :--- |
| **`users` ── `kycDetails`** | **Embedded** | KYC verification is strictly 1-to-1 with a customer identity. Embedding eliminates `$lookup` overhead during authentication, keeps identity records self-contained, and has a bounded size (< 1 KB). |
| **`users` ── `accounts`** | **Referenced** | A single customer can own multiple accounts (Savings, Current) over their lifetime. Referenced design allows independent account status transitions (e.g., freezing one account while another remains active) without modifying the user document. |
| **`accounts` ── `transactions`** | **Referenced (Append-only)** | Financial accounts accumulate thousands of transactions. Embedding transaction arrays inside accounts would violate MongoDB's **16MB document size limit** and cause severe document relocation overhead. Referenced immutable documents provide infinite scalability and strict ledger integrity. |
| **`users` ── `beneficiaries`** | **Referenced** | Customers add multiple counterparties. Separating into an independent collection enables compound unique indexing across `{ userId: 1, beneficiaryAccountNumber: 1 }` to prevent duplicate payee additions. |
| **`accounts` ── `approvals`** | **Referenced** | Audit logs must remain permanent even if account metadata changes. Storing approvals independently guarantees tamper-resistant compliance auditability for banking regulators. |

---

## 5. High-Performance Indexing Strategy

```javascript
// 1. users Collection
db.users.createIndex({ email: 1 }, { unique: true });

// 2. accounts Collection
db.accounts.createIndex({ accountNumber: 1 }, { unique: true });
db.accounts.createIndex({ userId: 1 });
db.accounts.createIndex({ status: 1 });

// 3. beneficiaries Collection
db.beneficiaries.createIndex(
  { userId: 1, beneficiaryAccountNumber: 1 },
  { unique: true }
);

// 4. transactions Collection
db.transactions.createIndex({ accountId: 1, createdAt: -1 });
db.transactions.createIndex({ referenceNumber: 1 }, { unique: true });
db.transactions.createIndex({ flagged: 1 });

// 5. approvals Collection
db.approvals.createIndex({ accountId: 1, createdAt: -1 });
db.approvals.createIndex({ staffId: 1 });
```

---

## 6. Schema Validation & Integrity Enforcement
1. **Bcrypt Password Hook:** Pre-save Mongoose hook on `User` automatically hashes passwords using bcrypt with work factor 10.
2. **Account Number Generation:** 10-digit cryptographically random account numbers with duplicate retry checks.
3. **Atomic Balance Checks:** All debit operations verify that `(balance - amount) >= MIN_BALANCE` prior to transaction settlement.
4. **Automated AML Flagging:** Any transaction exceeding `FLAGGED_TRANSACTION_THRESHOLD` (₹50,000) automatically sets `flagged: true` for staff review.
