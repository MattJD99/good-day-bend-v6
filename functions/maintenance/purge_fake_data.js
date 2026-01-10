const { db } = require('../lib/firebase');

async function purgeFakeData() {
    console.log("🧹 Starting Purge of Legacy/Fake Data...");

    // Delete events where isRealData is missing or false
    // Note: Firestore doesn't support "where field is missing" easily in one query without an index.
    // So we'll fetch all future events and filter.

    const today = new Date().toISOString().split('T')[0];
    console.log(`Scanning events from ${today} onwards...`);

    const snapshot = await db.collection('events')
        .where('eventDate', '>=', today)
        .get();

    if (snapshot.empty) {
        console.log("✅ No future events found.");
        return;
    }

    const batch = db.batch();
    let deleteCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        // If flag is missing or false, DELETE IT.
        if (!data.isRealData) {
            console.log(`❌ Deleting Legacy Event: ${data.title} (${data.eventDate})`);
            batch.delete(doc.ref);
            deleteCount++;
        }
    });

    if (deleteCount > 0) {
        await batch.commit();
        console.log(`🔥 Successfully deleted ${deleteCount} fake events.`);
    } else {
        console.log("✅ No fake events found to delete.");
    }
}

if (require.main === module) {
    purgeFakeData();
}
