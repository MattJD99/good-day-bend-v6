
const { db } = require('./lib/firebase');

async function checkEvents() {
    const dates = ['2026-01-07', '2026-01-08'];

    console.log("Checking events for dates:", dates);

    for (const date of dates) {
        const snapshot = await db.collection('events')
            .where('eventDate', '==', date)
            .get();

        if (snapshot.empty) {
            console.log(`❌ No events found for ${date}`);
        } else {
            console.log(`✅ Found ${snapshot.size} events for ${date}`);
        }
    }
}

if (require.main === module) {
    checkEvents().then(() => process.exit());
}
