/**
 * daily_update_v5.js
 * PURPOSE: Generate the "Daily Pulse" - A structured, functional digest of today's events.
 * STYLE: Clean, informative, "Card" based layout.
 * FONTS: Outfit (Primary) + Playfair (Accents) [Consistent Branding]
 */

const { getSegmentedModel } = require('../lib/gemini');
const { generateImage } = require('../lib/imageGen');
const { db, admin } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const CONFIG = require('../config');

// Initialize Segmented Model
const modelReasoning = getSegmentedModel('DAILY_UPDATE', CONFIG.MODEL_REASONING);

async function runDailyUpdateV5(targetDateInput) {
    console.log("☕️ Daily Update V5 Starting...");

    // 1. SETUP
    const today = new Date();
    const targetDate = targetDateInput ? new Date(targetDateInput) : today;
    const dateStr = targetDate.toLocaleDateString("en-US", { dateStyle: 'full' });
    const isoDate = targetDate.toISOString().split('T')[0];

    if (!db) {
        console.error("❌ Database connection missing.");
        return;
    }

    // 2. FETCH EVENTS (The "Current Events" Data)
    console.log(`📥 Fetching events for ${isoDate}...`);
    const snapshot = await db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS)
        .where('eventDate', '==', isoDate)
        .get();

    if (snapshot.empty) {
        console.warn("⚠️ No events found.");
        return "No events found.";
    }

    const events = [];
    snapshot.forEach(doc => events.push(doc.data()));
    console.log(`✅ Loaded ${events.length} events.`);

    // 3. STRATEGY
    const strategyPrompt = `
    Analyze these ${events.length} events in Bend, OR: ${JSON.stringify(events)}
    
    1. Define the "Vibe" (Short, 2-3 words).
    2. Pick 3 "Headliners" (Top Events).
    3. Rate (1-5): Family, Nightlife, Outdoors.
    
    JSON Output: { "vibe": "", "headliners": [t1, t2, t3], "metrics": {...} }
    `;

    let strategyData = {};
    try {
        const res = await modelReasoning.generateContent(strategyPrompt);
        strategyData = JSON.parse(res.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
        strategyData = { vibe: "Bend Life", headliners: events.slice(0, 3).map(e => e.title) };
    }

    // 4. IMAGE SELECTION (Real Event > AI)
    let bannerUrl = CONFIG.FALLBACK_IMAGES[0];
    let imageSource = "Fallback";

    // Attempt to find Headliner Image
    for (const title of strategyData.headliners || []) {
        const ev = events.find(e => e.title === title);
        if (ev && (ev.image || ev.imageUrl) && !CONFIG.FALLBACK_IMAGES.includes(ev.image || ev.imageUrl)) {
            bannerUrl = ev.image || ev.imageUrl;
            imageSource = `Headliner: ${title}`;
            break;
        }
    }

    // 5. WRITER (Structured / Info-Heavy)
    console.log("✍️ Writing Daily Pulse...");

    const writerPrompt = `
    Write the "Daily Pulse" Update for Good Day Bend.
    
    DATA:
    - Date: ${dateStr}
    - Events: ${JSON.stringify(events)}
    - Headliners: ${JSON.stringify(strategyData.headliners)}
    
    FORMATTING (Tailwind HTML):
    - **Header**: "The Daily Pulse"
    - **Vibe Box**: A distinct box showing the Vibe & Metrics.
    - **Headliners**: 3 Distinct "Cards" (Border, Shadow, Padding). Include Title, Time, Location, Price.
    - **The Rundown**: A bulleted list of remaining events.
    - **Footer**: Link to "Full Calendar".
    
    TONE: Helpful, Concise, Informative.
    OUTPUT: HTML Body Content.
    `;

    let htmlContent = "";
    try {
        const res = await modelReasoning.generateContent(writerPrompt);
        htmlContent = res.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e) {
        console.error("Writer failed", e);
        return;
    }

    // 6. ASSEMBLE (Utility Template)
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Playfair+Display:ital700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #334155; }
            h1, h2 { font-family: 'Outfit', sans-serif; font-weight: 800; color: #0A1915; }
            .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 16px; border: 1px solid #e2e8f0; }
            .accent { color: #FBBF24; }
        </style>
    </head>
    <body class="bg-slate-50 py-10 px-4">
        <main class="max-w-2xl mx-auto">
            <h1 class="text-3xl font-black mb-2 text-[#0A1915]">Daily Pulse</h1>
            <p class="text-gray-500 font-bold uppercase tracking-wider text-sm mb-8">${dateStr}</p>
            
            <img src="${bannerUrl}" class="w-full h-64 object-cover rounded-xl mb-8 shadow-md">
            
            <div class="prose max-w-none prose-slate prose-headings:font-bold prose-headings:text-[#0A1915] prose-a:text-[#FBBF24]">
                ${htmlContent}
            </div>
            
            <div class="mt-12 text-center">
                 <a href="https://gooddaybend.com/calendar.html" class="inline-block bg-[#0A1915] text-[#FBBF24] px-6 py-3 rounded-full font-bold uppercase text-sm tracking-widest shadow-lg hover:shadow-xl transition">View Full Calendar</a>
            </div>
        </main>
    </body>
    </html>
    `;

    // 7. PUBLISH (Daily Update Blog)
    const slug = `daily-${isoDate}`;
    const title = `Daily Pulse: ${dateStr}`;

    console.log("🚀 Publishing Daily Update...");
    // GHL
    await ghl.createBlogPost({
        blogId: CONFIG.BLOG_ID_DAILY, // Dedicated "Daily" Blog
        title: title,
        urlSlug: slug,
        rawHTML: fullHtml,
        imageUrl: bannerUrl,
        categories: CONFIG.CATEGORIES.DAILY_UPDATE
    });

    // Firestore
    await db.collection(CONFIG.FIREBASE_COLLECTION_DAILY_UPDATES).doc(slug).set({
        title, content: fullHtml, image: bannerUrl, type: 'daily_update', publishedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 8. NOTIFY (Email Bridge)
    console.log("📧 Sending Email Notification...");
    try {
        // Upload Draft for Link
        const bucket = admin.storage().bucket("good-day-bend-v6.firebasestorage.app");
        const file = bucket.file(`drafts/daily-${Date.now()}.html`);
        await file.save(fullHtml, { metadata: { contentType: 'text/html' }, public: true });
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

        const emailBody = `
        <h1>Daily Pulse Ready</h1>
        <p><strong>Date:</strong> ${dateStr}</p>
        <p>Your daily update has been published to GHL and Firestore.</p>
        <p><a href="${publicUrl}">View Published HTML</a></p>
        `;

        // UPSERT CONTACT FIRST (Required for GHL API)
        const targetEmail = "mdesautel@gmail.com";
        const contact = await ghl.upsertContact({
            email: targetEmail,
            firstName: "MJ",
            lastName: "Owner",
            tags: ["admin", "approver"]
        });

        await ghl.sendEmail({
            contactId: contact.contact.id, // Pass ID
            email: targetEmail,
            subject: `[PUBLISHED] Daily Pulse: ${dateStr}`,
            message: "Please view HTML.",
            html: emailBody
        });
        console.log("✅ Email Sent.");

    } catch (e) {
        console.error("⚠️ Email/Upload Failed:", e.message);
    }

    console.log("✅ Daily Update V5 Complete.");
}

if (require.main === module) {
    runDailyUpdateV5();
}

module.exports = runDailyUpdateV5;
