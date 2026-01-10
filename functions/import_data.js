const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize DESTINATION App (New Project - Current Env)
// Uses Application Default Credentials (authentication must be active)
// OR behaves as the default app if running in a context that allows it.
const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'good-day-bend-v6'
});

const db = app.firestore();

async function importData(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        console.error("Invalid JSON format.");
        return;
    }

    // Expected Format: { "collectionName": { "docId": { ...data... } } } 
    // OR Array format: { "collectionName": [ { id: "...", ... } ] }
    // We will attempt to detect.

    // If it's a raw export from Firestore, structure might be complex. 
    // This script assumes a simplified JSON structure like:
    // { "articles": [...], "events": [...] }

    for (const [collectionName, documents] of Object.entries(data)) {
        console.log(`Importing ${collectionName}...`);

        let batch = db.batch();
        let count = 0;
        let batchCount = 0;

        const docsArray = Array.isArray(documents) ? documents : Object.values(documents);

        for (const docData of docsArray) {
            // Determine ID: docData.id or auto-gen
            const docId = docData.id || docData._id || db.collection(collectionName).doc().id;

            // Clean data (remove ID from body if needed, or keep it)
            // Ensure timestamps are handled if they are strings

            const docRef = db.collection(collectionName).doc(docId);
            batch.set(docRef, docData, { merge: true });

            count++;
            batchCount++;

            if (batchCount >= 100) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }
        console.log(`Imported ${count} docs into ${collectionName}.`);
    }
}

// Check arguments
const args = process.argv.slice(2);
if (args.length > 0) {
    importData(args[0]);
} else {
    console.log("Usage: node import_data.js <path-to-json-file>");
}
