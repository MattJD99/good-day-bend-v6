const { db } = require('../functions/lib/firebase');

async function verifyArticles() {
    console.log("📰 Verifying 'articles' collection...");
    try {
        // Fetch most recent 5 articles
        const snapshot = await db.collection('articles')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            console.log("❌ No articles found.");
            // Try fetching without sort in case index is missing
            const fallbackSnap = await db.collection('articles').limit(5).get();
            if (fallbackSnap.empty) {
                console.log("❌ Definitely no articles found (fallback check).");
            } else {
                console.log(`⚠️ Articles found but 'createdAt' sort failed. Found ${fallbackSnap.size} docs.`);
            }
        } else {
            console.log(`✅ Found ${snapshot.size} recent articles.`);
            snapshot.forEach(doc => {
                const d = doc.data();
                console.log(` - [${d.createdAt ? new Date(d.createdAt.seconds * 1000).toISOString() : 'No Date'}] ${d.title}`);
            });
        }
    } catch (e) {
        console.error("❌ Error reading Articles:", e);
    }
}

verifyArticles();
