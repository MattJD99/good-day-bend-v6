const axios = require('axios');
const CONFIG = require('./config');

async function verifyGHL() {
    console.log("Verifying GHL Connection...");
    console.log("Location ID:", CONFIG.LOCATION_ID);
    console.log("API Key (First 10 chars):", CONFIG.GHL_KEY.substring(0, 10) + "...");

    const options = {
        method: 'GET',
        url: 'https://services.leadconnectorhq.com/websites',
        params: { locationId: CONFIG.LOCATION_ID },
        headers: {
            Authorization: `Bearer ${CONFIG.GHL_KEY}`,
            Version: '2021-07-28',
            Accept: 'application/json'
        }
    };

    try {
        const response = await axios.request(options);
        console.log("✅ Connection Successful!");
        console.log("Websites Found:", response.data.websites.length);

        response.data.websites.forEach(site => {
            console.log(`- [${site.id}] ${site.name} (Domain: ${site.domain})`);
        });

    } catch (error) {
        console.error("❌ Connection Failed.");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
    }
}

verifyGHL();
