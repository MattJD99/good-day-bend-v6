const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function inspectSubmissions() {
    console.log("🔍 Inspecting 'submissions' collection...");
    const snapshot = await db.collection('submissions').limit(5).get();

    if (snapshot.empty) {
        console.log("⚠️ No submissions found.");
        return;
    }

    snapshot.forEach(doc => {
        console.log(`\n📄 ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

inspectSubmissions().catch(console.error);
