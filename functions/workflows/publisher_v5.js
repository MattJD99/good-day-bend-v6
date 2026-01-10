/**
 * publisher_v5.js (The "Best of Both" Edition - Refined)
 * PURPOSE: Combine the reliable Event Data of V3 with the Premium Styling of V4.
 * 
 * FEATURES:
 * - Fonts: Playfair Display (Headings) + Outfit (Body) [From User "Blog 1" preference]
 * - CSS: Exact replica of V4's "Massive Readable" typography.
 * - Data: Real Firestore Events [From User "Blog 2" preference]
 * - Content: Narrative Storytelling (weaving events) instead of "List/Cards".
 * - Images: Real Event Images > Contextual AI [Fixes "Irrelevant" issues]
 */

const { getSegmentedModel } = require('../lib/gemini');
const { generateImage } = require('../lib/imageGen');
const { db, admin } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const CONFIG = require('../config');

// Initialize Segmented Model
const modelReasoning = getSegmentedModel('DAILY_UPDATE', CONFIG.MODEL_REASONING);

async function runPublisherV5(targetDateInput) {
    console.log("💎 Opal Publisher V5 (Hybrid Refined) Starting...");

    // 1. SETUP & DATES
    const today = new Date();
    const targetDate = targetDateInput ? new Date(targetDateInput) : today;
    const dateStr = targetDate.toLocaleDateString("en-US", { dateStyle: 'full' });
    const isoDate = targetDate.toISOString().split('T')[0];

    if (!db) {
        console.error("❌ Database connection missing. Aborting.");
        return;
    }

    // 2. FETCH REAL DATA (From V3)
    console.log(`📥 Fetching events for ${isoDate}...`);
    const snapshot = await db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS)
        .where('eventDate', '==', isoDate)
        .get();

    if (snapshot.empty) {
        console.warn("⚠️ No events found in DB! Run 'The Scout' first.");
        return "No events found.";
    }

    const events = [];
    snapshot.forEach(doc => events.push(doc.data()));
    console.log(`✅ Found ${events.length} real events.`);

    // 3. STRATEGY (From V3 - Analyze the Data)
    console.log("🧠 Node 2: Strategist Analyzing...");
    const strategyPrompt = `
    Analyze these ${events.length} events in Bend, OR for today: ${JSON.stringify(events)}
    
    1. Identify the "Vibe of the Day" (e.g., "Cozy & Acoustic", "Family Adventure", "Nightlife Pulse").
    2. Pick Top 3 "Headliners" (Most popular/interesting events).
    3. Rate metrics (1-5): FamilyFriendly, Nightlife, Outdoors.
    
    Output JSON: { "vibe": "", "headliners": [title1, title2, title3], "metrics": {} }
    `;

    let strategyData = {};
    try {
        const result = await modelReasoning.generateContent(strategyPrompt);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        strategyData = JSON.parse(jsonStr);
    } catch (e) {
        console.error("❌ Strategist failed:", e);
        strategyData = { vibe: "Good Day Bend", headliners: events.slice(0, 3).map(e => e.title) };
    }

    // 4. IMAGE SELECTION (Prioritize Real > AI)
    console.log("🎨 Node 4: Selecting Hero Image...");
    let bannerUrl = CONFIG.FALLBACK_IMAGES[0];
    let imageSource = "Fallback";
    let bestEventImage = null;

    // A. Search for Headliner Image
    if (strategyData.headliners && strategyData.headliners.length > 0) {
        for (const title of strategyData.headliners) {
            const event = events.find(e => e.title === title);
            if (event && (event.image || event.imageUrl)) {
                const img = event.image || event.imageUrl;
                if (!CONFIG.FALLBACK_IMAGES.includes(img) && img.startsWith('http')) {
                    bestEventImage = img;
                    imageSource = `Headliner: ${title}`;
                    console.log(`✅ Found Real Event Image: ${title}`);
                    break;
                }
            }
        }
    }

    // B. AI Generation (If no real image)
    if (bestEventImage) {
        bannerUrl = bestEventImage;
    } else {
        console.log("🎨 No real event images. Generating Contextual AI...");
        const imagePrompt = `
        A photorealistic, high-quality hero image for a blog post about "${strategyData.vibe}" in Bend, Oregon.
        Visual specific elements based on these events: ${strategyData.headliners.join(", ")}.
        Style: Editorial photography, golden hour, depth of field, f/1.8. 
        NO TEXT.
        `;
        try {
            const generated = await generateImage(imagePrompt);
            if (generated) {
                bannerUrl = generated;
                imageSource = "AI Generated (Contextual)";
            }
        } catch (e) {
            console.error("⚠️ Image Gen failed:", e.message);
        }
    }

    // 5. WRITER (The 'Blog 1' V4 Stylist)
    console.log("✍️ Node 3: Writing Premium Article...");

    // Trusted Sources for SEO
    const trustedSources = CONFIG.TRUSTED_SOURCES || [];
    const sourceLinks = trustedSources.sort(() => 0.5 - Math.random()).slice(0, 2).map(s => `<a href="${s.url}" class="text-[#FBBF24] hover:underline">${s.name}</a>`).join(", ");

    const writerPrompt = `
    You are the Editor of "Good Day Bend". Write a NARRATIVE Blog Post using the Real Data provided.
    
    DATA:
    - Date: ${dateStr}
    - Vibe: ${strategyData.vibe}
    - Events: ${JSON.stringify(events)}
    - Headliners: ${JSON.stringify(strategyData.headliners)}
    
    GOAL: Write a cohesive STORY about what's happening today. 
    - Do NOT just list the events in cards.
    - Weave the *Headliners* into the narrative naturally.
    - Use the "Vibe" to set the tone.
    - Mention specific details (Time, Venue, Price) within the flow of the text or in a clean bulleted breakdown *after* the intro.
    
     FORMATTING RULES (Based on "Blog 1" Premium Style):
    - Use HTML format compatible with Tailwind prosel.
    - **Headings**: Use <h2> for narrative transitions (e.g. "Morning Coffee & Culture", "The Main Event"), NEVER "Event Title".
    - **Paragraphs**: Flowing, editorial style.
    - **The Rundown**: Use a standard <ul> list for other events at the very end.
    - **SEO**: Mention "Check our full calendar" and naturally integrate these sources: ${sourceLinks}.

    Start strictly with the HTML body content (do not include <html> or <body> tags, just the article elements inside the article tag).
    `;

    let articleContent = "";
    try {
        const result = await modelReasoning.generateContent(writerPrompt);
        articleContent = result.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e) {
        console.error("❌ Writer failed:", e);
        return;
    }

    // 6. ASSEMBLE (The 'Blog 1' Shell - EXACT REPLICA)
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Good Day Bend: ${strategyData.vibe}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
        <style>
             body { font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #0A1915; antialiased; }
            /* Typography Boost */
            h1 { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; color: #0A1915; font-size: 3.5rem; line-height: 1.1; }
            h2 { font-family: 'Playfair Display', serif; font-size: 2.5rem; margin-top: 2em; margin-bottom: 0.75em; color: #0A1915; }
            
            /* Massive Readable Body Text */
            .prose p { font-size: 1.35rem; line-height: 1.9; color: #334155; margin-bottom: 2em; max-width: 65ch; }
            .prose strong { color: #0A1915; font-weight: 700; }
            .prose li { font-size: 1.25rem; margin-bottom: 0.75em; color: #334155; }
            
            .brand-accent { color: #FBBF24; }
            .brand-bg { background-color: #0A1915; }

            .hero-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 1.5rem; margin-bottom: 3rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        </style>
    </head>
    <body class="bg-[#F8FAFC]">
        <main class="max-w-4xl mx-auto px-6 py-16">
            
            <!-- Branding Header -->
            <div class="flex items-center justify-between mb-16 border-b border-gray-200 pb-6">
                <span class="text-[#0A1915] font-serif text-2xl font-bold italic">Good Day Bend.</span>
                <span class="text-sm font-bold text-[#FBBF24] uppercase tracking-widest">${dateStr}</span>
            </div>

            <!-- Hero Section -->
            <div class="mb-16 text-center md:text-left">
                <span class="inline-block bg-[#FBBF24] text-[#0A1915] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">Daily Pulse</span>
                <h1 class="mb-8">${strategyData.vibe}</h1>
                <img src="${bannerUrl}" alt="${strategyData.vibe}" class="hero-img">
            </div>

            <!-- Content -->
            <article class="prose prose-xl max-w-none prose-headings:font-serif prose-a:text-[#FBBF24] prose-img:rounded-2xl">
                ${articleContent}
            </article>

            <!-- Footer -->
            <div class="mt-20 pt-10 border-t border-gray-200 text-center text-sm text-gray-400">
                <p>Image Source: ${imageSource}</p>
                <p>&copy; ${today.getFullYear()} Good Day Bend</p>
            </div>

        </main>
    </body>
    </html>
    `;

    // 7. PUBLISH (GHL + Local)
    const blogTitle = `Good Day Bend: ${strategyData.vibe} (${dateStr})`;
    const blogSlug = `daily-${isoDate}`;

    console.log("🚀 Node 5: Publishing...");

    // A. GoHighLevel
    try {
        await ghl.createBlogPost({
            blogId: CONFIG.BLOG_ID_DAILY,
            title: blogTitle,
            urlSlug: blogSlug,
            rawHTML: fullHtml,
            imageUrl: bannerUrl,
            categories: CONFIG.CATEGORIES.DAILY_UPDATE
        });
        console.log("✅ GHL Published.");
    } catch (e) {
        console.error("⚠️ GHL Error:", e.message);
    }

    // B. Firestore
    await db.collection(CONFIG.FIREBASE_COLLECTION_DAILY_UPDATES).doc(blogSlug).set({
        title: blogTitle,
        content: fullHtml,
        image: bannerUrl,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        relatedEvents: events.map(e => e.title),
        type: 'daily_update',
        vibe: strategyData.vibe,
        imageSource: imageSource
    });

    console.log("✅ V5 Publisher Complete.");
    return `Published: ${blogTitle}`;
}

if (require.main === module) {
    runPublisherV5();
}

module.exports = runPublisherV5;
