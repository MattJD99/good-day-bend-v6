const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
    try {
        const serviceAccount = require('../service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("🔥 Firebase Admin initialized.");
    } catch (e) {
        console.warn("⚠️ Firebase Admin init failed. Check service-account.json.", e.message);
        // Fallback or just let it fail later
        admin.initializeApp();
    }
}

const db = admin.firestore();

module.exports = { admin, db };
