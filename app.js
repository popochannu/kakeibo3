//======================================================================
// 1. Firebaseの初期化
//======================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBFaQyv0RlBMgnIKkgRzzVdmgTznQfSvOc",
  authDomain: "fukai-kakeibo3-app.firebaseapp.com",
  projectId: "fukai-kakeibo3-app",
  storageBucket: "fukai-kakeibo3-app.firebasestorage.app",
  messagingSenderId: "947125778820",
  appId: "1:947125778820:web:68f283cc32f1d816ed45d1",
  measurementId: "G-DS8B57NTET"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

//======================================================================
// 2. 定数とグローバル変数
//======================================================================
const EXPENSE_CATEGORIES = ['食費', '日用品', 'すまい', '外食費', '交通費', '保険', '光熱費', '通信費', '交際費', '医療費', '投資', 'お小遣い', 'その他'];
const PAYERS = ['浩介', '真由', 'ポイント', '家族'];
const INCOME_SOURCES = ['浩介', '真由'];

let currentYear, currentMonth;
let allExpenses = []; // 現在の月の全支出データを保持
let allIncomes = [];  // 現在の月の全収入データを保持

//======================================================================
// 3. ページの初期化処理
//======================================================================
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth() + 1;
    initializePage();
});

function initializePage() {
    setupEventListeners();
    if (document.getElementById('modal-container')) {
        populateSelect('expense-category', EXPENSE_CATEGORIES);
        populateSelect('expense-payer', PAYERS);
        populateSelect('income-source', INCOME_SOURCES);
    }
    updateMonthDisplayAndFetchData();
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = option;
        select.appendChild(opt);
    });
}

//======================================================================
// 4. イベントリスナーの設定
//======================================================================
function setupEventListeners() {
    document.getElementById('prev-month-btn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month-btn').addEventListener('click', () => changeMonth(1));

    if (document.getElementById('modal-container')) {
        const modalContainer = document.getElementById('modal-container');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const addExpenseBtn = document.getElementById('add-expense-btn');
        if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => openExpenseModal());
        const addIncomeBtn = document.getElementById('add-income-btn');
        if (addIncomeBtn) addIncomeBtn.addEventListener('click', () => openIncomeModal());
        closeModalBtn.addEventListener('click', () => modalContainer.style.display = 'none');
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) modalContainer.style.display = 'none';
        });
        document.getElementById('expense-form').addEventListener('submit', handleExpenseFormSubmit);
        const incomeForm = document.getElementById('income-form');
        if (incomeForm) incomeForm.addEventListener('submit', handleIncomeFormSubmit);
    }
}

//======================================================================
// 5. 月の操作とデータ取得
//======================================================================
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthDisplayAndFetchData();
}

function updateMonthDisplayAndFetchData() {
    document.getElementById('current-month-display').textContent = `${currentYear}年 ${currentMonth}月`;
    fetchData(currentYear, currentMonth);
}

/**
 * 全てのサマリーとリストを再描画する統一関数
 */
function updateAllSummaries() {
    if (document.getElementById('expense-summary-table')) renderExpenseSummary(allExpenses);
    if (document.getElementById('income-summary-table')) renderIncomeSummary(allIncomes);
    if (document.getElementById('transfer-summary-table')) renderTransferSummary(allExpenses, allIncomes);
    if (document.getElementById('expense-list-body')) renderExpenseList(allExpenses);
}

/**
 * Firestoreからデータをリアルタイムで取得するリスナーを設定する関数
 */
function fetchData(year, month) {
    db.collection('expenses').where('year', '==', year).where('month', '==', month).orderBy('date', 'desc')
      .onSnapshot(snapshot => {
          allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          updateAllSummaries();
      }, error => {
          console.error("支出データの取得に失敗しました: ", error);
          showToast("支出データの取得に失敗しました", "error");
      });

    db.collection('incomes').where('year', '==', year).where('month', '==', month)
      .onSnapshot(snapshot => {
          allIncomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          updateAllSummaries();
      }, error => {
          console.error("収入データの取得に失敗しました: ", error);
          showToast("収入データの取得に失敗しました", "error");
      });
}

