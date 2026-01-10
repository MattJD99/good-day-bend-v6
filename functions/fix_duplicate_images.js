const admin = require('firebase-admin');
const { generateImage } = require('./lib/imageGen');
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    const serviceAccount = require('./service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "good-day-bend-v6.firebasestorage.app"
    });
}
const db = admin.firestore();

async function fixDuplicateImages() {
    console.log('🚀 Starting Duplicate Image Fixer...');

    try {
        const snapshot = await db.collection('articles').get();
        if (snapshot.empty) {
            console.log('No articles found.');
            return;
        }

        const articles = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            articles.push({
                id: doc.id,
                title: data.title,
                topic: data.topic || data.title,
                imageUrl: data.imageUrl || data.image || 'NO_IMAGE'
            });
        });

        // Group by image URL
        const imageCounts = {};
        articles.forEach(article => {
            const url = article.imageUrl;
            if (url === 'NO_IMAGE') return;

            if (!imageCounts[url]) {
                imageCounts[url] = [];
            }
            imageCounts[url].push(article);
        });

        // Process duplicates
        for (const [url, group] of Object.entries(imageCounts)) {
            if (group.length > 1) {
                console.log(`\nFound ${group.length} articles using image: ${url}`);

                // Keep the first one as is, regenerate for the rest
                const [original, ...duplicates] = group;
                console.log(`✅ Keeping original: "${original.title}"`);

                for (const article of duplicates) {
                    console.log(`🔄 Regenerating for: "${article.title}"...`);

                    try {
                        const newImageUrl = await generateImage(article.topic);

                        if (newImageUrl) {
                            await db.collection('articles').doc(article.id).update({
                                imageUrl: newImageUrl,
                                image: newImageUrl // Update both fields just in case
                            });
                            console.log(`   Detailed Success: ${newImageUrl}`);
                        } else {
                            console.error(`   ❌ Failed to generate image for "${article.title}"`);
                        }

                        // Small delay to be nice to the API
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (err) {
                        console.error(`   ❌ Error fixing ${article.title}:`, err.message);
                    }
                }
            }
        }

        console.log('\n🎉 Duplicate Fixer Complete.');

    } catch (error) {
        console.error('Script failed:', error);
    }
}

// Check if running directly
if (require.main === module) {
    fixDuplicateImages();
}

module.exports = fixDuplicateImages;
