// 1. ดึงข้อมูลจาก LocalStorage หรือตั้งเป็นอาเรย์ว่างถ้ายังไม่มีข้อมูล
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// 2. ฟังก์ชันควบคุมการสลับหน้าเว็บ (Page Navigation)
function navigateTo(pageId) {
    // ซ่อนทุกหน้าก่อน
    document.querySelectorAll('.view-page').forEach(page => {
        page.classList.add('hidden');
    });

    // แสดงหน้าทื่เลือก
    document.getElementById(`page-${pageId}`).classList.remove('hidden');

    // โหลดฟังก์ชันเฉพาะของหน้านั้นๆ
    if (pageId === 'dashboard') {
        updateDashboard();
    } else if (pageId === 'all-transactions') {
        renderAllTransactions();
    }
}

// 1. สร้างตัวแปรส่วนกลางเพื่อจำว่าตอนนี้เราเลือกฟิลเตอร์อะไรอยู่ (ค่าเริ่มต้นเป็น 'day' หรือตามใจชอบ)
let currentFilter = 'day';

// 2. ฟังก์ชันสลับสถานะปุ่มและสั่งอัปเดตข้อมูล
function changeFilter(filterType, buttonElement) {
    currentFilter = filterType;

    // สลับคลาส active ของปุ่มเพื่อให้สีไฮไลท์เปลี่ยนตามที่กด
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    // สั่งคำนวณเงินและวาดกราฟใหม่ตามฟิลเตอร์ที่เลือก
    updateDashboard();
}

// 3. 🛠️ แก้ไขฟังก์ชัน updateDashboard() ของเดิม ให้รองรับการกรองข้อมูลช่วงเวลา
function updateDashboard() {
    let income = 0;
    let expenses = 0;

    const now = new Date();

    // กรองข้อมูลธุรกรรมตามเงื่อนไขช่วงเวลาที่เลือก
    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);

        if (currentFilter === 'day') {
            // ดูเฉพาะของวันนี้
            return tDate.toDateString() === now.toDateString();

        } else if (currentFilter === 'week') {
            // ดูของสัปดาห์นี้ (นับย้อนหลังไป 7 วันจากวันนี้)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            return tDate >= oneWeekAgo && tDate <= now;

        } else if (currentFilter === 'month') {
            // ดูเฉพาะของเดือนนี้และปีนี้
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        }
        return true;
    });

    // คำนวณหายอดรวมจากเฉพาะรายการที่ผ่านการกรองแล้ว
    filteredTransactions.forEach(t => {
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expenses += t.amount;
    });

    let balance = income - expenses;
    let savings = income - expenses; // หรือปรับสูตรเงินออมตามชอบ

    // อัปเดตตัวเลขแสดงผลบนการ์ด 4 ใบ
    document.getElementById('total-balance').innerText = `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    document.getElementById('total-income').innerText = `$${income.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    document.getElementById('total-expenses').innerText = `$${expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    document.getElementById('total-savings').innerText = `$${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // แสดงรายการล่าสุด (อิงตามทั้งหมด หรือ filtered ก็ได้ แล้วแต่คุณเลือก)
    renderRecentTransactions();

    // อัปเดตกราฟแท่งคู่ให้เปลี่ยนตามเงื่อนไข (จะเรียกฟังก์ชันกราฟที่เราทำไว้สัปดาห์ก่อนมาทำงาน)
    renderChart();
}

// 4. ฟังก์ชันแสดงรายการล่าสุดหน้า Dashboard (ภาพที่ 2)
function renderRecentTransactions() {
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';

    // เรียงลำดับตามวันที่ล่าสุด และเอามาแค่ 5 รายการแรก
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    sorted.forEach(t => {
        const sign = t.type === 'income' ? '+' : '-';
        const cssClass = t.type === 'income' ? 'text-income' : 'text-expense';

        recentList.innerHTML += `
            <div class="transaction-item">
                <div class="item-info">
                    <strong>${t.title}</strong>
                    <span class="item-category">${t.category}</span>
                </div>
                <div class="item-meta">
                    <span class="${cssClass}">${sign}$${t.amount.toFixed(2)}</span>
                    <span class="item-date">${t.date}</span>
                </div>
            </div>
        `;
    });
}

// 5. ฟังก์ชันสำหรับบันทึกข้อมูลจากฟอร์ม (ภาพที่ 3-4)
function handleFormSubmit(event, type) {
    event.preventDefault();

    const amount = parseFloat(document.getElementById(`${type}-amount`).value);
    const title = type === 'income' ? document.getElementById('income-source').value : 'Expense Item';
    const category = type === 'income' ? 'Income' : document.getElementById('expense-category').value;
    const date = document.getElementById(`${type}-date`).value;
    const description = document.getElementById(`${type}-desc`).value;

    const newTransaction = {
        id: Date.now(), // ใช้ค่าเวลาเป็น unique ID
        type,
        title,
        category,
        amount,
        date,
        description
    };

    transactions.push(newTransaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    // เคลียร์ฟอร์มและพากลับหน้าแรก
    clearForm(`${type}-form`);
    navigateTo('dashboard');
}

// 6. ฟังก์ชันล้างข้อมูลในฟอร์ม (ปุ่ม Clear)
function clearForm(formId) {
    document.getElementById(formId).reset();
}

// 7. ฟังก์ชันแสดงรายการทั้งหมดในหน้าตาราง (ภาพที่ 5)
function renderAllTransactions() {
    const tbody = document.getElementById('all-transactions-table-body');
    tbody.innerHTML = '';

    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(t => {
        const sign = t.type === 'income' ? '+' : '';
        tbody.innerHTML += `
            <tr>
                <td>${t.date}</td>
                <td>${t.title}</td>
                <td>${t.category}</td>
                <td>${sign}$${t.amount.toFixed(2)}</td>
                <td><button onclick="deleteTransaction(${t.id})" class="btn-delete">❌</button></td>
            </tr>
        `;
    });
}

// 8. ฟังก์ชันลบรายการ
function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        renderAllTransactions();
    }
}

