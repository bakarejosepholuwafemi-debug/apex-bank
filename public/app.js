/* ==========================================================================
   ApexPay Frontend Controller - app.js (Nigerian Fintech Refactoring)
   ========================================================================== */

// Global State
const state = {
  user: null,
  activeTab: 'overview',
  cards: [],
  goals: [],
  transactions: [],
  wealthInterestEarned: 0.00,
  wealthTickerInterval: null,
  isSpinning: false,
  charts: {
    balance: null,
    category: null
  }
};

// --- DOM ELEMENTS ---
const elements = {
  authContainer: document.getElementById('auth-container'),
  appContainer: document.getElementById('app-container'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  authTitle: document.getElementById('auth-title'),
  authSubtitle: document.getElementById('auth-subtitle'),
  toggleToRegister: document.getElementById('toggle-to-register'),
  toggleToLogin: document.getElementById('toggle-to-login'),
  
  // Navigation & Shell
  navItems: document.querySelectorAll('.nav-item'),
  tabContents: document.querySelectorAll('.tab-content'),
  sidebar: document.querySelector('.sidebar'),
  sidebarOpenBtn: document.getElementById('sidebar-open'),
  sidebarCloseBtn: document.getElementById('sidebar-close'),
  btnLogout: document.getElementById('btn-logout'),
  headerUserName: document.getElementById('header-user-name'),
  profileFullname: document.getElementById('profile-fullname'),
  profileUsername: document.getElementById('profile-username'),
  avatarInitials: document.getElementById('user-avatar-initials'),
  toastContainer: document.getElementById('toast-container'),

  // Overview / Dashboard
  dashBalance: document.getElementById('dashboard-balance'),
  dashAccNum: document.getElementById('dashboard-acc-num'),
  dashIncome: document.getElementById('dashboard-income'),
  dashExpense: document.getElementById('dashboard-expense'),
  dashTxList: document.getElementById('dashboard-transactions-list'),
  btnCopyAcc: document.getElementById('btn-copy-acc'),
  
  // Quick Wealth widgets
  dashWealthBalance: document.getElementById('dashboard-wealth-balance'),
  wealthInterestEarnedLabel: document.getElementById('wealth-interest-earned'),
  btnWealthDeposit: document.getElementById('btn-wealth-deposit'),
  btnWealthWithdraw: document.getElementById('btn-wealth-withdraw'),
  
  // Fast Transfer Shortcut
  quickTransferForm: document.getElementById('quick-transfer-form'),
  quickBank: document.getElementById('quick-bank'),
  quickRecipient: document.getElementById('quick-recipient'),
  quickAmount: document.getElementById('quick-amount'),
  
  // Transfers panel
  mainTransferForm: document.getElementById('main-transfer-form'),
  transferBank: document.getElementById('transfer-bank'),
  transferRecipient: document.getElementById('transfer-recipient'),
  btnVerifyRecipient: document.getElementById('btn-verify-recipient'),
  recipientVerifyStatus: document.getElementById('recipient-verify-status'),
  transferAmount: document.getElementById('transfer-amount'),
  transferCategory: document.getElementById('transfer-category'),
  transferDescription: document.getElementById('transfer-description'),
  contactsList: document.getElementById('transfer-contacts-list'),

  // Virtual Cards
  virtualCard: document.getElementById('apex-virtual-card'),
  cardDispNum: document.getElementById('card-display-number'),
  cardDispName: document.getElementById('card-display-name'),
  cardDispExpiry: document.getElementById('card-display-expiry'),
  cardDispCvv: document.getElementById('card-display-cvv'),
  cardDispCvvBack: document.getElementById('card-display-cvv-back'),
  cardFreezeToggle: document.getElementById('card-freeze-toggle'),
  cardLimitSlider: document.getElementById('card-limit-slider'),
  cardLimitDisplay: document.getElementById('card-limit-display'),
  btnSaveLimit: document.getElementById('btn-save-limit'),
  skinOptions: document.querySelectorAll('.skin-option'),

  // Savings Goals
  goalsContainer: document.getElementById('goals-container'),
  btnOpenCreateGoal: document.getElementById('btn-open-create-goal'),
  goalModal: document.getElementById('goal-modal'),
  btnCloseGoalModal: document.getElementById('btn-close-goal-modal'),
  createGoalForm: document.getElementById('create-goal-form'),
  goalNameInput: document.getElementById('goal-name'),
  goalTargetInput: document.getElementById('goal-target'),
  goalDeadlineInput: document.getElementById('goal-deadline'),
  
  // Goal deposit/withdraw modal
  goalTxModal: document.getElementById('goal-tx-modal'),
  btnCloseGoalTxModal: document.getElementById('btn-close-goal-tx-modal'),
  goalTxForm: document.getElementById('goal-transaction-form'),
  goalTxId: document.getElementById('goal-tx-id'),
  goalTxActionType: document.getElementById('goal-tx-action-type'),
  goalTxTitle: document.getElementById('goal-tx-title'),
  goalTxDescription: document.getElementById('goal-tx-description'),
  goalTxAmount: document.getElementById('goal-tx-amount'),
  goalTxAvailableHint: document.getElementById('goal-tx-available-hint'),
  btnGoalTxSubmit: document.getElementById('btn-goal-tx-submit'),

  // Wealth deposit/withdraw modal
  wealthTxModal: document.getElementById('wealth-tx-modal'),
  btnCloseWealthModal: document.getElementById('btn-close-wealth-modal'),
  wealthTxForm: document.getElementById('wealth-transaction-form'),
  wealthTxActionType: document.getElementById('wealth-tx-action-type'),
  wealthTxTitle: document.getElementById('wealth-tx-title'),
  wealthTxDescription: document.getElementById('wealth-tx-description'),
  wealthTxAmount: document.getElementById('wealth-tx-amount'),
  wealthTxAvailableHint: document.getElementById('wealth-tx-available-hint'),
  btnWealthTxSubmit: document.getElementById('btn-wealth-tx-submit'),

  // Utilities payments launcher
  utilitiesModal: document.getElementById('utilities-modal'),
  btnCloseUtilitiesModal: document.getElementById('btn-close-utilities-modal'),
  utilTabBtns: document.querySelectorAll('.util-tab-btn'),
  utilFormPanels: document.querySelectorAll('.util-form-panel'),
  
  // Utility Specific forms
  formAirtime: document.getElementById('util-form-airtime'),
  formCable: document.getElementById('util-form-cable'),
  formElectricity: document.getElementById('util-form-electricity'),
  formBetting: document.getElementById('util-form-betting'),

  // Rewards wheel modal
  rewardsModal: document.getElementById('rewards-modal'),
  btnCloseRewardsModal: document.getElementById('btn-close-rewards-modal'),
  btnTriggerSpin: document.getElementById('btn-trigger-spin'),
  wheelObject: document.getElementById('rewards-wheel-object'),

  // Statement / Ledger
  txSearchInput: document.getElementById('tx-search-input'),
  txFilterType: document.getElementById('tx-filter-type'),
  txFilterCategory: document.getElementById('tx-filter-category'),
  txTableBody: document.getElementById('transactions-table-body'),
  txEmptyState: document.getElementById('tx-empty-state'),
  btnExportCsv: document.getElementById('btn-export-csv'),

  // AI Support Bot Chat
  chatDrawer: document.getElementById('chat-drawer'),
  btnToggleChat: document.getElementById('btn-toggle-chat'),
  btnCloseChat: document.getElementById('btn-close-chat'),
  chatMessagesContainer: document.getElementById('chat-messages-container'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  chatBadgeDot: document.querySelector('.chat-badge-dot'),

  // Mock Card Deposit
  cardDepositModal: document.getElementById('card-deposit-modal'),
  btnMockDeposit: document.getElementById('btn-mock-deposit'),
  btnCloseDepositModal: document.getElementById('btn-close-deposit-modal'),
  mockDepositForm: document.getElementById('mock-deposit-form'),
  depositAmount: document.getElementById('deposit-amount')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  checkAuthSession();
  setupEventListeners();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  elements.goalDeadlineInput.min = tomorrow.toISOString().split('T')[0];
});

// --- TOAST NOTIFICATIONS ---
function showToast(title, message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// --- UTILITIES ---
function formatMoney(amount) {
  return parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// --- SESSION CHECK ---
async function checkAuthSession() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      loginSuccess(data.user);
    } else {
      showAuthScreen();
    }
  } catch (error) {
    showAuthScreen();
  }
}

