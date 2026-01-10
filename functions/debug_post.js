
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function debugPost() {
    const brokenPostId = 'NHJyszDfmzqoBDXImPap';
    const draftId = 'draft-1767301696532';

    console.log(`\n--- Daily Update (${brokenPostId}) ---`);
    const postDoc = await db.collection('daily_updates').doc(brokenPostId).get();
    if (postDoc.exists) console.log(JSON.stringify(postDoc.data(), null, 2));
    else console.log("❌ Post Found");

    console.log(`\n--- Draft (${draftId}) ---`);
    const draftDoc = await db.collection('drafts').doc(draftId).get();
    if (draftDoc.exists) console.log(JSON.stringify(draftDoc.data(), null, 2));
    else console.log("❌ Draft Not Found");
}

debugPost().catch(console.error);