// เมื่อโหลดเว็บครั้งแรก ให้เปิดหน้า Dashboard เสมอ
window.onload = function () {
    navigateTo('dashboard');
};

let overviewChart;

// 🛠️ แก้ไขฟังก์ชัน renderChart() ใน app.js ให้เปลี่ยนตามปุ่มที่กดจริง
function renderChart() {
    const ctx = document.getElementById('overviewChart').getContext('2d');
    const now = new Date();

    let labels = [];
    let incomeData = [];
    let expenseData = [];

    // ================= เคสที่ 1: เลือกดูเฉพาะวันนี้ (Today) =================
    if (currentFilter === 'day') {
        labels = ['Today'];
        let incomeSum = 0;
        let expenseSum = 0;

        transactions.forEach(t => {
            if (new Date(t.date).toDateString() === now.toDateString()) {
                if (t.type === 'income') incomeSum += t.amount;
                else expenseSum += t.amount;
            }
        });
        incomeData = [incomeSum];
        expenseData = [expenseSum];
    }

    // ================= เคสที่ 2: เลือกดูสัปดาห์นี้ (This Week) =================
    else if (currentFilter === 'week') {
        // สร้าง Label ย้อนหลัง 7 วัน (เช่น 28 May, 29 May, ... จนถึงวันนี้)
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            labels.push(dateStr);

            // หา ยอดรวมรายรับ-รายจ่าย ของวันนั้นๆ
            let incStr = 0, expStr = 0;
            transactions.forEach(t => {
                if (new Date(t.date).toDateString() === d.toDateString()) {
                    if (t.type === 'income') incStr += t.amount;
                    else expStr += t.amount;
                }
            });
            incomeData.push(incStr);
            expenseData.push(expStr);
        }
    }

    // ================= เคสที่ 3: เลือกดูเดือนนี้ (This Month) =================
    else if (currentFilter === 'month') {
        // ดึงชื่อเดือนปัจจุบันมาโชว์ตัวเปรียบเทียบรวม
        const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
        labels = [currentMonthName];

        let incomeSum = 0;
        let expenseSum = 0;
        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) {
                if (t.type === 'income') incomeSum += t.amount;
                else expenseSum += t.amount;
            }
        });
        incomeData = [incomeSum];
        expenseData = [expenseSum];
    }

    // สั่งทำลายกราฟเก่าก่อนวาดใหม่ (ห้ามลืมเด็ดขาด ไม่งั้นกราฟจะซ้อนพังครับ)
    if (overviewChart) {
        overviewChart.destroy();
    }

    // วาดกราฟใหม่ด้วยชุดข้อมูลที่ผ่านการกรองช่วงเวลามาแล้ว
    overviewChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#0b0f19',
                    borderRadius: 6
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#8c8e97',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// 3. แยกอาร์เรย์ของ Income และ Expense ออกมาส่งให้ Chart.js
const incomeDataset = [];
const expenseDataset = [];

// แกะข้อมูลที่คำนวณเสร็จแล้วเรียงตามลำดับเดือนเพื่อป้อนเข้ากราฟ
Object.keys(monthlyData).sort().forEach(key => {
    incomeDataset.push(monthlyData[key].income);
    expenseDataset.push(monthlyData[key].expense);
});

// 4. สั่งทำลายกราฟเก่าก่อนวาดใหม่ (ป้องกันบั๊กกราฟซ้อนเวลากดสลับหน้า)
if (overviewChart) {
    overviewChart.destroy();
}

