const { modelReasoning: model } = require('../lib/gemini');
const { db } = require('../lib/firebase');
const CONFIG = require('../config');

async function main() {
    console.log("⭐ Starting Event Curation...");

    if (!db) {
        console.error("❌ No DB Connection.");
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const snapshot = await db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS)
        .where('eventDate', '==', todayStr)
        .get();

    if (snapshot.empty) {
        console.log("No events found for today to curate.");
        return;
    }

    const events = [];
    snapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Analyzing ${events.length} events...`);

    const prompt = `
    Task: Pick the TOP 3 most exciting events from this list for a general audience in Bend, Oregon.
    Input JSON: ${JSON.stringify(events.map(e => ({ id: e.id, title: e.title, category: e.category })))}
    Output: JSON array of IDs only. e.g. ["id1", "id2", "id3"]
    Criteria: Unique, fun, community vibe, high quality.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let topIds = [];
    try {
        topIds = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse curation result:", text);
        return;
    }

    console.log("🏆 Top Events Selected:", topIds);

    const batch = db.batch();

    events.forEach(ev => {
        const isFeatured = topIds.includes(ev.id);
        const ref = db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS).doc(ev.id);
        batch.update(ref, { featured: isFeatured });
    });

    await batch.commit();
    console.log("✅ Curation complete testing. Firestore updated.");
}

if (require.main === module) {
    main();
}

module.exports = main;
