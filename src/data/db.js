// ============================================================
// DATA SERVICE WRAPPER — DEV / PRODUCTION SWITCH
// ------------------------------------------------------------
// This module is the single source of truth for deciding
// whether the app talks to the live Firestore database
// (production) or the local mock JSON file (development).
//
//   DEV  (localhost)  -> src/data/mockDatabase.json  (NO network calls)
//   PROD (Vercel)     -> Firebase Firestore          (live data)
//
// The app.js/logo.js logic keeps reading `window.firebaseDb`
// when it exists. In production the Firebase init script in
// index.html sets it; in dev it stays null so app.js falls
// back to the local mock through window.loadMockDatabase().
// ============================================================

export const IS_DEV_MODE =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

export function isDevMode() {
  return IS_DEV_MODE;
}

/**
 * Load the local mock database (development only).
 * Returns the parsed mock object matching Firestore exports:
 *   { settings: { config }, members: {...}, notices: [...], transactions: [...] }
 */
export async function loadMockDatabase() {
  if (!IS_DEV_MODE) {
    throw new Error('loadMockDatabase() should only be called in development mode.');
  }
  const res = await fetch('src/data/mockDatabase.json');
  if (!res.ok) {
    throw new Error('Mock database file not found at src/data/mockDatabase.json');
  }
  return res.json();
}

/**
 * Central helper used by the data layer to get the active DB handle.
 * Returns null in development (never connects to Firebase).
 */
export function getActiveDb() {
  return window.firebaseDb || null;
}

/**
 * Convenience: are we in production / connected to live Firestore?
 */
export function isProductionMode() {
  return !IS_DEV_MODE && !!window.firebaseDb;
}