function loginSuccess(user) {
  state.user = user;
  elements.authContainer.classList.add('hidden');
  elements.appContainer.classList.remove('hidden');
  
  elements.headerUserName.textContent = user.fullName.split(' ')[0];
  elements.profileFullname.textContent = user.fullName;
  elements.profileUsername.textContent = `@${user.username}`;
  elements.avatarInitials.textContent = getInitials(user.fullName);
  
  refreshAllData();
  switchTab('overview');
  
  // Start ApexWealth Real-time interest accumulator loop
  startWealthTicker();
}

function showAuthScreen() {
  state.user = null;
  stopWealthTicker();
  elements.appContainer.classList.add('hidden');
  elements.authContainer.classList.remove('hidden');
}

// --- DATA REFRESH ---
async function refreshAllData() {
  if (!state.user) return;
  await Promise.all([
    fetchAccountSummary(),
    fetchCards(),
    fetchGoals(),
    fetchTransactions()
  ]);
}

async function fetchAccountSummary() {
  try {
    const res = await fetch('/api/account/summary');
    if (res.ok) {
      const data = await res.json();
      elements.dashBalance.textContent = formatMoney(data.balance);
      elements.dashAccNum.textContent = data.accountNumber;
      elements.dashWealthBalance.textContent = formatMoney(data.wealthBalance);
      elements.dashIncome.textContent = formatMoney(data.totalIncome);
      elements.dashExpense.textContent = formatMoney(data.totalExpenses);
      
      state.user.balance = data.balance;
      state.user.wealthBalance = data.wealthBalance;
      
      renderBalanceChart(data.balanceHistory);
    }
  } catch (error) {
    console.error('Failed to load account summary:', error);
  }
}

async function fetchCards() {
  try {
    const res = await fetch('/api/cards');
    if (res.ok) {
      const data = await res.json();
      state.cards = data.cards;
      renderCardUI();
    }
  } catch (error) {
    console.error('Failed to load cards:', error);
  }
}

async function fetchGoals() {
  try {
    const res = await fetch('/api/goals');
    if (res.ok) {
      const data = await res.json();
      state.goals = data.goals;
      renderGoalsUI();
    }
  } catch (error) {
    console.error('Failed to load goals:', error);
  }
}

