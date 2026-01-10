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

const FALLBACK_DOMAIN = "visitbend.com";

async function backfillEventImages() {
    console.log("🚀 Starting Event Image Backfill...");

    // 1. Get all Stock Images
    // We'll use all valid images found in 'blog-images/'
    const [files] = await bucket.getFiles({ prefix: 'blog-images/' });
    const stockImages = [];

    files.forEach(f => {
        const name = f.name;
        // Include daily-, feature-, and even gen- images if they are images
        if ((name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp'))) {
            stockImages.push(`https://storage.googleapis.com/${bucket.name}/${name}`);
        }
    });

    console.log(`Found ${stockImages.length} stock images to cycle through.`);

    // 2. Scan Events
    const eventsSnap = await db.collection('events').get();
    let updatedCount = 0;

    // Shuffle arrays helper
    const shuffleCache = [...stockImages].sort(() => 0.5 - Math.random());
    let stockIndex = 0;

    const updates = [];

    eventsSnap.forEach(doc => {
        const data = doc.data();
        const currentImage = data.image || data.imageUrl;
        const isStorage = currentImage && (currentImage.includes("firebasestorage.googleapis.com") || currentImage.includes("firebasestorage.app"));

        // Update if missing, fallback, or not storage
        if (!currentImage || currentImage.includes(FALLBACK_DOMAIN) || !isStorage) {

            // Pick next image
            const newImage = shuffleCache[stockIndex % shuffleCache.length];
            stockIndex++;

            updates.push(doc.ref.update({
                image: newImage,
                imageUrl: newImage
            }));
            updatedCount++;
        }
    });

    console.log(`Found ${updatedCount} events needing backfill.`);

    // Execute all updates
    // Since we might have hundreds, we should batch them or use Promise.all in chunks
    // Firestore batch limit is 500

    const BATCH_SIZE = 400;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const chunk = updates.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i} to ${Math.min(i + BATCH_SIZE, updates.length)}...`);
        await Promise.all(chunk);
    }

    console.log(`\n🎉 Backfill Complete. Updated ${updatedCount} events.`);
}

backfillEventImages();
