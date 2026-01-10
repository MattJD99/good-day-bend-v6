/**
 * marketingAgent.js
 * Interface for the "Good Day Bend Marketing Agent" (Cloud Run Service)
 */

const axios = require('axios');
const CONFIG = require('../config');

/**
 * Sends a task to the Marketing Agent.
 * @param {string} prompt - The instructions for the agent (e.g. "Write a blog post about...")
 * @param {object} context - Optional JSON context to pass along
 * @returns {Promise<string>} - The generated marketing copy.
 */
async function generateMarketingCopy(prompt, context = {}, usePersona = true) {
    const agentUrl = CONFIG.MARKETING_AGENT_URL;

    if (!agentUrl || agentUrl.includes("REPLACE_WITH")) {
        console.warn("⚠️ Marketing Agent URL not configured.");
        return "Error: Marketing Agent URL is missing in config.js";
    }

    try {
        console.log(`📨 Delegating task to Marketing Agent: "${prompt.substring(0, 30)}..."`);

        // Construct the payload expected by the agent
        // Note: We assume a standard { prompt: "..." } or { instruction: "..." } schema.
        // Adjust this payload based on the specific agent's documentation.
        // Construct the payload expected by the agent
        // We inject the persona from config as a system instruction or prepended text
        let finalPrompt = prompt;
        if (usePersona && CONFIG.MARKETING_AGENT_PERSONA) {
            finalPrompt = `SYSTEM INSTRUCTIONS:\n${CONFIG.MARKETING_AGENT_PERSONA}\n\nUSER REQUEST:\n${prompt}`;
        }

        const payload = {
            prompt: finalPrompt,
            context: context
        };

        const response = await axios.post(agentUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
                // Add Authorization header here if needed for Cloud Run
                // 'Authorization': `Bearer ${token}` 
            }
        });

        // Assuming the agent returns { data: { text: "..." } } or similar
        // We'll log the full response for debugging first
        // console.log("Response data:", response.data);

        if (response.data && response.data.text) {
            return response.data.text;
        } else if (typeof response.data === 'string') {
            return response.data;
        } else {
            return JSON.stringify(response.data);
        }

    } catch (error) {
        console.error("❌ Marketing Agent Error:", error.message);
        if (error.response) {
            console.error("Agent Status:", error.response.status);
            console.error("Agent Data:", error.response.data);
        }
        return `Failed to generate copy. Error: ${error.message}`;
    }
}

module.exports = { generateMarketingCopy };
