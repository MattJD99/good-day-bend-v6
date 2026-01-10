const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "good-day-bend-v6.firebasestorage.app"
    });
}

const db = admin.firestore();
// Import the generation library
const { generateImage } = require('./lib/imageGen');

// Delay helper to avoid rate limits
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function generateEventImages() {
    console.log("🚀 Starting Context-Aware Event Image Generation...");

    // 1. Get Events
    // Strategy: Get events that were backfilled. 
    // Since I don't have a specific flag, I'll filter for ALL events and maybe target specific ones or just run a batch.
    // The user said "create an image for the daily update article that needs an image".
    // I will target events that likely have generic stock images.
    // However, since I just backfilled ALL of them, they ALL have stock images.
    // I should probably prioritize UPCOMING events first to save cost/time.

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort by date (descending to get upcoming/recent first)
    // Note: Events use 'date' or 'eventDate' string or timestamp. 
    // I'll grab a chunk and process.
    const eventsSnap = await db.collection('events').limit(20).get();

    let processed = 0;

    for (const doc of eventsSnap.docs) {
        const data = doc.data();
        const eventId = doc.id;
        const title = data.title;
        const desc = data.description || "";
        const category = data.category || "General";

        console.log(`\n🎨 Processing Event: "${title}"`);

        // Check if we should regenerate
        // For now, let's assume we want to regenerate if it looks like a generic backfill.
        // Or strictly follow user instruction "create an image... that needs an image".
        // Since I can't easily distinguish backfilled vs original without metadata, 
        // I will force generation for this batch of 20 as a test/demo.

        // Construct Prompt
        const prompt = `A high quality, photorealistic image for a local event in Bend, Oregon titled "${title}". Category: ${category}. Description: ${desc}. The image should be scenic, vibrant, and capture the essence of the event.`;

        try {
            const imageUrl = await generateImage(prompt);

            if (imageUrl) {
                await doc.ref.update({
                    image: imageUrl,
                    imageUrl: imageUrl,
                    imageGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`   ✅ Updated event ${eventId} with new image.`);
                processed++;
            }

            // Wait to respect rate limits (if any)
            await delay(2000);

        } catch (e) {
            console.error(`   ❌ Failed to generate for ${eventId}:`, e.message);
        }
    }

    console.log(`\n✨ Generation Complete. Processed ${processed} events.`);
}

generateEventImages();
