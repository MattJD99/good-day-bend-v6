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

async function reassignImages() {
    console.log("🚀 Reassigning Blog/Update Images Chronologically...");

    // 1. Get Images
    const [files] = await bucket.getFiles({ prefix: 'blog-images/' });
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
            ref: doc.ref
        };

        if (data.title.startsWith("Bend Update") || data.title.startsWith("Okay, I will")) {
            updates.push(item);
        } else {
            blogs.push(item);
        }
    });

    updates.sort((a, b) => a.timestamp - b.timestamp);
    blogs.sort((a, b) => a.timestamp - b.timestamp);

    // 3. Apply Updates
    console.log(`\n--- Processing ${updates.length} Updates ---`);
    for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        if (i < dailyImages.length) {
            const img = dailyImages[i];
            console.log(`Updating "${update.title.substr(0, 30)}..." -> ${img.name}`);
            await update.ref.update({
                imageUrl: img.url,
                image: img.url
            });
        } else {
            console.warn(`⚠️ No daily image available for update: "${update.title}"`);
        }
    }

    console.log(`\n--- Processing ${blogs.length} Blogs ---`);
    for (let i = 0; i < blogs.length; i++) {
        const blog = blogs[i];
        if (i < featureImages.length) {
            const img = featureImages[i];
            console.log(`Updating "${blog.title.substr(0, 30)}..." -> ${img.name}`);
            await blog.ref.update({
                imageUrl: img.url,
                image: img.url
            });
        } else {
            console.warn(`⚠️ No feature image available for blog: "${blog.title}"`);
        }
    }

    console.log("\nmake check✅ Done.");
}

reassignImages();
