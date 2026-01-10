const { generateImageWithInspiration } = require('../lib/imageGen');
const CONFIG = require('../config');

async function testSearchPipeline() {
    console.log("🧪 Testing Image Relevancy Pipeline...");

    if (!CONFIG.API_KEYS.SERPER_KEY) {
        console.error("\n❌ MISSING KEYS: You must add SERPER_KEY to functions/config.js for this to work.");
        console.log("ℹ️ Once added, run this script again to verify the 'Search -> Vision -> Generate' flow.\n");
        return;
    }

    const testTopic = "Winter Festival Bend Oregon";
    const testContext = "A festive winter scene in Bend.";

    try {
        console.log(`\n🔎 Searching for: ${testTopic}`);
        const imageUrl = await generateImageWithInspiration(testTopic, testContext);
        console.log(`\n✅ Generated Image URL: ${imageUrl}`);
    } catch (e) {
        console.error("❌ Test Failed:", e);
    }
}

testSearchPipeline();
