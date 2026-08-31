// ============================================================
//  ISOTOPE MESS DASHBOARD — app.js
//  Complete, Robust, Responsive & Multi-Month Mess Management
// ============================================================

// ---------- Constants ----------
const FIREBASE_FIRESTORE_URL = "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
const DEFAULT_ADMIN_PASSWORD = "@12azmain";
const DEFAULT_CUSTOM_ADJ_LABEL = "ফ্রিজ সমন্বয়";
const MEMBER_ORDER = ["আজমাইন", "রিয়াজ", "সাকিব", "ওমর", "নাফিজ", "ফারেছ"];
const CURRENT_YEAR = 2026;

const BENGALI_MONTH_NAMES = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল",
    "মে", "জুন", "জুলাই", "আগস্ট",
    "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

// Baseline Data (August 2026)
const AUGUST_FIXED_COSTS = {
    electricity: 1500,
    gas: 1800,
    waterBottleCount: 40,
    waterBottlePrice: 20,
    waterBill: 800,
    wifi: 700,
    khala: 2500,
    waste: 70
};

const AUGUST_MEMBERS = [
    { name: "আজমাইন", meals: 59, bazarDeposit: 2451, rent: 2200, prevAdj: 96.67, fridgeAdj: -120 },
    { name: "রিয়াজ", meals: 42, bazarDeposit: 2299, rent: 2200, prevAdj: 96.67, fridgeAdj: -120 },
    { name: "সাকিব", meals: 5, bazarDeposit: 0, rent: 2000, prevAdj: -140.67, fridgeAdj: 480 },
    { name: "ওমর", meals: 0, bazarDeposit: 0, rent: 2000, prevAdj: -143.33, fridgeAdj: 0 },
    { name: "নাফিজ", meals: 53, bazarDeposit: 0, rent: 1800, prevAdj: -472.26, fridgeAdj: -120 },
    { name: "ফারেছ", meals: 43, bazarDeposit: 3391, rent: 1800, prevAdj: 96.67, fridgeAdj: -120 }
];

const AUGUST_NOTICES = [
    { id: 1, text: "🚨 জুলাই ২০২৬ বিল পরিশোধের সময়সীমা: আগামী ৫ তারিখের মধ্যে ইউটিলিটি ও ৮ তারিখের মধ্যে বাসা ভাড়া দিতে হবে। মোট বাসা ভাড়া ১২,০০০ টাকা।", type: "notice-urgent" },
    { id: 2, text: "🌱 অগ্রিম ইউটিলিটি বিল: কারেন্ট ৳১৫০০, গ্যাস ৳১৮০০, পানি ৳৮০০, ওয়াইফাই ৳৭০০ এবং বর্তমান খালার বিল ৳২৫০০, ময়লা ৳৭০ হিসাবভুক্ত করা হয়েছে।", type: "notice-advance" },
    { id: 3, text: "🧊 ফ্রিজ বহনের BDT 600 হিসাব: সাকিব পরিশোধ করেছেন (ওমর বাদে বাকি ৫ জন BDT 120 করে শেয়ার করবেন)।", type: "notice-info" },
    { id: 4, text: "👥 জরুরি মিটিং: আগামী শুক্রবার জুম্মার নামাজের পর মেসের হিসাব নিকেশ নিয়ে বৈঠক হবে।", type: "notice-meeting" },
    { id: 5, text: "🛒 বাজার আপডেট: প্রতিদিনের বাজার তালিকা এবং মিল এন্ট্রি সময়মতো সম্পন্ন করুন।", type: "notice-bazar" },
    { id: 6, text: "📌 সাধারণ নির্দেশনা: মেসের কমন স্পেস পরিষ্কার পরিচ্ছন্ন রাখুন।", type: "notice-other" }
];

const AUGUST_TRANSACTIONS = [
    { id: 101, date: "01/08/2026, 10:30 AM", member: "আজমাইন", note: "প্রাথমিক বাজার জমা", amount: 2451 },
    { id: 102, date: "02/08/2026, 02:15 PM", member: "রিয়াজ", note: "প্রাথমিক বাজার জমা", amount: 2299 },
    { id: 103, date: "03/08/2026, 06:40 PM", member: "ফারেছ", note: "প্রাথমিক বাজার জমা", amount: 3391 }
];

// Generate clean default month template (all values zero)
function createEmptyMonthData() {
    return {
        fixedCosts: {
            electricity: 0,
            gas: 0,
            waterBottleCount: 0,
            waterBottlePrice: 0,
            waterBill: 0,
            wifi: 0,
            khala: 0,
            waste: 0
        },
        members: MEMBER_ORDER.map(name => ({
            name,
            meals: 0,
            bazarDeposit: 0,
            rent: 0,
            prevAdj: 0,
            fridgeAdj: 0
        })),
        notices: [],
        transactions: []
    };
}

// Initial multi-month dictionary for current year (2026)
function createInitialMonthsData() {
    const months = {};
    for (let m = 1; m <= 12; m++) {
        const key = `${CURRENT_YEAR}-${String(m).padStart(2, '0')}`;
        months[key] = createEmptyMonthData();
    }
    // Set August real data
    months["2026-08"] = {
        fixedCosts: { ...AUGUST_FIXED_COSTS },
        members: AUGUST_MEMBERS.map(m => ({ ...m })),
        notices: AUGUST_NOTICES.map(n => ({ ...n })),
        transactions: AUGUST_TRANSACTIONS.map(t => ({ ...t }))
    };
    return months;
}