async function fetchTransactions() {
  try {
    const query = new URLSearchParams();
    const searchVal = elements.txSearchInput.value;
    const typeVal = elements.txFilterType.value;
    const catVal = elements.txFilterCategory.value;
    
    if (searchVal) query.append('search', searchVal);
    if (typeVal) query.append('type', typeVal);
    if (catVal) query.append('category', catVal);

    const res = await fetch(`/api/transactions?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      state.transactions = data.transactions;
      
      renderLedgerTable();
      renderDashboardTransactions();
      renderCategoryChart();
    }
  } catch (error) {
    console.error('Failed to load transactions:', error);
  }
}

// --- RENDER FUNCTIONS ---

function renderCardUI() {
  const card = state.cards[0];
  if (!card) return;

  elements.cardDispNum.textContent = card.cardNumber;
  elements.cardDispName.textContent = card.cardHolder;
  elements.cardDispExpiry.textContent = card.expiry;
  elements.cardDispCvv.textContent = card.cvv;
  elements.cardDispCvvBack.textContent = card.cvv;
  
  elements.virtualCard.querySelector('.card-front').style.background = card.color;
  elements.virtualCard.querySelector('.card-back').style.background = card.color;
  
  elements.skinOptions.forEach(opt => {
    if (opt.getAttribute('data-gradient') === card.color) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  elements.cardFreezeToggle.checked = card.isFrozen;
  if (card.isFrozen) {
    elements.virtualCard.classList.add('frozen-layer');
  } else {
    elements.virtualCard.classList.remove('frozen-layer');
  }

  elements.cardLimitSlider.value = card.spendingLimit;
  elements.cardLimitDisplay.textContent = parseFloat(card.spendingLimit).toLocaleString();
}

function renderGoalsUI() {
  elements.goalsContainer.innerHTML = '';
  
  if (state.goals.length === 0) {
    elements.goalsContainer.innerHTML = `
      <div class="glass-card" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
        <i class="fa-solid fa-piggy-bank" style="font-size: 3rem; margin-bottom: 1rem; color: var(--text-muted);"></i>
        <h4>No Active Savings Vaults</h4>
        <p style="font-size: 0.85rem; margin-bottom: 1rem;">Separating savings from checking helps achieve targets faster!</p>
        <button class="btn btn-primary btn-sm" id="btn-empty-create-goal"><i class="fa-solid fa-plus"></i> Open Savings Target</button>
      </div>
    `;
    
    const btn = document.getElementById('btn-empty-create-goal');
    if (btn) btn.addEventListener('click', openCreateGoalModal);
    return;
  }

  state.goals.forEach(goal => {
    const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
    const cardEl = document.createElement('div');
    cardEl.className = 'goal-card';
    
    cardEl.innerHTML = `
      <div class="goal-title-row">
        <h4>${goal.name}</h4>
        <span class="goal-deadline-tag">Target: ${formatDate(goal.deadline)}</span>
      </div>
      
      <div class="goal-metrics">
        <div>
          <span class="goal-saved-value">₦${formatMoney(goal.currentAmount)}</span>
          <span class="goal-target-value">of ₦${formatMoney(goal.targetAmount)}</span>
        </div>
      </div>
      
      <div class="goal-progress-container">
        <div class="goal-progress-bg">
          <div class="goal-progress-fill" style="width: ${percent}%"></div>
        </div>
        <div class="goal-progress-percent">${percent}% Completed</div>
      </div>
      
      <div class="goal-actions">
        <button class="btn btn-primary btn-deposit-goal" data-id="${goal.id}" data-name="${goal.name}" data-saved="${goal.currentAmount}">Deposit</button>
        <button class="btn btn-secondary btn-withdraw-goal" data-id="${goal.id}" data-name="${goal.name}" data-saved="${goal.currentAmount}">Withdraw</button>
        <button class="goal-delete-btn" data-id="${goal.id}" data-name="${goal.name}" title="Cancel Goal (Refunds automatically)"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    `;
    
    elements.goalsContainer.appendChild(cardEl);
  });

  document.querySelectorAll('.btn-deposit-goal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      openGoalTxModal(e.target.dataset.id, e.target.dataset.name, 'deposit', state.user.balance);
    });
  });

  document.querySelectorAll('.btn-withdraw-goal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      openGoalTxModal(e.target.dataset.id, e.target.dataset.name, 'withdraw', e.target.dataset.saved);
    });
  });

  document.querySelectorAll('.goal-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const name = e.currentTarget.dataset.name;
      deleteGoal(id, name);
    });
  });
}

function renderDashboardTransactions() {
  elements.dashTxList.innerHTML = '';
  
  const recent = state.transactions.slice(0, 4);
  
  if (recent.length === 0) {
    elements.dashTxList.innerHTML = `<div class="empty-state-box" style="padding: 1.5rem;"><p>No recent transaction activity.</p></div>`;
    return;
  }

  recent.forEach(t => {
    const isOutflow = t.senderId === state.user.id;
    const typeClass = isOutflow ? 'negative' : 'positive';
    const typeSign = isOutflow ? '-' : '+';
    
    let icon = 'fa-money-bill-transfer';
    let catClass = 'deposit';
    
    if (t.type === 'deposit') {
      icon = 'fa-circle-down';
      catClass = 'deposit';
    } else if (t.type === 'withdraw') {
      icon = 'fa-circle-up';
      catClass = 'withdraw';
    } else if (isOutflow) {
      icon = 'fa-paper-plane';
      catClass = 'transfer-out';
    } else {
      icon = 'fa-hand-holding-dollar';
      catClass = 'transfer-in';
    }

    const txEl = document.createElement('div');
    txEl.className = 'tx-item';
    txEl.innerHTML = `
      <div class="tx-icon-box ${catClass}">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="tx-details">
        <span class="tx-title">${isOutflow ? t.receiverName : t.senderName}</span>
        <span class="tx-category-badge">
          <i class="fa-solid fa-tag"></i> ${t.category || 'Transfer'}
        </span>
      </div>
      <div class="tx-amount-box">
        <span class="tx-amount ${typeClass}">${typeSign}₦${formatMoney(t.amount)}</span>
        <span class="tx-date">${formatDate(t.date)}</span>
      </div>
    `;
    elements.dashTxList.appendChild(txEl);
  });
}

function renderLedgerTable() {
  elements.txTableBody.innerHTML = '';
  
  if (state.transactions.length === 0) {
    elements.txEmptyState.classList.remove('hidden');
    return;
  }
  
  elements.txEmptyState.classList.add('hidden');

  state.transactions.forEach(t => {
    const isOutflow = t.senderId === state.user.id;
    const typeClass = isOutflow ? 'negative' : 'positive';
    const typeSign = isOutflow ? '-' : '+';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(t.date)}</td>
      <td>
        <strong style="display:block;">${isOutflow ? t.receiverName : t.senderName}</strong>
        <span style="font-size: 0.78rem; color: var(--text-muted);">${t.description || 'N/A'}</span>
      </td>
      <td><span class="table-category-badge">${t.category}</span></td>
      <td>
        <span style="font-weight: 500; font-size: 0.8rem; color: ${isOutflow ? 'var(--color-error)' : 'var(--accent-primary)'}">
          ${isOutflow ? 'Debit / Outflow' : 'Credit / Inflow'}
        </span>
      </td>
      <td class="text-right tx-amount ${typeClass}" style="font-family: var(--font-display); font-weight: 700;">
        ${typeSign}₦${formatMoney(t.amount)}
      </td>
    `;
    elements.txTableBody.appendChild(row);
  });
}

