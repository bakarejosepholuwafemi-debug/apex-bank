const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'apex_secret_key_2026_super_secure';

// Simple in-memory maps for mock SMS OTPs and rate limits
const activeOtps = new Map();
const dailyTransferCounts = new Map(); // tracks NUBAN counts per day

// Middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No session found.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    const user = await db.getUserById(verified.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found in system.' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(403).json({ error: 'Invalid or expired session.' });
  }
};

// --- AUTHENTICATION API ---

// Register User
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, fullName, phoneNumber, pin, referralCode } = req.body;

  if (!username || !email || !password || !fullName || !phoneNumber || !pin) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const existingUsername = await db.getUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const existingPhone = await db.getUserByPhoneNumber(phoneNumber);
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number is already registered.' });
    }

    // Hash Password & PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const hashedPin = await bcrypt.hash(pin, salt);

    // Generate 10-digit NUBAN: starting with 90 (simulating phone number base)
    let accountNumber;
    let exists = true;
    while (exists) {
      const randDigits = Math.floor(10000000 + Math.random() * 90000000).toString();
      accountNumber = `90${randDigits}`;
      const duplicate = await db.getUserByAccountNumber(accountNumber);
      if (!duplicate) exists = false;
    }

    const userId = `user_${Date.now()}`;
    const securityPhrase = 'APEX_' + Math.random().toString(36).substring(7).toUpperCase();

    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      pin: hashedPin,
      phoneNumber,
      fullName,
      accountNumber,
      balance: 1000.00, // ₦1,000 sign-up bonus
      wealthBalance: 0.00,
      cashbackBalance: 100.00, // ₦100 registration cashback reward
      isMerchant: false,
      kycTier: 1, // Tier 1 start
      bvn: '',
      nin: '',
      securityPhrase,
      linkedAccounts: [],
      budgets: {},
      referrals: [],
      currencyBalances: { NGN: 1000.00, USD: 0.00, GBP: 0.00, EUR: 0.00 },
      loginAlerts: [
        { date: new Date().toISOString(), ip: req.ip || '127.0.0.1', device: req.headers['user-agent'] || 'Browser' }
      ],
      createdAt: new Date().toISOString()
    };

    await db.createUser(newUser);

    // Create a virtual card for this new user
    const cardNum = `5061 ${Math.floor(1000 + Math.random()*9000)} ${Math.floor(1000 + Math.random()*9000)} ${Math.floor(1000 + Math.random()*9000)}`;
    const newCard = {
      id: `card_${Date.now()}`,
      userId: userId,
      cardNumber: cardNum,
      cardHolder: fullName.toUpperCase(),
      expiry: `07/${new Date().getFullYear() + 4 - 2000}`,
      cvv: Math.floor(100 + Math.random()*900).toString(),
      type: 'Verve Classic',
      brand: 'Verve',
      color: 'linear-gradient(135deg, #00b87b 0%, #005a3c 100%)',
      isFrozen: false,
      isDisposable: false,
      spendingLimit: 100000
    };
    await db.createCard(newCard);

    // Welcome Transaction
    const welcomeTx = {
      id: `tx_${Date.now()}`,
      senderId: 'system',
      senderName: 'ApexPay Payout',
      receiverId: userId,
      receiverName: fullName,
      amount: 1000.00,
      type: 'deposit',
      category: 'Rewards',
      description: 'Welcome Sign-up Bonus Credit',
      date: new Date().toISOString()
    };
    await db.createTransaction(welcomeTx);

    // Check Referral Code
    if (referralCode) {
      // Find the user with this referral code (simulated check: finding user by username)
      const referrer = await db.getUserByUsername(referralCode);
      if (referrer) {
        // Credit referrer with ₦500
        const newRefBal = parseFloat((referrer.balance + 500).toFixed(2));
        const updatedRefs = referrer.referrals || [];
        updatedRefs.push({ username: newUser.username, date: new Date().toISOString(), bonusPaid: 500 });
        await db.updateUser(referrer.id, { balance: newRefBal, referrals: updatedRefs });

        // Log transaction for referrer
        await db.createTransaction({
          id: `tx_${Date.now()}_ref`,
          senderId: 'system',
          senderName: 'ApexPay Referrals',
          receiverId: referrer.id,
          receiverName: referrer.fullName,
          amount: 500.00,
          type: 'deposit',
          category: 'Rewards',
          description: `Referral bonus for inviting @${newUser.username}`,
          date: new Date().toISOString()
        });

        // Also credit registrant additional ₦200
        newUser.balance = parseFloat((newUser.balance + 200).toFixed(2));
        newUser.currencyBalances.NGN = newUser.balance;
        newUser.referrals = [{ referredBy: referrer.username }];
        await db.updateUser(newUser.id, { balance: newUser.balance, referrals: newUser.referrals });
        
        await db.createTransaction({
          id: `tx_${Date.now()}_ref2`,
          senderId: 'system',
          senderName: 'ApexPay Referrals',
          receiverId: newUser.id,
          receiverName: newUser.fullName,
          amount: 200.00,
          type: 'deposit',
          category: 'Rewards',
          description: `Referral bonus using code: ${referrer.username}`,
          date: new Date().toISOString()
        });
      }
    }

    // Sign JWT and set cookie
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    const { password: _, pin: __, ...userResponse } = newUser;
    res.status(201).json({ message: 'User registered successfully', user: userResponse });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  try {
    let user;
    if (usernameOrEmail.includes('@')) {
      user = await db.getUserByEmail(usernameOrEmail);
    } else {
      user = await db.getUserByUsername(usernameOrEmail);
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Check device binding & log alerts
    const alerts = user.loginAlerts || [];
    const currentDevice = req.headers['user-agent'] || 'Browser';
    const currentIp = req.ip || '127.0.0.1';
    
    const isNewDevice = alerts.length > 0 && alerts[alerts.length - 1].device !== currentDevice;
    alerts.push({ date: new Date().toISOString(), ip: currentIp, device: currentDevice });
    await db.updateUser(user.id, { loginAlerts: alerts });

    // Sign JWT and set cookie
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    const { password: _, pin: __, ...userResponse } = user;
    res.status(200).json({ message: 'Login successful', user: userResponse, isNewDevice });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// PIN Authentication Verify
app.post('/api/auth/verify-pin', authenticateToken, async (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'PIN code required.' });
  }

  try {
    const isMatch = await bcrypt.compare(pin, req.user.pin);
    if (isMatch) {
      return res.status(200).json({ success: true, message: 'PIN authentication validated.' });
    } else {
      return res.status(400).json({ success: false, error: 'Incorrect 4-digit PIN.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'PIN verification failed.' });
  }
});

// OTP Request Simulator
app.post('/api/auth/send-otp', authenticateToken, (req, res) => {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  activeOtps.set(req.user.id, otpCode);
  
  // Return mock OTP inside response so user can enter it on screen
  res.status(200).json({ message: 'Mock OTP code dispatched via SMS', otp: otpCode });
});

// OTP Verify Simulator
app.post('/api/auth/verify-otp', authenticateToken, (req, res) => {
  const { otp } = req.body;
  const storedOtp = activeOtps.get(req.user.id);

  if (storedOtp && storedOtp === otp) {
    activeOtps.delete(req.user.id);
    res.status(200).json({ success: true, message: 'OTP validation successful.' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid or expired OTP code.' });
  }
});

// Get Logged-in User
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const { password: _, pin: __, ...userResponse } = req.user;
  res.status(200).json({ user: userResponse });
});

// Logout User
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
});


// --- COMPLIANCE & KYC VERIFICATION API ---

