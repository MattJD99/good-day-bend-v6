
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function resetDraft() {
    const draftId = 'draft-1767301696532';
    console.log(`Resetting status for ${draftId}...`);

    await db.collection('drafts').doc(draftId).update({
        status: 'pending',
        publishedAt: admin.firestore.FieldValue.delete() // Remove the published timestamp
    });

    console.log("✅ Draft reset to 'pending'. User can now click Approve again.");
}

resetDraft().catch(console.error);
