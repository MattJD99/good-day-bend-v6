const { admin } = require('./lib/firebase');

async function main() {
    const bucketName = 'good-day-bend-v6.appspot.com';
    const bucket = admin.storage().bucket(bucketName);

    try {
        const [exists] = await bucket.exists();
        if (exists) {
            console.log(`✅ Bucket '${bucketName}' exists!`);
        } else {
            console.log(`❌ Bucket '${bucketName}' does not exist.`);
        }
    } catch (err) {
        console.error(`❌ Error checking bucket '${bucketName}':`, err.message);
    }
}

main();
