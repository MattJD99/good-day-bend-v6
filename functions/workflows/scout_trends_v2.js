/**
 * scout_trends_v2.js - Real Google Trends Integration via Gemini Grounding
 * 
 * PURPOSE: Fetch ACTUAL trending topics for Bend, Oregon using Gemini's
 * web search grounding capability instead of hallucinating topics.
 * 
 * WORKFLOW:
 * 1. Use Gemini with Google Search grounding to find real trending topics
 * 2. Filter for local relevance (Bend, Oregon, Central Oregon)
 * 3. Check for topic freshness (avoid duplicates from last 7 days)
 * 4. Save top topics to Firestore for the trend_blog writer
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db, admin } = require('../lib/firebase');
const CONFIG = require('../config');

// Use the default API key
const genAI = new GoogleGenerativeAI(CONFIG.API_KEYS?.DAILY_UPDATE || CONFIG.GEMINI_KEY);

/**
 * Get a model with Google Search grounding enabled
 */
function getGroundedModel() {
    return genAI.getGenerativeModel({
        model: 'gemini-2.0-flash', // Flash supports grounding well
        tools: [{
            googleSearch: {}
        }]
    });
}

/**
 * Check if a topic was recently covered (within last 7 days)
 */
async function wasRecentlyCovered(topic) {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Check trend_reports collection
        const reportsSnapshot = await db.collection(CONFIG.FIREBASE_COLLECTION_TREND_REPORTS)
            .where('scoutedAt', '>', sevenDaysAgo)
            .get();

        for (const doc of reportsSnapshot.docs) {
            const existingTopic = doc.data().topic?.toLowerCase() || '';
            if (existingTopic.includes(topic.toLowerCase()) ||
                topic.toLowerCase().includes(existingTopic)) {
                console.log(`⚠️ Topic "${topic}" is similar to recent topic "${existingTopic}"`);
                return true;
            }
        }

        // Also check articles collection
        const articlesSnapshot = await db.collection('articles')
            .where('createdAt', '>', sevenDaysAgo.toISOString())
            .limit(20)
            .get();

        for (const doc of articlesSnapshot.docs) {
            const existingTitle = doc.data().title?.toLowerCase() || '';
            if (existingTitle.includes(topic.toLowerCase())) {
                console.log(`⚠️ Topic "${topic}" already covered in article "${existingTitle}"`);
                return true;
            }
        }

        return false;
    } catch (e) {
        console.warn("Duplicate check failed:", e.message);
        return false; // Proceed if check fails
    }
}

/**
 * Main trend scouting function using Gemini with Google Search grounding
 */
