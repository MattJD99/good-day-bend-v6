const { modelFast: model } = require('../lib/gemini');
const { db, admin } = require('../lib/firebase');
const CONFIG = require('../config');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("🔍 Starting Event Gathering Workflow...");

    const args = process.argv.slice(2);
    const daysArg = args[0] ? parseInt(args[0]) : 1;
    const daysToGather = isNaN(daysArg) ? 1 : daysArg;

    console.log(`📅 Gathering events for the next ${daysToGather} day(s)...`);

    const addDays = (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const today = new Date();

    for (let i = 0; i < daysToGather; i++) {
        const targetDate = addDays(today, i);
        const dateString = targetDate.toLocaleDateString("en-US", { dateStyle: 'full' });
        const isoDate = targetDate.toISOString().split('T')[0];

        console.log(`\n--- Processing: ${dateString} ---`);

        const prompt = `
        context: You are a local event scout for "Good Day Bend".
        task: Search for 5-7 specific, real events happening in Bend, Oregon on ${dateString}.
        output_format: Return a strictly valid JSON array of objects. No markdown.
        
        Each object must have:
        - title (string)
        - venue (string)
        - time (string)
        - description (string, 1 brief sentence)
        - price (string, e.g. "Free" or "$20")
        - category (string, select from: "Music", "Art", "Outdoors", "Community", "Food/Drink")
        - link (string, url if found, else null)
        `;

        console.log(`🤖 Asking Gemini to find events...`);

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            let events = [];
            try {
                events = JSON.parse(jsonStr);
            } catch (e) {
                console.error("Failed to parse JSON entries:", responseText);
                continue;
            }

            console.log(`✅ Found ${events.length} events for ${isoDate}.`);

            if (db) {
                const batch = db.batch();

                for (const event of events) {
                    const slug = `${event.title}-${isoDate}`
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-');

                    const docRef = db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS).doc(slug);

                    batch.set(docRef, {
                        ...event,
                        dateScouted: admin.firestore.FieldValue.serverTimestamp(),
                        eventDate: isoDate,
                        featured: false,
                        syncedToGHL: false
                    }, { merge: true });
                }

                await batch.commit();
                console.log("💾 Saved events/updates to Firestore.");
            } else {
                console.warn("⚠️ Database not connected. Skipping save.");
            }

            if (daysToGather > 1) await delay(2000);

        } catch (error) {
            console.error(`❌ Error gathering events for ${dateString}:`, error.message);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = main;
