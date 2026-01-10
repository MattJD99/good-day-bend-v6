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

async function investigate() {
    console.log("🔍 Investigating 'Complimentary Holiday Carriage Rides'...");

    // 1. Check the problematic event
    const snap = await db.collection('events').where('title', '==', 'Complimentary Holiday Carriage Rides').limit(1).get();
    if (!snap.empty) {
        const d = snap.docs[0].data();
        console.log("Event Details:");
        console.log(`- Title: ${d.title}`);
        console.log(`- Image: ${d.image || d.imageUrl}`);
        console.log(`- Description: ${d.description}`);
    } else {
        console.log("Event not found!");
    }

    // 2. Check alternatives for daily-2025-12-23
    console.log("\n🔍 Checking alternatives for daily-2025-12-23...");
    const dailyRef = db.collection('daily_updates').doc('daily-2025-12-23');
    const dailySnap = await dailyRef.get();

    if (dailySnap.exists) {
        const data = dailySnap.data();
        console.log(`Related Events:`, data.relatedEvents);

        for (const title of data.relatedEvents) {
            const evSnap = await db.collection('events').where('title', '==', title).limit(1).get();
            if (!evSnap.empty) {
                const ev = evSnap.docs[0].data();
                console.log(`   - ${title} => ${ev.image || ev.imageUrl}`);
            }
        }
    }
}

investigate();
