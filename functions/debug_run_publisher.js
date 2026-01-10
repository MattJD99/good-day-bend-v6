
const runPublisherV6 = require('./workflows_v2/publisher_v2.js');

async function trigger() {
    console.log("🚀 Manually triggering Publisher V6 for Jan 8, 2026...");
    try {
        // Run for Jan 8
        const result = await runPublisherV6('2026-01-08');
        console.log("✅ Result:", result);
    } catch (e) {
        console.error("❌ Crashed:", e);
    }
}

if (require.main === module) {
    trigger().then(() => process.exit());
}
