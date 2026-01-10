const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function debugDaily() {
    console.log("Debugging Daily Updates...");
    const snapshot = await db.collection('daily_updates')
        .orderBy('publishedAt', 'desc')
        .limit(10)
        .get();

    if (snapshot.empty) {
        console.log("No daily updates found.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        let pubDate = "N/A";
        if (data.publishedAt) {
            pubDate = data.publishedAt.toDate ? data.publishedAt.toDate().toISOString() : data.publishedAt;
        }

        console.log(`ID: ${doc.id}`);
        console.log(`Title: ${data.title}`);
        console.log(`Date: ${pubDate}`);
        console.log('---');
    });
}

debugDaily();