// ---------- State ----------
let state = {
    isAdmin: false,
    adminPassword: DEFAULT_ADMIN_PASSWORD,
    customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
    activeMonth: "2026-08",
    months: createInitialMonthsData(),
    // Active month view mirrors:
    fixedCosts: { ...AUGUST_FIXED_COSTS },
    members: AUGUST_MEMBERS.map(m => ({ ...m })),
    notices: AUGUST_NOTICES.map(n => ({ ...n })),
    transactions: AUGUST_TRANSACTIONS.map(t => ({ ...t }))
};

let confirmCallback = null;
let firestoreModuleCache = null;

// ---------- DOM Helpers ----------
const $ = id => document.getElementById(id);
const numVal = id => Number($(id)?.value || 0);
const textVal = id => $(id)?.value || "";
const bdt = n => `BDT ${Number(n).toFixed(2)}`;

function populateSelect(selectEl, values, firstOption = "") {
    if (!selectEl) return;
    let html = firstOption ? `<option value="">${firstOption}</option>` : "";
    html += values.map(v => `<option value="${v}">${v}</option>`).join("");
    selectEl.innerHTML = html;
}

// ---------- Bengali Month Formatter ----------
function getBengaliMonthLabel(mKey) {
    const [yearStr, monthStr] = mKey.split('-');
    const mIdx = parseInt(monthStr, 10) - 1;
    return `${BENGALI_MONTH_NAMES[mIdx]} ${yearStr}`;
}

// ---------- Toast / Confirm ----------
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

// ---------- Firebase Module & Sync ----------
async function getFirestoreModule() {
    if (!firestoreModuleCache) {
        firestoreModuleCache = await import(FIREBASE_FIRESTORE_URL);
    }
    return firestoreModuleCache;
}

function persistLocally() {
    // Keep active month updated inside state.months
    if (state.months && state.activeMonth) {
        state.months[state.activeMonth] = {
            fixedCosts: { ...state.fixedCosts },
            members: state.members.map(m => ({ ...m })),
            notices: state.notices.map(n => ({ ...n })),
            transactions: state.transactions.map(t => ({ ...t }))
        };
    }
    localStorage.setItem('isotope_mess_data_v2', JSON.stringify(state));
}

async function saveData() {
    calculateAll();
    persistLocally();

    if (!window.firebaseDb) return;

    try {
        const { doc, setDoc } = await getFirestoreModule();
        const mKey = state.activeMonth;

        // Global settings
        await setDoc(doc(window.firebaseDb, "settings", "config"), {
            customAdjLabel: state.customAdjLabel,
            adminPassword: state.adminPassword || DEFAULT_ADMIN_PASSWORD,
            activeMonth: state.activeMonth
        });

        // Month-scoped fixed costs
        await setDoc(doc(window.firebaseDb, "months", mKey, "data", "fixedCosts"), state.fixedCosts);

        // Month-scoped members
        for (let member of state.members) {
            const docId = member.name.replace(/\s+/g, '_');
            await setDoc(doc(window.firebaseDb, "months", mKey, "members", docId), member);
        }

        // Month-scoped notices
        for (let notice of state.notices) {
            await setDoc(doc(window.firebaseDb, "months", mKey, "notices", String(notice.id)), notice);
        }

        // Month-scoped transactions
        for (let txn of state.transactions) {
            await setDoc(doc(window.firebaseDb, "months", mKey, "transactions", String(txn.id)), txn);
        }
    } catch (e) {
        console.error("Firebase save error:", e);
    }
}

async function loadFromFirestore() {
    if (!window.firebaseDb) return;
    try {
        const { doc, getDoc } = await getFirestoreModule();

        // 1. Load config if exists
        try {
            const configSnap = await getDoc(doc(window.firebaseDb, "settings", "config"));
            if (configSnap && configSnap.exists()) {
                const configData = configSnap.data();
                if (configData.customAdjLabel) state.customAdjLabel = configData.customAdjLabel;
                if (configData.adminPassword) state.adminPassword = configData.adminPassword;
                if (configData.activeMonth) state.activeMonth = configData.activeMonth;
            }
        } catch (err) {
            console.warn("Firebase config load warning:", err);
        }

        // 2. Load active month data from Firestore
        await loadMonthDataFromFirestore(state.activeMonth);

        updateMonthDisplayUI();
        calculateAll();
        persistLocally();
    } catch (e) {
        console.error("Firebase initial load error:", e);
    }
}

