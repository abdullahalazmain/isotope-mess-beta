// ============================================================
//  ISOTOPE MESS DASHBOARD — app.js
//  Complete, Robust, Responsive & Multi-Month Mess Management
//  Advanced Data Architecture v3.0 (Dynamic Member Lifecycle & Fast Sync)
// ============================================================

// ---------- Constants ----------
const FIREBASE_FIRESTORE_URL = "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
const FIRESTORE_SCHEMA_VERSION = "3.1";
const DEFAULT_ADMIN_PASSWORD = "@12azmain";
const LEGACY_ADMIN_PASSWORDS = ["@12azmain", "isotope@123"];
const DEFAULT_CUSTOM_ADJ_LABEL = "অন্যান্য";
const CURRENT_YEAR = 2026;
const DEFAULT_ACTIVE_MONTH_KEY = "2026-06";
const DEFAULT_MESS_ID = "ISO-MESS-2026-06";
const MESS_ID = DEFAULT_MESS_ID;

function generateIsotopeId(prefix = "GEN") {
    const stamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `ISO-${String(prefix).toUpperCase()}-${stamp}-${randomPart}`;
}

function getDataNamespace() {
    return window.IS_DEV_MODE ? "dev" : "prod";
}

function getDataPath(...segments) {
    const explicitEnv = segments.length && ['dev', 'prod'].includes(String(segments[0])) ? segments.shift() : getDataNamespace();
    return ['data', explicitEnv, ...segments].filter(Boolean);
}

function isValidAdminPassword(candidate, allowLegacy = true) {
    const clean = String(candidate || '').trim();
    if (!clean) return false;
    if (state && state.adminPassword && clean === state.adminPassword) return true;
    if (clean === DEFAULT_ADMIN_PASSWORD) return true;
    if (allowLegacy && LEGACY_ADMIN_PASSWORDS.includes(clean)) return true;
    return false;
}

// Forward declare state variable to avoid Temporal Dead Zone in helper functions
var state = null;

const BENGALI_MONTH_NAMES = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল",
    "মে", "জুন", "জুলাই", "আগস্ট",
    "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

// Fresh-start baseline: completely empty. No demo members, no sample notices,
// and no default transactions. Admin fills everything from zero.
const EMPTY_FIXED_COSTS = {
    electricity: 0,
    gas: 0,
    waterBottleCount: 0,
    waterBottlePrice: 0,
    waterBill: 0,
    wifi: 0,
    khala: 0,
    waste: 0,
    other: 0
};

const INITIAL_MASTER_MEMBERS = [];
const EMPTY_MEMBERS = [];
const EMPTY_NOTICES = [];
const EMPTY_TRANSACTIONS = [];

