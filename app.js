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
const FIXED_EXPENSE_PAYERS = ['浩介', '真由', '共有'];

let currentYear, currentMonth;
let allVariableExpenses = [];
let allFixedExpenses = [];
let allIncomes = [];

//======================================================================
// 3. ページの初期化処理
//======================================================================
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth() + 1;
    const path = window.location.pathname;
    if (path.includes('fixed_expenses.html')) {
        initializeFixedExpensePage();
    } else {
        initializeMainPages();
    }
});
function initializeMainPages() {
    setupCommonEventListeners();
    if (document.getElementById('modal-container')) {
        populateSelect('expense-category', EXPENSE_CATEGORIES);
        populateSelect('expense-payer', PAYERS);
        populateSelect('income-source', INCOME_SOURCES);
    }
    updateMonthDisplayAndFetchData();
}
function initializeFixedExpensePage() {
    setupFixedExpensePageEventListeners();
    db.collection('fixed_expenses').orderBy('name').onSnapshot(snapshot => {
        allFixedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderFixedExpenseList(allFixedExpenses);
    }, handleError("固定支出"));
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
function setupCommonEventListeners() {
    document.getElementById('prev-month-btn')?.addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month-btn')?.addEventListener('click', () => changeMonth(1));
    if (document.getElementById('modal-container')) {
        const modalContainer = document.getElementById('modal-container');
        const closeModalBtn = document.getElementById('close-modal-btn');
        document.getElementById('add-expense-btn')?.addEventListener('click', () => openExpenseModal());
        document.getElementById('add-income-btn')?.addEventListener('click', () => openIncomeModal());
        closeModalBtn?.addEventListener('click', () => modalContainer.style.display = 'none');
        modalContainer?.addEventListener('click', (e) => {
            if (e.target === modalContainer) modalContainer.style.display = 'none';
        });
        document.getElementById('expense-form')?.addEventListener('submit', handleExpenseFormSubmit);
        document.getElementById('income-form')?.addEventListener('submit', handleIncomeFormSubmit);
    }
}
function setupFixedExpensePageEventListeners() {
    document.getElementById('fixed-expense-form').addEventListener('submit', handleFixedExpenseFormSubmit);
    document.getElementById('cancel-edit-btn').addEventListener('click', resetFixedExpenseForm);
}

//======================================================================
// 5. データ取得と描画
//======================================================================
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthDisplayAndFetchData();
}
function updateMonthDisplayAndFetchData() {
    const displayEl = document.getElementById('current-month-display');
    if (displayEl) { displayEl.textContent = `${currentYear}年 ${currentMonth}月`; }
    fetchData(currentYear, currentMonth);
}
function updateAllSummaries() {
    if (document.getElementById('variable-expense-summary-table')) renderVariableExpenseSummary(allVariableExpenses);
    if (document.getElementById('fixed-expense-summary-table')) renderFixedExpenseSummary(allFixedExpenses);
    if (document.getElementById('income-summary-table')) renderIncomeSummary(allIncomes);
    if (document.getElementById('transfer-summary-table')) renderTransferSummary(allVariableExpenses, allFixedExpenses, allIncomes);
    if (document.getElementById('expense-list-body')) renderExpenseList(allVariableExpenses);
}
function fetchData(year, month) {
    db.collection('expenses').where('year', '==', year).where('month', '==', month).orderBy('date', 'desc')
        .onSnapshot(snapshot => { allVariableExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateAllSummaries(); }, handleError("変動支出"));
    db.collection('fixed_expenses').orderBy('name')
        .onSnapshot(snapshot => { allFixedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateAllSummaries(); }, handleError("固定支出"));
    db.collection('incomes').where('year', '==', year).where('month', '==', month)
        .onSnapshot(snapshot => { allIncomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); updateAllSummaries(); }, handleError("収入"));
}
function handleError(dataType) {
    return error => {
        console.error(`【重要】${dataType}データの取得に失敗しました:`, error);
        showToast(`${dataType}データの取得に失敗しました`, "error");
    };
}

//======================================================================
// 6. 描画関数 (変更なし)
//======================================================================
function renderVariableExpenseSummary(expenses) { /*...*/ }
function renderFixedExpenseSummary(fixedExpenses) { /*...*/ }
function renderIncomeSummary(incomes) { /*...*/ }
function renderTransferSummary(variableExpenses, fixedExpenses, incomes) { /*...*/ }
function renderExpenseList(expenses) { /*...*/ }
function renderFixedExpenseList(fixedExpenses) { /*...*/ }

