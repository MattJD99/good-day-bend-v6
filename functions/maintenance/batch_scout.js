const scout = require('../workflows_v2/scout_v2');

async function runBatch() {
    console.log("🚀 Starting Batch Scout for 14 Days (Sequential Safe Mode)...");

    // Get Bend Today
    const bendNow = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const startDate = new Date(bendNow);

    // Day 0 to 13 (14 days total)
    for (let i = 0; i < 14; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + i);

        // Format YYYY-MM-DD for consistency
        const dateStr = targetDate.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' }); // MM/DD/YYYY usually
        // Better: ISO string logic but safe for local time? 
        // Let's just pass the Date object string which `new Date()` can parse, or simpler:
        // scout_v2 accepts a string that `new Date()` likes.

        console.log(`\n-----------------------------------`);
        console.log(`📆 BATCH: Processing Day ${i + 1}/14 : ${targetDate.toDateString()}`);
        console.log(`-----------------------------------`);

        try {
            // Call scout for 1 day, specific date
            await scout(1, targetDate.toString());
            console.log(`✅ Day ${i + 1} Complete.`);
        } catch (e) {
            console.error(`❌ Day ${i + 1} Failed (${targetDate.toDateString()}):`, e);
            console.log("⏭️ Continuing to next day...");
        }

        // Small pause to be nice to APIs?
        console.log("⏳ Waiting 60s before next day to respect API quotas...");
        await new Promise(r => setTimeout(r, 60000));
    }

    console.log("\n🏁 Batch Scout Mission Complete.");
}

runBatch().then(() => process.exit(0));
