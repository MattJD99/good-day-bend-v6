const axios = require('axios');
const CONFIG = require('./config');

async function probeGHL() {
    console.log("diagnosing GHL Connection...");
    const headers = {
        Authorization: `Bearer ${CONFIG.GHL_KEY}`,
        Version: '2021-07-28',
        Accept: 'application/json'
    };

    const endpoints = [
        { name: "V2 Websites", url: 'https://services.leadconnectorhq.com/websites', params: { locationId: CONFIG.LOCATION_ID } },
        { name: "V2 Funnels", url: 'https://services.leadconnectorhq.com/funnels/funnel-list', params: { locationId: CONFIG.LOCATION_ID } },
        // Try without locationId in params if the token is location-scoped?
    ];

    for (const ep of endpoints) {
        console.log(`\nTesting ${ep.name}: ${ep.url}`);
        try {
            const res = await axios.get(ep.url, { headers, params: ep.params });
            console.log(`✅ Success! Status: ${res.status}`);
            console.log(`- Items: ${res.data.websites ? res.data.websites.length : (res.data.funnels ? res.data.funnels.length : 'N/A')}`);
            if (res.data.websites && res.data.websites.length > 0) {
                console.log("Sample ID:", res.data.websites[0].id);
            }
        } catch (err) {
            console.log(`❌ Failed. Status: ${err.response ? err.response.status : 'ERR'}`);
            if (err.response && err.response.data) {
                console.log("Msg:", JSON.stringify(err.response.data));
            }
        }
    }
}

probeGHL();
