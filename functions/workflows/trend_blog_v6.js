/**
 * trend_blog_v6.js (The "Restoration" Edition)
 * PURPOSE: Generate the "Featured Article" with the clear, infographic style of V3 + Approval Flow.
 * REFINEMENT: "Massive" Typography + SEO/AEO Backlink Injection.
 */

const { getSegmentedModel } = require('../lib/gemini');
const { db, admin } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const { generateImage, generateImageWithInspiration } = require('../lib/imageGen');
const CONFIG = require('../config');

// Initialize Segmented Model for Blog/Trends
const model = getSegmentedModel('BLOG', CONFIG.MODEL_REASONING);

// Helper to get today's date
const getTodayStr = () => new Date().toLocaleDateString("en-US", { dateStyle: 'full' });

// Upload specific Helper (From V4)
async function uploadDraft(filename, contentType, content) {
    const bucket = admin.storage().bucket("good-day-bend-v6.firebasestorage.app");
    const file = bucket.file(`drafts/${filename}`);
    const buffer = Buffer.from(content);

    await file.save(buffer, {
        metadata: { contentType: contentType, metadata: { public: true } },
        public: true
    });

    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

async function runTrendBlogV6(sendEmail = true) {
    console.log("📈 Trend Blog V6 (Queue System) Starting...");

    // 1. TOPIC SELECTION - Check Queue First
    let topic = "";
    let researchContext = "";
    let queueDocId = null;

    // Try to get topic from the queue (priority order)
    try {
        const queueSnapshot = await db.collection('trend_queue')
            .where('status', '==', 'queued')
            .orderBy('priority', 'asc')
            .limit(1)
            .get();

        if (!queueSnapshot.empty) {
            const doc = queueSnapshot.docs[0];
            const data = doc.data();
            console.log(`📋 Found queued topic: "${data.topic}" (Priority: ${data.priority})`);
            topic = data.topic;
            researchContext = data.researchReport;
            queueDocId = doc.id;
        }
    } catch (e) {
        console.warn("Could not check trend_queue:", e.message);
    }

    // Fallback: Check legacy trend_reports collection
    if (!topic) {
        const todayStr = new Date().toISOString().split('T')[0];
        const reportSlug = `trend-report-${todayStr}`;
        try {
            const reportDoc = await db.collection(CONFIG.FIREBASE_COLLECTION_TREND_REPORTS).doc(reportSlug).get();
            if (reportDoc.exists && reportDoc.data().status === 'ready') {
                const data = reportDoc.data();
                console.log(`🧠 Found legacy report: "${data.topic}"`);
                topic = data.topic;
                researchContext = data.researchReport;
            }
        } catch (e) {
            console.warn("Could not check legacy reports:", e.message);
        }
    }

    // Last resort: AI-generated topic (not recommended)
    if (!topic) {
        console.log("⚠️ No queued topics found. Using AI fallback (consider running scout_trends_v2)...");
        const researchPrompt = `
        Find a trending or interesting topic relevant to Bend, Oregon RIGHT NOW (News, Lifestyle, Season, Viral Local Subject).
        Constraints:
        1. IGNORE news older than 14 days.
        2. IGNORE events that have already passed.
        Examples: "First Snow at Bachelor", "New Brewery Opening", "Summer Floating Rules", "Housing Market Vibe".
        Return just the Topic Name.
        `;
        const topicResult = await model.generateContent(researchPrompt);
        topic = topicResult.response.text().trim();
    }
    console.log(`💡 Identified Topic: ${topic}`);

    // DEDUPLICATION
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const existingDocs = await db.collection(CONFIG.FIREBASE_COLLECTION_ARTICLES)
            .where('topic', '==', topic)
            .where('createdAt', '>', yesterday)
            .get();

        if (!existingDocs.empty) {
            console.log(`⚠️ Topic "${topic}" already covered recently. Skipping.`);
            // Return null to indicate no draft was created
            return null;
        }
    } catch (err) {
        console.warn("Dedupe check failed:", err);
    }

    // 2. WRITER (V3 Infographic Style + MASSIVE FONTS + SEO)
    // SEO: Trusted Sources
    const trustedSources = CONFIG.TRUSTED_SOURCES || [];
    const sourceLinks = trustedSources.sort(() => 0.5 - Math.random()).slice(0, 3).map(s => `<a href="${s.url}" style="color:#2563eb;" target="_blank" rel="noopener noreferrer">${s.name}</a>`).join(", ");

    const writePrompt = `
    Role: Expert Content Creator for "Good Day Bend".
    Topic: ${topic}
    Deep Research Context: ${researchContext || "None provided."}
    Goal: Write a visually stunning, "Infographic-style" blog post. 
    
    CRITICAL: Do NOT write walls of text. Use HTML/CSS to visualize data.
    
    DESIGN & TYPOGRAPHY RULES (Global CSS Injected via Wrapper):
    * The wrapper has "Outfit" (Body) and "Playfair Display" (Headings).
    * Use <h3> for subheads (Playfair Display).
    
    Structure & Styling Rules (Use INLINE CSS for everything):
    1.  **Hero Section**: <h1> Title. <p class="intro"> Hook.
    2.  **"Quick Hits" Infographic**: Create a styled box (background: #f0f7f4; padding: 25px; border-radius: 12px; border-left: 5px solid #2e5948; margin-bottom: 30px;) containing 3 bold "Key Takeaways" with emoji icons.
    3.  **Visual Breakdown**: 
        - Instead of paragraphs, use <ul> with custom styled <li> elements.
        - Use <h3> headers for sections.
    4.  **The Vibe Check**: Create a "visual meter" or specific "Vibe Rating" block (e.g., "Family Friendliness: ⭐️⭐️⭐️⭐️⭐️").
    5.  **Conclusion**: Brief wrap up.

    SEO & AEO MASTERY:
    1.  **Authoritative Outbound Links**: Include at least 2 hyperlinks to these sources: ${sourceLinks}.
    2.  **Internal Linking**: Include a call-to-action link to the "Good Day Bend Calendar" or "Daily Updates".
    3.  **Keywords**: Naturally weave in "Bend Oregon", "Central Oregon", "High Desert".
    4.  **Accessibility**: Descriptive 'alt' text for any visual elements.

    Output: Pure HTML body content. No markdown.
    `;

    console.log("✍️ Writing article...");
    let content = "";
    try {
        const writeResult = await model.generateContent(writePrompt);
        content = writeResult.response.text().replace(/```html/g, '').replace(/```/g, '');
    } catch (e) {
        console.error("❌ Writer failed:", e);
        return null;
    }

    const titleMatch = content.match(/<h1>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1] : `Bend Update: ${topic}`;

    // 3. ART DIRECTOR (V3 Logic)
    console.log("🎨 Generative Art Director...");
    let imageUrl = CONFIG.FALLBACK_IMAGES[0];
    try {
        const artDirectorPrompt = `
        Context: Art Director for magazine in Bend, Oregon.
        Article Title: "${title}"
        Article Topic: "${topic}"
        Task: Write a strictly visual image generation prompt.
        Rules: NO TEXT. Photorealistic, 4k, warm lighting.
        Output: Just the prompt string.
        `;
        const artResult = await model.generateContent(artDirectorPrompt);
        const optimizedImagePrompt = artResult.response.text().trim();
        console.log(`🎨 Optimized Prompt: ${optimizedImagePrompt}`);

        const generated = await generateImageWithInspiration(topic, optimizedImagePrompt);
        if (generated) imageUrl = generated;
    } catch (e) {
        console.error("⚠️ Image Gen failed:", e.message);
    }

    // 4. UPLOAD DRAFT & APPROVAL
    console.log("💾 Uploading Draft for Approval...");
    const draftId = `trend-${Date.now()}`;
    const slug = `bend-trend-${Date.now()}`;
    const FUNCTION_URL = "https://main-nfvkqznekq-uc.a.run.app";

    // CSS styling: Massive Fonts
    const blogDraftHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Draft: ${title}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
            <style>
                /* GLOBAL MASSIVE STYLES */
                body { font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #0A1915; antialiased; font-size: 18px; }
                h1 { font-family: 'Playfair Display', serif; font-size: 3.5rem; line-height: 1.1; margin-bottom: 0.5em; }
                h2, h3 { font-family: 'Playfair Display', serif; color: #0A1915; }
                
                .prose p { font-size: 1.35rem; line-height: 1.9; color: #334155; margin-bottom: 2em; }
                .prose li { font-size: 1.25rem; margin-bottom: 0.75em; }
                
                a { color: #047857; text-decoration: underline; font-weight: 600; }
                
                .action-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); display: flex; justify-content: center; gap: 20px; padding: 20px; border-top: 1px solid #e2e8f0; z-index: 50; }
            </style>
        </head>
        <body class="pb-40">
             <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
                <span>Good Day Bend // Trend Draft V6</span>
                <span>${getTodayStr()}</span>
            </div>

            <main class="max-w-4xl mx-auto px-6 py-16">
                 <h1 class="text-5xl md:text-6xl font-bold mb-8 text-[#0A1915]">${title}</h1>
                 <img src="${imageUrl}" class="w-full h-auto rounded-3xl shadow-xl mb-8 border border-gray-100">
                 
                 <div class="prose prose-xl max-w-none prose-headings:font-serif">
                    ${content}
                 </div>
            </main>

            <div class="action-bar">
                <a href="${FUNCTION_URL}?type=review_action&action=keep&draftId=${draftId}" 
                   class="px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 transition">
                   📂 Keep as Draft
                </a>
                <a href="${FUNCTION_URL}?type=review_action&action=approve&draftId=${draftId}" 
                   class="bg-[#13ec5b] text-[#0d1b12] px-8 py-3 rounded-full text-sm font-bold hover:bg-green-400 hover:scale-105 transition shadow-lg flex items-center gap-2">
                   🚀 Approve & Publish
                </a>
            </div>
        </body>
        </html>
    `;

    const blogUrl = await uploadDraft(`trend-draft-${Date.now()}.html`, 'text/html', blogDraftHtml);
    console.log(`✅ Trend Draft Uploaded: ${blogUrl}`);

    // Save Draft Data to Firestore
    await db.collection('drafts').doc(draftId).set({
        title,
        urlSlug: slug,
        rawHTML: content,
        imageUrl,
        publishDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        type: 'trend_article',
        categories: (CONFIG.CATEGORIES.TRENDS && CONFIG.CATEGORIES.TRENDS.length > 0) ? CONFIG.CATEGORIES.TRENDS : CONFIG.CATEGORIES.DAILY_UPDATE,
        createdAt: new Date().toISOString(),
        socialCaption: "", // Prevent undefined error in index.js
        generatedBy: 'trend_blog_v6',
        queueDocId: queueDocId || null // Track which queue item this came from
    });

    // Mark queue topic as used (if from queue)
    if (queueDocId) {
        try {
            await db.collection('trend_queue').doc(queueDocId).update({
                status: 'used',
                usedAt: admin.firestore.FieldValue.serverTimestamp(),
                draftId: draftId
            });
            console.log(`📋 Queue topic marked as used: ${queueDocId}`);
        } catch (e) {
            console.warn("Could not update queue status:", e.message);
        }
    }

    if (!sendEmail) {
        console.log("📧 sendEmail is false. Returning draft details for Unified Approval.");
        return {
            draftId,
            url: blogUrl,
            title,
            imageUrl
        };
    }

    // 5. SEND EMAIL
    console.log("📧 Sending Approval Email...");
    const emailSubject = `[REVIEW] Trend Blog: ${title}`;
    const emailBody = `
    <div style="font-family: sans-serif; color: #333;">
        <h1>Trend Article Ready for Review</h1>
        <p><strong>Topic:</strong> ${topic}</p>
        <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
        <p><em>V6 Styling: Massive Fonts + Backlinks included.</em></p>
        
        <div style="margin: 30px 0;">
             <a href="${blogUrl}" style="background-color:#0A1915; color:#FBBF24; padding:18px 30px; text-decoration:none; font-weight:bold; border-radius:8px; font-size:16px;">
                👀 Review & Approve Trend
            </a>
        </div>
        <img src="${imageUrl}" width="100%" style="border-radius:12px; margin-top:20px; border:1px solid #eee;"/>
    </div>
    `;

    try {
        const targetEmail = "mdesautel@gmail.com";
        const contact = await ghl.upsertContact({ email: targetEmail, firstName: "MJ", lastName: "Owner", tags: ["admin", "approver"] });

        await ghl.sendEmail({
            contactId: contact.contact.id,
            email: targetEmail,
            subject: emailSubject,
            message: "Please view the HTML version.",
            html: emailBody
        });
        console.log(`✅ Approval Email sent to ${targetEmail}`);
    } catch (e) {
        console.error("❌ Email failed:", e.message);
    }

    console.log("✅ Trend Blog V6 Flow Complete. Waiting for Approval.");
}

if (require.main === module) {
    runTrendBlogV6();
}

module.exports = runTrendBlogV6;
