const admin = require('firebase-admin');

try {
    const serviceAccount = require('./service-account.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (e) {
    console.error("❌ Failed to load service-account.json:", e.message);
    process.exit(1);
}

const storage = admin.storage();

async function createCustomBucket() {
    const bucketName = "good-day-bend-v6-media";
    console.log(`🚀 Attempting to create custom bucket: ${bucketName}...`);

    try {
        await storage.bucket(bucketName).create({
            location: 'us-central1',
        });
        console.log(`✅ Custom Bucket CREATED: ${bucketName}`);

        // Test Write
        const file = storage.bucket(bucketName).file('test.txt');
        await file.save('Hello World', { public: true });
        console.log(`✅ Write Test Success: ${file.publicUrl()}`);

    } catch (e) {
        console.error(`❌ Failed to create/write custom bucket: ${e.message}`);
    }
}

createCustomBucket();
