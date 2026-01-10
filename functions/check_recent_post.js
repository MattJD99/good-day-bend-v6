
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkPost() {
    // Determine the most recent daily update ID to check
    const snap = await db.collection('daily_updates')
        .orderBy('publishedAt', 'desc')
        .limit(1)
        .get();

    if (snap.empty) {
        console.log("No daily updates found.");
        return;
    }

    const doc = snap.docs[0];
    const data = doc.data();

    console.log(`\n--- Most Recent Daily Update (${doc.id}) ---`);
    console.log("Title:", data.title);
    console.log("Image Field:", data.image);
    console.log("ImageUrl Field:", data.imageUrl);
    console.log("Content exists:", !!data.content);
    console.log("HTML exists:", !!data.html);
    console.log("Raw Content Snippet:", data.content ? data.content.substring(0, 150) : "N/A");
}

checkPost().catch(console.error);