// --- APEXWEALTH LIVE ACCUMULATION TICKER (OPay OWealth-like) ---
function startWealthTicker() {
  stopWealthTicker();
  state.wealthInterestEarned = 0.00;
  
  state.wealthTickerInterval = setInterval(() => {
    if (!state.user || !state.user.wealthBalance || state.user.wealthBalance <= 0) {
      elements.wealthInterestEarnedLabel.textContent = '+₦0.000000';
      return;
    }
    
    // Annual interest is 15% (0.15)
    // Compound interest simulation updating every 100ms
    // Interest per 100ms step = wealthBalance * (0.15 / (365 * 24 * 60 * 60 * 10))
    const stepInterest = state.user.wealthBalance * (0.15 / 315360000);
    state.wealthInterestEarned += stepInterest;
    
    elements.wealthInterestEarnedLabel.textContent = `+₦${state.wealthInterestEarned.toFixed(6)}`;
  }, 100);
}

function stopWealthTicker() {
  if (state.wealthTickerInterval) {
    clearInterval(state.wealthTickerInterval);
    state.wealthTickerInterval = null;
  }
}

// --- CHARTS CREATION (Chart.js) ---

function renderBalanceChart(history) {
  if (!history || history.length === 0) return;
  
  const ctx = document.getElementById('balanceChart').getContext('2d');
  
  if (state.charts.balance) {
    state.charts.balance.destroy();
  }
  
  const labels = history.map(h => {
    const d = new Date(h.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const balances = history.map(h => h.balance);

  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(0, 184, 123, 0.45)');
  gradient.addColorStop(1, 'rgba(0, 184, 123, 0.00)');

  state.charts.balance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Checking Balance (₦)',
        data: balances,
        borderColor: 'hsl(160, 100%, 36%)',
        borderWidth: 3,
        pointBackgroundColor: 'hsl(182, 100%, 46%)',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: gradient,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: 'hsl(215, 20%, 75%)', font: { family: 'Inter', size: 10 } }
        },
        y: {
          grid: { color: 'hsla(225, 20%, 30%, 0.15)' },
          ticks: { color: 'hsl(215, 20%, 75%)', font: { family: 'Inter', size: 10 } }
        }
      }
    }
  });
}

function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  if (state.charts.category) {
    state.charts.category.destroy();
  }

  const categories = {};
  state.transactions.forEach(t => {
    if (t.senderId === state.user.id) {
      const cat = t.category || 'Transfer';
      categories[cat] = (categories[cat] || 0) + t.amount;
    }
  });

  const labels = Object.keys(categories);
  const data = Object.values(categories);

  if (labels.length === 0) {
    labels.push('No Expenses');
    data.push(1);
  }

  state.charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#00b87b', '#764ba2', '#13f1fc', '#0470dc', '#ff5858', '#f09819', '#ff3366'
        ],
        borderWidth: 2,
        borderColor: 'hsl(225, 38%, 9%)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: 'hsl(215, 20%, 75%)',
            font: { family: 'Inter', size: 10 },
            boxWidth: 10
          }
        }
      },
      cutout: '65%'
    }
  });
}

// --- EVENT HANDLERS ---

