const admin = require('firebase-admin');

// Initialize
try {
    const serviceAccount = require('./service-account.json');
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: "good-day-bend-v6.firebasestorage.app"
        });
    }
} catch (e) {
    console.warn("⚠️ Init warning:", e.message);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function listAssets() {
    console.log("🚀 Listing Assets...");

    // 1. List Images
    console.log("\n--- Storage Images (blog-images/) ---");
    const [files] = await bucket.getFiles({ prefix: 'blog-images/' });
    files.forEach(f => {
        console.log(`File: ${f.name}`);
    });
    console.log(`Total Images: ${files.length}`);

    // 2. List Daily Updates
    console.log("\n--- Daily Updates (Title & ID) ---");
    const snapshot = await db.collection('daily_updates').orderBy('publishedAt', 'desc').limit(20).get();
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id} | Title: "${data.title}" | Current Image: ${data.image ? 'Yes' : 'No'} (${data.image})`);
    });
}

listAssets();
