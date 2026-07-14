const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Queue to handle concurrent writes atomically
let writeQueue = Promise.resolve();

async function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      await initializeDb();
    }
    const data = await fs.promises.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return {
      users: parsed.users || [],
      transactions: parsed.transactions || [],
      cards: parsed.cards || [],
      goals: parsed.goals || [],
      scheduledTransfers: parsed.scheduledTransfers || [],
      paymentLinks: parsed.paymentLinks || [],
      supportTickets: parsed.supportTickets || [],
      investments: parsed.investments || []
    };
  } catch (error) {
    console.error('Error reading database file:', error);
    return {
      users: [],
      transactions: [],
      cards: [],
      goals: [],
      scheduledTransfers: [],
      paymentLinks: [],
      supportTickets: [],
      investments: []
    };
  }
}

async function writeDb(data) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
          await fs.promises.mkdir(dir, { recursive: true });
        }
        
        // Write to temp file first to ensure atomic writes
        const tempPath = `${DB_PATH}.tmp`;
        await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
        await fs.promises.rename(tempPath, DB_PATH);
        resolve();
      } catch (error) {
        console.error('Error writing database file:', error);
        reject(error);
      }
    });
  });
}

async function initializeDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  // Set up mock seeds
  const defaultDb = {
    users: [],
    transactions: [],
    cards: [],
    goals: [],
    scheduledTransfers: [],
    paymentLinks: [],
    supportTickets: [],
    investments: []
  };

  // Hash standard password: "password123" and PIN: "1234"
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  const hashedPin = await bcrypt.hash('1234', salt);

  // User 1: Alex Banks (Verified Tier 3, pre-setup budgets, cashback, linked accounts)
  const user1 = {
    id: 'user_alex',
    username: 'alex_banks',
    email: 'alex@apex.com',
    password: hashedPassword,
    pin: hashedPin,
    phoneNumber: '09098765432',
    fullName: 'Alex Banks',
    accountNumber: '9098765432', // 10-digit NUBAN
    balance: 250500.75, // ₦250,500.75
    wealthBalance: 50000.00, // ₦50,000 saved in OWealth
    cashbackBalance: 750.00,
    isMerchant: false,
    kycTier: 3,
    bvn: '22233344455',
    nin: '11122233344',
    securityPhrase: 'APEX_SECURE_TRUST',
    linkedAccounts: [
      { bankName: 'GTBank', accountNumber: '0123456789', balance: 45000.00 }
    ],
    budgets: {
      "Food & Dining": 50000,
      "Utilities": 30000,
      "Transport": 20000
    },
    referrals: [],
    currencyBalances: { NGN: 250500.75, USD: 100.00, GBP: 0.00, EUR: 0.00 },
    loginAlerts: [
      { date: new Date().toISOString(), ip: '192.168.1.15', device: 'Chrome Browser (Windows 11)' }
    ],
    createdAt: new Date('2026-01-15T08:30:00.000Z').toISOString()
  };

  // User 2: Sarah Wealth (Verified Tier 3)
  const user2 = {
    id: 'user_sarah',
    username: 'sarah_wealth',
    email: 'sarah@apex.com',
    password: hashedPassword,
    pin: hashedPin,
    phoneNumber: '09012345678',
    fullName: 'Sarah Wealth',
    accountNumber: '9012345678', // 10-digit NUBAN
    balance: 1450200.50, // ₦1,450,200.50
    wealthBalance: 200000.00, // ₦200,000 in Wealth
    cashbackBalance: 1200.00,
    isMerchant: false,
    kycTier: 3,
    bvn: '55566677788',
    nin: '44455566677',
    securityPhrase: 'SARAH_FINTECH_SAFE',
    linkedAccounts: [],
    budgets: {
      "Food & Dining": 100000,
      "Utilities": 50000
    },
    referrals: [],
    currencyBalances: { NGN: 1450200.50, USD: 250.00, GBP: 50.00, EUR: 0.00 },
    loginAlerts: [
      { date: new Date().toISOString(), ip: '192.168.1.18', device: 'Safari Browser (iPhone 14)' }
    ],
    createdAt: new Date('2026-02-10T14:15:00.000Z').toISOString()
  };

  defaultDb.users.push(user1, user2);

  // Default Cards (Naira Visa/Mastercard)
  defaultDb.cards.push(
    {
      id: 'card_alex_1',
      userId: 'user_alex',
      cardNumber: '5061 7812 9012 3456', // Verve
      cardHolder: 'ALEX BANKS',
      expiry: '12/30',
      cvv: '382',
      type: 'Verve Gold Card',
      brand: 'Verve',
      color: 'linear-gradient(135deg, #00b87b 0%, #005a3c 100%)', // OPay-green gradient
      isFrozen: false,
      isDisposable: false,
      spendingLimit: 200000 // ₦200,000 daily spend limit
    },
    {
      id: 'card_sarah_1',
      userId: 'user_sarah',
      cardNumber: '5061 8901 2345 6789',
      cardHolder: 'SARAH WEALTH',
      expiry: '08/31',
      cvv: '109',
      type: 'Verve Platinum Card',
      brand: 'Verve',
      color: 'linear-gradient(135deg, #13f1fc 0%, #0470dc 100%)',
      isFrozen: false,
      isDisposable: false,
      spendingLimit: 1000000
    }
  );

  // Default Goals
  defaultDb.goals.push(
    {
      id: 'goal_alex_1',
      userId: 'user_alex',
      name: 'Business Capital Fund',
      targetAmount: 1000000,
      currentAmount: 150000,
      deadline: '2027-12-31'
    },
    {
      id: 'goal_alex_2',
      userId: 'user_alex',
      name: 'Rent Savings',
      targetAmount: 500000,
      currentAmount: 240000,
      deadline: '2026-11-15'
    },
    {
      id: 'goal_sarah_1',
      userId: 'user_sarah',
      name: 'Lekki Land Acquisition',
      targetAmount: 15000000,
      currentAmount: 5000000,
      deadline: '2028-06-30'
    }
  );

  // Default Localized Transactions
  const alexTx = [
    {
      id: 'tx_alex_1',
      senderId: 'system',
      senderName: 'ApexPay Payout',
      receiverId: 'user_alex',
      receiverName: 'Alex Banks',
      amount: 300000.00,
      type: 'deposit',
      category: 'Salary',
      description: 'Monthly Salary Credit',
      date: new Date('2026-06-01T09:00:00.000Z').toISOString()
    },
    {
      id: 'tx_alex_2',
      senderId: 'user_alex',
      senderName: 'Alex Banks',
      receiverId: 'system',
      receiverName: 'MTN Airtime Topup',
      amount: 2000.00,
      type: 'withdraw',
      category: 'Airtime',
      description: 'VTU Airtime purchase to 08031234567',
      date: new Date('2026-06-15T18:45:00.000Z').toISOString()
    },
    {
      id: 'tx_alex_3',
      senderId: 'user_alex',
      senderName: 'Alex Banks',
      receiverId: 'system',
      receiverName: 'Ikeja Electricity',
      amount: 15000.00,
      type: 'withdraw',
      category: 'Electricity',
      description: 'Prepaid Token for Meter 0429482103',
      date: new Date('2026-06-25T11:30:00.000Z').toISOString()
    },
    {
      id: 'tx_alex_4',
      senderId: 'user_alex',
      senderName: 'Alex Banks',
      receiverId: 'system',
      receiverName: 'SportyBet Funding',
      amount: 5000.00,
      type: 'withdraw',
      category: 'Betting',
      description: 'SportyBet Deposit Ref: SB987452',
      date: new Date('2026-06-28T14:20:00.000Z').toISOString()
    },
    {
      id: 'tx_alex_5',
      senderId: 'user_alex',
      senderName: 'Alex Banks',
      receiverId: 'user_sarah',
      receiverName: 'Sarah Wealth',
      amount: 32500.00,
      type: 'transfer',
      category: 'Rent Share',
      description: 'Shared Office Internet Bill split',
      date: new Date('2026-07-01T10:00:00.000Z').toISOString()
    }
  ];

  const sarahTx = [
    {
      id: 'tx_sarah_1',
      senderId: 'system',
      senderName: 'Moniepoint Deposit',
      receiverId: 'user_sarah',
      receiverName: 'Sarah Wealth',
      amount: 1417700.50,
      type: 'deposit',
      category: 'Business Inflow',
      description: 'POS Store Sales Payout',
      date: new Date('2026-06-05T08:00:00.000Z').toISOString()
    },
    {
      id: 'tx_sarah_2',
      senderId: 'user_alex',
      senderName: 'Alex Banks',
      receiverId: 'user_sarah',
      receiverName: 'Sarah Wealth',
      amount: 32500.00,
      type: 'transfer',
      category: 'Rent Share',
      description: 'Shared Office Internet Bill split',
      date: new Date('2026-07-01T10:00:00.000Z').toISOString()
    }
  ];

  defaultDb.transactions.push(...alexTx, ...sarahTx);

  await writeDb(defaultDb);
  console.log('Naira database seeds initialized successfully.');
}

