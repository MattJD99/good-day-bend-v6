const admin = require('firebase-admin');
const CONFIG = require('./config');

// Initialize Firebase
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

const BAD_IMAGE_URL = "https://storage.googleapis.com/good-day-bend-v6.firebasestorage.app/blog-images/nano-1766495800695.jpg";
const FALLBACK_URL = CONFIG.FALLBACK_IMAGES[0];
// Use Sunriver image for the daily update fix
const GOOD_IMAGE_URL = "https://storage.googleapis.com/good-day-bend-v6.firebasestorage.app/blog-images/nano-1766495692679.jpg";

async function fixBadImage() {
    console.log("🚀 Fixing Bad Image References...");

    // 1. Fix Events
    const eventsSnap = await db.collection('events').where('image', '==', BAD_IMAGE_URL).get();
    const eventsSnap2 = await db.collection('events').where('imageUrl', '==', BAD_IMAGE_URL).get();

    const docsToFix = new Map();
    eventsSnap.forEach(d => docsToFix.set(d.id, d.ref));
    eventsSnap2.forEach(d => docsToFix.set(d.id, d.ref));

    console.log(`Found ${docsToFix.size} events using the bad image.`);

    for (const [id, ref] of docsToFix) {
        console.log(`-> Fixing Event ${id}`);
        await ref.update({
            image: FALLBACK_URL,
            imageUrl: FALLBACK_URL
        });
    }

    // 2. Fix the Daily Update explicitly
    console.log("\n🔧 Fixing Daily Update 'daily-2025-12-23'...");
    await db.collection('daily_updates').doc('daily-2025-12-23').update({
        image: GOOD_IMAGE_URL,
        imageUrl: GOOD_IMAGE_URL,
        imageSource: "Manual Fix (Sunriver Resort Image)"
    });

    console.log("✅ Fixed daily-2025-12-23 to use Sunriver image.");
}

fixBadImage();
