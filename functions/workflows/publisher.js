/**
 * 2_ThePublisher.js (Workflow)
 * PURPOSE: Read DB events, curate the best, write a visual blog, publish to GHL.
 * SCHEDULE: Daily @ 6:00 AM
 */

const { modelReasoning, modelImagePro } = require('../lib/gemini');
const { generateImage } = require('../lib/imageGen');
const { db, admin } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const CONFIG = require('../config');

async function runPublisher(targetDateInput) {
    console.log("💎 Opal Publisher Starting...");

    // Determine Target Date (Default Today)
    const today = new Date();
    const targetDate = targetDateInput ? new Date(targetDateInput) : today;

    const dateStr = targetDate.toLocaleDateString("en-US", { dateStyle: 'full' });
    const isoDate = targetDate.toISOString().split('T')[0];

    if (!db) {
        console.error("❌ Database connection missing. Publisher aborting.");
        return;
    }

    // NODE 1: FETCH (Read from your Clean DB)
    console.log(`📥 Fetching events from Firestore for ${isoDate}...`);
    const snapshot = await db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS)
        .where('eventDate', '==', isoDate)
        .get();

    if (snapshot.empty) {
        console.warn("⚠️ No events found in DB! Run 'The Scout' first.");
        return "No events found. Scout needed.";
    }

    const events = [];
    snapshot.forEach(doc => events.push(doc.data()));
    console.log(`✅ Loaded ${events.length} events from database.`);

    // NODE 2: STRATEGIST (Pick the best, calculate the "Vibe")
    // This node analyzes the raw data to create the "Meta" content for the blog
    console.log("🧠 Node 2: Strategist Analyzing...");
    const strategyPrompt = `
    Analyze these ${events.length} events in Bend, OR for today: ${JSON.stringify(events)}
    
    1. Identify the "Vibe of the Day". Be specific and creative. AVOID generic or repetitive terms like "Festive", "Winter", or "Holiday" unless absolutely necessary. Try to capture the unique mix of events (e.g., "Indie Beats & Brews", "Artsy Afternoon", "Family Adventure", "Quiet & Cozy").
    2. Pick the Top 3 "Headliner" events based on 'hypeScore' or general appeal.
    3. Rate the day on these metrics (1-5 stars): FamilyFriendly, Nightlife, Outdoors.
    
    Output strictly JSON: { "vibe": "", "headliners": [title1, title2, title3], "metrics": {"FamilyFriendly": 5, "Nightlife": 3, "Outdoors": 4} }
    `;

    let strategyData = {};
    try {
        const strategyResult = await modelReasoning.generateContent(strategyPrompt);
        const jsonStr = strategyResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        strategyData = JSON.parse(jsonStr);
    } catch (e) {
        console.error("❌ Strategist failed:", e);
        // Fallback strategy
        strategyData = { vibe: "Good Day Bend", headliners: events.slice(0, 3).map(e => e.title), metrics: { FamilyFriendly: 3 } };
    }

    // NODE 3: WRITER (The Visual Stylist)
    // Merging the CSS/HTML tricks from 'writeTrendBlog.js'
    console.log("✍️ Node 3: Writing Infographic-Style Article...");

    const writerPrompt = `
    You are the Editor of "Good Day Bend". Write today's daily update.
    
    INPUT DATA:
    - Date: ${dateStr}
    - Events: ${JSON.stringify(events)}
    - Strategy: ${JSON.stringify(strategyData)}
    
    DESIGN RULES (Use Inline CSS):
    1. **The Pulse Box**: Start with a styled container (background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 20px; border-radius: 4px;) displaying:
       - The "Vibe of the Day"
       - The Star Ratings (use actual ⭐ emojis).
    2. **The Headliners**: Don't use plain text. Use "Card Style" div blocks for the Top 3 events.
       - Style: border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
       - Include: 🕒 Time | 📍 Venue | 💵 Price
       - Headline: <h3>Event Title</h3>
    3. **The Rundown**: A clean <ul> list of the remaining events not in headlines.
    4. **Map Link**: For every event, wrap the Venue Name in a Google Maps link search query (e.g., <a href="https://www.google.com/maps/search/?api=1&query=Venue+Name+Bend+OR" style="color:#2563eb; text-decoration:none;">Venue Name</a>).
    
    TONE: Local, crisp, helpful. No fluff.
    OUTPUT: Valid HTML Body (no <html>, <head> or <body> tags, just the content divs).
    `;

    let htmlContent = "";
    try {
        const writerResult = await modelReasoning.generateContent(writerPrompt);
        htmlContent = writerResult.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e) {
        console.error("❌ Writer failed:", e);
        return "Writer failed.";
    }

    // NODE 4: ARTIST (Banner Image Strategy)
    console.log("🎨 Node 4: Selecting Hero Image...");

    // Default fallback
    let bannerUrl = CONFIG.FALLBACK_IMAGES[0];
    let imageSource = "Fallback";

    // 1. Try to find a HEADLINER image first (Best for relevance)
    let bestEventImage = null;

    if (strategyData.headliners && strategyData.headliners.length > 0) {
        for (const title of strategyData.headliners) {
            const event = events.find(e => e.title === title);
            if (event && (event.image || event.imageUrl)) {
                const img = event.image || event.imageUrl;
                // Ensure it's not a stock fallback itself
                if (!CONFIG.FALLBACK_IMAGES.includes(img)) {
                    bestEventImage = img;
                    imageSource = `Headliner: ${title}`;
                    console.log(`✅ Selected Headliner Image: ${title}`);
                    break;
                }
            }
        }
    }

    // 2. If no headliner image, try AI Generation
    if (bestEventImage) {
        bannerUrl = bestEventImage;
    } else {
        console.log("🎨 No good event images found. Generating AI Image...");
        const imagePrompt = `A high-quality photography style header image for a blog about "${strategyData.vibe}" in Bend, Oregon. Scenic, lifestyle, warm lighting, avoiding text.`;

        try {
            // Use the nanobanana helper which handles gen + upload
            const generatedUrl = await generateImage(imagePrompt);
            if (generatedUrl) {
                bannerUrl = generatedUrl;
                imageSource = "AI Generated";
                console.log("✅ Custom AI Image Set:", bannerUrl);
            }
        } catch (e) {
            console.log("⚠️ Image Gen failed, using fallback.", e.message);
        }
    }

    // NODE 5: PUBLISH (GHL + Firestore)
    const blogTitle = `Good Day Bend: ${strategyData.vibe} (${dateStr})`;
    const blogSlug = `daily-${isoDate}`;

    // A. Send Daily Update to GoHighLevel
    console.log("🚀 Node 5: Publishing Daily Update...");
    try {
        const ghlResp = await ghl.createBlogPost({
            blogId: CONFIG.BLOG_ID_DAILY,
            title: blogTitle,
            urlSlug: blogSlug,
            rawHTML: htmlContent,
            imageUrl: bannerUrl,
            publishDate: isoDate,
            categories: CONFIG.CATEGORIES.DAILY_UPDATE
        });
        console.log(`✅ GHL Daily Update Success: ${ghlResp.id}`);
    } catch (e) {
        console.error("⚠️ GHL Daily Update Error:", e.message);
    }

    // B. Publish HEADLINERS to GHL 'Events' Blog
    if (strategyData.headliners && strategyData.headliners.length > 0) {
        console.log(`🚀 Publishing ${strategyData.headliners.length} Headliners to Events Blog...`);
        for (const title of strategyData.headliners) {
            const event = events.find(e => e.title === title);
            if (event) {
                try {
                    const eventSlug = `event-${isoDate}-${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
                    const eventHtml = `
                        <div style="font-family: sans-serif; color: #333;">
                            <img src="${bannerUrl}" alt="Event Banner" style="width:100%; border-radius:8px; margin-bottom:20px;">
                            <h1>${event.title}</h1>
                            <h3>${event.time} @ ${event.venue}</h3>
                            <p>${event.description}</p>
                            <p><strong>Category:</strong> ${event.category}</p>
                            <p><strong>Price:</strong> ${event.price}</p>
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue + ' Bend OR')}" 
                               style="display:inline-block; padding:10px 20px; background:#2563eb; color:white; text-decoration:none; border-radius:4px;">
                               View on Map
                            </a>
                        </div>
                    `;

                    let eventImage = bannerUrl; // Default to the daily image
                    if (event.image || event.imageUrl) {
                        eventImage = event.image || event.imageUrl;
                    }

                    await ghl.createBlogPost({
                        blogId: CONFIG.BLOG_ID_EVENTS, // Published to EVENTS blog
                        title: `Event: ${event.title}`,
                        urlSlug: eventSlug,
                        rawHTML: eventHtml,
                        imageUrl: eventImage,
                        publishDate: isoDate,
                        categories: CONFIG.CATEGORIES.EVENTS
                    });
                    console.log(`✅ Published Event: ${event.title}`);
                } catch (err) {
                    console.error(`⚠️ Failed to publish event ${event.title}:`, err.message);
                }
            }
        }
    }

    // B. Save to Clean Backend 'daily_updates'
    await db.collection(CONFIG.FIREBASE_COLLECTION_DAILY_UPDATES).doc(blogSlug).set({
        title: blogTitle,
        content: htmlContent,
        image: bannerUrl,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        relatedEvents: events.map(e => e.title), // Searchable tags
        type: 'daily_update',
        vibe: strategyData.vibe,
        imageSource: imageSource || "Automatic"
    });

    console.log("✅ Publisher Flow Complete.");
    return "Publisher Mission Complete";
}

module.exports = runPublisher;
