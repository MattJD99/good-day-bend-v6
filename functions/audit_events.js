const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function auditEvents() {
    console.log("Auditing events...");
    const snapshot = await db.collection('events').orderBy('date', 'desc').limit(20).get(); // events usually use 'date' or 'eventDate'

    // If 'date' fails, try just getting latest added
    if (snapshot.empty) {
        console.log("No events found with 'date' sort, trying default...");
        const snap2 = await db.collection('events').limit(20).get();
        snap2.forEach(logEvent);
    } else {
        snapshot.forEach(logEvent);
    }
}

function logEvent(doc) {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Image: ${data.image}`);
    console.log(`  ImageUrl: ${data.imageUrl}`);

    // Format Date
    if (data.date && data.date.toDate) {
        console.log(`  Date (field): ${data.date.toDate().toISOString()}`);
    } else {
        console.log(`  Date (field): ${data.date}`);
    }

    // Check CreatedAt
    if (data.createdAt && data.createdAt.toDate) {
        console.log(`  CreatedAt: ${data.createdAt.toDate().toISOString()}`);
    } else {
        console.log(`  CreatedAt: ${data.createdAt}`);
    }
    console.log('---');
}

auditEvents();
