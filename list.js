// script.js と同じ firebaseConfig をここに貼り付けます
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
    const listTitle = document.getElementById('list-title');
    const expenseListTbody = document.querySelector('#expense-list-table tbody');

    /**
     * URLから年月を取得し、データを表示する
     */
    async function displayExpenseList() {
        const params = new URLSearchParams(window.location.search);
        const year = parseInt(params.get('year'));
        const month = parseInt(params.get('month')); // 0-11

        if (isNaN(year) || isNaN(month)) {
            listTitle.textContent = "月の指定がありません";
            return;
        }

        listTitle.textContent = `${year}年 ${month + 1}月の支出一覧`;

        // 当月の開始日と終了日を計算
        const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
        const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);
        
        // Firestoreからデータを取得
        const snapshot = await db.collection('expenses')
                                 .where('date', '>=', startDate)
                                 .where('date', '<=', endDate)
                                 .orderBy('date', 'desc') // 日付の降順でソート
                                 .get();
        
        const expenses = snapshot.docs.map(doc => doc.data());
        
        renderExpenseList(expenses);
    }

    /**
     * 取得したデータをテーブルに描画する
     */
    function renderExpenseList(expenses) {
        if (expenses.length === 0) {
            expenseListTbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">この月の支出データはありません。</td></tr>`;
            return;
        }

        expenseListTbody.innerHTML = '';
        expenses.forEach(expense => {
            const row = `
                <tr>
                    <td data-label="日付">${expense.date}</td>
                    <td data-label="カテゴリ">${expense.category}</td>
                    <td data-label="金額">${formatCurrency(expense.amount)}</td>
                    <td data-label="メモ">${expense.memo || '-'}</td>
                    <td data-label="支払方法">${expense.payer}</td>
                </tr>
            `;
            expenseListTbody.innerHTML += row;
        });
    }

    function formatCurrency(amount) {
        return `¥${amount.toLocaleString()}`;
    }

    displayExpenseList();
});