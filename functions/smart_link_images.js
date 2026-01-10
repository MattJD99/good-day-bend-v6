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

async function smartLinkImages() {
    console.log("🚀 Starting Smart Image Linker...");

    // 1. Get all Daily Update Images from Storage
    console.log("   Fetching storage files...");
    const [files] = await bucket.getFiles({ prefix: 'blog-images/daily-' });

    // Map: 'YYYY-MM-DD' -> { url, timestamp }
    const imageMap = new Map();

    files.forEach(f => {
        // Filename: blog-images/daily-{TIMESTAMP}.jpg
        const match = f.name.match(/daily-(\d+)\.jpg/);
        if (match) {
            const timestamp = parseInt(match[1]);
            const dateObj = new Date(timestamp);

            // Format YYYY-MM-DD (Use simple ISO slice since we want UTC date from timestamp usually)
            // But wait, user likely is in US/Pacific. 
            // The daily ID "daily-2025-12-23" is likely local date.
            // The generated image timestamp is likely UTC or server time when created.
            // 2025-12-23T23:47:26Z is late in the day UTC, which corresponds to 2025-12-23 in Bend (PST is UTC-8).
            // So extracting YYYY-MM-DD from ISO string is safe.
            const dateKey = dateObj.toISOString().split('T')[0];

            // If we already have one for this day, keeps the latest one (largest timestamp)
            if (!imageMap.has(dateKey) || timestamp > imageMap.get(dateKey).timestamp) {
                imageMap.set(dateKey, {
                    url: `https://storage.googleapis.com/${bucket.name}/${f.name}`,
                    timestamp: timestamp,
                    name: f.name
                });
            }
        }
    });

    console.log(`   Found ${imageMap.size} unique days with images in storage.`);

    // 2. Get All Daily Updates (ID format: daily-YYYY-MM-DD)
    const updatesSnap = await db.collection('daily_updates').get();
    console.log(`   Found ${updatesSnap.size} daily update documents.`);

    let matchCount = 0;
    let updatesCount = 0;

    for (const doc of updatesSnap.docs) {
        const docId = doc.id; // e.g., "daily-2025-12-23"

        // Extract date from ID
        const dateMatch = docId.match(/daily-(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) {
            console.warn(`   ⚠️ Skipping doc with non-standard ID: ${docId}`);
            continue;
        }

        const dateKey = dateMatch[1];

        // Look for matching image
        if (imageMap.has(dateKey)) {
            const imageData = imageMap.get(dateKey);
            const currentImage = doc.data().image;

            // Check if update is needed
            if (currentImage !== imageData.url) {
                console.log(`   🔄 Updating ${docId}:`);
                console.log(`      Current: ${currentImage ? 'Has Image' : 'No Image'}`);
                console.log(`      New:     ${imageData.name}`);

                await doc.ref.update({
                    image: imageData.url,
                    bannerUrl: imageData.url
                });
                updatesCount++;
            } else {
                // console.log(`   ✓ ${docId} already has correct image.`);
            }
            matchCount++;
        } else {
            console.log(`   ❌ No image found in storage for ${docId} (Date: ${dateKey})`);
        }
    }

    console.log(`\n🎉 Process Complete.`);
    console.log(`   - Matched ${matchCount} documents to images.`);
    console.log(`   - Updated ${updatesCount} documents.`);
}

smartLinkImages();
