const User = require('../models/User');
const Account = require('../models/Account');
const Beneficiary = require('../models/Beneficiary');
const Transaction = require('../models/Transaction');
const Approval = require('../models/Approval');
const { ROLES, ACCOUNT_TYPES, ACCOUNT_STATUS, TRANSACTION_TYPES, APPROVAL_DECISIONS, LIMITS } = require('../config/constants');
const { generateReferenceNumber } = require('../utils/helpers');

const seedMemory = async () => {
  // Clear any existing
  await Promise.all([
    User.deleteMany({}),
    Account.deleteMany({}),
    Beneficiary.deleteMany({}),
    Transaction.deleteMany({}),
    Approval.deleteMany({})
  ]);

  // 1. Admin
  const adminUser = await User.create({
    name: 'Executive Admin',
    email: 'admin@digitalbank.com',
    password: 'Password@123',
    role: ROLES.ADMIN,
    phone: '+91 9876500001',
    kycStatus: 'VERIFIED',
    kycDetails: {
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '111122223333',
      address: '100 Bank Street, Financial District',
      occupation: 'Bank Director',
      annualIncome: 3500000
    }
  });

  // 2. Staff Officer
  const staffUser = await User.create({
    name: 'Sarah Staff (Operations Officer)',
    email: 'staff@digitalbank.com',
    password: 'Password@123',
    role: ROLES.STAFF,
    phone: '+91 9876500002',
    kycStatus: 'VERIFIED',
    kycDetails: {
      panNumber: 'FGHIJ5678K',
      aadhaarNumber: '444455556666',
      address: '202 Officer Enclave, Bangalore',
      occupation: 'Credit & Verification Officer',
      annualIncome: 1200000
    }
  });

  // 3. Customer 1 (Alice)
  const customer1 = await User.create({
    name: 'Alice Sharma',
    email: 'alice@customer.com',
    password: 'Password@123',
    role: ROLES.CUSTOMER,
    phone: '+91 9876511111',
    kycStatus: 'VERIFIED',
    kycDetails: {
      panNumber: 'ALICE1234X',
      aadhaarNumber: '777788889999',
      address: 'Villa 14, Palm Meadows, Bangalore',
      occupation: 'Senior Software Engineer',
      annualIncome: 2400000
    }
  });

  // 4. Customer 2 (Bob)
  const customer2 = await User.create({
    name: 'Bob Patel',
    email: 'bob@customer.com',
    password: 'Password@123',
    role: ROLES.CUSTOMER,
    phone: '+91 9876522222',
    kycStatus: 'VERIFIED',
    kycDetails: {
      panNumber: 'BOBP5678Y',
      aadhaarNumber: '123498765432',
      address: 'Flat 401, Sapphire Heights, Mumbai',
      occupation: 'Business Owner',
      annualIncome: 3000000
    }
  });

  // 5. Customer 3 (Charlie - Pending Application Demo)
  const customer3 = await User.create({
    name: 'Charlie Verma',
    email: 'charlie@customer.com',
    password: 'Password@123',
    role: ROLES.CUSTOMER,
    phone: '+91 9876533333',
    kycStatus: 'PENDING',
    kycDetails: {
      panNumber: 'CHAR9999Z',
      aadhaarNumber: '998877665544',
      address: 'Sector 62, Noida, UP',
      occupation: 'Analyst',
      annualIncome: 900000
    }
  });

  // Alice's Savings Account (ACTIVE)
  const aliceSavings = await Account.create({
    userId: customer1._id,
    accountNumber: '1008001001',
    type: ACCOUNT_TYPES.SAVINGS,
    balance: 75000,
    status: ACCOUNT_STATUS.ACTIVE,
    interestRate: LIMITS.SAVINGS_INTEREST_RATE_ANNUAL,
    dailyTransferLimit: 100000
  });

  // Alice's Current Account (ACTIVE)
  const aliceCurrent = await Account.create({
    userId: customer1._id,
    accountNumber: '1008001002',
    type: ACCOUNT_TYPES.CURRENT,
    balance: 150000,
    status: ACCOUNT_STATUS.ACTIVE,
    interestRate: 0,
    dailyTransferLimit: 250000
  });

  // Bob's Savings Account (ACTIVE)
  const bobSavings = await Account.create({
    userId: customer2._id,
    accountNumber: '1008002001',
    type: ACCOUNT_TYPES.SAVINGS,
    balance: 45000,
    status: ACCOUNT_STATUS.ACTIVE,
    interestRate: LIMITS.SAVINGS_INTEREST_RATE_ANNUAL,
    dailyTransferLimit: 100000
  });

  // Charlie's Account (PENDING_APPROVAL)
  const charliePending = await Account.create({
    userId: customer3._id,
    accountNumber: '1008003001',
    type: ACCOUNT_TYPES.SAVINGS,
    balance: 2500,
    status: ACCOUNT_STATUS.PENDING_APPROVAL,
    interestRate: LIMITS.SAVINGS_INTEREST_RATE_ANNUAL,
    dailyTransferLimit: 50000
  });

  // Bob's Frozen Account
  const bobFrozen = await Account.create({
    userId: customer2._id,
    accountNumber: '1008002002',
    type: ACCOUNT_TYPES.CURRENT,
    balance: 12000,
    status: ACCOUNT_STATUS.FROZEN,
    freezeReason: 'Flagged for compliance verification of foreign remittance',
    interestRate: 0,
    dailyTransferLimit: 50000
  });

  // Initial Approvals
  await Approval.create({
    accountId: aliceSavings._id,
    staffId: staffUser._id,
    decision: APPROVAL_DECISIONS.APPROVED,
    remarks: 'KYC verified and physical documents verified.',
    previousStatus: ACCOUNT_STATUS.PENDING_APPROVAL,
    newStatus: ACCOUNT_STATUS.ACTIVE
  });

  await Approval.create({
    accountId: bobFrozen._id,
    staffId: staffUser._id,
    decision: APPROVAL_DECISIONS.FROZEN,
    remarks: 'Suspicious remittance activity. Temporary freeze initiated.',
    previousStatus: ACCOUNT_STATUS.ACTIVE,
    newStatus: ACCOUNT_STATUS.FROZEN
  });

  // Beneficiary
  await Beneficiary.create({
    userId: customer1._id,
    sourceAccountId: aliceSavings._id,
    beneficiaryAccountNumber: bobSavings.accountNumber,
    beneficiaryName: 'Bob Patel',
    bankName: 'Global Digital Bank',
    ifscCode: 'GDBK0001001',
    nickname: 'Bob Office'
  });

  // Transactions Ledger Entries
  await Transaction.create({
    accountId: aliceSavings._id,
    accountNumber: aliceSavings.accountNumber,
    type: TRANSACTION_TYPES.DEPOSIT,
    amount: 75000,
    balanceAfter: 75000,
    referenceNumber: generateReferenceNumber('DEP'),
    description: 'Opening branch deposit',
    flagged: false,
    status: 'COMPLETED'
  });

  const trfRef = generateReferenceNumber('TRF');
  await Transaction.create({
    accountId: aliceSavings._id,
    accountNumber: aliceSavings.accountNumber,
    type: TRANSACTION_TYPES.TRANSFER_DEBIT,
    amount: 5000,
    balanceAfter: 70000,
    relatedAccountId: bobSavings._id,
    relatedAccountNumber: bobSavings.accountNumber,
    referenceNumber: `${trfRef}-DR`,
    description: `Transfer to A/C ${bobSavings.accountNumber}`,
    flagged: false,
    status: 'COMPLETED'
  });

  await Transaction.create({
    accountId: bobSavings._id,
    accountNumber: bobSavings.accountNumber,
    type: TRANSACTION_TYPES.TRANSFER_CREDIT,
    amount: 5000,
    balanceAfter: 45000,
    relatedAccountId: aliceSavings._id,
    relatedAccountNumber: aliceSavings.accountNumber,
    referenceNumber: `${trfRef}-CR`,
    description: `Transfer from A/C ${aliceSavings.accountNumber}`,
    flagged: false,
    status: 'COMPLETED'
  });

  // Flagged Suspicious Transaction
  const suspiciousRef = generateReferenceNumber('TRF');
  await Transaction.create({
    accountId: aliceCurrent._id,
    accountNumber: aliceCurrent.accountNumber,
    type: TRANSACTION_TYPES.TRANSFER_DEBIT,
    amount: 65000,
    balanceAfter: 150000,
    relatedAccountId: bobSavings._id,
    relatedAccountNumber: bobSavings.accountNumber,
    referenceNumber: `${suspiciousRef}-DR`,
    description: 'Bulk Equipment Procurement (Automated AML Flag)',
    flagged: true,
    flagReason: `High-value transfer of ₹65000 exceeds the monitoring threshold of ₹${LIMITS.FLAGGED_TRANSACTION_THRESHOLD}`,
    status: 'COMPLETED'
  });
};

module.exports = seedMemory;
