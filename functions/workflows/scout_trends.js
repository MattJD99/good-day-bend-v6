/**
 * Scout Trends V2: Deep Research Agent for Viral Local Topics
 * 
 * PURPOSE: Autonomous investigative journalism for Good Day Bend.
 * ARCHITECTURE: Async Polling / Long-Running Job (60 min timeout).
 * 
 * WORKFLOW:
 * 1. Identify potential viral topics (Broad Scan).
 * 2. Select top candidate.
 * 3. "Deep Research" Loop (Simulated for SDK compatibility):
 *    - Search multiple sources (News, City Council, Socials).
 *    - Verify facts.
 *    - Compile "Why it matters".
 * 4. Save "Trend Report" to Firestore.
 */

const { getSegmentedModel } = require('../lib/gemini');
const { db, admin } = require('../lib/firebase');
const CONFIG = require('../config');

// Initialize Segmented Model for Research
const modelReasoning = getSegmentedModel('RESEARCH', CONFIG.MODEL_REASONING);

// Helper to pause execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTrendScout() {
    console.log("🕵️‍♂️ SCOUT TRENDS V2 (DEEP RESEARCH) STARTED...");

    if (!db) {
        console.error("❌ Database connection missing.");
        return;
    }

    // 1. BROAD SCAN: Identification Phase
    console.log("📡 Phase 1: Broad Scan for Topics...");
    const identPrompt = `
    Role: Local News Editor for Bend, Oregon.
    Task: Identify 3 potentially "Viral" or "High Interest" local topics right now.
    
    Focus Areas:
    - Local Government (City Council decisions, Zoning, Schools).
    - Outdoor Recreation (Snowpack, Trail openings, River flows).
    - Lifestyle (New big businesses, Housing market shifts).
    
    Output JSON:
    [
        {"topic": "...", "category": "...", "potential_viral_score": 1-10}
    ]
    `;

    let topics = [];
    try {
        const result = await modelReasoning.generateContent(identPrompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        topics = JSON.parse(text);
    } catch (e) {
        console.error("❌ Identification Phase Failed:", e);
        return;
    }

    // Select Winner
    const winner = topics.sort((a, b) => b.potential_viral_score - a.potential_viral_score)[0];
    console.log(`🏆 Selected Topic for Deep Research: "${winner.topic}" (Score: ${winner.potential_viral_score})`);

    // 2. DEEP RESEARCH LOOP
    console.log("🔬 Phase 2: Deep Research Mode (Simulating Agent Loop)...");

    // In a full "Deep Research API" integration, this is where we would trigger the async job.
    // Here we simulate the depth by chaining reasoning steps.

    const researchSteps = [
        "Fact Checking: Verifying dates, specific numbers, and names.",
        "Context Gathering: Finding historical context or previous related events.",
        "Sentiment Analysis: Understanding what locals are saying about this.",
        "Visual Planning: Determining what maps or charts would explain this."
    ];

    let researchNotes = [];

    for (const step of researchSteps) {
        console.log(`... Executing Sub-Task: ${step}`);
        const stepPrompt = `
        Topic: ${winner.topic}
        Current Phase: ${step}
        
        Action: Perform a 'mental simulation' of searching local Bend sources (Bulletin, VisitBend, Reddit/r/Bend).
        Summarize the key findings for this specific phase.
        `;

        try {
            const stepResult = await modelReasoning.generateContent(stepPrompt);
            researchNotes.push(`### ${step}\n${stepResult.response.text()}`);
            await delay(2000); // Simulate "Thinking/Browsing" time
        } catch (e) {
            console.warn(`Step failed: ${step}`);
        }
    }

    // 3. SYNTHESIS
    console.log("📝 Phase 3: Synthesizing Trend Report...");

    const reportBody = researchNotes.join("\n\n");
    const todayStr = new Date().toISOString().split('T')[0];
    const slug = `trend-report-${todayStr}`;

    // 4. SAVE TO FIRESTORE
    // This 'Trend Report' will be picked up by the Blog Writer (Writer V2)
    const docData = {
        topic: winner.topic,
        category: winner.category,
        viralScore: winner.potential_viral_score,
        researchReport: reportBody,
        status: "ready",
        scoutedAt: admin.firestore.FieldValue.serverTimestamp(),
        type: "deep_trend_report"
    };

    await db.collection(CONFIG.FIREBASE_COLLECTION_TREND_REPORTS).doc(slug).set(docData);
    console.log(`💾 Trend Report Saved to ${CONFIG.FIREBASE_COLLECTION_TREND_REPORTS}: ${slug}`);

    // Optional: Trigger Writer Immediately? 
    // For decoupled architecture, we let the Schedule trigger the Writer, 
    // OR we return the data if called directly.
    return docData;
}

module.exports = runTrendScout;
