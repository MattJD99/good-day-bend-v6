const { admin } = require('./lib/firebase');

async function main() {
    try {
        const [buckets] = await admin.storage().getBuckets();
        console.log("Buckets found:");
        buckets.forEach(bucket => {
            console.log(`- ${bucket.name}`);
        });
    } catch (err) {
        console.error("Error listing buckets:", err);
    }
}

main();
