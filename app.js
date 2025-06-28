//======================================================================
// 1. Firebaseの初期化
//======================================================================
// Firebaseコンソールで取得した `firebaseConfig` をここに貼り付け
// ▼▼▼▼▼ ここにFirebaseコンソールで取得した自分の設定を貼り付け ▼▼▼▼▼
const firebaseConfig = {
  apiKey: "AIzaSy...YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "1:your-app-id:web:your-web-app-id"
};
// ▲▲▲▲▲ ここまで ▲▲▲▲▲

// Firebaseアプリを初期化
firebase.initializeApp(firebaseConfig);

// Firestoreのインスタンス（データベースとやり取りするためのオブジェクト）を取得
const db = firebase.firestore();


//======================================================================
// 2. 定数とグローバル変数
//======================================================================
// カテゴリ、支払方法、収入源の定義
const EXPENSE_CATEGORIES = ['食費', '日用品', 'すまい', '外食費', '交通費', '保険', '光熱費', '通信費', '交際費', '医療費', '投資', 'お小遣い', 'その他'];
const PAYERS = ['浩介', '真由', 'ポイント', '家族'];
const INCOME_SOURCES = ['浩介', '真由'];

// 現在表示している年月を保持するグローバル変数
let currentYear;
let currentMonth;


//======================================================================
// 3. ページの初期化処理
//======================================================================
// HTMLドキュメントが完全に読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    // 現在の年月で初期化
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth() + 1; // getMonth()は0から始まるため+1

    initializePage();
});

// ページ全体の初期化を行う関数
function initializePage() {
    setupEventListeners(); // イベントリスナーをセット
    
    // モーダルが存在するページ（index.html, list.html）の場合、フォームの選択肢を生成
    if (document.getElementById('modal-container')) {
        populateSelect('expense-category', EXPENSE_CATEGORIES);
        populateSelect('expense-payer', PAYERS);
        populateSelect('income-source', INCOME_SOURCES);
    }
    
    // 月表示を更新し、データの取得を開始する
    updateMonthDisplayAndFetchData();
}

// セレクトボックス（プルダウン）に選択肢を動的に追加するヘルパー関数
function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return; // 対象の要素がなければ何もしない
    
    select.innerHTML = ''; // 既存の選択肢をクリア
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
}


//======================================================================
// 4. イベントリスナーの設定
//======================================================================
function setupEventListeners() {
    // 月移動ボタン（前月・次月）
    document.getElementById('prev-month-btn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month-btn').addEventListener('click', () => changeMonth(1));

    // モーダル関連の要素がある場合のみリスナーを設定
    if (document.getElementById('modal-container')) {
        const modalContainer = document.getElementById('modal-container');
        const closeModalBtn = document.getElementById('close-modal-btn');
        
        // 「支出を追加」ボタンを押したときの処理 (index.htmlにのみ存在)
        const addExpenseBtn = document.getElementById('add-expense-btn');
        if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => openExpenseModal());

        // 「収入を追加」ボタン (index.htmlにのみ存在)
        const addIncomeBtn = document.getElementById('add-income-btn');
        if (addIncomeBtn) addIncomeBtn.addEventListener('click', openIncomeModal);

        // モーダルを閉じる処理 (×ボタン、モーダル外のクリック)
        closeModalBtn.addEventListener('click', () => modalContainer.style.display = 'none');
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                modalContainer.style.display = 'none';
            }
        });

        // フォームが送信されたときの処理
        document.getElementById('expense-form').addEventListener('submit', handleExpenseFormSubmit);
        const incomeForm = document.getElementById('income-form');
        if (incomeForm) incomeForm.addEventListener('submit', handleIncomeFormSubmit);
    }
}


//======================================================================
// 5. 月の操作とデータ取得
//======================================================================
// 月を変更する関数
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

// 月表示を更新し、データの取得をトリガーする関数
function updateMonthDisplayAndFetchData() {
    document.getElementById('current-month-display').textContent = `${currentYear}年 ${currentMonth}月`;
    fetchData(currentYear, currentMonth);
}

// Firestoreからデータをリアルタイムで取得する関数
function fetchData(year, month) {
    // onSnapshot: Firestoreのデータが変更されると自動的に再実行され、リアルタイムに画面が更新される
    
    // --- 支出データの監視 ---
    db.collection('expenses')
      .where('year', '==', year)
      .where('month', '==', month)
      .orderBy('date', 'desc') // 日付の降順で取得
      .onSnapshot(snapshot => {
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // ページに応じて描画処理を振り分け
        if (document.getElementById('expense-summary-table')) renderExpenseSummary(expenses);
        if (document.getElementById('expense-list-body')) renderExpenseList(expenses);

        // 収入データも取得し、収支計算と振込額の描画を行う
        db.collection('incomes').where('year', '==', year).where('month', '==', month).get().then(incomeSnapshot => {
            const incomes = incomeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (document.getElementById('transfer-summary-table')) renderTransferSummary(expenses, incomes);
        });
      });

    // --- 収入データの監視 ---
    db.collection('incomes')
      .where('year', '==', year)
      .where('month', '==', month)
      .onSnapshot(snapshot => {
        const incomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('income-summary-table')) renderIncomeSummary(incomes);
        // 収支計算は支出データの監視側でまとめて実行するため、ここでは収入サマリーの描画のみ
      });
}


