/**
 * test_marketing_agent.js
 * Simple script to verify connectivity with the Marketing Agent
 */

const { generateMarketingCopy } = require('../functions/lib/marketingAgent');

async function testAgent() {
    console.log("🧪 Testing Marketing Agent Integration...");

    const prompt = "Write a catchy 2-sentence tweet promoting a local coffee shop called 'The Roasted Pine' in Bend, Oregon.";

    const result = await generateMarketingCopy(prompt);

    console.log("\n--- RESULT ---");
    console.log(result);
    console.log("----------------\n");
}

testAgent();