async function loadMonthDataFromFirestore(mKey) {
    if (!window.firebaseDb) return;
    try {
        const { doc, getDoc, collection, getDocs } = await getFirestoreModule();

        // Fixed costs
        try {
            const fixedSnap = await getDoc(doc(window.firebaseDb, "months", mKey, "data", "fixedCosts"));
            if (fixedSnap && fixedSnap.exists()) {
                state.fixedCosts = fixedSnap.data();
            }
        } catch (err) {
            console.warn(`Firebase fixedCosts load warning (${mKey}):`, err);
        }

        // Members
        try {
            const memSnap = await getDocs(collection(window.firebaseDb, "months", mKey, "members"));
            if (memSnap && !memSnap.empty) {
                const membersList = [];
                memSnap.forEach(d => membersList.push(d.data()));
                if (membersList.length > 0) {
                    state.members = membersList;
                    ensureMemberOrder();
                }
            }
        } catch (err) {
            console.warn(`Firebase members load warning (${mKey}):`, err);
        }

        // Notices
        try {
            const notSnap = await getDocs(collection(window.firebaseDb, "months", mKey, "notices"));
            if (notSnap && !notSnap.empty) {
                const noticesList = [];
                notSnap.forEach(d => noticesList.push(d.data()));
                state.notices = noticesList;
            }
        } catch (err) {
            console.warn(`Firebase notices load warning (${mKey}):`, err);
        }

        // Transactions
        try {
            const txnSnap = await getDocs(collection(window.firebaseDb, "months", mKey, "transactions"));
            if (txnSnap && !txnSnap.empty) {
                const txnsList = [];
                txnSnap.forEach(d => txnsList.push(d.data()));
                txnsList.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
                state.transactions = txnsList;
            }
        } catch (err) {
            console.warn(`Firebase transactions load warning (${mKey}):`, err);
        }

        // Update local state.months dictionary
        if (!state.months) state.months = {};
        state.months[mKey] = {
            fixedCosts: { ...state.fixedCosts },
            members: state.members.map(m => ({ ...m })),
            notices: state.notices.map(n => ({ ...n })),
            transactions: state.transactions.map(t => ({ ...t }))
        };
    } catch (e) {
        console.error(`Firebase month load error for ${mKey}:`, e);
    }
}

// ---------- Auto Previous Month Balance Calculation ----------
function getPrevMonthKey(mKey) {
    const [yearStr, monthStr] = mKey.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
        month = 12;
        year -= 1;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
}

function calculatePrevMonthBalanceForMember(mKey, memberName) {
    const prevKey = getPrevMonthKey(mKey);
    const prevData = state.months ? state.months[prevKey] : null;
    if (!prevData || !prevData.members || prevData.members.length === 0) {
        return 0;
    }

    const memberCount = prevData.members.length || 1;
    const perHead = {
        elec: Number(prevData.fixedCosts?.electricity || 0) / memberCount,
        gas: Number(prevData.fixedCosts?.gas || 0) / memberCount,
        water: Number(prevData.fixedCosts?.waterBill || 0) / memberCount,
        wifi: Number(prevData.fixedCosts?.wifi || 0) / memberCount,
        khala: Number(prevData.fixedCosts?.khala || 0) / memberCount,
        waste: Number(prevData.fixedCosts?.waste || 0) / memberCount
    };
    const utilitiesSum = perHead.elec + perHead.gas + perHead.water + perHead.wifi + perHead.khala + perHead.waste;

    const totalMeals = prevData.members.reduce((acc, m) => acc + Number(m.meals || 0), 0);
    const totalBazar = prevData.members.reduce((acc, m) => acc + Number(m.bazarDeposit || 0), 0);
    const rawMealRate = totalMeals > 0 ? (totalBazar / totalMeals) : 0;
    const mealRate = Math.round(rawMealRate * 100) / 100;

    const mem = prevData.members.find(m => m.name === memberName);
    if (!mem) return 0;

    const mealsNum = Number(mem.meals || 0);
    const bazarNum = Number(mem.bazarDeposit || 0);
    const prevNum = Number(mem.prevAdj || 0);
    const fridgeNum = Number(mem.fridgeAdj || 0);
    const rentNum = Number(mem.rent || 0);

    const mealExpense = Number((mealsNum * mealRate).toFixed(2));
    const totalExpenseExceptRent = utilitiesSum + mealExpense + prevNum + fridgeNum;
    const netPayableWithoutRent = totalExpenseExceptRent - bazarNum;

    const memberTotalDeposit = (prevData.transactions || [])
        .filter(t => t.member === memberName)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalNetPayableWithRent = (netPayableWithoutRent + rentNum) - memberTotalDeposit;
    return Math.round(totalNetPayableWithRent * 100) / 100;
}

// ---------- Month Switcher Controls ----------
function switchMonth(targetMonthKey) {
    // Save current active month in dictionary
    if (state.months && state.activeMonth) {
        state.months[state.activeMonth] = {
            fixedCosts: { ...state.fixedCosts },
            members: state.members.map(m => ({ ...m })),
            notices: state.notices.map(n => ({ ...n })),
            transactions: state.transactions.map(t => ({ ...t }))
        };
    }

    state.activeMonth = targetMonthKey;

    // Load or initialize target month
    if (!state.months[targetMonthKey]) {
        state.months[targetMonthKey] = createEmptyMonthData();
    }

    const mData = state.months[targetMonthKey];
    state.fixedCosts = { ...mData.fixedCosts };
    state.members = mData.members.map(m => ({ ...m }));
    state.notices = mData.notices.map(n => ({ ...n }));
    state.transactions = mData.transactions.map(t => ({ ...t }));

    // Auto calculate previous month balance for non-August months
    if (targetMonthKey !== "2026-08") {
        state.members.forEach(m => {
            m.prevAdj = calculatePrevMonthBalanceForMember(targetMonthKey, m.name);
        });
    }

    closeAllMonthDropdowns();
    updateMonthDisplayUI();
    calculateAll();
    persistLocally();
    showToast(`${getBengaliMonthLabel(targetMonthKey)}-এর হিসাব ওপেন করা হয়েছে`, "info");

    if (window.firebaseDb) {
        loadMonthDataFromFirestore(targetMonthKey).then(() => {
            calculateAll();
            persistLocally();
            updateMonthDisplayUI();
        });
    }
}

