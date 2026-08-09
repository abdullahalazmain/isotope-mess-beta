// ============================================================
//  ISOTOPE MESS DASHBOARD — app.js
//  Clean / DRY / Readable / Performant refactor.
//  UI output (IDs, classes, messages, layout) is unchanged.
// ============================================================

// ---------- Constants ----------
const FIREBASE_FIRESTORE_URL = "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
const DEFAULT_ADMIN_PASSWORD = "isotope@12azmain";
const DEFAULT_CUSTOM_ADJ_LABEL = "ফ্রিজ সমন্বয়";
const MEMBER_ORDER = ["আজমাইন", "রিয়াজ", "সাকিব", "ওমর", "নাফিজ", "ফারেছ"];

const DEFAULT_FIXED_COSTS = {
    electricity: 1500,
    gas: 1800,
    waterBottleCount: 40,
    waterBottlePrice: 20,
    waterBill: 800,
    wifi: 700,
    khala: 2500,
    waste: 70
};

const DEFAULT_MEMBERS = [
    { name: "আজমাইন", meals: 59, bazarDeposit: 2451, rent: 2200, prevAdj: 96.67, fridgeAdj: -120 },
    { name: "রিয়াজ", meals: 42, bazarDeposit: 2299, rent: 2200, prevAdj: 96.67, fridgeAdj: -120 },
    { name: "সাকিব", meals: 5, bazarDeposit: 0, rent: 2000, prevAdj: -140.67, fridgeAdj: 480 },
    { name: "ওমর", meals: 0, bazarDeposit: 0, rent: 2000, prevAdj: -143.33, fridgeAdj: 0 },
    { name: "নাফিজ", meals: 53, bazarDeposit: 0, rent: 1800, prevAdj: -472.26, fridgeAdj: -120 },
    { name: "ফারেছ", meals: 43, bazarDeposit: 3391, rent: 1800, prevAdj: 96.67, fridgeAdj: -120 }
];

const DEFAULT_NOTICES = [
    { id: 1, text: "🚨 জুলাই ২০২৬ বিল পরিশোধের সময়সীমা: আগামী ৫ তারিখের মধ্যে ইউটিলিটি ও ৮ তারিখের মধ্যে বাসা ভাড়া দিতে হবে। মোট বাসা ভাড়া ১২,০০০ টাকা।", type: "notice-urgent" },
    { id: 2, text: "🌱 অগ্রিম ইউটিলিটি বিল: কারেন্ট ৳১৫০০, গ্যাস ৳১৮০০, পানি ৳৮০০, ওয়াইফাই ৳৭০০ এবং বর্তমান খালার বিল ৳২৫০০, ময়লা ৳৭০ হিসাবভুক্ত করা হয়েছে।", type: "notice-advance" },
    { id: 3, text: "🧊 ফ্রিজ বহনের BDT 600 হিসাব: সাকিব পরিশোধ করেছেন (ওমর বাদে বাকি ৫ জন BDT 120 করে শেয়ার করবেন)।", type: "notice-info" },
    { id: 4, text: "👥 জরুরি মিটিং: আগামী শুক্রবার জুম্মার নামাজের পর মেসের হিসাব নিকেশ নিয়ে বৈঠক হবে।", type: "notice-meeting" },
    { id: 5, text: "🛒 বাজার আপডেট: প্রতিদিনের বাজার তালিকা এবং মিল এন্ট্রি সময়মতো সম্পন্ন করুন।", type: "notice-bazar" },
    { id: 6, text: "📌 সাধারণ নির্দেশনা: মেসের কমন স্পেস পরিষ্কার পরিচ্ছন্ন রাখুন।", type: "notice-other" }
];

const DEFAULT_TRANSACTIONS = [
    { id: 101, date: "01/08/2026, 10:30 AM", member: "আজমাইন", note: "প্রাথমিক বাজার জমা", amount: 2451 },
    { id: 102, date: "02/08/2026, 02:15 PM", member: "রিয়াজ", note: "প্রাথমিক বাজার জমা", amount: 2299 },
    { id: 103, date: "03/08/2026, 06:40 PM", member: "ফারেছ", note: "প্রাথমিক বাজার জমা", amount: 3391 }
];

// ---------- State ----------
let state = {
    isAdmin: false,
    adminPassword: DEFAULT_ADMIN_PASSWORD,
    customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
    fixedCosts: { ...DEFAULT_FIXED_COSTS },
    members: DEFAULT_MEMBERS.map(m => ({ ...m })),
    notices: DEFAULT_NOTICES.map(n => ({ ...n })),
    transactions: DEFAULT_TRANSACTIONS.map(t => ({ ...t }))
};

let confirmCallback = null;
let firestoreModuleCache = null;

