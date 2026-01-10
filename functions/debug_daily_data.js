const admin = require('firebase-admin');

// Initialize
try {
    const serviceAccount = require('./service-account.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (e) {
    console.warn("⚠️ Init warning:", e.message);
}

const db = admin.firestore();

async function checkDailyUpdates() {
    console.log("🚀 Checking latest Daily Updates...");

    const snap = await db.collection('daily_updates')
        .orderBy('publishedAt', 'desc')
        .limit(5)
        .get();

    snap.forEach(doc => {
        const data = doc.data();
        console.log(`\n📄 [${doc.id}] ${data.title}`);
        console.log(`   - image:        ${data.image}`);
        console.log(`   - imageUrl:     ${data.imageUrl}`);
        console.log(`   - bannerUrl:    ${data.bannerUrl}`);
        console.log(`   - date:         ${data.publishedAt ? data.publishedAt.toDate() : 'No Date'}`);
    });
}

checkDailyUpdates();