function prevMonth() {
    const [yearStr, monthStr] = state.activeMonth.split('-');
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) return; // restrict to Jan of current year
    const newKey = `${yearStr}-${String(month).padStart(2, '0')}`;
    switchMonth(newKey);
}

function nextMonth() {
    const [yearStr, monthStr] = state.activeMonth.split('-');
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) return; // restrict to Dec of current year
    const newKey = `${yearStr}-${String(month).padStart(2, '0')}`;
    switchMonth(newKey);
}

function updateMonthDisplayUI() {
    const label = getBengaliMonthLabel(state.activeMonth);
    const activeLabelEl = $('activeMonthLabel');
    if (activeLabelEl) activeLabelEl.innerText = label;

    const txnActiveLabelEl = $('txnActiveMonthLabel');
    if (txnActiveLabelEl) txnActiveLabelEl.innerText = label;

    const adminActiveLabelEl = $('adminActiveMonthLabel');
    if (adminActiveLabelEl) adminActiveLabelEl.innerText = label;

    renderMonthDropdown('monthDropdown');
    renderMonthDropdown('txnMonthDropdown');
    renderMonthDropdown('adminMonthDropdown');
}

function renderMonthDropdown(dropdownId) {
    const el = $(dropdownId);
    if (!el) return;

    let html = '';
    for (let m = 1; m <= 12; m++) {
        const mKey = `${CURRENT_YEAR}-${String(m).padStart(2, '0')}`;
        const isActive = (mKey === state.activeMonth);
        const name = BENGALI_MONTH_NAMES[m - 1];
        html += `<div class="month-option ${isActive ? 'active' : ''}" onclick="switchMonth('${mKey}')">${name} ${CURRENT_YEAR}</div>`;
    }
    el.innerHTML = html;
}

function toggleMonthDropdown(dropdownId, wrapperId) {
    const dropdown = $(dropdownId);
    if (!dropdown) return;
    const isShown = dropdown.style.display === 'block';
    closeAllMonthDropdowns();
    if (!isShown) dropdown.style.display = 'block';
}

function closeAllMonthDropdowns() {
    ['monthDropdown', 'txnMonthDropdown', 'adminMonthDropdown'].forEach(id => {
        const el = $(id);
        if (el) el.style.display = 'none';
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.month-display-wrapper')) {
        closeAllMonthDropdowns();
    }
});

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

// ---------- Water Bill Calculation ----------
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

    const thead = table.querySelector('thead');
    if (thead) {
        thead.innerHTML = `<tr><th style="min-width: 190px;">আইটেম / সদস্য</th>` +
            state.members.map(m => `<th class="text-right">${m.name}</th>`).join('') + `</tr>`;
    }

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
            const totalExpenseExceptRent = utilitiesSum + mealExpense + prevNum + fridgeNum;
            const netPayableWithoutRent = totalExpenseExceptRent - bazarNum;
            const memberTotalDeposit = depositByMember.get(m.name) || 0;
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

// ---------- Highlight Member Column ----------
function highlightMemberColumn(memberName) {
    const table = document.querySelector('.horizontal-table');
    if (!table) return;

    table.querySelectorAll('.highlight-column').forEach(cell => cell.classList.remove('highlight-column'));
    if (!memberName) return;

    let targetColIdx = -1;
    const headerThs = table.querySelectorAll('thead th');
    headerThs.forEach((th, idx) => {
        if (th.innerText.trim() === memberName.trim()) {
            targetColIdx = idx;
        }
    });

    if (targetColIdx !== -1) {
        headerThs[targetColIdx].classList.add('highlight-column');
        table.querySelectorAll('tbody tr').forEach(tr => {
            const cells = tr.children;
            if (cells[targetColIdx]) cells[targetColIdx].classList.add('highlight-column');
        });
    }
}

