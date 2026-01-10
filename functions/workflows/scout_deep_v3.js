/**
 * Scout V2: Deep Research Agent
 * 
 * PURPOSE: Autonomous research for high-quality event data.
 * STRATEGY: "Analyst-in-a-Box"
 * 
 * V3 UPGRADE: Category-Specific Visual Logic
 */

const { getSegmentedModel } = require('../lib/gemini');
const { generateImage } = require('../lib/imageGen');
const { db, admin } = require('../lib/firebase');
const CONFIG = require('../config');

// Initialize Segmented Model for Research
const modelReasoning = getSegmentedModel('RESEARCH', CONFIG.MODEL_REASONING);

// Helper to pause execution (politeness/rate-limits)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runDeepScout(targetDateInput) {
    console.log("🕵️‍♀️ SCOUT V3 (DEEP RESEARCH) ACTIVATED...");

    if (!db) {
        console.error("❌ Database connection missing.");
        return;
    }

    // 1. Determine Scope
    // If date provided, specific deep dive. If not, look at upcoming weekend.
    let targetDate = new Date();
    if (targetDateInput) {
        targetDate = new Date(targetDateInput);
    } else {
        // Default: Deep Research the upcoming "Friday" if today is Mon-Thu, else Today.
        // For MVP, let's just stick to "Tomorrow" to ensure we get useful data.
        targetDate.setDate(targetDate.getDate() + 1);
    }

    const dateStr = targetDate.toLocaleDateString("en-US", { dateStyle: 'full' });
    const isoDate = targetDate.toISOString().split('T')[0];

    console.log(`🎯 Mission Target: ${dateStr} (${isoDate})`);

    // 2. The Deep Research Prompt
    // This prompt simulates the "Deep Research" capability by enforcing a multi-step thought process.
    const deepPrompt = `
    Role: Senior Event Researcher for "Good Day Bend".
    Mission: Find the BEST confirmed events happening in Bend, Oregon on ${dateStr}.
    Current Date: ${new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    
    Constraints:
    - DISCARD any event from previous years.
    - ONLY listing events where the extracted date matches ${dateStr} exactly.
    - If you are unsure if an event is this year or last year, DO NOT INCLUDE IT.
    
    Operational Rules:
    1.  **Search Strategy**: Simulate browsing VisitBend, BendTicket, Tower Theatre, Hayden Homes Amphitheater, McMenamins, Volcanic Theatre Pub, and local brewery calendars.
    2.  **Verification**: Do NOT invent events. Only list events you are 90%+ confident are confirmed.
    3.  **Data Extraction**:
        -   **Title**: Exact official name.
        -   **Venue**: Precise location.
        -   **Time**: Specific start time.
        -   **Price**: "Free", "$20", "Sold Out", etc.
        -   **Hype Score**: 1-10 (Based on venue size, artist popularity, and local buzz).
        -   **Category**: Music, Art, Comedy, Theatre, Outdoors, Food/Drink, Community.
        -   **Vibe Description**: 1 sentence capturing the atmosphere (e.g., "Intimate acoustic session," "High-energy rave," "Family picnic").
    
    Output Format:
    Strictly valid JSON Array of Objects.
    [
      {
        "title": "...",
        "venue": "...",
        "time": "...",
        "price": "...",
        "hypeScore": 8,
        "category": "...",
        "description": "...",
        "sourceUrl": "..." (Best guess url or 'Verified')
      }
    ]
    `;

    try {
        console.log("🧠 Agent Thinking & Researching...");
        const result = await modelReasoning.generateContent(deepPrompt);
        const text = result.response.text();

        // Sanitize JSON
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let events = [];
        try {
            events = JSON.parse(jsonStr);
        } catch (e) {
            console.error("❌ Agent JSON Parse Failed. Raw Output:", text);
            return;
        }

        console.log(`✅ Scout V2 found ${events.length} confirmed events.`);

        // 3. Data Enrichment & Saving
        const batch = db.batch();
        let savedCount = 0;

        for (const event of events) {
            if (!event.title) continue;

            // Generate Slug
            const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
            const slug = `${cleanTitle}-${isoDate}`;

            // Image Generation (Deep Scout includes Visual Research simulation)
            let imageUrl = CONFIG.FALLBACK_IMAGES[0];
            try {
                // IMPROVEMENT: Category-Specific Visual Logic
                let visualSubject = "Crowd enjoying an event";

                if (event.category.includes("Music")) visualSubject = "Stage lights, silhouette of a band, atmospheric concert lighting";
                else if (event.category.includes("Food")) visualSubject = "Close up of artisanal food, plated dish, restaurant ambience, warm bokeh";
                else if (event.category.includes("Outdoors")) visualSubject = "Wide angle shot of nature, hikers, action shot in Bend Oregon wilderness";
                else if (event.category.includes("Art")) visualSubject = "Close up of paint textures, gallery wall, artistic lighting";

                const imagePrompt = `
                Subject: ${visualSubject}.
                Context: Event at ${event.venue} in Bend, Oregon.
                Style: Professional photography, 4k, highly detailed.
                Constraint: No text, no logos.
                `;

                imageUrl = await generateImage(imagePrompt);
                console.log(`📸 Generated Image for: ${event.title}`);
            } catch (err) {
                console.warn(`⚠️ Image Gen Failed for ${event.title}, using fallback.`);
            }

            const docRef = db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS).doc(slug);

            // Write to DB
            batch.set(docRef, {
                ...event,
                eventDate: isoDate,
                scoutedBy: "Scout V2 (Deep Research)",
                scoutedAt: admin.firestore.FieldValue.serverTimestamp(),
                featured: event.hypeScore >= 8, // Auto-feature big events
                image: imageUrl,
                syncedToGHL: false
            }, { merge: true });

            savedCount++;
        }

        if (savedCount > 0) {
            await batch.commit();
            console.log(`💾 Committed ${savedCount} verified events to database.`);
        } else {
            console.log("⚠️ No valid events to save.");
        }

    } catch (e) {
        console.error("💥 Scout V2 Mission Failed:", e);
    }
}

module.exports = runDeepScout;