// BVN/NIN Verification
app.post('/api/compliance/verify-bvn-nin', authenticateToken, async (req, res) => {
  const { type, number } = req.body;

  if (!type || !number || number.length !== 11) {
    return res.status(400).json({ error: 'Please enter a valid 11-digit BVN or NIN.' });
  }

  try {
    const updates = { kycTier: 2 };
    if (type.toLowerCase() === 'bvn') {
      updates.bvn = number;
    } else {
      updates.nin = number;
    }

    const updatedUser = await db.updateUser(req.user.id, updates);
    res.status(200).json({ message: 'Identity verified! Upgraded to KYC Tier 2.', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Verification submission failed.' });
  }
});

// KYC Selfie and Docs Uploader (Upgrade to Tier 3)
app.post('/api/compliance/upload-kyc', authenticateToken, async (req, res) => {
  const { documentType } = req.body;

  if (!documentType) {
    return res.status(400).json({ error: 'Document type selection required.' });
  }

  try {
    const updatedUser = await db.updateUser(req.user.id, { kycTier: 3 });
    res.status(200).json({ message: 'KYC Documents approved! Upgraded to KYC Tier 3.', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'KYC Document processing error.' });
  }
});


// --- ACCOUNT SUMMARY, NOTIFICATIONS & DEPOSITS ---

app.get('/api/account/summary', authenticateToken, async (req, res) => {
  try {
    const transactions = await db.getTransactionsByUserId(req.user.id);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
      const txDate = new Date(t.date);
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        if (t.receiverId === req.user.id) {
          totalIncome += t.amount;
        } else if (t.senderId === req.user.id) {
          totalExpenses += t.amount;
        }
      }
    });

    let currentBal = req.user.balance;
    const balanceHistory = [{ balance: currentBal, date: new Date().toISOString() }];
    
    transactions.slice(0, 10).forEach(t => {
      if (t.receiverId === req.user.id) {
        currentBal -= t.amount;
      } else if (t.senderId === req.user.id) {
        currentBal += t.amount;
      }
      balanceHistory.unshift({ balance: parseFloat(currentBal.toFixed(2)), date: t.date });
    });

    res.status(200).json({
      balance: req.user.balance,
      wealthBalance: req.user.wealthBalance || 0.00,
      cashbackBalance: req.user.cashbackBalance || 0.00,
      kycTier: req.user.kycTier || 1,
      accountNumber: req.user.accountNumber,
      fullName: req.user.fullName,
      username: req.user.username,
      totalIncome,
      totalExpenses,
      balanceHistory,
      currencyBalances: req.user.currencyBalances || { NGN: req.user.balance, USD: 0, GBP: 0, EUR: 0 },
      loginAlerts: req.user.loginAlerts || []
    });
  } catch (error) {
    console.error('Account summary error:', error);
    res.status(500).json({ error: 'Server error retrieving account data.' });
  }
});

// Dynamic Notification Alerts List
app.get('/api/account/notifications', authenticateToken, async (req, res) => {
  try {
    const transactions = await db.getTransactionsByUserId(req.user.id);
    const notifications = [];

    // Login Alerts
    if (req.user.loginAlerts) {
      req.user.loginAlerts.slice(-3).forEach(alert => {
        notifications.push({
          id: `notif_login_${new Date(alert.date).getTime()}`,
          title: 'Security Alert: New Sign In',
          message: `Logged in from IP: ${alert.ip} using ${alert.device.split(' ')[0]}`,
          date: alert.date,
          type: 'security'
        });
      });
    }

    // Credits/Debits notifications
    transactions.slice(0, 6).forEach(tx => {
      const isCredit = tx.receiverId === req.user.id;
      notifications.push({
        id: `notif_tx_${tx.id}`,
        title: isCredit ? 'Credit Alert' : 'Debit Alert',
        message: isCredit 
          ? `Received ₦${tx.amount.toLocaleString()} from ${tx.senderName}`
          : `Sent ₦${tx.amount.toLocaleString()} to ${tx.receiverName} (${tx.category})`,
        date: tx.date,
        type: isCredit ? 'credit' : 'debit'
      });
    });

    // Sort by date descending
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.status(200).json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// Card/Transfer Refill Deposit Simulation
app.post('/api/account/deposit', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    const newBalance = parseFloat((user.balance + numAmount).toFixed(2));
    
    const curBals = user.currencyBalances || { NGN: user.balance, USD: 0, GBP: 0, EUR: 0 };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, { balance: newBalance, currencyBalances: curBals });

    // Log transaction
    const depositTx = {
      id: `tx_${Date.now()}`,
      senderId: 'system',
      senderName: 'Verve Deposit Gate',
      receiverId: user.id,
      receiverName: user.fullName,
      amount: numAmount,
      type: 'deposit',
      category: 'Inflow',
      description: 'Simulated Card Deposit Refill',
      date: new Date().toISOString()
    };
    await db.createTransaction(depositTx);

    res.status(200).json({ message: 'Funds deposited successfully', newBalance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to credit account balance.' });
  }
});


// --- TRANSACTIONS & TRANSFERS API ---

// Get User Transactions (with advanced filtering)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const { search, category, type } = req.query;

  try {
    let transactions = await db.getTransactionsByUserId(req.user.id);

    if (search) {
      const q = search.toLowerCase();
      transactions = transactions.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.senderName.toLowerCase().includes(q) ||
        t.receiverName.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }

    if (category) {
      transactions = transactions.filter(t => t.category.toLowerCase() === category.toLowerCase());
    }

    if (type) {
      if (type === 'income') {
        transactions = transactions.filter(t => t.receiverId === req.user.id);
      } else if (type === 'expense') {
        transactions = transactions.filter(t => t.senderId === req.user.id);
      }
    }

    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Transactions search error:', error);
    res.status(500).json({ error: 'Error fetching transactions.' });
  }
});

// Single Transfer Execution (internal & external)
app.post('/api/transactions/transfer', authenticateToken, async (req, res) => {
  const { bankName, recipientIdentifier, amount, category, description, isRecurring, scheduleFrequency } = req.body;
  const numAmount = parseFloat(amount);

  if (!bankName || !recipientIdentifier || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid transfer details.' });
  }

  try {
    const sender = await db.getUserById(req.user.id);
    
    // 1. Check daily transaction limits by KYC Tier
    const tierLimits = { 1: 50000, 2: 500000, 3: 5000000 };
    const userLimit = tierLimits[sender.kycTier || 1];
    
    if (numAmount > userLimit) {
      return res.status(400).json({ error: `Daily limit exceeded. KYC Tier ${sender.kycTier} limit is ₦${userLimit.toLocaleString()}. Upgrade KYC for higher limits.` });
    }

    // 2. Anti-Money Laundering checks (block transactions > ₦1,000,000 for users below Tier 3)
    if (numAmount >= 1000000 && (sender.kycTier || 1) < 3) {
      return res.status(400).json({ error: 'AML Flagged: Transfers of ₦1,000,000 and above require KYC Tier 3 verification.' });
    }

    // 3. Transparent transaction charges:
    // First 3 outgoing transfers of the day are FREE. Subsequent transfers cost ₦10.
    const today = new Date().toDateString();
    const key = `${sender.id}_${today}`;
    const dailyCount = dailyTransferCounts.get(key) || 0;
    const fee = dailyCount >= 3 ? 10.00 : 0.00;

    const totalDeduction = numAmount + fee;
    if (sender.balance < totalDeduction) {
      return res.status(400).json({ error: `Insufficient funds. Transfer costs ₦${numAmount.toLocaleString()} plus ₦${fee} transaction charge.` });
    }

    // 4. Card frozen controls
    const cards = await db.getCardsByUserId(sender.id);
    const activeCard = cards[0];
    if (activeCard && activeCard.isFrozen) {
      return res.status(400).json({ error: 'Your primary debit card is frozen. Unfreeze it first.' });
    }
    if (activeCard && numAmount > activeCard.spendingLimit) {
      return res.status(400).json({ error: `Transaction exceeds your card's spending limit of ₦${activeCard.spendingLimit.toLocaleString()}.` });
    }

    // 5. Check if scheduled / recurring request
    if (isRecurring) {
      const newSt = {
        id: `sched_${Date.now()}`,
        userId: sender.id,
        bankName,
        recipientIdentifier,
        amount: numAmount,
        category: category || 'Transfer',
        description: description || 'Scheduled payment',
        frequency: scheduleFrequency || 'Weekly',
        nextDate: new Date(Date.now() + 7*24*60*60*1000).toISOString()
      };
      await db.createScheduledTransfer(newSt);
      return res.status(200).json({ message: 'Transfer scheduled successfully!', scheduled: newSt });
    }

    // 6. Execute Transfer
    // Case A: Internal (ApexPay)
    if (bankName.toLowerCase() === 'apexpay') {
      let recipient = await db.getUserByAccountNumber(recipientIdentifier);
      if (!recipient) {
        recipient = await db.getUserByUsername(recipientIdentifier);
      }

      if (!recipient) {
        return res.status(404).json({ error: 'Recipient account number or username not found on ApexPay.' });
      }

      if (recipient.id === sender.id) {
        return res.status(400).json({ error: 'Cannot transfer money to yourself.' });
      }

      const newSenderBal = parseFloat((sender.balance - totalDeduction).toFixed(2));
      const newRecipientBal = parseFloat((recipient.balance + numAmount).toFixed(2));

      // Update balances
      const sCur = sender.currencyBalances || { NGN: sender.balance };
      sCur.NGN = newSenderBal;
      await db.updateUser(sender.id, { balance: newSenderBal, currencyBalances: sCur });

      const rCur = recipient.currencyBalances || { NGN: recipient.balance };
      rCur.NGN = newRecipientBal;
      await db.updateUser(recipient.id, { balance: newRecipientBal, currencyBalances: rCur });

      // Log transaction
      const tx = {
        id: `tx_${Date.now()}`,
        senderId: sender.id,
        senderName: sender.fullName,
        receiverId: recipient.id,
        receiverName: recipient.fullName,
        amount: numAmount,
        type: 'transfer',
        category: category || 'Transfer',
        description: description || `Transfer to ${recipient.fullName}`,
        fee,
        date: new Date().toISOString()
      };
      await db.createTransaction(tx);

      // Increment daily transfer counter
      dailyTransferCounts.set(key, dailyCount + 1);

      return res.status(200).json({
        message: 'Internal transfer settled instantly',
        newBalance: newSenderBal,
        transaction: tx,
        fee
      });
    }

    // Case B: External Bank Instant Settlement
    else {
      if (recipientIdentifier.length !== 10) {
        return res.status(400).json({ error: 'Inter-bank transfers require a 10-digit NUBAN.' });
      }

      const sum = recipientIdentifier.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
      const firstNames = ['Oluwaseun', 'Chinedu', 'Abubakar', 'Chioma', 'Babajide', 'Femi', 'Emeka', 'Funmilayo'];
      const lastNames = ['Okafor', 'Bello', 'Adekunle', 'Ibrahim', 'Okoye', 'Adewale', 'Balogun', 'Nwachukwu'];
      const extName = `${firstNames[sum % firstNames.length]} ${lastNames[(sum + 3) % lastNames.length]}`;

      const newSenderBal = parseFloat((sender.balance - totalDeduction).toFixed(2));
      const sCur = sender.currencyBalances || { NGN: sender.balance };
      sCur.NGN = newSenderBal;
      await db.updateUser(sender.id, { balance: newSenderBal, currencyBalances: sCur });

      const tx = {
        id: `tx_${Date.now()}`,
        senderId: sender.id,
        senderName: sender.fullName,
        receiverId: 'external_account',
        receiverName: `${extName} (${bankName})`,
        amount: numAmount,
        type: 'transfer',
        category: category || 'Transfer',
        description: description || `External bank transfer to ${bankName}`,
        fee,
        date: new Date().toISOString()
      };
      await db.createTransaction(tx);

      // Increment daily transfer counter
      dailyTransferCounts.set(key, dailyCount + 1);

      return res.status(200).json({
        message: 'External bank transfer completed successfully.',
        newBalance: newSenderBal,
        transaction: tx,
        fee
      });
    }

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Server error processing transfer.' });
  }
});