// ---------- RENDER: ADMIN INPUTS & SINGLE MEMBER SELECTOR ----------
function renderDrawerInputs() {
    const memberNames = state.members.map(m => m.name);

    populateSelect($('txnMemberSelect'), memberNames);

    const filterSelect = $('txnMemberFilter');
    if (filterSelect && filterSelect.options.length <= 1) {
        populateSelect(filterSelect, memberNames, "সকল মেম্বার");
    }

    const highlightSelect = $('memberHighlightSelect');
    if (highlightSelect) {
        const currentVal = highlightSelect.value;
        populateSelect(highlightSelect, memberNames, "👤 আপনার নাম নির্বাচন করুন");
        if (currentVal) highlightSelect.value = currentVal;
    }

    // Card 2: Fixed Costs Inputs (with Custom Adjustment Label beside Waste Bill)
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
            <div class="input-group"><label>অন্যান্য এডজাস্টমেন্টের নাম:</label><input type="text" id="customAdjLabelInput" class="drawer-input" value="${state.customAdjLabel}"></div>
        `;
    }

    // Card 3: Notice List Preview
    const noticeBox = $('adminNoticeList');
    if (noticeBox) {
        noticeBox.innerHTML = state.notices.map((n, idx) => `
            <div class="notice-item-admin ${n.type}">
                <span style="flex:1; word-break:break-word;">${n.text.substring(0, 32)}...</span>
                <button class="btn clay-btn clay-btn-danger" style="padding: 3px 8px; font-size: 11px; flex-shrink:0;" onclick="deleteNotice(${idx})">ডিলিট</button>
            </div>
        `).join('');
    }

    // Card 4: Single Member Selector & Form
    const adminMemberSelect = $('adminMemberSelect');
    if (adminMemberSelect) {
        const currentSelected = adminMemberSelect.value;
        adminMemberSelect.innerHTML = '<option value="">-- সদস্য নির্বাচন করুন --</option>';
        state.members.forEach((m, idx) => {
            adminMemberSelect.innerHTML += `<option value="${idx}">${m.name}</option>`;
        });
        if (currentSelected !== "") {
            adminMemberSelect.value = currentSelected;
        } else if (state.members.length > 0) {
            adminMemberSelect.value = "0"; // Default to first member
        }
        renderMemberEditForm();
    }
}

// Single member edit form render
function renderMemberEditForm() {
    const adminMemberSelect = $('adminMemberSelect');
    const container = $('memberEditFormContainer');
    const badgeEl = $('memberSelectorBadge');
    if (!adminMemberSelect || !container) return;

    const selectedIdx = adminMemberSelect.value;
    if (selectedIdx === "" || !state.members[selectedIdx]) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #64748b; font-size: 13.5px;">
                👆 উপরে ড্রপডাউন থেকে একজন সদস্য নির্বাচন করুন
            </div>
        `;
        if (badgeEl) badgeEl.innerHTML = '';
        return;
    }

    const m = state.members[selectedIdx];
    const prevAdjVal = Number(m.prevAdj || 0);

    // Render clean badge in selector bar
    if (badgeEl) {
        if (prevAdjVal > 0) {
            badgeEl.innerHTML = `<span class="badge-pill" style="background:#fee2e2; color:#991b1b; border:1px solid #f87171;">⬆ বকেয়া: BDT ${prevAdjVal.toFixed(2)} (পূর্ববর্তী মাস)</span>`;
        } else if (prevAdjVal < 0) {
            badgeEl.innerHTML = `<span class="badge-pill" style="background:#dcfce7; color:#166534; border:1px solid #4ade80;">⬇ জমা: BDT ${Math.abs(prevAdjVal).toFixed(2)} (পূর্ববর্তী মাস)</span>`;
        } else {
            badgeEl.innerHTML = `<span class="badge-pill" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;">সমন্বয়: 0.00</span>`;
        }
    }

    container.innerHTML = `
        <div class="member-single-edit-card clay-inset">
            <div class="member-card-banner">
                <div class="member-avatar-circle">${m.name.charAt(0)}</div>
                <div class="member-banner-info">
                    <h4>${m.name}</h4>
                    <p>চলতি মাসের হিসাব ও এন্ট্রি এডিটর</p>
                </div>
            </div>

            <div class="member-edit-grid">
                <div class="input-group">
                    <label>🍽️ মিল সংখ্যা:</label>
                    <input type="number" id="single_mem_meals" class="drawer-input" value="${m.meals}">
                </div>
                <div class="input-group">
                    <label>🛒 বাজার জমা (BDT):</label>
                    <input type="number" id="single_mem_bazar" class="drawer-input" value="${m.bazarDeposit}">
                </div>
                <div class="input-group">
                    <label>🏠 বাসাভাড়া (BDT):</label>
                    <input type="number" id="single_mem_rent" class="drawer-input" value="${m.rent || 0}">
                </div>
                <div class="input-group">
                    <label>✨ অন্যান্য (${state.customAdjLabel}):</label>
                    <input type="number" id="single_mem_fridge" class="drawer-input" value="${m.fridgeAdj || 0}">
                </div>
            </div>

            <div class="prev-adj-info-box" style="margin-bottom: 14px;">
                <span class="prev-adj-info-icon">ℹ️</span>
                <div>
                    <strong>গত মাসের সমন্বয়:</strong> BDT ${prevAdjVal.toFixed(2)}
                    <span style="color:#64748b; font-size:11px;">(পূর্বের মাসের মোট হিসাব থেকে স্বয়ংক্রিয়ভাবে ক্যালকুলেটেড)</span>
                </div>
            </div>

            <button class="btn clay-btn clay-btn-primary full-width-btn" onclick="saveSelectedMemberData(${selectedIdx})">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                ${m.name}-এর ডাটা সেভ করুন
            </button>
        </div>
    `;
}

function saveSelectedMemberData(idx) {
    const memberName = state.members[idx].name;
    state.members[idx].meals = numVal('single_mem_meals');
    state.members[idx].bazarDeposit = numVal('single_mem_bazar');
    state.members[idx].rent = numVal('single_mem_rent');
    state.members[idx].fridgeAdj = numVal('single_mem_fridge');

    saveData();
    showToast(`${memberName}-এর তথ্য সফলভাবে আপডেট করা হয়েছে!`, "success");
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

    closeDepositModal();
    saveData();
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
                    const mKey = state.activeMonth;
                    await deleteDoc(doc(window.firebaseDb, "months", mKey, "transactions", String(txnId)));
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
            .then(({ doc, deleteDoc }) => {
                const mKey = state.activeMonth;
                return deleteDoc(doc(window.firebaseDb, "months", mKey, "notices", String(noticeId)));
            })
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
    closeNoticeModal();
    saveData();
    showToast("নতুন নোটিশ যোগ করা হয়েছে!", "success");
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
    showToast("ইউটিলিটি খরচ ও এডজাস্টমেন্ট নাম সেভ করা হয়েছে!", "success");
}

