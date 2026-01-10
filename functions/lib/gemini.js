const { GoogleGenerativeAI } = require("@google/generative-ai");
const CONFIG = require('../config');

// Default to Daily Update key as fallback if shared models are used directly
const defaultKey = CONFIG.API_KEYS?.DAILY_UPDATE || CONFIG.GEMINI_KEY;
const genAI = new GoogleGenerativeAI(defaultKey);

const modelReasoning = genAI.getGenerativeModel({
    model: CONFIG.MODEL_REASONING
});

const modelFast = genAI.getGenerativeModel({
    model: CONFIG.MODEL_FAST
});

const modelImagePro = genAI.getGenerativeModel({
    model: CONFIG.MODEL_IMAGE_PRO
});

// Default to Reasoning if just 'model' is imported
const model = modelReasoning;

/**
 * Get a specific Gemini model using a segmented API key
 * @param {string} segmentKeyName - Key from CONFIG.API_KEYS (e.g. 'RESEARCH', 'BLOG')
 * @param {string} modelName - Model name constant (default: CONFIG.MODEL_REASONING)
 */
function getSegmentedModel(segmentKeyName, modelName = CONFIG.MODEL_REASONING) {
    const key = CONFIG.API_KEYS[segmentKeyName] || defaultKey;
    const client = new GoogleGenerativeAI(key);
    return client.getGenerativeModel({ model: modelName });
}

module.exports = { model, modelReasoning, modelFast, modelImagePro, genAI, getSegmentedModel };
