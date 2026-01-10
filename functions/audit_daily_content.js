const { db } = require('./lib/firebase');
const CONFIG = require('./config');

async function audit() {
    try {
        console.log("Fetching daily updates...");
        const snapshot = await db.collection('daily_updates')
            .orderBy('publishedAt', 'desc')
            .limit(100)
            .get();

        if (snapshot.empty) {
            console.log("No daily updates found.");
            return;
        }

        const updates = [];
        const fallbackSet = new Set(CONFIG.FALLBACK_IMAGES);

        snapshot.forEach(doc => {
            const data = doc.data();
            const publishedAt = data.publishedAt ? (data.publishedAt.toDate ? data.publishedAt.toDate().toISOString() : data.publishedAt) : "N/A";
            const imageUrl = data.image || data.imageUrl || "MISSING";

            let isFallback = fallbackSet.has(imageUrl);

            // Also check for the specific culturalfoodies one even if config changed (hardcoded check)
            if (imageUrl.includes('culturalfoodies')) isFallback = true;


            if (isFallback) {
                updates.push({
                    id: doc.id,
                    title: data.title,
                    publishedAt: publishedAt,
                    image: imageUrl,
                    relevanceProblem: "Uses Fallback Image"
                });
            }
        });

        if (updates.length === 0) {
            console.log("No fallback images found in the last 100 updates.");
        } else {
            console.log("Found updates using fallback images:");
            console.log(JSON.stringify(updates, null, 2));
        }

    } catch (error) {
        console.error("Error auditing:", error);
    }
}

audit();
