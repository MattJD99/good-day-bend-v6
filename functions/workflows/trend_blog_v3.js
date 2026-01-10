const { getSegmentedModel } = require('../lib/gemini');
const { db, admin } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const { generateImage } = require('../lib/imageGen');
const CONFIG = require('../config');

// Initialize Segmented Model for Blog/Trends
const model = getSegmentedModel('BLOG', CONFIG.MODEL_REASONING);

async function main() {
    console.log("📈 Starting Trend Blog Workflow V3 (Art Director Edition)...");
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
        
        Current Date: ${new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

        Constraints:
        1. IGNORE news older than 14 days.
        2. IGNORE events that have already passed.
        3. If it is a generic seasonal topic (e.g. "Hiking"), ensure it is seasonally accurate for ${new Date().toLocaleString('default', { month: 'long' })}.
        
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
    // SEO: Randomly select 2 Trusted Sources for this run
    const trustedSources = CONFIG.TRUSTED_SOURCES || [];
    const shuffledSources = trustedSources.sort(() => 0.5 - Math.random());
    const selectedSources = shuffledSources.slice(0, 2);
    const sourcesText = selectedSources.map(s => `${s.name} (${s.url})`).join(", ");

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

    SEO & AEO MASTERY:
    1.  **Authoritative Outbound Links**: Include at least 2 hyperlinks to high-authority local sources to back up claims. SPECIFICALLY, try to use: ${sourcesText}.
    2.  **Internal Linking**: Include a call-to-action link to the "Good Day Bend Calendar" or "Daily Updates" where relevant.
    3.  **Keywords**: Naturally weave in "Bend Oregon", "High Desert", and specific location names.
    4.  **Accessibility**: If you use any icons or decorative elements that are images, ensure they have descriptive 'alt' text.

    Tone: authentic, "High Desert Modern", smart.
    Output: Pure HTML body content. No markdown.
    `;

    console.log("✍️ Writing article...");
    const writeResult = await model.generateContent(writePrompt);
    let content = writeResult.response.text();

    content = content.replace(/```html/g, '').replace(/```/g, '');

    const titleMatch = content.match(/<h1>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1] : `Bend Update: ${topic}`;

    // 3. Image Strategy: The "Art Director"
    console.log("🎨 Generative Art Director: Designing image prompt...");

    const artDirectorPrompt = `
    Context: You are an Art Director for a magazine in Bend, Oregon.
    Article Title: "${title}"
    Article Topic: "${topic}"

    Task: Write a strictly visual image generation prompt for this article.

    Rules:
    1. Do NOT use text in the image.
    2. Focus on a specific scene, object, or lighting (e.g., "A close up of a sold sign in snow," or "Cinematic wide shot of the Deschutes River at sunset").
    3. Style: Photorealistic, 4k, High Desert aesthetic, warm lighting.
    4. Output: Just the prompt string. No conversational text.
    `;

    const artResult = await model.generateContent(artDirectorPrompt);
    const optimizedImagePrompt = artResult.response.text().trim();

    console.log(`🎨 Optimized Prompt: ${optimizedImagePrompt}`);

    // Pass the OPTIMIZED prompt, not the raw topic
    const imageUrl = await generateImage(optimizedImagePrompt);
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
