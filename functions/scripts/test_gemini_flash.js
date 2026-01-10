const CONFIG = require('../config');

(async () => {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = CONFIG.API_KEYS.IMAGE_CREATION;
    const client = new GoogleGenAI({ apiKey: apiKey, apiVersion: "v1beta" });

    const modelName = "gemini-2.0-flash-exp";
    console.log(`\n🧪 Testing: ${modelName}`);

    // Test 1: generateImages method (if it supports it acting like Imagen)
    console.log("--- Attempt 1: generateImages ---");
    try {
        const resp = await client.models.generateImages({
            model: modelName,
            prompt: "A red cube",
        });
        console.log(`✅ generateImages Success!`);
    } catch (e) {
        console.log(`❌ generateImages Failed: ${e.message}`);
    }

    // Test 2: generateContent (asking for image)
    console.log("\n--- Attempt 2: generateContent (multimodal generation?) ---");
    try {
        const resp = await client.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [{ text: "Generate an image of a red cube" }] }]
        });
        console.log(`✅ generateContent Success!`);
        console.log("Response Parts:", JSON.stringify(resp.response.candidates[0].content.parts, null, 2));
    } catch (e) {
        console.log(`❌ generateContent Failed: ${e.message}`);
    }

})();