// 5. วาดกราฟแท่งคู่ ถอดสีสันและดีไซน์มินิมอลตามแบบ Figma
overviewChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: monthsLabels, // แถวชื่อเดือนด้านล่าง [Jan, Feb, ...]
        datasets: [
            {
                label: 'Income',
                data: incomeDataset,          // แท่งรายรับดึงจากข้อมูลจริง
                backgroundColor: '#0b0f19',    // สีดำ/น้ำเงินเข้มตาม Figma
                borderRadius: 6,               // ความโค้งมนของปลายแท่งกราฟ
                barPercentage: 0.6,
                categoryPercentage: 0.5
            },
            {
                label: 'Expenses',
                data: expenseDataset,         // แท่งรายจ่ายดึงจากข้อมูลจริง
                backgroundColor: '#8c8e97',    // สีเทาอ่อนตาม Figma
                borderRadius: 6,
                barPercentage: 0.6,
                categoryPercentage: 0.5
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false, // ช่วยให้กราฟยืดหยุ่นตามความสูงของ Container
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 12,
                    font: { size: 12, family: 'Segoe UI' }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false } // ปิดเส้นตารางแนวตั้งเพื่อให้ดูคลีนมินิมอล
            },
            y: {
                beginAtZero: true,
                grid: { color: '#e9ecef' }, // เส้นตารางแนวนอนสีเทาจางๆ
                ticks: {
                    callback: function (value) { return '$' + value; } // ใส่เครื่องหมาย $ หน้าตัวเลขแกน Y
                }
            }
        }
    }
});
function scanSlip() {
    const fileInput = document.getElementById('slip-file');
    const statusText = document.getElementById('scan-status');
    const amountInput = document.getElementById('expense-amount');
    const dateInput = document.getElementById('expense-date');

    if (fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    statusText.innerText = "⏳ กำลังถอดรหัสวันที่และจำนวนเงิน... (5-10 วินาที)";
    statusText.style.color = "var(--text-muted)";

    Tesseract.recognize(
        file,
        'eng+tha',
        { logger: m => console.log(`[OCR]: ${m.status} -> ${Math.round(m.progress * 100)}%`) }
    ).then(({ data: { text } }) => {

        console.log("Raw Text Output:\n", text);


        const cleanText = text.replace(/\s+/g, '');
        const lowerCleanText = cleanText.toLowerCase();

        let detectedAmount = null;
        let detectedDate = null;


        if (cleanText.includes("จำนวน")) {
            const amountPart = cleanText.split("จำนวน")[1].split("บาท")[0];
            // ดึงเฉพาะตัวเลขและจุดทศนิยมออกมาจากก้อนนั้น
            const numericMatch = amountPart.match(/\d+(?:\.\d{2})?/);
            if (numericMatch) {
                detectedAmount = parseFloat(numericMatch[0]);
            }
        }


        if (!detectedAmount) {
            const decimalPattern = /\d{1,3}(?:,\d{3})*\.\d{2}/g;
            let matches = cleanText.match(decimalPattern);
            if (matches && matches.length > 0) {
                detectedAmount = parseFloat(matches[0].replace(/,/g, ''));
            }
        }


        const cleanTextNoDot = text.replace(/[\s\.]+/g, '');
        const lowerCleanTextNoDot = cleanTextNoDot.toLowerCase();

        const monthsThaiClean = ['มค', 'กพ', 'มีค', 'เมย', 'พค', 'มิย', 'กค', 'สค', 'กย', 'ตค', 'พย', 'ธค'];

        for (let mIndex = 0; mIndex < monthsThaiClean.length; mIndex++) {
            const monthKeyword = monthsThaiClean[mIndex];

            if (lowerCleanTextNoDot.includes(monthKeyword)) {

                const regex = new RegExp(`(\\d{1,2})${monthKeyword}(\\d{2,4})`);
                const monthMatch = lowerCleanTextNoDot.match(regex);

                if (monthMatch) {
                    let day = monthMatch[1].padStart(2, '0');
                    let thaiYearStr = monthMatch[2];
                    let christianYear;

                    if (thaiYearStr.length === 4) {
                        christianYear = parseInt(thaiYearStr) - 543;
                    } else if (thaiYearStr.length === 2) {
                        christianYear = parseInt("25" + thaiYearStr) - 543;
                    } else {
                        christianYear = new Date().getFullYear();
                    }

                    let monthNum = String(mIndex + 1).padStart(2, '0');
                    const currentYear = new Date().getFullYear();

                    if (christianYear > currentYear || christianYear < 2000) {
                        christianYear = currentYear;
                    }

                    detectedDate = `${christianYear}-${monthNum}-${day}`;
                    break;
                }
            }
        }


        if (amountInput && detectedAmount && !isNaN(detectedAmount)) {
            amountInput.value = detectedAmount.toFixed(2);
        }

        if (dateInput && detectedDate) {
            dateInput.value = detectedDate;
        }


        if (detectedAmount || detectedDate) {
            statusText.innerText = `✅ สแกนสำเร็จ! ยอดเงิน: $${detectedAmount || 'หาไม่เจอ'} | วันที่: ${detectedDate || 'หาไม่เจอ'}`;
            statusText.style.color = "var(--income-color)";
        } else {
            statusText.innerText = "⚠️ ระบบแกะรหัสคำเฉพาะไม่สำเร็จ กรุณากรอกด้วยตัวเองนะครับ";
            statusText.style.color = "var(--text-muted)";
        }

    }).catch(err => {
        console.error("OCR Error:", err);
        statusText.innerText = "❌ เกิดข้อผิดพลาดในระบบสแกนสลิป";
        statusText.style.color = "var(--expense-color)";
    });
}

