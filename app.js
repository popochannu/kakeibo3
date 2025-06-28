//======================================================================
// 1. Firebaseの初期化
//======================================================================
// Firebaseコンソールで取得した `firebaseConfig` をここに貼り付け
const firebaseConfig = {
  apiKey: "AIzaSyBFaQyv0RlBMgnIKkgRzzVdmgTznQfSvOc",
  authDomain: "fukai-kakeibo3-app.firebaseapp.com",
  projectId: "fukai-kakeibo3-app",
  storageBucket: "fukai-kakeibo3-app.firebasestorage.app",
  messagingSenderId: "947125778820",
  appId: "1:947125778820:web:68f283cc32f1d816ed45d1",
  measurementId: "G-DS8B57NTET"
};

// Firebaseアプリを初期化
firebase.initializeApp(firebaseConfig);

// Firestoreのインスタンスを取得
const db = firebase.firestore();


//======================================================================
// 2. 定数とグローバル変数
//======================================================================
// カテゴリと支払方法の定義
const EXPENSE_CATEGORIES = ['食費', '日用品', 'すまい', '外食費', '交通費', '保険', '光熱費', '通信費', '交際費', '医療費', '投資', 'お小遣い', 'その他'];
const PAYERS = ['浩介', '真由', 'ポイント', '家族'];
const INCOME_SOURCES = ['浩介', '真由'];

// 現在表示している年月
let currentYear;
let currentMonth;

//======================================================================
// 3. DOM要素の取得
//======================================================================
// ページが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    // 現在の年月を設定
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth() + 1; // getMonth()は0-11を返す

    initializePage();
});


//======================================================================
// 4. 初期化処理
//======================================================================
function initializePage() {
    // ページを特定 (index.htmlかlist.htmlか)
    const isIndexPage = !!document.getElementById('summary-section');
    const isListPage = !!document.getElementById('expense-list-table');
    
    // イベントリスナーを設定
    setupEventListeners();

    // フォームのセレクトボックスを初期化
    if (document.getElementById('modal-container')) {
        populateSelect('expense-category', EXPENSE_CATEGORIES);
        populateSelect('expense-payer', PAYERS);
        populateSelect('income-source', INCOME_SOURCES);
    }
    
    // 月表示を更新してデータを取得・描画
    updateMonthDisplayAndFetchData();
}

// セレクトボックスに選択肢を追加するヘルパー関数
function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
}

//======================================================================
// 5. イベントリスナーの設定
//======================================================================
function setupEventListeners() {
    // 月移動ボタン
    document.getElementById('prev-month-btn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month-btn').addEventListener('click', () => changeMonth(1));

    // モーダル関連の要素があるページのみリスナーを設定
    if (document.getElementById('modal-container')) {
        const modalContainer = document.getElementById('modal-container');
        const closeModalBtn = document.getElementById('close-modal-btn');
        
        // 支出追加ボタン (index.htmlにのみ存在)
        const addExpenseBtn = document.getElementById('add-expense-btn');
        if(addExpenseBtn) addExpenseBtn.addEventListener('click', openExpenseModal);

        // 収入追加ボタン (index.htmlにのみ存在)
        const addIncomeBtn = document.getElementById('add-income-btn');
        if(addIncomeBtn) addIncomeBtn.addEventListener('click', openIncomeModal);

        // モーダルを閉じる
        closeModalBtn.addEventListener('click', () => modalContainer.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.style.display = 'none';
            }
        });

        // フォーム送信
        document.getElementById('expense-form').addEventListener('submit', handleExpenseFormSubmit);
        const incomeForm = document.getElementById('income-form');
        if (incomeForm) incomeForm.addEventListener('submit', handleIncomeFormSubmit);
    }
}

//======================================================================
// 6. 月の操作とデータ取得
//======================================================================
// 月を変更する
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    }
    if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    updateMonthDisplayAndFetchData();
}

// 月表示を更新し、データを取得する
function updateMonthDisplayAndFetchData() {
    document.getElementById('current-month-display').textContent = `${currentYear}年 ${currentMonth}月`;
    fetchData(currentYear, currentMonth);
}

