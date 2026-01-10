const CONFIG = require('../config');

(async () => {
    try {
        const { GoogleGenAI } = await import("@google/genai");
        // Use the Image Creation key
        const apiKey = CONFIG.API_KEYS.IMAGE_CREATION;
        console.log(`Using Key ending in: ...${apiKey.slice(-4)}`);

        const client = new GoogleGenAI({ apiKey: apiKey, apiVersion: "v1beta" });

        console.log("Fetching list of models...");
        const response = await client.models.list();

        // The SDK returns a response object which matches the REST API result
        // usually response.models is the array
        const models = response.models || [];

        console.log(`\nTotal Models Found: ${models.length}`);
        console.log("--- Imagen / Image Models ---");

        const imageModels = models.filter(m =>
            m.name.includes('image') ||
            m.supportedGenerationMethods?.includes('predict') ||
            m.supportedGenerationMethods?.includes('generateContent')
        );

        imageModels.forEach(m => {
            console.log(`Name: ${m.name}`);
            console.log(`Methods: ${JSON.stringify(m.supportedGenerationMethods)}`);
            console.log('---');
        });

    } catch (err) {
        console.error("❌ Error:", err);
    }
})();
