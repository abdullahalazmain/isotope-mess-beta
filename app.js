let state = {
    isAdmin: false,
    customAdjLabel: "ফ্রিজ সমন্বয়",
    fixedCosts: {
        electricity: 1500,
        gas: 1800,
        waterBill: 800,
        wifi: 700,
        khala: 2500,
        waste: 70
    },
    members: [
        { name: "আজমাইন", meals: 59, bazarDeposit: 2451, rent: 2200, prevAdj: 96.67, fridgeAdj: -120 },
        { name: "রিয়াজ", meals: 42, bazarDeposit: 2299, rent: 2200, prevAdj: 96.67, fridgeAdj: -120 },
        { name: "সাকিব", meals: 5, bazarDeposit: 0, rent: 2000, prevAdj: -140.67, fridgeAdj: 480 },
        { name: "ওমর", meals: 0, bazarDeposit: 0, rent: 2000, prevAdj: -143.33, fridgeAdj: 0 },
        { name: "ফারেছ", meals: 43, bazarDeposit: 3391, rent: 1800, prevAdj: 96.67, fridgeAdj: -120 },
        { name: "নাফিজ", meals: 53, bazarDeposit: 0, rent: 1800, prevAdj: -472.26, fridgeAdj: -120 }
    ],
    notices: [
        { id: 1, text: "🚨 জুলাই ২০২৬ বিল পরিশোধের সময়সীমা: আগামী ৫ তারিখের মধ্যে ইউটিলিটি ও ৮ তারিখের মধ্যে বাসা ভাড়া দিতে হবে। মোট বাসা ভাড়া ১২,০০০ টাকা।", type: "notice-urgent" },
        { id: 2, text: "🌱 অগ্রিম ইউটিলিটি বিল: কারেন্ট ৳১৫০০, গ্যাস ৳১৮০০, পানি ৳৮০০, ওয়াইফাই ৳৭০০ এবং বর্তমান খালার বিল ৳২৫০০, ময়লা ৳৭০ হিসাবভুক্ত করা হয়েছে।", type: "notice-advance" },
        { id: 3, text: "🧊 ফ্রিজ বহনের BDT 600 হিসাব: সাকিব পরিশোধ করেছেন (ওমর বাদে বাকি ৫ জন BDT 120 করে শেয়ার করবেন)।", type: "notice-info" },
        { id: 4, text: "👥 জরুরি মিটিং: আগামী শুক্রবার জুম্মার নামাজের পর মেসের হিসাব নিকেশ নিয়ে বৈঠক হবে।", type: "notice-meeting" },
        { id: 5, text: "🛒 বাজার আপডেট: প্রতিদিনের বাজার তালিকা এবং মিল এন্ট্রি সময়মতো সম্পন্ন করুন।", type: "notice-bazar" },
        { id: 6, text: "📌 সাধারণ নির্দেশনা: মেসের কমন স্পেস পরিষ্কার পরিচ্ছন্ন রাখুন।", type: "notice-other" }
    ],
    transactions: [
        { id: 101, date: "01/08/2026, 10:30 AM", member: "আজমাইন", note: "প্রাথমিক বাজার জমা", amount: 2451 },
        { id: 102, date: "02/08/2026, 02:15 PM", member: "রিয়াজ", note: "প্রাথমিক বাজার জমা", amount: 2299 },
        { id: 103, date: "03/08/2026, 06:40 PM", member: "ফারেছ", note: "প্রাথমিক বাজার জমা", amount: 3391 }
    ]
};

let confirmCallback = null;

// Custom Toast Notification Function
function showToast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = type === 'success' 
        ? `<svg class="svg-icon" style="fill:#16a34a;" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
        : `<svg class="svg-icon" style="fill:#dc2626;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('toast-show'), 10);

    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 400);
    }, 3200);
}

// Custom Modal Confirmation Popup
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = message;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal(isConfirmed) {
    document.getElementById('confirmModal').style.display = 'none';
    if(isConfirmed && confirmCallback) confirmCallback();
    confirmCallback = null;
}

const confirmAgreeBtn = document.getElementById('confirmAgreeBtn');
if (confirmAgreeBtn) {
    confirmAgreeBtn.addEventListener('click', () => closeConfirmModal(true));
}

