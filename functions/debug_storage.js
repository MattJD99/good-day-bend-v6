const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize with the service account
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

async function debugStorage() {
    console.log("🚀 Starting STANDARD DEFAULT Storage Verification...");

    const targetBucketName = "good-day-bend-v6.firebasestorage.app"; // STANDARD DEFAULT
    console.log(`\n🎯 Testing Write to Target Bucket: ${targetBucketName}`);

    try {
        const bucket = storage.bucket(targetBucketName);
        const filename = `standard-debug-${Date.now()}.txt`;
        const file = bucket.file(`debug/${filename}`);

        await file.save("Standard Verification Content", {
            metadata: { contentType: 'text/plain' },
            public: true
        });

        console.log(`✅ Write Success! File saved: ${filename}`);

        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
        console.log(`🔗 Public URL: ${publicUrl}`);

        console.log("✅ Verification PASSED.");

    } catch (e) {
        console.error(`❌ Verification FAILED:`, e.message);
    }
}

debugStorage();
