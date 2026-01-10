const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function verifyData() {
    console.log("Checking 'events' collection...");
    try {
        // Check specific broken file metadata
        const bucket = admin.storage().bucket("good-day-bend-v6.firebasestorage.app");
        const file = bucket.file("blog-images/vertex-1767870048048.jpg");
        const [metadata] = await file.getMetadata();
        console.log("File Metadata:", metadata);
    } catch (error) {
        console.error("Error reading file metadata:", error);
    }
}

verifyData();
