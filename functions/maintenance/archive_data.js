const { db, admin } = require('../lib/firebase');

async function archiveCollection(sourceName, destName) {
    console.log(`📦 Archiving '${sourceName}' -> '${destName}'...`);

    // 1. Get all documents from source
    const sourceRef = db.collection(sourceName);
    const snapshot = await sourceRef.get();

    if (snapshot.empty) {
        console.log(`⚠️ Source collection '${sourceName}' is empty.`);
        return;
    }

    console.log(`   Found ${snapshot.size} documents to move.`);

    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let totalMoved = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const destRef = db.collection(destName).doc(doc.id);

        // Copy to destination
        batch.set(destRef, { ...data, archivedAt: admin.firestore.FieldValue.serverTimestamp() });

        // Delete from source
        batch.delete(doc.ref);

        count++;

        if (count >= batchSize) {
            await batch.commit();
            totalMoved += count;
            console.log(`   Processed ${totalMoved} documents...`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        totalMoved += count;
    }

    console.log(`✅ Archive Complete: Moved ${totalMoved} docs from '${sourceName}'.`);
}

async function runArchive() {
    console.log("🚀 Starting Data Archive Sequence...");

    const timestamp = new Date().toISOString().split('T')[0];
    const suffix = `archive_v1_${timestamp}`;

    // Archive 1: Events
    await archiveCollection('events', `events_${suffix}`);

    // Archive 2: Daily Updates (Blog Posts)
    await archiveCollection('daily_updates', `daily_updates_${suffix}`);

    // Archive 3: Articles (if used)
    await archiveCollection('articles', `articles_${suffix}`);

    console.log("✨ All Collections Archived & Wiped Clean for V2.");
}

if (require.main === module) {
    runArchive();
}

module.exports = runArchive;
