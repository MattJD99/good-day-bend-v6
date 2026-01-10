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

async function fixDailyImages() {
    console.log("🚀 Starting Daily Update Image Fix...");

    // 1. Get all Daily Updates
    const updatesSnap = await db.collection('daily_updates')
        .orderBy('publishedAt', 'desc')
        .limit(50)
        .get();

    if (updatesSnap.empty) {
        console.log("No updates found.");
        return;
    }

    console.log(`Checking ${updatesSnap.size} updates...`);

    const fallbackSet = new Set(CONFIG.FALLBACK_IMAGES);
    let fixedCount = 0;

    for (const doc of updatesSnap.docs) {
        const data = doc.data();
        let needsFix = false;
        const currentImage = data.image || data.imageUrl || "";

        // Condition 1: Is using a Fallback Image?
        if (fallbackSet.has(currentImage)) {
            needsFix = true;
        }

        // Condition 2: Is using an AI-generated "daily-..." image?
        // These are the ones the user says "make no sense"
        // Also check if it's in the 'blog-images' folder which is where we store them
        if (currentImage.includes("daily-") && currentImage.includes("blog-images")) {
            needsFix = true;
        }

        // Condition 3: Missing image
        if (!currentImage) needsFix = true;

        if (!needsFix) {
            console.log(`Skipping ${doc.id} - Has custom/valid image.`);
            continue;
        }

        console.log(`\n🔧 Examining ${doc.id} ("${data.title}")...`);

        // Strategy: Look at 'relatedEvents' (array of titles)
        const relatedTitles = data.relatedEvents || [];

        if (relatedTitles.length === 0) {
            console.log("   -> No related events found. Cannot match.");
            continue;
        }

        // Find matches in EVENTS collection
        let candidateEvent = null;

        // Iterate through related titles to find the first one with a GOOD image
        for (const title of relatedTitles) {
            // Check if title is generic
            if (title.includes("Open Mic") || title.includes("Trivia") || title.includes("Happy Hour")) continue;

            const eventSnap = await db.collection('events').where('title', '==', title).limit(1).get();
            if (!eventSnap.empty) {
                const eventData = eventSnap.docs[0].data();
                const evtImg = eventData.image || eventData.imageUrl;

                // Check if event has an image AND it's not a fallback itself
                if (evtImg && !fallbackSet.has(evtImg)) {
                    candidateEvent = { title: eventData.title, image: evtImg };
                    break; // Found a good one, stop looking
                }
            }
        }

        // If no specific event found, try the generic ones as backup
        if (!candidateEvent) {
            for (const title of relatedTitles) {
                const eventSnap = await db.collection('events').where('title', '==', title).limit(1).get();
                if (!eventSnap.empty) {
                    const eventData = eventSnap.docs[0].data();
                    const evtImg = eventData.image || eventData.imageUrl;
                    if (evtImg && !fallbackSet.has(evtImg)) {
                        candidateEvent = { title: eventData.title, image: evtImg };
                        break;
                    }
                }
            }
        }

        if (candidateEvent) {
            console.log(`   ✅ MATCH FOUND: "${candidateEvent.title}"`);
            console.log(`   -> New Image: ${candidateEvent.image}`);

            // UPDATE
            await db.collection('daily_updates').doc(doc.id).update({
                image: candidateEvent.image,
                imageUrl: candidateEvent.image,
                imageSource: `Fixed from event: ${candidateEvent.title}`
            });
            fixedCount++;
        } else {
            console.log("   -> No matching events found in DB with valid images.");
        }
    }

    console.log(`\n🎉 Fix Complete. Updated ${fixedCount} daily updates.`);
}

fixDailyImages();
