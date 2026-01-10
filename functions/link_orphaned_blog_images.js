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
const FALLBACK_DOMAIN = "visitbend.com";

async function relinkBlogImages() {
    console.log("🚀 Starting Blog Image Re-Linker...");

    // 1. Get all 'feature-' images
    const [files] = await bucket.getFiles({ prefix: 'blog-images/' });
    console.log(`Found ${files.length} candidate images in storage.`);

    // Parse timestamps: feature-{TIMESTAMP}.jpg
    const fileMap = [];
    files.forEach(f => {
        const match = f.name.match(/feature-(\d+)\.jpg/);
        if (match) {
            fileMap.push({
                timestamp: parseInt(match[1]),
                url: `https://storage.googleapis.com/${bucket.name}/${f.name}`,
                name: f.name
            });
        }
    });

    fileMap.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`Parsed ${fileMap.length} 'feature-' images.`);

    // Track assigned images to enforce 1-to-1 mapping
    const assignedImageNames = new Set();

    // 2. Get Articles that use Fallback Images (or broken links)
    const articlesSnap = await db.collection('articles').get();
    const candidates = [];

    articlesSnap.forEach(doc => {
        const data = doc.data();
        // Check for fallback domain OR missing image OR missing imageUrl
        // Often 'imageUrl' is the field for blogs, sometimes 'image'
        const currentImage = data.imageUrl || data.image || "";

        // We match if:
        // - It uses the fallback domain
        // - OR it is empty/undefined
        // - OR it points to the OLD domain (though migration script should have fixed this, maybe some were missed if field names differed)

        const isStorage = currentImage.includes("firebasestorage.googleapis.com") || currentImage.includes("firebasestorage.app");

        // Match if empty, fallback, or NOT our storage (external links that might be broken)
        if (!currentImage || currentImage.includes(FALLBACK_DOMAIN) || !isStorage) {
            candidates.push({
                id: doc.id,
                title: data.title,
                createdAt: data.createdAt ? data.createdAt.toDate() : null, // Blogs usually use createdAt
                ref: doc.ref
            });
        }
    });

    console.log(`Found ${candidates.length} articles needing images.`);

    // 3. Match Logic
    let matchedCount = 0;

    for (const doc of candidates) {
        if (!doc.createdAt) {
            console.warn(`⚠️ Article ${doc.id} has no createdAt. Skipping.`);
            continue;
        }

        const docTime = doc.createdAt.getTime();
        console.log(`\n🔍 Looking for image for "${doc.title}" (${doc.createdAt.toISOString()})`);

        let bestMatch = null;
        let minDiff = 12 * 60 * 60 * 1000; // 12 Hour window

        for (const file of fileMap) {
            const diff = Math.abs(docTime - file.timestamp);
            if (diff < minDiff) {
                minDiff = diff;
                bestMatch = file;
            }
        }

        if (bestMatch && !assignedImageNames.has(bestMatch.name)) {
            console.log(`   ✅ MATCH FOUND!`);
            console.log(`      File: ${bestMatch.name}`);
            console.log(`      Time Diff: ${Math.round(minDiff / 1000)} seconds`);
            console.log(`      New URL: ${bestMatch.url}`);

            await doc.ref.update({
                imageUrl: bestMatch.url,
                image: bestMatch.url
            });
            console.log("   💾 Article Updated.");

            // Mark as assigned so it's not reused
            assignedImageNames.add(bestMatch.name);
            matchedCount++;
        } else {
            console.log("   ❌ No unique match found.");
        }
    }

    console.log(`\n🎉 Blog Re-linking Complete. Updated ${matchedCount} articles.`);
}

relinkBlogImages();