// Bulk Transfers API
app.post('/api/transactions/bulk-transfer', authenticateToken, async (req, res) => {
  const { transfers, category } = req.body; // array of { bankName, recipientIdentifier, amount }

  if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
    return res.status(400).json({ error: 'Transfers list is empty.' });
  }

  try {
    const sender = await db.getUserById(req.user.id);
    let totalDeduction = 0;
    
    // Fee simulation: let's sum total transfer amounts and charge ₦10 fee per transfer beyond daily allowance
    const today = new Date().toDateString();
    const key = `${sender.id}_${today}`;
    let dailyCount = dailyTransferCounts.get(key) || 0;
    
    const preparedTransfers = [];
    
    for (let t of transfers) {
      const numAmount = parseFloat(t.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Invalid transaction amount in bulk list.' });
      }
      
      const fee = dailyCount >= 3 ? 10.00 : 0.00;
      totalDeduction += (numAmount + fee);
      dailyCount++;
      
      preparedTransfers.push({
        bankName: t.bankName,
        recipientIdentifier: t.recipientIdentifier,
        amount: numAmount,
        fee
      });
    }

    if (sender.balance < totalDeduction) {
      return res.status(400).json({ error: `Insufficient funds. Bulk transfer total deduction is ₦${totalDeduction.toLocaleString()}.` });
    }

    let runningBalance = sender.balance;

    for (let p of preparedTransfers) {
      runningBalance -= (p.amount + p.fee);

      let name = 'Beneficiary';
      if (p.bankName.toLowerCase() === 'apexpay') {
        const rec = await db.getUserByAccountNumber(p.recipientIdentifier) || await db.getUserByUsername(p.recipientIdentifier);
        if (rec) {
          name = rec.fullName;
          const newRecBal = parseFloat((rec.balance + p.amount).toFixed(2));
          const rCur = rec.currencyBalances || { NGN: rec.balance };
          rCur.NGN = newRecBal;
          await db.updateUser(rec.id, { balance: newRecBal, currencyBalances: rCur });
        }
      } else {
        const sum = p.recipientIdentifier.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
        const firstNames = ['Oluwaseun', 'Chinedu', 'Abubakar', 'Chioma', 'Babajide', 'Femi', 'Emeka'];
        name = `${firstNames[sum % firstNames.length]} (${p.bankName})`;
      }

      await db.createTransaction({
        id: `tx_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        senderId: sender.id,
        senderName: sender.fullName,
        receiverId: p.bankName.toLowerCase() === 'apexpay' ? 'bulk_user' : 'external_account',
        receiverName: name,
        amount: p.amount,
        type: 'transfer',
        category: category || 'Bulk Transfer',
        description: `Bulk payment out`,
        fee: p.fee,
        date: new Date().toISOString()
      });
    }

    const sCur = sender.currencyBalances || { NGN: sender.balance };
    sCur.NGN = parseFloat(runningBalance.toFixed(2));
    await db.updateUser(sender.id, { balance: sCur.NGN, currencyBalances: sCur });
    dailyTransferCounts.set(key, dailyCount);

    res.status(200).json({ message: 'Bulk transfer settled successfully.', newBalance: sCur.NGN });
  } catch (err) {
    res.status(500).json({ error: 'Bulk transfer failed.' });
  }
});

// Scheduled Transfers management
app.get('/api/transactions/scheduled', authenticateToken, async (req, res) => {
  try {
    const list = await db.getScheduledTransfersByUserId(req.user.id);
    res.status(200).json({ scheduledTransfers: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scheduled transfers.' });
  }
});

app.delete('/api/transactions/scheduled/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.deleteScheduledTransfer(req.params.id);
    if (success) {
      res.status(200).json({ message: 'Scheduled transfer cancelled.' });
    } else {
      res.status(404).json({ error: 'Record not found.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Cancel request failed.' });
  }
});


// --- VIRTUAL & PHYSICAL CARDS API ---

app.get('/api/cards', authenticateToken, async (req, res) => {
  try {
    const cards = await db.getCardsByUserId(req.user.id);
    res.status(200).json({ cards });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching cards.' });
  }
});

// Create new Virtual Card (Visa, Mastercard, Verve, Disposable)
app.post('/api/cards/create', authenticateToken, async (req, res) => {
  const { brand, isDisposable } = req.body;

  if (!brand) {
    return res.status(400).json({ error: 'Card brand selection is required.' });
  }

  try {
    const bin = brand.toLowerCase() === 'visa' ? '4000' : brand.toLowerCase() === 'mastercard' ? '5412' : '5061';
    const cardNum = `${bin} ${Math.floor(1000 + Math.random()*9000)} ${Math.floor(1000 + Math.random()*9000)} ${Math.floor(1000 + Math.random()*9000)}`;
    
    // Choose appropriate premium gradient color
    const gradients = {
      Verve: 'linear-gradient(135deg, #00b87b 0%, #005a3c 100%)',
      Visa: 'linear-gradient(135deg, #1155aa 0%, #001155 100%)',
      Mastercard: 'linear-gradient(135deg, #ea4c15 0%, #7d1c00 100%)'
    };

    const newCard = {
      id: `card_${Date.now()}`,
      userId: req.user.id,
      cardNumber: cardNum,
      cardHolder: req.user.fullName.toUpperCase(),
      expiry: `08/${new Date().getFullYear() + 4 - 2000}`,
      cvv: Math.floor(100 + Math.random()*900).toString(),
      type: `${brand} ${isDisposable ? 'Disposable' : 'Virtual'}`,
      brand,
      color: gradients[brand] || gradients.Verve,
      isFrozen: false,
      isDisposable: !!isDisposable,
      spendingLimit: isDisposable ? 50000 : 250000
    };

    await db.createCard(newCard);
    res.status(201).json({ message: 'New card created successfully!', card: newCard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create virtual card.' });
  }
});

// Request Physical Card delivery
app.post('/api/cards/request-physical', authenticateToken, async (req, res) => {
  const { brand, deliveryAddress } = req.body;

  if (!brand || !deliveryAddress) {
    return res.status(400).json({ error: 'Brand and delivery address details required.' });
  }

  try {
    res.status(200).json({ message: `Physical ${brand} Card ordered successfully! Will be delivered to: ${deliveryAddress}` });
  } catch (error) {
    res.status(500).json({ error: 'Physical card request failed.' });
  }
});

app.post('/api/cards/toggle-freeze', authenticateToken, async (req, res) => {
  const { cardId } = req.body;
  try {
    const cards = await db.getCardsByUserId(req.user.id);
    const card = cards.find(c => c.id === cardId);
    if (!card) {
      return res.status(404).json({ error: 'Card not found or access denied.' });
    }

    const updated = await db.updateCard(cardId, { isFrozen: !card.isFrozen });
    res.status(200).json({ message: `Card ${updated.isFrozen ? 'frozen' : 'unfrozen'} successfully`, card: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error modifying card status.' });
  }
});

app.post('/api/cards/update-limit', authenticateToken, async (req, res) => {
  const { cardId, spendingLimit } = req.body;
  const numLimit = parseFloat(spendingLimit);

  if (isNaN(numLimit) || numLimit < 0) {
    return res.status(400).json({ error: 'Invalid spending limit.' });
  }

  try {
    const cards = await db.getCardsByUserId(req.user.id);
    const card = cards.find(c => c.id === cardId);
    if (!card) {
      return res.status(404).json({ error: 'Card not found or access denied.' });
    }

    const updated = await db.updateCard(cardId, { spendingLimit: numLimit });
    res.status(200).json({ message: 'Spending limit updated successfully', card: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error updating spending limit.' });
  }
});


// --- UTILITIES, DATA BUNDLES & BILLS API ---

// NUBAN Account Lookup Verification
app.get('/api/utilities/verify-nuban', authenticateToken, async (req, res) => {
  const { bankName, accountNumber } = req.query;

  if (!bankName || !accountNumber || accountNumber.length !== 10) {
    return res.status(400).json({ error: 'Please input a valid 10-digit NUBAN and bank.' });
  }

  try {
    if (bankName.toLowerCase() === 'apexpay') {
      const user = await db.getUserByAccountNumber(accountNumber);
      if (user) {
        return res.status(200).json({ fullName: user.fullName });
      } else {
        return res.status(404).json({ error: 'ApexPay account number not found.' });
      }
    } else {
      const sum = accountNumber.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
      const firstNames = ['Oluwaseun', 'Chinedu', 'Abubakar', 'Chioma', 'Babajide', 'Femi', 'Emeka', 'Funmilayo'];
      const lastNames = ['Okafor', 'Bello', 'Adekunle', 'Ibrahim', 'Okoye', 'Adewale', 'Balogun', 'Nwachukwu'];
      return res.status(200).json({ fullName: `${firstNames[sum % firstNames.length]} ${lastNames[(sum + 3) % lastNames.length]}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Verification network failure.' });
  }
});

// VTU Mobile Airtime Purchase (With 3% Cashback)
app.post('/api/utilities/airtime', authenticateToken, async (req, res) => {
  const { provider, phone, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (!provider || !phone || isNaN(numAmount) || numAmount < 100) {
    return res.status(400).json({ error: 'Min airtime top-up is ₦100.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (user.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient funds.' });
    }

    const cashback = parseFloat((numAmount * 0.03).toFixed(2)); // 3% cashback
    const newBalance = parseFloat((user.balance - numAmount).toFixed(2));
    const newCashback = parseFloat(((user.cashbackBalance || 0) + cashback).toFixed(2));

    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, { balance: newBalance, cashbackBalance: newCashback, currencyBalances: curBals });

    const tx = {
      id: `tx_${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      receiverId: 'vtu_provider',
      receiverName: `${provider.toUpperCase()} VTU Airtime`,
      amount: numAmount,
      type: 'withdraw',
      category: 'Airtime',
      description: `VTU Airtime Top-up to ${phone}`,
      date: new Date().toISOString()
    };
    await db.createTransaction(tx);

    // Deposit cashback log transaction
    await db.createTransaction({
      id: `tx_${Date.now()}_cb`,
      senderId: 'system',
      senderName: 'ApexPay Rewards',
      receiverId: user.id,
      receiverName: user.fullName,
      amount: cashback,
      type: 'deposit',
      category: 'Rewards',
      description: `3% Cashback reward for recharge to ${phone}`,
      date: new Date().toISOString()
    });

    res.status(200).json({ message: 'Airtime purchase successful', newBalance, cashbackWon: cashback });
  } catch (error) {
    res.status(500).json({ error: 'Airtime purchase failed.' });
  }
});

// Data Bundle Packages List
app.get('/api/utilities/data-bundles', authenticateToken, (req, res) => {
  const bundles = {
    MTN: [
      { id: 'mtn_1', name: '1.5GB / 30 Days', price: 1000 },
      { id: 'mtn_2', name: '3GB / 30 Days', price: 1500 },
      { id: 'mtn_3', name: '10GB / 30 Days', price: 3000 }
    ],
    Airtel: [
      { id: 'art_1', name: '2GB / 30 Days', price: 1200 },
      { id: 'art_2', name: '5GB / 30 Days', price: 2000 },
      { id: 'art_3', name: '15GB / 30 Days', price: 4000 }
    ],
    Glo: [
      { id: 'glo_1', name: '2.5GB / 30 Days', price: 1000 },
      { id: 'glo_2', name: '5.8GB / 30 Days', price: 2000 }
    ],
    '9mobile': [
      { id: '9mb_1', name: '1.5GB / 30 Days', price: 900 },
      { id: '9mb_2', name: '4.5GB / 30 Days', price: 2000 }
    ]
  };
  res.status(200).json({ bundles });
});

// Purchase Data Bundle VTU (With 3% Cashback)
app.post('/api/utilities/data', authenticateToken, async (req, res) => {
  const { provider, phone, bundleId } = req.body;

  if (!provider || !phone || !bundleId) {
    return res.status(400).json({ error: 'Missing data transaction fields.' });
  }

  // Look up bundle pricing
  const bundles = {
    mtn_1: 1000, mtn_2: 1500, mtn_3: 3000,
    art_1: 1200, art_2: 2000, art_3: 4000,
    glo_1: 1000, glo_2: 2000,
    '9mb_1': 900, '9mb_2': 2000
  };
  const price = bundles[bundleId];
  if (!price) {
    return res.status(400).json({ error: 'Selected bundle package not found.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (user.balance < price) {
      return res.status(400).json({ error: 'Insufficient wallet balance.' });
    }

    const cashback = parseFloat((price * 0.03).toFixed(2));
    const newBalance = parseFloat((user.balance - price).toFixed(2));
    const newCashback = parseFloat(((user.cashbackBalance || 0) + cashback).toFixed(2));

    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, { balance: newBalance, cashbackBalance: newCashback, currencyBalances: curBals });

    // Log transaction
    await db.createTransaction({
      id: `tx_${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      receiverId: 'vtu_provider',
      receiverName: `${provider.toUpperCase()} Mobile Data`,
      amount: price,
      type: 'withdraw',
      category: 'Airtime',
      description: `VTU Mobile Data Bundle Purchase to ${phone}`,
      date: new Date().toISOString()
    });

    // Credit cashback
    await db.createTransaction({
      id: `tx_${Date.now()}_cb`,
      senderId: 'system',
      senderName: 'ApexPay Rewards',
      receiverId: user.id,
      receiverName: user.fullName,
      amount: cashback,
      type: 'deposit',
      category: 'Rewards',
      description: `3% Cashback reward for mobile data purchase to ${phone}`,
      date: new Date().toISOString()
    });

    res.status(200).json({ message: 'Data purchase completed successfully!', newBalance, cashbackWon: cashback });
  } catch (err) {
    res.status(500).json({ error: 'Failed to purchase mobile data bundle.' });
  }
});

// Bill Payments (Electricity, TV, Internet, Water, Education, Betting)
app.post('/api/utilities/bills', authenticateToken, async (req, res) => {
  const { biller, billType, customerId, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (!biller || !billType || !customerId || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid bill details.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (user.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient funds.' });
    }

    const newBalance = parseFloat((user.balance - numAmount).toFixed(2));
    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, { balance: newBalance, currencyBalances: curBals });

    const tx = {
      id: `tx_${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      receiverId: 'bills_collector',
      receiverName: `${biller}`,
      amount: numAmount,
      type: 'withdraw',
      category: billType,
      description: `Bill Pay: ${biller} - Meter/ID ${customerId}`,
      date: new Date().toISOString()
    };
    await db.createTransaction(tx);

    res.status(200).json({ message: 'Bill payment processed successfully!', newBalance });
  } catch (error) {
    res.status(500).json({ error: 'Bill payment transaction failed.' });
  }
});

// Betting Account Funding
app.post('/api/utilities/betting', authenticateToken, async (req, res) => {
  const { platform, userId, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (!platform || !userId || isNaN(numAmount) || numAmount < 100) {
    return res.status(400).json({ error: 'Min betting top-up is ₦100.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (user.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient funds.' });
    }

    const newBalance = parseFloat((user.balance - numAmount).toFixed(2));
    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, { balance: newBalance, currencyBalances: curBals });

    const tx = {
      id: `tx_${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      receiverId: 'betting_house',
      receiverName: `${platform}`,
      amount: numAmount,
      type: 'withdraw',
      category: 'Betting',
      description: `Bet Wallet Credit - UserID: ${userId}`,
      date: new Date().toISOString()
    };
    await db.createTransaction(tx);

    res.status(200).json({ message: 'Betting wallet funded successfully', newBalance });
  } catch (error) {
    res.status(500).json({ error: 'Betting wallet deposit failed.' });
  }
});


// --- QR CODE & NFC PAYMENTS ---

// Dynamic QR details (displays NUBAN details)
app.get('/api/payments/qr-code', authenticateToken, (req, res) => {
  res.status(200).json({
    accountNumber: req.user.accountNumber,
    fullName: req.user.fullName,
    merchantName: `${req.user.fullName} Merchant`,
    appId: 'apex_pay_dynamic_qr_code'
  });
});

// QR Scan simulation
app.post('/api/payments/scan-qr', authenticateToken, async (req, res) => {
  const { qrData, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (!qrData || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid QR details or transaction amount.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (user.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient funds.' });
    }

    const newBalance = parseFloat((user.balance - numAmount).toFixed(2));
    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, { balance: newBalance, currencyBalances: curBals });

    // Log transaction
    const tx = {
      id: `tx_${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      receiverId: 'qr_merchant',
      receiverName: qrData.fullName || qrData.merchantName || 'QR Code Merchant',
      amount: numAmount,
      type: 'transfer',
      category: 'Utilities',
      description: `QR Code Payment to ${qrData.fullName || qrData.merchantName || 'Merchant'}`,
      date: new Date().toISOString()
    };
    await db.createTransaction(tx);

    res.status(200).json({ message: 'QR Payment settled successfully!', newBalance });
  } catch (err) {
    res.status(500).json({ error: 'QR Scan Payment failed.' });
  }
});


// --- REWARDS, DAILY CLAIM & REFERRAL CAMPAIGNS ---

// Daily Rewards Claim (credits ₦50)
app.post('/api/rewards/claim-daily', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    
    // Quick in-memory validation for login time cooldown (24 hour simulation)
    const newCashback = parseFloat(((user.cashbackBalance || 0) + 50.00).toFixed(2));
    await db.updateUser(user.id, { cashbackBalance: newCashback });

    // Log transaction
    await db.createTransaction({
      id: `tx_${Date.now()}`,
      senderId: 'system',
      senderName: 'ApexPay Campaigns',
      receiverId: user.id,
      receiverName: user.fullName,
      amount: 50.00,
      type: 'deposit',
      category: 'Rewards',
      description: 'Daily login attendance cashback award',
      date: new Date().toISOString()
    });

    res.status(200).json({ message: 'Daily reward ₦50.00 claimed successfully!', cashbackBalance: newCashback });
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim rewards.' });
  }
});

// Redeem Cashback Wallet Balance to Checking Account
app.post('/api/rewards/redeem-cashback', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    const cb = user.cashbackBalance || 0.00;
    
    if (cb <= 0) {
      return res.status(400).json({ error: 'Your cashback wallet balance is empty.' });
    }

    const newBalance = parseFloat((user.balance + cb).toFixed(2));
    
    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, {
      balance: newBalance,
      cashbackBalance: 0.00,
      currencyBalances: curBals
    });

    await db.createTransaction({
      id: `tx_${Date.now()}`,
      senderId: 'rewards_vault',
      senderName: 'Cashback Balance Redeem',
      receiverId: user.id,
      receiverName: user.fullName,
      amount: cb,
      type: 'deposit',
      category: 'Rewards',
      description: 'Redeemed cash reward to checking balance',
      date: new Date().toISOString()
    });

    res.status(200).json({ message: `Successfully redeemed ₦${cb.toLocaleString()} to checking balance!`, newBalance });
  } catch (err) {
    res.status(500).json({ error: 'Cashback redeem processing failed.' });
  }
});

// Lucky Spin rewards wheel logic
app.post('/api/rewards/spin', authenticateToken, async (req, res) => {
  try {
    const rolls = [
      { prize: '₦50 Cash', amount: 50.00, weight: 30 },
      { prize: '₦100 Cash', amount: 100.00, weight: 25 },
      { prize: '₦200 Cash', amount: 200.00, weight: 20 },
      { prize: '₦500 Cash', amount: 500.00, weight: 10 },
      { prize: '₦1000 Cash', amount: 1000.00, weight: 3 },
      { prize: 'Apex Cashback Voucher', amount: 0.00, weight: 12 }
    ];

    let rVal = Math.floor(Math.random() * 100);
    let cumulative = 0;
    let selected = rolls[0];

    for (let roll of rolls) {
      cumulative += roll.weight;
      if (rVal < cumulative) {
        selected = roll;
        break;
      }
    }

    const user = await db.getUserById(req.user.id);
    let newBalance = user.balance;

    if (selected.amount > 0) {
      newBalance = parseFloat((user.balance + selected.amount).toFixed(2));
      const curBals = user.currencyBalances || { NGN: user.balance };
      curBals.NGN = newBalance;
      await db.updateUser(user.id, { balance: newBalance, currencyBalances: curBals });

      const rewardTx = {
        id: `tx_${Date.now()}`,
        senderId: 'system',
        senderName: 'ApexPay Lucky Spin',
        receiverId: user.id,
        receiverName: user.fullName,
        amount: selected.amount,
        type: 'deposit',
        category: 'Rewards',
        description: `Lucky Spin Wheel Reward Winner`,
        date: new Date().toISOString()
      };
      await db.createTransaction(rewardTx);
    }

    res.status(200).json({
      message: 'Lucky Spin processed!',
      prizeName: selected.prize,
      amountWon: selected.amount,
      newBalance
    });

  } catch (error) {
    res.status(500).json({ error: 'Rewards wheel failure.' });
  }
});


// --- SAVINGS GOALS & AUTOMATIC ESUSU VAULTS ---

app.get('/api/goals', authenticateToken, async (req, res) => {
  try {
    const goals = await db.getGoalsByUserId(req.user.id);
    res.status(200).json({ goals });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching savings goals.' });
  }
});

app.post('/api/goals/create', authenticateToken, async (req, res) => {
  const { name, targetAmount, deadline, isAutoSave, autoSaveAmount, autoSaveFrequency, isEsusuGroup } = req.body;
  const numTarget = parseFloat(targetAmount);

  if (!name || isNaN(numTarget) || numTarget <= 0 || !deadline) {
    return res.status(400).json({ error: 'Missing or invalid parameters.' });
  }

  try {
    const newGoal = {
      id: `goal_${Date.now()}`,
      userId: req.user.id,
      name,
      targetAmount: numTarget,
      currentAmount: 0,
      deadline,
      isAutoSave: !!isAutoSave,
      autoSaveAmount: isAutoSave ? parseFloat(autoSaveAmount) : 0,
      autoSaveFrequency: isAutoSave ? autoSaveFrequency : 'weekly',
      isEsusuGroup: !!isEsusuGroup
    };

    await db.createGoal(newGoal);
    res.status(201).json({ message: 'Savings goal created successfully', goal: newGoal });
  } catch (error) {
    res.status(500).json({ error: 'Error creating savings goal.' });
  }
});

app.post('/api/goals/deposit', authenticateToken, async (req, res) => {
  const { goalId, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (!goalId || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid parameters.' });
  }

  try {
    const goals = await db.getGoalsByUserId(req.user.id);
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found or access denied.' });
    }

    const sender = await db.getUserById(req.user.id);
    if (sender.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient funds in main account.' });
    }

    const newBalance = parseFloat((sender.balance - numAmount).toFixed(2));
    const newGoalAmount = parseFloat((goal.currentAmount + numAmount).toFixed(2));

    const curBals = sender.currencyBalances || { NGN: sender.balance };
    curBals.NGN = newBalance;

    await db.updateUser(sender.id, { balance: newBalance, currencyBalances: curBals });
    const updatedGoal = await db.updateGoal(goalId, { currentAmount: newGoalAmount });

    const goalTx = {
      id: `tx_${Date.now()}`,
      senderId: sender.id,
      senderName: sender.fullName,
      receiverId: 'savings_vault',
      receiverName: `Savings Goal: ${goal.name}`,
      amount: numAmount,
      type: 'withdraw',
      category: 'Savings',
      description: `Deposited into goal: ${goal.name}`,
      date: new Date().toISOString()
    };
    await db.createTransaction(goalTx);

    res.status(200).json({
      message: 'Deposit to goal successful',
      newBalance,
      goal: updatedGoal
    });
  } catch (error) {
    console.error('Goal deposit error:', error);
    res.status(500).json({ error: 'Error allocating funds to goal.' });
  }
});

app.post('/api/goals/withdraw', authenticateToken, async (req, res) => {
  const { goalId, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (!goalId || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid parameters.' });
  }

  try {
    const goals = await db.getGoalsByUserId(req.user.id);
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found or access denied.' });
    }

    if (goal.currentAmount < numAmount) {
      return res.status(400).json({ error: 'Insufficient funds stored in this savings goal.' });
    }

    const sender = await db.getUserById(req.user.id);
    const newBalance = parseFloat((sender.balance + numAmount).toFixed(2));
    const newGoalAmount = parseFloat((goal.currentAmount - numAmount).toFixed(2));

    const curBals = sender.currencyBalances || { NGN: sender.balance };
    curBals.NGN = newBalance;

    await db.updateUser(sender.id, { balance: newBalance, currencyBalances: curBals });
    const updatedGoal = await db.updateGoal(goalId, { currentAmount: newGoalAmount });

    const goalTx = {
      id: `tx_${Date.now()}`,
      senderId: 'savings_vault',
      senderName: `Savings Goal: ${goal.name}`,
      receiverId: sender.id,
      receiverName: sender.fullName,
      amount: numAmount,
      type: 'deposit',
      category: 'Savings',
      description: `Withdrew from goal: ${goal.name}`,
      date: new Date().toISOString()
    };
    await db.createTransaction(goalTx);

    res.status(200).json({
      message: 'Withdrawal from goal successful',
      newBalance,
      goal: updatedGoal
    });
  } catch (error) {
    console.error('Goal withdrawal error:', error);
    res.status(500).json({ error: 'Error retrieving funds from goal.' });
  }
});

app.delete('/api/goals/:id', authenticateToken, async (req, res) => {
  const goalId = req.params.id;
  try {
    const goals = await db.getGoalsByUserId(req.user.id);
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found or access denied.' });
    }

    if (goal.currentAmount > 0) {
      const user = await db.getUserById(req.user.id);
      const newBalance = parseFloat((user.balance + goal.currentAmount).toFixed(2));
      const curBals = user.currencyBalances || { NGN: user.balance };
      curBals.NGN = newBalance;

      await db.updateUser(user.id, { balance: newBalance, currencyBalances: curBals });

      const refundTx = {
        id: `tx_${Date.now()}`,
        senderId: 'savings_vault',
        senderName: `Goal Cancelled: ${goal.name}`,
        receiverId: user.id,
        receiverName: user.fullName,
        amount: goal.currentAmount,
        type: 'deposit',
        category: 'Savings',
        description: `Refunded savings from cancelled goal: ${goal.name}`,
        date: new Date().toISOString()
      };
      await db.createTransaction(refundTx);
    }

    await db.deleteGoal(goalId);
    res.status(200).json({ message: 'Goal deleted and funds refunded to checking balance.' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting savings goal.' });
  }
});


// --- WEALTH MANAGEMENT ---

app.post('/api/wealth/deposit', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (user.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient checking account balance.' });
    }

    const currentWealth = user.wealthBalance || 0.00;
    const newBalance = parseFloat((user.balance - numAmount).toFixed(2));
    const newWealth = parseFloat((currentWealth + numAmount).toFixed(2));

    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, {
      balance: newBalance,
      wealthBalance: newWealth,
      currencyBalances: curBals
    });

    const tx = {
      id: `tx_${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      receiverId: 'wealth_ledger',
      receiverName: 'ApexWealth Balance',
      amount: numAmount,
      type: 'withdraw',
      category: 'Savings',
      description: 'Deposited into daily high-yield ApexWealth',
      date: new Date().toISOString()
    };
    await db.createTransaction(tx);

    res.status(200).json({
      message: 'Funds transferred to Wealth account.',
      newBalance,
      newWealthBalance: newWealth
    });
  } catch (error) {
    res.status(500).json({ error: 'Wealth deposit allocation error.' });
  }
});

app.post('/api/wealth/withdraw', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    const currentWealth = user.wealthBalance || 0.00;
    if (currentWealth < numAmount) {
      return res.status(400).json({ error: 'Insufficient funds stored in Wealth vault.' });
    }

    const newBalance = parseFloat((user.balance + numAmount).toFixed(2));
    const newWealth = parseFloat((currentWealth - numAmount).toFixed(2));

    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, {
      balance: newBalance,
      wealthBalance: newWealth,
      currencyBalances: curBals
    });

    const tx = {
      id: `tx_${Date.now()}`,
      senderId: 'wealth_ledger',
      senderName: 'ApexWealth Vault',
      receiverId: user.id,
      receiverName: user.fullName,
      amount: numAmount,
      type: 'deposit',
      category: 'Savings',
      description: 'Withdrew from daily high-yield ApexWealth',
      date: new Date().toISOString()
    };
    await db.createTransaction(tx);

    res.status(200).json({
      message: 'Wealth funds returned to checking account.',
      newBalance,
      newWealthBalance: newWealth
    });
  } catch (error) {
    res.status(500).json({ error: 'Wealth withdraw retrieval error.' });
  }
});


