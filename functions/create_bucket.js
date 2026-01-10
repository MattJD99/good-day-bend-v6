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

async function createBucket() {
    const bucketName = "good-day-bend-v6.firebasestorage.app"; // Default convention
    console.log(`🚀 Attempting to create bucket: ${bucketName}...`);

    try {
        await storage.bucket(bucketName).create({
            location: 'us-central1', // Match function region
        });
        console.log(`✅ Bucket CREATED: ${bucketName}`);
    } catch (e) {
        console.error(`❌ Failed to create bucket: ${e.message}`);
        console.log("   Note: If this fails, the user might need to click 'Get Started' in Firebase Console > Storage.");
    }
}

createBucket();