function calculateAll() {
    let elecPerHead = state.fixedCosts.electricity / 6;
    let gasPerHead = state.fixedCosts.gas / 6;
    let waterPerHead = state.fixedCosts.waterBill / 6;
    let wifiPerHead = state.fixedCosts.wifi / 6;
    let khalaPerHead = state.fixedCosts.khala / 6;
    let wastePerHead = state.fixedCosts.waste / 6;

    let totalMeals = state.members.reduce((acc, m) => acc + Number(m.meals), 0);
    let totalBazar = state.members.reduce((acc, m) => acc + Number(m.bazarDeposit), 0);
    let totalSeatRent = state.members.reduce((acc, m) => acc + Number(m.rent), 0);
    let mealRate = totalMeals > 0 ? (totalBazar / totalMeals) : 0;

    renderSummaryTable(totalBazar, totalMeals, mealRate, totalSeatRent, elecPerHead, gasPerHead, waterPerHead, wifiPerHead, khalaPerHead, wastePerHead);
    renderTransposedTable(mealRate, elecPerHead, gasPerHead, waterPerHead, wifiPerHead, khalaPerHead, wastePerHead);
    renderNotices();
    renderTransactions();
    renderDrawerInputs();
}

function formatValueWithColor(num, isCurrency = true) {
    let formattedNum = Math.abs(num).toFixed(2);
    let prefix = isCurrency ? "BDT " : "";
    if (num > 0) return `<span class="val-positive">${prefix}${formattedNum} (প্রদেয়)</span>`;
    if (num < 0) return `<span class="val-negative">-${prefix}${formattedNum} (ফেরত)</span>`;
    return `<span>${prefix}0.00</span>`;
}

