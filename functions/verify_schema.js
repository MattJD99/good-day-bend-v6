const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkCollection(name) {
    console.log(`\n--- CHECKING COLLECTION: ${name} ---`);
    const snapshot = await db.collection(name).limit(3).get();

    if (snapshot.empty) {
        console.log("❌ Collection is EMPTY.");
        return;
    }

    console.log(`✅ Found ${snapshot.size} documents.`);
    snapshot.forEach(doc => {
        console.log(`\nDOC ID: ${doc.id}`);
        console.log("FIELDS:", Object.keys(doc.data()));
        console.log("SAMPLE DATA:", JSON.stringify(doc.data(), null, 2));
    });
}

async function main() {
    await checkCollection('events');
    await checkCollection('articles');
    await checkCollection('daily_updates');

    // Check for correct 'date' fields specifically
    const eventSnap = await db.collection('events').limit(1).get();
    if (!eventSnap.empty) {
        const data = eventSnap.docs[0].data();
        console.log("\n--- EVENT DATE FIELD CHECK ---");
        console.log("Has 'date'?", !!data.date);
        console.log("Has 'eventDate'?", !!data.eventDate);
        console.log("Has 'createdAt'?", !!data.createdAt);
    }
}

main();
