/**
 * Create SMS Broadcast Workflow in GHL
 * This script creates a workflow with a webhook trigger for SMS broadcasts
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

async function createSMSWorkflow() {
    console.log('🔧 Creating SMS Broadcast Workflow in GHL...');

    try {
        // Create workflow via GHL API
        const workflowPayload = {
            locationId: CONFIG.LOCATION_ID,
            name: "GDB Daily SMS Broadcast",
            description: "Automated SMS broadcast workflow for Good Day Bend daily updates",
            status: "published"
        };

        const response = await axios.post(
            `${GHL_BASE_URL}/workflows/`,
            workflowPayload,
            { headers }
        );

        console.log('✅ Workflow Created:', JSON.stringify(response.data, null, 2));

        if (response.data && response.data.workflow) {
            return response.data.workflow.id;
        } else if (response.data && response.data.id) {
            return response.data.id;
        }

        return null;
    } catch (error) {
        console.error('❌ GHL API Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);

        // If workflow creation endpoint is different, try listing existing workflows
        console.log('📋 Attempting to list existing workflows...');
        try {
            const listResponse = await axios.get(
                `${GHL_BASE_URL}/workflows/?locationId=${CONFIG.LOCATION_ID}`,
                { headers }
            );
            console.log('Existing Workflows:', JSON.stringify(listResponse.data, null, 2));
        } catch (listErr) {
            console.error('List Error:', listErr.response ? JSON.stringify(listErr.response.data, null, 2) : listErr.message);
        }

        return null;
    }
}

createSMSWorkflow().then(workflowId => {
    if (workflowId) {
        console.log(`\n🎉 SUCCESS! Add this to config.js:`);
        console.log(`SMS_WORKFLOW_ID: "${workflowId}"`);
    } else {
        console.log('\n⚠️ Could not create workflow via API. May need to create manually in GHL.');
    }
});