function renderSummaryTable(totalBazar, totalMeals, mealRate, totalSeatRent, elec, gas, water, wifi, khala, waste) {
    const tbody = document.getElementById('summaryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const items = [
        { label: 'মোট বাজার খরচ', total: `BDT ${totalBazar.toFixed(2)}`, split: 'জমা অনুযায়ী' },
        { label: 'মোট মিল সংখ্যা', total: `${totalMeals} টি`, split: '৬ জন সদস্য' },
        { label: 'মিল রেট (Meal Rate)', total: `BDT ${mealRate.toFixed(2)}`, split: 'অটো ক্যালকুলেটেড' },
        { label: 'মোট সিট ভাড়া', total: `BDT ${totalSeatRent.toFixed(2)}`, split: 'নির্দিষ্ট সিট রেট' },
        { label: 'কারেন্ট বিল', total: `BDT ${state.fixedCosts.electricity}`, split: `BDT ${elec.toFixed(2)} (৬ জন)` },
        { label: 'গ্যাস বিল', total: `BDT ${state.fixedCosts.gas}`, split: `BDT ${gas.toFixed(2)} (৬ জন)` },
        { label: 'পানির বিল', total: `BDT ${state.fixedCosts.waterBill}`, split: `BDT ${water.toFixed(2)} (৬ জন)` },
        { label: 'ওয়াইফাই বিল', total: `BDT ${state.fixedCosts.wifi}`, split: `BDT ${wifi.toFixed(2)} (৬ জন)` },
        { label: 'খালার বিল', total: `BDT ${state.fixedCosts.khala}`, split: `BDT ${khala.toFixed(2)} (৬ জন)` },
        { label: 'ময়লার বিল', total: `BDT ${state.fixedCosts.waste}`, split: `BDT ${waste.toFixed(2)} (৬ জন)` }
    ];

    items.forEach(item => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td class="font-bold">${item.label}</td><td class="text-right font-bold">${item.total}</td><td class="text-right">${item.split}</td>`;
        tbody.appendChild(tr);
    });
}

function renderTransposedTable(mealRate, elec, gas, water, wifi, khala, waste) {
    const tbody = document.getElementById('memberTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const rowConfig = [
        { label: 'কারেন্ট বিল (BDT)', calc: () => elec.toFixed(2) },
        { label: 'গ্যাস বিল (BDT)', calc: () => gas.toFixed(2) },
        { label: 'পানির বিল (BDT)', calc: () => water.toFixed(2) },
        { label: 'ওয়াইফাই বিল (BDT)', calc: () => wifi.toFixed(2) },
        { label: 'খালার বিল (BDT)', calc: () => khala.toFixed(2) },
        { label: 'ময়লার বিল (BDT)', calc: () => waste.toFixed(2) },
        { label: 'মিল সংখ্যা', key: 'meals' },
        { label: 'মিল খরচ (BDT)', calc: (m) => (m.meals * mealRate).toFixed(2) },
        { label: 'বাজার জমা (BDT)', key: 'bazarDeposit', isDeposit: true },
        { label: 'গত মাসের সমন্বয় (BDT)', key: 'prevAdj', isRawFormatted: true },
        { label: `অন্যান্য (${state.customAdjLabel}) (BDT)`, key: 'fridgeAdj', isRawFormatted: true },
        { label: 'সর্বমোট খরচ (ভাড়া বাদে)', isTotalExp: true, rowClass: 'total-exp-row' },
        { label: 'সর্বমোট প্রদেয় (ভাড়া বাদে)', isNetPayable: true, rowClass: 'payable-row' },
        { label: 'সিট ভাড়া (BDT)', key: 'rent' },
        { label: 'সর্বমোট জমা', isTotalDeposit: true, rowClass: 'total-dep-row' },
        { label: '🏠 বাসা ভাড়াসহ সর্বমোট প্রদেয়', isNetPayableWithRent: true, rowClass: 'net-rent-payable-row' }
    ];

    rowConfig.forEach(r => {
        let tr = document.createElement('tr');
        if(r.rowClass) tr.className = r.rowClass;
        let html = `<td>${r.label}</td>`;

        state.members.forEach((m) => {
            let mealExpense = m.meals * mealRate;
            let totalExpenseExceptRent = mealExpense + elec + gas + water + wifi + khala + waste;
            let netPayableWithoutRent = totalExpenseExceptRent - m.bazarDeposit - m.prevAdj - m.fridgeAdj;

            if(r.isTotalExp) html += `<td class="text-right font-bold">BDT ${totalExpenseExceptRent.toFixed(2)}</td>`;
            else if(r.isTotalDeposit) html += `<td class="text-right font-bold text-green">BDT ${Number(m.bazarDeposit).toFixed(2)}</td>`;
            else if(r.isDeposit) html += `<td class="text-right font-bold text-green">BDT ${Number(m.bazarDeposit).toFixed(2)}</td>`;
            else if(r.isNetPayable) html += `<td class="text-right font-bold">${formatValueWithColor(netPayableWithoutRent)}</td>`;
            else if(r.isNetPayableWithRent) html += `<td class="text-right font-bold">${formatValueWithColor(netPayableWithoutRent + Number(m.rent))}</td>`;
            else if(r.isRawFormatted) html += `<td class="text-right">${m[r.key]}</td>`;
            else if(r.calc) html += `<td class="text-right">${r.calc(m)}</td>`;
            else html += `<td class="text-right ${r.class || ''}">${m[r.key]}</td>`;
        });

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function renderNotices() {
    const container = document.getElementById('noticeContainer');
    if (!container) return;
    container.innerHTML = '';
    state.notices.forEach(n => {
        container.innerHTML += `<div class="notice-box ${n.type} clay-inset">${n.text}</div>`;
    });
}

function renderTransactions() {
    const tbody = document.getElementById('txnExcelTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    const filterMember = document.getElementById('txnMemberFilter')?.value || "ALL";
    const searchQuery = document.getElementById('txnSearchInput')?.value.toLowerCase() || "";

    let totalAmount = 0;
    let sl = 1;

    const thAdmin = document.getElementById('thAdminAction');
    const tfAdmin = document.getElementById('tfAdminAction');
    if(state.isAdmin) {
        if(thAdmin) thAdmin.style.display = "table-cell";
        if(tfAdmin) tfAdmin.style.display = "table-cell";
    } else {
        if(thAdmin) thAdmin.style.display = "none";
        if(tfAdmin) tfAdmin.style.display = "none";
    }

    state.transactions.slice().reverse().forEach((t) => {
        let matchesMember = (filterMember === "ALL") || (t.member === filterMember);
        let matchesSearch = t.member.toLowerCase().includes(searchQuery) || t.note.toLowerCase().includes(searchQuery);

        if (matchesMember && matchesSearch) {
            totalAmount += Number(t.amount);
            let tr = document.createElement('tr');
            
            let adminBtnHtml = state.isAdmin 
                ? `<td class="text-center td-admin-action"><button class="btn clay-btn clay-btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="deleteTransaction(${t.id})"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> ডিলিট</button></td>`
                : '';

            tr.innerHTML = `
                <td>${sl++}</td>
                <td>${t.date}</td>
                <td class="font-bold">${t.member}</td>
                <td>${t.note}</td>
                <td class="text-right font-bold text-green">+ BDT ${Number(t.amount).toFixed(2)}</td>
                ${adminBtnHtml}
            `;
            tbody.appendChild(tr);
        }
    });

    const totalEl = document.getElementById('excelTotalAmount');
    if(totalEl) totalEl.innerText = `BDT ${totalAmount.toFixed(2)}`;
}

