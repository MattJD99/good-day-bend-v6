const { Storage } = require('@google-cloud/storage');
const path = require('path');

async function main() {
    console.log("🔍 Authenticating with service-account.json...");

    const storage = new Storage({
        keyFilename: path.join(__dirname, 'service-account.json'),
        projectId: 'good-day-bend-v6'
    });

    try {
        console.log("Listing buckets...");
        const [buckets] = await storage.getBuckets();

        if (buckets.length === 0) {
            console.log("❌ No buckets found in this project.");
        } else {
            console.log("✅ Buckets found:");
            buckets.forEach(bucket => {
                console.log(`- ${bucket.name}`);
            });
        }
    } catch (err) {
        console.error("❌ Error listing buckets:", err.message);
        if (err.code === 403) {
            console.error("   Reason: Permission denied. Service account may lack 'Storage Admin' or 'Storage Object Viewer' roles.");
        }
    }
}

main();
