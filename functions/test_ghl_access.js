const axios = require('axios');
const CONFIG = require('./config');

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const headers = {
    'Authorization': `Bearer ${CONFIG.GHL_KEY}`,
    'Version': '2021-07-28',
    'Location-Id': CONFIG.LOCATION_ID,
    'Content-Type': 'application/json'
};

async function testAccess() {
    console.log("🕵️ Testing GHL API Access...");
    console.log(`🔑 Key: ${CONFIG.GHL_KEY.substring(0, 10)}...`);
    console.log(`Pb Location: ${CONFIG.LOCATION_ID}`);

    try {
        // 1. Try to LIST workflows (Read access)
        console.log("\n📡 Attempting to LIST workflows...");
        const response = await axios.get(`${GHL_BASE_URL}/workflows/?locationId=${CONFIG.LOCATION_ID}`, { headers });
        console.log(`✅ Success! Found ${response.data.workflows ? response.data.workflows.length : 0} workflows.`);

        if (response.data.workflows && response.data.workflows.length > 0) {
            console.log("Sample Workflow:", response.data.workflows[0].name);
        }
    } catch (error) {
        console.error("❌ List Workflows Failed:", error.response ? error.response.status : error.message);
        if (error.response) console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }

    try {
        // 2. Try to get Location Details (Basic access)
        console.log("\n📡 Attempting to GET Location details...");
        const response = await axios.get(`${GHL_BASE_URL}/locations/${CONFIG.LOCATION_ID}`, { headers });
        console.log(`✅ Success! Connected to location: ${response.data.location ? response.data.location.name : 'Unknown'}`);
    } catch (error) {
        console.error("❌ Get Location Failed:", error.response ? error.response.status : error.message);
        if (error.response) console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }
}

testAccess();
