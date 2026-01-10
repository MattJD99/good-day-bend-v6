const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "good-day-bend-v6.firebasestorage.app"
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Configuration
const FALLBACK_DOMAIN = "visitbend.com";

async function relinkEventImages() {
    console.log("🚀 Starting Event Image Re-Linker...");

    // 1. Get all 'daily-' images
    // Note: The daily updates images seem to be candidates for these events if they were generated during the same scout run.
    const [files] = await bucket.getFiles({ prefix: 'blog-images/' });
    console.log(`Found ${files.length} candidate images in storage.`);

    // Parse timestamps: daily-{TIMESTAMP}.jpg
    const fileMap = [];
    files.forEach(f => {
        // Match daily- OR feature- (just in case events used feature images)
        // Actually, looking at the audit, events are generic. Let's look for any generic image generated around that time.
        // The list showed 'daily-' images.
        const match = f.name.match(/daily-(\d+)\.jpg/);
        if (match) {
            fileMap.push({
                timestamp: parseInt(match[1]),
                url: `https://storage.googleapis.com/${bucket.name}/${f.name}`,
                name: f.name
            });
        }
    });

    fileMap.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`Parsed ${fileMap.length} 'daily-' images.`);

    // 2. Get Events with missing or broken images
    const eventsSnap = await db.collection('events').get();
    const candidates = [];

    eventsSnap.forEach(doc => {
        const data = doc.data();
        const currentImage = data.image || data.imageUrl;
        const isStorage = currentImage && (currentImage.includes("firebasestorage.googleapis.com") || currentImage.includes("firebasestorage.app"));

        // Match if empty, fallback, or NOT our storage
        if (!currentImage || currentImage.includes(FALLBACK_DOMAIN) || !isStorage) {
            candidates.push({
                id: doc.id,
                title: data.title,
                // Use createdAt for matching. 
                // Note: Events might have been scraped, so createdAt is when we saved them.
                // Image generation likely happened just before saving.
                createdAt: data.createdAt ? data.createdAt.toDate() : null,
                ref: doc.ref
            });
        }
    });

    console.log(`Found ${candidates.length} events needing images.`);

    // 3. Match Logic
    let matchedCount = 0;

    for (const doc of candidates) {
        if (!doc.createdAt) {
            continue;
        }

        const docTime = doc.createdAt.getTime();
        console.log(`\n🔍 Looking for image for "${doc.title}" (${doc.createdAt.toISOString()})`);

        let bestMatch = null;
        let minDiff = 24 * 60 * 60 * 1000; // 24 Hour window (Scouts might run long or batch save)

        for (const file of fileMap) {
            // File timestamp is when it was generated (client side param in filename).
            // Doc createdAt is server time.
            // Should be very close.
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

            await doc.ref.update({
                image: bestMatch.url,
                imageUrl: bestMatch.url,
                // Also set a thumbnail if we want, but main image is key
            });
            console.log("   💾 Event Updated.");
            matchedCount++;
        } else {
            console.log("   ❌ No close match found.");
        }
    }

    console.log(`\n🎉 Event Re-linking Complete. Updated ${matchedCount} events.`);
}

relinkEventImages();