function submitDepositTransaction() {
    const memberName = document.getElementById('txnMemberSelect').value;
    const amount = Number(document.getElementById('txnAmountInput').value);
    const note = document.getElementById('txnNoteInput').value || "ক্যাশ জমা";

    if(!amount || amount <= 0) {
        showToast("সঠিক টাকার পরিমাণ লিখুন!", "error");
        return;
    }

    const memberObj = state.members.find(m => m.name === memberName);
    if(memberObj) {
        memberObj.bazarDeposit = Number(memberObj.bazarDeposit) + amount;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-GB')}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    state.transactions.push({ 
        id: Date.now(), 
        date: formattedDate, 
        member: memberName, 
        note: note, 
        amount: amount 
    });

    document.getElementById('txnAmountInput').value = '';
    document.getElementById('txnNoteInput').value = '';

    saveData();
    showToast(`${memberName}-এর জন্য BDT ${amount} সফলভাবে জমা হয়েছে!`, "success");
}

function deleteTransaction(txnId) {
    const targetTxn = state.transactions.find(t => t.id === txnId);
    if (!targetTxn) return;

    showConfirmModal(
        "ট্রানজেকশন ডিলিট",
        `আপনি কি নিশ্চিত যে ${targetTxn.member}-এর BDT ${targetTxn.amount} জমার এন্ট্রিটি ডিলিট করতে চান?`,
        () => {
            const memberObj = state.members.find(m => m.name === targetTxn.member);
            if(memberObj) {
                memberObj.bazarDeposit = Math.max(0, Number(memberObj.bazarDeposit) - Number(targetTxn.amount));
            }

            state.transactions = state.transactions.filter(t => t.id !== txnId);
            saveData();
            showToast("ট্রানজেকশন সফলভাবে ডিলিট করা হয়েছে!", "error");
        }
    );
}

function exportCSV() {
    let csv = "\uFEFFSL,Date,Member,Note,Amount (BDT)\n";
    state.transactions.forEach((t, i) => {
        csv += `"${i+1}","${t.date}","${t.member}","${t.note}","${t.amount}"\n`;
    });

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Google_Sheets_Mess_Transactions_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast("CSV ফাইল ডাউনলোড শুরু হয়েছে", "info");
}

function exportJSON() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Isotope_Mess_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("JSON ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন", "info");
}

function exportPDF() { window.print(); }

function showTxnPage() {
    document.getElementById('mainDashboard').style.display = 'none';
    document.getElementById('txnPage').style.display = 'block';
    renderTransactions();
}

function hideTxnPage() {
    document.getElementById('txnPage').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'block';
}

