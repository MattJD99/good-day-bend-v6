/**
 * publisher_v6.js (The "Restoration" Edition)
 * PURPOSE: Combine the trustworthy Event Data of V5 with the "Card Style" & "Approval Flow" of V4.
 * REFINEMENT: "Massive" Typography + SEO/AEO Backlink Injection + Social Media Draft.
 */

const { getSegmentedModel } = require('../lib/gemini');
const { generateImage, generateImageWithInspiration } = require('../lib/imageGen');
const { db, admin } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const CONFIG = require('../config');
const runTrendBlogV6 = require('../workflows/trend_blog_v6');

// Initialize Segmented Model for Daily Updates
const modelReasoning = getSegmentedModel('DAILY_UPDATE', CONFIG.MODEL_REASONING);

// Helper to get today's date in proper format
const getTodayStr = () => new Date().toLocaleDateString("en-US", { dateStyle: 'full' });

// Helper: Sleep to avoid 429 Errors
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    // Return Public URL
    return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

async function runPublisherV6(targetDateInput) {
    console.log("💎 Opal Publisher V6 (Restoration + SEO) Starting...");

    // 1. SETUP & DATES
    const today = new Date();
    const targetDate = targetDateInput ? new Date(targetDateInput) : today;
    const dateStr = targetDate.toLocaleDateString("en-US", { dateStyle: 'full' });
    const isoDate = targetDate.toISOString().split('T')[0];

    if (!db) {
        console.error("❌ Database connection missing. Aborting.");
        return;
    }

    // 2. FETCH REAL DATA (From V5 - Trustworthy)
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

    // 3. STRATEGY (Analyze the Data)
    console.log("🧠 Node 2: Strategist Analyzing...");
    const strategyPrompt = `
    Analyze these ${events.length} events in Bend, OR for today: ${JSON.stringify(events)}
    
    1. Identify the "Vibe of the Day". Be specific and creative (e.g., "Indie Beats & Brews", "Artsy Afternoon").
    2. Pick the Top 3 "Headliner" events based on appeal.
    3. Rate the day on metrics (1-5 stars): FamilyFriendly, Nightlife, Outdoors.
    
    Output strictly JSON: { "vibe": "", "headliners": [title1, title2, title3], "metrics": {"FamilyFriendly": 5, "Nightlife": 3, "Outdoors": 4} }
    `;

    let strategyData = {};
    try {
        const strategyResult = await modelReasoning.generateContent(strategyPrompt);
        const jsonStr = strategyResult.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        strategyData = JSON.parse(jsonStr);
    } catch (e) {
        console.error("❌ Strategist failed:", e);
        strategyData = { vibe: "Good Day Bend", headliners: events.slice(0, 3).map(e => e.title), metrics: { FamilyFriendly: 3 } };
    }
    // 4. IMAGE SELECTION (Real Headliners > AI)
    console.log("⏳ Waiting 15s to respect API Quota...");
    await sleep(15000);

    console.log("🎨 Node 4: Selecting Hero Image...");
    const fallbackImages = CONFIG.FALLBACK_IMAGES || ["https://via.placeholder.com/800x450"];

    // Default to a random fallback immediately to ensure safety
    let bannerUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    let imageSource = "Fallback (Default)";
    let bestEventImage = null;

    // A. Search for Headliner Image
    // DISABLE DIRECT USE: Force AI Regeneration ("Vision Remix") to ensure valid PNG/JPG and avoid WebP/Hotlink issues.
    /*
    if (strategyData.headliners && strategyData.headliners.length > 0) {
        for (const title of strategyData.headliners) {
            const event = events.find(e => e.title === title);
            if (event && (event.image || event.imageUrl)) {
                const img = event.image || event.imageUrl;
                if (img.startsWith('http') && !fallbackImages.includes(img) && !img.includes('placehold.co')) {
                    bestEventImage = img;
                    imageSource = `Headliner: ${title}`;
                    console.log(`✅ Found Real Event Image: ${title}`);
                    break;
                }
            }
        }
    }
    */

    // B. AI Generation (If no real image found) -> NOW ALWAYS RUNS
    if (bestEventImage) {
        bannerUrl = bestEventImage;
    } else {
        console.log("🎨 Vision Remix: Generating Contextual AI (ignoring raw links)...");
        const imagePrompt = `
        A photorealistic, high-quality hero image for a blog post about "${strategyData.vibe}" in Bend, Oregon.
        Visual specific elements based on these events: ${strategyData.headliners.join(", ")}.
        Style: Editorial photography, golden hour, depth of field, f/1.8. 
        NO TEXT. visual storytelling.
        `;
        try {
            const generated = await generateImageWithInspiration(strategyData.vibe, imagePrompt);
            if (generated && generated.startsWith('http')) {
                bannerUrl = generated;
                imageSource = "AI Generated (Contextual)";
                console.log("✅ AI Image Generated Successfully.");
            } else {
                console.warn("⚠️ AI Generation returned invalid result, keeping fallback.");
            }
        } catch (e) {
            console.error("⚠️ Image Gen failed entirely:", e.message);
            // bannerUrl remains set to fallback
        }
    }

    console.log(`🖼️ Final Banner URL: ${bannerUrl} (Source: ${imageSource})`);

    // 5. WRITER (The "Visual Stylist" - V4/V3 Style + MASSIVE FONTS + SEO)
    console.log("⏳ Waiting 15s to respect API Quota...");
    await sleep(15000);

    console.log("✍️ Node 3: Writing Styled Article (with Reflexion)...");

    // A. RECALL MEMORY (Self-Learning)
    let memoryContext = "";
    try {
        const memorySnapshot = await db.collection('knowledge_base')
            .where('rating', '>=', 4)
            .orderBy('rating', 'desc')
            .limit(2)
            .get();

        if (!memorySnapshot.empty) {
            console.log("🧠 Recalling past successes...");
            const memories = [];
            memorySnapshot.forEach(doc => memories.push(doc.data().rawHTML.substring(0, 500) + "..."));
            memoryContext = `
            LEARNING FROM SUCCESS:
            Here are snippets from past articles the user RATED HIGHLY (5/5). Emulate this tone:
            ${memories.join("\n---\n")}
            `;
        }
    } catch (memErr) {
        console.warn("⚠️ Memory Recall failed (likely logging first run):", memErr.message);
    }

    // Trusted Sources for SEO
    const trustedSources = CONFIG.TRUSTED_SOURCES || [];
    const sourceLinks = trustedSources.sort(() => 0.5 - Math.random()).slice(0, 3).map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a>`).join(", ");

    const writerPrompt = `
    You are the Editor of "Good Day Bend". Write today's daily update.
    
    INPUT DATA:
    - Date: ${dateStr}
    - Vibe: ${strategyData.vibe}
    - Events: ${JSON.stringify(events)}
    - Headliners: ${JSON.stringify(strategyData.headliners)}
    
    ${memoryContext}

    DESIGN & TYPOGRAPHY RULES (Global CSS Injected via Wrapper):
    * The wrapper has "Outfit" (Body) and "Playfair Display" (Headings).
    * **CRITICAL**: Use specific classes or inline styles to enforce the "Massive" look.
    
    COMPONENTS TO GENERATE:
    
    1. **The Pulse Box**:
       <div style="background-color: #F8FAFC; border: 2px solid #0A1915; padding: 25px; margin-bottom: 30px; border-radius: 12px; box-shadow: 5px 5px 0px #0A1915;">
          <h2 style="font-family: 'Playfair Display', serif; margin-top:0;">Today's Vibe: ${strategyData.vibe}</h2>
          <p style="font-size: 1.25rem;">Family: ${"⭐".repeat(strategyData.metrics.FamilyFriendly)} | Nightlife: ${"⭐".repeat(strategyData.metrics.Nightlife)}</p>
       </div>

    2. **The Headliners (Card Style)**:
       Create a DIV for each Top 3 event.
       <div style="background:white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 1.8rem; color: #0A1915; margin-bottom: 5px;">HEADLINE TITLE HERE</h3>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; color: #64748b; margin-bottom: 15px; font-weight: 600;">
             🕒 TIME | 📍 VENUE | 💵 PRICE
          </div>
          <p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; line-height: 1.6;">Description...</p>
          <a href="GOOGLE_MAPS_LINK" style="display:inline-block; margin-top:10px; font-weight:bold; color:#13ec5b; text-decoration:underline;">📍 Map It</a>
       </div>

    3. **The Rundown**:
       <ul style="font-size: 1.25rem; line-height: 1.8; list-style-type: square; padding-left: 20px;">
          <li>...</li>
       </ul>

    SEO & AEO MASTERY (The Secret Sauce):
    1.  **Semantic Search**: Use natural language to describe venue locations (e.g. "Located in the heart of the Old Mill District").
    2.  **Trusted Backlinks**: You MUST include references to these local authorities naturally: ${sourceLinks}.
    3.  **Entity Optimization**: Use full names for businesses and places.
    4.  **Internal Linking**: "Planning ahead? Check our <a href='/calendar.html'>Full Calendar</a>."

    OUTPUT: Pure HTML Body Content. NO <html> tags.
    `;

    let htmlContent = "";
    try {
        const writerResult = await modelReasoning.generateContent(writerPrompt);
        htmlContent = writerResult.response.text().replace(/```html/g, '').replace(/```/g, '').trim();
    } catch (e) {
        console.error("❌ Writer failed:", e);
        return "Writer failed.";
    }

    // 6. WRITER: SOCIAL MEDIA DRAFT (Restored from V4)
    console.log("⏳ Waiting 15s to respect API Quota...");
    await sleep(15000);

    console.log("📱 Node 3b: Creating Social Media Snippets...");
    const socialPrompt = `
    Based on this article: ${htmlContent}
    Write a catchy Instagram/Facebook caption.
    - Start with a Hook.
    - Use 3-5 relevant hashtags: #BendOregon #InBend
    - Keep it under 280 chars.
    - Call to Action: "Link in Bio"
    `;

    let socialContent = "";
    try {
        const socialResult = await modelReasoning.generateContent(socialPrompt);
        socialContent = socialResult.response.text().trim();
    } catch (e) {
        socialContent = "Check out the latest update on Good Day Bend! #inBend";
    }

    // 7. UPLOAD DRAFT & APPROVAL WORKFLOW
    console.log("💾 Uploading Draft Artifacts for Approval...");
    const draftId = `draft-${Date.now()}`;
    const blogTitle = `Good Day Bend: ${strategyData.vibe} (${dateStr})`;
    const blogSlug = `daily-${isoDate}`;
    const FUNCTION_URL = "https://main-nfvkqznekq-uc.a.run.app"; // TODO: Update if needed

    // A.1 Blog Draft CSS styling
    const blogDraftHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Blog Draft: ${blogTitle}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
            <style>
                /* GLOBAL MASSIVE STYLES */
                body { font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #0d1b12; antialiased; font-size: 18px; }
                h1 { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; color: #0d1b12; line-height: 1.1; }
                h2, h3 { font-family: 'Playfair Display', serif; color: #0d1b12; }
                .prose p { font-size: 1.35rem; line-height: 1.9; color: #334155; margin-bottom: 2em; }
                .prose li { font-size: 1.25rem; margin-bottom: 0.75em; }
                a { color: #13ec5b; text-decoration: underline; transition: color 0.2s; }
                a:hover { color: #0b8e36; }
                .action-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); display: flex; justify-content: center; gap: 20px; padding: 20px; border-top: 1px solid #e2e8f0; z-index: 50; }
            </style>
        </head>
        <body class="pb-40">
             <!-- Status Header -->
            <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
                <span>Good Day Bend // V6 Draft</span>
                <span>${getTodayStr()}</span>
            </div>

            <main class="max-w-4xl mx-auto px-6 py-16">
                <!-- Hero -->
                <div class="mb-16 text-center md:text-left">
                     <span class="inline-block bg-[#13ec5b] text-[#0d1b12] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">Daily Pulse</span>
                     <h1 class="text-5xl md:text-6xl font-bold mb-8 text-[#0d1b12] mt-4">${blogTitle}</h1>
                     <img src="${bannerUrl}" class="w-full h-auto rounded-3xl shadow-xl mb-4 border border-gray-100">
                     <p class="text-xs text-gray-400">Image Source: ${imageSource}</p>
                </div>
                <!-- Generated Content -->
                <div class="prose prose-xl max-w-none prose-headings:font-serif">
                    ${htmlContent}
                </div>
            </main>

            <!-- Sticky Approval Bar -->
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

    // A.2 Social Draft HTML (Restored Phone Mockup from V4)
    const socialDraftHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Socials Draft: ${blogTitle}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
            <style>body { font-family: 'Inter', sans-serif; background-color: #F8FAFC; }</style>
        </head>
        <body class="bg-slate-50 relative pb-40">
            
             <!-- Status Header -->
            <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
                <span>Good Day Bend // Social Draft</span>
                <span>${getTodayStr()}</span>
            </div>

            <!-- Main Content Area -->
            <div class="w-full max-w-4xl mx-auto pt-16 flex flex-col items-center">

                <!-- Instagram Phone Mockup -->
                <div class="bg-white w-full max-w-[400px] rounded-[3rem] border-[8px] border-[#0d1b12] shadow-2xl overflow-hidden relative">
                    <!-- Status Bar -->
                    <div class="h-8 bg-white flex justify-between items-center px-6 pt-2 select-none">
                        <span class="text-xs font-bold">9:41</span>
                        <div class="flex gap-1.5">
                            <div class="w-4 h-2.5 bg-black rounded-sm"></div>
                            <div class="w-0.5 h-2.5 bg-black rounded-sm"></div>
                        </div>
                    </div>

                    <!-- Header -->
                    <div class="border-b px-4 py-3 flex justify-between items-center">
                        <span class="font-bold text-lg tracking-tight text-[#0d1b12]">gooddaybend</span>
                        <svg class="w-6 h-6 text-[#0d1b12]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                    </div>

                    <!-- Image -->
                    <div class="aspect-square bg-gray-100 relative group">
                         <img src="${bannerUrl}" class="w-full h-full object-cover"/>
                    </div>

                    <!-- Actions -->
                    <div class="p-4 pb-0">
                        <div class="flex justify-between mb-3">
                            <div class="flex gap-4 text-[#0d1b12]">
                                <svg class="w-7 h-7 hover:text-red-500 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                <svg class="w-7 h-7 hover:text-gray-500 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                <svg class="w-7 h-7 hover:text-gray-500 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 5 0 004 5h12.5a4.5 4.5 0 004.5-5M3 15a4.5 4.5 0 01-4.5-4.5m4.5 4.5c0 .351.028.698.082 1.036m19.49-1.036c.055-.338.082-.685.082-1.036m0 0a4.5 4.5 0 00-4.5-4.5m4.5 4.5c0 .351-.028.698-.082 1.036"></path></svg>
                            </div>
                            <svg class="w-7 h-7 text-[#0A1915]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                        </div>
                        <div class="font-semibold text-sm mb-2 text-[#0d1b12]">412 likes</div>
                        <div class="text-sm">
                            <span class="font-semibold mr-1 text-[#0d1b12]">gooddaybend</span>
                            ${socialContent.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                     <!-- Bottom spacing simulating scrolling -->
                    <div class="h-12 border-t mt-4 flex justify-around items-center text-gray-400">
                         <svg class="w-6 h-6 text-[#0A1915]" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
                         <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                         <div class="w-6 h-6 rounded-full bg-gray-300"></div>
                    </div>
                </div>

            </div>

            <!-- Sticky Action Bar -->
            <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-5 flex justify-center gap-5 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
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

    const blogUrl = await uploadDraft(`blog-draft-${Date.now()}.html`, 'text/html', blogDraftHtml);
    const socialUrl = await uploadDraft(`social-draft-${Date.now()}.html`, 'text/html', socialDraftHtml);

    console.log(`✅ Blog Draft: ${blogUrl}`);
    console.log(`✅ Social Draft: ${socialUrl}`);

    // B. Save Draft Data to Firestore
    await db.collection('drafts').doc(draftId).set({
        title: blogTitle,
        urlSlug: blogSlug,
        rawHTML: htmlContent,
        socialCaption: socialContent,
        imageUrl: bannerUrl,
        publishDate: isoDate,
        imageSource: imageSource,
        relatedEvents: events.map(e => e.title),
        status: 'pending',
        type: 'daily_update',
        vibe: strategyData.vibe,
        categories: CONFIG.CATEGORIES.DAILY_UPDATE,
        createdAt: new Date().toISOString(),
        generatedBy: 'publisher_v6'
    });

    // 7b. GENERATE TREND BLOG (Merged Flow)
    // Run Trend Blog Gen 6 without sending its own email
    console.log("🧩 Sub-Process: Running Trend Blog V6...");
    let trendData = null;
    try {
        trendData = await runTrendBlogV6(false);
    } catch (e) {
        console.error("⚠️ Trend Blog Sub-Process failed:", e);
    }

    // 8. SEND APPROVAL EMAIL (UNIFIED)
    console.log("📧 Sending Unified Approval Email...");
    const emailSubject = `[REVIEW] Daily Update: ${strategyData.vibe}`;

    // Build optional Trend Blog Link HTML
    let trendLinkHtml = "";
    if (trendData) {
        trendLinkHtml = `<li><a href="${trendData.url}" style="font-size:18px; font-weight:bold; color:#0d1b12;">✨ Review Trend Blog Draft: ${trendData.title}</a></li>`;
    }

    // FEEDBACK LINKS (Learning Loop)
    const feedbackUrl = `${FUNCTION_URL}/feedback`;  // Assuming /feedback endpoint exists or will exist
    const stars = [1, 2, 3, 4, 5].map(score => {
        return `<a href="${feedbackUrl}?draftId=${draftId}&rating=${score}" style="text-decoration:none; font-size:24px; margin:0 5px;">${score >= 4 ? '⭐' : '☆'}</a>`;
    }).join("");

    const emailBody = `
    <div style="font-family: sans-serif; color: #333;">
        <h1>Good Day Bend Daily Approval</h1>
        <p><strong>Topic:</strong> ${strategyData.vibe}</p>
        <hr style="border:0; border-top:1px solid #111; margin:20px 0;">
        
        <h2>🔎 Review Drafts (Premium 2025 Edition)</h2>
        <ul>
            <li><a href="${blogUrl}" style="font-size:18px; font-weight:bold; color:#0d1b12;">📄 Review Daily Update Post Draft</a></li>
            <li><a href="${socialUrl}" style="font-size:18px; font-weight:bold; color:#0d1b12;">📱 Review Social Media Draft</a></li>
            ${trendLinkHtml}
        </ul>
        
        <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border-radius: 8px;">
            <h3>🎓 Teach the AI: How was this draft?</h3>
            <p>Rate to improve future generations:</p>
            <div style="font-size: 20px;">
                ${stars}
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 5px;">(5 Stars = Save to Knowledge Base)</p>
        </div>

        <div style="margin: 30px 0;">
            <p>If good, click "Approve" inside each Draft.</p>
        </div>
        
        <img src="${bannerUrl}" width="300" style="border-radius:12px; margin-top:20px; border:1px solid #eee;"/>
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

    console.log("✅ Publisher V6 Flow Complete. Waiting for Approval.");
    return "Draft Sent for Approval";
}

if (require.main === module) {
    runPublisherV6();
}

module.exports = runPublisherV6;
