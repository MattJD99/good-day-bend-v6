const admin = require('firebase-admin');

const fs = require('fs');
const path = require('path');
// Service Account for OLD project
const serviceAccountOld = JSON.parse(fs.readFileSync(path.join(__dirname, 'service-account.json.old'), 'utf8'));

// Initialize a separate app instance for the old project
const oldApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountOld),
    storageBucket: "good-day-bend.firebasestorage.app" // Guessing based on project ID
}, 'oldApp');

async function checkOldBucket() {
    console.log("🚀 Checking Old Bucket Access...");
    try {
        const bucket = oldApp.storage().bucket();
        const [files] = await bucket.getFiles({ maxResults: 5 }); // Just get a few to verify

        if (files.length === 0) {
            console.log("⚠️ Access successful, but bucket appears empty.");
        } else {
            console.log(`✅ Access successful! Found ${files.length} sample files:`);
            files.forEach(f => console.log(`   - ${f.name}`));
        }
    } catch (e) {
        console.error("❌ Failed to access old bucket:", e.message);
    }
}

checkOldBucket();