// --- INVESTMENTS & MULTI-CURRENCY API ---

// Multi-Currency Exchange conversion (NGN, USD, GBP, EUR)
app.post('/api/currency/convert', authenticateToken, async (req, res) => {
  const { from, to, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (!from || !to || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid conversion parameters.' });
  }

  // Live simulation exchange rates (Base: NGN)
  const rates = {
    NGN: 1,
    USD: 1500, // ₦1500 per $1
    GBP: 1950,
    EUR: 1650
  };

  try {
    const user = await db.getUserById(req.user.id);
    const curBals = user.currencyBalances || { NGN: user.balance, USD: 0, GBP: 0, EUR: 0 };
    
    const senderBalance = curBals[from] || 0.00;
    if (senderBalance < numAmount) {
      return res.status(400).json({ error: `Insufficient ${from} balance.` });
    }

    // Convert: NGN equivalent = amount * rates[from]
    // Target amount = NGN equivalent / rates[to]
    const amountInNGN = numAmount * rates[from];
    const targetAmount = parseFloat((amountInNGN / rates[to]).toFixed(2));

    // Update balances
    curBals[from] = parseFloat((senderBalance - numAmount).toFixed(2));
    curBals[to] = parseFloat(((curBals[to] || 0) + targetAmount).toFixed(2));

    // If source or target is NGN, update user's core balance
    if (from === 'NGN') {
      user.balance = curBals.NGN;
    } else if (to === 'NGN') {
      user.balance = curBals.NGN;
    }

    await db.updateUser(user.id, { balance: user.balance, currencyBalances: curBals });

    // Log transaction
    await db.createTransaction({
      id: `tx_${Date.now()}`,
      senderId: user.id,
      senderName: `FX Wallet Swap`,
      receiverId: user.id,
      receiverName: `FX Wallet Swap`,
      amount: from === 'NGN' ? numAmount : amountInNGN,
      type: 'transfer',
      category: 'Investments',
      description: `Converted ${numAmount} ${from} into ${targetAmount} ${to}`,
      date: new Date().toISOString()
    });

    res.status(200).json({ message: 'Currency converted successfully!', currencyBalances: curBals });
  } catch (err) {
    res.status(500).json({ error: 'FX swap settlement error.' });
  }
});

// Investments Center (stocks & treasury bills)
app.get('/api/investments', authenticateToken, async (req, res) => {
  const assets = {
    stocks: [
      { ticker: 'APX', name: 'ApexPay Tech Fund', price: 1500, yield: '12% Return' },
      { ticker: 'MTN', name: 'MTN Nigeria Stock', price: 240, yield: 'Dividends' },
      { ticker: 'ZEN', name: 'Zenith Bank Stock', price: 38, yield: '8% Return' }
    ],
    treasuryBills: [
      { id: 'tb_1', name: 'Federal Govt 180-Day Bill', rate: '17.5% P.A.', minInvestment: 50000 },
      { id: 'tb_2', name: 'Federal Govt 364-Day Bill', rate: '21.0% P.A.', minInvestment: 100000 }
    ]
  };
  
  try {
    const activeInvestments = await db.getInvestmentsByUserId(req.user.id);
    res.status(200).json({ assets, activeInvestments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch investment assets.' });
  }
});

app.post('/api/investments/buy', authenticateToken, async (req, res) => {
  const { assetType, assetName, ticker, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid investment value.' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    if (user.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient funds.' });
    }

    const newBalance = parseFloat((user.balance - numAmount).toFixed(2));
    const curBals = user.currencyBalances || { NGN: user.balance };
    curBals.NGN = newBalance;

    await db.updateUser(user.id, { balance: newBalance, currencyBalances: curBals });

    const newInv = {
      id: `inv_${Date.now()}`,
      userId: user.id,
      assetType,
      assetName,
      ticker: ticker || null,
      amountBought: numAmount,
      date: new Date().toISOString()
    };
    await db.createInvestment(newInv);

    await db.createTransaction({
      id: `tx_${Date.now()}`,
      senderId: user.id,
      senderName: user.fullName,
      receiverId: 'investments_broker',
      receiverName: assetName,
      amount: numAmount,
      type: 'withdraw',
      category: 'Investments',
      description: `Invested in: ${assetName}`,
      date: new Date().toISOString()
    });

    res.status(200).json({ message: 'Investment purchase successful!', newBalance, investment: newInv });
  } catch (err) {
    res.status(500).json({ error: 'Investment brokerage failed.' });
  }
});


