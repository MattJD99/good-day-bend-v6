const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "good-day-bend-v6.firebasestorage.app"
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const ARTIFACT_DIR = "/Users/md/.gemini/antigravity/brain/3e564c04-031f-4b96-8f78-1884e15ac4d3";

// Map Titles to partial filenames (or just regex match)
const MAPPING = [
    { title: "Winter Operations: Alpine Skiing & Snowboarding", filePrefix: "skiing_event" },
    { title: "Sunday Movie Matinee", filePrefix: "movie_matinee" },
    { title: "Raptors of the Desert Sky Presentation", filePrefix: "raptors_presentation" },
    { title: "Open Mic Night", filePrefix: "open_mic" },
    { title: "NFL Sunday Football Viewing (Week 18)", filePrefix: "nfl_viewing" },
    { title: "Live Acoustic Music Sundays", filePrefix: "acoustic_music" }
];

async function uploadAndLink() {
    console.log("🚀 Starting Manual Image Upload & Link...");

    // Get all files in artifact dir
    const files = fs.readdirSync(ARTIFACT_DIR);

    for (const item of MAPPING) {
        // Find matching file
        // Look for file starting with prefix and ending with .png
        // (timestamp suffix varies)
        const match = files.find(f => f.startsWith(item.filePrefix) && f.endsWith('.png'));

        if (!match) {
            console.log(`⚠️ No image found for "${item.title}" (Prefix: ${item.filePrefix})`);
            continue;
        }

        const localPath = path.join(ARTIFACT_DIR, match);
        const remoteName = `blog-images/manual-${Date.now()}-${match}`;

        console.log(`\nProcessing "${item.title}"...`);
        console.log(`   Found local file: ${match}`);

        // Upload
        const file = bucket.file(remoteName);
        const token = uuidv4();
        const buffer = fs.readFileSync(localPath);

        await file.save(buffer, {
            metadata: {
                contentType: 'image/png',
                metadata: {
                    firebaseStorageDownloadTokens: token
                }
            },
            public: true
        });

        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${remoteName}`;
        console.log(`   ☁️ Uploaded to: ${publicUrl}`);

        // Find Event
        const snap = await db.collection('events').where('title', '==', item.title).get();
        if (snap.empty) {
            console.log("   ❌ Event not found in DB.");
        } else {
            const doc = snap.docs[0];
            await doc.ref.update({
                image: publicUrl,
                imageUrl: publicUrl
            });
            console.log("   ✅ Event updated.");
        }
    }
}

uploadAndLink();