function setupEventListeners() {
  elements.loginForm.addEventListener('submit', handleLoginSubmit);
  elements.registerForm.addEventListener('submit', handleRegisterSubmit);

  elements.toggleToRegister.addEventListener('click', () => {
    elements.loginForm.classList.remove('active');
    elements.registerForm.classList.add('active');
    elements.authTitle.textContent = 'Create ApexPay Wallet';
    elements.authSubtitle.textContent = 'Input registration parameters to claim ₦1,000 sign-up bonus.';
  });

  elements.toggleToLogin.addEventListener('click', () => {
    elements.registerForm.classList.remove('active');
    elements.loginForm.classList.add('active');
    elements.authTitle.textContent = 'Welcome back to ApexPay';
    elements.authSubtitle.textContent = 'Log in to manage your digital assets securely.';
  });

  elements.btnLogout.addEventListener('click', handleLogout);

  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab);
    });
  });

  document.querySelectorAll('[data-go-tab]').forEach(el => {
    el.addEventListener('click', (e) => {
      switchTab(e.target.dataset.goTab);
    });
  });

  elements.sidebarOpenBtn.addEventListener('click', () => elements.sidebar.classList.add('open'));
  elements.sidebarCloseBtn.addEventListener('click', () => elements.sidebar.classList.remove('open'));

  elements.btnCopyAcc.addEventListener('click', () => {
    navigator.clipboard.writeText(state.user.accountNumber);
    showToast('Copied NUBAN', 'Account number copied to clipboard', 'info');
  });

  // Fast Transfer Shortcut Submit
  elements.quickTransferForm.addEventListener('submit', handleQuickTransfer);

  // Recipient check checks
  elements.btnVerifyRecipient.addEventListener('click', handleVerifyRecipient);
  elements.transferRecipient.addEventListener('input', (e) => {
    if (e.target.value.length === 10) {
      handleVerifyRecipient();
    } else {
      elements.recipientVerifyStatus.style.display = 'none';
    }
  });

  elements.mainTransferForm.addEventListener('submit', handleMainTransfer);

  // Card perspective controls
  elements.virtualCard.addEventListener('click', () => {
    elements.virtualCard.classList.toggle('flipped');
  });

  elements.skinOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      changeCardSkin(e.target.dataset.gradient);
    });
  });

  elements.cardFreezeToggle.addEventListener('change', toggleCardFreeze);

  elements.cardLimitSlider.addEventListener('input', (e) => {
    elements.cardLimitDisplay.textContent = parseInt(e.target.value).toLocaleString();
  });
  elements.btnSaveLimit.addEventListener('click', saveSpendingLimit);

  // Goals
  elements.btnOpenCreateGoal.addEventListener('click', openCreateGoalModal);
  elements.btnCloseGoalModal.addEventListener('click', () => elements.goalModal.classList.remove('open'));
  elements.createGoalForm.addEventListener('submit', handleCreateGoalSubmit);
  elements.btnCloseGoalTxModal.addEventListener('click', () => elements.goalTxModal.classList.remove('open'));
  elements.goalTxForm.addEventListener('submit', handleGoalTxSubmit);

  // ApexWealth Modal controls
  elements.btnWealthDeposit.addEventListener('click', () => openWealthModal('deposit'));
  elements.btnWealthWithdraw.addEventListener('click', () => openWealthModal('withdraw'));
  elements.btnCloseWealthModal.addEventListener('click', () => elements.wealthTxModal.classList.remove('open'));
  elements.wealthTxForm.addEventListener('submit', handleWealthTxSubmit);

  // Quick Utilities modal toggles
  document.querySelectorAll('[data-utility]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const utilType = e.currentTarget.dataset.utility;
      openUtilitiesModal(utilType);
    });
  });
  elements.btnCloseUtilitiesModal.addEventListener('click', () => elements.utilitiesModal.classList.remove('open'));

  // Utility interior tabs switch
  elements.utilTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchUtilityTab(e.target.dataset.utilTab);
    });
  });

  // Utility submit forms bindings
  elements.formAirtime.addEventListener('submit', handleAirtimeSubmit);
  elements.formCable.addEventListener('submit', handleCableSubmit);
  elements.formElectricity.addEventListener('submit', handleElectricitySubmit);
  elements.formBetting.addEventListener('submit', handleBettingSubmit);

  // Lucky Spin Modal toggles
  elements.btnLauncherSpin.addEventListener('click', () => elements.rewardsModal.classList.add('open'));
  elements.btnCloseRewardsModal.addEventListener('click', () => elements.rewardsModal.classList.remove('open'));
  elements.btnTriggerSpin.addEventListener('click', handleRewardsWheelSpin);

  // Contacts grid selector
  document.querySelectorAll('.contact-circle-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const cardEl = e.currentTarget;
      elements.transferBank.value = cardEl.dataset.bank;
      elements.transferRecipient.value = cardEl.dataset.nuban;
      handleVerifyRecipient();
    });
  });

  // Statement Filters
  elements.txSearchInput.addEventListener('input', fetchTransactions);
  elements.txFilterType.addEventListener('change', fetchTransactions);
  elements.txFilterCategory.addEventListener('change', fetchTransactions);
  elements.btnExportCsv.addEventListener('click', handleExportCSV);

  // Support bot toggles
  elements.btnToggleChat.addEventListener('click', () => {
    elements.chatDrawer.classList.toggle('open');
    elements.chatBadgeDot.classList.add('hidden');
    setTimeout(() => {
      elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
    }, 100);
  });
  elements.btnCloseChat.addEventListener('click', () => elements.chatDrawer.classList.remove('open'));
  elements.chatForm.addEventListener('submit', handleChatSubmit);

  // Dynamic chat chip listeners
  document.querySelectorAll('.chat-chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      elements.chatInput.value = e.target.dataset.query;
      elements.chatForm.requestSubmit();
    });
  });

  // Funding Modal Toggles
  elements.btnMockDeposit.addEventListener('click', () => elements.cardDepositModal.classList.add('open'));
  elements.btnCloseDepositModal.addEventListener('click', () => elements.cardDepositModal.classList.remove('open'));
  elements.mockDepositForm.addEventListener('submit', handleMockDepositSubmit);
}

// --- CONTROLLER ACTIONS ---

function switchTab(tabId) {
  state.activeTab = tabId;
  elements.navItems.forEach(item => {
    if (item.dataset.tab === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  elements.tabContents.forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  elements.sidebar.classList.remove('open');

  if (tabId === 'overview') {
    fetchAccountSummary();
    fetchTransactions();
    startWealthTicker();
  } else if (tabId === 'cards') {
    fetchCards();
    stopWealthTicker();
  } else if (tabId === 'goals') {
    fetchGoals();
    stopWealthTicker();
  } else if (tabId === 'transactions') {
    fetchTransactions();
    stopWealthTicker();
  }
}

// Auth Forms submittals
async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameOrEmail = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Logged In', 'Welcome to ApexPay Super-App!', 'success');
      elements.loginForm.reset();
      loginSuccess(data.user);
    } else {
      showToast('Login Failed', data.error || 'Invalid credentials.', 'error');
    }
  } catch (error) {
    showToast('Network Error', 'Could not connect to authentication server.', 'error');
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('reg-fullname').value;
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, email, password })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Registration complete', '₦1,000 bonus credited!', 'success');
      elements.registerForm.reset();
      loginSuccess(data.user);
    } else {
      showToast('Registration Failed', data.error || 'Invalid registration details.', 'error');
    }
  } catch (error) {
    showToast('Network Error', 'Could not connect to authentication server.', 'error');
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    showToast('Session Ended', 'Logged out successfully.', 'info');
    showAuthScreen();
  } catch (error) {
    showAuthScreen();
  }
}

// Dynamic NUBAN Verification
async function handleVerifyRecipient() {
  const bankName = elements.transferBank.value;
  const accountNumber = elements.transferRecipient.value.trim();

  if (accountNumber.length !== 10) {
    setVerifyLabel('NUBAN must be 10 digits.', 'error');
    return;
  }

  setVerifyLabel('Verifying NUBAN account name...', 'info');

  try {
    const res = await fetch(`/api/utilities/verify-nuban?bankName=${bankName}&accountNumber=${accountNumber}`);
    const data = await res.json();
    if (res.ok) {
      setVerifyLabel(`✓ Recipient: ${data.fullName}`, 'success');
    } else {
      setVerifyLabel(data.error || 'Could not verify NUBAN account.', 'error');
    }
  } catch (error) {
    setVerifyLabel('Verification request failed.', 'error');
  }
}

