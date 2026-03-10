/**
 * Setup Broadcast Workflows in GHL
 * Attempts to create the "Daily SMS" and "Daily Email" workflows via API.
 */

const axios = require('axios');
const CONFIG = require('./config');

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const headers = {
    'Authorization': `Bearer ${CONFIG.GHL_KEY}`,
    'Version': '2021-07-28',
    'Location-Id': CONFIG.LOCATION_ID,
    'Content-Type': 'application/json'
};

async function createWorkflow(name, description) {
    console.log(`🔧 Creating Workflow: "${name}"...`);
    try {
        const payload = {
            locationId: CONFIG.LOCATION_ID,
            name: name,
            description: description,
            status: "published"
        };

        const response = await axios.post(`${GHL_BASE_URL}/workflows/`, payload, { headers });

        if (response.data && response.data.workflow) {
            console.log(`✅ Created: ${response.data.workflow.id}`);
            return response.data.workflow.id;
        } else if (response.data && response.data.id) {
            console.log(`✅ Created: ${response.data.id}`);
            return response.data.id;
        }
    } catch (error) {
        console.error(`❌ Failed to create "${name}":`, error.response ? error.response.data : error.message);
        return null;
    }
}

async function main() {
    console.log("🚀 Setting up GHL Broadcast Workflows...");

    // 1. SMS Workflow
    const smsId = await createWorkflow(
        "GDB Daily SMS Broadcast",
        "Triggered via API (webhook) to send daily text blast."
    );

    // 2. Email Workflow
    const emailId = await createWorkflow(
        "GDB Daily Email Broadcast",
        "Triggered via API (webhook) to send daily HTML email update."
    );

    console.log("\n--- CONFIG UPDATE REQUIRED ---");
    if (smsId) console.log(`SMS_WORKFLOW_ID: "${smsId}"`);
    else console.log("SMS_WORKFLOW_ID: [Create Manually in GHL and paste ID here]");

    if (emailId) console.log(`EMAIL_WORKFLOW_ID: "${emailId}"`);
    else console.log("EMAIL_WORKFLOW_ID: [Create Manually in GHL and paste ID here]");

    console.log("\nIf created manually:");
    console.log("1. Create Workflow > Start from Scratch");
    console.log("2. Settings > Allow Multiple: ON");
    console.log("3. Add Trigger: Contact Tag (or leave empty for API trigger)");
    console.log("4. Add Action: Send SMS / Send Email");
    console.log("5. Publish & Save. Copy ID from URL.");
}

main();
