const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 1. Initialize Default App (New Project)
const serviceAccountNew = require('./service-account.json');
const newApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountNew),
    storageBucket: "good-day-bend-v6.firebasestorage.app"
});
const db = newApp.firestore();
const newBucket = newApp.storage().bucket();

// 2. Initialize Old App (Source)
const serviceAccountOld = JSON.parse(fs.readFileSync(path.join(__dirname, 'service-account.json.old'), 'utf8'));
const oldApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccountOld),
    storageBucket: "good-day-bend.firebasestorage.app"
}, 'oldApp');
const oldBucket = oldApp.storage().bucket();

async function migrate() {
    console.log("🚀 Starting Image Migration...");
    console.log(`Source: ${oldBucket.name}`);
    console.log(`Dest:   ${newBucket.name}`);

    // A. Transfer Files
    console.log("\n📦 Phase 1: File Transfer");
    const [files] = await oldBucket.getFiles();
    console.log(`Found ${files.length} files to check/migrate.`);

    const urlMap = new Map(); // Old URL -> New URL

    for (const file of files) {
        const name = file.name;

        // Skip folders
        if (name.endsWith('/')) continue;

        console.log(`\nProcessing: ${name}`);
        const newFile = newBucket.file(name);
        const [exists] = await newFile.exists();

        if (exists) {
            console.log("   -> Already exists in destination. Skipping upload.");
        } else {
            console.log("   -> Downloading...");
            const [buffer] = await file.download();

            console.log("   -> Uploading to new bucket...");
            await newFile.save(buffer, {
                metadata: {
                    contentType: file.metadata.contentType,
                    metadata: {
                        firebaseStorageDownloadTokens: uuidv4()
                    }
                },
                public: true
            });

            // Make public to ensure access
            await newFile.makePublic();
            console.log("   -> Transfer Complete.");
        }

        // Construct Mapping
        // Old formats could be diverse, but typically:
        // https://storage.googleapis.com/good-day-bend.firebasestorage.app/path/to/file
        // https://firebasestorage.googleapis.com/v0/b/good-day-bend.firebasestorage.app/o/...

        const oldPublicUrl = `https://storage.googleapis.com/${oldBucket.name}/${name}`;
        const newPublicUrl = `https://storage.googleapis.com/${newBucket.name}/${name}`;

        // Map simplified path logic too if needed, but let's stick to full replacement strings if we verify them.
        urlMap.set(oldPublicUrl, newPublicUrl);

        // Also map the bucket usage in general if easy
        // Let's just store the fact we have this new URL for this path.
    }

    // B. Update Database
    console.log("\n💾 Phase 2: Database Links Update");

    // We will do a generic text replacement on fields that look like images
    const collections = ['articles', 'events', 'daily_updates'];
    const fieldsToCheck = ['image', 'imageUrl', 'bannerUrl', 'generatedImage'];

    // The pattern to look for
    const oldDomain = "good-day-bend.firebasestorage.app";
    const newDomain = "good-day-bend-v6.firebasestorage.app";

    for (const colName of collections) {
        console.log(`\nScanning collection: ${colName}...`);
        const snapshot = await db.collection(colName).get();
        let updatedCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            let needsUpdate = false;
            let updates = {};

            for (const field of fieldsToCheck) {
                if (data[field] && typeof data[field] === 'string' && data[field].includes(oldDomain)) {
                    console.log(`   [${doc.id}] Found old link in '${field}': ${data[field]}`);
                    updates[field] = data[field].replace(oldDomain, newDomain);

                    // Also handle the case where it might be the firebase storage api format
                    // e.g. firebasestorage.googleapis.com/v0/b/OLD/o/...
                    // Replacing just the bucket name part in the URL usually works for standard Google storage URLs.

                    needsUpdate = true;
                }
            }

            // Also check for 'content' or 'rawHTML' fields that might contain embedded images
            const stringFields = ['content', 'rawHTML', 'description'];
            for (const field of stringFields) {
                if (data[field] && typeof data[field] === 'string' && data[field].includes(oldDomain)) {
                    console.log(`   [${doc.id}] Found old link embedded in '${field}'`);
                    updates[field] = data[field].split(oldDomain).join(newDomain);
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await doc.ref.update(updates);
                console.log(`   ✅ Updated document ${doc.id}`);
                updatedCount++;
            }
        }
        console.log(`Collection ${colName}: Updated ${updatedCount} documents.`);
    }

    console.log("\n✅ Migration Complete.");
}

migrate();
