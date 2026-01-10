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

async function splitVerify() {
    console.log("🚀 Verifying Split Logic (Updates vs Blogs)...");

    // 1. Get Images
    const [files] = await bucket.getFiles({ prefix: 'blog-images/' });

    // Helper to parse TS
    const getTs = (name) => {
        const m = name.match(/(\d{13})/);
        return m ? parseInt(m[1]) : 0;
    };

    let dailyImages = [];
    let featureImages = [];

    files.forEach(f => {
        const ts = getTs(f.name);
        if (!ts) return;
        const url = `https://storage.googleapis.com/${bucket.name}/${f.name}`;

        if (f.name.includes('daily')) {
            dailyImages.push({ name: f.name, timestamp: ts, url });
        } else if (f.name.includes('feature') || f.name.includes('gen') || f.name.includes('nano')) {
            featureImages.push({ name: f.name, timestamp: ts, url });
        }
    });

    dailyImages.sort((a, b) => a.timestamp - b.timestamp);
    featureImages.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`Pool: ${dailyImages.length} Daily Images, ${featureImages.length} Feature/Gen/Nano Images.`);

    // 2. Get Articles
    const articlesSnap = await db.collection('articles').get();
    let updates = [];
    let blogs = [];

    articlesSnap.forEach(doc => {
        const data = doc.data();
        const item = {
            id: doc.id,
            title: data.title,
            timestamp: data.createdAt ? data.createdAt.toDate().getTime() : 0,
            currentUrl: data.imageUrl || ""
        };

        if (data.title.startsWith("Bend Update") || data.title.startsWith("Okay, I will")) {
            updates.push(item);
        } else {
            blogs.push(item);
        }
    });

    updates.sort((a, b) => a.timestamp - b.timestamp);
    blogs.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`Articles: ${updates.length} Updates, ${blogs.length} Blogs.`);

    // 3. Dry Run Match
    console.log("\n--- UPDATES MATCHING ---");
    for (let i = 0; i < Math.max(updates.length, dailyImages.length); i++) {
        const u = updates[i] || { title: "---" };
        const img = dailyImages[i] || { name: "---" };
        const isMatch = u.currentUrl && u.currentUrl.includes(img.name);
        const marker = isMatch ? "✅" : "❌";
        if (u.title !== "---") {
            console.log(`${marker} "${u.title.substr(0, 30)}..." -> ${img.name} ${isMatch ? "" : "(New)"}`);
        }
    }

    console.log("\n--- BLOGS MATCHING ---");
    for (let i = 0; i < Math.max(blogs.length, featureImages.length); i++) {
        const b = blogs[i] || { title: "---" };
        const img = featureImages[i] || { name: "---" };
        const isMatch = b.currentUrl && b.currentUrl.includes(img.name);
        const marker = isMatch ? "✅" : "❌";
        if (b.title !== "---") {
            console.log(`${marker} "${b.title.substr(0, 30)}..." -> ${img.name} ${isMatch ? "" : "(New)"}`);
        }
    }
}

splitVerify();