async function runTrendScoutV2() {
    console.log("🔍 TREND SCOUT V2 (Gemini Grounded Search) STARTING...");

    if (!db) {
        console.error("❌ Database connection missing.");
        return null;
    }

    const model = getGroundedModel();
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Phase 1: Find trending topics with real web search
    console.log("📡 Phase 1: Searching for trending topics in Bend, Oregon...");

    const searchPrompt = `
    Today is ${today}.
    
    Search for what's currently trending or newsworthy in Bend, Oregon and Central Oregon.
    
    Look for:
    1. Recent local news (city council, development, business openings/closings)
    2. Seasonal activities (ski conditions, river levels, trail status)
    3. Upcoming major events or festivals
    4. Weather impacts or alerts
    5. Housing/real estate trends
    6. Outdoor recreation news (forest fires, closures, new trails)
    7. Local business news
    8. Community issues being discussed
    
    Return your findings as a JSON array with exactly 5 topics, each with:
    - "topic": A specific, clear topic title
    - "category": One of [News, Outdoors, Events, Weather, Business, Community, Lifestyle]
    - "summary": 2-3 sentence summary of what's happening
    - "why_relevant": Why this matters to Bend locals right now
    - "freshness_score": 1-10 (10 = breaking news, 1 = evergreen)
    
    Focus on topics that are CURRENTLY relevant (happened this week or upcoming).
    
    Return ONLY the JSON array, no other text.
    `;

    let topics = [];
    let groundingMetadata = null;

    try {
        const result = await model.generateContent(searchPrompt);
        const response = result.response;

        // Capture grounding metadata if available
        if (response.candidates?.[0]?.groundingMetadata) {
            groundingMetadata = response.candidates[0].groundingMetadata;
            console.log("✅ Grounding metadata captured - real search was performed");

            if (groundingMetadata.searchEntryPoint?.renderedContent) {
                console.log("📰 Search sources used for grounding");
            }
        }

        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        topics = JSON.parse(text);

        console.log(`✅ Found ${topics.length} potential trending topics`);
        topics.forEach((t, i) => {
            console.log(`   ${i + 1}. "${t.topic}" (${t.category}, freshness: ${t.freshness_score}/10)`);
        });

    } catch (e) {
        console.error("❌ Topic search failed:", e.message);
        return null;
    }

    // Phase 2: Filter out recently covered topics
    console.log("\n🔄 Phase 2: Filtering duplicates...");

    const freshTopics = [];
    for (const topic of topics) {
        const isDupe = await wasRecentlyCovered(topic.topic);
        if (!isDupe) {
            freshTopics.push(topic);
        }
    }

    console.log(`✅ ${freshTopics.length} fresh topics after deduplication`);

    if (freshTopics.length === 0) {
        console.log("⚠️ All topics were recently covered. Falling back to evergreen content.");
        // Fallback to seasonal/evergreen topics
        freshTopics.push({
            topic: getSeasonalEvergreen(),
            category: "Lifestyle",
            summary: "A timely seasonal guide for Bend locals and visitors.",
            why_relevant: "Seasonal content that's always useful during this time of year.",
            freshness_score: 5
        });
    }

    // Phase 3: Select top 3 topics for the queue
    const sortedTopics = freshTopics.sort((a, b) => b.freshness_score - a.freshness_score);
    const topThree = sortedTopics.slice(0, 3);
    console.log(`\n🏆 Top 3 Topics Selected:`);
    topThree.forEach((t, i) => console.log(`   ${i + 1}. "${t.topic}" (Score: ${t.freshness_score}/10)`));

    // Phase 4: Deep research on each topic
    console.log("\n🔬 Phase 4: Deep research on all selected topics...");

    const queuedTopics = [];

    for (const topic of topThree) {
        const researchPrompt = `
        Research this topic in detail for Bend, Oregon: "${topic.topic}"
        
        Provide comprehensive information including:
        1. The key facts and latest updates
        2. Relevant local context (venues, businesses, officials involved)
        3. Impact on Bend residents
        4. Useful links or resources locals should know about
        5. What to expect next / timeline
        
        Format as a well-organized research brief with clear sections.
        Include specific names, dates, and locations when available.
        `;

        let researchReport = "";
        try {
            console.log(`   Researching: "${topic.topic}"...`);
            const researchResult = await model.generateContent(researchPrompt);
            researchReport = researchResult.response.text();
        } catch (e) {
            console.warn(`   Research failed for "${topic.topic}", using summary`);
            researchReport = topic.summary;
        }

        queuedTopics.push({
            ...topic,
            researchReport,
            groundingUsed: !!groundingMetadata
        });
    }

    console.log("✅ Deep research complete for all topics");

    // Phase 5: Save to Firestore as QUEUE
    console.log("\n💾 Phase 5: Saving topic queue...");

    const batch = db.batch();
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < queuedTopics.length; i++) {
        const topic = queuedTopics[i];
        const slug = `queued-${todayStr}-${i + 1}`;
        const docRef = db.collection('trend_queue').doc(slug);

        batch.set(docRef, {
            topic: topic.topic,
            category: topic.category,
            summary: topic.summary,
            whyRelevant: topic.why_relevant,
            freshnessScore: topic.freshness_score,
            researchReport: topic.researchReport,
            groundingUsed: topic.groundingUsed,
            status: "queued",
            priority: i + 1, // 1 = highest priority
            scoutedAt: admin.firestore.FieldValue.serverTimestamp(),
            type: "queued_trend",
            version: "v2"
        });

        console.log(`   ✅ Queued #${i + 1}: "${topic.topic}"`);
    }

    await batch.commit();
    console.log(`✅ ${queuedTopics.length} topics saved to trend_queue`);

    return { queued: queuedTopics.length, topics: queuedTopics.map(t => t.topic) };
}