// ---------- DOM Helpers (DRY) ----------
const $ = id => document.getElementById(id);
const numVal = id => Number($(id)?.value || 0);
const textVal = id => $(id)?.value || "";
const bdt = n => `BDT ${Number(n).toFixed(2)}`;

// Build <option> html from an array of strings
function populateSelect(selectEl, values, firstOption = "") {
    if (!selectEl) return;
    let html = firstOption ? `<option value="">${firstOption}</option>` : "";
    html += values.map(v => `<option value="${v}">${v}</option>`).join("");
    selectEl.innerHTML = html;
}

// ---------- Toast / Confirm (UX) ----------
function showToast(message, type = "success") {
    const container = $('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSvg = type === 'success'
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

function showConfirmModal(title, message, onConfirm) {
    $('confirmTitle').innerText = title;
    $('confirmMessage').innerText = message;
    confirmCallback = onConfirm;
    $('confirmModal').style.display = 'flex';
}

function closeConfirmModal(isConfirmed) {
    $('confirmModal').style.display = 'none';
    if (isConfirmed && confirmCallback) confirmCallback();
    confirmCallback = null;
}

const confirmAgreeBtn = $('confirmAgreeBtn');
if (confirmAgreeBtn) {
    confirmAgreeBtn.addEventListener('click', () => closeConfirmModal(true));
}

// ---------- Firebase Helpers (DRY + cached) ----------
async function getFirestoreModule() {
    if (!firestoreModuleCache) {
        firestoreModuleCache = await import(FIREBASE_FIRESTORE_URL);
    }
    return firestoreModuleCache;
}

function logFirebaseError(e) {
    if (e.code === 'permission-denied') {
        console.warn("Firebase permission denied. Please set your Firestore Rules to allow read/write in Firebase Console.");
    } else {
        console.error("Firebase error:", e);
    }
}

function persistLocally() {
    localStorage.setItem('isotope_mess_data', JSON.stringify(state));
}

// Save to localStorage + Firebase (production only)
async function saveData() {
    calculateAll();
    persistLocally();

    if (!window.firebaseDb) return;

    try {
        const { doc, setDoc } = await getFirestoreModule();

        await setDoc(doc(window.firebaseDb, "settings", "config"), {
            fixedCosts: state.fixedCosts,
            customAdjLabel: state.customAdjLabel,
            adminPassword: state.adminPassword || DEFAULT_ADMIN_PASSWORD
        });

        for (let member of state.members) {
            const docId = member.name.replace(/\s+/g, '_');
            await setDoc(doc(window.firebaseDb, "members", docId), member);
        }

        for (let notice of state.notices) {
            await setDoc(doc(window.firebaseDb, "notices", String(notice.id)), notice);
        }

        for (let txn of state.transactions) {
            await setDoc(doc(window.firebaseDb, "transactions", String(txn.id)), txn);
        }
    } catch (e) {
        logFirebaseError(e);
    }
}

// ---------- Member Order ----------
function ensureMemberOrder() {
    if (!state.members) return;
    state.members.sort((a, b) => {
        let ia = MEMBER_ORDER.findIndex(o => o === a.name);
        let ib = MEMBER_ORDER.findIndex(o => o === b.name);
        if (ia === -1) ia = MEMBER_ORDER.findIndex(o => a.name.includes(o.substring(0, 3)));
        if (ib === -1) ib = MEMBER_ORDER.findIndex(o => b.name.includes(o.substring(0, 3)));
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

// ---------- Water bill live calc ----------
function updateWaterBillCalc() {
    const waterInp = $('inp_water');
    if (waterInp) {
        waterInp.value = numVal('inp_water_count') * numVal('inp_water_price');
    }
}

// ---------- Totals + Rendering ----------
function calculateAll() {
    ensureMemberOrder();

    const memberCount = state.members.length || 1;
    const perHead = {
        elec: Number(state.fixedCosts.electricity || 0) / memberCount,
        gas: Number(state.fixedCosts.gas || 0) / memberCount,
        water: Number(state.fixedCosts.waterBill || 0) / memberCount,
        wifi: Number(state.fixedCosts.wifi || 0) / memberCount,
        khala: Number(state.fixedCosts.khala || 0) / memberCount,
        waste: Number(state.fixedCosts.waste || 0) / memberCount
    };

    const totalMeals = state.members.reduce((acc, m) => acc + Number(m.meals || 0), 0);
    const totalBazar = state.members.reduce((acc, m) => acc + Number(m.bazarDeposit || 0), 0);
    const totalSeatRent = state.members.reduce((acc, m) => acc + Number(m.rent || 0), 0);

    // Meal rate rounded to 2 decimal places to guarantee matching (meals * rate) calculation
    const rawMealRate = totalMeals > 0 ? (totalBazar / totalMeals) : 0;
    const mealRate = Math.round(rawMealRate * 100) / 100;

    renderSummaryTable(totalBazar, totalMeals, mealRate, totalSeatRent, perHead);
    renderTransposedTable(mealRate, perHead);
    renderNotices();
    renderTransactions();
    renderDrawerInputs();
}

function formatValueWithColor(num, isCurrency = true) {
    const formattedNum = Math.abs(num).toFixed(2);
    const prefix = isCurrency ? "BDT " : "";
    if (num > 0) return `<span class="val-positive">${prefix}${formattedNum} (বকেয়া)</span>`;
    if (num < 0) return `<span class="val-negative">-${prefix}${formattedNum} (ফেরত)</span>`;
    return `<span>${prefix}0.00</span>`;
}

function renderSummaryTable(totalBazar, totalMeals, mealRate, totalSeatRent, perHead) {
    const tbody = $('summaryTableBody');
    if (!tbody) return;

    const memberCount = state.members.length || 1;

    const billRows = [
        { label: 'কারেন্ট বিল', key: 'electricity', per: perHead.elec },
        { label: 'গ্যাস বিল', key: 'gas', per: perHead.gas },
        { label: 'পানির বিল', key: 'waterBill', per: perHead.water },
        { label: 'ওয়াইফাই বিল', key: 'wifi', per: perHead.wifi },
        { label: 'খালার বিল', key: 'khala', per: perHead.khala },
        { label: 'ময়লার বিল', key: 'waste', per: perHead.waste }
    ];

    const items = [
        { label: 'মোট বাজার খরচ', total: bdt(totalBazar), split: 'জমা অনুযায়ী' },
        { label: 'মোট মিল সংখ্যা', total: `${totalMeals} টি`, split: `${memberCount} জন সদস্য` },
        { label: 'মিল রেট (Meal Rate)', total: bdt(mealRate), split: 'অটো ক্যালকুলেটেড' },
        { label: 'মোট সিট ভাড়া', total: bdt(totalSeatRent), split: 'নির্দিষ্ট সিট রেট' },
        ...billRows.map(b => ({
            label: b.label,
            total: bdt(Number(state.fixedCosts[b.key] || 0)),
            split: `${bdt(b.per)} (${memberCount} জন)`
        }))
    ];

    tbody.innerHTML = items.map(item =>
        `<tr><td class="font-bold">${item.label}</td><td class="text-right font-bold">${item.total}</td><td class="text-right">${item.split}</td></tr>`
    ).join('');
}

function renderTransposedTable(mealRate, perHead) {
    const table = document.querySelector('.horizontal-table');
    const memberTbody = $('memberTableBody');
    if (!table || !memberTbody) return;

    // Dynamically update thead headers to guarantee 100% sync with state.members
    const thead = table.querySelector('thead');
    if (thead) {
        thead.innerHTML = `<tr><th style="min-width: 190px;">আইটেম / সদস্য</th>` +
            state.members.map(m => `<th class="text-right">${m.name}</th>`).join('') + `</tr>`;
    }

    // Pre-build deposit lookup O(n) instead of O(n²)
    const depositByMember = new Map();
    state.transactions.forEach(t => {
        const name = t.member;
        depositByMember.set(name, (depositByMember.get(name) || 0) + Number(t.amount || 0));
    });

    const rowConfig = [
        { label: 'কারেন্ট বিল (BDT)', calc: () => perHead.elec.toFixed(2) },
        { label: 'গ্যাস বিল (BDT)', calc: () => perHead.gas.toFixed(2) },
        { label: 'পানির বিল (BDT)', calc: () => perHead.water.toFixed(2) },
        { label: 'ওয়াইফাই বিল (BDT)', calc: () => perHead.wifi.toFixed(2) },
        { label: 'খালার বিল (BDT)', calc: () => perHead.khala.toFixed(2) },
        { label: 'ময়লার বিল (BDT)', calc: () => perHead.waste.toFixed(2) },
        { label: 'মিল সংখ্যা', key: 'meals' },
        { label: 'মিল খরচ (BDT)', calc: (m) => (Number(m.meals || 0) * mealRate).toFixed(2) },
        { label: 'গত মাসের বকেয়া (BDT)', key: 'prevAdj', isRawFormatted: true },
        { label: `অন্যান্য (${state.customAdjLabel}) (BDT)`, key: 'fridgeAdj', isRawFormatted: true },
        { label: 'সর্বমোট খরচ (ভাড়া বাদে)', isTotalExp: true, rowClass: 'total-exp-row' },
        { label: 'বাজার জমা (BDT)', key: 'bazarDeposit', isDeposit: true },
        { label: 'সর্বমোট বকেয়া (ভাড়া বাদে)', isNetPayable: true, rowClass: 'payable-row' },
        { label: 'সিট ভাড়া (BDT)', key: 'rent' },
        { label: 'সর্বমোট জমা (BDT)', isTotalDeposit: true, rowClass: 'total-dep-row' },
        { label: '🏠 মোট বকেয়া (ভাড়াসহ)', isNetPayableWithRent: true, rowClass: 'net-rent-payable-row' }
    ];

    const utilitiesSum = perHead.elec + perHead.gas + perHead.water + perHead.wifi + perHead.khala + perHead.waste;

    memberTbody.innerHTML = rowConfig.map(r => {
        let trClass = r.rowClass ? ` class="${r.rowClass}"` : '';
        let html = `<tr${trClass}><td>${r.label}</td>`;

        state.members.forEach((m) => {
            const mealsNum = Number(m.meals || 0);
            const bazarNum = Number(m.bazarDeposit || 0);
            const prevNum = Number(m.prevAdj || 0);
            const fridgeNum = Number(m.fridgeAdj || 0);
            const rentNum = Number(m.rent || 0);

            const mealExpense = Number((mealsNum * mealRate).toFixed(2));

            // 1. Total expense except rent = utilities + meal expense + prev adj + fridge/other adj
            const totalExpenseExceptRent = utilitiesSum + mealExpense + prevNum + fridgeNum;

            // 2. Net payable (due) without rent
            const netPayableWithoutRent = totalExpenseExceptRent - bazarNum;

            // 3. Member total deposit from Transaction log (prebuilt Map)
            const memberTotalDeposit = depositByMember.get(m.name) || 0;

            // 4. Net payable (due) with rent
            const totalNetPayableWithRent = (netPayableWithoutRent + rentNum) - memberTotalDeposit;

            if (r.isTotalExp) html += `<td class="text-right font-bold">${bdt(totalExpenseExceptRent)}</td>`;
            else if (r.isDeposit) html += `<td class="text-right font-bold text-green">${bdt(bazarNum)}</td>`;
            else if (r.isNetPayable) html += `<td class="text-right font-bold">${formatValueWithColor(netPayableWithoutRent)}</td>`;
            else if (r.isTotalDeposit) html += `<td class="text-right font-bold text-green">${bdt(memberTotalDeposit)}</td>`;
            else if (r.isNetPayableWithRent) html += `<td class="text-right font-bold">${formatValueWithColor(totalNetPayableWithRent)}</td>`;
            else if (r.isRawFormatted) html += `<td class="text-right">${m[r.key]}</td>`;
            else if (r.calc) html += `<td class="text-right">${r.calc(m)}</td>`;
            else html += `<td class="text-right ${r.class || ''}">${m[r.key]}</td>`;
        });

        return html + `</tr>`;
    }).join('');
}

function renderNotices() {
    const container = $('noticeContainer');
    if (!container) return;
    container.innerHTML = state.notices.map(n =>
        `<div class="notice-box ${n.type} clay-inset">${n.text}</div>`
    ).join('');
}

function renderTransactions() {
    const tbody = $('txnExcelTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filterMember = $('txnMemberFilter')?.value || "ALL";
    const searchQuery = $('txnSearchInput')?.value.toLowerCase() || "";

    const adminMode = state.isAdmin;
    $('thAdminAction').style.display = adminMode ? "table-cell" : "none";
    $('tfAdminAction').style.display = adminMode ? "table-cell" : "none";

    let totalAmount = 0;
    let sl = 1;

    const rows = [];
    state.transactions.slice().reverse().forEach((t) => {
        const matchesMember = (filterMember === "ALL") || (t.member === filterMember);
        const matchesSearch = t.member.toLowerCase().includes(searchQuery) || t.note.toLowerCase().includes(searchQuery);
        if (!matchesMember || !matchesSearch) return;

        totalAmount += Number(t.amount);

        const adminBtnHtml = adminMode
            ? `<td class="text-center td-admin-action"><button class="btn clay-btn clay-btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="deleteTransaction(${t.id})"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> ডিলিট</button></td>`
            : '';

        rows.push(`
            <tr>
                <td>${sl++}</td>
                <td>${t.date}</td>
                <td class="font-bold">${t.member}</td>
                <td>${t.note}</td>
                <td class="text-right font-bold text-green">+ ${bdt(t.amount)}</td>
                ${adminBtnHtml}
            </tr>
        `);
    });

    tbody.innerHTML = rows.join('');
    $('excelTotalAmount').innerText = bdt(totalAmount);
}

function renderDrawerInputs() {
    const memberNames = state.members.map(m => m.name);

    // Deposit select
    populateSelect($('txnMemberSelect'), memberNames);

    // Filter select — only populate when empty
    const filterSelect = $('txnMemberFilter');
    if (filterSelect && filterSelect.options.length <= 1) {
        populateSelect(filterSelect, memberNames, "সকল মেম্বার");
    }

    // Highlight select — preserves current selection
    const highlightSelect = $('memberHighlightSelect');
    if (highlightSelect) {
        const currentVal = highlightSelect.value;
        populateSelect(highlightSelect, memberNames, "👤 আপনার নাম নির্বাচন করুন");
        if (currentVal) highlightSelect.value = currentVal;
    }

    // Fixed costs inputs
    const fixedBox = $('drawerFixedCostsInputs');
    if (fixedBox) {
        const wbCount = state.fixedCosts.waterBottleCount ?? 40;
        const wbPrice = state.fixedCosts.waterBottlePrice ?? 20;
        const wbTotal = state.fixedCosts.waterBill ?? (wbCount * wbPrice);

        fixedBox.innerHTML = `
            <div class="input-group"><label>কারেন্ট বিল (BDT)</label><input type="number" id="inp_elec" class="drawer-input" value="${state.fixedCosts.electricity}"></div>
            <div class="input-group"><label>গ্যাস বিল (BDT)</label><input type="number" id="inp_gas" class="drawer-input" value="${state.fixedCosts.gas}"></div>
            
            <div class="water-bill-calc-box">
                <div class="water-calc-header">💧 পানির বিল হিসাব:</div>
                <div class="water-calc-grid">
                    <div class="water-calc-item">
                        <label class="water-calc-label" title="বোতলের সংখ্যা">বোতলের সংখ্যা</label>
                        <input type="number" id="inp_water_count" class="drawer-input water-calc-input" value="${wbCount}" oninput="updateWaterBillCalc()">
                    </div>
                    <div class="water-calc-item">
                        <label class="water-calc-label" title="প্রতি বোতল (BDT)">প্রতি বোতল (BDT)</label>
                        <input type="number" id="inp_water_price" class="drawer-input water-calc-input" value="${wbPrice}" oninput="updateWaterBillCalc()">
                    </div>
                    <div class="water-calc-item">
                        <label class="water-calc-label highlight" title="সর্বমোট পানির বিল">সর্বমোট পানির বিল</label>
                        <input type="number" id="inp_water" class="drawer-input water-calc-input" value="${wbTotal}" style="font-weight: bold; color: #1e40af; background: #ffffff;">
                    </div>
                </div>
            </div>

            <div class="input-group"><label>ওয়াইফাই বিল (BDT)</label><input type="number" id="inp_wifi" class="drawer-input" value="${state.fixedCosts.wifi}"></div>
            <div class="input-group"><label>খালার বিল (BDT)</label><input type="number" id="inp_khala" class="drawer-input" value="${state.fixedCosts.khala}"></div>
            <div class="input-group"><label>ময়লার বিল (BDT)</label><input type="number" id="inp_waste" class="drawer-input" value="${state.fixedCosts.waste}"></div>
        `;
    }

    const labelInput = $('customAdjLabelInput');
    if (labelInput) labelInput.value = state.customAdjLabel;

    // Member edit cards
    const memberBox = $('drawerMemberInputs');
    if (memberBox) {
        memberBox.innerHTML = state.members.map((m, idx) => `
            <div class="member-card-edit clay-inset">
                <div class="member-edit-title">👤 ${m.name}</div>
                <div class="member-inputs-flex">
                    <div class="input-group"><label>মিল সংখ্যা</label><input type="number" id="mem_meals_${idx}" class="drawer-input" value="${m.meals}"></div>
                    <div class="input-group"><label>বাজার জমা</label><input type="number" id="mem_bazar_${idx}" class="drawer-input" value="${m.bazarDeposit}"></div>
                    <div class="input-group"><label>গত মাসের বকেয়া</label><input type="number" id="mem_prev_${idx}" class="drawer-input" value="${m.prevAdj}"></div>
                    <div class="input-group"><label>অন্যান্য (${state.customAdjLabel})</label><input type="number" id="mem_fridge_${idx}" class="drawer-input" value="${m.fridgeAdj}"></div>
                </div>
                <button class="btn clay-btn clay-btn-primary full-width-btn" onclick="saveMemberData(${idx})">
                    <svg class="svg-icon" viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3-1.34 3-3-3zm3-10H5V5h10v4z"/></svg>
                    ${m.name}-এর ডাটা সেভ করুন
                </button>
            </div>
        `).join('');
    }

    // Admin notice list
    const noticeBox = $('adminNoticeList');
    if (noticeBox) {
        noticeBox.innerHTML = state.notices.map((n, idx) => `
            <div class="notice-item-admin ${n.type}">
                <span>${n.text.substring(0, 35)}...</span>
                <button class="btn clay-btn clay-btn-danger" style="padding: 3px 8px; font-size: 11px;" onclick="deleteNotice(${idx})">ডিলিট</button>
            </div>
        `).join('');
    }
}

// ---------- Data Mutations ----------
function submitDepositTransaction() {
    const memberName = $('txnMemberSelect').value;
    const amount = numVal('txnAmountInput');
    const note = textVal('txnNoteInput') || "ক্যাশ জমা";

    if (!amount || amount <= 0) {
        showToast("সঠিক টাকার পরিমাণ লিখুন!", "error");
        return;
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

    $('txnAmountInput').value = '';
    $('txnNoteInput').value = '';

    saveData(); // internally re-renders via calculateAll()
    showToast(`${memberName}-এর জন্য ${bdt(amount)} সফলভাবে জমা হয়েছে!`, "success");
}

function deleteTransaction(txnId) {
    const targetTxn = state.transactions.find(t => t.id === txnId);
    if (!targetTxn) return;

    showConfirmModal(
        "ট্রানজেকশন ডিলিট",
        `আপনি কি নিশ্চিত যে ${targetTxn.member}-এর ${bdt(targetTxn.amount)} জমার এন্ট্রিটি ডিলিট করতে চান?`,
        async () => {
            state.transactions = state.transactions.filter(t => t.id !== txnId);
            saveData();

            if (window.firebaseDb) {
                try {
                    const { doc, deleteDoc } = await getFirestoreModule();
                    await deleteDoc(doc(window.firebaseDb, "transactions", String(txnId)));
                } catch (e) {
                    console.error("Firebase delete transaction error:", e);
                }
            }

            showToast("ট্রানজেকশন সফলভাবে ডিলিট করা হয়েছে!", "info");
        }
    );
}

function deleteNotice(idx) {
    const targetNotice = state.notices[idx];
    const noticeId = targetNotice ? targetNotice.id : null;

    state.notices.splice(idx, 1);
    saveData();

    if (noticeId && window.firebaseDb) {
        getFirestoreModule()
            .then(({ doc, deleteDoc }) => deleteDoc(doc(window.firebaseDb, "notices", String(noticeId))))
            .catch(e => console.error("Firebase delete notice error:", e));
    }

    showToast("নোটিশ মুছে ফেলা হয়েছে!", "info");
}

function addNewNotice() {
    const text = textVal('newNoticeText');
    const type = $('newNoticeType').value;
    if (!text) {
        showToast("নোটিশের তথ্য লিখুন!", "error");
        return;
    }

    state.notices.push({ id: Date.now(), text, type });
    $('newNoticeText').value = '';
    saveData();
    showToast("নতুন নোটিশ যোগ করা হয়েছে!", "success");
}

function saveCustomAdjLabel() {
    state.customAdjLabel = textVal('customAdjLabelInput') || "অন্যান্য";
    saveData();
    showToast("অন্যান্য এডজাস্টমেন্টের নাম সফলভাবে সেভ করা হয়েছে!", "success");
}

function saveFixedCosts() {
    state.fixedCosts.electricity = numVal('inp_elec');
    state.fixedCosts.gas = numVal('inp_gas');

    if ($('inp_water_count')) {
        state.fixedCosts.waterBottleCount = numVal('inp_water_count');
    }
    if ($('inp_water_price')) {
        state.fixedCosts.waterBottlePrice = numVal('inp_water_price');
    }
    state.fixedCosts.waterBill = numVal('inp_water');

    state.fixedCosts.wifi = numVal('inp_wifi');
    state.fixedCosts.khala = numVal('inp_khala');
    state.fixedCosts.waste = numVal('inp_waste');
    state.customAdjLabel = textVal('customAdjLabelInput') || "অন্যান্য";

    saveData();
    showToast("ইউটিলিটি খরচ সেভ করা হয়েছে!", "success");
}

function saveMemberData(idx) {
    const memberName = state.members[idx].name;
    state.members[idx].meals = numVal(`mem_meals_${idx}`);
    state.members[idx].bazarDeposit = numVal(`mem_bazar_${idx}`);
    state.members[idx].prevAdj = numVal(`mem_prev_${idx}`);
    state.members[idx].fridgeAdj = numVal(`mem_fridge_${idx}`);
    state.customAdjLabel = textVal('customAdjLabelInput') || "অন্যান্য";

    saveData();
    showToast(`${memberName}-এর তথ্য আপডেট করা হয়েছে!`, "success");
}

// ---------- Export ----------
function exportCSV() {
    let csv = "\uFEFFSL,Date,Member,Note,Amount (BDT)\n";
    state.transactions.forEach((t, i) => {
        csv += `"${i + 1}","${t.date}","${t.member}","${t.note}","${t.amount}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Google_Sheets_Mess_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast("CSV ফাইল ডাউনলোড শুরু হয়েছে", "info");
}

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `Isotope_Mess_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showToast("JSON ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন", "info");
}

function exportPDF() { window.print(); }

// ---------- Page Navigation ----------
function showTxnPage() {
    $('mainDashboard').style.display = 'none';
    $('txnPage').style.display = 'block';
    renderTransactions();
}

function hideTxnPage() {
    $('txnPage').style.display = 'none';
    $('mainDashboard').style.display = 'block';
}

// ---------- Admin Modal / Drawer ----------
function handleAdminToggle() {
    if (state.isAdmin) {
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
    showToast("এডমিন মোড বন্ধ করা হয়েছে", "info");
}

function openAdminModal() {
    showChangePassView(false);
    $('adminPassword').value = '';
    $('adminModal').style.display = 'flex';
}

function closeAdminModal() {
    $('adminModal').style.display = 'none';
}

function showChangePassView(show) {
    $('adminModalTitle').innerText = show ? "পাসওয়ার্ড পরিবর্তন করুন" : "এডমিন সিকিউরিটি এক্সেস";
    $('adminUnlockView').style.display = show ? "none" : "block";
    $('adminChangePassView').style.display = show ? "block" : "none";
    $('currAdminPass').value = '';
    $('newAdminPass').value = '';
}

function togglePasswordVisibility(inputId = 'adminPassword', eyeIconId = 'eyeIconSvg') {
    const input = $(inputId);
    const eyeSvg = $(eyeIconId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        if (eyeSvg) {
            eyeSvg.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2z"/>';
        }
    } else {
        input.type = 'password';
        if (eyeSvg) {
            eyeSvg.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        }
    }
}

function verifyAdmin() {
    const pass = textVal('adminPassword');
    const currentPass = state.adminPassword || DEFAULT_ADMIN_PASSWORD;

    if (pass === currentPass) {
        state.isAdmin = true;
        updateAdminUIState();
        closeAdminModal();
        toggleAdminDrawer(true);
        calculateAll();
        showToast("এডমিন এক্সেস আনলক হয়েছে!", "success");
    } else {
        showToast("ভুল পাসওয়ার্ড!", "error");
    }
}

function submitPasswordChange() {
    const currPass = textVal('currAdminPass');
    const newPass = textVal('newAdminPass');
    const actualCurrentPass = state.adminPassword || DEFAULT_ADMIN_PASSWORD;

    if (!currPass) {
        showToast("বর্তমান পাসওয়ার্ড লিখুন!", "error");
        return;
    }
    if (currPass !== actualCurrentPass) {
        showToast("বর্তমান পাসওয়ার্ড সঠিক নয়!", "error");
        return;
    }
    if (!newPass || newPass.trim().length < 4) {
        showToast("নতুন পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে!", "error");
        return;
    }

    state.adminPassword = newPass.trim();
    saveData();
    showToast("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "success");
    showChangePassView(false);
}

function updateAdminUIState() {
    const label = state.isAdmin ? "এডমিন প্যানেল" : "এডমিন কন্ট্রোল";
    if ($('adminBtnText')) $('adminBtnText').innerText = label;
    if ($('txnAdminNavBtnText')) $('txnAdminNavBtnText').innerText = label;
}

function toggleAdminDrawer(open) {
    const drawer = $('adminDrawer');
    if (open) drawer.classList.add('open');
    else drawer.classList.remove('open');
}

// ---------- Member Column Highlight + Scroll ----------
function highlightMemberColumn(memberName) {
    const table = document.querySelector('.horizontal-table');
    if (!table) return;

    const allCells = table.querySelectorAll('th, td');
    allCells.forEach(c => c.classList.remove('highlight-column'));

    if (!memberName) return;

    const memberIdx = state.members.findIndex(m => m.name === memberName);
    if (memberIdx === -1) return;

    const targetColIdx = memberIdx + 1; // +1 because col 0 is label column

    table.querySelectorAll('tr').forEach(r => {
        const cell = r.children[targetColIdx];
        if (cell) cell.classList.add('highlight-column');
    });

    const container = $('memberTableContainer');
    if (container) {
        const sampleHeaderCell = table.querySelector(`thead tr th:nth-child(${targetColIdx + 1})`);
        const firstHeaderCell = table.querySelector('thead tr th:first-child');
        if (sampleHeaderCell && firstHeaderCell) {
            const stickyWidth = firstHeaderCell.offsetWidth;
            const containerWidth = container.clientWidth;
            const visibleWidth = containerWidth - stickyWidth;

            const cellCenter = sampleHeaderCell.offsetLeft + (sampleHeaderCell.offsetWidth / 2);
            const viewportCenter = stickyWidth + (visibleWidth / 2);

            let targetScrollLeft = Math.max(0, cellCenter - viewportCenter);

            // If not the last member, scroll less to the left (~6px / 1mm) as requested
            const isLastMember = (memberIdx === state.members.length - 1);
            if (!isLastMember) {
                targetScrollLeft = Math.max(0, targetScrollLeft - 6);
            }

            container.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth'
            });
        }
    }
    showToast(`${memberName}-এর কলাম ফোকাস ও হাইলাইট করা হয়েছে!`, "info");
}

// ---------- Data Loading (Firebase / local mock) ----------
async function loadMockData() {
    if (typeof window.loadMockDatabase === 'function') {
        return window.loadMockDatabase();
    }
    const res = await fetch('src/data/mockDatabase.json');
    if (!res.ok) throw new Error('Mock database file not found at src/data/mockDatabase.json');
    return res.json();
}

function applyFirestoreSnapshot(cfg, membersSnap, noticesSnap, transactionsSnap) {
    if (cfg) {
        state.fixedCosts = cfg.fixedCosts || state.fixedCosts;
        state.customAdjLabel = cfg.customAdjLabel || state.customAdjLabel;
        if (cfg.adminPassword) state.adminPassword = cfg.adminPassword;
    }
    if (membersSnap && !membersSnap.empty) {
        state.members = [];
        membersSnap.forEach(d => state.members.push(d.data()));
    }
    if (noticesSnap && !noticesSnap.empty) {
        state.notices = [];
        noticesSnap.forEach(d => state.notices.push(d.data()));
    }
    if (transactionsSnap && !transactionsSnap.empty) {
        state.transactions = [];
        transactionsSnap.forEach(d => state.transactions.push(d.data()));
    }
}

async function loadFirebaseData() {
    const local = localStorage.getItem('isotope_mess_data');
    if (local) {
        state = JSON.parse(local);
        updateAdminUIState();
        calculateAll();
    }

    // PRODUCTION: pull from live Firestore
    if (window.firebaseDb) {
        try {
            const { doc, getDoc, collection, getDocs } = await getFirestoreModule();

            const configSnap = await getDoc(doc(window.firebaseDb, "settings", "config"));
            const membersSnap = await getDocs(collection(window.firebaseDb, "members"));
            const noticesSnap = await getDocs(collection(window.firebaseDb, "notices"));
            const transactionsSnap = await getDocs(collection(window.firebaseDb, "transactions"));

            if (configSnap.exists() || !membersSnap.empty) {
                applyFirestoreSnapshot(configSnap.exists() ? configSnap.data() : null, membersSnap, noticesSnap, transactionsSnap);
                persistLocally();
                updateAdminUIState();
                calculateAll();
            } else {
                await saveData(); // Initialize Firestore collections with current state
            }
        } catch (e) {
            logFirebaseError(e);
        }
        return;
    }

    // DEV: seed from local mock JSON — NO Firebase requests at all
    if (!local && window.IS_DEV_MODE) {
        try {
            const mock = await loadMockData();
            const cfg = (mock.settings && mock.settings.config) || {};

            if (cfg.fixedCosts) state.fixedCosts = cfg.fixedCosts;
            if (cfg.customAdjLabel) state.customAdjLabel = cfg.customAdjLabel;
            if (cfg.adminPassword) state.adminPassword = cfg.adminPassword;

            if (mock.members) state.members = Object.values(mock.members);
            if (mock.notices) state.notices = mock.notices;
            if (mock.transactions) state.transactions = mock.transactions;

            persistLocally();
            updateAdminUIState();
            calculateAll();
            console.info("[DEV] Using local mock database — no Firebase requests are made.");
        } catch (e) {
            console.warn("Mock database load error:", e);
        }
    }
}

// ---------- Init ----------
window.onload = function () {
    loadFirebaseData();
    window.addEventListener('firebase-ready', () => {
        loadFirebaseData();
    });

    // =====================
    // Online / Offline Detection for PWA
    // =====================
    window.addEventListener('online', () => {
        showToast("📶 ইন্টারনেট সংযোগ পাওয়া গেছে! তথ্য আপডেট করা হচ্ছে...", "success");
        loadFirebaseData();
    });

    window.addEventListener('offline', () => {
        showToast("📵 আপনি অফলাইনে আছেন। সংরক্ষিত ডাটা দেখানো হচ্ছে।", "error");
    });

    if (!navigator.onLine) {
        setTimeout(() => {
            showToast("📵 অফলাইন মোড: সংরক্ষিত ডাটা দেখানো হচ্ছে।", "error");
        }, 1500);
    }
};