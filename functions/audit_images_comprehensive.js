const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "good-day-bend-v6.firebasestorage.app"
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function auditImages() {
    console.log("📊 Starting Comprehensive Image Audit...");
    
    // 1. Count Files in Storage
    console.log("\n📦 Storage Bucket Analysis:");
    try {
        const [files] = await bucket.getFiles();
        
        let fileCount = 0;
        let imageCount = 0;
        const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        
        files.forEach(file => {
            fileCount++;
            if (extensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
                imageCount++;
            }
        });
        
        console.log(`   Total Files: ${fileCount}`);
        console.log(`   Image Files: ${imageCount}`);
        
    } catch (e) {
        console.error("   ❌ Error accessing storage:", e.message);
    }

    // 2. Count References in Firestore
    console.log("\ndating Firestore References:");
    
    const collections = ['articles', 'events', 'daily_updates'];
    let totalRefs = 0;

    for (const col of collections) {
        try {
            const snapshot = await db.collection(col).get();
            let count = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                // Check common image fields
                if (data.image || data.imageUrl || data.bannerUrl) {
                    count++;
                }
            });
            console.log(`   ${col}: ${count} docs with images`);
            totalRefs += count;
        } catch (e) {
            console.error(`   ❌ Error scanning ${col}:`, e.message);
        }
    }
    
    console.log(`   Total Referenced Images in content: ${totalRefs}`);
    console.log("\n✅ Audit Complete.");
}

auditImages().catch(console.error);
