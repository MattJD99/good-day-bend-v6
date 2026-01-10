const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "good-day-bend-v6.firebasestorage.app"
    });
}

const bucket = admin.storage().bucket();

async function listStockImages() {
    console.log("Listing all stock images...");
    // Prefix 'blog-images/' seems to contain 'daily-', 'feature-', 'gen-' files.
    const [files] = await bucket.getFiles({ prefix: 'blog-images/' });

    const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const validFiles = files.filter(f => extensions.some(ext => f.name.toLowerCase().endsWith(ext)));

    console.log(`Found ${validFiles.length} valid stock images.`);
    validFiles.forEach(f => console.log(f.name));
}

listStockImages();
