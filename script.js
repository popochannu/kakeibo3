document.addEventListener('DOMContentLoaded', () => {

    // --- 定数とDOM要素の取得 ---
    const expenseForm = document.getElementById('expense-form');
    const incomeForm = document.getElementById('income-form');
    const expenseDateInput = document.getElementById('expense-date');
    const currentMonthDisplay = document.getElementById('current-month');
    
    const expenseTbody = document.querySelector('#expense-summary-table tbody');
    const incomeTbody = document.querySelector('#income-summary-table tbody');
    const transferTbody = document.querySelector('#transfer-summary-table tbody');

    const expenseCategories = ['食費', '日用品', 'すまい', '外食費', '交通費', '保険', '光熱費', '通信費', '交際費', '医療費', '投資', 'お小遣い'];
    const incomeSources = ['浩介', '真由'];
    const transferPersons = ['浩介', '真由'];

    // --- データ管理 ---
    // localStorageからデータを読み込む。なければ空の配列を初期値とする。
    let expenses = JSON.parse(localStorage.getItem('fukaiKakeibo_expenses')) || [];
    let incomes = JSON.parse(localStorage.getItem('fukaiKakeibo_incomes')) || [];

    // --- イベントリスナー ---
    expenseForm.addEventListener('submit', addExpense);
    incomeForm.addEventListener('submit', addIncome);


    // --- 関数定義 ---

    /**
     * 支出を追加する関数
     */
    function addExpense(e) {
        e.preventDefault();
        const newExpense = {
            date: expenseForm['expense-date'].value,
            category: expenseForm['expense-category'].value,
            amount: parseInt(expenseForm['expense-amount'].value, 10),
            payer: expenseForm['expense-payer'].value,
            memo: expenseForm['expense-memo'].value
        };
        expenses.push(newExpense);
        localStorage.setItem('fukaiKakeibo_expenses', JSON.stringify(expenses));
        expenseForm.reset();
        setDefaultDate();
        updateUI();
    }

    /**
     * 収入を追加する関数
     */
    function addIncome(e) {
        e.preventDefault();
        const newIncome = {
            date: new Date().toISOString().slice(0, 10), // 収入は登録日で記録
            source: incomeForm['income-source'].value,
            amount: parseInt(incomeForm['income-amount'].value, 10),
            memo: incomeForm['income-memo'].value
        };
        incomes.push(newIncome);
        localStorage.setItem('fukaiKakeibo_incomes', JSON.stringify(incomes));
        incomeForm.reset();
        updateUI();
    }

    /**
     * UI全体を更新する関数
     */
    function updateUI() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11

        // 表示月の設定
        currentMonthDisplay.textContent = `${year}年 ${month + 1}月`;
        
        // 当月のデータにフィルタリング
        const currentMonthExpenses = expenses.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getFullYear() === year && itemDate.getMonth() === month;
        });
        const currentMonthIncomes = incomes.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getFullYear() === year && itemDate.getMonth() === month;
        });

        // ① 支出の表を更新
        updateExpenseSummary(currentMonthExpenses);

        // ② 収入の表を更新
        const incomeTotals = updateIncomeSummary(currentMonthIncomes);
        
        // ③ 振込金額の表を更新
        updateTransferSummary(currentMonthExpenses, incomeTotals);
    }
    
    /**
     * ① 支出の表を更新
     */
    function updateExpenseSummary(currentMonthExpenses) {
        const summary = {};
        expenseCategories.forEach(cat => summary[cat] = 0);
        
        currentMonthExpenses.forEach(expense => {
            if (summary[expense.category] !== undefined) {
                summary[expense.category] += expense.amount;
            }
        });

        expenseTbody.innerHTML = '';
        expenseCategories.forEach(cat => {
            const row = `<tr>
                           <td>${cat}</td>
                           <td>${formatCurrency(summary[cat])}</td>
                       </tr>`;
            expenseTbody.innerHTML += row;
        });
    }

    /**
     * ② 収入の表を更新
     */
    function updateIncomeSummary(currentMonthIncomes) {
        const summary = {};
        incomeSources.forEach(src => summary[src] = 0);

        currentMonthIncomes.forEach(income => {
            if (summary[income.source] !== undefined) {
                summary[income.source] += income.amount;
            }
        });

        incomeTbody.innerHTML = '';
        incomeSources.forEach(src => {
            const row = `<tr>
                           <td>${src}</td>
                           <td>${formatCurrency(summary[src])}</td>
                       </tr>`;
            incomeTbody.innerHTML += row;
        });
        return summary; // 計算結果を返す
    }

    /**
     * ③ 振込金額の表を更新
     */
    function updateTransferSummary(currentMonthExpenses, incomeTotals) {
        const expenseByUser = {};
        transferPersons.forEach(person => expenseByUser[person] = 0);

        currentMonthExpenses.forEach(expense => {
            // 支払者が浩介または真由の場合のみ集計
            if (expenseByUser[expense.payer] !== undefined) {
                expenseByUser[expense.payer] += expense.amount;
            }
        });
        
        transferTbody.innerHTML = '';
        transferPersons.forEach(person => {
            const income = incomeTotals[person] || 0;
            const expense = expenseByUser[person] || 0;
            const transferAmount = income - expense;
            
            const row = `<tr>
                           <td>${person}</td>
                           <td>${formatCurrency(transferAmount)}</td>
                       </tr>`;
            transferTbody.innerHTML += row;
        });
    }

    /**
     * 日付入力のデフォルトを今日にする
     */
    function setDefaultDate() {
        const today = new Date().toISOString().slice(0, 10);
        expenseDateInput.value = today;
    }

    /**
     * 金額を円表記にフォーマットする
     */
    function formatCurrency(amount) {
        return `¥${amount.toLocaleString()}`;
    }

    // --- アプリケーションの初期化 ---
    function initializeApp() {
        setDefaultDate();
        updateUI();
    }
    
    initializeApp();
});