function renderDrawerInputs() {
    const select = document.getElementById('txnMemberSelect');
    const filterSelect = document.getElementById('txnMemberFilter');
    const highlightSelect = document.getElementById('memberHighlightSelect');

    if(select) {
        select.innerHTML = '';
        state.members.forEach(m => select.innerHTML += `<option value="${m.name}">${m.name}</option>`);
    }

    if(filterSelect && filterSelect.options.length <= 1) {
        state.members.forEach(m => filterSelect.innerHTML += `<option value="${m.name}">${m.name}</option>`);
    }

    if(highlightSelect) {
        const currentVal = highlightSelect.value;
        highlightSelect.innerHTML = '<option value="">👤 আপনার নাম নির্বাচন করুন</option>';
        state.members.forEach(m => highlightSelect.innerHTML += `<option value="${m.name}">${m.name}</option>`);
        if(currentVal) highlightSelect.value = currentVal;
    }

    const fixedBox = document.getElementById('drawerFixedCostsInputs');
    if(fixedBox) {
        fixedBox.innerHTML = `
            <div class="input-group"><label>কারেন্ট বিল</label><input type="number" id="inp_elec" class="drawer-input" value="${state.fixedCosts.electricity}"></div>
            <div class="input-group"><label>গ্যাস বিল</label><input type="number" id="inp_gas" class="drawer-input" value="${state.fixedCosts.gas}"></div>
            <div class="input-group"><label>পানির বিল</label><input type="number" id="inp_water" class="drawer-input" value="${state.fixedCosts.waterBill}"></div>
            <div class="input-group"><label>ওয়াইফাই বিল</label><input type="number" id="inp_wifi" class="drawer-input" value="${state.fixedCosts.wifi}"></div>
            <div class="input-group"><label>খালার বিল</label><input type="number" id="inp_khala" class="drawer-input" value="${state.fixedCosts.khala}"></div>
            <div class="input-group"><label>ময়লার বিল</label><input type="number" id="inp_waste" class="drawer-input" value="${state.fixedCosts.waste}"></div>
        `;
    }

    const labelInput = document.getElementById('customAdjLabelInput');
    if(labelInput) labelInput.value = state.customAdjLabel;

    const memberBox = document.getElementById('drawerMemberInputs');
    if(memberBox) {
        memberBox.innerHTML = '';
        state.members.forEach((m, idx) => {
            memberBox.innerHTML += `
                <div class="member-card-edit clay-inset">
                    <div class="member-edit-title">👤 ${m.name}</div>
                    <div class="member-inputs-flex">
                        <div class="input-group"><label>মিল সংখ্যা</label><input type="number" id="mem_meals_${idx}" class="drawer-input" value="${m.meals}"></div>
                        <div class="input-group"><label>বাজার জমা</label><input type="number" id="mem_bazar_${idx}" class="drawer-input" value="${m.bazarDeposit}"></div>
                        <div class="input-group"><label>গত মাসের সমন্বয়</label><input type="number" id="mem_prev_${idx}" class="drawer-input" value="${m.prevAdj}"></div>
                        <div class="input-group"><label>অন্যান্য (${state.customAdjLabel})</label><input type="number" id="mem_fridge_${idx}" class="drawer-input" value="${m.fridgeAdj}"></div>
                    </div>
                    <button class="btn clay-btn clay-btn-primary full-width-btn" onclick="saveMemberData(${idx})">
                        <svg class="svg-icon" viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3-1.34 3-3-3zm3-10H5V5h10v4z"/></svg>
                        ${m.name}-এর ডাটা সেভ করুন
                    </button>
                </div>
            `;
        });
    }

    const noticeBox = document.getElementById('adminNoticeList');
    if(noticeBox) {
        noticeBox.innerHTML = '';
        state.notices.forEach((n, idx) => {
            noticeBox.innerHTML += `
                <div class="notice-item-admin ${n.type}">
                    <span>${n.text.substring(0, 35)}...</span>
                    <button class="btn clay-btn clay-btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="deleteNotice(${idx})">ডিলিট</button>
                </div>
            `;
        });
    }
}

function saveCustomAdjLabel() {
    state.customAdjLabel = document.getElementById('customAdjLabelInput').value || "অন্যান্য";
    saveData();
    renderDrawerInputs();
    showToast("অন্যান্য এডজাস্টমেন্টের নাম সফলভাবে সেভ করা হয়েছে!", "success");
}

