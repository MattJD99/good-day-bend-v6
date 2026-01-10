/**
 * 1_TheScout.js (Workflow)
 * PURPOSE: Find events, clean data, and populate the 'events' Firestore collection.
 * SCHEDULE: Daily @ 3:00 AM
 */

const { getSegmentedModel } = require('../lib/gemini');
const { generateImage, generateImageWithInspiration } = require('../lib/imageGen');
const { db, admin } = require('../lib/firebase');
const CONFIG = require('../config');

// Initialize Segmented Model for Research
const modelReasoning = getSegmentedModel('RESEARCH', CONFIG.MODEL_REASONING);

async function runScout(daysArg, specificDateStr) {
    console.log("🕵️‍♀️ Scout Activation: Scanning Bend, OR...");

    // 1. Define Search Scope
    let today;
    if (specificDateStr) {
        // Use provided date
        today = new Date(specificDateStr);
        console.log(`🗓️ Targeted Scout for specific date: ${specificDateStr}`);
    } else {
        // Default: Bend's "Today"
        const bendNow = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
        today = new Date(bendNow);
    }

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
        // If specific date is NOT set, default to Today + Tomorrow
        // If specific date IS set, default to JUST that day (unless daysArg > 1)
        if (!specificDateStr) {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            datesToScan.push(tomorrow);
        }
    }

    if (!db) {
        console.error("❌ Database connection missing. Scout aborting.");
        return;
    }

    for (const date of datesToScan) {
        const dateStr = date.toLocaleDateString("en-US", { dateStyle: 'full' });
        const isoDate = date.toISOString().split('T')[0];

        console.log(`\n🔎 Researching: ${dateStr}`);

        // 2. The Research Prompt (REAL DATA EDITION)
        // New Flow: Search -> Context -> LLM Extraction

        // A. Perform Real Search
        console.log(`📡 Satellite Uplink: Searching live internet for ${dateStr}...`);
        let searchContext = "";
        try {
            const { searchBendEvents } = require('../lib/search');
            searchContext = await searchBendEvents(dateStr);
            console.log("✅ Search Complete. Context Length:", searchContext.length);
        } catch (searchErr) {
            console.error("⚠️ Search System Failure:", searchErr);
            searchContext = "Search failed. Use internal knowledge only if 100% sure.";
        }

        // B. The Extraction Prompt
        const prompt = `
        You are the Data Scout for "Good Day Bend".
        Target Date: ${dateStr}
        Location: Bend, Oregon.
        
        SOURCE MATERIAL (REAL SEARCH RESULTS):
        ${searchContext}
        
        Task: Extract 5-10 REAL, CONFIRMED events from the search results above for this specific date.
        
        CRITICAL RULES:
        1.  **NO HALLUCINATIONS**: If it's not in the source material (or you can't infer it's confirmed for THIS date), DO NOT include it.
        2.  **Date Match**: Verify the search result actually refers to ${dateStr}.
        3.  **Data Integrity**:
            - Exact Venue Name and Address are required.
            - Times must be specific.
        
        Output JSON Format (Array of Objects):
        [{
            "title": "Event Name",
            "venue": "Venue Name",
            "address": "Full Street Address, Bend, OR",
            "time": "7:00 PM",
            "category": "Music | Family | Food | Art | Outdoors",
            "price": "Free or $Price",
            "price": "Free or $Price",
            "description": "Short 1-sentence summary for cards.",
            "richDescription": "Detailed 2-3 paragraph description of the event, including history, vibe, and what to expect. Use HTML <p> tags.",
            "sourceUrl": "URL from snippet",
            "hypeScore": 1-10,
            "imagePrompt": "Visual description of the event for AI generation (no text, photorealistic style)"
        }]
        `;

        try {
            let result;
            let retryCount = 0;
            const maxRetries = 5;

            while (retryCount < maxRetries) {
                try {
                    result = await modelReasoning.generateContent(prompt);
                    break; // Success
                } catch (genErr) {
                    if (genErr.message.includes('429') || genErr.status === 429) {
                        retryCount++;
                        const waitTime = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s, 40s, 80s
                        console.warn(`⚠️ API Quota Exceeded (429). Retrying in ${waitTime / 1000}s... (Attempt ${retryCount}/${maxRetries})`);
                        await new Promise(r => setTimeout(r, waitTime));
                    } else {
                        throw genErr; // Rethrow other errors
                    }
                }
            }

            if (!result) throw new Error("Failed to generate content after retries.");
            const rawText = result.response.text();
            const jsonStartIndex = rawText.indexOf('[');
            const jsonEndIndex = rawText.lastIndexOf(']');

            let jsonStr = "";
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                jsonStr = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
            } else {
                jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            }
            let events = [];
            try {
                events = JSON.parse(jsonStr);
            } catch (jsonErr) {
                console.error(`⚠️ JSON Parse Failed for ${dateStr}:`, jsonErr);
                continue; // Skip this date
            }

            console.log(`✅ Extracted ${events.length} confirmed events from Search Data.`);

            // 3. The Clean Database Write
            const batch = db.batch();
            let count = 0;

            // Process events sequentially to avoid rate limits
            for (const event of events) {
                if (!event.title) continue;

                // Create a clean slug ID
                const cleanTitle = event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
                const slug = `${cleanTitle}-${isoDate}`;

                // Image Logic: Try to find existing or generate
                let imageUrl = "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800"; // Fallback
                try {
                    // Check, don't regen if exists AND is a safe/trusted URL
                    const docCheck = await db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS).doc(slug).get();
                    const existingImg = docCheck.exists ? docCheck.data().image : null;

                    if (existingImg && (existingImg.includes('firebasestorage') || existingImg.includes('unsplash'))) {
                        imageUrl = existingImg;
                        console.log(`⏭️ Image is safe (Firebase/Unsplash) for ${event.title}, skipping gen.`);
                    } else {
                        console.log(`🎨 Remixing Vision for: ${event.title} (Reason: New or Unsafe URL)`);
                        // Vision Remix: Search -> Vision -> Generate
                        imageUrl = await generateImageWithInspiration(event.title, event.imagePrompt);
                    }
                } catch (imgErr) {
                    console.warn(`Failed to generate image for ${event.title}`, imgErr);
                }

                const docRef = db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS).doc(slug);
                batch.set(docRef, {
                    ...event,
                    eventDate: isoDate,
                    scoutedAt: admin.firestore.FieldValue.serverTimestamp(),
                    syncedToCalendar: true,
                    isRealData: true,
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

if (require.main === module) {
    runScout();
}

module.exports = runScout;
