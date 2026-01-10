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

// Configuration
const FALLBACK_DOMAIN = "visitbend.com"; // Identify fallback images by this domain

async function relinkImages() {
    console.log("🚀 Starting Image Re-Linker...");

    // 1. Get all files in 'blog-images/' (or root if migrated there)
    // The migration script put them in root or kept structure. The list showed 'blog-images/...'
    const [files] = await bucket.getFiles({ prefix: 'blog-images/' });
    console.log(`Found ${files.length} candidate images in storage.`);

    // Parse timestamps from filenames: daily-{TIMESTAMP}.jpg
    const fileMap = [];
    files.forEach(f => {
        const match = f.name.match(/daily-(\d+)\.jpg/);
        if (match) {
            fileMap.push({
                timestamp: parseInt(match[1]),
                url: `https://storage.googleapis.com/${bucket.name}/${f.name}`,
                name: f.name
            });
        }
    });

    fileMap.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
    console.log(`Parsed ${fileMap.length} 'daily-' images with timestamps.`);

    // 2. Get Daily Updates that use Fallback Images
    const updatesSnap = await db.collection('daily_updates').get(); // Get all to be safe, filter in memory
    const candidates = [];

    updatesSnap.forEach(doc => {
        const data = doc.data();
        if (data.image && data.image.includes(FALLBACK_DOMAIN)) {
            // This doc needs a real image
            candidates.push({
                id: doc.id,
                title: data.title,
                publishedAt: data.publishedAt ? data.publishedAt.toDate() : null,
                ref: doc.ref
            });
        }
    });

    console.log(`Found ${candidates.length} documents using Fallback Images.`);

    // 3. Match Logic
    let matchedCount = 0;

    for (const doc of candidates) {
        if (!doc.publishedAt) {
            console.warn(`⚠️ Doc ${doc.id} has no publishedAt. Skipping.`);
            continue;
        }

        const docTime = doc.publishedAt.getTime();
        console.log(`\n🔍 Looking for image for "${doc.title}" (${doc.publishedAt.toISOString()})`);

        // Find closest image file within a window (e.g., 1 hour = 3600000 ms)
        // Since generation happens just before save, the file timestamp should be slightly BEFORE or EQUAL to doc timestamp (or very close).
        // Actually, file timestamp is Date.now() during generation. Doc publishedAt is serverTimestamp() during save.
        // So they should be very close. File timestamp might be slightly older (seconds).

        let bestMatch = null;
        let minDiff = 12 * 60 * 60 * 1000; // 12 Hour window

        for (const file of fileMap) {
            const diff = Math.abs(docTime - file.timestamp);
            if (diff < minDiff) {
                minDiff = diff;
                bestMatch = file;
            }
        }

        if (bestMatch) {
            console.log(`   ✅ MATCH FOUND!`);
            console.log(`      File: ${bestMatch.name}`);
            console.log(`      Time Diff: ${Math.round(minDiff / 1000)} seconds`);
            console.log(`      New URL: ${bestMatch.url}`);

            // Update
            await doc.ref.update({
                image: bestMatch.url,
                bannerUrl: bestMatch.url // Updating this too just in case
            });
            console.log("   💾 Document Updated.");
            matchedCount++;
        } else {
            console.log("   ❌ No close match found.");
        }
    }

    console.log(`\n🎉 Re-linking Complete. Updated ${matchedCount} documents.`);
}

relinkImages();