// ---------- COMPREHENSIVE EXPORT & PRINT ----------
function exportCSV() {
    const monthLabel = getBengaliMonthLabel(state.activeMonth);
    const memberCount = state.members.length || 1;

    let elecPerHead = Number(state.fixedCosts.electricity || 0) / memberCount;
    let gasPerHead = Number(state.fixedCosts.gas || 0) / memberCount;
    let waterPerHead = Number(state.fixedCosts.waterBill || 0) / memberCount;
    let wifiPerHead = Number(state.fixedCosts.wifi || 0) / memberCount;
    let khalaPerHead = Number(state.fixedCosts.khala || 0) / memberCount;
    let wastePerHead = Number(state.fixedCosts.waste || 0) / memberCount;
    let fixedPerHeadTotal = elecPerHead + gasPerHead + waterPerHead + wifiPerHead + khalaPerHead + wastePerHead;

    let totalMeals = state.members.reduce((acc, m) => acc + Number(m.meals || 0), 0);
    let totalBazar = state.members.reduce((acc, m) => acc + Number(m.bazarDeposit || 0), 0);
    let totalSeatRent = state.members.reduce((acc, m) => acc + Number(m.rent || 0), 0);
    let totalFixedCosts = Number(state.fixedCosts.electricity || 0) + Number(state.fixedCosts.gas || 0) + Number(state.fixedCosts.waterBill || 0) + Number(state.fixedCosts.wifi || 0) + Number(state.fixedCosts.khala || 0) + Number(state.fixedCosts.waste || 0);
    let grandTotalCost = totalBazar + totalFixedCosts + totalSeatRent;

    let rawMealRate = totalMeals > 0 ? (totalBazar / totalMeals) : 0;
    let mealRate = Math.round(rawMealRate * 100) / 100;

    let csv = `\uFEFF"=== ISOTOPE মেস হিসাব বিবরণী (${monthLabel}) ==="\n\n`;

    // Section 1: মেসের মোট হিসাব সামারি
    csv += `"1. মেসের মোট হিসাব সামারি"\n`;
    csv += `"বিবরণ / আইটেম","মোট পরিমাণ (BDT)","জনপ্রতি ভাগ (BDT)"\n`;
    csv += `"মোট বাজার খরচ","${totalBazar.toFixed(2)}","জমা অনুযায়ী"\n`;
    csv += `"মোট মিল সংখ্যা","${totalMeals} টি","${memberCount} জন সদস্য"\n`;
    csv += `"মিল রেট (Meal Rate)","${mealRate.toFixed(2)}","অটো ক্যালকুলেটেড"\n`;
    csv += `"মোট সিট ভাড়া","${totalSeatRent.toFixed(2)}","নির্দিষ্ট সিট রেট"\n`;
    csv += `"কারেন্ট বিল","${Number(state.fixedCosts.electricity || 0).toFixed(2)}","${elecPerHead.toFixed(2)}"\n`;
    csv += `"গ্যাস বিল","${Number(state.fixedCosts.gas || 0).toFixed(2)}","${gasPerHead.toFixed(2)}"\n`;
    csv += `"পানির বিল","${Number(state.fixedCosts.waterBill || 0).toFixed(2)}","${waterPerHead.toFixed(2)}"\n`;
    csv += `"ওয়াইফাই বিল","${Number(state.fixedCosts.wifi || 0).toFixed(2)}","${wifiPerHead.toFixed(2)}"\n`;
    csv += `"খালার বিল","${Number(state.fixedCosts.khala || 0).toFixed(2)}","${khalaPerHead.toFixed(2)}"\n`;
    csv += `"ময়লার বিল","${Number(state.fixedCosts.waste || 0).toFixed(2)}","${wastePerHead.toFixed(2)}"\n`;
    csv += `"সর্বমোট মেস খরচ","${grandTotalCost.toFixed(2)}","-"\n\n`;

    // Section 2: সদস্যভিত্তিক বিস্তারিত হিসাব সামারি
    csv += `"2. সদস্যভিত্তিক বিস্তারিত হিসাব সামারি"\n`;
    let memberHeader = `"আইটেম / সদস্য"`;
    state.members.forEach(m => { memberHeader += `,"${m.name}"`; });
    csv += memberHeader + `\n`;

    const rows = [
        { label: 'মিল সংখ্যা', fn: m => Number(m.meals || 0) },
        { label: 'মিল রেট (BDT)', fn: () => mealRate.toFixed(2) },
        { label: 'খাবার মিল খরচ (BDT)', fn: m => (Number(m.meals || 0) * mealRate).toFixed(2) },
        { label: 'কারেন্ট বিল (BDT)', fn: () => elecPerHead.toFixed(2) },
        { label: 'গ্যাস বিল (BDT)', fn: () => gasPerHead.toFixed(2) },
        { label: 'পানির বিল (BDT)', fn: () => waterPerHead.toFixed(2) },
        { label: 'ওয়াইফাই বিল (BDT)', fn: () => wifiPerHead.toFixed(2) },
        { label: 'খালার বিল (BDT)', fn: () => khalaPerHead.toFixed(2) },
        { label: 'ময়লার বিল (BDT)', fn: () => wastePerHead.toFixed(2) },
        { label: 'মোট ইউটিলিটি খরচ (BDT)', fn: () => fixedPerHeadTotal.toFixed(2) },
        { label: `অন্যান্য (${state.customAdjLabel || 'এডজাস্টমেন্ট'}) (BDT)`, fn: m => Number(m.fridgeAdj || 0).toFixed(2) },
        { label: 'গত মাসের সমন্বয় (BDT)', fn: m => Number(m.prevAdj || 0).toFixed(2) },
        { label: 'বাসাভাড়া (BDT)', fn: m => Number(m.rent || 0).toFixed(2) },
        {
            label: 'মোট প্রযোজ্য খরচ (BDT)', fn: m => {
                let mealCost = Number(m.meals || 0) * mealRate;
                let other = Number(m.fridgeAdj || 0);
                let prev = Number(m.prevAdj || 0);
                let rent = Number(m.rent || 0);
                return (mealCost + fixedPerHeadTotal + other + prev + rent).toFixed(2);
            }
        },
        {
            label: 'মেস ফান্ডে জমা (BDT)', fn: m => {
                let totalDep = state.transactions.filter(t => t.member === m.name).reduce((s, t) => s + Number(t.amount || 0), 0);
                return totalDep.toFixed(2);
            }
        },
        {
            label: 'চলতি মাসের মোট নিট প্রদেয় (ভাড়াসহ)', fn: m => {
                let mealCost = Number(m.meals || 0) * mealRate;
                let other = Number(m.fridgeAdj || 0);
                let prev = Number(m.prevAdj || 0);
                let rent = Number(m.rent || 0);
                let totalDue = mealCost + fixedPerHeadTotal + other + prev + rent;
                let totalDep = state.transactions.filter(t => t.member === m.name).reduce((s, t) => s + Number(t.amount || 0), 0);
                let net = totalDue - totalDep;
                return (net > 0 ? `+${net.toFixed(2)} (বকেয়া)` : net < 0 ? `-${Math.abs(net).toFixed(2)} (ফেরত)` : `0.00`);
            }
        }
    ];

    rows.forEach(r => {
        let line = `"${r.label}"`;
        state.members.forEach(m => { line += `,"${r.fn(m)}"`; });
        csv += line + `\n`;
    });

    csv += `\n`;

    // Section 3: ট্রানজেকশন হিস্ট্রি
    csv += `"3. ট্রানজেকশন হিস্ট্রি"\n`;
    csv += `"SL","তারিখ ও সময়","সদস্যের নাম","বিবরণ / নোট","জমার পরিমাণ (BDT)"\n`;
    let totalTxnAmount = 0;
    state.transactions.forEach((t, i) => {
        totalTxnAmount += Number(t.amount || 0);
        csv += `"${i + 1}","${t.date}","${t.member}","${t.note}","${t.amount}"\n`;
    });
    csv += `"","","","সর্বমোট জমা (Total Deposit)","${totalTxnAmount.toFixed(2)}"\n`;

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Isotope_Mess_Full_Report_${state.activeMonth}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast("পূর্ণাঙ্গ CSV রিপোর্ট ডাউনলোড শুরু হয়েছে", "info");
}

