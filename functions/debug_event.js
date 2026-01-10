const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function findEvent() {
    const title = "Sunday Movie Matinee";
    console.log(`Searching for "${title}"...`);

    // Search is tricky without exact match index sometimes, but let's try reading all or query
    const snap = await db.collection('events').where('title', '==', title).get();

    if (snap.empty) {
        console.log("No exact match. listing first 20 events to see titles...");
        const all = await db.collection('events').limit(20).get();
        all.forEach(d => console.log(d.data().title));
    } else {
        snap.forEach(doc => {
            console.log("Found:", doc.id);
            console.log(doc.data());
        });
    }
}

findEvent();
