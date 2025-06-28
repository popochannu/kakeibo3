// 【STEP 1-2】でコピーした `firebaseConfig` をここに貼り付けます
const firebaseConfig = {
apiKey: "AIzaSyBFaQyv0RlBMgnIKkgRzzVdmgTznQfSvOc",
authDomain: "fukai-kakeibo3-app.firebaseapp.com",
projectId: "fukai-kakeibo3-app",
storageBucket: "fukai-kakeibo3-app.firebasestorage.app",
messagingSenderId: "947125778820",
appId: "1:947125778820:web:68f283cc32f1d816ed45d1",
measurementId: "G-DS8B57NTET"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素の取得 ---
    const expenseForm = document.getElementById('expense-form');
    const incomeForm = document.getElementById('income-form');
    const expenseDateInput = document.getElementById('expense-date');
    const currentMonthDisplay = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const viewListBtn = document.getElementById('view-list-btn');
    
    const expenseTbody = document.querySelector('#expense-summary-table tbody');
    const incomeTbody = document.querySelector('#income-summary-table tbody');
    const transferTbody = document.querySelector('#transfer-summary-table tbody');

    const expenseCategories = ['食費', '日用品', 'すまい', '外食費', '交通費', '保険', '光熱費', '通信費', '交際費', '医療費', '投資', 'お小遣い'];
    const incomeSources = ['浩介', '真由'];
    const transferPersons = ['浩介', '真由'];

    // --- 状態管理 ---
    let currentDisplayDate = new Date();

    // --- イベントリスナー ---
    expenseForm.addEventListener('submit', addExpense);
    incomeForm.addEventListener('submit', addIncome);
    prevMonthBtn.addEventListener('click', moveToPrevMonth);
    nextMonthBtn.addEventListener('click', moveToNextMonth);
    viewListBtn.addEventListener('click', goToListView);

    /**
     * 支出をFirestoreに追加
     */
    async function addExpense(e) {
        e.preventDefault();
        const newExpense = {
            date: expenseForm['expense-date'].value,
            category: expenseForm['expense-category'].value,
            amount: parseInt(expenseForm['expense-amount'].value, 10),
            payer: expenseForm['expense-payer'].value,
            memo: expenseForm['expense-memo'].value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // 登録日時
        };
        try {
            await db.collection('expenses').add(newExpense);
            expenseForm.reset();
            setDefaultDate();
            updateUI();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("データの保存に失敗しました。");
        }
    }

    /**
     * 収入をFirestoreに追加
     */
    async function addIncome(e) {
        e.preventDefault();
        const newIncome = {
            // 収入日は入力フォームがないので、月の初日として保存
            date: new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth(), 1).toISOString().slice(0,10),
            source: incomeForm['income-source'].value,
            amount: parseInt(incomeForm['income-amount'].value, 10),
            memo: incomeForm['income-memo'].value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            await db.collection('incomes').add(newIncome);
            incomeForm.reset();
            updateUI();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("データの保存に失敗しました。");
        }
    }
    
    /**
     * UI全体を更新
     */
    async function updateUI() {
        const year = currentDisplayDate.getFullYear();
        const month = currentDisplayDate.getMonth(); // 0-11

        currentMonthDisplay.textContent = `${year}年 ${month + 1}月`;
        
        // 当月の開始日と終了日を計算
        const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
        const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

        // Firestoreからデータを非同期で取得
        const [expenses, incomes] = await Promise.all([
            fetchData('expenses', startDate, endDate),
            fetchData('incomes', startDate, endDate)
        ]);

        updateExpenseSummary(expenses);
        const incomeTotals = updateIncomeSummary(incomes);
        updateTransferSummary(expenses, incomeTotals);
    }

    /**
     * Firestoreから指定期間のデータを取得する汎用関数
     */
    async function fetchData(collectionName, startDate, endDate) {
        const snapshot = await db.collection(collectionName)
                                 .where('date', '>=', startDate)
                                 .where('date', '<=', endDate)
                                 .get();
        return snapshot.docs.map(doc => doc.data());
    }
    
    // --- 月移動の関数 ---
    function moveToPrevMonth() {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        updateUI();
    }
    function moveToNextMonth() {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        updateUI();
    }
    function goToListView(e) {
        e.preventDefault();
        const year = currentDisplayDate.getFullYear();
        const month = currentDisplayDate.getMonth();
        window.location.href = `list.html?year=${year}&month=${month}`;
    }

    // --- 初期化 ---
    function initializeApp() {
        setDefaultDate();
        updateUI();
    }
    
    initializeApp();

    // 以下の関数は変更なしなので、元のコードをそのまま貼り付けてください
    // updateExpenseSummary(expenses)
    // updateIncomeSummary(incomes)
    // updateTransferSummary(expenses, incomeTotals)
    // setDefaultDate()
    // formatCurrency(amount)
});