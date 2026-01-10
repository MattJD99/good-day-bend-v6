
const runScout = require('../functions/workflows/scout');

async function main() {
    const args = process.argv.slice(2);
    const days = args[0] ? parseInt(args[0]) : 2;

    console.log(`🚀 Manually Triggering Scout for ${days} days...`);

    try {
        await runScout(days);
        console.log("✅ Manual Scout Trigger Completed Successfully.");
    } catch (e) {
        console.error("❌ Manual Scout Trigger Failed:", e);
    }
}

main();