// Firestoreからデータを取得する
function fetchData(year, month) {
    // 支出データを取得 (リアルタイム更新)
    db.collection('expenses')
      .where('year', '==', year)
      .where('month', '==', month)
      .orderBy('date', 'desc')
      .onSnapshot(snapshot => {
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // ページに応じて描画処理を振り分け
        if (document.getElementById('expense-summary-table')) {
            renderExpenseSummary(expenses);
            // 収入データも取得済みなら振込額を計算
            db.collection('incomes').where('year', '==', year).where('month', '==', month).get().then(incomeSnapshot => {
                 const incomes = incomeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 renderTransferSummary(expenses, incomes);
            });
        }
        if (document.getElementById('expense-list-body')) {
            renderExpenseList(expenses);
        }
      });

    // 収入データを取得 (リアルタイム更新)
    db.collection('incomes')
      .where('year', '==', year)
      .where('month', '==', month)
      .onSnapshot(snapshot => {
        const incomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('income-summary-table')) {
            renderIncomeSummary(incomes);
            // 支出データも取得済みなら振込額を計算
            db.collection('expenses').where('year', '==', year).where('month', '==', month).get().then(expenseSnapshot => {
                const expenses = expenseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderTransferSummary(expenses, incomes);
           });
        }
      });
}

//======================================================================
// 7. 描画処理 (サマリーページ)
//======================================================================
// 支出サマリーを描画
function renderExpenseSummary(expenses) {
    const summary = {};
    EXPENSE_CATEGORIES.forEach(cat => summary[cat] = 0);
    
    let total = 0;
    expenses.forEach(exp => {
        if (summary.hasOwnProperty(exp.category)) {
            summary[exp.category] += exp.amount;
        }
        total += exp.amount;
    });

    const tbody = document.querySelector('#expense-summary-table tbody');
    tbody.innerHTML = '';
    EXPENSE_CATEGORIES.forEach(cat => {
        const row = `<tr>
                        <td>${cat}</td>
                        <td>${summary[cat].toLocaleString()}円</td>
                    </tr>`;
        tbody.innerHTML += row;
    });

    document.getElementById('expense-total').textContent = `${total.toLocaleString()}円`;
}

// 収入サマリーを描画
function renderIncomeSummary(incomes) {
    const summary = {};
    INCOME_SOURCES.forEach(src => summary[src] = 0);
    
    let total = 0;
    incomes.forEach(inc => {
        if (summary.hasOwnProperty(inc.source)) {
            summary[inc.source] += inc.amount;
        }
        total += inc.amount;
    });

    const tbody = document.querySelector('#income-summary-table tbody');
    tbody.innerHTML = '';
    INCOME_SOURCES.forEach(src => {
        const row = `<tr>
                        <td>${src}</td>
                        <td>${summary[src].toLocaleString()}円</td>
                    </tr>`;
        tbody.innerHTML += row;
    });
    
    document.getElementById('income-total').textContent = `${total.toLocaleString()}円`;
}

// 振込金額サマリーを描画
function renderTransferSummary(expenses, incomes) {
    const kosukeIncome = incomes.filter(i => i.source === '浩介').reduce((sum, i) => sum + i.amount, 0);
    const mayuIncome = incomes.filter(i => i.source === '真由').reduce((sum, i) => sum + i.amount, 0);

    const kosukeExpense = expenses.filter(e => e.payer === '浩介').reduce((sum, e) => sum + e.amount, 0);
    const mayuExpense = expenses.filter(e => e.payer === '真由').reduce((sum, e) => sum + e.amount, 0);

    const kosukeTransfer = kosukeIncome - kosukeExpense;
    const mayuTransfer = mayuIncome - mayuExpense;

    const tbody = document.querySelector('#transfer-summary-table tbody');
    tbody.innerHTML = `
        <tr>
            <td>浩介</td>
            <td class="${kosukeTransfer < 0 ? 'text-danger' : ''}">${kosukeTransfer.toLocaleString()}円</td>
        </tr>
        <tr>
            <td>真由</td>
            <td class="${mayuTransfer < 0 ? 'text-danger' : ''}">${mayuTransfer.toLocaleString()}円</td>
        </tr>
    `;
    // CSSでtext-dangerクラスに色を付ける (style.cssに追記)
    // .text-danger { color: var(--danger-color); }
}


