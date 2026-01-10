const { db } = require('../lib/firebase');

async function inspectEvents(dateStr) {
    console.log(`🕵️‍♀️ Inspecting Events for: ${dateStr}`);

    // Query events for the specific date
    const snapshot = await db.collection('events')
        .where('eventDate', '==', dateStr)
        .get();

    if (snapshot.empty) {
        console.log("❌ No events found for this date.");
        return;
    }

    console.log(`✅ Found ${snapshot.size} events.`);

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n------------------------------------------------`);
        console.log(`EVENT: ${data.title}`);
        console.log(`ID: ${doc.id}`);
        console.log(`REAL DATA Flag: ${data.isRealData ? '✅ TRUE' : '❌ FALSE (Legacy?)'}`);
        console.log(`Sorce URL: ${data.sourceUrl || 'N/A'}`);
        console.log(`Created At: ${data.scoutedAt ? data.scoutedAt.toDate() : 'Unknown'}`);
    });
}

// Run for Jan 5, 2026 as requested by user
if (require.main === module) {
    inspectEvents('2026-01-05');
}

module.exports = inspectEvents;