//======================================================================
// 6. 描画処理 (サマリーページ)
//======================================================================
function renderExpenseSummary(expenses) {
    const summary = {};
    EXPENSE_CATEGORIES.forEach(cat => summary[cat] = 0);
    let total = 0;
    expenses.forEach(exp => {
        if (summary.hasOwnProperty(exp.category)) summary[exp.category] += exp.amount;
        total += exp.amount;
    });
    const tbody = document.querySelector('#expense-summary-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    EXPENSE_CATEGORIES.forEach(cat => {
        tbody.innerHTML += `<tr><td>${cat}</td><td>${summary[cat].toLocaleString()}円</td></tr>`;
    });
    document.getElementById('expense-total').textContent = `${total.toLocaleString()}円`;
}

function renderIncomeSummary(incomes) {
    let total = 0;
    const tbody = document.querySelector('#income-summary-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    incomes.forEach(item => {
        const row = `
            <tr>
                <td>${item.source} <small>(${item.memo || 'メモなし'})</small></td>
                <td>${item.amount.toLocaleString()}円</td>
                <td><button class="btn btn-secondary btn-sm" onclick="openIncomeModal('${item.id}')">✏️</button></td>
            </tr>`;
        tbody.innerHTML += row;
        total += item.amount;
    });

    document.getElementById('income-total').textContent = `${total.toLocaleString()}円`;
}