//======================================================================
// 8. 描画処理 (一覧ページ)
//======================================================================
function renderExpenseList(expenses) {
    const tbody = document.getElementById('expense-list-body');
    if(!tbody) return;

    tbody.innerHTML = '';
    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">この月の支出はありません。</td></tr>';
        return;
    }
    
    expenses.forEach(exp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${exp.date}</td>
            <td>${exp.category}</td>
            <td>${exp.amount.toLocaleString()}円</td>
            <td>${exp.payer}</td>
            <td>${exp.memo || ''}</td>
            <td>
                <button class="btn btn-secondary" onclick="openExpenseModal('${exp.id}')">編集</button>
                <button class="btn btn-danger" onclick="deleteExpense('${exp.id}')">削除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

//======================================================================
// 9. モーダルとフォームの処理
//======================================================================
// 支出モーダルを開く
async function openExpenseModal(expenseId = null) {
    const form = document.getElementById('expense-form');
    form.reset();
    document.getElementById('expense-id').value = '';

    const modalTitle = document.getElementById('modal-title');
    const modalContainer = document.getElementById('modal-container');
    const incomeForm = document.getElementById('income-form');
    if (incomeForm) incomeForm.style.display = 'none';
    form.style.display = 'block';

    if (expenseId) {
        // 編集モード
        modalTitle.textContent = '支出を編集';
        const doc = await db.collection('expenses').doc(expenseId).get();
        const data = doc.data();
        document.getElementById('expense-id').value = expenseId;
        document.getElementById('expense-date').value = data.date;
        document.getElementById('expense-category').value = data.category;
        document.getElementById('expense-amount').value = data.amount;
        document.getElementById('expense-payer').value = data.payer;
        document.getElementById('expense-memo').value = data.memo;
    } else {
        // 新規追加モード
        modalTitle.textContent = '支出を追加';
        document.getElementById('expense-date').valueAsDate = new Date();
    }
    
    modalContainer.style.display = 'flex';
}

// 収入モーダルを開く
function openIncomeModal() {
    const form = document.getElementById('income-form');
    form.reset();
    document.getElementById('income-id').value = '';

    document.getElementById('modal-title').textContent = '収入を追加';
    document.getElementById('expense-form').style.display = 'none';
    form.style.display = 'block';

    document.getElementById('modal-container').style.display = 'flex';
}

// 支出フォーム送信処理
async function handleExpenseFormSubmit(e) {
    e.preventDefault();
    const expenseId = document.getElementById('expense-id').value;
    const date = document.getElementById('expense-date').value;
    const dateObj = new Date(date);

    const data = {
        date: date,
        year: dateObj.getFullYear(),
        month: dateObj.getMonth() + 1,
        category: document.getElementById('expense-category').value,
        amount: parseInt(document.getElementById('expense-amount').value, 10),
        payer: document.getElementById('expense-payer').value,
        memo: document.getElementById('expense-memo').value,
    };

    try {
        if (expenseId) {
            // 更新
            await db.collection('expenses').doc(expenseId).update(data);
            alert('支出を更新しました。');
        } else {
            // 新規作成
            await db.collection('expenses').add(data);
            alert('支出を追加しました。');
        }
        document.getElementById('modal-container').style.display = 'none';
    } catch (error) {
        console.error("Error writing document: ", error);
        alert('エラーが発生しました。');
    }
}

// 収入フォーム送信処理
async function handleIncomeFormSubmit(e) {
    e.preventDefault();
    const incomeId = document.getElementById('income-id').value;

    const data = {
        source: document.getElementById('income-source').value,
        amount: parseInt(document.getElementById('income-amount').value, 10),
        memo: document.getElementById('income-memo').value,
        year: currentYear,
        month: currentMonth,
    };

    try {
        if (incomeId) {
            // 更新 (今回は収入の編集機能はUIにないが、将来のために)
            await db.collection('incomes').doc(incomeId).update(data);
            alert('収入を更新しました。');
        } else {
            // 新規作成
            await db.collection('incomes').add(data);
            alert('収入を追加しました。');
        }
        document.getElementById('modal-container').style.display = 'none';
    } catch (error) {
        console.error("Error writing document: ", error);
        alert('エラーが発生しました。');
    }
}

//======================================================================
// 10. データの削除
//======================================================================
// `onclick`属性から呼び出せるように、グローバルスコープに関数を定義
async function deleteExpense(expenseId) {
    if (confirm('この支出を削除しますか？')) {
        try {
            await db.collection('expenses').doc(expenseId).delete();
            alert('支出を削除しました。');
            // onSnapshotを使っているので、画面は自動で更新される
        } catch (error) {
            console.error("Error removing document: ", error);
            alert('削除中にエラーが発生しました。');
        }
    }
}