//======================================================================
// 7. CRUD (Create, Read, Update, Delete) 関数
//======================================================================
// --- 変動支出・収入のモーダル開閉 ---
async function openExpenseModal(expenseId = null) { /*...*/ }
async function openIncomeModal(incomeId = null) { /*...*/ }

// --- ▼▼▼ 修正点1: 保存処理の堅牢化とフィードバック強化 ▼▼▼ ---
async function handleExpenseFormSubmit(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // ボタンを無効化し、ローディング状態を表示
    submitButton.disabled = true;
    submitButton.textContent = '保存中...';

    try {
        const expenseId = document.getElementById('expense-id').value;
        const dateStr = document.getElementById('expense-date').value;
        const amount = document.getElementById('expense-amount').value;

        if (!dateStr || !amount || parseInt(amount, 10) < 0) {
            showToast('日付と金額（0以上）は必須です', 'error');
            return; // returnの前にfinallyが実行される
        }

        const dateObj = new Date(dateStr);
        const data = {
            date: dateStr,
            year: dateObj.getFullYear(),
            month: dateObj.getMonth() + 1,
            category: document.getElementById('expense-category').value,
            amount: parseInt(amount, 10),
            payer: document.getElementById('expense-payer').value,
            memo: document.getElementById('expense-memo').value.trim(),
        };
        console.log("変動支出データを保存します:", data);

        if (expenseId) {
            await db.collection('expenses').doc(expenseId).update(data);
        } else {
            await db.collection('expenses').add(data);
        }
        document.getElementById('modal-container').style.display = 'none';
        showToast('保存しました！'); // 成功を通知

    } catch (error) {
        console.error("変動支出の保存エラー:", error);
        showToast('エラーが発生しました', 'error'); // 失敗を通知
    } finally {
        // 処理が成功しても失敗しても、ボタンの状態を元に戻す
        submitButton.disabled = false;
        submitButton.textContent = '保存する';
    }
}

// --- ▼▼▼ 修正点2: 保存処理の堅牢化とフィードバック強化 ▼▼▼ ---
async function handleIncomeFormSubmit(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = '保存中...';
    
    try {
        const incomeId = document.getElementById('income-id').value;
        const amount = document.getElementById('income-amount').value;
        if (!amount || parseInt(amount, 10) < 0) {
            showToast('金額（0以上）は必須です', 'error');
            return;
        }
        const data = {
            source: document.getElementById('income-source').value,
            amount: parseInt(amount, 10),
            memo: document.getElementById('income-memo').value.trim(),
            year: currentYear,
            month: currentMonth,
        };
        console.log("収入データを保存します:", data);

        if (incomeId) {
            await db.collection('incomes').doc(incomeId).update(data);
        } else {
            await db.collection('incomes').add(data);
        }
        document.getElementById('modal-container').style.display = 'none';
        showToast('保存しました！');
    } catch (error) {
        console.error("収入の保存エラー:", error);
        showToast('エラーが発生しました', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '保存する';
    }
}

async function deleteExpense(expenseId) { /*...*/ }

// --- ▼▼▼ 修正点3: 保存処理の堅牢化とフィードバック強化 ▼▼▼ ---
async function handleFixedExpenseFormSubmit(e) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    submitButton.disabled = true;
    submitButton.textContent = '保存中...';
    
    try {
        const id = document.getElementById('fixed-expense-id').value;
        const name = document.getElementById('fixed-expense-name').value;
        const amount = document.getElementById('fixed-expense-amount').value;
        const payer = document.getElementById('fixed-expense-payer').value;
        if (!name || !amount || parseInt(amount) < 0) {
            showToast('項目名と金額（0以上）は必須です', 'error');
            return;
        }
        const data = {
            name: name.trim(),
            amount: parseInt(amount, 10),
            payer: payer
        };
        console.log("固定支出データを保存します:", data);

        if (id) {
            await db.collection('fixed_expenses').doc(id).update(data);
        } else {
            await db.collection('fixed_expenses').add(data);
        }
        showToast('固定支出を保存しました！');
        resetFixedExpenseForm();
    } catch (error) {
        console.error("固定支出の保存エラー:", error);
        showToast('エラーが発生しました', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = '保存する';
    }
}

async function deleteFixedExpense(id) { /*...*/ }
async function editFixedExpense(id) { /*...*/ }
function resetFixedExpenseForm() { /*...*/ }

//======================================================================
// 8. ユーティリティ関数
//======================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    if (type === 'error') {
        toast.style.backgroundColor = '#dc3545';
    }
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

