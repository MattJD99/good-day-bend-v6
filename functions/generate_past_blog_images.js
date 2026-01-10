const { db } = require('./lib/firebase');
const { generateImage } = require('./lib/imageGen');

async function main() {
    console.log("🚀 Starting Image Generation for last 5 articles...");

    try {
        // 1. Fetch last 5 articles
        const articlesSnap = await db.collection('articles')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (articlesSnap.empty) {
            console.log("No articles found.");
            return;
        }

        console.log(`Found ${articlesSnap.size} articles.`);

        for (const doc of articlesSnap.docs) {
            const data = doc.data();
            const topic = data.topic || data.title;
            const docId = doc.id;

            console.log(`\n-----------------------------------`);
            console.log(`Processing: "${data.title}" (ID: ${docId})`);

            if (!topic) {
                console.log("⚠️ No topic/title found, skipping.");
                continue;
            }

            console.log(`🎨 Generating image for prompt: "${topic}"...`);

            try {
                const imageUrl = await generateImage(topic);

                if (imageUrl) {
                    console.log(`✅ Image generated: ${imageUrl}`);

                    // Update Firestore
                    await db.collection('articles').doc(docId).update({
                        imageUrl: imageUrl
                    });
                    console.log("💾 Updated Firestore record.");
                } else {
                    console.error("❌ Failed to generate image (no URL returned).");
                }
            } catch (err) {
                console.error(`❌ Error generating/saving image for ${docId}:`, err.message);
            }
        }

        console.log("\n-----------------------------------");
        console.log("✅ All done.");

    } catch (error) {
        console.error("Script failed:", error);
    }
}

main();
