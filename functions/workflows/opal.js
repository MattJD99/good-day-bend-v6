const { modelReasoning, modelImagePro } = require('../lib/gemini');
const { db, admin } = require('../lib/firebase');
const CONFIG = require('../config');

async function opalWorkflow(targetDateInput) {
    console.log("💎 Starting Opal Workflow...");

    // 1. INPUT NODE: Target Date
    const today = new Date();
    const targetDate = targetDateInput ? new Date(targetDateInput) : today;
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    const dateString = targetDate.toLocaleDateString("en-US", { dateStyle: 'full' });
    const nextDateString = nextDay.toLocaleDateString("en-US", { dateStyle: 'full' });

    console.log(`📅 Target Date: ${dateString}`);
    console.log(`📅 Next Day: ${nextDateString}`);

    // 2. RESEARCH NODE (Senior Event Scout)
    console.log("🕵️‍♀️ Node 2: Senior Event Scout researching...");

    const researchPrompt = `
    You are the Senior Event Scout for "Good Day Bend."

    1. Analyze the Dates:
    Based on the input date, focus strictly on:
    The Present: ${dateString}
    The Future: ${nextDateString}
    Constraint: Do NOT look for past events.

    2. Research Tasks:
    Find ALL high-quality, relevant events happening on these two days.
    Quantity: Do not limit the number of events. If there are 15 amazing things happening (e.g., during Winterfest or 4th of July), capture them all.
    Quality Check: Prioritize "Grand" events (festivals, holiday specials, concerts) over generic recurring events (like daily happy hours), unless it's a slow news day.

    3. Extract Details:
    For each event, capture:
    - Exact Name
    - Venue Name
    - Full Address (Crucial for mapping)
    - Time
    - Category (Nightlife, Family, Food, etc.)
    - One specific "selling point" (e.g., "Free entry," "Heated patio," "Live DJ").

    OUTPUT FORMAT: strictly JSON array of objects.
    `;

    let researchData = [];
    try {
        const result = await modelReasoning.generateContent(researchPrompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        researchData = JSON.parse(jsonStr);
        console.log(`✅ Found ${researchData.length} events.`);
    } catch (e) {
        console.error("❌ Research Node Failed:", e);
        return;
    }

    // 3. OUTLINE NODE (Content Strategist)
    console.log("📝 Node 3: Content Strategist outlining...");

    const outlinePrompt = `
    You are the Content Strategist for "Good Day Bend." Your job is to organize the raw research into a structured blueprint for the blog writer.

    RAW DATA: ${JSON.stringify(researchData)}

    Step 1: The Strategy Check
    Count the total number of events found.
    If Total > 8: Add a note at the top: "STRATEGY: HIGH VOLUME. Keep descriptions to 1 sentence maximum for mobile readability."
    If Total < 8: Add a note at the top: "STRATEGY: CURATED VIBE. Write 2-3 engaging sentences per event."

    Step 2: Structure the Content
    Organize the events into two distinct sections:
    HAPPENING TODAY (${dateString})
    ON DECK FOR TOMORROW (${nextDateString})

    Step 3: Data Formatting (Crucial)
    For every event, format the data exactly like this so the writer can easily read it:
    Event: [Event Name]
    Category: [e.g. Music, Food, Family]
    Time/Location: [Time] @ [Venue Name]
    Map Link: https://www.google.com/maps/search/?api=1&query=[Insert+Full+Address]
    The Hook: [A bullet point with the key selling point or "vibe" detail found in research]

    Step 4: Holiday Flag
    If the research indicates a major holiday (Thanksgiving, 4th of July, Winterfest, etc.), add a "THEME: [Holiday Name]" tag at the top of the outline so the writer knows to hype it up.
    `;

    let outlineText = "";
    try {
        const result = await modelReasoning.generateContent(outlinePrompt);
        outlineText = result.response.text();
        console.log("✅ Outline generated.");
    } catch (e) {
        console.error("❌ Outline Node Failed:", e);
        return;
    }

    // 4. WRITER NODE (The Writer)
    console.log("✍️ Node 4: The Writer writing...");

    const writerPrompt = `
    You are the owner of Good Day Bend, a local business dedicated to curating the best events for our community. You are not a generic travel guide and you are not a flashy influencer; you are a trusted local friend who knows the lay of the land.

    OUTLINE: ${outlineText}

    Your Goal:
    Write a highly readable, mobile-friendly blog post based on the provided outline. If the outline lists many events, keep descriptions concise so the reader doesn't get overwhelmed.

    Tone & Voice Guidelines:
    Authentic Local: Use specific Bend geography to help people orient themselves (e.g., "Over on the Eastside," "Down in the Old Mill," "Near the Parkway," "Newport Ave side of town").
    Community Focused: Sound grateful and supportive of other local businesses. Use phrases common to the PNW (e.g., "Stoked," "Rad," "Chilly," "Grab a pint").
    First Person: Write as "We" or "I" (e.g., "We love this spot for a sunset beer").
    Casual but Professional: Avoid stiff corporate language, but also avoid cringey "influencer" slang. Talk like a normal person texting a friend.

    Required Format for EACH Event:
    [Emoji] Event Name (Bold)
    Category: [Insert Category]
    Time & Location: [Insert Time] @ [Insert Venue Name]
    Map Link: [Insert the Google Maps Link from the outline]
    The Scoop: [Write a 2-3 sentence description. Constraint: Focus on the experience—is it heated? Is the food good? Is it family-friendly? If it's outdoors, mention dressing warm for the High Desert weather.]

    Mandatory Inclusions:
    Explicitly mention "Bend" or "Central Oregon" in the text for local SEO.

    The Sign-Off: You MUST end the post exactly with:
    "Don't forget to follow us on Instagram @GoodDayBend for live updates!"
    
    OUTPUT FORMAT: Return the blog post valid HTML (no markdown code blocks), ready to be injected into a <div>. Use <h3> for Section Headers and <h4> for Event Names.
    `;

    let blogHtml = "";
    try {
        const result = await modelReasoning.generateContent(writerPrompt);
        blogHtml = result.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
        console.log("✅ Blog Post written.");
    } catch (e) {
        console.error("❌ Writer Node Failed:", e);
        return;
    }

    // 5. BANNER NODE (Hero Image)
    console.log("🎨 Node 5: Generating Banner...");
    let bannerUrl = CONFIG.FALLBACK_IMAGES[0];

    // Simple logic to detect holiday from outline for image prompt
    let imagePrompt = `Create a high-definition "Hero Image" for a Bend, Oregon event guide. Show a vibrant Bend lifestyle scene (people at a brewery, hiking, or walking downtown).`;
    if (outlineText.includes("THEME:")) {
        const theme = outlineText.split("THEME:")[1].split("\n")[0].trim();
        imagePrompt = `Create a high-definition "Hero Image" for a Bend, Oregon event guide. Theme: ${theme}. The image MUST feature elements of that holiday (lights, pumpkins, fireworks) set against a Bend backdrop (mountains/river).`;
    }

    try {
        // Using NanoBanana Pro (modelImagePro)
        const result = await modelImagePro.generateContent(imagePrompt);
        // Assuming modelImagePro returns a similar structure or we need to handle image bytes.
        // NOTE: The 'gemini-3.0-pro-image' interaction might differ. 
        // For now assuming it returns a URL or we mock it if the SDK doesn't support direct URL gen yet.
        // We will fallback to a placeholder if this fails.
        // In a real implementation, we would upload the buffer to Firebase Storage. 
        console.warn("⚠️ Image generation implementation pending specific SDK support. Using fallback for now.");

    } catch (e) {
        console.error("⚠️ Banner generation failed, using fallback.", e);
    }

    // SAVE TO DB
    if (db) {
        const todayStr = new Date().toISOString().split('T')[0];
        const docRef = db.collection(CONFIG.FIREBASE_COLLECTION_BLOGS).doc(`daily-update-${todayStr}`);

        await docRef.set({
            title: `Good Day Bend: Daily Update for ${dateString}`,
            content: blogHtml,
            image: bannerUrl,
            category: "Daily Update",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            tags: ["Daily Update", "Events", "Local"],
            authorId: CONFIG.AUTHOR_ID,
            status: "published"
        });
        console.log("💾 Saved Daily Update to Firestore.");
    }

    return { success: true, message: "Opal Flow Complete" };
}

module.exports = opalWorkflow;