function createBlankMessRecord(overrides = {}) {
    const now = new Date().toISOString();
    const messName = overrides.name || "Isotope Mess";
    const baseId = overrides.messId || generateIsotopeId("MESS");
    return {
        messId: baseId,
        name: messName,
        slug: String(messName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || "isotope-mess",
        address: "",
        city: "",
        country: "Bangladesh",
        password: "",
        adminUserId: "",
        status: "empty",
        isPublic: false,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        environment: getDataNamespace(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        ...overrides
    };
}

function createBlankMessSettings(overrides = {}) {
    const now = new Date().toISOString();
    return {
        messId: overrides.messId || DEFAULT_MESS_ID,
        currency: "BDT",
        locale: "bn",
        adminPassword: DEFAULT_ADMIN_PASSWORD,
        customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
        activeMonth: DEFAULT_ACTIVE_MONTH_KEY,
        defaultRent: 0,
        defaultMealRate: 0,
        timezone: "Asia/Dhaka",
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        environment: getDataNamespace(),
        createdAt: now,
        updatedAt: now,
        ...overrides
    };
}

// ---------- Dynamic Member ID Generator ----------
function generateMemberId(joinMonth, serialNumber) {
    const ym = (joinMonth || "2026-01").replace(/[^0-9]/g, '');
    const num = String(serialNumber || 1).padStart(3, '0');
    return `ISO-${ym}-${num}`;
}

// Check if a member was active in a given month
function isMemberActiveInMonth(member, monthKey) {
    const jm = member.joinMonth || "2026-01";
    if (jm > monthKey) return false;
    if (member.leaveMonth && member.leaveMonth < monthKey) return false;
    return true;
}

function getActiveMembersForMonth(monthKey) {
    const master = (typeof state !== 'undefined' && state && state.masterMembers) ? state.masterMembers : INITIAL_MASTER_MEMBERS;
    return master.filter(m => isMemberActiveInMonth(m, monthKey));
}

// Generate clean default month template (all values zero)
function createEmptyMonthData(monthKey = DEFAULT_ACTIVE_MONTH_KEY) {
    const activeMasterList = getActiveMembersForMonth(monthKey);
    return {
        monthKey,
        fixedCosts: {
            electricity: 0,
            gas: 0,
            waterBottleCount: 0,
            waterBottlePrice: 0,
            waterBill: 0,
            wifi: 0,
            khala: 0,
            waste: 0,
            other: 0
        },
        members: activeMasterList.map(m => ({
            id: m.id,
            name: m.name,
            meals: 0,
            bazarDeposit: 0,
            rent: m.defaultRent || 0,
            prevAdj: 0,
            fridgeAdj: 0
        })),
        notices: [],
        transactions: [],
        meals: [],
        marketPlans: [],
        summary: {
            totalMeals: 0,
            totalBazar: 0,
            totalRent: 0,
            totalExpense: 0
        },
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// Initial multi-month dictionary for a given year.
// Start empty and let the admin assign values month-by-month.
function createInitialMonthsData(year = CURRENT_YEAR) {
    const months = {};
    for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`;
        months[key] = createEmptyMonthData(key);
    }
    return months;
}

function createBlankMessState(overrides = {}) {
    const activeMonth = overrides.activeMonth || DEFAULT_ACTIVE_MONTH_KEY;
    const emptyMonth = createEmptyMonthData(activeMonth);
    return {
        isAdmin: false,
        adminPassword: DEFAULT_ADMIN_PASSWORD,
        customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
        activeMonth,
        masterMembers: [],
        months: createInitialMonthsData(CURRENT_YEAR),
        fixedCosts: { ...emptyMonth.fixedCosts },
        members: emptyMonth.members.map(m => ({ ...m })),
        notices: [],
        transactions: [],
        meals: [],
        marketPlans: [],
        mess: {
            messId: overrides.messId || DEFAULT_MESS_ID,
            name: overrides.name || "Isotope Mess",
            slug: String(overrides.name || "Isotope Mess").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || "isotope-mess",
            status: "empty",
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            address: "",
            city: "",
            country: "Bangladesh",
            password: "",
            adminUserId: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            environment: getDataNamespace()
        },
        ...overrides
    };
}

function getCurrentResetYear() {
    const activeYear = Number((state && state.activeMonth ? state.activeMonth : `${CURRENT_YEAR}-01`).split('-')[0]);
    return Number.isFinite(activeYear) ? activeYear : CURRENT_YEAR;
}

// ---------- State ----------
const emptyStartMonth = createEmptyMonthData(DEFAULT_ACTIVE_MONTH_KEY);
state = {
    isAdmin: false,
    adminPassword: DEFAULT_ADMIN_PASSWORD,
    customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
    activeMonth: DEFAULT_ACTIVE_MONTH_KEY,
    masterMembers: [],
    months: createInitialMonthsData(CURRENT_YEAR),
    // Active month view mirrors:
    fixedCosts: { ...emptyStartMonth.fixedCosts },
    members: emptyStartMonth.members.map(m => ({ ...m })),
    notices: [],
    transactions: []
};

let confirmCallback = null;
let firestoreModuleCache = null;

async function deleteFirestoreCollectionTree(pathSegments, deletedPaths = []) {
    const { collection, getDocs, deleteDoc } = await getFirestoreModule();
    const collRef = collection(window.firebaseDb, ...pathSegments);
    const snap = await getDocs(collRef);

    for (const docSnap of snap.docs) {
        deletedPaths.push(docSnap.ref.path);

        try {
            const nestedCollections = await docSnap.ref.listCollections();
            for (const nestedCollection of nestedCollections) {
                await deleteFirestoreCollectionTree(nestedCollection.path.split('/'), deletedPaths);
            }
        } catch (nestedErr) {
            // Ignore nested collection lookup issues.
        }

        await deleteDoc(docSnap.ref);
    }

    return deletedPaths;
}

async function resetFirestoreDatabase({ env = null } = {}) {
    if (!window.firebaseDb) {
        await ensureFirebaseReady({ force: true });
    }

    if (!window.firebaseDb) {
        console.warn("Firebase database not connected. Nothing to clear.");
        return { cleared: false, reason: "missing-db" };
    }

    const deletedPaths = [];
    const targetEnv = env || getDataNamespace();
    const rootCollections = [
        "app",
        "messes",
        "settings",
        "members",
        "months",
        "notices",
        "transactions",
        "profiles",
        "accounts",
        "auditLogs"
    ];

    for (const collectionName of rootCollections) {
        try {
            await deleteFirestoreCollectionTree(['data', targetEnv, collectionName], deletedPaths);
        } catch (err) {
            // Ignore if collection does not exist.
        }
    }

    try {
        const { doc, deleteDoc } = await getFirestoreModule();
        await deleteDoc(doc(window.firebaseDb, 'data', targetEnv));
        deletedPaths.push(`data/${targetEnv}`);
    } catch (err) {
        // Ignore if root namespace doc does not exist.
    }

    return { cleared: true, deletedPaths, environment: targetEnv };
}

async function bootstrapEmptyFirestoreTree({ env = null, messName = "Isotope Mess", messId = DEFAULT_MESS_ID } = {}) {
    const targetEnv = env || getDataNamespace();

    if (!window.firebaseDb) {
        await ensureFirebaseReady({ force: true });
    }

    if (!window.firebaseDb) {
        console.warn("Firebase database not connected. Cannot bootstrap empty tree.");
        return { bootstrapped: false, reason: "missing-db", environment: targetEnv, messId };
    }

    const { doc, setDoc, getDoc } = await getFirestoreModule();
    const now = new Date().toISOString();
    const root = getDataPath(targetEnv);
    const targetMessId = messId || DEFAULT_MESS_ID;

    const namespaceDocRef = doc(window.firebaseDb, 'data', targetEnv);
    const namespaceDocSnap = await getDoc(namespaceDocRef);
    if (!namespaceDocSnap.exists()) {
        await setDoc(namespaceDocRef, {
            environment: targetEnv,
            type: 'namespace',
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            updatedAt: now
        }, { merge: true });
    }

    const messRecord = createBlankMessRecord({
        messId: targetMessId,
        name: messName,
        status: "empty",
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        createdAt: now,
        updatedAt: now
    });

    await setDoc(doc(window.firebaseDb, ...root, "app", "meta"), {
        appId: "ISO-APP-ROOT",
        name: "Isotope",
        defaultLocale: "bn",
        defaultCurrency: "BDT",
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        environment: targetEnv,
        status: "active",
        createdAt: now,
        updatedAt: now
    }, { merge: true });

    await setDoc(doc(window.firebaseDb, ...root, "messes", targetMessId), messRecord, { merge: true });

    await setDoc(doc(window.firebaseDb, ...root, "messes", targetMessId, "settings", "primary"), createBlankMessSettings({
        messId: targetMessId,
        adminPassword: DEFAULT_ADMIN_PASSWORD,
        customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
        activeMonth: DEFAULT_ACTIVE_MONTH_KEY,
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        createdAt: now,
        updatedAt: now
    }), { merge: true });

    await setDoc(doc(window.firebaseDb, ...root, "messes", targetMessId, "members", "registry"), {
        messId: targetMessId,
        totalMembers: 0,
        list: [],
        status: "empty",
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    const monthIndex = [];
    for (let m = 1; m <= 12; m++) {
        monthIndex.push(`${CURRENT_YEAR}-${String(m).padStart(2, '0')}`);
    }

    await setDoc(doc(window.firebaseDb, ...root, "messes", targetMessId, "months", "index"), {
        messId: targetMessId,
        totalMonths: monthIndex.length,
        monthKeys: monthIndex,
        status: "empty",
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    await setDoc(doc(window.firebaseDb, ...root, "messes", targetMessId, "notices", "index"), {
        messId: targetMessId,
        totalNotices: 0,
        status: "empty",
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    await setDoc(doc(window.firebaseDb, ...root, "messes", targetMessId, "transactions", "index"), {
        messId: targetMessId,
        totalTransactions: 0,
        status: "empty",
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    await setDoc(doc(window.firebaseDb, ...root, "messes", targetMessId, "extensions", "core"), {
        bankingEnabled: false,
        selfTrackerEnabled: false,
        exportsEnabled: true,
        features: [],
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    return { bootstrapped: true, schemaVersion: FIRESTORE_SCHEMA_VERSION, environment: targetEnv, messId: targetMessId };
}

async function initializeFreshLiveMess({ env = null, messName = "Isotope Mess" } = {}) {
    const targetEnv = env || getDataNamespace();
    const targetMessId = generateIsotopeId("MESS");
    const now = new Date().toISOString();
    const basePath = getDataPath(targetEnv);

    if (!window.firebaseDb) {
        throw new Error("Firebase database not connected.");
    }

    const { doc, setDoc, getDoc } = await getFirestoreModule();
    const namespaceDocRef = doc(window.firebaseDb, 'data', targetEnv);
    const namespaceDocSnap = await getDoc(namespaceDocRef);
    if (!namespaceDocSnap.exists()) {
        await setDoc(namespaceDocRef, {
            environment: targetEnv,
            type: 'namespace',
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            updatedAt: now
        }, { merge: true });
    }

    const messRecord = createBlankMessRecord({
        messId: targetMessId,
        name: messName,
        status: "active",
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        createdAt: now,
        updatedAt: now
    });

    await setDoc(doc(window.firebaseDb, ...basePath, "app", "meta"), {
        appId: "ISO-APP-ROOT",
        name: "Isotope",
        defaultLocale: "bn",
        defaultCurrency: "BDT",
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        environment: targetEnv,
        status: "active",
        createdAt: now,
        updatedAt: now
    }, { merge: true });

    await setDoc(doc(window.firebaseDb, ...basePath, "messes", targetMessId), messRecord, { merge: true });
    await setDoc(doc(window.firebaseDb, ...basePath, "messes", targetMessId, "settings", "primary"), createBlankMessSettings({
        messId: targetMessId,
        adminPassword: DEFAULT_ADMIN_PASSWORD,
        customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
        activeMonth: DEFAULT_ACTIVE_MONTH_KEY,
        environment: targetEnv,
        createdAt: now,
        updatedAt: now
    }), { merge: true });

    await setDoc(doc(window.firebaseDb, ...basePath, "messes", targetMessId, "members", "registry"), {
        messId: targetMessId,
        totalMembers: 0,
        list: [],
        status: "empty",
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    return {
        messId: targetMessId,
        env: targetEnv,
        activeMonth: DEFAULT_ACTIVE_MONTH_KEY,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        status: "ready"
    };
}

async function resetFirebaseToFreshMess({ env = null, messName = "Isotope Mess", forceInit = true } = {}) {
    const targetEnv = env || getDataNamespace();

    await ensureFirebaseReady({ force: forceInit });
    const clearResult = await resetFirestoreDatabase({ env: targetEnv });
    const result = await bootstrapEmptyFirestoreTree({ env: targetEnv, messName });
    resetLocalAppStateToEmpty();

    console.info('Firebase reset + init complete:', { clearResult, result, environment: targetEnv });
    return { ...result, cleared: clearResult.cleared, deletedPaths: clearResult.deletedPaths, environment: targetEnv };
}

async function resetFirebaseToFreshMessSafe({ env = null, messName = "Isotope Mess", forceInit = true } = {}) {
    const targetEnv = env || getDataNamespace();

    if (!window.firebaseDb) {
        await ensureFirebaseReady({ force: forceInit });
    }

    if (!window.firebaseDb) {
        throw new Error('Firebase database not connected.');
    }

    const { doc, setDoc, getDoc, collection, getDocs } = await getFirestoreModule();
    const now = new Date().toISOString();
    const envDocRef = doc(window.firebaseDb, 'data', targetEnv);
    const envDocSnap = await getDoc(envDocRef);

    if (!envDocSnap.exists()) {
        await setDoc(envDocRef, {
            environment: targetEnv,
            type: 'namespace',
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            createdAt: now,
            updatedAt: now
        }, { merge: true });
    }

    const appRef = doc(window.firebaseDb, 'data', targetEnv, 'app', 'meta');
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists()) {
        await setDoc(appRef, {
            appId: 'ISO-APP-ROOT',
            name: 'Isotope',
            defaultLocale: 'bn',
            defaultCurrency: 'BDT',
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            environment: targetEnv,
            status: 'active',
            createdAt: now,
            updatedAt: now
        }, { merge: true });
    }

    const messId = DEFAULT_MESS_ID;
    const messRef = doc(window.firebaseDb, 'data', targetEnv, 'messes', messId);
    const messSnap = await getDoc(messRef);
    if (!messSnap.exists()) {
        await setDoc(messRef, createBlankMessRecord({
            messId,
            name: messName,
            status: 'empty',
            environment: targetEnv,
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            createdAt: now,
            updatedAt: now
        }), { merge: true });
    }

    await setDoc(doc(window.firebaseDb, 'data', targetEnv, 'messes', messId, 'settings', 'primary'), createBlankMessSettings({
        messId,
        adminPassword: DEFAULT_ADMIN_PASSWORD,
        customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
        activeMonth: DEFAULT_ACTIVE_MONTH_KEY,
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        createdAt: now,
        updatedAt: now
    }), { merge: true });

    await setDoc(doc(window.firebaseDb, 'data', targetEnv, 'messes', messId, 'members', 'registry'), {
        messId,
        totalMembers: 0,
        list: [],
        status: 'empty',
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    await setDoc(doc(window.firebaseDb, 'data', targetEnv, 'messes', messId, 'months', 'index'), {
        messId,
        totalMonths: 12,
        monthKeys: Array.from({ length: 12 }, (_, i) => `${CURRENT_YEAR}-${String(i + 1).padStart(2, '0')}`),
        status: 'empty',
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    await setDoc(doc(window.firebaseDb, 'data', targetEnv, 'messes', messId, 'notices', 'index'), {
        messId,
        totalNotices: 0,
        status: 'empty',
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    await setDoc(doc(window.firebaseDb, 'data', targetEnv, 'messes', messId, 'transactions', 'index'), {
        messId,
        totalTransactions: 0,
        status: 'empty',
        environment: targetEnv,
        schemaVersion: FIRESTORE_SCHEMA_VERSION,
        updatedAt: now
    }, { merge: true });

    resetLocalAppStateToEmpty();

    const dataRootSnap = await getDocs(collection(window.firebaseDb, 'data'));
    const envRootSnap = await getDocs(collection(window.firebaseDb, 'data', targetEnv));
    const appRootSnap = await getDocs(collection(window.firebaseDb, 'data', targetEnv, 'app'));
    const messRootSnap = await getDocs(collection(window.firebaseDb, 'data', targetEnv, 'messes'));

    const result = {
        success: true,
        env: targetEnv,
        namespaceDocExists: envDocSnap.exists(),
        appDocs: appRootSnap.docs.map(d => d.id),
        messDocs: messRootSnap.docs.map(d => d.id),
        dataRootDocs: dataRootSnap.docs.map(d => d.id),
        envRootDocs: envRootSnap.docs.map(d => d.id),
        messId,
        schemaVersion: FIRESTORE_SCHEMA_VERSION
    };

    console.info('Safe Firebase reset complete:', result);
    return result;
}

window.resetFirebaseData = resetFirebaseToFreshMess;
window.resetFirebaseFromConsole = resetFirebaseToFreshMess;
window.resetFirebaseSafely = resetFirebaseToFreshMessSafe;
window.resetFirebaseToFreshMessSafe = resetFirebaseToFreshMessSafe;
window.ensureFirebaseReady = ensureFirebaseReady;
window.initializeFirebaseForAdminTools = ensureFirebaseReady;

function resetLocalAppStateToEmpty() {
    const emptyMonth = createEmptyMonthData(DEFAULT_ACTIVE_MONTH_KEY);
    state.masterMembers = [];
    state.months = createInitialMonthsData(CURRENT_YEAR);
    state.activeMonth = DEFAULT_ACTIVE_MONTH_KEY;
    state.customAdjLabel = DEFAULT_CUSTOM_ADJ_LABEL;
    state.adminPassword = DEFAULT_ADMIN_PASSWORD;
    state.fixedCosts = { ...emptyMonth.fixedCosts };
    state.members = emptyMonth.members.map(m => ({ ...m }));
    state.notices = [];
    state.transactions = [];
    state.meals = [];
    state.marketPlans = [];
    state.mess = createBlankMessRecord({
        messId: DEFAULT_MESS_ID,
        name: "Isotope Mess",
        status: "empty",
        environment: getDataNamespace(),
        schemaVersion: FIRESTORE_SCHEMA_VERSION
    });
    localStorage.setItem('isotope_mess_data_v3', JSON.stringify({
        masterMembers: [],
        months: state.months,
        activeMonth: DEFAULT_ACTIVE_MONTH_KEY,
        adminPassword: DEFAULT_ADMIN_PASSWORD,
        customAdjLabel: DEFAULT_CUSTOM_ADJ_LABEL,
        mess: state.mess,
        version: "3.1"
    }));
    return true;
}

window.resetFirestoreDatabase = resetFirestoreDatabase;
window.bootstrapEmptyFirestoreTree = bootstrapEmptyFirestoreTree;
window.initializeFreshLiveMess = initializeFreshLiveMess;
window.resetFirebaseToFreshMess = resetFirebaseToFreshMess;
window.resetLocalAppStateToEmpty = resetLocalAppStateToEmpty;

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

function closeConfirmModal(agreed = false) {
    $('confirmModal').style.display = 'none';
    if (agreed && typeof confirmCallback === 'function') {
        confirmCallback();
    }
    confirmCallback = null;
}

const confirmCancelBtn = $('confirmCancelBtn');
if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => closeConfirmModal(false));
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

async function ensureFirebaseReady({ force = false } = {}) {
    if (window.firebaseDb && !force) {
        return window.firebaseDb;
    }

    if (window.firebaseInitPromise) {
        return window.firebaseInitPromise;
    }

    const firebaseConfig = {
        apiKey: "AIzaSyAckBpcMbXPoWnOQmvtXY10ofknwRJTz2A",
        authDomain: "isotope-beta.firebaseapp.com",
        projectId: "isotope-beta",
        storageBucket: "isotope-beta.firebasestorage.app",
        messagingSenderId: "419427665548",
        appId: "1:419427665548:web:624b67b1db48698c121da9",
        measurementId: "G-TS9R91ZKK1"
    };

    window.firebaseInitPromise = (async () => {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js");

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        window.firebaseApp = app;
        window.firebaseDb = db;
        window.dispatchEvent(new CustomEvent('firebase-ready'));

        if (typeof window.loadFromFirestore === 'function') {
            try {
                await window.loadFromFirestore();
            } catch (err) {
                console.warn('Firebase auto-load after init warning:', err);
            }
        }

        return db;
    })().catch((err) => {
        console.error('Firebase init failed:', err);
        delete window.firebaseInitPromise;
        throw err;
    });

    return window.firebaseInitPromise;
}

function persistLocally() {
    // Keep active month updated inside state.months
    if (state.months && state.activeMonth) {
        state.months[state.activeMonth] = {
            fixedCosts: { ...state.fixedCosts },
            customAdjLabel: state.customAdjLabel,
            members: state.members.map(m => ({ ...m })),
            notices: state.notices.map(n => ({ ...n })),
            transactions: state.transactions.map(t => ({ ...t }))
        };
    }
    localStorage.setItem('isotope_mess_data_v3', JSON.stringify({
        masterMembers: state.masterMembers,
        months: state.months,
        activeMonth: state.activeMonth,
        adminPassword: state.adminPassword,
        customAdjLabel: state.customAdjLabel,
        version: "3.0"
    }));
}

async function saveData() {
    calculateAll();
    persistLocally();

    if (!window.firebaseDb) return;

    try {
        const { doc, setDoc } = await getFirestoreModule();
        const mKey = state.activeMonth;
        const basePath = getDataPath();
        const messRef = doc(window.firebaseDb, ...basePath, "messes", MESS_ID);
        const settingsRef = doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "settings", "primary");
        const registryRef = doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "members", "registry");
        const monthRef = doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey);
        const fixedRef = doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey, "meta", "fixedCosts");
        const now = new Date().toISOString();

        await setDoc(messRef, {
            messId: MESS_ID,
            name: "Isotope Mess",
            status: "active",
            hasSeedData: state.masterMembers.length > 0 || state.members.length > 0,
            environment: getDataNamespace(),
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            updatedAt: now
        }, { merge: true });

        await setDoc(settingsRef, {
            currency: "BDT",
            locale: "bn",
            adminPassword: state.adminPassword || DEFAULT_ADMIN_PASSWORD,
            activeMonth: state.activeMonth,
            customAdjLabel: state.customAdjLabel || DEFAULT_CUSTOM_ADJ_LABEL,
            messId: MESS_ID,
            version: "3.0",
            environment: getDataNamespace(),
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            updatedAt: now
        }, { merge: true });

        await setDoc(registryRef, {
            list: state.masterMembers,
            totalMembers: state.masterMembers.length,
            environment: getDataNamespace(),
            updatedAt: now
        }, { merge: true });

        await setDoc(monthRef, {
            monthKey: mKey,
            fixedCosts: { ...state.fixedCosts },
            customAdjLabel: state.customAdjLabel || DEFAULT_CUSTOM_ADJ_LABEL,
            members: state.members,
            notices: state.notices,
            transactions: state.transactions,
            environment: getDataNamespace(),
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            updatedAt: now
        }, { merge: true });

        await setDoc(fixedRef, {
            ...state.fixedCosts,
            customAdjLabel: state.customAdjLabel || "অন্যান্য",
            environment: getDataNamespace(),
            schemaVersion: FIRESTORE_SCHEMA_VERSION,
            updatedAt: now
        }, { merge: true });

        for (let member of state.members) {
            const docId = (member.id || member.name || "member").replace(/\s+/g, '_');
            await setDoc(doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey, "members", docId), {
                ...member,
                environment: getDataNamespace(),
                schemaVersion: FIRESTORE_SCHEMA_VERSION,
                updatedAt: now
            }, { merge: true });
        }

        for (let notice of state.notices) {
            await setDoc(doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey, "notices", String(notice.id)), {
                ...notice,
                environment: getDataNamespace(),
                schemaVersion: FIRESTORE_SCHEMA_VERSION,
                updatedAt: now
            }, { merge: true });
        }

        for (let txn of state.transactions) {
            await setDoc(doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey, "transactions", String(txn.id)), {
                ...txn,
                environment: getDataNamespace(),
                schemaVersion: FIRESTORE_SCHEMA_VERSION,
                updatedAt: now
            }, { merge: true });
        }
    } catch (e) {
        console.error("Firebase save error:", e);
    }
}

async function loadFromFirestore() {
    if (!window.firebaseDb) return;
    try {
        const { doc, getDoc } = await getFirestoreModule();
        const basePath = getDataPath();

        try {
            const configSnap = await getDoc(doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "settings", "primary"));
            if (configSnap && configSnap.exists()) {
                const configData = configSnap.data();
                if (configData.adminPassword) state.adminPassword = configData.adminPassword;
                if (configData.activeMonth) state.activeMonth = configData.activeMonth;
                if (configData.customAdjLabel) state.customAdjLabel = configData.customAdjLabel;
            }
        } catch (err) {
            console.warn("Firebase mess config load warning:", err);
        }

        try {
            const registrySnap = await getDoc(doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "members", "registry"));
            if (registrySnap && registrySnap.exists() && Array.isArray(registrySnap.data().list)) {
                state.masterMembers = registrySnap.data().list;
            }
        } catch (err) {
            console.warn("Firebase members registry load warning:", err);
        }

        for (let month = 1; month <= 12; month++) {
            const monthKey = `${CURRENT_YEAR}-${String(month).padStart(2, '0')}`;
            await loadMonthDataFromFirestore(monthKey);
        }
        await loadMonthDataFromFirestore(state.activeMonth);
        recalculateAllPreviousMonthBalances();

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
        const basePath = getDataPath();

        try {
            const monthSnap = await getDoc(doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey));
            if (monthSnap && monthSnap.exists()) {
                const mDocData = monthSnap.data();
                if (mDocData.fixedCosts) state.fixedCosts = { ...mDocData.fixedCosts };
                if (mDocData.customAdjLabel) state.customAdjLabel = mDocData.customAdjLabel;
                if (Array.isArray(mDocData.members)) state.members = mDocData.members;
                if (Array.isArray(mDocData.notices)) state.notices = mDocData.notices;
                if (Array.isArray(mDocData.transactions)) state.transactions = mDocData.transactions;

                if (!state.months) state.months = {};
                state.months[mKey] = {
                    fixedCosts: { ...state.fixedCosts },
                    customAdjLabel: state.customAdjLabel,
                    members: state.members.map(m => ({ ...m })),
                    notices: state.notices.map(n => ({ ...n })),
                    transactions: state.transactions.map(t => ({ ...t }))
                };
                return;
            }
        } catch (err) {
            console.warn(`Mess month doc read for ${mKey}:`, err);
        }

        let fixedLoaded = false;
        try {
            const fixedSnap = await getDoc(doc(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey, "meta", "fixedCosts"));
            if (fixedSnap && fixedSnap.exists()) {
                const fData = fixedSnap.data();
                state.fixedCosts = { ...fData };
                if (fData.customAdjLabel) state.customAdjLabel = fData.customAdjLabel;
                fixedLoaded = true;
            }
        } catch (err) {
            console.warn(`Firebase mess fixedCosts load warning (${mKey}):`, err);
        }

        if (!fixedLoaded) {
            if (state.months && state.months[mKey] && state.months[mKey].fixedCosts) {
                state.fixedCosts = { ...state.months[mKey].fixedCosts };
                state.customAdjLabel = state.months[mKey].customAdjLabel || DEFAULT_CUSTOM_ADJ_LABEL;
            } else {
                state.fixedCosts = { ...createEmptyMonthData(mKey).fixedCosts };
                state.customAdjLabel = DEFAULT_CUSTOM_ADJ_LABEL;
            }
        }

        let membersLoaded = false;
        try {
            const memSnap = await getDocs(collection(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey, "members"));
            if (memSnap && !memSnap.empty) {
                const membersList = [];
                memSnap.forEach(d => membersList.push(d.data()));
                if (membersList.length > 0) {
                    state.members = membersList;
                    ensureMemberOrder();
                    membersLoaded = true;
                }
            }
        } catch (err) {
            console.warn(`Firebase mess members load warning (${mKey}):`, err);
        }

        if (!membersLoaded) {
            if (state.months && state.months[mKey] && state.months[mKey].members && state.months[mKey].members.length > 0) {
                state.members = state.months[mKey].members.map(m => ({ ...m }));
            } else {
                state.members = createEmptyMonthData(mKey).members;
            }
            if (mKey !== "2026-01") {
                state.members.forEach(m => {
                    m.prevAdj = calculatePrevMonthBalanceForMember(mKey, m.name);
                });
            }
        }

        let noticesLoaded = false;
        try {
            const notSnap = await getDocs(collection(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey, "notices"));
            if (notSnap && !notSnap.empty) {
                const noticesList = [];
                notSnap.forEach(d => noticesList.push(d.data()));
                if (noticesList.length > 0) {
                    state.notices = noticesList;
                    noticesLoaded = true;
                }
            }
        } catch (err) {
            console.warn(`Firebase mess notices load warning (${mKey}):`, err);
        }

        if (!noticesLoaded) {
            state.notices = (state.months && state.months[mKey] && state.months[mKey].notices)
                ? state.months[mKey].notices.map(n => ({ ...n }))
                : [];
        }

        let txnsLoaded = false;
        try {
            const txnSnap = await getDocs(collection(window.firebaseDb, ...basePath, "messes", MESS_ID, "months", mKey, "transactions"));
            if (txnSnap && !txnSnap.empty) {
                const txnsList = [];
                txnSnap.forEach(d => txnsList.push(d.data()));
                if (txnsList.length > 0) {
                    txnsList.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
                    state.transactions = txnsList;
                    txnsLoaded = true;
                }
            }
        } catch (err) {
            console.warn(`Firebase mess transactions load warning (${mKey}):`, err);
        }

        if (!txnsLoaded) {
            state.transactions = (state.months && state.months[mKey] && state.months[mKey].transactions)
                ? state.months[mKey].transactions.map(t => ({ ...t }))
                : [];
        }

        if (!state.months) state.months = {};
        state.months[mKey] = {
            fixedCosts: { ...state.fixedCosts },
            customAdjLabel: state.customAdjLabel,
            members: state.members.map(m => ({ ...m })),
            notices: state.notices.map(n => ({ ...n })),
            transactions: state.transactions.map(t => ({ ...t }))
        };
    } catch (e) {
        console.error(`Firebase month load error for ${mKey}:`, e);
    }
}

window.loadFromFirestore = loadFromFirestore;
window.saveData = saveData;

// ---------- Member Management System (Add / Remove / Reactivate) ----------
function openMemberManagerModal() {
    const modal = $('memberManagerModal');
    if (!modal) return;
    showMemberTab('list');
    const joinSelect = $('newMemberJoinMonth');
    if (joinSelect) {
        joinSelect.value = state.activeMonth;
    }
    renderMemberManagerList();
    modal.style.display = 'flex';
}

function closeMemberManagerModal() {
    const modal = $('memberManagerModal');
    if (modal) modal.style.display = 'none';
}

function showMemberTab(tabName) {
    const listTab = $('memberTabList');
    const addTab = $('memberTabAdd');
    const btnList = $('tabBtnMemberList');
    const btnAdd = $('tabBtnMemberAdd');

    if (tabName === 'list') {
        if (listTab) listTab.style.display = 'block';
        if (addTab) addTab.style.display = 'none';
        if (btnList) btnList.classList.add('active-tab');
        if (btnAdd) btnAdd.classList.remove('active-tab');
        renderMemberManagerList();
    } else {
        if (listTab) listTab.style.display = 'none';
        if (addTab) addTab.style.display = 'block';
        if (btnList) btnList.classList.remove('active-tab');
        if (btnAdd) btnAdd.classList.add('active-tab');
    }
}

function renderMemberManagerList() {
    const container = $('memberManagerListContainer');
    if (!container) return;

    if (!state.masterMembers || state.masterMembers.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">কোনো সদস্যের রেকর্ড পাওয়া যায়নি</div>';
        return;
    }

    let html = `
        <div class="member-mgr-grid">
    `;

    state.masterMembers.forEach((m, idx) => {
        const isActiveInCurrent = isMemberActiveInMonth(m, state.activeMonth);
        const joinLabel = getBengaliMonthLabel(m.joinMonth || "2026-01");
        const leaveLabel = m.leaveMonth ? getBengaliMonthLabel(m.leaveMonth) : null;

        let statusBadge = '';
        if (isActiveInCurrent) {
            statusBadge = `<span class="badge-pill" style="background:#dcfce7; color:#166534; border:1px solid #4ade80;">🟢 সক্রিয় (${getBengaliMonthLabel(state.activeMonth)})</span>`;
        } else if (m.leaveMonth && m.leaveMonth < state.activeMonth) {
            statusBadge = `<span class="badge-pill" style="background:#fee2e2; color:#991b1b; border:1px solid #f87171;">🔴 রিলিজ (${leaveLabel})</span>`;
        } else {
            statusBadge = `<span class="badge-pill" style="background:#fef3c7; color:#92400e; border:1px solid #f59e0b;">⏳ যোগ দেবেন (${joinLabel})</span>`;
        }

        const actionBtn = isActiveInCurrent
            ? `<button class="btn clay-btn clay-btn-danger" style="padding:4px 10px; font-size:11.5px;" onclick="openRemoveMemberModal('${m.id}')">রিলিজ / রিমুভ</button>`
            : `<button class="btn clay-btn clay-btn-primary" style="padding:4px 10px; font-size:11.5px;" onclick="reactivateMember('${m.id}')">পুনরায় সক্রিয় করুন</button>`;

        html += `
            <div class="member-mgr-card clay-inset">
                <div class="member-mgr-header">
                    <div>
                        <div class="member-mgr-id">${m.id}</div>
                        <h4 style="margin:2px 0 0 0; font-size:15px; color:#1e293b;">${m.name}</h4>
                    </div>
                    <div>${statusBadge}</div>
                </div>
                <div class="member-mgr-body">
                    <div>📅 <strong>যোগদান:</strong> ${joinLabel}</div>
                    ${m.leaveMonth ? `<div>🚪 <strong>রিলিজ:</strong> ${leaveLabel} পর্যন্ত</div>` : ''}
                    <div>🏠 <strong>সিট ভাড়া:</strong> BDT ${m.defaultRent || 0}</div>
                    ${m.phone ? `<div>📞 <strong>ফোন:</strong> ${m.phone}</div>` : ''}
                </div>
                <div class="member-mgr-footer">
                    ${actionBtn}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function submitAddNewMember() {
    const name = textVal('newMemberName').trim();
    const joinMonth = $('newMemberJoinMonth')?.value || state.activeMonth;
    const defaultRent = numVal('newMemberRent');
    const phone = textVal('newMemberPhone').trim();

    if (!name) {
        showToast("সদস্যের নাম প্রদান করুন!", "error");
        return;
    }

    // Check duplicate name
    const existing = (state.masterMembers || []).find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        showToast(`'${name}' নামের সদস্য ইতিমধ্যে মেম্বার তালিকায় আছেন!`, "error");
        return;
    }

    const nextSerial = (state.masterMembers ? state.masterMembers.length : 0) + 1;
    const newId = generateMemberId(joinMonth, nextSerial);

    const newMember = {
        id: newId,
        name: name,
        joinMonth: joinMonth,
        leaveMonth: null,
        defaultRent: defaultRent || 0,
        phone: phone || "",
        isActive: true,
        createdAt: new Date().toISOString()
    };

    if (!state.masterMembers) state.masterMembers = [];
    state.masterMembers.push(newMember);

    // If active in current month, add to state.members
    if (isMemberActiveInMonth(newMember, state.activeMonth)) {
        state.members.push({
            id: newId,
            name: name,
            meals: 0,
            bazarDeposit: 0,
            rent: defaultRent || 0,
            prevAdj: 0,
            fridgeAdj: 0
        });
    }

    // Clear form
    $('newMemberName').value = '';
    $('newMemberRent').value = '';
    if ($('newMemberPhone')) $('newMemberPhone').value = '';

    saveData();
    showMemberTab('list');
    renderDrawerInputs();
    calculateAll();
    showToast(`${name} (ID: ${newId}) সফলভাবে মেম্বার হিসেবে যুক্ত হয়েছেন!`, "success");
}

let pendingRemoveMemberId = null;

function openRemoveMemberModal(memberId) {
    const member = (state.masterMembers || []).find(m => m.id === memberId || m.name === memberId);
    if (!member) return;

    pendingRemoveMemberId = member.id;
    $('removeMemberNameLabel').innerText = `${member.name} (${member.id})`;

    const leaveSelect = $('removeMemberLeaveMonth');
    if (leaveSelect) {
        leaveSelect.value = state.activeMonth;
    }

    const modal = $('removeMemberModal');
    if (modal) modal.style.display = 'flex';
}

function closeRemoveMemberModal() {
    const modal = $('removeMemberModal');
    if (modal) modal.style.display = 'none';
    pendingRemoveMemberId = null;
}

function submitRemoveMember() {
    if (!pendingRemoveMemberId) return;
    const member = (state.masterMembers || []).find(m => m.id === pendingRemoveMemberId);
    if (!member) return;

    const leaveMonth = $('removeMemberLeaveMonth')?.value || state.activeMonth;
    member.leaveMonth = leaveMonth;
    member.isActive = false;

    // Refresh active month view members
    const activeMasterList = getActiveMembersForMonth(state.activeMonth);
    state.members = state.members.filter(m => activeMasterList.some(active => active.name === m.name));

    saveData();
    closeRemoveMemberModal();
    renderMemberManagerList();
    renderDrawerInputs();
    calculateAll();
    showToast(`${member.name}-কে ${getBengaliMonthLabel(leaveMonth)} মাস থেকে রিলিজ/নিষ্ক্রিয় করা হয়েছে!`, "info");
}

function reactivateMember(memberId) {
    const member = (state.masterMembers || []).find(m => m.id === memberId);
    if (!member) return;

    member.leaveMonth = null;
    member.isActive = true;

    // If active in current month, ensure present in state.members
    if (isMemberActiveInMonth(member, state.activeMonth)) {
        const exists = state.members.some(m => m.name === member.name);
        if (!exists) {
            state.members.push({
                id: member.id,
                name: member.name,
                meals: 0,
                bazarDeposit: 0,
                rent: member.defaultRent || 0,
                prevAdj: 0,
                fridgeAdj: 0
            });
        }
    }

    saveData();
    renderMemberManagerList();
    renderDrawerInputs();
    calculateAll();
    showToast(`${member.name}-কে পুনরায় সক্রিয় করা হয়েছে!`, "success");
}

// ---------- Reset Year (New Year Setup & Safe Backup) ----------
let hasDownloadedBackupForReset = false;

function openResetYearModal() {
    hasDownloadedBackupForReset = false;
    const chk = $('resetBackupCheckbox');
    if (chk) chk.checked = false;
    const passInput = $('resetYearAdminPass');
    if (passInput) passInput.value = '';
    const confirmInput = $('resetYearConfirmCode');
    if (confirmInput) confirmInput.value = '';

    const modal = $('resetYearModal');
    if (modal) modal.style.display = 'flex';
}

function closeResetYearModal() {
    const modal = $('resetYearModal');
    if (modal) modal.style.display = 'none';
}

function downloadResetBackup(type) {
    if (type === 'excel') {
        exportMultiSheetExcel();
    } else if (type === 'json') {
        exportJSON();
    }
    hasDownloadedBackupForReset = true;
    const chk = $('resetBackupCheckbox');
    if (chk) chk.checked = true;
    showToast("ব্যাকআপ ডাউনলোড সম্পন্ন! এখন রিসেট কনফার্ম করতে পারবেন।", "info");
}

function resetYearTo(targetYear) {
    const year = Number(targetYear) || getCurrentResetYear();
    state.months = createInitialMonthsData(year);
    state.activeMonth = `${year}-01`;
    const janData = state.months[`${year}-01`];
    state.fixedCosts = { ...janData.fixedCosts };
    state.members = janData.members.map(m => ({ ...m }));
    state.notices = [];
    state.transactions = [];
    state.customAdjLabel = DEFAULT_CUSTOM_ADJ_LABEL;
    state.masterMembers = [];
    persistLocally();
    updateMonthDisplayUI();
    calculateAll();
    if (window.firebaseDb) {
        saveData();
    }
    return { year, monthKey: state.activeMonth };
}

function submitResetYear() {
    const pass = textVal('resetYearAdminPass');
    const confirmCode = textVal('resetYearConfirmCode').trim().toUpperCase();
    const chk = $('resetBackupCheckbox');
    const targetYear = getCurrentResetYear();

    if (!chk || !chk.checked) {
        showToast("ডাটা রিসেট করার পূর্বে অবশ্যই ব্যাকআপ ডাউনলোড করে টিক দিন!", "error");
        return;
    }

    if (!isValidAdminPassword(pass)) {
        showToast("এডমিন পাসওয়ার্ডটি সঠিক নয়!", "error");
        return;
    }

    const expectedConfirm = `RESET ${targetYear}`;
    if (confirmCode !== expectedConfirm && confirmCode !== "RESET") {
        showToast(`নিশ্চিতকরণ ঘরে '${expectedConfirm}' লিখুন!`, "error");
        return;
    }

    showConfirmModal(
        "চূড়ান্ত ডাটা রিসেট নিশ্চিতকরণ",
        `আপনি কি নিশ্চিত যে ${targetYear} বছরের জন্য সকল মাসের মিল, জমা ও ট্রানজেকশন ডাটা রিসেট করে প্রথমিক শূন্য অবস্থা তৈরি করতে চান?`,
        async () => {
            resetYearTo(targetYear);
            closeResetYearModal();
            showToast(`${targetYear} বছরের জন্য নতুন ফ্রেশ ডাটাবেস প্রস্তুত করা হয়েছে!`, "success");
        }
    );
}

// ---------- Helper: Escape HTML ----------
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ---------- Adjustment Info Tooltip Handler ----------
function toggleAdjInfoTooltip(e) {
    if (e) {
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
    }
    const btn = (e && e.currentTarget) ? e.currentTarget : (e && e.target ? e.target.closest('.adj-info-btn') : null);
    if (!btn) return;
    const wrapper = btn.closest('.adj-info-wrapper');
    if (!wrapper) return;
    const badge = wrapper.querySelector('.adj-info-badge');
    if (!badge) return;

    const isShown = (badge.style.display === 'inline-flex' || badge.style.display === 'block');
    document.querySelectorAll('.adj-info-badge').forEach(b => b.style.display = 'none');
    badge.style.display = isShown ? 'none' : 'inline-flex';
}

// ---------- Export Menu Dropdown Handler ----------
function toggleExportDropdown(e) {
    if (e && typeof e === 'object' && e.stopPropagation) {
        e.stopPropagation();
        e.preventDefault();
    }
    const menu = $('exportMenuDropdown');
    if (!menu) return;
    if (typeof e === 'boolean') {
        menu.style.display = e ? 'block' : 'none';
    } else {
        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    }
}

// ---------- Hamburger Menu Handler ----------
function toggleHamburgerMenu(forceState) {
    const menu = $('hamburgerMenuDropdown');
    if (!menu) return;
    if (typeof forceState === 'boolean') {
        menu.style.display = forceState ? 'block' : 'none';
    } else {
        menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    }
}

window.toggleHamburger = toggleHamburgerMenu;
window.toggleHamburgerMenu = toggleHamburgerMenu;
window.toggleExportDropdown = toggleExportDropdown;
window.toggleAdjInfoTooltip = toggleAdjInfoTooltip;
window.openMemberManagerModal = openMemberManagerModal;
window.closeMemberManagerModal = closeMemberManagerModal;
window.showMemberTab = showMemberTab;
window.submitAddNewMember = submitAddNewMember;
window.openRemoveMemberModal = openRemoveMemberModal;
window.closeRemoveMemberModal = closeRemoveMemberModal;
window.submitRemoveMember = submitRemoveMember;
window.reactivateMember = reactivateMember;
window.openResetYearModal = openResetYearModal;
window.closeResetYearModal = closeResetYearModal;
window.downloadResetBackup = downloadResetBackup;
window.submitResetYear = submitResetYear;

document.addEventListener('click', (e) => {
    if (!e.target.closest('.hamburger-wrapper')) {
        const menu = $('hamburgerMenuDropdown');
        if (menu) menu.style.display = 'none';
    }
    if (!e.target.closest('.export-dropdown-wrapper')) {
        const exportMenu = $('exportMenuDropdown');
        if (exportMenu) exportMenu.style.display = 'none';
    }
    if (!e.target.closest('.adj-info-wrapper')) {
        document.querySelectorAll('.adj-info-badge').forEach(b => b.style.display = 'none');
    }
});

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
    if (mKey === "2026-01") return 0;

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

    const mem = prevData.members.find(m => normalizeMemberName(m.name) === normalizeMemberName(memberName));
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
        .filter(t => normalizeMemberName(t.member) === normalizeMemberName(memberName))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalNetPayableWithRent = (netPayableWithoutRent + rentNum) - memberTotalDeposit;
    return Math.round(totalNetPayableWithRent * 100) / 100;
}

function recalculateAllPreviousMonthBalances() {
    if (!state.months) return;

    for (let month = 2; month <= 12; month++) {
        const monthKey = `${CURRENT_YEAR}-${String(month).padStart(2, '0')}`;
        const monthData = state.months[monthKey];
        if (!monthData || !Array.isArray(monthData.members)) continue;

        monthData.members.forEach(member => {
            member.prevAdj = calculatePrevMonthBalanceForMember(monthKey, member.name);
        });
    }
}

// ---------- Month Switcher Controls ----------
function switchMonth(targetMonthKey) {
    // Save current active month in dictionary
    if (state.months && state.activeMonth) {
        state.months[state.activeMonth] = {
            fixedCosts: { ...state.fixedCosts },
            customAdjLabel: state.customAdjLabel,
            members: state.members.map(m => ({ ...m })),
            notices: state.notices.map(n => ({ ...n })),
            transactions: state.transactions.map(t => ({ ...t }))
        };
    }

    state.activeMonth = targetMonthKey;

    // Load or initialize target month
    if (!state.months[targetMonthKey]) {
        state.months[targetMonthKey] = createEmptyMonthData(targetMonthKey);
    }

    const mData = state.months[targetMonthKey];
    state.fixedCosts = { ...mData.fixedCosts };
    state.customAdjLabel = mData.customAdjLabel || DEFAULT_CUSTOM_ADJ_LABEL;
    state.members = mData.members.map(m => ({ ...m }));
    state.notices = mData.notices.map(n => ({ ...n }));
    state.transactions = mData.transactions.map(t => ({ ...t }));

    // Ensure only members active in target month are present
    const activeMasterList = getActiveMembersForMonth(targetMonthKey);
    state.members = state.members.filter(m => activeMasterList.some(active => active.name === m.name));

    // Add any active members who might not be in the month data yet
    activeMasterList.forEach(am => {
        if (!state.members.some(m => m.name === am.name)) {
            state.members.push({
                id: am.id,
                name: am.name,
                meals: 0,
                bazarDeposit: 0,
                rent: am.defaultRent || 0,
                prevAdj: 0,
                fridgeAdj: 0
            });
        }
    });

    // Auto calculate previous month balance for February through December
    if (targetMonthKey !== "2026-01") {
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

// ---------- Member Order ----------
function ensureMemberOrder() {
    if (!state.members) return;
    const master = state.masterMembers || INITIAL_MASTER_MEMBERS;
    state.members.sort((a, b) => {
        let ia = master.findIndex(o => o.name === a.name || o.id === a.id);
        let ib = master.findIndex(o => o.name === b.name || o.id === b.id);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
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

    // Auto calculate previous month balance for February through December
    if (state.activeMonth && state.activeMonth !== "2026-01") {
        state.members.forEach(m => {
            m.prevAdj = calculatePrevMonthBalanceForMember(state.activeMonth, m.name);
        });
    }

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

function normalizeMemberName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getMemberTotalDeposit(memberName) {
    const targetName = normalizeMemberName(memberName);
    return (state.transactions || []).reduce((sum, t) => {
        if (normalizeMemberName(t.member) === targetName) {
            return sum + Number(t.amount || 0);
        }
        return sum;
    }, 0);
}

function getMemberNetPayableWithoutRent(member, mealRate, perHead) {
    const utilitiesSum = perHead.elec + perHead.gas + perHead.water + perHead.wifi + perHead.khala + perHead.waste;
    const mealExpense = Number((Number(member.meals || 0) * mealRate).toFixed(2));
    const totalExpenseExceptRent = utilitiesSum + mealExpense + Number(member.prevAdj || 0) + Number(member.fridgeAdj || 0);
    const netPayableWithoutRent = totalExpenseExceptRent - Number(member.bazarDeposit || 0);
    return Number(netPayableWithoutRent.toFixed(2));
}

function getMemberNetPayableWithRent(member, mealRate, perHead) {
    const withoutRent = getMemberNetPayableWithoutRent(member, mealRate, perHead);
    const rent = Number(member.rent || 0);
    const totalDeposit = getMemberTotalDeposit(member.name);
    return Number(((withoutRent + rent) - totalDeposit).toFixed(2));
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
        {
            labelHtml: `অন্যান্য <span class="adj-info-wrapper"><button type="button" class="adj-info-btn" onclick="toggleAdjInfoTooltip(event)" title="বিস্তারিত বিবরণ">ℹ️</button><span class="adj-info-badge" style="display:none;">${escapeHtml(state.customAdjLabel || "এডজাস্টমেন্ট")}</span></span> (BDT)`,
            key: 'fridgeAdj',
            isRawFormatted: true
        },
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
        let labelContent = r.labelHtml || r.label;
        let html = `<tr${trClass}><td>${labelContent}</td>`;

        state.members.forEach((m) => {
            const mealsNum = Number(m.meals || 0);
            const bazarNum = Number(m.bazarDeposit || 0);
            const prevNum = Number(m.prevAdj || 0);
            const fridgeNum = Number(m.fridgeAdj || 0);
            const rentNum = Number(m.rent || 0);

            const mealExpense = Number((mealsNum * mealRate).toFixed(2));
            const totalExpenseExceptRent = utilitiesSum + mealExpense + prevNum + fridgeNum;
            const netPayableWithoutRent = totalExpenseExceptRent - bazarNum;
            const memberTotalDeposit = getMemberTotalDeposit(m.name);
            const totalNetPayableWithRent = getMemberNetPayableWithRent(m, mealRate, perHead);

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

// ---------- Highlight Member Column with Mobile Smooth Auto-Scroll ----------
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

        // Mobile / Horizontal auto-scroll to the selected member column
        const container = $('memberTableContainer') || table.closest('.table-responsive');
        if (container) {
            const targetTh = headerThs[targetColIdx];
            const firstTh = headerThs[0];
            if (targetTh && firstTh) {
                const stickyWidth = firstTh.offsetWidth;
                const containerWidth = container.clientWidth;
                const visibleWidth = containerWidth - stickyWidth;

                const cellCenter = targetTh.offsetLeft + (targetTh.offsetWidth / 2);
                const viewportCenter = stickyWidth + (visibleWidth / 2);

                let targetScrollLeft = Math.max(0, cellCenter - viewportCenter);

                const memberIdx = state.members.findIndex(m => m.name === memberName);
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
                        <label class="water-calc-label highlight" title="সর্বমোট পানির বিল">মোট বিল (BDT)</label>
                        <input type="number" id="inp_water" class="drawer-input water-calc-input" value="${wbTotal}" readonly style="background:#e2e8f0; font-weight:700; color:#1e40af;">
                    </div>
                </div>
            </div>

            <div class="input-group"><label>ওয়াইফাই বিল (BDT)</label><input type="number" id="inp_wifi" class="drawer-input" value="${state.fixedCosts.wifi}"></div>
            <div class="input-group"><label>খালার বিল (BDT)</label><input type="number" id="inp_khala" class="drawer-input" value="${state.fixedCosts.khala}"></div>
            <div class="input-group"><label>ময়লার বিল (BDT)</label><input type="number" id="inp_waste" class="drawer-input" value="${state.fixedCosts.waste}"></div>
            <div class="input-group input-group-full"><label>অন্যান্য এডজাস্টমেন্টের নাম:</label><input type="text" id="customAdjLabelInput" class="drawer-input" value="${state.customAdjLabel || 'অন্যান্য'}"></div>
        `;
    }

    // Card 3: Member Selector & Single Member Edit Form
    const adminMemberSelect = $('adminMemberSelect');
    if (adminMemberSelect) {
        const prevSelected = adminMemberSelect.value;
        populateSelect(adminMemberSelect, memberNames, "👤 মেম্বার নির্বাচন করুন");
        // Restore previous selection if it's still valid
        if (prevSelected && state.members.some(m => m.name === prevSelected)) {
            adminMemberSelect.value = prevSelected;
        } else if (state.members.length > 0) {
            adminMemberSelect.value = state.members[0].name; // auto-select first member
        }
        renderMemberEditForm();
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
}

// Single member edit form render
function renderMemberEditForm() {
    const adminMemberSelect = $('adminMemberSelect');
    const container = $('memberEditFormContainer');
    const badgeEl = $('memberSelectorBadge');
    if (!adminMemberSelect || !container) return;

    const selectedName = adminMemberSelect.value;
    const memberIdx = state.members.findIndex(m => m.name === selectedName);

    if (selectedName === '' || memberIdx === -1) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #64748b; font-size: 13.5px;">
                👆 উপরে ড্রপডাউন থেকে একজন সদস্য নির্বাচন করুন
            </div>
        `;
        if (badgeEl) badgeEl.innerHTML = '';
        return;
    }

    const m = state.members[memberIdx];
    const prevAdjVal = Number(m.prevAdj || 0);
    const isJanuary = (state.activeMonth === "2026-01");

    // Render clean badge in selector bar
    if (badgeEl) {
        if (prevAdjVal > 0) {
            badgeEl.innerHTML = `<span class="badge-pill" style="background:#fee2e2; color:#991b1b; border:1px solid #f87171;">⬆ বকেয়া: BDT ${prevAdjVal.toFixed(2)} (${isJanuary ? 'প্রারম্ভিক' : 'পূর্ববর্তী মাস'})</span>`;
        } else if (prevAdjVal < 0) {
            badgeEl.innerHTML = `<span class="badge-pill" style="background:#dcfce7; color:#166534; border:1px solid #4ade80;">⬇ জমা: BDT ${Math.abs(prevAdjVal).toFixed(2)} (${isJanuary ? 'প্রারম্ভিক' : 'পূর্ববর্তী মাস'})</span>`;
        } else {
            badgeEl.innerHTML = `<span class="badge-pill" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;">সমন্বয়: 0.00</span>`;
        }
    }

    const prevAdjFieldHtml = isJanuary ? `
        <div class="input-group" style="grid-column: 1 / -1; margin-top: 4px;">
            <label>⏮️ পূর্ববর্তী মাসের বকেয়া/জমা (BDT):</label>
            <input type="number" id="single_mem_prev" class="drawer-input" value="${m.prevAdj || 0}">
            <span style="color:#64748b; font-size:11px;">(জানুয়ারি মাসের প্রারম্ভিক বকেয়া বা জমা ম্যানুয়ালি ইনপুট দিন)</span>
        </div>
    ` : `
        <div class="prev-adj-info-box" style="margin-bottom: 14px; grid-column: 1 / -1;">
            <span class="prev-adj-info-icon">ℹ️</span>
            <div>
                <strong>গত মাসের সমন্বয়:</strong> BDT ${prevAdjVal.toFixed(2)}
                <span style="color:#64748b; font-size:11px;">(পূর্বের মাসের মোট হিসাব থেকে স্বয়ংক্রিয়ভাবে ক্যালকুলেটেড)</span>
            </div>
        </div>
    `;

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
                    <label>✨ অন্যান্য <span class="adj-info-wrapper"><button type="button" class="adj-info-btn" onclick="toggleAdjInfoTooltip(event)" title="বিবরণ দেখুন">ℹ️</button><span class="adj-info-badge" style="display:none;">${escapeHtml(state.customAdjLabel || "এডজাস্টমেন্ট")}</span></span>:</label>
                    <input type="number" id="single_mem_fridge" class="drawer-input" value="${m.fridgeAdj || 0}">
                </div>
                ${prevAdjFieldHtml}
            </div>

            <button class="btn clay-btn clay-btn-primary full-width-btn" onclick="saveSelectedMemberData('${selectedName}')">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                ${m.name}-এর ডাটা সেভ করুন
            </button>
        </div>
    `;
}

function saveSelectedMemberData(memberName) {
    const idx = state.members.findIndex(m => m.name === memberName);
    if (idx === -1) {
        showToast('সদস্য খুঁজে পাওয়া যায়নি!', 'error');
        return;
    }
    state.members[idx].meals = numVal('single_mem_meals');
    state.members[idx].bazarDeposit = numVal('single_mem_bazar');
    state.members[idx].rent = numVal('single_mem_rent');
    state.members[idx].fridgeAdj = numVal('single_mem_fridge');

    if (state.activeMonth === "2026-01" && $('single_mem_prev')) {
        state.members[idx].prevAdj = numVal('single_mem_prev');
    }

    saveData();
    calculateAll();
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
            .then(async ({ doc, deleteDoc }) => {
                const mKey = state.activeMonth;
                await deleteDoc(doc(window.firebaseDb, "months", mKey, "notices", String(noticeId)));
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
    showToast("নতুন নোটিশ প্রকাশিত হয়েছে!", "success");
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

// ---------- Multi-Sheet Excel & CSV Exports ----------
function exportMultiSheetExcel() {
    calculateAll();
    const mKey = state.activeMonth;
    const mLabel = getBengaliMonthLabel(mKey);

    const totalMeals = state.members.reduce((s, m) => s + Number(m.meals || 0), 0);
    const totalBazarExp = state.members.reduce((s, m) => s + Number(m.bazarDeposit || 0), 0);
    const mealRate = totalMeals > 0 ? (totalBazarExp / totalMeals) : 0;
    const numMembers = state.members.length || 6;
    const elecPH = (Number(state.fixedCosts.electricity || 0) / numMembers);
    const gasPH = (Number(state.fixedCosts.gas || 0) / numMembers);
    const waterPH = (Number(state.fixedCosts.waterBill || 0) / numMembers);
    const wifiPH = (Number(state.fixedCosts.wifi || 0) / numMembers);
    const khalaPH = (Number(state.fixedCosts.khala || 0) / numMembers);
    const wastePH = (Number(state.fixedCosts.waste || 0) / numMembers);
    const fixedTotal = Number(state.fixedCosts.electricity || 0) + Number(state.fixedCosts.gas || 0) + Number(state.fixedCosts.waterBill || 0) + Number(state.fixedCosts.wifi || 0) + Number(state.fixedCosts.khala || 0) + Number(state.fixedCosts.waste || 0);
    const fixedPerHead = fixedTotal / numMembers;

    // Sheet 1: মেস সামারি
    const sheet1Xml = `
    <Worksheet ss:Name="মেস সামারি">
        <Table>
            <Row><Cell><Data ss:Type="String">ISOTOPE মেস মোট হিসাব সামারি (${mLabel})</Data></Cell></Row>
            <Row>
                <Cell><Data ss:Type="String">খরচের খাত / বিবরণ</Data></Cell>
                <Cell><Data ss:Type="String">মোট পরিমাণ (BDT)</Data></Cell>
                <Cell><Data ss:Type="String">জনপ্রতি ভাগ (BDT)</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">মোট মিল সংখ্যা</Data></Cell>
                <Cell><Data ss:Type="Number">${totalMeals}</Data></Cell>
                <Cell><Data ss:Type="String">-</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">মোট বাজার খরচ</Data></Cell>
                <Cell><Data ss:Type="Number">${totalBazarExp}</Data></Cell>
                <Cell><Data ss:Type="String">মিল রেট: ${mealRate.toFixed(2)}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">কারেন্ট বিল</Data></Cell>
                <Cell><Data ss:Type="Number">${state.fixedCosts.electricity}</Data></Cell>
                <Cell><Data ss:Type="Number">${elecPH.toFixed(2)}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">গ্যাস বিল</Data></Cell>
                <Cell><Data ss:Type="Number">${state.fixedCosts.gas}</Data></Cell>
                <Cell><Data ss:Type="Number">${gasPH.toFixed(2)}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">পানির বিল (${state.fixedCosts.waterBottleCount || 40} বোতল)</Data></Cell>
                <Cell><Data ss:Type="Number">${state.fixedCosts.waterBill}</Data></Cell>
                <Cell><Data ss:Type="Number">${waterPH.toFixed(2)}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">ওয়াইফাই বিল</Data></Cell>
                <Cell><Data ss:Type="Number">${state.fixedCosts.wifi}</Data></Cell>
                <Cell><Data ss:Type="Number">${wifiPH.toFixed(2)}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">খালার বিল</Data></Cell>
                <Cell><Data ss:Type="Number">${state.fixedCosts.khala}</Data></Cell>
                <Cell><Data ss:Type="Number">${khalaPH.toFixed(2)}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">ময়লার বিল</Data></Cell>
                <Cell><Data ss:Type="Number">${state.fixedCosts.waste}</Data></Cell>
                <Cell><Data ss:Type="Number">${wastePH.toFixed(2)}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">সর্বমোট ফিক্সড/ইউটিলিটি খরচ</Data></Cell>
                <Cell><Data ss:Type="Number">${fixedTotal}</Data></Cell>
                <Cell><Data ss:Type="Number">${fixedPerHead.toFixed(2)}</Data></Cell>
            </Row>
            <Row>
                <Cell><Data ss:Type="String">সর্বমোট মেস খরচ</Data></Cell>
                <Cell><Data ss:Type="Number">${(totalBazarExp + fixedTotal).toFixed(2)}</Data></Cell>
                <Cell><Data ss:Type="String">-</Data></Cell>
            </Row>
        </Table>
    </Worksheet>`;

    // Sheet 2: সদস্যভিত্তিক হিসাব
    let sheet2Rows = `<Row><Cell><Data ss:Type="String">আইটেম / সদস্য</Data></Cell>`;
    state.members.forEach(m => {
        sheet2Rows += `<Cell><Data ss:Type="String">${m.name}</Data></Cell>`;
    });
    sheet2Rows += `</Row>`;

    const memberRowConfig = [
        { label: 'কারেন্ট বিল (BDT)', fn: () => elecPH.toFixed(2) },
        { label: 'গ্যাস বিল (BDT)', fn: () => gasPH.toFixed(2) },
        { label: 'পানির বিল (BDT)', fn: () => waterPH.toFixed(2) },
        { label: 'ওয়াইফাই বিল (BDT)', fn: () => wifiPH.toFixed(2) },
        { label: 'খালার বিল (BDT)', fn: () => khalaPH.toFixed(2) },
        { label: 'ময়লার বিল (BDT)', fn: () => wastePH.toFixed(2) },
        { label: 'মিল সংখ্যা', fn: m => m.meals },
        { label: 'মিল খরচ (BDT)', fn: m => (Number(m.meals || 0) * mealRate).toFixed(2) },
        { label: 'গত মাসের বকেয়া (BDT)', fn: m => m.prevAdj },
        { label: `অন্যান্য (${state.customAdjLabel || 'এডজাস্টমেন্ট'}) (BDT)`, fn: m => m.fridgeAdj },
        { label: 'সর্বমোট খরচ (ভাড়া বাদে)', fn: m => {
            const u = fixedPerHead;
            return (u + (Number(m.meals || 0) * mealRate) + Number(m.prevAdj || 0) + Number(m.fridgeAdj || 0)).toFixed(2);
        }},
        { label: 'বাজার জমা (BDT)', fn: m => m.bazarDeposit },
        { label: 'সিট ভাড়া (BDT)', fn: m => m.rent },
        { label: 'সর্বমোট জমা (BDT)', fn: m => {
            return getMemberTotalDeposit(m.name).toFixed(2);
        }},
        { label: 'মোট প্রদেয় / বকেয়া (ভাড়াসহ)', fn: m => {
            const u = fixedPerHead;
            const exp = u + (Number(m.meals || 0) * mealRate) + Number(m.prevAdj || 0) + Number(m.fridgeAdj || 0) - Number(m.bazarDeposit || 0);
            const dep = getMemberTotalDeposit(m.name);
            return ((exp + Number(m.rent || 0)) - dep).toFixed(2);
        }}
    ];

    memberRowConfig.forEach(r => {
        sheet2Rows += `<Row><Cell><Data ss:Type="String">${r.label}</Data></Cell>`;
        state.members.forEach(m => {
            sheet2Rows += `<Cell><Data ss:Type="String">${r.fn(m)}</Data></Cell>`;
        });
        sheet2Rows += `</Row>`;
    });

    const sheet2Xml = `
    <Worksheet ss:Name="সদস্যভিত্তিক হিসাব">
        <Table>
            ${sheet2Rows}
        </Table>
    </Worksheet>`;

    // Sheet 3: ট্রানজেকশন লগ
    let sheet3Rows = `
        <Row>
            <Cell><Data ss:Type="String">SL</Data></Cell>
            <Cell><Data ss:Type="String">তারিখ ও সময়</Data></Cell>
            <Cell><Data ss:Type="String">সদস্যের নাম</Data></Cell>
            <Cell><Data ss:Type="String">বিবরণ / নোট</Data></Cell>
            <Cell><Data ss:Type="String">জমার পরিমাণ (BDT)</Data></Cell>
        </Row>`;

    let txnTotal = 0;
    state.transactions.forEach((t, idx) => {
        txnTotal += Number(t.amount || 0);
        sheet3Rows += `
        <Row>
            <Cell><Data ss:Type="Number">${idx + 1}</Data></Cell>
            <Cell><Data ss:Type="String">${t.date}</Data></Cell>
            <Cell><Data ss:Type="String">${t.member}</Data></Cell>
            <Cell><Data ss:Type="String">${t.note}</Data></Cell>
            <Cell><Data ss:Type="Number">${t.amount}</Data></Cell>
        </Row>`;
    });
    sheet3Rows += `
        <Row>
            <Cell><Data ss:Type="String"></Data></Cell>
            <Cell><Data ss:Type="String"></Data></Cell>
            <Cell><Data ss:Type="String"></Data></Cell>
            <Cell><Data ss:Type="String">সর্বমোট জমা</Data></Cell>
            <Cell><Data ss:Type="Number">${txnTotal.toFixed(2)}</Data></Cell>
        </Row>`;

    const sheet3Xml = `
    <Worksheet ss:Name="ট্রানজেকশন লগ">
        <Table>
            ${sheet3Rows}
        </Table>
    </Worksheet>`;

    const excelXml = `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:o="urn:schemas-microsoft-com:office:office"
     xmlns:x="urn:schemas-microsoft-com:excel"
     xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:html="http://www.w3.org/TR/REC-html40">
     ${sheet1Xml}
     ${sheet2Xml}
     ${sheet3Xml}
    </Workbook>`;

    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Isotope_Mess_MultiSheet_${mKey}_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    showToast("মাল্টি-শিট Excel ফাইল সফলভাবে ডাউনলোড হয়েছে!", "success");
}

function exportCSV() {
    calculateAll();
    let csv = `\uFEFF`; // UTF-8 BOM

    // Section 1: মেসের মোট হিসাব সামারি
    csv += `"1. মেসের মোট হিসাব সামারি"\n`;
    csv += `"খরচের খাত / বিবরণ","মোট পরিমাণ (BDT)","জনপ্রতি ভাগ (BDT)"\n`;

    let totalMeals = state.members.reduce((s, m) => s + Number(m.meals || 0), 0);
    let totalBazarExp = state.members.reduce((s, m) => s + Number(m.bazarDeposit || 0), 0);
    let mealRate = totalMeals > 0 ? (totalBazarExp / totalMeals) : 0;
    let numMembers = state.members.length || 6;

    let elecPerHead = (Number(state.fixedCosts.electricity || 0) / numMembers);
    let gasPerHead = (Number(state.fixedCosts.gas || 0) / numMembers);
    let waterPerHead = (Number(state.fixedCosts.waterBill || 0) / numMembers);
    let wifiPerHead = (Number(state.fixedCosts.wifi || 0) / numMembers);
    let khalaPerHead = (Number(state.fixedCosts.khala || 0) / numMembers);
    let wastePerHead = (Number(state.fixedCosts.waste || 0) / numMembers);
    let fixedTotal = Number(state.fixedCosts.electricity || 0) + Number(state.fixedCosts.gas || 0) + Number(state.fixedCosts.waterBill || 0) + Number(state.fixedCosts.wifi || 0) + Number(state.fixedCosts.khala || 0) + Number(state.fixedCosts.waste || 0);
    let fixedPerHeadTotal = fixedTotal / numMembers;

    csv += `"মোট মিল সংখ্যা","${totalMeals}","-"\n`;
    csv += `"মোট বাজার খরচ","${totalBazarExp}","মিল রেট: ${mealRate.toFixed(2)}"\n`;
    csv += `"কারেন্ট বিল","${state.fixedCosts.electricity}","${elecPerHead.toFixed(2)}"\n`;
    csv += `"গ্যাস বিল","${state.fixedCosts.gas}","${gasPerHead.toFixed(2)}"\n`;
    csv += `"পানির বিল","${state.fixedCosts.waterBill}","${waterPerHead.toFixed(2)}"\n`;
    csv += `"ওয়াইফাই বিল","${state.fixedCosts.wifi}","${wifiPerHead.toFixed(2)}"\n`;
    csv += `"খালার বিল","${state.fixedCosts.khala}","${khalaPerHead.toFixed(2)}"\n`;
    csv += `"ময়লার বিল","${state.fixedCosts.waste}","${wastePerHead.toFixed(2)}"\n`;
    csv += `"সর্বমোট ফিক্সড খরচ","${fixedTotal}","${fixedPerHeadTotal.toFixed(2)}"\n`;
    csv += `"সর্বমোট মেস খরচ","${(totalBazarExp + fixedTotal).toFixed(2)}","-"\n`;

    csv += `\n`;

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
                let totalDep = getMemberTotalDeposit(m.name);
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
                let totalDep = getMemberTotalDeposit(m.name);
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

    if (isValidAdminPassword(pass)) {
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
    const mobileAdminBtnText = $('mobileAdminBtnText');
    if (mobileAdminBtnText) {
        mobileAdminBtnText.innerText = state.isAdmin ? "এডমিন প্যানেল" : "এডমিন কন্ট্রোল";
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

    if (!isValidAdminPassword(currPass)) {
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
    const localDataV3 = localStorage.getItem('isotope_mess_data_v3');
    const localDataV2 = localStorage.getItem('isotope_mess_data_v2');
    const localData = localDataV3 || localDataV2;

    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            const hasSeedMembers = Array.isArray(parsed.masterMembers) && parsed.masterMembers.some(m => m && (m.name || '').trim());
            const hasSeedTransactions = Array.isArray(parsed.transactions) && parsed.transactions.length > 0;
            if (hasSeedMembers || hasSeedTransactions) {
                console.info('Fresh startup mode: ignoring stale local storage seed data.');
                localStorage.removeItem('isotope_mess_data_v3');
                localStorage.removeItem('isotope_mess_data_v2');
            } else {
                if (parsed && typeof parsed === 'object') {
                    if (parsed.masterMembers && Array.isArray(parsed.masterMembers)) {
                        state.masterMembers = parsed.masterMembers;
                    }
                    if (parsed.months) state.months = parsed.months;
                    if (parsed.adminPassword) state.adminPassword = parsed.adminPassword;
                    if (parsed.customAdjLabel) state.customAdjLabel = parsed.customAdjLabel;
                    if (parsed.activeMonth) state.activeMonth = parsed.activeMonth;

                    if (state.months && state.months[state.activeMonth]) {
                        const mData = state.months[state.activeMonth];
                        state.fixedCosts = { ...mData.fixedCosts };
                        state.members = mData.members.map(m => ({ ...m }));
                        state.notices = mData.notices.map(n => ({ ...n }));
                        state.transactions = mData.transactions.map(t => ({ ...t }));
                    }
                }
            }
        } catch (e) {
            console.error("Local storage load error:", e);
        }
    }

    if (!state.months || Object.keys(state.months).length === 0) {
        state.months = createInitialMonthsData(getCurrentResetYear());
        const monthKey = `${getCurrentResetYear()}-01`;
        state.activeMonth = monthKey;
        state.fixedCosts = { ...state.months[monthKey].fixedCosts };
        state.members = state.months[monthKey].members.map(m => ({ ...m }));
        state.notices = [];
        state.transactions = [];
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

window.addEventListener('online', () => {
    showToast("📶 ইন্টারনেট সংযোগ পাওয়া গেছে! ডাটা সিঙ্ক করা হচ্ছে...", "success");
    loadFromFirestore();
});

window.addEventListener('offline', () => {
    showToast("📵 আপনি অফলাইনে আছেন। সংরক্ষিত ডাটা দেখানো হচ্ছে।", "error");
});

window.addEventListener('DOMContentLoaded', () => {
    initApp();
});