// Database Actions
const db = {
  read: readDb,
  write: writeDb,

  // User methods
  getUserById: async (id) => {
    const data = await readDb();
    return data.users.find(u => u.id === id);
  },

  getUserByUsername: async (username) => {
    const data = await readDb();
    return data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  getUserByEmail: async (email) => {
    const data = await readDb();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  getUserByAccountNumber: async (accountNumber) => {
    const data = await readDb();
    return data.users.find(u => u.accountNumber === accountNumber);
  },

  getUserByPhoneNumber: async (phoneNumber) => {
    const data = await readDb();
    return data.users.find(u => u.phoneNumber === phoneNumber);
  },

  createUser: async (user) => {
    const data = await readDb();
    data.users.push(user);
    await writeDb(data);
    return user;
  },

  updateUser: async (userId, updates) => {
    const data = await readDb();
    const index = data.users.findIndex(u => u.id === userId);
    if (index !== -1) {
      data.users[index] = { ...data.users[index], ...updates };
      await writeDb(data);
      return data.users[index];
    }
    return null;
  },

  // Transactions methods
  getTransactionsByUserId: async (userId) => {
    const data = await readDb();
    return data.transactions.filter(t => t.senderId === userId || t.receiverId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  createTransaction: async (transaction) => {
    const data = await readDb();
    data.transactions.push(transaction);
    await writeDb(data);
    return transaction;
  },

  // Card methods
  getCardsByUserId: async (userId) => {
    const data = await readDb();
    return data.cards.filter(c => c.userId === userId);
  },

  createCard: async (card) => {
    const data = await readDb();
    data.cards.push(card);
    await writeDb(data);
    return card;
  },

  updateCard: async (cardId, updates) => {
    const data = await readDb();
    const index = data.cards.findIndex(c => c.id === cardId);
    if (index !== -1) {
      data.cards[index] = { ...data.cards[index], ...updates };
      await writeDb(data);
      return data.cards[index];
    }
    return null;
  },

  deleteCard: async (cardId) => {
    const data = await readDb();
    const filtered = data.cards.filter(c => c.id !== cardId);
    if (filtered.length !== data.cards.length) {
      data.cards = filtered;
      await writeDb(data);
      return true;
    }
    return false;
  },

  // Goals methods
  getGoalsByUserId: async (userId) => {
    const data = await readDb();
    return data.goals.filter(g => g.userId === userId);
  },

  createGoal: async (goal) => {
    const data = await readDb();
    data.goals.push(goal);
    await writeDb(data);
    return goal;
  },

  updateGoal: async (goalId, updates) => {
    const data = await readDb();
    const index = data.goals.findIndex(g => g.id === goalId);
    if (index !== -1) {
      data.goals[index] = { ...data.goals[index], ...updates };
      await writeDb(data);
      return data.goals[index];
    }
    return null;
  },

  deleteGoal: async (goalId) => {
    const data = await readDb();
    const filtered = data.goals.filter(g => g.id !== goalId);
    if (filtered.length !== data.goals.length) {
      data.goals = filtered;
      await writeDb(data);
      return true;
    }
    return false;
  },

  // Scheduled Transfers methods
  getScheduledTransfersByUserId: async (userId) => {
    const data = await readDb();
    return (data.scheduledTransfers || []).filter(s => s.userId === userId);
  },

  createScheduledTransfer: async (st) => {
    const data = await readDb();
    if (!data.scheduledTransfers) data.scheduledTransfers = [];
    data.scheduledTransfers.push(st);
    await writeDb(data);
    return st;
  },

  deleteScheduledTransfer: async (id) => {
    const data = await readDb();
    if (!data.scheduledTransfers) data.scheduledTransfers = [];
    const index = data.scheduledTransfers.findIndex(s => s.id === id);
    if (index !== -1) {
      data.scheduledTransfers.splice(index, 1);
      await writeDb(data);
      return true;
    }
    return false;
  },

  // Payment Links methods
  getPaymentLinksByUserId: async (userId) => {
    const data = await readDb();
    return (data.paymentLinks || []).filter(p => p.userId === userId);
  },

  createPaymentLink: async (pl) => {
    const data = await readDb();
    if (!data.paymentLinks) data.paymentLinks = [];
    data.paymentLinks.push(pl);
    await writeDb(data);
    return pl;
  },

  // Support Tickets methods
  getSupportTicketsByUserId: async (userId) => {
    const data = await readDb();
    return (data.supportTickets || []).filter(s => s.userId === userId);
  },

  createSupportTicket: async (st) => {
    const data = await readDb();
    if (!data.supportTickets) data.supportTickets = [];
    data.supportTickets.push(st);
    await writeDb(data);
    return st;
  },

  // Investments methods
  getInvestmentsByUserId: async (userId) => {
    const data = await readDb();
    return (data.investments || []).filter(i => i.userId === userId);
  },

  createInvestment: async (inv) => {
    const data = await readDb();
    if (!data.investments) data.investments = [];
    data.investments.push(inv);
    await writeDb(data);
    return inv;
  }
};

module.exports = db;