function setVerifyLabel(msg, status) {
  elements.recipientVerifyStatus.className = `verify-status ${status}`;
  elements.recipientVerifyStatus.textContent = msg;
  elements.recipientVerifyStatus.style.display = 'block';
}

// Transfer execution
async function handleMainTransfer(e) {
  e.preventDefault();
  const bankName = elements.transferBank.value;
  const recipientIdentifier = elements.transferRecipient.value.trim();
  const amount = parseFloat(elements.transferAmount.value);
  const category = elements.transferCategory.value;
  const description = elements.transferDescription.value.trim();

  if (amount > state.user.balance) {
    showToast('Failed transfer', 'Insufficient checking balance.', 'error');
    return;
  }

  const mainCard = state.cards[0];
  if (mainCard) {
    if (mainCard.isFrozen) {
      showToast('Card Locked', 'Your primary card is frozen. Unfreeze it first.', 'error');
      return;
    }
    if (amount > mainCard.spendingLimit) {
      showToast('Limit Exceeded', `Transaction exceeds card cap of ₦${formatMoney(mainCard.spendingLimit)}.`, 'error');
      return;
    }
  }

  try {
    const res = await fetch('/api/transactions/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankName, recipientIdentifier, amount, category, description })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Settle successful', `Sent ₦${formatMoney(amount)} successfully!`, 'success');
      elements.mainTransferForm.reset();
      elements.recipientVerifyStatus.style.display = 'none';
      await refreshAllData();
    } else {
      showToast('Declined', data.error || 'Transaction denied.', 'error');
    }
  } catch (error) {
    showToast('Failed', 'Network failure during transaction.', 'error');
  }
}

async function handleQuickTransfer(e) {
  e.preventDefault();
  const bankName = elements.quickBank.value;
  const recipientIdentifier = elements.quickRecipient.value.trim();
  const amount = parseFloat(elements.quickAmount.value);

  if (amount > state.user.balance) {
    showToast('Failed', 'Insufficient checking balance.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/transactions/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankName,
        recipientIdentifier,
        amount,
        category: 'Transfer',
        description: `Quick NUBAN pay to ${bankName}`
      })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Settle successful', `Sent ₦${formatMoney(amount)}!`, 'success');
      elements.quickTransferForm.reset();
      await refreshAllData();
    } else {
      showToast('Transfer Failed', data.error || 'Check routing parameters.', 'error');
    }
  } catch (error) {
    showToast('Error', 'Transaction failed.', 'error');
  }
}

// Card Security
async function toggleCardFreeze() {
  const card = state.cards[0];
  if (!card) return;

  try {
    const res = await fetch('/api/cards/toggle-freeze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id })
    });

    const data = await res.json();
    if (res.ok) {
      const stateMsg = data.card.isFrozen ? 'Frozen' : 'Active';
      showToast('Verve Security', `Virtual card is now ${stateMsg}.`, 'info');
      state.cards[0] = data.card;
      renderCardUI();
    } else {
      showToast('Failed', data.error, 'error');
      elements.cardFreezeToggle.checked = card.isFrozen;
    }
  } catch (error) {
    showToast('Error', 'Failed to toggle card status.', 'error');
    elements.cardFreezeToggle.checked = card.isFrozen;
  }
}

async function saveSpendingLimit() {
  const card = state.cards[0];
  if (!card) return;
  const spendingLimit = parseFloat(elements.cardLimitSlider.value);

  try {
    const res = await fetch('/api/cards/update-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.id, spendingLimit })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Verve Limit Saved', `Spending limit set to ₦${formatMoney(spendingLimit)}.`, 'success');
      state.cards[0] = data.card;
      renderCardUI();
    } else {
      showToast('Failed', data.error, 'error');
    }
  } catch (error) {
    showToast('Error', 'Failed to update spending limits.', 'error');
  }
}

function changeCardSkin(gradient) {
  const card = state.cards[0];
  if (!card) return;

  state.cards[0].color = gradient;
  renderCardUI();
  showToast('Theme Updated', 'Verve skin changed successfully.', 'success');
}

// Goals
function openCreateGoalModal() {
  elements.createGoalForm.reset();
  elements.goalModal.classList.add('open');
}

async function handleCreateGoalSubmit(e) {
  e.preventDefault();
  const name = elements.goalNameInput.value.trim();
  const targetAmount = parseFloat(elements.goalTargetInput.value);
  const deadline = elements.goalDeadlineInput.value;

  try {
    const res = await fetch('/api/goals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, targetAmount, deadline })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Vault Opened', `Savings vault "${name}" created!`, 'success');
      elements.goalModal.classList.remove('open');
      await refreshAllData();
    } else {
      showToast('Failed', data.error, 'error');
    }
  } catch (error) {
    showToast('Error', 'Could not open savings vault.', 'error');
  }
}

function openGoalTxModal(goalId, name, actionType, maxAmount) {
  elements.goalTxForm.reset();
  elements.goalTxId.value = goalId;
  elements.goalTxActionType.value = actionType;
  
  elements.goalTxTitle.textContent = actionType === 'deposit' ? `Allocate Funds to ${name}` : `Retrieve Savings from ${name}`;
  elements.goalTxDescription.textContent = actionType === 'deposit' 
    ? 'Transfer cash from checking account into savings vault.' 
    : 'Transfer saved funds back into checking balance.';
  
  elements.goalTxAvailableHint.textContent = formatMoney(maxAmount);
  elements.goalTxAmount.max = maxAmount;
  elements.goalTxAmount.placeholder = `Max ₦${formatMoney(maxAmount)}`;
  
  elements.btnGoalTxSubmit.textContent = actionType === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal';
  
  elements.goalTxModal.classList.add('open');
}