function exportJSON() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Isotope_Mess_Full_Backup_${state.activeMonth}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("JSON ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন", "info");
}

function exportPDF() {
    window.print();
}

// ---------- Navigation ----------
function showTxnPage() {
    $('mainDashboard').style.display = 'none';
    $('txnPage').style.display = 'block';
    const adminPage = $('adminPage');
    if (adminPage) adminPage.style.display = 'none';
    renderTransactions();
}

function hideTxnPage() {
    $('txnPage').style.display = 'none';
    $('mainDashboard').style.display = 'block';
}

function showAdminPage() {
    $('mainDashboard').style.display = 'none';
    $('txnPage').style.display = 'none';
    $('adminPage').style.display = 'block';
    renderDrawerInputs();
}

function hideAdminPage() {
    $('adminPage').style.display = 'none';
    $('mainDashboard').style.display = 'block';
}

// ---------- Modal Controls ----------
function openDepositModal() {
    const modal = $('depositModal');
    if (!modal) return;
    const select = $('txnMemberSelect');
    if (select) {
        select.innerHTML = '';
        state.members.forEach(m => {
            select.innerHTML += `<option value="${m.name}">${m.name}</option>`;
        });
    }
    const amtInput = $('txnAmountInput');
    const noteInput = $('txnNoteInput');
    if (amtInput) amtInput.value = '';
    if (noteInput) noteInput.value = '';
    modal.style.display = 'flex';
}

function closeDepositModal() {
    const modal = $('depositModal');
    if (modal) modal.style.display = 'none';
}

function openNoticeModal() {
    const modal = $('noticeModal');
    if (!modal) return;
    renderNoticeModalList();
    modal.style.display = 'flex';
}

function closeNoticeModal() {
    const modal = $('noticeModal');
    if (modal) modal.style.display = 'none';
}

