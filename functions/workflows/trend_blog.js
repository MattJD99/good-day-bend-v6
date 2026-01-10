const { getSegmentedModel } = require('../lib/gemini');
const { db, admin } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const { generateImage } = require('../lib/imageGen');
const CONFIG = require('../config');

// Initialize Segmented Model for Blog
const model = getSegmentedModel('BLOG', CONFIG.MODEL_REASONING);

async function main() {
    console.log("📈 Starting Trend Blog Workflow...");
    console.log("DEBUG CONFIG MODEL:", CONFIG.MODEL_REASONING);

    // 1. Research Trend (Deep Research Check)
    // First, check if "Scout Trends V2" has left us a report today.
    const todayStr = new Date().toISOString().split('T')[0];
    const reportSlug = `trend-report-${todayStr}`;
    let topic = "";
    let researchContext = "";

    try {
        const reportDoc = await db.collection(CONFIG.FIREBASE_COLLECTION_TREND_REPORTS).doc(reportSlug).get();
        if (reportDoc.exists && reportDoc.data().status === 'ready') {
            const data = reportDoc.data();
            console.log(`🧠 Found Deep Research Report: "${data.topic}"`);
            topic = data.topic;
            researchContext = data.researchReport;
        }
    } catch (e) {
        console.warn("Could not check for Deep Research report:", e.message);
    }

    if (!topic) {
        console.log("⚡️ No Deep Research found. Falling back to Quick Scan...");
        const researchPrompt = `
        Find a trending or interesting topic relevant to Bend, Oregon RIGHT NOW (News, Lifestyle, Season, Viral Local Subject).
        Examples: "First Snow at Bachelor", "New Brewery Opening", "Summer Floating Rules", "Housing Market Vibe".
        Return just the Topic Name.
        `;
        const topicResult = await model.generateContent(researchPrompt);
        topic = topicResult.response.text().trim();
    }

    console.log(`💡 Identified Topic: ${topic}`);

    // 1.5 CHECK DUPLICATES
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const existingDocs = await db.collection(CONFIG.FIREBASE_COLLECTION_ARTICLES)
            .where('topic', '==', topic)
            .where('createdAt', '>', yesterday)
            .get();

        if (!existingDocs.empty) {
            console.log(`⚠️ Topic "${topic}" already covered recently. Skipping to avoid duplicates.`);
            return;
        }
    } catch (err) {
        console.warn("Deduplication check failed, proceeding anyway:", err);
    }

    // 2. Write Article
    const writePrompt = `
    Role: Expert Content Creator for "Good Day Bend".
    Topic: ${topic}
    Deep Research Context: ${researchContext || "None provided."}
    Goal: Write a visually stunning, "Infographic-style" blog post. 
    
    CRITICAL: Do NOT write walls of text. Use HTML/CSS to visualize data.
    
    Structure & Styling Rules (Use INLINE CSS for everything):
    1.  **Hero Section**: <h1> Title. <p class="intro"> Hook.
    2.  **"Quick Hits" Infographic**: Create a styled box (background: #f0f7f4; padding: 20px; border-radius: 12px; border-left: 5px solid #2e5948) containing 3 bold "Key Takeaways" with emoji icons.
    3.  **Visual Breakdown**: 
        - Instead of paragraphs, use <ul> with custom styled <li> elements.
        - Use <h3> headers for sections.
    4.  **The Vibe Check**: Create a "visual meter" or specific "Vibe Rating" block (e.g., "Family Friendliness: ⭐️⭐️⭐️⭐️⭐️").
    5.  **Conclusion**: Brief wrap up.

    Tone: authentic, "High Desert Modern", smart.
    Output: Pure HTML body content. No markdown.
    `;

    console.log("✍️ Writing article...");
    const writeResult = await model.generateContent(writePrompt);
    let content = writeResult.response.text();

    content = content.replace(/```html/g, '').replace(/```/g, '');

    const titleMatch = content.match(/<h1>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1] : `Bend Update: ${topic}`;

    // 3. Image
    const imageUrl = await generateImage(topic);
    console.log(`🖼️ Selected Image: ${imageUrl}`);

    // 4. Publish to GHL
    try {
        const slug = `bend-trend-${Date.now()}`;
        const ghlResponse = await ghl.createBlogPost({
            blogId: CONFIG.BLOG_ID_ARTICLES,
            title,
            urlSlug: slug,
            rawHTML: content,
            imageUrl: imageUrl,
            categories: (CONFIG.CATEGORIES.TRENDS && CONFIG.CATEGORIES.TRENDS.length > 0) ? CONFIG.CATEGORIES.TRENDS : CONFIG.CATEGORIES.DAILY_UPDATE
        });

        console.log("🚀 Published to GHL:", ghlResponse.id || "Success");

        // 5. Save to Firestore 'articles'
        if (db) {
            await db.collection(CONFIG.FIREBASE_COLLECTION_ARTICLES).doc(slug).set({
                title,
                topic,
                content,
                imageUrl,
                slug,
                ghlId: ghlResponse.id || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                type: "trend"
            });
            console.log(`💾 Saved to Firestore (Articles): ${slug}`);
        }

    } catch (e) {
        console.error("Failed to publish:", e.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = main;
