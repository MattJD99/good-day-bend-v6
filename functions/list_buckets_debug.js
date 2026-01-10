const admin = require('firebase-admin');

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

async function listBuckets() {
    console.log("🚀 Listing Buckets...");

    try {
        const [buckets] = await storage.getBuckets();
        console.log("Found buckets:");
        buckets.forEach(bucket => {
            console.log(`- ${bucket.name}`);
        });

        if (buckets.length === 0) {
            console.log("⚠️ No buckets found for this project.");
        }
    } catch (e) {
        console.error("❌ Failed to list buckets:", e.message);
    }
}

listBuckets();