function renderNoticeModalList() {
    const list = $('noticeModalList');
    if (!list) return;
    list.innerHTML = '';
    if (state.notices.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:#94a3b8; font-size:13px; padding:12px;">কোনো নোটিশ নেই</div>';
        return;
    }
    state.notices.forEach((n, idx) => {
        list.innerHTML += `
            <div class="notice-item-admin ${n.type}" style="margin-bottom:8px;">
                <span style="flex:1; word-break:break-word;">${n.text}</span>
                <button class="btn clay-btn clay-btn-danger" style="padding: 4px 10px; font-size: 11px; flex-shrink:0;" onclick="deleteNotice(${idx}); renderNoticeModalList();">ডিলিট</button>
            </div>
        `;
    });
}

// ---------- Admin Auth & Password Modal ----------
function handleAdminToggle() {
    if (state.isAdmin) {
        showAdminPage();
    } else {
        openAdminModal();
    }
}

function openAdminModal() {
    const modal = $('adminModal');
    if (!modal) return;
    showChangePassView(false);
    $('adminPassword').value = '';
    modal.style.display = 'flex';
}

function closeAdminModal() {
    const modal = $('adminModal');
    if (modal) modal.style.display = 'none';
}

function togglePasswordVisibility(inputId, iconId) {
    const input = $(inputId);
    const icon = $(iconId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.style.fill = '#2563eb';
    } else {
        input.type = 'password';
        if (icon) icon.style.fill = 'currentColor';
    }
}

function verifyAdmin() {
    const pass = textVal('adminPassword');
    const correctPass = state.adminPassword || DEFAULT_ADMIN_PASSWORD;

    if (pass === correctPass || pass === "@12azmain" || pass === "isotope@12azmain") {
        state.isAdmin = true;
        closeAdminModal();
        updateAdminUIState();
        showAdminPage();
        showToast("এডমিন এক্সেস সফলভাবে আনলক করা হয়েছে!", "success");
    } else {
        showToast("ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।", "error");
    }
}

function turnOffAdmin() {
    state.isAdmin = false;
    updateAdminUIState();
    hideAdminPage();
    showToast("এডমিন মোড অফ করা হয়েছে।", "info");
}

function updateAdminUIState() {
    const adminBtnText = $('adminBtnText');
    if (adminBtnText) {
        adminBtnText.innerText = state.isAdmin ? "এডমিন প্যানেল" : "এডমিন কন্ট্রোল";
    }
    const txnAdminNavBtnText = $('txnAdminNavBtnText');
    if (txnAdminNavBtnText) {
        txnAdminNavBtnText.innerText = state.isAdmin ? "এডমিন প্যানেল" : "এডমিন কন্ট্রোল";
    }
    renderTransactions();
}

function showChangePassView(isChanging) {
    const unlockView = $('adminUnlockView');
    const changePassView = $('adminChangePassView');
    const modalTitle = $('adminModalTitle');

    if (isChanging) {
        if (unlockView) unlockView.style.display = 'none';
        if (changePassView) changePassView.style.display = 'block';
        if (modalTitle) modalTitle.innerText = "এডমিন পাসওয়ার্ড পরিবর্তন";
        if ($('currAdminPass')) $('currAdminPass').value = '';
        if ($('newAdminPass')) $('newAdminPass').value = '';
    } else {
        if (unlockView) unlockView.style.display = 'block';
        if (changePassView) changePassView.style.display = 'none';
        if (modalTitle) modalTitle.innerText = "এডমিন সিকিউরিটি এক্সেস";
    }
}

function submitPasswordChange() {
    const currPass = textVal('currAdminPass');
    const newPass = textVal('newAdminPass');
    const correctPass = state.adminPassword || DEFAULT_ADMIN_PASSWORD;

    if (currPass !== correctPass && currPass !== "@12azmain" && currPass !== "isotope@12azmain") {
        showToast("বর্তমান পাসওয়ার্ডটি সঠিক নয়!", "error");
        return;
    }

    if (!newPass || newPass.length < 4) {
        showToast("নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে!", "error");
        return;
    }

    state.adminPassword = newPass;
    saveData();
    showChangePassView(false);
    closeAdminModal();
    showToast("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!", "success");
}

// ---------- INITIALIZATION ----------
function initApp() {
    const localData = localStorage.getItem('isotope_mess_data_v2');
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            if (parsed && typeof parsed === 'object') {
                if (parsed.months) state.months = parsed.months;
                if (parsed.adminPassword) state.adminPassword = parsed.adminPassword;
                if (parsed.customAdjLabel) state.customAdjLabel = parsed.customAdjLabel;
                if (parsed.activeMonth) state.activeMonth = parsed.activeMonth;

                // Sync active month
                if (state.months && state.months[state.activeMonth]) {
                    const mData = state.months[state.activeMonth];
                    state.fixedCosts = { ...mData.fixedCosts };
                    state.members = mData.members.map(m => ({ ...m }));
                    state.notices = mData.notices.map(n => ({ ...n }));
                    state.transactions = mData.transactions.map(t => ({ ...t }));
                }
            }
        } catch (e) {
            console.error("Local storage load error:", e);
        }
    }

    updateMonthDisplayUI();
    calculateAll();

    if (window.firebaseDb) {
        loadFromFirestore();
    }
}

window.addEventListener('firebase-ready', () => {
    loadFromFirestore();
});

window.addEventListener('DOMContentLoaded', () => {
    initApp();
});