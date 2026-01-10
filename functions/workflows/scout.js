/**
 * 1_TheScout.js (Workflow)
 * PURPOSE: Find events, clean data, and populate the 'events' Firestore collection.
 * SCHEDULE: Daily @ 3:00 AM
 */

const { getSegmentedModel } = require('../lib/gemini');
const { generateImage } = require('../lib/imageGen');
const { db, admin } = require('../lib/firebase');
const CONFIG = require('../config');

// Initialize Segmented Model for Research
const modelReasoning = getSegmentedModel('RESEARCH', CONFIG.MODEL_REASONING);

async function runScout(daysArg) {
    console.log("🕵️‍♀️ Scout Activation: Scanning Bend, OR...");


    // 1. Define Search Scope (Bend Local Time)
    // Cloud Functions run in UTC. 3 AM UTC is 7 PM Prev Day in Bend.
    // We must force "Bend's Today".

    // Get Bend's current time
    const bendNow = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const today = new Date(bendNow);

    const datesToScan = [today];

    // Check if we want to scan more days (optional arg)
    const daysToLookAhead = daysArg ? parseInt(daysArg) : 1;
    if (daysToLookAhead > 1) {
        for (let i = 1; i < daysToLookAhead; i++) {
            const nextDay = new Date(today);
            nextDay.setDate(today.getDate() + i);
            datesToScan.push(nextDay);
        }
    } else {
        // Default Master Plan says "Today + Tomorrow"
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        datesToScan.push(tomorrow);
    }

    if (!db) {
        console.error("❌ Database connection missing. Scout aborting.");
        return;
    }

    for (const date of datesToScan) {
        const dateStr = date.toLocaleDateString("en-US", { dateStyle: 'full' });
        const isoDate = date.toISOString().split('T')[0];

        console.log(`\n🔎 Researching: ${dateStr}`);

        // 2. The Research Prompt (Strict Data Only)
        const prompt = `
        You are the Data Scout for "Good Day Bend".
        Target Date: ${dateStr}
        Location: Bend, Oregon.
        
        Task: Find 5-10 real, confirmed events happening on this specific date.
        
        CRITICAL DATA INTEGRITY:
        - Exact Venue Name and Address are required for the map.
        - Times must be specific (e.g., "19:00" or "7:00 PM").
        
        Output JSON Format (Array of Objects):
        [{
            "title": "Event Name",
            "venue": "Venue Name",
            "address": "Full Street Address, Bend, OR",
            "time": "7:00 PM",
            "category": "Music | Family | Food | Art | Outdoors",
            "price": "Free or $Price",
            "description": "Factual 1-sentence summary.",
            "hypeScore": 1-10 (Integer. How big is this event? 10=Blockbuster)
        }]
        `;

        try {
            const result = await modelReasoning.generateContent(prompt);
            const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            let events = [];
            try {
                events = JSON.parse(jsonStr);
            } catch (jsonErr) {
                console.error(`⚠️ JSON Parse Failed for ${dateStr}:`, jsonErr);
                continue; // Skip this date
            }

            // 3. The Clean Database Write
            const batch = db.batch();
            let count = 0;

            events.forEach(event => {
                // Add to processing queue (async)
                if (!event.title) return;
            });

            // Process events sequentially to avoid rate limits
            for (const event of events) {
                if (!event.title) continue;

                // Create a clean slug ID
                const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
                const slug = `${cleanTitle}-${isoDate}`;

                // Image Logic: Try to find existing or generate
                // Since we don't have a search tool here, we will generate.
                let imageUrl = "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800"; // Fallback
                try {
                    console.log(`🎨 Generating image for: ${event.title}`);
                    const imagePrompt = `A high-quality, photorealistic image representing an event in Bend Oregon called "${event.title}". Context: ${event.description}. Category: ${event.category}. Style: High Desert, Professional Photography.`;

                    // Call Image Gen (returns URL)
                    imageUrl = await generateImage(imagePrompt);
                } catch (imgErr) {
                    console.warn(`Failed to generate image for ${event.title}`, imgErr);
                }

                const docRef = db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS).doc(slug);
                batch.set(docRef, {
                    ...event,
                    eventDate: isoDate,
                    scoutedAt: admin.firestore.FieldValue.serverTimestamp(),
                    syncedToCalendar: true,
                    image: imageUrl
                }, { merge: true });
                count++;
            }

            if (count > 0) {
                await batch.commit();
                console.log(`💾 Saved ${count} events for ${dateStr}.`);
            } else {
                console.log(`⚠️ No valid events found for ${dateStr}.`);
            }

        } catch (e) {
            console.error(`❌ Scout failed for ${dateStr}:`, e);
        }
    }

    return "Scout Mission Complete";
}

module.exports = runScout;
