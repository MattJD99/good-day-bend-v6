const { db } = require('../functions/lib/firebase');

async function verifyFavorites() {
    console.log("🕵️‍♀️ Verifying 'favorites' metadata...");
    try {
        const snapshot = await db.collection('favorites').get();
        if (snapshot.empty) {
            console.log("❌ No documents found.");
        } else {
            console.log(`✅ Found ${snapshot.size} documents.`);
            snapshot.forEach(doc => {
                const d = doc.data();
                console.log(`\n🏢 ${d.name}`);
                console.log(`   Cat: ${d.category}`);
                console.log(`   ⭐: ${d.rating} (${d.reviews})`);
                console.log(`   Add: ${d.address}`);
                console.log(`   Img: ${d.image}`);
            });
        }
    } catch (e) {
        console.error("❌ Error reading Firestore:", e);
    }
}

verifyFavorites();