function saveFixedCosts() {
    state.fixedCosts.electricity = Number(document.getElementById('inp_elec').value);
    state.fixedCosts.gas = Number(document.getElementById('inp_gas').value);
    state.fixedCosts.waterBill = Number(document.getElementById('inp_water').value);
    state.fixedCosts.wifi = Number(document.getElementById('inp_wifi').value);
    state.fixedCosts.khala = Number(document.getElementById('inp_khala').value);
    state.fixedCosts.waste = Number(document.getElementById('inp_waste').value);
    state.customAdjLabel = document.getElementById('customAdjLabelInput').value || "অন্যান্য";

    saveData();
    showToast("ইউটিলিটি খরচ সেভ করা হয়েছে!", "success");
}

function saveMemberData(idx) {
    state.members[idx].meals = Number(document.getElementById(`mem_meals_${idx}`).value);
    state.members[idx].bazarDeposit = Number(document.getElementById(`mem_bazar_${idx}`).value);
    state.members[idx].prevAdj = Number(document.getElementById(`mem_prev_${idx}`).value);
    state.members[idx].fridgeAdj = Number(document.getElementById(`mem_fridge_${idx}`).value);
    state.customAdjLabel = document.getElementById('customAdjLabelInput').value || "অন্যান্য";

    saveData();
    showToast(`${state.members[idx].name}-এর তথ্য আপডেট করা হয়েছে!`, "success");
}

function addNewNotice() {
    const text = document.getElementById('newNoticeText').value;
    const type = document.getElementById('newNoticeType').value;
    if(!text) { showToast("নোটিশের তথ্য লিখুন!", "error"); return; }

    state.notices.push({ id: Date.now(), text, type });
    document.getElementById('newNoticeText').value = '';
    saveData();
    showToast("নতুন নোটিশ যোগ করা হয়েছে!", "success");
}

function deleteNotice(idx) {
    state.notices.splice(idx, 1);
    saveData();
    showToast("নোটিশ মুছে ফেলা হয়েছে!", "info");
}

async function saveData() {
    calculateAll();
    localStorage.setItem('isotope_mess_data', JSON.stringify(state));

    if(window.firebaseDb) {
        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js");
            
            // 1. Save settings
            await setDoc(doc(window.firebaseDb, "settings", "config"), {
                fixedCosts: state.fixedCosts,
                customAdjLabel: state.customAdjLabel
            });

            // 2. Save members
            for (let member of state.members) {
                const docId = member.name.replace(/\s+/g, '_');
                await setDoc(doc(window.firebaseDb, "members", docId), member);
            }

            // 3. Save notices
            for (let notice of state.notices) {
                await setDoc(doc(window.firebaseDb, "notices", String(notice.id)), notice);
            }

            // 4. Save transactions
            for (let txn of state.transactions) {
                await setDoc(doc(window.firebaseDb, "transactions", String(txn.id)), txn);
            }
        } catch(e) {
            if(e.code === 'permission-denied') {
                console.warn("Firebase permission denied. Please set your Firestore Rules to allow read/write in Firebase Console.");
            } else {
                console.error("Firebase save error:", e);
            }
        }
    }
}

function handleAdminToggle() {
    if(state.isAdmin) {
        toggleAdminDrawer(true);
    } else {
        openAdminModal();
    }
}

function turnOffAdmin() {
    state.isAdmin = false;
    toggleAdminDrawer(false);
    updateAdminUIState();
    calculateAll();
    showToast("এডমিন মোড বন্ধ করা হয়েছে", "info");
}

function openAdminModal() { document.getElementById('adminModal').style.display = 'flex'; }
function closeAdminModal() { document.getElementById('adminModal').style.display = 'none'; }

function togglePasswordVisibility() {
    const input = document.getElementById('adminPassword');
    const eyeSvg = document.getElementById('eyeIconSvg');
    if(input.type === 'password') {
        input.type = 'text';
        if(eyeSvg) {
            eyeSvg.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2z"/>';
        }
    } else {
        input.type = 'password';
        if(eyeSvg) {
            eyeSvg.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        }
    }
}