async function handleGoalTxSubmit(e) {
  e.preventDefault();
  const goalId = elements.goalTxId.value;
  const actionType = elements.goalTxActionType.value;
  const amount = parseFloat(elements.goalTxAmount.value);

  const endpoint = actionType === 'deposit' ? '/api/goals/deposit' : '/api/goals/withdraw';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalId, amount })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Success', 'Savings vault funds moved.', 'success');
      elements.goalTxModal.classList.remove('open');
      await refreshAllData();
    } else {
      showToast('Action Failed', data.error || 'Server error allocating funds.', 'error');
    }
  } catch (error) {
    showToast('Error', 'Fund movement failed.', 'error');
  }
}

async function deleteGoal(goalId, goalName) {
  if (!confirm(`Are you sure you want to close "${goalName}"? Any savings will be refunded back to checking.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Vault Closed', `"${goalName}" savings refunded to checking.`, 'info');
      await refreshAllData();
    } else {
      showToast('Error', data.error, 'error');
    }
  } catch (error) {
    showToast('Error', 'Failed to close vault.', 'error');
  }
}

// Wealth Modal actions
function openWealthModal(actionType) {
  elements.wealthTxForm.reset();
  elements.wealthTxActionType.value = actionType;
  
  elements.wealthTxTitle.textContent = actionType === 'deposit' ? 'Add Funds to ApexWealth' : 'Withdraw from ApexWealth';
  elements.wealthTxDescription.textContent = actionType === 'deposit'
    ? 'Transfer cash from checking to compounding wealth account (15% P.A.).'
    : 'Return high-yield savings to standard checking account instantly.';
    
  const maxLimit = actionType === 'deposit' ? state.user.balance : state.user.wealthBalance;
  elements.wealthTxAvailableHint.textContent = formatMoney(maxLimit);
  elements.wealthTxAmount.max = maxLimit;
  elements.wealthTxAmount.placeholder = `Max ₦${formatMoney(maxLimit)}`;
  
  elements.btnWealthTxSubmit.textContent = actionType === 'deposit' ? 'Confirm Investment' : 'Withdraw Funds';
  
  elements.wealthTxModal.classList.add('open');
}

async function handleWealthTxSubmit(e) {
  e.preventDefault();
  const actionType = elements.wealthTxActionType.value;
  const amount = parseFloat(elements.wealthTxAmount.value);
  const endpoint = actionType === 'deposit' ? '/api/wealth/deposit' : '/api/wealth/withdraw';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Wealth Balance Updated', 'Asset allocations successfully settled.', 'success');
      elements.wealthTxModal.classList.remove('open');
      await refreshAllData();
      startWealthTicker(); // restart ticker calculations with new wealthBalance
    } else {
      showToast('Refused', data.error || 'Server error allocating wealth asset.', 'error');
    }
  } catch (error) {
    showToast('Error', 'Transaction failed to settle.', 'error');
  }
}

// Quick Utilities Modals Switcher
function openUtilitiesModal(tabType) {
  elements.utilitiesModal.classList.add('open');
  switchUtilityTab(tabType);
}

function switchUtilityTab(tabType) {
  elements.utilTabBtns.forEach(btn => {
    if (btn.dataset.utilTab === tabType) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  elements.utilFormPanels.forEach(panel => {
    if (panel.id === `util-form-${tabType}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

// Utility Form submits
async function handleAirtimeSubmit(e) {
  e.preventDefault();
  const provider = document.getElementById('airtime-provider').value;
  const phone = document.getElementById('airtime-phone').value.trim();
  const amount = parseFloat(document.getElementById('airtime-amount').value);

  if (amount > state.user.balance) {
    showToast('Failed', 'Insufficient checking balance.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/utilities/airtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, phone, amount })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Airtime Purchased', `₦${formatMoney(amount)} VTU credited to ${phone} successfully!`, 'success');
      elements.formAirtime.reset();
      elements.utilitiesModal.classList.remove('open');
      await refreshAllData();
    } else {
      showToast('Failed', data.error, 'error');
    }
  } catch (err) {
    showToast('Error', 'Could not complete Airtime transaction.', 'error');
  }
}

async function handleCableSubmit(e) {
  e.preventDefault();
  const biller = document.getElementById('cable-provider').value;
  const customerId = document.getElementById('cable-number').value.trim();
  const amount = parseFloat(document.getElementById('cable-amount').value);

  if (amount > state.user.balance) {
    showToast('Failed', 'Insufficient checking balance.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/utilities/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biller, billType: 'Cable TV', customerId, amount })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Renewal successful', `${biller} smart card ${customerId} renewed.`, 'success');
      elements.formCable.reset();
      elements.utilitiesModal.classList.remove('open');
      await refreshAllData();
    } else {
      showToast('Failed', data.error, 'error');
    }
  } catch (err) {
    showToast('Error', 'Could not complete billing request.', 'error');
  }
}

async function handleElectricitySubmit(e) {
  e.preventDefault();
  const biller = document.getElementById('elec-provider').value;
  const customerId = document.getElementById('elec-meter').value.trim();
  const amount = parseFloat(document.getElementById('elec-amount').value);

  if (amount > state.user.balance) {
    showToast('Failed', 'Insufficient checking balance.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/utilities/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biller, billType: 'Electricity', customerId, amount })
    });

    const data = await res.json();
    if (res.ok) {
      const mockToken = `${Math.floor(1000 + Math.random()*9000)}-${Math.floor(1000 + Math.random()*9000)}-${Math.floor(1000 + Math.random()*9000)}-${Math.floor(1000 + Math.random()*9000)}`;
      alert(`Token generated successfully!\nPrepaid Token: ${mockToken}\nMeter: ${customerId}`);
      showToast('Token Generated', `₦${formatMoney(amount)} prepaid utility code created.`, 'success');
      elements.formElectricity.reset();
      elements.utilitiesModal.classList.remove('open');
      await refreshAllData();
    } else {
      showToast('Failed', data.error, 'error');
    }
  } catch (err) {
    showToast('Error', 'Prepaid request failed.', 'error');
  }
}