function renderTransferSummary(expenses, incomes) {
    const kosukeIncome = incomes.filter(i => i.source === '浩介').reduce((sum, i) => sum + i.amount, 0);
    const mayuIncome = incomes.filter(i => i.source === '真由').reduce((sum, i) => sum + i.amount, 0);
    const kosukeExpense = expenses.filter(e => e.payer === '浩介').reduce((sum, e) => sum + e.amount, 0);
    const mayuExpense = expenses.filter(e => e.payer === '真由').reduce((sum, e) => sum + e.amount, 0);
    const kosukeTransfer = kosukeIncome - kosukeExpense;
    const mayuTransfer = mayuIncome - mayuExpense;
    const tbody = document.querySelector('#transfer-summary-table tbody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr><td>浩介</td><td class="${kosukeTransfer < 0 ? 'text-danger' : ''}">${kosukeTransfer.toLocaleString()}円</td></tr>
        <tr><td>真由</td><td class="${mayuTransfer < 0 ? 'text-danger' : ''}">${mayuTransfer.toLocaleString()}円</td></tr>`;
}

//======================================================================
// 7. 描画処理 (一覧ページ)
//======================================================================
function renderExpenseList(expenses) {
    const tbody = document.getElementById('expense-list-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">この月の支出データはありません。</td></tr>';
        return;
    }
    expenses.forEach(exp => {
        tbody.innerHTML += `
            <tr>
                <td>${exp.date}</td>
                <td>${exp.category}</td>
                <td>${exp.amount.toLocaleString()}円</td>
                <td>${exp.payer}</td>
                <td>${exp.memo || ''}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openExpenseModal('${exp.id}')">✏️ 編集</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteExpense('${exp.id}')">🗑️ 削除</button>
                </td>
            </tr>`;
    });
}

//======================================================================
// 8. モーダルとフォームの処理
//======================================================================
async function openExpenseModal(expenseId = null) {
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('expense-form');
    form.reset();
    document.getElementById('expense-id').value = '';
    const incomeForm = document.getElementById('income-form');
    if(incomeForm) incomeForm.style.display = 'none';
    form.style.display = 'block';

    if (expenseId) {
        modalTitle.textContent = '支出を編集';
        const doc = await db.collection('expenses').doc(expenseId).get();
        if (!doc.exists) { showToast('データが見つかりませんでした。', 'error'); return; }
        const data = doc.data();
        document.getElementById('expense-id').value = expenseId;
        document.getElementById('expense-date').value = data.date;
        document.getElementById('expense-category').value = data.category;
        document.getElementById('expense-amount').value = data.amount;
        document.getElementById('expense-payer').value = data.payer;
        document.getElementById('expense-memo').value = data.memo;
    } else {
        modalTitle.textContent = '支出を追加';
        document.getElementById('expense-date').valueAsDate = new Date();
    }
    modalContainer.style.display = 'flex';
}

async function openIncomeModal(incomeId = null) {
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('income-form');
    form.reset();
    document.getElementById('income-id').value = '';
    document.getElementById('expense-form').style.display = 'none';
    form.style.display = 'block';

    if (incomeId) {
        modalTitle.textContent = '収入を編集';
        const doc = await db.collection('incomes').doc(incomeId).get();
        if (!doc.exists) { showToast('データが見つかりませんでした。', 'error'); return; }
        const data = doc.data();
        document.getElementById('income-id').value = incomeId;
        document.getElementById('income-source').value = data.source;
        document.getElementById('income-amount').value = data.amount;
        document.getElementById('income-memo').value = data.memo;
    } else {
        modalTitle.textContent = '収入を追加';
    }
    modalContainer.style.display = 'flex';
}

async function handleExpenseFormSubmit(e) {
    e.preventDefault();
    const expenseId = document.getElementById('expense-id').value;
    const dateStr = document.getElementById('expense-date').value;
    const amount = document.getElementById('expense-amount').value;
    if (!dateStr || !amount || parseInt(amount, 10) < 0) {
        showToast('日付と金額（0以上）は必須です', 'error');
        return;
    }
    const dateObj = new Date(dateStr);
    const data = {
        date: dateStr, year: dateObj.getFullYear(), month: dateObj.getMonth() + 1,
        category: document.getElementById('expense-category').value,
        amount: parseInt(amount, 10),
        payer: document.getElementById('expense-payer').value,
        memo: document.getElementById('expense-memo').value.trim(),
    };
    try {
        if (expenseId) { await db.collection('expenses').doc(expenseId).update(data); } 
        else { await db.collection('expenses').add(data); }
        document.getElementById('modal-container').style.display = 'none';
        showToast('保存しました！');
    } catch (error) { console.error("DB書込エラー: ", error); showToast('エラーが発生しました', 'error'); }
}

async function handleIncomeFormSubmit(e) {
    e.preventDefault();
    const incomeId = document.getElementById('income-id').value;
    const amount = document.getElementById('income-amount').value;
    if (!amount || parseInt(amount, 10) < 0) {
        showToast('金額（0以上）は必須です', 'error'); return;
    }
    const data = {
        source: document.getElementById('income-source').value,
        amount: parseInt(amount, 10),
        memo: document.getElementById('income-memo').value.trim(),
        year: currentYear, month: currentMonth,
    };
    try {
        if (incomeId) { await db.collection('incomes').doc(incomeId).update(data); } 
        else { await db.collection('incomes').add(data); }
        document.getElementById('modal-container').style.display = 'none';
        showToast('保存しました！');
    } catch (error) { console.error("DB書込エラー: ", error); showToast('エラーが発生しました', 'error'); }
}

//======================================================================
// 9. データの削除
//======================================================================
async function deleteExpense(expenseId) {
    if (confirm('この支出項目を本当に削除しますか？')) {
        try {
            await db.collection('expenses').doc(expenseId).delete();
            showToast('削除しました');
        } catch (error) { console.error("削除エラー: ", error); showToast('削除中にエラーが発生しました', 'error'); }
    }
}

//======================================================================
// 10. ユーティリティ関数
//======================================================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  if (type === 'error') { toast.style.backgroundColor = '#dc3545'; }
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}