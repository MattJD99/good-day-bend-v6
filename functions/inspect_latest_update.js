const { db } = require('./lib/firebase');

async function inspectLatestUpdate() {
    console.log("🔍 Fetching latest Daily Update...");
    const snapshot = await db.collection('daily_updates')
        .orderBy('publishedAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.log("⚠️ No daily updates found.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log("🆔 ID:", doc.id);
        console.log("📅 Date:", data.publishedAt);
        console.log("📝 Title:", data.title);
        console.log("📄 HTML Content Length:", data.html ? data.html.length : 'N/A');
    });
}

inspectLatestUpdate().catch(console.error);