async function handleBettingSubmit(e) {
  e.preventDefault();
  const platform = document.getElementById('bet-platform').value;
  const userId = document.getElementById('bet-userid').value.trim();
  const amount = parseFloat(document.getElementById('bet-amount').value);

  if (amount > state.user.balance) {
    showToast('Failed', 'Insufficient checking balance.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/utilities/betting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, userId, amount })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Fund Settle', `${platform} account ${userId} funded with ₦${formatMoney(amount)}.`, 'success');
      elements.formBetting.reset();
      elements.utilitiesModal.classList.remove('open');
      await refreshAllData();
    } else {
      showToast('Failed', data.error, 'error');
    }
  } catch (err) {
    showToast('Error', 'Betting topup request failed.', 'error');
  }
}

// Lucky Wheel Rewards Spin Controller
async function handleRewardsWheelSpin() {
  if (state.isSpinning) return;
  state.isSpinning = true;

  elements.btnTriggerSpin.disabled = true;
  elements.btnTriggerSpin.querySelector('i').classList.add('spinning');

  try {
    const res = await fetch('/api/rewards/spin', { method: 'POST' });
    const data = await res.json();
    
    if (res.ok) {
      // Map prize name to degree positions on wheel segment
      const prizeMapping = {
        '₦50 Cash': 30,         // slice 1 (0 to 60deg, center: 30)
        '₦100 Cash': 90,        // slice 2 (60 to 120deg, center: 90)
        '₦200 Cash': 150,       // slice 3 (120 to 180deg, center: 150)
        '₦500 Cash': 210,       // slice 4 (180 to 240deg, center: 210)
        '₦1000 Cash': 270,      // slice 5 (240 to 300deg, center: 270)
        'Apex Cashback Voucher': 330 // slice 6 (300 to 360deg, center: 330)
      };

      const prizeAngle = prizeMapping[data.prizeName] || 330;
      
      // Calculate rotation. Spin around 5 times (1800deg) and point to target segment.
      // Point pointer points downwards at top (90 degrees). So rotate to align slice with pointer:
      // Rotation = (360 - prizeAngle) + 90 + (360 * 5)
      const finalRotation = (360 - prizeAngle) + 90 + 1800;

      elements.wheelObject.style.transform = `rotate(${finalRotation}deg)`;

      // Await transition time (4000ms setup in css)
      setTimeout(async () => {
        showToast('Winner!', `You won ${data.prizeName}!`, 'success');
        
        // Reset wheel style so next spins don't jump backward
        elements.wheelObject.style.transition = 'none';
        elements.wheelObject.style.transform = `rotate(${(360 - prizeAngle) + 90}deg)`;
        
        // Force style repaint
        elements.wheelObject.offsetHeight;
        
        // Restore transition
        elements.wheelObject.style.transition = 'transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)';

        state.isSpinning = false;
        elements.btnTriggerSpin.disabled = false;
        elements.btnTriggerSpin.querySelector('i').classList.remove('spinning');

        // Close rewards modal and refresh account balances
        elements.rewardsModal.classList.remove('open');
        await refreshAllData();
      }, 4100);

    } else {
      showToast('Denied', data.error || 'Verification rewards network block.', 'error');
      state.isSpinning = false;
      elements.btnTriggerSpin.disabled = false;
      elements.btnTriggerSpin.querySelector('i').classList.remove('spinning');
    }
  } catch (error) {
    showToast('Network failure', 'Rewards wheel interface unavailable.', 'error');
    state.isSpinning = false;
    elements.btnTriggerSpin.disabled = false;
    elements.btnTriggerSpin.querySelector('i').classList.remove('spinning');
  }
}

// Simulated Checking Deposit refilling
async function handleMockDepositSubmit(e) {
  e.preventDefault();
  const amount = parseFloat(elements.depositAmount.value);

  try {
    const depRes = await fetch('/api/account/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    
    const depData = await depRes.json();
    if (depRes.ok) {
      showToast('Deposit Approved', `₦${formatMoney(amount)} successfully credited to checking.`, 'success');
      elements.cardDepositModal.classList.remove('open');
      await refreshAllData();
    } else {
      showToast('Refused', depData.error || 'Simulator gateway failed authorization.', 'error');
    }
  } catch (err) {
    showToast('Offline', 'Gateway server unreachable.', 'error');
  }
}

// CSV Export
function handleExportCSV() {
  if (state.transactions.length === 0) {
    showToast('Empty statement', 'No transaction logs to compile.', 'info');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,Date,Reference,Category,Type,Amount (NGN)\n';
  
  state.transactions.forEach(t => {
    const isOutflow = t.senderId === state.user.id;
    const typeLabel = isOutflow ? 'DEBIT' : 'CREDIT';
    const amountVal = isOutflow ? -t.amount : t.amount;
    const ref = (isOutflow ? t.receiverName : t.senderName).replace(/,/g, '');
    const desc = (t.description || 'N/A').replace(/,/g, '');
    
    csvContent += `${t.date.split('T')[0]},"${ref} - ${desc}",${t.category},${typeLabel},${amountVal}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `apexpay_statement_${state.user.username}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
  showToast('File Generated', 'CSV Statement downloaded successfully.', 'success');
}

// --- AI CHATBOT CONTROLLERS ---

async function handleChatSubmit(e) {
  e.preventDefault();
  const message = elements.chatInput.value.trim();
  if (!message) return;

  appendChatBubble(message, 'user');
  elements.chatInput.value = '';
  
  elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;

  const typingEl = appendChatBubble('Apex is writing...', 'bot typing');
  
  try {
    const res = await fetch('/api/support/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    const data = await res.json();
    typingEl.remove();

    if (res.ok) {
      appendChatBubble(data.response, 'bot');
    } else {
      appendChatBubble('Sorry, I encountered an issue routing your query.', 'bot');
    }
  } catch (error) {
    typingEl.remove();
    appendChatBubble('Support servers appear unreachable at the moment.', 'bot');
  }

  elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
}

function appendChatBubble(text, sender) {
  const container = document.createElement('div');
  container.className = `chat-message ${sender}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  
  if (sender === 'bot') {
    bubble.innerHTML = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  } else {
    bubble.textContent = text;
  }
  
  container.appendChild(bubble);
  elements.chatMessagesContainer.appendChild(container);
  return container;
}
