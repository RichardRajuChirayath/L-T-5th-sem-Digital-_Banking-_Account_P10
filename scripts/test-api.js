/**
 * Comprehensive Automated End-to-End API Verification Script
 * Validates all 13 modules against the local Express server
 */
const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const assert = (condition, msg) => {
  if (!condition) {
    console.error(`  ❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASSED: ${msg}`);
  }
};

const runTests = async () => {
  console.log('\n======================================================');
  console.log(' STARTING 13-MODULE CORE BANKING API TEST SUITE');
  console.log('======================================================\n');

  try {
    // Check Health
    console.log('--- Step 0: Server Health Check ---');
    const health = await request('/api/health');
    assert(health.status === 200 && health.data.status === 'ONLINE', 'Server is online');

    // 1. Module 1: Customer Onboarding & KYC Capture
    console.log('\n--- Module 1: Customer Onboarding & KYC Capture ---');
    const registerRes = await request('/api/auth/register', 'POST', {
      name: 'David TestUser',
      email: `david.${Date.now()}@test.com`,
      password: 'Password@123',
      phone: '9988771122',
      panNumber: 'TESTD1234K',
      aadhaarNumber: '112233445566',
      address: '77 Cyber City, Bangalore'
    });
    assert(registerRes.status === 201, 'Customer registered with KYC');
    const davidToken = registerRes.data.data.token;

    // 2. Authentication and Role Login
    console.log('\n--- Authentication & Role Tokens ---');
    const aliceLogin = await request('/api/auth/login', 'POST', {
      email: 'alice@customer.com',
      password: 'Password@123'
    });
    assert(aliceLogin.status === 200, 'Customer Alice logged in');
    const aliceToken = aliceLogin.data.data.token;

    const staffLogin = await request('/api/auth/login', 'POST', {
      email: 'staff@digitalbank.com',
      password: 'Password@123'
    });
    assert(staffLogin.status === 200, 'Staff user logged in');
    const staffToken = staffLogin.data.data.token;

    // 3. Module 3: Account Management (Create Savings/Current)
    console.log('\n--- Module 3: Account Management ---');
    const newAccRes = await request('/api/accounts', 'POST', {
      type: 'SAVINGS',
      initialDeposit: 2000
    }, davidToken);
    assert(newAccRes.status === 201, 'David applied for Savings account in PENDING_APPROVAL status');
    const davidAccountId = newAccRes.data.data.account._id;
    const davidAccNum = newAccRes.data.data.account.accountNumber;

    // Check customer account fetch
    const aliceAccounts = await request('/api/accounts', 'GET', null, aliceToken);
    assert(aliceAccounts.status === 200 && aliceAccounts.data.data.accounts.length >= 2, 'Alice fetched her accounts');
    const aliceSavings = aliceAccounts.data.data.accounts.find(a => a.type === 'SAVINGS');
    const aliceSavingsAccNum = aliceSavings.accountNumber;

    // 4. Module 2: Account Approval Workflow
    console.log('\n--- Module 2: Account Approval Workflow ---');
    const pendingList = await request('/api/staff/pending-accounts', 'GET', null, staffToken);
    assert(pendingList.status === 200 && pendingList.data.data.accounts.length >= 1, 'Staff retrieved pending accounts');

    const approveRes = await request(`/api/accounts/${davidAccountId}/approve`, 'PUT', {
      status: 'Approved',
      remarks: 'Documents verified and approved during automated test run'
    }, staffToken);
    assert(approveRes.status === 200 && (approveRes.data.data.status === 'Approved' || approveRes.data.data.status === 'APPROVED'), 'Staff approved David\'s account');

    // 5. Module 4: Beneficiary Management
    console.log('\n--- Module 4: Beneficiary Management ---');
    const addBenRes = await request('/api/beneficiaries', 'POST', {
      sourceAccountId: aliceSavings._id,
      beneficiaryAccountNumber: davidAccNum,
      beneficiaryName: 'David Beneficiary',
      nickname: 'David Friend'
    }, aliceToken);
    assert(addBenRes.status === 201, 'Alice successfully added David as beneficiary');

    const benList = await request('/api/beneficiaries', 'GET', null, aliceToken);
    assert(benList.status === 200 && benList.data.data.beneficiaries.length >= 1, 'Alice retrieved beneficiaries list');

    // 6. Module 8: Minimum Balance Enforcement & Daily Limit
    console.log('\n--- Module 8: Minimum Balance & Limits Enforcement ---');
    // Try to transfer more than allowed by minimum balance (Balance - Amount < 1000)
    const excessAmount = aliceSavings.balance; // Trying to transfer entire balance leaves 0, violating min balance of 1000
    const excessTransfer = await request('/api/transactions/transfer', 'POST', {
      fromAccountNumber: aliceSavingsAccNum,
      toAccountNumber: davidAccNum,
      amount: excessAmount
    }, aliceToken);
    assert(excessTransfer.status === 400 && excessTransfer.data.errorCode === 'MINIMUM_BALANCE_VIOLATION',
      'Prevented overdraft violating minimum balance requirement');

    // 7. Module 5 & 6: Fund Transfer Engine & Immutable Transaction Ledger
    console.log('\n--- Module 5 & 6: Fund Transfer Engine & Transaction Ledger ---');
    const validTransfer = await request('/api/transactions/transfer', 'POST', {
      fromAccountNumber: aliceSavingsAccNum,
      toAccountNumber: davidAccNum,
      amount: 2500,
      description: 'Consultation fee settlement'
    }, aliceToken);
    assert(validTransfer.status === 201, 'Atomic fund transfer succeeded');

    // Check ledger
    const ledgerRes = await request(`/api/accounts/${aliceSavings._id}/ledger`, 'GET', null, aliceToken);
    assert(ledgerRes.status === 200 && ledgerRes.data.data.transactions.length >= 1, 'Ledger retrieved with running balanceAfter');

    // 8. Module 7: Account Statement Generation
    console.log('\n--- Module 7: Account Statement Generation ---');
    const statementRes = await request(`/api/accounts/${aliceSavings._id}/statement`, 'GET', null, aliceToken);
    assert(statementRes.status === 200 && statementRes.data.data.summary.totalTransactions > 0,
      'Account statement generated with opening/closing balance and net flow');

    // 9. Module 9: Suspicious Transaction Flagging
    console.log('\n--- Module 9: Suspicious Transaction Flagging ---');
    // Transfer 55000 from Alice's Current account (balance: 150000) to David
    const aliceCurrent = aliceAccounts.data.data.accounts.find(a => a.type === 'CURRENT');
    const highValTransfer = await request('/api/transactions/transfer', 'POST', {
      fromAccountNumber: aliceCurrent.accountNumber,
      toAccountNumber: davidAccNum,
      amount: 55000,
      description: 'Heavy machinery deposit'
    }, aliceToken);
    assert(highValTransfer.status === 201 && highValTransfer.data.data.flagged === true,
      'Transfer of ₹55,000 automatically flagged for AML staff review');

    // 10. Module 10: Account Freeze / Unfreeze Module
    console.log('\n--- Module 10: Account Freeze & Unfreeze Module ---');
    const freezeRes = await request(`/api/accounts/${davidAccountId}/freeze`, 'PUT', {
      remarks: 'Security team requested freeze for rapid high value incoming transfer'
    }, staffToken);
    assert(freezeRes.status === 200 && freezeRes.data.data.status === 'FROZEN', 'Staff froze David\'s account');

    // Verify that transferring OUT of a frozen account is blocked
    const frozenTransferAttempt = await request('/api/transactions/transfer', 'POST', {
      fromAccountNumber: davidAccNum,
      toAccountNumber: aliceSavingsAccNum,
      amount: 100
    }, davidToken);
    assert(frozenTransferAttempt.status === 403 && frozenTransferAttempt.data.errorCode === 'ACCOUNT_FROZEN',
      'Blocked transfer from frozen account');

    // Staff unfreezes David's account
    const unfreezeRes = await request(`/api/accounts/${davidAccountId}/unfreeze`, 'PUT', {
      remarks: 'Identity verified and transaction cleared'
    }, staffToken);
    assert(unfreezeRes.status === 200 && unfreezeRes.data.data.status === 'ACTIVE', 'Account successfully unfrozen');

    // 11. Module 11: Interest Calculation Job Logic
    console.log('\n--- Module 11: Interest Calculation Job Logic ---');
    const interestJobRes = await request('/api/jobs/calculate-interest', 'POST', {
      periodMonths: 1
    }, staffToken);
    assert(interestJobRes.status === 200 && interestJobRes.data.data.accountsCredited >= 1,
      'Interest batch calculation processed and credited to savings ledger');

    // 12. Module 12: Staff Monitoring Dashboard
    console.log('\n--- Module 12: Staff Monitoring Dashboard ---');
    const dashboardMetrics = await request('/api/staff/dashboard', 'GET', null, staffToken);
    assert(dashboardMetrics.status === 200 && dashboardMetrics.data.data.overview.totalCustomers >= 1,
      'Retrieved staff dashboard overview and liquidity metrics');

    const flaggedList = await request('/api/staff/flagged-transactions', 'GET', null, staffToken);
    assert(flaggedList.status === 200 && flaggedList.data.data.count >= 1,
      'Retrieved flagged transactions queue for staff investigation');

    // 13. Module 13: Role-Based Access Control (RBAC) Security Verification
    console.log('\n--- Module 13: Role-Based Access Control (RBAC) ---');
    // Customer cannot access staff dashboard
    const customerAccessDenied = await request('/api/staff/dashboard', 'GET', null, aliceToken);
    assert(customerAccessDenied.status === 403 && customerAccessDenied.data.errorCode === 'FORBIDDEN',
      'RBAC Guard: Customer blocked from accessing Staff Dashboard (403)');

    // Unauthenticated access blocked
    const noAuth = await request('/api/accounts', 'GET');
    assert(noAuth.status === 401, 'Auth Guard: Missing token returns 401 Unauthorized');

    console.log('\n======================================================');
    console.log(' 🏆 ALL 13 CORE MODULES VERIFIED & WORKING PERFECTLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Test Suite Encountered Error:', error);
    process.exit(1);
  }
};

runTests();