function highlightMemberColumn(memberName) {
    const table = document.querySelector('.horizontal-table');
    if(!table) return;

    const allCells = table.querySelectorAll('th, td');
    allCells.forEach(c => c.classList.remove('highlight-column'));

    if(!memberName) return;

    const memberIdx = state.members.findIndex(m => m.name === memberName);
    if(memberIdx === -1) return;

    const targetColIdx = memberIdx + 1; // +1 because col 0 is label column

    const rows = table.querySelectorAll('tr');
    rows.forEach(r => {
        const cell = r.children[targetColIdx];
        if(cell) {
            cell.classList.add('highlight-column');
        }
    });

    const container = document.getElementById('memberTableContainer');
    if(container) {
        const sampleHeaderCell = table.querySelector(`thead tr th:nth-child(${targetColIdx + 1})`);
        if(sampleHeaderCell) {
            container.scrollTo({
                left: sampleHeaderCell.offsetLeft - container.offsetWidth / 2 + sampleHeaderCell.offsetWidth / 2,
                behavior: 'smooth'
            });
        }
    }
    showToast(`${memberName}-এর কলাম ফোকাস ও হাইলাইট করা হয়েছে!`, "info");
}

function verifyAdmin() {
    const pass = document.getElementById('adminPassword').value;
    if(pass === "isotope@12azmain") {
        state.isAdmin = true;
        updateAdminUIState();
        closeAdminModal();
        toggleAdminDrawer(true);
        calculateAll();
        showToast("এডমিন এক্সেস আনলক হয়েছে!", "success");
    } else {
        showToast("ভুল পাসওয়ার্ড!", "error");
    }
}

function updateAdminUIState() {
    const adminBadge = document.getElementById('adminBadge');
    const adminBtnText = document.getElementById('adminBtnText');
    const txnAdminNavBtnText = document.getElementById('txnAdminNavBtnText');

    if(state.isAdmin) {
        if(adminBadge) adminBadge.style.display = 'inline-flex';
        if(adminBtnText) adminBtnText.innerText = "এডমিন প্যানেল";
        if(txnAdminNavBtnText) txnAdminNavBtnText.innerText = "এডমিন প্যানেল";
    } else {
        if(adminBadge) adminBadge.style.display = 'none';
        if(adminBtnText) adminBtnText.innerText = "এডমিন কন্ট্রোল";
        if(txnAdminNavBtnText) txnAdminNavBtnText.innerText = "এডমিন কন্ট্রোল";
    }
}

function toggleAdminDrawer(open) {
    const drawer = document.getElementById('adminDrawer');
    if(open) drawer.classList.add('open');
    else drawer.classList.remove('open');
}

async function loadFirebaseData() {
    const local = localStorage.getItem('isotope_mess_data');
    if(local) {
        state = JSON.parse(local);
        updateAdminUIState();
        calculateAll();
    }

    if(window.firebaseDb) {
        try {
            const { doc, getDoc, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js");
            
            const configSnap = await getDoc(doc(window.firebaseDb, "settings", "config"));
            const membersSnap = await getDocs(collection(window.firebaseDb, "members"));
            const noticesSnap = await getDocs(collection(window.firebaseDb, "notices"));
            const transactionsSnap = await getDocs(collection(window.firebaseDb, "transactions"));

            if(configSnap.exists() || !membersSnap.empty) {
                if(configSnap.exists()) {
                    const cfg = configSnap.data();
                    state.fixedCosts = cfg.fixedCosts || state.fixedCosts;
                    state.customAdjLabel = cfg.customAdjLabel || state.customAdjLabel;
                }
                if(!membersSnap.empty) {
                    state.members = [];
                    membersSnap.forEach(d => state.members.push(d.data()));
                }
                if(!noticesSnap.empty) {
                    state.notices = [];
                    noticesSnap.forEach(d => state.notices.push(d.data()));
                }
                if(!transactionsSnap.empty) {
                    state.transactions = [];
                    transactionsSnap.forEach(d => state.transactions.push(d.data()));
                }

                localStorage.setItem('isotope_mess_data', JSON.stringify(state));
                updateAdminUIState();
                calculateAll();
            } else {
                // Initialize Firestore multi-collections with current state
                await saveData();
            }
        } catch(e) {
            if(e.code === 'permission-denied') {
                console.warn("Firebase permission denied. Please set your Firestore Rules to allow read/write in Firebase Console.");
            } else {
                console.error("Firebase load/init error:", e);
            }
        }
    }
}

window.onload = function() {
    loadFirebaseData();
    window.addEventListener('firebase-ready', () => {
        loadFirebaseData();
    });
};
