/**
 * trend_blog_v5.js
 * PURPOSE: Generate the "Featured Article" - A narrative, editorial story about the day's vibe/events.
 * STYLE: Premium, Narrative, "Magazine" feel.
 * FONTS: Playfair Display (Heavy use) + Outfit (Body).
 */

const { getSegmentedModel } = require('../lib/gemini');
const { generateImage } = require('../lib/imageGen');
const { db, admin } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const CONFIG = require('../config');

// Initialize Segmented Model
const modelReasoning = getSegmentedModel('BLOG', CONFIG.MODEL_REASONING);

async function runTrendBlogV5(targetDateInput) {
    console.log("📖 Trend Blog V5 Starting...");

    // 1. SETUP
    const today = new Date();
    const targetDate = targetDateInput ? new Date(targetDateInput) : today;
    const isoDate = targetDate.toISOString().split('T')[0];

    // 2. FETCH EVENTS (Context)
    const snapshot = await db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS)
        .where('eventDate', '==', isoDate)
        .get();

    const events = [];
    snapshot.forEach(doc => events.push(doc.data()));

    // 3. TOPIC SELECTION (Editorial Decision)
    // Sometimes we might look for a "Deep Research" report, but for now we derive from events
    const topicPrompt = `
    Look at these events in Bend, OR: ${JSON.stringify(events)}
    
    Invent a creative, magazine-style headline/topic for a blog post.
    Instead of "Daily Update", find a narrative angle.
    Examples: "Why Thursday Night is the New Friday", "The Hidden Gem of the Weekend", "Cozy Vibes for a Snowy Day".
    
    Output strictly the Topic String.
    `;

    let topic = "";
    try {
        const res = await modelReasoning.generateContent(topicPrompt);
        topic = res.response.text().trim();
    } catch (e) {
        topic = `Stories from Bend: ${isoDate}`;
    }
    console.log(`💡 Narrative Topic: ${topic}`);

    // 4. IMAGE (Narrative/Vibe Focused)
    // For the blog, we might prefer an AI image that matches the *Mood* perfectly, 
    // OR a real image if it fits the narrative well.
    // Let's bias towards AI for the "Magazine Cover" feel unless a headliner is perfect.

    let bannerUrl = "";
    try {
        const imgPrompt = `
        Editorial magazine photography for a blog post titled "${topic}" in Bend, Oregon.
        High aesthetic, golden hour, f/1.8, cinematic.
        NO TEXT. visual storytelling.
        `;
        bannerUrl = await generateImage(imgPrompt);
    } catch (e) {
        bannerUrl = CONFIG.FALLBACK_IMAGES[0];
    }

    // 5. WRITER (Narrative/Story)
    console.log("✍️ Writing Narrative Story...");
    const writerPrompt = `
    Write a Magazine-Style Blog Post about: "${topic}".
    
    CONTEXT:
    - Events happening: ${JSON.stringify(events)}
    - Location: Bend, Oregon.
    
    STYLE:
    - **Vibe**: Immersive, descriptive, storytelling.
    - **Structure**: Title, Intro (Hook), Body Paragraphs (weaving in event details subtly), Conclusion.
    - **Formatting**: Use <h2> for chapter-like subheads.
    - **No Lists**: Avoid bullet points. Use full sentences.
    
    Goal: Make the reader feel the atmosphere.
    Output: HTML Body Content.
    `;

    let htmlContent = "";
    try {
        const res = await modelReasoning.generateContent(writerPrompt);
        htmlContent = res.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e) {
        console.error("Writer failed", e);
        return;
    }

    // 6. ASSEMBLE (Magazine Template)
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #334155; }
            h1 { font-family: 'Playfair Display', serif; font-size: 4rem; line-height: 1; color: #0A1915; margin-bottom: 1rem; }
            h2 { font-family: 'Playfair Display', serif; font-size: 2.25rem; color: #0A1915; margin-top: 2.5rem; margin-bottom: 1rem; }
            p { font-size: 1.25rem; line-height: 1.8; margin-bottom: 1.5rem; }
            .hero-img { width: 100%; height: 500px; object-fit: cover; border-radius: 4px; margin-bottom: 3rem; }
            .drop-cap::first-letter {
                font-family: 'Playfair Display', serif;
                font-size: 4rem;
                float: left;
                margin-right: 0.5rem;
                line-height: 1;
                font-weight: 700;
                color: #FBBF24;
            }
        </style>
    </head>
    <body class="bg-[#F8FAFC] py-16 px-6">
        <main class="max-w-3xl mx-auto">
            <span class="text-[#FBBF24] font-bold tracking-widest uppercase text-sm mb-4 block">Good Day Bend Editorial</span>
            <h1>${topic}</h1>
            <p class="text-gray-500 italic mb-8 font-serif text-lg">Published on ${isoDate}</p>
            
            <img src="${bannerUrl}" class="hero-img shadow-2xl">
            
            <article class="prose prose-xl max-w-none prose-p:font-light prose-headings:font-serif">
                <div class="drop-cap">
                    ${htmlContent}
                </div>
            </article>

            <div class="mt-20 border-t pt-10 text-center">
                <p class="text-sm text-gray-400">Read more at GoodDayBend.com</p>
            </div>
        </main>
    </body>
    </html>
    `;

    // 7. PUBLISH (Article Blog)
    const slug = `article-${Date.now()}`;

    console.log("🚀 Publishing Narrative Blog...");
    await ghl.createBlogPost({
        blogId: CONFIG.BLOG_ID_ARTICLES, // Dedicated "Articles" Blog
        title: topic,
        urlSlug: slug,
        rawHTML: fullHtml,
        imageUrl: bannerUrl,
        categories: CONFIG.CATEGORIES.TRENDS
    });

    await db.collection(CONFIG.FIREBASE_COLLECTION_ARTICLES).doc(slug).set({
        title: topic, content: fullHtml, image: bannerUrl, type: 'article', publishedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 8. NOTIFY (Email Bridge)
    console.log("📧 Sending Email Notification...");
    try {
        // Upload Draft for Link
        const bucket = admin.storage().bucket("good-day-bend-v6.firebasestorage.app");
        const file = bucket.file(`drafts/article-${Date.now()}.html`);
        await file.save(fullHtml, { metadata: { contentType: 'text/html' }, public: true });
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

        const emailBody = `
        <h1>Narrative Blog Ready</h1>
        <p><strong>Topic:</strong> ${topic}</p>
        <p>Your narrative blog post has been published to GHL and Firestore.</p>
        <p><a href="${publicUrl}">View Published HTML</a></p>
        `;

        // UPSERT REQUIRED BEFORE SEND
        const targetEmail = "mdesautel@gmail.com";
        const contact = await ghl.upsertContact({
            email: targetEmail,
            firstName: "MJ",
            lastName: "Owner",
            tags: ["admin", "approver"]
        });

        await ghl.sendEmail({
            contactId: contact.contact.id,
            email: targetEmail,
            subject: `[PUBLISHED] Blog: ${topic}`,
            message: "Please view HTML.",
            html: emailBody
        });
        console.log("✅ Email Sent.");

    } catch (e) {
        console.error("⚠️ Email/Upload Failed:", e.message);
    }

    console.log("✅ Trend Blog V5 Complete.");
}

if (require.main === module) {
    runTrendBlogV5();
}

module.exports = runTrendBlogV5;
