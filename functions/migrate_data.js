const admin = require('firebase-admin');
const serviceAccount = require('../scripts/source_service_account.json');

// 1. Initialize SOURCE App (Old Project)
const sourceApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
}, 'sourceApp');

const sourceDb = sourceApp.firestore();

// 2. Initialize DESTINATION App (New Project - Current Env)
// We assume GOOGLE_APPLICATION_CREDENTIALS is set OR gcloud auth is active.
// Since we are running locally, we might need a key for the destination too if ADC isn't set.
// However, let's try assuming the environment (firebase-tools) provides context or use no-arg initialize
// which picks up default credentials.
const destApp = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'good-day-bend-v6'
}, 'destApp');

const destDb = destApp.firestore();

async function migrateCollection(collectionName) {
    console.log(`Migrating collection: ${collectionName}...`);
    const snapshot = await sourceDb.collection(collectionName).get();

    if (snapshot.empty) {
        console.log(`No documents found in ${collectionName}.`);
        return;
    }

    let count = 0;
    const batchSize = 100;
    let batch = destDb.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const docRef = destDb.collection(collectionName).doc(doc.id);

        batch.set(docRef, data);
        batchCount++;
        count++;

        if (batchCount >= batchSize) {
            await batch.commit();
            batch = destDb.batch();
            batchCount = 0;
            process.stdout.write(`.`);
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }
    console.log(`\nMigrated ${count} documents for ${collectionName}.`);
}

async function run() {
    try {
        console.log("Starting Migration...");

        // Collections to migrate
        const collections = ['events', 'articles', 'daily_updates'];

        for (const col of collections) {
            await migrateCollection(col);
        }

        console.log("Migration Complete!");
    } catch (error) {
        console.error("Migration Error:", error);
    }
}

run();
