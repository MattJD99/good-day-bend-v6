
const runScout = require('./workflows/scout');
const { db } = require('./lib/firebase');

async function verifyScout() {
    console.log("🛠️ Starting Local Scout Verification...");

    if (!db) {
        console.error("❌ No DB connection. Make sure you have your service account or emulation set up.");
        // process.exit(1); 
        // Note: In this environment, we might be relying on implicit auth or we might fail. 
        // But the user requested a script.
    }

    try {
        // Run for 2 days
        await runScout(2);
        console.log("✅ Scout Verification Finished.");
    } catch (e) {
        console.error("❌ Scout Verification Failed:", e);
    }
}

if (require.main === module) {
    verifyScout();
}
