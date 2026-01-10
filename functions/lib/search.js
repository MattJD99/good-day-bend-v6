const axios = require('axios');
const CONFIG = require('../config');

/**
 * Validates the Serper API Key
 * @returns {boolean}
 */
function hasSearchKey() {
    return !!CONFIG.API_KEYS.SERPER_KEY;
}

/**
 * Search the web using Serper.dev
 * @param {string} query - The search query
 * @param {string} [type='search'] - 'search' | 'news' | 'places'
 * @returns {Promise<object[]>} Array of result objects
 */
async function search(query, type = 'search') {
    if (!hasSearchKey()) {
        console.warn("⚠️ No SERPER_KEY found. Returning empty results.");
        return [];
    }

    console.log(`🔎 Serper searching for: "${query}" (${type})...`);

    const data = JSON.stringify({
        "q": query,
        "num": 20, // Fetch more to filter for quality
        "tbs": "qdr:w" // Default to past week for "News" freshness
    });

    const config = {
        method: 'post',
        url: `https://google.serper.dev/${type}`,
        headers: {
            'X-API-KEY': CONFIG.API_KEYS.SERPER_KEY,
            'Content-Type': 'application/json'
        },
        data: data
    };

    try {
        const response = await axios(config);

        let results = [];
        if (response.data.organic) results = response.data.organic;
        else if (response.data.news) results = response.data.news;
        else if (response.data.places) results = response.data.places;

        console.log(`✅ Serper found ${results.length} results.`);
        return results;
    } catch (error) {
        console.error("❌ Serper API Failed:", error.message);
        return [];
    }
}

/**
 * Targeted search for Bend Events on a specific date
 * @param {string} dateStr - e.g. "January 5, 2026"
 * @returns {Promise<string>} Raw text blob of search results
 */
async function searchBendEvents(dateStr) {
    const queries = [
        `events in Bend Oregon on ${dateStr}`,
        `live music Bend Oregon ${dateStr}`,
        `VisitBend events calendar ${dateStr}`,
        `Bend Source Weekly calendar ${dateStr}`
    ];

    let aggregatedResults = [];

    // Run searches in parallel
    const promises = queries.map(q => search(q));
    const resultsArray = await Promise.all(promises);

    resultsArray.forEach(results => {
        aggregatedResults = [...aggregatedResults, ...results];
    });

    // Deduplicate by link
    const uniqueResults = Array.from(new Set(aggregatedResults.map(a => a.link)))
        .map(link => aggregatedResults.find(a => a.link === link));

    // Convert to a text blob for the LLM
    // Limit to top 20 to avoid token overload (though 1.5 Pro can handle it)
    const topResults = uniqueResults.slice(0, 30);

    return topResults.map(r => `
    TITLE: ${r.title}
    LINK: ${r.link}
    SNIPPET: ${r.snippet}
    DATE: ${r.date || 'Unknown'}
    `).join("\n---\n");
}

module.exports = { search, searchBendEvents };