// ----- 以下、省略した関数の再掲 -----
function renderVariableExpenseSummary(expenses){const summary={};EXPENSE_CATEGORIES.forEach(cat=>summary[cat]=0);let total=expenses.reduce((sum,exp)=>{if(summary.hasOwnProperty(exp.category))summary[exp.category]+=exp.amount;return sum+exp.amount},0);const tbody=document.querySelector('#variable-expense-summary-table tbody');if(!tbody)return;tbody.innerHTML='';EXPENSE_CATEGORIES.forEach(cat=>tbody.innerHTML+=`<tr><td>${cat}</td><td>${summary[cat].toLocaleString()}円</td></tr>`);document.getElementById('variable-expense-total').textContent=`${total.toLocaleString()}円`}
function renderFixedExpenseSummary(fixedExpenses){const tbody=document.querySelector('#fixed-expense-summary-table tbody');if(!tbody)return;tbody.innerHTML='';let total=0;fixedExpenses.forEach(item=>{tbody.innerHTML+=`<tr><td>${item.name}</td><td>${item.amount.toLocaleString()}円</td></tr>`;total+=item.amount});document.getElementById('fixed-expense-total').textContent=`${total.toLocaleString()}円`}
function renderIncomeSummary(incomes){let total=0;const tbody=document.querySelector('#income-summary-table tbody');if(!tbody)return;tbody.innerHTML='';incomes.forEach(item=>{const row=`<tr><td>${item.source} <small>(${item.memo||'メモなし'})</small></td><td>${item.amount.toLocaleString()}円</td><td><button class="btn btn-secondary btn-sm" onclick="openIncomeModal('${item.id}')">✏️</button></td></tr>`;tbody.innerHTML+=row;total+=item.amount});document.getElementById('income-total').textContent=`${total.toLocaleString()}円`}
function renderTransferSummary(variableExpenses,fixedExpenses,incomes){const tbody=document.querySelector('#transfer-summary-table tbody');if(!tbody)return;const kosukeVariable=variableExpenses.filter(e=>e.payer==='浩介').reduce((s,e)=>s+e.amount,0);const mayuVariable=variableExpenses.filter(e=>e.payer==='真由').reduce((s,e)=>s+e.amount,0);const kosukeFixed=fixedExpenses.filter(fe=>fe.payer==='浩介').reduce((s,fe)=>s+fe.amount,0);const mayuFixed=fixedExpenses.filter(fe=>fe.payer==='真由').reduce((s,fe)=>s+fe.amount,0);const kosukeTotalExpense=kosukeVariable+kosukeFixed;const mayuTotalExpense=mayuVariable+mayuFixed;const kosukeIncome=incomes.filter(i=>i.source==='浩介').reduce((s,i)=>s+i.amount,0);const mayuIncome=incomes.filter(i=>i.source==='真由').reduce((s,i)=>s+i.amount,0);const totalIncome=incomes.reduce((s,i)=>s+i.amount,0);const totalVariableExpense=variableExpenses.reduce((s,e)=>s+e.amount,0);const totalFixedExpense=fixedExpenses.reduce((s,fe)=>s+fe.amount,0);const totalExpense=totalVariableExpense+totalFixedExpense;const balance=totalIncome-totalExpense;tbody.innerHTML=`<tr><td>総収入</td><td>${totalIncome.toLocaleString()}円</td></tr><tr><td>総支出 (変動+固定)</td><td>${totalExpense.toLocaleString()}円</td></tr><tr class="total-row"><td>今月の収支</td><td>${balance.toLocaleString()}円</td></tr><tr class="divider"><td colspan="2" style="border-bottom: 1px dashed #ccc; padding: 0.5rem 0;"></td></tr><tr><td>浩介 収支 (収入-支出)</td><td>${(kosukeIncome-kosukeTotalExpense).toLocaleString()}円</td></tr><tr><td>真由 収支 (収入-支出)</td><td>${(mayuIncome-mayuTotalExpense).toLocaleString()}円</td></tr>`}
function renderExpenseList(expenses){const tbody=document.getElementById('expense-list-body');if(!tbody)return;tbody.innerHTML='';if(expenses.length===0){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;">この月の変動支出データはありません。</td></tr>';return}expenses.forEach(exp=>{tbody.innerHTML+=`<tr><td>${exp.date}</td><td>${exp.category}</td><td>${exp.amount.toLocaleString()}円</td><td>${exp.payer}</td><td>${exp.memo||''}</td><td><button class="btn btn-secondary btn-sm" onclick="openExpenseModal('${exp.id}')">✏️ 編集</button><button class="btn btn-danger btn-sm" onclick="deleteExpense('${exp.id}')">🗑️ 削除</button></td></tr>`})}
function renderFixedExpenseList(fixedExpenses){const tbody=document.getElementById('fixed-expense-list-body');if(!tbody)return;tbody.innerHTML='';fixedExpenses.forEach(item=>{tbody.innerHTML+=`<tr><td>${item.name}</td><td>${item.amount.toLocaleString()}円</td><td>${item.payer}</td><td><button class="btn btn-secondary btn-sm" onclick="editFixedExpense('${item.id}')">✏️ 編集</button><button class="btn btn-danger btn-sm" onclick="deleteFixedExpense('${item.id}')">🗑️ 削除</button></td></tr>`})}
async function openExpenseModal(expenseId=null){const modalContainer=document.getElementById('modal-container');const modalTitle=document.getElementById('modal-title');const form=document.getElementById('expense-form');form.reset();document.getElementById('expense-id').value='';const incomeForm=document.getElementById('income-form');if(incomeForm)incomeForm.style.display='none';form.style.display='block';if(expenseId){modalTitle.textContent='変動支出を編集';try{const doc=await db.collection('expenses').doc(expenseId).get();if(!doc.exists){showToast('データが見つかりません','error');return}const data=doc.data();document.getElementById('expense-id').value=expenseId;document.getElementById('expense-date').value=data.date;document.getElementById('expense-category').value=data.category;document.getElementById('expense-amount').value=data.amount;document.getElementById('expense-payer').value=data.payer;document.getElementById('expense-memo').value=data.memo}catch(error){console.error("編集中データ取得エラー:",error);showToast("データの取得に失敗しました","error");return}}else{modalTitle.textContent='変動支出を追加';document.getElementById('expense-date').valueAsDate=new Date()}modalContainer.style.display='flex'}
async function openIncomeModal(incomeId=null){const modalContainer=document.getElementById('modal-container');const modalTitle=document.getElementById('modal-title');const form=document.getElementById('income-form');form.reset();document.getElementById('income-id').value='';document.getElementById('expense-form').style.display='none';form.style.display='block';if(incomeId){modalTitle.textContent='収入を編集';try{const doc=await db.collection('incomes').doc(incomeId).get();if(!doc.exists){showToast('データが見つかりません','error');return}const data=doc.data();document.getElementById('income-id').value=incomeId;document.getElementById('income-source').value=data.source;document.getElementById('income-amount').value=data.amount;document.getElementById('income-memo').value=data.memo}catch(error){console.error("編集中データ取得エラー:",error);showToast("データの取得に失敗しました","error");return}}else{modalTitle.textContent='収入を追加'}modalContainer.style.display='flex'}
async function deleteExpense(expenseId){if(confirm('この変動支出を削除しますか？')){try{await db.collection('expenses').doc(expenseId).delete();showToast('削除しました')}catch(error){console.error("削除エラー: ",error);showToast('削除中にエラーが発生しました','error')}}}
async function deleteFixedExpense(id){if(confirm('この固定支出を削除しますか？')){try{await db.collection('fixed_expenses').doc(id).delete();showToast('削除しました')}catch(error){console.error("削除エラー:",error);showToast('削除中にエラーが発生しました','error')}}}
async function editFixedExpense(id){try{const doc=await db.collection('fixed_expenses').doc(id).get();if(!doc.exists){showToast('データが見つかりません','error');return}const data=doc.data();document.getElementById('fixed-expense-form-title').textContent='固定支出を編集';document.getElementById('fixed-expense-id').value=id;document.getElementById('fixed-expense-name').value=data.name;document.getElementById('fixed-expense-amount').value=data.amount;document.getElementById('fixed-expense-payer').value=data.payer;document.getElementById('cancel-edit-btn').style.display='inline-block';window.scrollTo(0,0)}catch(error){console.error("編集中データ取得エラー:",error);showToast("データの取得に失敗しました","error")}}
function resetFixedExpenseForm(){document.getElementById('fixed-expense-form-title').textContent='固定支出を追加';document.getElementById('fixed-expense-form').reset();document.getElementById('fixed-expense-id').value='';document.getElementById('cancel-edit-btn').style.display='none'}