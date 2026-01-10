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

async function guessBucket() {
    console.log("🚀 Guessing Buckets...");

    // Potentials
    const candidates = [
        "good-day-bend-v6.appspot.com",
        "good-day-bend-v6.firebasestorage.app", // This one failed before
        "good-day-bend.appspot.com",           // Old project
        "good-day-bend.firebasestorage.app"    // Old project
    ];

    for (const name of candidates) {
        try {
            console.log(`Testing: ${name}`);
            const bucket = storage.bucket(name);
            const [exists] = await bucket.exists();
            if (exists) {
                console.log(`✅ Bucket EXISTS: ${name}`);
            } else {
                console.log(`❌ Bucket does not exist: ${name}`);
            }
        } catch (e) {
            console.log(`❌ Permission/Error for ${name}: ${e.message}`);
        }
    }
}

guessBucket();
