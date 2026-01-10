const { admin } = require('./lib/firebase');

async function main() {
    try {
        const bucket = admin.storage().bucket(); // No args
        console.log("Default bucket name:", bucket.name);
        const [exists] = await bucket.exists();
        console.log("Exists:", exists);
    } catch (err) {
        console.error("Error checking default bucket:", err.message);
    }
}

main();
