const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "good-day-bend-v6.firebasestorage.app"
    });
}

const bucket = admin.storage().bucket();

async function listFiles() {
    console.log("Listing files in storage...");
    const [files] = await bucket.getFiles();
    console.log(`Found ${files.length} total files.`);

    // Group by prefix
    const prefixes = new Set();
    files.forEach(f => {
        const parts = f.name.split('/');
        if (parts.length > 1) {
            prefixes.add(parts[0]);
        }
    });

    console.log("Found folders:", Array.from(prefixes));

    // List some potential event images
    console.log("Scanning for event-like images...");
    const eventFiles = files.filter(f => f.name.includes('event') || f.name.includes('daily'));
    eventFiles.slice(0, 20).forEach(f => console.log(f.name));
}

listFiles();