/**
 * Check if the trend queue needs refilling.
 * If there are fewer than N queued items, it triggers a new scouting run.
 * @param {number} minQueueSize - The minimum number of queued items desired.
 * @returns {boolean} True if a scouting run was initiated, false otherwise.
 */
async function checkAndRefillTrendQueue(minQueueSize = 3) {
    console.log(`Checking trend queue for refill (minQueueSize: ${minQueueSize})...`);
    try {
        const queueSnapshot = await db.collection('trend_queue')
            .where('status', '==', 'queued')
            .get();

        const currentQueueSize = queueSnapshot.size;
        console.log(`Current queued items: ${currentQueueSize}`);

        if (currentQueueSize < minQueueSize) {
            console.log(`Queue size (${currentQueueSize}) is below minimum (${minQueueSize}). Initiating new scouting run.`);
            const result = await runTrendScoutV2();
            if (result && result.queued > 0) {
                console.log(`Successfully added ${result.queued} new topics to the queue.`);
                return true;
            } else {
                console.log("Scouting run completed, but no new topics were added to the queue.");
                return false;
            }
        } else {
            console.log("Trend queue is sufficiently filled. No refill needed.");
            return false;
        }
    } catch (error) {
        console.error("Error checking or refilling trend queue:", error);
        return false;
    }
}

/**
 * Get a seasonal evergreen topic as fallback
 */
function getSeasonalEvergreen() {
    const month = new Date().getMonth();
    const seasonalTopics = {
        // Winter (Dec, Jan, Feb)
        0: ["Best ski conditions at Mt. Bachelor this week", "Winter hiking trails near Bend", "Indoor activities for snowy days in Bend"],
        1: ["Valentine's Day date spots in Bend", "Late season skiing at Bachelor", "Winter beer releases from local breweries"],
        11: ["Holiday events in downtown Bend", "Winter solstice celebrations", "Best gift shops in Bend"],
        // Spring (Mar, Apr, May)
        2: ["Spring skiing at Mt. Bachelor", "Early season trail conditions", "Bend spring break activities"],
        3: ["Deschutes River opening day", "Spring wildflower hikes", "Patio season begins in Bend"],
        4: ["Best patios open for the season", "Memorial Day events in Bend", "Spring road biking routes"],
        // Summer (Jun, Jul, Aug)
        5: ["Summer concert series lineup", "Float the Deschutes guide", "Best swimming holes near Bend"],
        6: ["Fourth of July events in Bend", "Peak floating season tips", "Summer festivals calendar"],
        7: ["Beat the heat in Bend", "Late summer hiking spots", "Bend Ale Trail updates"],
        // Fall (Sep, Oct, Nov)
        8: ["Fall color drives near Bend", "Labor Day weekend events", "Back to school in Bend"],
        9: ["October events in Bend", "Fall hiking recommendations", "Halloween events for families"],
        10: ["Thanksgiving dining in Bend", "Early ski season preview", "Holiday shopping guide"]
    };

    const options = seasonalTopics[month] || seasonalTopics[0];
    return options[Math.floor(Math.random() * options.length)];
}

// Allow direct execution for testing
if (require.main === module) {
    runTrendScoutV2()
        .then(result => {
            console.log("\n📋 Final Result:", result ? result.topic : "No result");
            process.exit(0);
        })
        .catch(err => {
            console.error("Fatal error:", err);
            process.exit(1);
        });
}

module.exports = runTrendScoutV2;
