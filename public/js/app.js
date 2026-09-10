/**
 * ApexBank Frontend Demo Controller
 * Interacts with Node.js & Express REST APIs
 */

let state = {
  token: localStorage.getItem('apex_token') || null,
  user: null,
  accounts: [],
  selectedAccountId: null
};

const API_BASE = '/api';

// Initialize UI
document.addEventListener('DOMContentLoaded', async () => {
  if (state.token) {
    await loadUserProfile();
  } else {
    showView('guestView');
  }
});

/**
 * Switch Active View
 */
function showView(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
  const target = document.getElementById(viewId);
  if (target) target.classList.remove('d-none');
}

/**
 * Alert Helper
 */
function showAlert(message, type = 'success') {
  const alertBox = document.getElementById('statusAlert');
  const alertMsg = document.getElementById('alertMessage');
  alertBox.className = `alert alert-${type} alert-dismissible fade show`;
  alertMsg.innerHTML = message;
  alertBox.classList.remove('d-none');
  setTimeout(() => hideAlert(), 6000);
}

function hideAlert() {
  document.getElementById('statusAlert').classList.add('d-none');
}

/**
 * Quick Login Helper for Testing / Viva
 */
async function quickLogin(email) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password@123' })
    });
    const data = await res.json();
    if (!data.success) {
      return showAlert(data.message || 'Quick login failed', 'danger');
    }

    state.token = data.data.token;
    localStorage.setItem('apex_token', state.token);
    showAlert(`Logged in as <strong>${data.data.user.name}</strong> (${data.data.user.role})`, 'success');
    await loadUserProfile();
  } catch (err) {
    showAlert(err.message, 'danger');
  }
}

/**
 * Load User Profile
 */
async function loadUserProfile() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (!data.success) {
      logout();
      return;
    }

    state.user = data.data.user;
    updateNavForUser();

    if (state.user.role === 'CUSTOMER') {
      showView('customerView');
      await loadCustomerDashboard();
    } else {
      showView('staffView');
      await loadStaffDashboard();
    }
  } catch (err) {
    console.error(err);
    logout();
  }
}

/**
 * Update Navbar for Authenticated User
 */
function updateNavForUser() {
  const badge = document.getElementById('quickUserBadge');
  const authBtn = document.getElementById('authBtn');
  const userName = document.getElementById('currentUserName');
  const userRole = document.getElementById('currentUserRole');

  badge.classList.remove('d-none');
  userName.innerText = state.user.name;
  userRole.innerText = state.user.role;

  authBtn.className = 'btn btn-outline-danger rounded-pill px-4';
  authBtn.innerHTML = '<i class="bi bi-box-arrow-right me-1"></i> Sign Out';
  authBtn.setAttribute('onclick', 'logout()');
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('apex_token');
  document.getElementById('quickUserBadge').classList.add('d-none');
  const authBtn = document.getElementById('authBtn');
  authBtn.className = 'btn btn-primary rounded-pill px-4';
  authBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Sign In';
  authBtn.setAttribute('onclick', 'openLoginModal()');
  showView('guestView');
}

/**
 * CUSTOMER VIEW LOGIC
 */
async function loadCustomerDashboard() {
  // Update KYC card
  const kycBadge = document.getElementById('custKycBadge');
  const kycDetails = document.getElementById('custKycDetails');
  kycBadge.innerText = state.user.kycStatus;
  kycBadge.className = state.user.kycStatus === 'VERIFIED' ? 'fw-bold mt-2 mb-0 text-success' : 'fw-bold mt-2 mb-0 text-warning';
  kycDetails.innerText = `PAN: ${state.user.kycDetails?.panNumber || 'Not Linked'} | Aadhaar: ${state.user.kycDetails?.aadhaarNumber ? 'Linked' : 'Not Linked'}`;

  // Load Accounts
  await loadAccounts();
  await loadBeneficiaries();
}