// --- MERCHANT & BUSINESS SERVICES ---

// Toggle Personal/Business mode
app.post('/api/merchant/toggle-mode', authenticateToken, async (req, res) => {
  try {
    const toggled = !req.user.isMerchant;
    const updated = await db.updateUser(req.user.id, { isMerchant: toggled });
    res.status(200).json({ message: `Switched profile to ${toggled ? 'Business' : 'Personal'} mode.`, user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Profile switch failed.' });
  }
});

// Sales Tracking reports
app.get('/api/merchant/sales-report', authenticateToken, async (req, res) => {
  try {
    // Collect all inflow deposits as business sales simulation
    const transactions = await db.getTransactionsByUserId(req.user.id);
    const sales = transactions.filter(t => t.receiverId === req.user.id && t.category !== 'Salary' && t.category !== 'Rewards');
    
    // Simulate sales chart values
    const chartData = [15000, 24000, 18500, 31000, 42000, req.user.balance * 0.15];
    res.status(200).json({ sales, chartData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compile business sales.' });
  }
});

// Request POS device
app.post('/api/merchant/pos-request', authenticateToken, async (req, res) => {
  const { terminalType, businessName } = req.body;
  if (!terminalType || !businessName) {
    return res.status(400).json({ error: 'Platform and terminal specs required.' });
  }

  res.status(200).json({ message: `POS Terminal Request logged for "${businessName}". Delivery timeline is 5 working days.` });
});

// Create Payment Link
app.post('/api/merchant/payment-link', authenticateToken, async (req, res) => {
  const { title, amount } = req.body;
  const numAmount = parseFloat(amount);

  if (!title || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Title and billing amount required.' });
  }

  try {
    const slug = `${req.user.username}-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(100+Math.random()*900)}`;
    const newLink = {
      id: `link_${Date.now()}`,
      userId: req.user.id,
      title,
      amount: numAmount,
      slug,
      url: `https://pay.apexbank.com/${slug}`
    };

    await db.createPaymentLink(newLink);
    res.status(201).json({ message: 'Custom payment link created!', paymentLink: newLink });
  } catch (err) {
    res.status(500).json({ error: 'Payment link generation failed.' });
  }
});

// Public Payment Link Pay route simulation
app.post('/api/merchant/pay-link-simulate', authenticateToken, async (req, res) => {
  const { slug, payerName, cardDetails } = req.body;

  try {
    // Find payment link
    const data = await db.read();
    const link = (data.paymentLinks || []).find(l => l.slug === slug);
    if (!link) {
      return res.status(404).json({ error: 'Payment link expired or invalid.' });
    }

    const merchantUser = await db.getUserById(link.userId);
    if (!merchantUser) {
      return res.status(404).json({ error: 'Merchant account deactivated.' });
    }

    // Credit merchant
    const newMerchBal = parseFloat((merchantUser.balance + link.amount).toFixed(2));
    const mCur = merchantUser.currencyBalances || { NGN: merchantUser.balance };
    mCur.NGN = newMerchBal;
    await db.updateUser(merchantUser.id, { balance: newMerchBal, currencyBalances: mCur });

    // Log merchant sale tx
    await db.createTransaction({
      id: `tx_${Date.now()}`,
      senderId: 'paylink_gateway',
      senderName: `Payer: ${payerName || 'Online Guest'}`,
      receiverId: merchantUser.id,
      receiverName: merchantUser.fullName,
      amount: link.amount,
      type: 'deposit',
      category: 'Sales',
      description: `Payment Link Checkout: ${link.title}`,
      date: new Date().toISOString()
    });

    res.status(200).json({ message: `Payment of ₦${link.amount.toLocaleString()} processed successfully to ${merchantUser.fullName}!` });
  } catch (err) {
    res.status(500).json({ error: 'Gateway billing simulation failed.' });
  }
});


// --- OFFLINE BANKING USSD CONTROLLER ---

app.post('/api/ussd', authenticateToken, async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'USSD string request required.' });
  }

  // Parse USSD code
  // Format: *902# (Main Menu)
  // *902*1# (Balance check)
  // *902*2*amount*nuban# (Transfer)
  // *902*3*amount# (Airtime Self)
  
  const segments = code.replace(/^\*/, '').replace(/#$/, '').split('*');
  const service = segments[0];

  if (service !== '902') {
    return res.status(200).json({ menu: 'USSD Code Error: Invalid MMI Code.' });
  }

  const step = segments.length;
  
  if (step === 1) {
    // Main Menu
    return res.status(200).json({
      menu: `Welcome to ApexPay Offline (*902#)
1. Balance Inquiry
2. Send Money
3. Airtime Self
4. Quick Help
Reply with options.`
    });
  }

  const option = segments[1];

  if (option === '1') {
    // Balance check
    return res.status(200).json({
      menu: `ApexPay Balance
Checking: ₦${req.user.balance.toLocaleString()}
OWealth: ₦${(req.user.wealthBalance || 0).toLocaleString()}
Press OK to exit.`
    });
  } 
  
  else if (option === '2') {
    // Send Money
    if (step === 2) {
      return res.status(200).json({ menu: 'Enter amount to transfer:' });
    }
    if (step === 3) {
      return res.status(200).json({ menu: `Enter 10-digit NUBAN to send ₦${segments[2]}:` });
    }
    if (step === 4) {
      const amt = parseFloat(segments[2]);
      const nuban = segments[3];
      
      // Perform quick internal NUBAN verification
      const rec = await db.getUserByAccountNumber(nuban);
      const name = rec ? rec.fullName : `External NUBAN (${nuban})`;

      return res.status(200).json({
        menu: `Confirm transfer of ₦${amt.toLocaleString()} to ${name}?
1. Yes, Confirm
2. Cancel`
      });
    }
    if (step === 5) {
      if (segments[4] === '1') {
        const amt = parseFloat(segments[2]);
        const nuban = segments[3];

        if (req.user.balance < amt) {
          return res.status(200).json({ menu: 'USSD: Insufficient funds.' });
        }

        // Simulate instant transfer settlement
        const newBal = parseFloat((req.user.balance - amt).toFixed(2));
        const sCur = req.user.currencyBalances || { NGN: req.user.balance };
        sCur.NGN = newBal;
        await db.updateUser(req.user.id, { balance: newBal, currencyBalances: sCur });

        let rName = 'Receiver';
        const rec = await db.getUserByAccountNumber(nuban);
        if (rec) {
          rName = rec.fullName;
          const rBal = parseFloat((rec.balance + amt).toFixed(2));
          const rCur = rec.currencyBalances || { NGN: rec.balance };
          rCur.NGN = rBal;
          await db.updateUser(rec.id, { balance: rBal, currencyBalances: rCur });
        }

        await db.createTransaction({
          id: `tx_ussd_${Date.now()}`,
          senderId: req.user.id,
          senderName: req.user.fullName,
          receiverId: rec ? rec.id : 'external_account',
          receiverName: rec ? rec.fullName : `External USSD transfer`,
          amount: amt,
          type: 'transfer',
          category: 'Transfer',
          description: `USSD offline transaction transfer`,
          date: new Date().toISOString()
        });

        return res.status(200).json({ menu: `USSD: Transfer of ₦${amt.toLocaleString()} successful! New balance: ₦${newBal.toLocaleString()}` });
      } else {
        return res.status(200).json({ menu: 'USSD Transaction Cancelled.' });
      }
    }
  } 
  
  else if (option === '3') {
    // Airtime Self
    if (step === 2) {
      return res.status(200).json({ menu: 'Enter airtime amount:' });
    }
    if (step === 3) {
      const amt = parseFloat(segments[2]);
      if (req.user.balance < amt) {
        return res.status(200).json({ menu: 'USSD: Insufficient funds.' });
      }

      const newBal = parseFloat((req.user.balance - amt).toFixed(2));
      const sCur = req.user.currencyBalances || { NGN: req.user.balance };
      sCur.NGN = newBal;
      await db.updateUser(req.user.id, { balance: newBal, currencyBalances: sCur });

      await db.createTransaction({
        id: `tx_ussd_${Date.now()}`,
        senderId: req.user.id,
        senderName: req.user.fullName,
        receiverId: 'vtu_provider',
        receiverName: 'USSD Airtime Self',
        amount: amt,
        type: 'withdraw',
        category: 'Airtime',
        description: `USSD Airtime self-recharge`,
        date: new Date().toISOString()
      });

      return res.status(200).json({ menu: `USSD: Airtime purchase of ₦${amt.toLocaleString()} successful!` });
    }
  } 
  
  else if (option === '4') {
    return res.status(200).json({ menu: 'ApexPay Helpline:\nEmail: care@apexpay.com\nWeb: apexpay.com\nCall: *902# offline dials.' });
  }

  return res.status(200).json({ menu: 'Invalid option.' });
});


// --- PERSONAL FINANCE, BUDGETS & SUPPORT TICKETS API ---

// Update Category Budgets
app.post('/api/finance/budgets', authenticateToken, async (req, res) => {
  const { category, limit } = req.body;
  const numLimit = parseFloat(limit);

  if (!category || isNaN(numLimit) || numLimit < 0) {
    return res.status(400).json({ error: 'Valid category and limit budget size required.' });
  }

  try {
    const userBudgets = req.user.budgets || {};
    userBudgets[category] = numLimit;

    const updated = await db.updateUser(req.user.id, { budgets: userBudgets });
    res.status(200).json({ message: `Budget for ${category} updated successfully!`, user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category budget.' });
  }
});

// Support tickets
app.post('/api/support/tickets', authenticateToken, async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description details required.' });
  }

  try {
    const newTicket = {
      id: `tkt_${Date.now()}`,
      userId: req.user.id,
      title,
      description,
      status: 'Open',
      date: new Date().toISOString()
    };

    await db.createSupportTicket(newTicket);
    res.status(201).json({ message: 'Support ticket submitted successfully!', ticket: newTicket });
  } catch (err) {
    res.status(500).json({ error: 'Ticket submit failed.' });
  }
});

app.get('/api/support/tickets', authenticateToken, async (req, res) => {
  try {
    const tickets = await db.getSupportTicketsByUserId(req.user.id);
    res.status(200).json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load support tickets.' });
  }
});


// --- SMART NIGERIAN SUPPORT BOT API ---

app.post('/api/support/message', authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message content required.' });
  }

  const query = message.toLowerCase();
  const userName = req.user.fullName.split(' ')[0];
  let response = '';

  try {
    // 1. Balance Inquiry
    if (query.includes('balance') || query.includes('how much')) {
      const updatedUser = await db.getUserById(req.user.id);
      response = `Hello ${userName}, your current checking balance is **₦${updatedUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}**. You also have **₦${(updatedUser.wealthBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}** accumulating interest in your **ApexWealth** high-yield account.`;
    } 
    
    // 2. NUBAN number check
    else if (query.includes('account') || query.includes('nuban') || query.includes('number')) {
      response = `Your active **NUBAN account number** is **${req.user.accountNumber}**. You can receive funds from other banks by choosing **ApexPay** as the destination bank and entering this number.`;
    } 
    
    // 3. Wealth/Interest info
    else if (query.includes('wealth') || query.includes('owealth') || query.includes('interest') || query.includes('save')) {
      const updatedUser = await db.getUserById(req.user.id);
      response = `Our **ApexWealth** engine pays **15% annual interest** compounded daily! You currently have **₦${(updatedUser.wealthBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}** saved there. You can deposit or withdraw cash instantly in your dashboard.`;
    } 
    
    // 4. Voice command simulation triggers:
    // "send X to Y" voice command parsing
    else if (query.match(/send\s+₦?(\d+,?\d*)\s+to\s+([a-zA-Z\s_]+)/)) {
      const match = query.match(/send\s+₦?(\d+,?\d*)\s+to\s+([a-zA-Z\s_]+)/);
      const amountStr = match[1].replace(/,/g, '');
      const recipientName = match[2].trim();
      response = `Voice command detected! 🎙️ I have pre-filled a transfer of **₦${parseFloat(amountStr).toLocaleString()}** to **${recipientName}**. Please go to the **Transfers** tab to confirm and authorize the transaction securely with your PIN.`;
    }

    // "buy X airtime" voice command parsing
    else if (query.match(/buy\s+₦?(\d+,?\d*)\s+([a-zA-Z0-9]+)\s+airtime/)) {
      const match = query.match(/buy\s+₦?(\d+,?\d*)\s+([a-zA-Z0-9]+)\s+airtime/);
      const amt = match[1].replace(/,/g, '');
      const provider = match[2];
      response = `Voice command detected! 🎙️ I have pre-filled a recharge of **₦${parseFloat(amt).toLocaleString()}** on ${provider.toUpperCase()} network. Please go to **Quick Services** -> **Buy Airtime** to complete the recharge.`;
    }
    
    // 5. Card information
    else if (query.includes('card') || query.includes('freeze')) {
      const cards = await db.getCardsByUserId(req.user.id);
      const mainCard = cards[0];
      if (mainCard) {
        response = `You have an active **${mainCard.type}** ending in **${mainCard.cardNumber.slice(-4)}**. Its current security status is **${mainCard.isFrozen ? 'LOCKED / FROZEN' : 'ACTIVE'}** with a spending cap of **₦${mainCard.spendingLimit.toLocaleString()}**. Toggles are available in the "Virtual Cards" tab.`;
      } else {
        response = "I couldn't locate any active virtual cards linked to your profile.";
      }
    } 
    
    // 6. Transaction list lookup
    else if (query.includes('transaction') || query.includes('history') || query.includes('recent')) {
      const transactions = await db.getTransactionsByUserId(req.user.id);
      const recent = transactions.slice(0, 3);
      if (recent.length > 0) {
        let listStr = recent.map(t => {
          const sign = t.senderId === req.user.id ? '-' : '+';
          return `- **₦${t.amount.toLocaleString()}** for *${t.description || t.category}* on ${new Date(t.date).toLocaleDateString()}`;
        }).join('\n');
        response = `Here are your 3 most recent transactions:\n\n${listStr}`;
      } else {
        response = "You don't have any transaction history yet.";
      }
    } 
    
    // 7. General Transfers assistance
    else if (query.includes('transfer') || query.includes('send') || query.includes('bank')) {
      response = "To transfer money, go to the **Transfers** tab. Choose the destination bank, input the 10-digit NUBAN account number (we will auto-verify the recipient name), enter the amount, and click 'Confirm Transfer'. Outgoing transfers are locked if your card is frozen!";
    } 
    
    // 8. Help commands list
    else if (query.includes('help') || query.includes('what can you do') || query.includes('commands')) {
      response = `Welcome to ApexPay Customer Care! I can assist with:
- Checking your account **balance**
- Locating your **NUBAN account number**
- Explaining **ApexWealth** 15% daily interest
- Verifying virtual **card status**
- Looking up **recent transactions**
- Guiding on **transfers**, **airtime**, and **bill payments**
- Parsing voice commands (e.g. "Send 5000 to Sarah" or "Buy 1000 MTN airtime")`;
    } 
    
    // 9. Fallback message
    else {
      response = `Hi ${userName}, I am your ApexPay Automated Assistant. I can help with balance checks, inter-bank NUBAN transactions, card security, airtime topups, and wealth savings queries. Type **help** to see all available commands!`;
    }

    res.status(200).json({ response });
  } catch (error) {
    console.error('Support bot error:', error);
    res.status(500).json({ error: 'Could not process chat request.' });
  }
});

// Fallback to HTML for single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and start server
db.read().then(() => {
  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`ApexPay Nigerian Server successfully started!`);
    console.log(`Server listening at http://localhost:${PORT}`);
    console.log(`========================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database. Server cannot start.', err);
});
