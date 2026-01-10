/**
 * Google Deep Research Integration
 * 
 * Based on: https://ai.google.dev/gemini-api/docs/deep-research
 * 
 * This module will replace the standard "gather" workflows.
 * Usage:
 * 1. Initialize Gemini Client with Deep Research capabilities.
 * 2. Send a prompt (e.g., "Find all live music events in Bend, OR for this weekend. Include venue, time, price, and ticket link.")
 * 3. Poll for results (background=true).
 * 4. Parse output into Firestore 'events' collection.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const CONFIG = require('./config');

const genAI = new GoogleGenerativeAI(CONFIG.API_KEYS.RESEARCH || CONFIG.GEMINI_KEY);

/**
 * Runs a deep research task using Gemini with Google Search grounding.
 * @param {string} topic - The topic to research.
 * @returns {Promise<Object>} - The research result containing text and metadata.
 */
async function runDeepResearch(topic) {
    console.log(`Starting Deep Research for: ${topic}`);

    try {
        // Initialize model with Google Search tool
        const model = genAI.getGenerativeModel({
            model: CONFIG.MODEL_REASONING,
            tools: [{
                googleSearch: {}
            }]
        });

        const prompt = `Research the following topic in depth: "${topic}". 
        Provide a detailed summary with key facts, dates, and sources if available.
        Focus on finding confirmed information.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract grounding metadata if available
        // Note: access path may vary slightly based on SDK version, handling safely.
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

        return {
            status: "success",
            result: text,
            metadata: groundingMetadata
        };

    } catch (error) {
        console.error("Deep Research Failed:", error);
        return {
            status: "error",
            message: error.message,
            originalError: error
        };
    }
}

module.exports = { runDeepResearch };
