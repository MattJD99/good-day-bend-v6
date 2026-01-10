
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const CONFIG = require('./config');

async function listModels() {
    const key = CONFIG.API_KEYS?.DAILY_UPDATE || CONFIG.GEMINI_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    console.log("Fetching models from:", url.replace(key, 'HIDDEN_KEY'));

    try {
        const response = await axios.get(url);
        console.log("✅ Models found:");
        response.data.models.forEach(m => {
            console.log(` - ${m.name} (${m.displayName})`);
        });
    } catch (e) {
        console.error("❌ Failed to list models:", e.response ? e.response.data : e.message);
    }
}

if (require.main === module) {
    listModels();
}
