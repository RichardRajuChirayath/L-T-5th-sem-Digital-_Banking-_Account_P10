# Postman Testing Guide & Verification Checklist
**Digital Banking Account & Transaction Management System (P10)**  
**Assessment: 5th Semester • Christ University • CIA-3 Project Development**

---

## 🚀 How to Import & Run in Postman

1. Open **Postman**.
2. Click the **Import** button in the top left workspace corner.
3. Drag and drop or choose file:
   ```
   d:\L&T_Node.js & Express JS_Project_P10\postman_collection.json
   ```
4. Confirm import as a **Collection**.
5. Ensure your local server is running:
   ```bash
   npm start
   # Server active on http://localhost:5000
   ```
6. Click on the collection name and select **Run Collection** (or test requests sequentially from Phase 1 to Phase 6).

---

## 📋 Evaluation Checklist Coverage in Postman

This collection is structured into 6 phases covering **100% of the Postman Testing Checklist** specified in the instructions:

| Test Checklist Requirement | Request in Collection | Method & URL | Expected Status |
|---|---|---|---|
| **Happy Path (Create Resource)** | `1.1 Customer Registration` | `POST /api/auth/register` | `201 Created` |
| **Authentication Flow (JWT)** | `1.2 Customer Login` | `POST /api/auth/login` | `200 OK` (Stores token) |
| **Staff Auth & Escalation** | `1.3 Bank Staff Login` | `POST /api/auth/login` | `200 OK` (Stores staffToken) |
| **Core Account Application** | `2.1 Apply for New Savings Account` | `POST /api/accounts` | `201 Created` (`PENDING_APPROVAL`) |
| **Workflow Decision (Staff Approve)**| `2.4 Staff Approves Account` | `PUT /api/accounts/:id/approve` | `200 OK` (`Approved`) |
| **Compliance Audit Record** | `2.5 View Account Audit Trail` | `GET /api/staff/audit-trail/:id` | `200 OK` |
| **Beneficiary Management** | `3.1 Add Trusted Beneficiary` | `POST /api/beneficiaries` | `201 Created` |
| **Atomic Fund Transfer** | `4.1 Transfer Funds (Normal)` | `POST /api/transactions/transfer` | `201 Created` |
| **Suspicious AML Flagging** | `4.2 High-Value Transfer (> ₹50,000)`| `POST /api/transactions/transfer` | `201 Created` (`flagged: true`) |
| **Immutable Ledger with Balance** | `4.3 Account Ledger` | `GET /api/accounts/:id/ledger` | `200 OK` (`balanceAfter`) |
| **Date-Range Statement** | `4.4 Account Statement Generation` | `GET /api/accounts/:id/statement` | `200 OK` (Summary metrics) |
| **Account Freeze Workflow** | `5.1 Staff Freeze Account` | `PUT /api/accounts/:id/freeze` | `200 OK` (`FROZEN`) |
| **Account Unfreeze Workflow** | `5.2 Staff Unfreeze Account` | `PUT /api/accounts/:id/unfreeze` | `200 OK` (`ACTIVE`) |
| **Staff Monitoring Dashboard** | `5.4 Staff Dashboard Metrics` | `GET /api/staff/dashboard` | `200 OK` |
| **Interest Calculation Job** | `5.5 Interest Batch Calculation` | `POST /api/jobs/calculate-interest`| `200 OK` |
| **Validation Failure** | `6.1 Missing Required Field` | `POST /api/auth/register` | `400 Bad Request` |
| **Authentication Failure** | `6.2 Missing Token on Protected Route`| `GET /api/accounts` | `401 Unauthorized` |
| **Authorization Failure (RBAC)** | `6.3 Customer calling Staff Route`| `GET /api/staff/dashboard` | `403 Forbidden` |
| **Business Rule: Minimum Balance**| `6.4 Overdraft below ₹1,000` | `POST /api/transactions/transfer` | `400 Bad Request` |
| **Business Rule: Frozen Account** | `6.5 Transfer from Frozen Account`| `POST /api/transactions/transfer` | `403 Forbidden` |
| **Not-Found Case** | `6.6 Non-existent Account ID` | `GET /api/accounts/:invalidId` | `404 Not Found` |

---

## 💡 Automated Tests & Dynamic Scripting
- Every request includes automated Postman test scripts verifying:
  - Exact HTTP status codes.
  - JSON response schemas (`success`, `message`, `data`, `errorCode`).
  - Automatic collection variable setting (`customerToken`, `staffToken`, `adminToken`, `newApplicantAccountId`, `aliceAccountId`).
- You can run the entire collection in Postman with **one click via Postman Collection Runner** and observe all test assertions passing green!
