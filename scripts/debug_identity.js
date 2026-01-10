const { generateMarketingCopy } = require('../functions/lib/marketingAgent');

async function testAgent() {
    console.log("🔍 Testing Agent Raw Response...");

    const prompt = "Please output the word 'Banana' and nothing else.";

    // Test 1: With Persona (Default) - verify it is skipped if I pass false
    // But here I want to test IF passing false works.

    try {
        console.log("\n--- Test 1: usePersona = false ---");
        const response = await generateMarketingCopy(prompt, {}, false);
        console.log("Generic Response:", response);

        console.log("\n--- Test 2: usePersona = true ---");
        const response2 = await generateMarketingCopy(prompt, {}, true);
        console.log("Persona Response:", response2);

    } catch (e) {
        console.error("Error:", e);
    }
}

testAgent();
