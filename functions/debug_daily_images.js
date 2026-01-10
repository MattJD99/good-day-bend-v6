const admin = require('firebase-admin');
const CONFIG = require('./config');

// Initialize Firebase
try {
    const serviceAccount = require('./service-account.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: "good-day-bend-v6.firebasestorage.app"
        });
    }
} catch (e) {
    console.warn("⚠️ Init warning:", e.message);
}

const db = admin.firestore();

async function debugDaily() {
    console.log("🚀 Debugging Daily Updates...");

    const updatesSnap = await db.collection('daily_updates')
        .orderBy('publishedAt', 'desc')
        .limit(10)
        .get();

    updatesSnap.forEach(doc => {
        const d = doc.data();
        console.log("------------------------------------------------");
        console.log(`ID: ${doc.id}`);
        console.log(`Title: ${d.title}`);
        console.log(`Image: ${d.image}`);
        console.log(`Related Events:`, d.relatedEvents);
    });
}

debugDaily();
