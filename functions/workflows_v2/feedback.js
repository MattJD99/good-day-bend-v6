const { db, admin } = require('../lib/firebase');

/**
 * handleFeedback (HTTP Function Logic)
 * Usage: GET /feedback?draftId=...&rating=5
 */
async function handleFeedback(req, res) {
    const { draftId, rating } = req.query;

    if (!draftId || !rating) {
        return res.status(400).send("Missing draftId or rating");
    }

    const score = parseInt(rating);
    const docRef = db.collection('drafts').doc(draftId);

    try {
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).send("Draft not found");
        }

        const data = doc.data();

        // 1. Log the feedback
        await docRef.update({
            rating: score,
            ratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Reflexion: If 4 or 5 stars, save to Knowledge Base for future recall
        if (score >= 4) {
            const kbRef = db.collection('knowledge_base').doc(draftId);
            await kbRef.set({
                ...data,
                rating: score,
                savedAt: admin.firestore.FieldValue.serverTimestamp(),
                type: "good_example"
            });
            console.log(`🧠 Saved 5-star example to Knowledge Base: ${data.title}`);
        }

        // 3. Render a simple "Thank You" page
        const html = `
        <div style="font-family:sans-serif; text-align:center; padding:50px;">
            <h1 style="color:#13ec5b;">Feedback Received! (${score} Stars)</h1>
            <p>Thank you for teaching the specific style you prefer.</p>
            <p>I have saved this preference and will use it to specificially improve tomorrow's post.</p>
        </div>
        `;

        return res.status(200).send(html);

    } catch (error) {
        console.error("Feedback Error:", error);
        return res.status(500).send("Internal Error");
    }
}

module.exports = handleFeedback;