async function loadAccounts() {
  const res = await fetch(`${API_BASE}/accounts`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  const data = await res.json();
  if (!data.success) return;

  state.accounts = data.data.accounts;
  document.getElementById('accountsCountBadge').innerText = `${state.accounts.length} Accounts`;

  let totalBal = 0;
  const container = document.getElementById('accountsListContainer');
  const ledgerSelect = document.getElementById('ledgerAccountSelect');
  const transferFromSelect = document.getElementById('transferFromAccount');
  const benSourceSelect = document.getElementById('benSourceAccount');

  container.innerHTML = '';
  ledgerSelect.innerHTML = '';
  transferFromSelect.innerHTML = '';
  benSourceSelect.innerHTML = '';

  state.accounts.forEach(acc => {
    if (acc.status === 'ACTIVE') totalBal += acc.balance;

    // Status badge color
    let statusClass = 'bg-secondary';
    if (acc.status === 'ACTIVE') statusClass = 'bg-success';
    if (acc.status === 'PENDING_APPROVAL') statusClass = 'bg-warning text-dark';
    if (acc.status === 'FROZEN') statusClass = 'bg-danger';

    // Account Card HTML with Smart Card Chip & Metallic Styling
    const isFrozen = acc.status === 'FROZEN';
    const cardGradient = acc.type === 'CURRENT' 
      ? 'background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-left: 4px solid #818cf8;'
      : 'background: linear-gradient(135deg, #0f2b3e 0%, #0b1528 100%); border-left: 4px solid #38bdf8;';

    const cardHtml = `
      <div class="account-card p-3 mb-3" style="${cardGradient}">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="d-flex align-items-center gap-2">
            <div class="card-chip"></div>
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold">${acc.type}</span>
            <span class="badge ${statusClass} rounded-pill px-2 py-1">${acc.status}</span>
          </div>
          <div class="h5 fw-bold mb-0 ${isFrozen ? 'text-danger' : 'text-success'}">
            ₹${acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div class="my-2">
          <div class="text-secondary small" style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;">Account Number</div>
          <div class="text-light font-monospace fw-bold" style="letter-spacing: 0.15em; font-size: 1.1rem;">${acc.accountNumber}</div>
        </div>
        <div class="d-flex justify-content-between text-secondary small pt-1 border-top border-dark-subtle">
          <div><i class="bi bi-speedometer2 me-1 text-info"></i>Limit: ₹${acc.dailyTransferLimit?.toLocaleString('en-IN')}/day</div>
          <div><i class="bi bi-graph-up-arrow me-1 text-success"></i>Rate: ${acc.interestRate || 4.0}% p.a.</div>
        </div>
        ${acc.freezeReason ? `<div class="mt-2 p-2 rounded bg-danger-subtle border border-danger-subtle text-danger small"><i class="bi bi-shield-slash-fill me-1"></i><strong>Restriction:</strong> ${acc.freezeReason}</div>` : ''}
      </div>
    `;
    container.innerHTML += cardHtml;

    // Populate Select options
    const option = `<option value="${acc._id}" data-acc="${acc.accountNumber}">${acc.accountNumber} (${acc.type} - ₹${acc.balance})</option>`;
    ledgerSelect.innerHTML += option;
    if (acc.status === 'ACTIVE') {
      transferFromSelect.innerHTML += `<option value="${acc.accountNumber}">${acc.accountNumber} (Bal: ₹${acc.balance})</option>`;
      benSourceSelect.innerHTML += `<option value="${acc._id}">${acc.accountNumber} (${acc.type})</option>`;
    }
  });

  document.getElementById('custTotalBalance').innerText = `₹${totalBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (state.accounts.length > 0) {
    state.selectedAccountId = state.accounts[0]._id;
    await loadLedgerForSelectedAccount();
  }
}

async function loadBeneficiaries() {
  const res = await fetch(`${API_BASE}/beneficiaries`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  const data = await res.json();
  if (!data.success) return;

  const container = document.getElementById('beneficiariesListContainer');
  if (data.data.beneficiaries.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-muted small">No beneficiaries added yet</div>';
    return;
  }

  container.innerHTML = '<ul class="list-group list-group-flush bg-transparent">';
  data.data.beneficiaries.forEach(ben => {
    container.innerHTML += `
      <li class="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center py-3">
        <div>
          <div class="fw-semibold">${ben.nickname || ben.beneficiaryName}</div>
          <div class="text-muted small font-monospace">${ben.beneficiaryAccountNumber} (${ben.bankName})</div>
        </div>
        <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="prepareTransferTo('${ben.beneficiaryAccountNumber}')">
          Transfer
        </button>
      </li>
    `;
  });
  container.innerHTML += '</ul>';
}

function prepareTransferTo(accNum) {
  document.getElementById('transferToAccount').value = accNum;
  openTransferModal();
}

/**
 * Immutable Ledger Loader
 */
async function loadLedgerForSelectedAccount() {
  const accountId = document.getElementById('ledgerAccountSelect').value;
  if (!accountId) return;

  const res = await fetch(`${API_BASE}/accounts/${accountId}/ledger`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  const data = await res.json();
  const tbody = document.getElementById('ledgerTableBody');

  if (!data.success || data.data.transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No transactions found for this account</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  data.data.transactions.forEach(tx => {
    const isCredit = ['DEPOSIT', 'TRANSFER_CREDIT', 'INTEREST'].includes(tx.type);
    const badgeClass = isCredit ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';

    tbody.innerHTML += `
      <tr>
        <td class="font-monospace small">${tx.referenceNumber} ${tx.flagged ? '<span class="badge bg-danger">FLAGGED</span>' : ''}</td>
        <td class="small text-muted">${new Date(tx.createdAt).toLocaleString('en-IN')}</td>
        <td><span class="badge ${badgeClass}">${tx.type}</span></td>
        <td class="small">${tx.description}</td>
        <td class="fw-bold ${isCredit ? 'text-success' : 'text-danger'}">${isCredit ? '+' : '-'}₹${tx.amount.toLocaleString('en-IN')}</td>
        <td class="fw-semibold text-light">₹${tx.balanceAfter.toLocaleString('en-IN')}</td>
        <td><span class="badge bg-secondary small">${tx.status}</span></td>
      </tr>
    `;
  });
}

/**
 * Statement Generator
 */
async function handleGenerateStatement(e) {
  e.preventDefault();
  const accountId = document.getElementById('ledgerAccountSelect').value;
  const start = document.getElementById('stmtStartDate').value;
  const end = document.getElementById('stmtEndDate').value;

  let url = `${API_BASE}/accounts/${accountId}/statement`;
  const params = [];
  if (start) params.push(`startDate=${start}`);
  if (end) params.push(`endDate=${end}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  const data = await res.json();
  if (!data.success) return showAlert(data.message, 'danger');

  // Show summary
  const summaryBox = document.getElementById('statementSummaryBox');
  summaryBox.classList.remove('d-none');
  document.getElementById('stmtOpeningBal').innerText = `₹${data.data.summary.openingBalance.toLocaleString('en-IN')}`;
  document.getElementById('stmtCredits').innerText = `+₹${data.data.summary.totalCredits.toLocaleString('en-IN')}`;
  document.getElementById('stmtDebits').innerText = `-₹${data.data.summary.totalDebits.toLocaleString('en-IN')}`;
  document.getElementById('stmtClosingBal').innerText = `₹${data.data.summary.closingBalance.toLocaleString('en-IN')}`;

  const tbody = document.getElementById('statementTableBody');
  tbody.innerHTML = '';
  data.data.transactions.forEach(tx => {
    const isCredit = ['DEPOSIT', 'TRANSFER_CREDIT', 'INTEREST'].includes(tx.type);
    tbody.innerHTML += `
      <tr>
        <td class="font-monospace small">${tx.referenceNumber}</td>
        <td class="small">${new Date(tx.createdAt).toLocaleDateString()}</td>
        <td><span class="badge ${isCredit ? 'bg-success' : 'bg-danger'}">${tx.type}</span></td>
        <td class="small">${tx.description}</td>
        <td class="${isCredit ? 'text-success' : 'text-danger'} fw-bold">${isCredit ? '+' : '-'}₹${tx.amount}</td>
        <td>₹${tx.balanceAfter}</td>
      </tr>
    `;
  });
}

/**
 * STAFF DASHBOARD LOGIC
 */
async function loadStaffDashboard() {
  // Metrics
  const res = await fetch(`${API_BASE}/staff/dashboard`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  const data = await res.json();
  if (data.success) {
    const m = data.data.overview;
    document.getElementById('metricPendingApprovals').innerText = m.pendingApprovals;
    document.getElementById('metricFlaggedCount').innerText = m.flaggedSuspiciousTransactions;
    document.getElementById('metricActiveAccounts').innerText = m.activeAccounts;
    document.getElementById('metricTotalLiquidity').innerText = `₹${m.totalActiveLiquidity.toLocaleString('en-IN')}`;
  }

  // Load Pending Applications
  const pendingRes = await fetch(`${API_BASE}/staff/pending-accounts`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  const pendingData = await pendingRes.json();
  const pendingTbody = document.getElementById('pendingApplicationsTableBody');

  if (pendingData.success && pendingData.data.accounts.length > 0) {
    pendingTbody.innerHTML = '';
    pendingData.data.accounts.forEach(acc => {
      pendingTbody.innerHTML += `
        <tr>
          <td class="fw-semibold">${acc.userId?.name || 'Customer'}</td>
          <td class="small text-muted">${acc.userId?.email}<br>${acc.userId?.phone}</td>
          <td><span class="badge bg-primary-subtle text-primary border border-primary-subtle">${acc.type}</span></td>
          <td class="text-success fw-bold">₹${acc.balance.toLocaleString('en-IN')}</td>
          <td class="small font-monospace">PAN: ${acc.userId?.kycDetails?.panNumber || 'N/A'}<br>Status: ${acc.userId?.kycStatus}</td>
          <td class="small text-muted">${new Date(acc.createdAt).toLocaleDateString()}</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-success" onclick="approveAccountApplication('${acc._id}')">
                <i class="bi bi-check-circle me-1"></i> Approve
              </button>
              <button class="btn btn-danger" onclick="rejectAccountApplication('${acc._id}')">
                <i class="bi bi-x-circle me-1"></i> Reject
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  } else {
    pendingTbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No pending applications in queue</td></tr>';
  }

  // Load Flagged Transactions
  const flaggedRes = await fetch(`${API_BASE}/staff/flagged-transactions`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  });
  const flaggedData = await flaggedRes.json();
  const flaggedTbody = document.getElementById('flaggedTransactionsTableBody');

  if (flaggedData.success && flaggedData.data.transactions.length > 0) {
    flaggedTbody.innerHTML = '';
    flaggedData.data.transactions.forEach(tx => {
      const accId = tx.accountId?._id || tx.accountId;
      flaggedTbody.innerHTML += `
        <tr>
          <td class="font-monospace text-danger small">${tx.referenceNumber}</td>
          <td class="font-monospace fw-semibold">${tx.accountNumber}</td>
          <td class="font-monospace">${tx.relatedAccountNumber || 'N/A'}</td>
          <td class="text-danger fw-bold">₹${tx.amount.toLocaleString('en-IN')}</td>
          <td class="small text-secondary">${tx.flagReason}</td>
          <td class="small text-muted">${new Date(tx.createdAt).toLocaleTimeString()}</td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1 text-nowrap" onclick="freezeAccountModal('${accId}')">
                <i class="bi bi-snow me-1"></i>Freeze
              </button>
              <button class="btn btn-sm btn-outline-gold rounded-pill px-2 py-1 text-nowrap" onclick="dismissFlag('${tx._id}')">
                <i class="bi bi-check2 me-1"></i>Dismiss
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  } else {
    flaggedTbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">All transactions clear. No suspicious activity detected.</td></tr>';
  }
}

/**
 * Staff Action Handlers
 */
async function approveAccountApplication(id) {
  const remarks = prompt('Enter approval verification remarks:', 'Documents verified and approved');
  if (!remarks) return;

  const res = await fetch(`${API_BASE}/accounts/${id}/approve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ status: 'Approved', remarks })
  });
  const data = await res.json();
  if (data.success) {
    showAlert('Account approved successfully. Initial deposit activated.', 'success');
    await loadStaffDashboard();
  } else {
    showAlert(data.message, 'danger');
  }
}

async function rejectAccountApplication(id) {
  const remarks = prompt('Enter rejection reason for audit trail:');
  if (!remarks) return;

  const res = await fetch(`${API_BASE}/accounts/${id}/reject`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ remarks })
  });
  const data = await res.json();
  if (data.success) {
    showAlert('Account rejected', 'warning');
    await loadStaffDashboard();
  } else {
    showAlert(data.message, 'danger');
  }
}

async function freezeAccountModal(accId) {
  const reason = prompt('Enter mandatory compliance freeze reason:');
  if (!reason) return;

  const res = await fetch(`${API_BASE}/accounts/${accId}/freeze`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ remarks: reason })
  });
  const data = await res.json();
  if (data.success) {
    showAlert(`Account frozen successfully. Operational freeze recorded in audit trail.`, 'warning');
    await loadStaffDashboard();
  } else {
    showAlert(data.message, 'danger');
  }
}

async function dismissFlag(txId) {
  const remarks = prompt('Enter resolution remarks:');
  if (!remarks) return;

  const res = await fetch(`${API_BASE}/staff/flagged-transactions/${txId}/dismiss`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ remarks })
  });
  const data = await res.json();
  if (data.success) {
    showAlert('Transaction flag resolved and dismissed.', 'success');
    await loadStaffDashboard();
  }
}

async function triggerInterestJob() {
  const months = prompt('Enter number of months for interest accrual calculation:', '1');
  if (!months) return;

  const res = await fetch(`${API_BASE}/jobs/calculate-interest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ periodMonths: Number(months) })
  });
  const data = await res.json();
  if (data.success) {
    showAlert(`Interest Batch Job Complete! Disbursed ₹${data.data.totalInterestDisbursed} to ${data.data.accountsCredited} savings accounts.`, 'success');
    await loadStaffDashboard();
  } else {
    showAlert(data.message, 'danger');
  }
}

/**
 * Customer Form Handlers
 */
async function handleTransferSubmit(e) {
  e.preventDefault();
  const fromAccountNumber = document.getElementById('transferFromAccount').value;
  const toAccountNumber = document.getElementById('transferToAccount').value;
  const amount = Number(document.getElementById('transferAmount').value);
  const description = document.getElementById('transferDescription').value;

  const res = await fetch(`${API_BASE}/transactions/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ fromAccountNumber, toAccountNumber, amount, description })
  });

  const data = await res.json();
  bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();

  if (data.success) {
    let msg = `Transfer of ₹${amount} completed successfully! Ref: ${data.data.referenceNumber}`;
    if (data.data.flagged) {
      msg += ` <br><strong class="text-warning">Notice: High value transfer flagged for AML audit.</strong>`;
    }
    showAlert(msg, 'success');
    await loadAccounts();
  } else {
    showAlert(data.message, 'danger');
  }
}

async function handleNewAccountSubmit(e) {
  e.preventDefault();
  const type = document.getElementById('newAccountType').value;
  const initialDeposit = Number(document.getElementById('newAccountDeposit').value);

  const res = await fetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ type, initialDeposit })
  });

  const data = await res.json();
  bootstrap.Modal.getInstance(document.getElementById('newAccountModal')).hide();

  if (data.success) {
    showAlert('New account application submitted and is pending staff approval.', 'info');
    await loadAccounts();
  } else {
    showAlert(data.message, 'danger');
  }
}

async function handleAddBeneficiarySubmit(e) {
  e.preventDefault();
  const sourceAccountId = document.getElementById('benSourceAccount').value;
  const beneficiaryAccountNumber = document.getElementById('benAccountNumber').value;
  const beneficiaryName = document.getElementById('benName').value;
  const nickname = document.getElementById('benNickname').value;

  const res = await fetch(`${API_BASE}/beneficiaries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ sourceAccountId, beneficiaryAccountNumber, beneficiaryName, nickname })
  });

  const data = await res.json();
  bootstrap.Modal.getInstance(document.getElementById('beneficiaryModal')).hide();

  if (data.success) {
    showAlert('Beneficiary saved successfully.', 'success');
    await loadBeneficiaries();
  } else {
    showAlert(data.message, 'danger');
  }
}

// Modal Triggers
function openLoginModal() { new bootstrap.Modal(document.getElementById('loginModal')).show(); }
function openTransferModal() { new bootstrap.Modal(document.getElementById('transferModal')).show(); }
function openNewAccountModal() { new bootstrap.Modal(document.getElementById('newAccountModal')).show(); }
function openAddBeneficiaryModal() { new bootstrap.Modal(document.getElementById('beneficiaryModal')).show(); }
function openStatementModal() { new bootstrap.Modal(document.getElementById('statementModal')).show(); }
