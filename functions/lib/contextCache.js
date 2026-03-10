/**
 * Context Cache for Good Day Bend v8
 * Caches brand guidelines and marketing persona to reduce token usage.
 * 
 * Benefits:
 * - Reduces token usage on every run
 * - Speeds up the "memory recall" step
 * - Keeps brand voice consistent
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require('./firebase');
const CONFIG = require('../config');

// In-memory cache for the session
let cachedContext = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get or create the cached brand context
 * Combines the marketing persona with top-rated knowledge base entries
 * @returns {Promise<string>} Cached context string
 */
async function getBrandContext() {
    // Return cached if still valid
    if (cachedContext && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_TTL_MS) {
        console.log('📦 Using cached brand context');
        return cachedContext;
    }

    console.log('🔄 Building fresh brand context cache...');

    // Start with the marketing persona
    let contextParts = [
        '=== BRAND GUIDELINES ===',
        CONFIG.MARKETING_AGENT_PERSONA
    ];

    // Add top-rated knowledge base entries (if available)
    try {
        if (db) {
            const kbSnapshot = await db.collection('knowledge_base')
                .where('rating', '>=', 4)
                .orderBy('rating', 'desc')
                .limit(3)
                .get();

            if (!kbSnapshot.empty) {
                contextParts.push('\n=== LEARNED PATTERNS (High-Rated Examples) ===');
                kbSnapshot.forEach(doc => {
                    const data = doc.data();
                    contextParts.push(`\n--- Example (Rating: ${data.rating}/5) ---`);
                    // Include first 500 chars of successful content as a pattern
                    if (data.rawHTML) {
                        contextParts.push(data.rawHTML.substring(0, 500) + '...');
                    }
                });
                console.log(`✅ Loaded ${kbSnapshot.size} knowledge base examples into cache`);
            }
        }
    } catch (err) {
        console.warn('⚠️ Could not load knowledge base into cache:', err.message);
    }

    // Add trusted sources for SEO
    contextParts.push('\n=== TRUSTED SOURCES FOR SEO ===');
    CONFIG.TRUSTED_SOURCES.forEach(source => {
        contextParts.push(`- ${source.name}: ${source.url}`);
    });

    // Build final context
    cachedContext = contextParts.join('\n');
    cacheTimestamp = Date.now();

    console.log(`✅ Brand context cached (${cachedContext.length} chars)`);
    return cachedContext;
}

/**
 * Invalidate the cache (call after updating knowledge base)
 */
function invalidateCache() {
    cachedContext = null;
    cacheTimestamp = null;
    console.log('🗑️ Brand context cache invalidated');
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
    return {
        isCached: !!cachedContext,
        age: cacheTimestamp ? Date.now() - cacheTimestamp : null,
        size: cachedContext ? cachedContext.length : 0,
        ttl: CACHE_TTL_MS
    };
}

module.exports = {
    getBrandContext,
    invalidateCache,
    getCacheStats
};