//======================================================================
// 6. 描画処理 (サマリーページ)
//======================================================================
// 支出サマリーテーブルを描画
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

// 収入サマリーテーブルを描画
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

// 振込金額サマリーテーブルを描画
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
// 8. モーダルとフォームの処理
//======================================================================

/**
 * 支出入力モーダルを開く関数
 * @param {string | null} expenseId - 編集対象の支出ID。新規作成の場合はnull。
 */
async function openExpenseModal(expenseId = null) {
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('expense-form');
    form.reset(); // フォームの内容をクリア
    document.getElementById('expense-id').value = ''; // 隠しIDフィールドをクリア

    // 収入フォームを隠し、支出フォームを表示
    const incomeForm = document.getElementById('income-form');
    if (incomeForm) incomeForm.style.display = 'none';
    form.style.display = 'block';

    if (expenseId) {
        // --- 編集モード ---
        modalTitle.textContent = '支出を編集';
        // Firestoreから該当IDのデータを取得
        const doc = await db.collection('expenses').doc(expenseId).get();
        if (!doc.exists) {
            alert('データが見つかりませんでした。');
            return;
        }
        const data = doc.data();
        
        // フォームに既存のデータをセット
        document.getElementById('expense-id').value = expenseId;
        document.getElementById('expense-date').value = data.date;
        document.getElementById('expense-category').value = data.category;
        document.getElementById('expense-amount').value = data.amount;
        document.getElementById('expense-payer').value = data.payer;
        document.getElementById('expense-memo').value = data.memo;

    } else {
        // --- 新規追加モード ---
        modalTitle.textContent = '支出を追加';
        // 日付のデフォルト値を今日にする
        document.getElementById('expense-date').valueAsDate = new Date();
    }
    
    // モーダルを表示
    modalContainer.style.display = 'flex';
}

/**
 * 収入入力モーダルを開く関数
 */
function openIncomeModal() {
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('income-form');
    form.reset();
    document.getElementById('income-id').value = '';

    // 支出フォームを隠し、収入フォームを表示
    document.getElementById('expense-form').style.display = 'none';
    form.style.display = 'block';
    modalTitle.textContent = '収入を追加';
    
    modalContainer.style.display = 'flex';
}

/**
 * 支出フォームが送信されたときの処理
 */
async function handleExpenseFormSubmit(e) {
    e.preventDefault(); // 既定の送信動作をキャンセル

    // フォームの入力値を取得
    const expenseId = document.getElementById('expense-id').value;
    const dateStr = document.getElementById('expense-date').value;
    const amount = document.getElementById('expense-amount').value;

    // --- 入力チェック（バリデーション） ---
    if (!dateStr || !amount || parseInt(amount, 10) < 0) {
        alert('日付と金額（0以上）は必須です。');
        return; // 処理を中断
    }

    const dateObj = new Date(dateStr);
    // Firestoreに保存するデータオブジェクトを作成
    const data = {
        date: dateStr,
        year: dateObj.getFullYear(),
        month: dateObj.getMonth() + 1,
        category: document.getElementById('expense-category').value,
        amount: parseInt(amount, 10),
        payer: document.getElementById('expense-payer').value,
        memo: document.getElementById('expense-memo').value.trim(), // 前後の空白を除去
    };

    try {
        if (expenseId) {
            // IDがあれば更新処理
            await db.collection('expenses').doc(expenseId).update(data);
            alert('支出を更新しました。');
        } else {
            // IDがなければ新規追加処理
            await db.collection('expenses').add(data);
            alert('支出を追加しました。');
        }
        // 成功したらモーダルを閉じる
        document.getElementById('modal-container').style.display = 'none';
    } catch (error) {
        console.error("データベースへの書き込みエラー: ", error);
        alert('エラーが発生しました。コンソールを確認してください。');
    }
}

/**
 * 収入フォームが送信されたときの処理
 */
async function handleIncomeFormSubmit(e) {
    e.preventDefault();
    const incomeId = document.getElementById('income-id').value;
    const amount = document.getElementById('income-amount').value;

    if(!amount || parseInt(amount, 10) < 0) {
        alert('金額（0以上）は必須です。');
        return;
    }

    const data = {
        source: document.getElementById('income-source').value,
        amount: parseInt(amount, 10),
        memo: document.getElementById('income-memo').value.trim(),
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
        console.error("データベースへの書き込みエラー: ", error);
        alert('エラーが発生しました。');
    }
}


//======================================================================
// 9. データの削除
//======================================================================
/**
 * 支出を削除する関数 (onclick属性から呼び出すためグローバルスコープに定義)
 * @param {string} expenseId - 削除対象の支出ID
 */
async function deleteExpense(expenseId) {
    // 削除前に確認ダイアログを表示
    if (confirm('この支出項目を本当に削除しますか？')) {
        try {
            await db.collection('expenses').doc(expenseId).delete();
            alert('支出を削除しました。');
            // 画面は onSnapshot によって自動的に更新されるため、再描画処理は不要
        } catch (error) {
            console.error("ドキュメントの削除エラー: ", error);
            alert('削除中にエラーが発生しました。');
        }
    }
}