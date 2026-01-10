const CONFIG = require('../config');
const axios = require('axios');

/**
 * Searches Google Images via Serper.dev for a given query.
 * @param {string} query - The search query.
 * @param {number} numResults - Number of results to return (default 3).
 * @returns {Promise<string[]>} - Array of image URLs.
 */
async function searchGoogleImages(query, numResults = 3) {
    const apiKey = CONFIG.API_KEYS.SERPER_KEY;

    if (!apiKey) {
        console.warn("⚠️ Serper API Key missing. Skipping search inspiration.");
        return [];
    }

    const url = 'https://google.serper.dev/images';
    const data = JSON.stringify({
        "q": query,
        "num": numResults
    });

    const config = {
        method: 'post',
        url: url,
        headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
        },
        data: data
    };

    try {
        const response = await axios(config);

        if (!response.data.images || response.data.images.length === 0) {
            console.log(`ℹ️ No images found for query: "${query}"`);
            return [];
        }

        // Serper returns { images: [ { imageUrl: "..." }, ... ] }
        const imageUrls = response.data.images.map(item => item.imageUrl).slice(0, numResults);
        console.log(`🔍 Found ${imageUrls.length} inspiration images for "${query}"`);
        return imageUrls;
    } catch (error) {
        console.error("❌ Serper Search Error:", error.message);
        return [];
    }
}

/**
 * Searches Google Places via Serper.dev for detailed business info.
 * @param {string} query - The search query (e.g. "Thump Coffee Bend").
 * @returns {Promise<Object|null>} - Object with { title, rating, ratingCount, category, imageUrl, address, website }
 */
async function searchPlace(query) {
    const apiKey = CONFIG.API_KEYS.SERPER_KEY;
    if (!apiKey) return null;

    const config = {
        method: 'post',
        url: 'https://google.serper.dev/places',
        headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({ "q": query })
    };

    try {
        const response = await axios(config);
        const places = response.data.places;

        if (!places || places.length === 0) {
            console.warn(`ℹ️ No place details found for: "${query}"`);
            return null;
        }

        // Return the first/best match
        const place = places[0];
        return {
            title: place.title,
            rating: place.rating || 0,
            ratingCount: place.ratingCount || 0,
            category: place.category || "Local Business",
            imageUrl: place.imageUrl,
            address: place.address,
            website: place.website,
            latitude: place.latitude,
            longitude: place.longitude
        };

    } catch (error) {
        console.error("❌ Serper Place Search Error:", error.message);
        return null;
    }
}

module.exports = { searchGoogleImages, searchPlace };
