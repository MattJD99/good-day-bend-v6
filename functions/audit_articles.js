const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function auditArticles() {
    console.log("Auditing articles...");
    const snapshot = await db.collection('articles').orderBy('createdAt', 'desc').get();

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`  Title: ${data.title}`);
        console.log(`  Image: ${data.image}`);
        console.log(`  ImageUrl: ${data.imageUrl}`);
        if (data.createdAt) {
            console.log(`  CreatedAt: ${data.createdAt.toDate().toISOString()}`);
        }
        console.log('---');
    });
}

auditArticles();
