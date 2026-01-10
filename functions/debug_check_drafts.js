
const { db } = require('./lib/firebase');

async function checkDrafts() {
    const dates = ['2026-01-07', '2026-01-08'];

    console.log("Checking drafts for dates:", dates);

    for (const date of dates) {
        const snapshot = await db.collection('drafts')
            .where('publishDate', '==', date)
            .get();

        if (snapshot.empty) {
            console.log(`❌ No drafts found for ${date}`);
        } else {
            console.log(`✅ Found ${snapshot.size} drafts for ${date}:`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(` - ID: ${doc.id}, Title: ${data.title}, Status: ${data.status}, CreatedAt: ${data.createdAt}`);
            });
        }
    }
}

if (require.main === module) {
    checkDrafts().then(() => process.exit());
}
