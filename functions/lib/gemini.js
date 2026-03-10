/**
 * 2026 Segmented Model Selector for Good Day Bend v8
 * Maps GDB tasks to the correct Gemini 3 models and thinking levels.
 * Includes Gemini 2.0 Flash fallback for stability.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const CONFIG = require('../config');

// Default API key
const defaultKey = CONFIG.API_KEYS?.DAILY_UPDATE || CONFIG.GEMINI_KEY;
const genAI = new GoogleGenerativeAI(defaultKey);

// Legacy models (for backward compatibility)
const modelReasoning = genAI.getGenerativeModel({ model: CONFIG.MODEL_REASONING });
const modelFast = genAI.getGenerativeModel({ model: CONFIG.MODEL_FAST });
const modelImagePro = genAI.getGenerativeModel({ model: CONFIG.MODEL_IMAGE_PRO });
const model = modelReasoning;

/**
 * Gemini 3 Model Configuration Map
 * Maps task types to specific models and thinking levels
 */
const GEMINI3_MODELS = {
    // Strategy: High reasoning to decide the "vibe" and top picks
    'DAILY_STRATEGY': {
        model: 'gemini-3-flash-preview',
        config: {
            generationConfig: {
                thinkingConfig: { thinkingLevel: 'high' }
            }
        }
    },
    // Writer: Medium thinking for balanced HTML generation
    'DAILY_WRITER': {
        model: 'gemini-3-flash-preview',
        config: {
            generationConfig: {
                thinkingConfig: { thinkingLevel: 'medium' }
            }
        }
    },
    // Social: Minimal thinking for fast, punchy IG/FB captions
    'DAILY_SOCIAL': {
        model: 'gemini-3-flash-preview',
        config: {
            generationConfig: {
                thinkingConfig: { thinkingLevel: 'minimal' }
            }
        }
    },
    // Image: Specialized high-fidelity vision model
    'IMAGE_INSPIRATION': {
        model: 'gemini-3-pro-image-preview',
        config: {
            generationConfig: {
                mediaResolution: 'high'
            }
        }
    },
    // Legacy fallback mapping
    'RESEARCH': { model: CONFIG.MODEL_REASONING, config: {} },
    'DAILY_UPDATE': { model: CONFIG.MODEL_REASONING, config: {} },
    'BLOG': { model: CONFIG.MODEL_REASONING, config: {} },
    'PREVIEWS': { model: CONFIG.MODEL_REASONING, config: {} },
    'SOCIAL': { model: CONFIG.MODEL_FAST, config: {} },
    'EMAIL': { model: CONFIG.MODEL_FAST, config: {} }
};

/**
 * Get a Gemini model with thinking-level configuration
 * @param {string} taskType - Task type from GEMINI3_MODELS
 * @param {string} segmentKeyName - Optional API key segment (for quota separation)
 * @returns {GenerativeModel} Configured model instance
 */
function getSegmentedModel(taskType, segmentKeyName = 'DAILY_UPDATE') {
    const modelConfig = GEMINI3_MODELS[taskType] || GEMINI3_MODELS['DAILY_WRITER'];
    const key = CONFIG.API_KEYS[segmentKeyName] || defaultKey;
    const client = new GoogleGenerativeAI(key);

    try {
        // Try Gemini 3 model with thinking config
        return client.getGenerativeModel({
            model: modelConfig.model,
            ...modelConfig.config
        });
    } catch (err) {
        console.warn(`⚠️ Gemini 3 model ${modelConfig.model} failed, falling back to 2.0 Flash`);
        return client.getGenerativeModel({ model: CONFIG.MODEL_FALLBACK || 'gemini-2.0-flash' });
    }
}

/**
 * Generate content with automatic fallback to Gemini 2.0 Flash
 * @param {GenerativeModel} model - Model instance
 * @param {string} prompt - The prompt to send
 * @returns {Promise<GenerateContentResult>} Generation result
 */
async function generateWithFallback(model, prompt) {
    try {
        const result = await model.generateContent(prompt);

        // Handle thoughtSignature if present (Gemini 3 feature)
        if (result.response?.candidates?.[0]?.thoughtSignature) {
            console.log('🧠 Gemini 3 Thinking captured');
        }

        return result;
    } catch (err) {
        if (err.message?.includes('not found') || err.status === 404) {
            console.warn('⚠️ Gemini 3 model not available, falling back to 2.0 Flash');
            const fallbackClient = new GoogleGenerativeAI(defaultKey);
            const fallbackModel = fallbackClient.getGenerativeModel({
                model: CONFIG.MODEL_FALLBACK || 'gemini-2.0-flash'
            });
            return fallbackModel.generateContent(prompt);
        }
        throw err;
    }
}

module.exports = {
    model,
    modelReasoning,
    modelFast,
    modelImagePro,
    genAI,
    getSegmentedModel,
    generateWithFallback,
    GEMINI3_MODELS
};
