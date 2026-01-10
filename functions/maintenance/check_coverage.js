const { db } = require('../lib/firebase');

async function checkCoverage() {
    console.log("📊 Checking Event Coverage for next 14 days...");
    const today = new Date(); // Jan 6

    for (let i = 0; i < 15; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const isoDate = date.toISOString().split('T')[0];

        const snaps = await db.collection('events').where('eventDate', '==', isoDate).get();
        const count = snaps.size;

        // Check how many are flagged "isRealData"
        let realCount = 0;
        let imagesSafe = 0;
        snaps.forEach(doc => {
            const data = doc.data();
            if (data.isRealData) realCount++;
            if (data.image && (data.image.includes('firebasestorage') || data.image.includes('unsplash'))) {
                imagesSafe++;
            }
        });

        const status = count > 0 ? (realCount > 0 ? "✅" : "⚠️ FAKE") : "❌";
        console.log(`${isoDate}: ${status} Total: ${count} | Real: ${realCount} | Safe Images: ${imagesSafe}`);
    }
}

checkCoverage().then(() => process.exit(0));
