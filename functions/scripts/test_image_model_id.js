const CONFIG = require('../config');

(async () => {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = CONFIG.API_KEYS.IMAGE_CREATION;
    const client = new GoogleGenAI({ apiKey: apiKey, apiVersion: "v1beta" });

    // 1. Test Text (to verify Key)
    console.log("📝 Testing Text Gen (gemini-1.5-flash)...");
    try {
        const resp = await client.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: "Hello" }] }]
        });
        console.log(`✅ Text Success! Response: ${resp.response.text().substring(0, 20)}...`);
    } catch (e) {
        console.log(`❌ Text FAILED: ${e.message}`);
    }

    // 2. Test Image again with full path just in case
    console.log("\n🎨 Testing Image (imagen-3.0-generate-001)...");
    try {
        const resp = await client.models.generateImages({
            model: "imagen-3.0-generate-001",
            prompt: "A red cube",
        });
        console.log("✅ Image Success!");
    } catch (e) {
        console.log(`❌ Image FAILED: ${e.message}`);
    }

})();
