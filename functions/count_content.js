const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function countCollection(collectionName, imageFields) {
    const snapshot = await db.collection(collectionName).get();
    const total = snapshot.size;
    let withImage = 0;
    let withoutImage = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        let hasImage = false;
        for (const field of imageFields) {
            if (data[field] && typeof data[field] === 'string' && data[field].trim() !== '') {
                hasImage = true;
                break;
            }
        }

        if (hasImage) {
            withImage++;
        } else {
            withoutImage++;
        }
    });

    return { total, withImage, withoutImage };
}

async function run() {
    console.log('--- Content Audit ---');

    try {
        const dailyUpdates = await countCollection('daily_updates', ['image', 'imageUrl']);
        console.log(`\nDaily Updates:`);
        console.log(`  Total: ${dailyUpdates.total}`);
        console.log(`  With Pictures: ${dailyUpdates.withImage}`);
        console.log(`  No Pictures: ${dailyUpdates.withoutImage}`);

        const articles = await countCollection('articles', ['image', 'imageUrl']);
        console.log(`\nBlog Articles:`);
        console.log(`  Total: ${articles.total}`);
        console.log(`  With Pictures: ${articles.withImage}`);
        console.log(`  No Pictures: ${articles.withoutImage}`);

        const events = await countCollection('events', ['image', 'imageUrl']);
        console.log(`\nEvents:`);
        console.log(`  Total: ${events.total}`);
        console.log(`  With Pictures: ${events.withImage}`);
        console.log(`  No Pictures: ${events.withoutImage}`);

    } catch (error) {
        console.error('Error running audit:', error);
    }
}

run();
