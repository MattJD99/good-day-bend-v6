const { db, admin } = require('../lib/firebase');

/**
 * handleFeedback (HTTP Function Logic)
 * Usage: GET /feedback?draftId=...&rating=5
 * 
 * LEARNING SYSTEM:
 * - Saves ALL ratings (1-5) to 'ratings' collection for tracking patterns
 * - 4-5 stars: Saved to knowledge_base as "good_example"
 * - 1-2 stars: Saved to knowledge_base as "bad_example" (avoid this style)
 * - 3 stars: Neutral, not saved to knowledge_base
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

        // 1. Log the feedback on the draft
        await docRef.update({
            rating: score,
            ratedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Save ALL ratings to 'ratings' collection for learning analytics
        await db.collection('ratings').add({
            draftId: draftId,
            rating: score,
            title: data.title || data.blog_title || 'Untitled',
            type: data.type || 'daily_update',
            ratedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Extract key patterns for learning
            hasImage: !!(data.imageUrl || data.image),
            contentLength: (data.rawHTML || data.blog_html || '').length,
            tags: data.tags || []
        });
        console.log(`📊 Rating saved: ${score} stars for "${data.title}"`);

        // 3. Reflexion: Save to Knowledge Base based on rating
        if (score >= 4) {
            // GOOD example - emulate this style
            const kbRef = db.collection('knowledge_base').doc(draftId);
            await kbRef.set({
                ...data,
                rating: score,
                savedAt: admin.firestore.FieldValue.serverTimestamp(),
                type: "good_example",
                learningNote: "User rated highly - emulate this style"
            });
            console.log(`🧠 Saved ${score}-star GOOD example to Knowledge Base: ${data.title}`);
        } else if (score <= 2) {
            // BAD example - avoid this style
            const kbRef = db.collection('knowledge_base').doc(`avoid-${draftId}`);
            await kbRef.set({
                title: data.title,
                rating: score,
                savedAt: admin.firestore.FieldValue.serverTimestamp(),
                type: "bad_example",
                learningNote: "User rated poorly - avoid this style",
                // Only save key characteristics, not full content
                characteristics: {
                    hasImage: !!(data.imageUrl || data.image),
                    contentLength: (data.rawHTML || data.blog_html || '').length,
                    category: data.category || data.type
                }
            });
            console.log(`🚫 Saved ${score}-star BAD example to Knowledge Base: ${data.title}`);
        }
        // score === 3 is neutral, not saved to KB

        // 4. Render a simple "Thank You" page with feedback context
        const feedbackMessage = score >= 4
            ? "Great! I'll use this as inspiration for future posts."
            : score <= 2
                ? "Got it. I'll avoid this style in the future."
                : "Thanks! Your feedback helps me learn your preferences.";

        const html = `
        <div style="font-family:sans-serif; text-align:center; padding:50px; background:#0d1b12; min-height:100vh;">
            <h1 style="color:#13ec5b; font-size:3rem;">${'⭐'.repeat(score)}</h1>
            <h2 style="color:white;">Feedback Received!</h2>
            <p style="color:#ccc; font-size:1.2rem;">${feedbackMessage}</p>
            <p style="color:#666; margin-top:30px; font-size:0.9rem;">Draft: ${data.title || draftId}</p>
        </div>
        `;

        return res.status(200).send(html);

    } catch (error) {
        console.error("Feedback Error:", error);
        return res.status(500).send("Internal Error");
    }
}

module.exports = handleFeedback;
