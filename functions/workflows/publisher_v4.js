/**
 * publisher_v4.js (Workflow)
 * "The Daily Grind" - V4.5 FULL AUTO (Brand Identity Edition)
 * 
 * CORE BRAND COLORS:
 * - Dark/Green (Backgrounds): #0A1915
 * - Gold (Accents): #FBBF24
 * - Light (Text): #F8FAFC
 */

const { getSegmentedModel } = require('../lib/gemini');
const { generateImage } = require('../lib/imageGen');
const { admin } = require('../lib/firebase'); // Need admin for storage bucket
const ghl = require('../lib/ghl');
const CONFIG = require('../config');

// Initialize Segmented Model for Daily Updates
const modelReasoning = getSegmentedModel('DAILY_UPDATE', CONFIG.MODEL_REASONING);

// Helper to get today's date in proper format
const getTodayStr = () => new Date().toLocaleDateString("en-US", { dateStyle: 'full' });

// Upload specific Helper
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

async function runDailyGrind() {
    console.log("☕️ Starting V4 Daily Grind...");

    // 1. SCOUT MODE & TOPIC SELECTION
    console.log("🔭 Scout Mode Active: Delegating research to Agent (JSON Mode)...");

    const agentPrompt = `
    SYSTEM OVERRIDE: PAUSE "OPERATIONS CHIEF" EXECUTION ROLE.
    CURRENT MODE: JSON CONTENT GENERATOR.
    
    TASK: Generate the "Daily Pulse" Content Suite for today (${getTodayStr()}).
    
    STEP 1: SCOUTING (Internal Thought Process)
    - Identify top 3 trending current events/news in Bend, OR.
    - Select the one with highest community engagement potential.
    
    STEP 2: CONTENT GENERATION
    - Write a full HTML Blog Post.
      * Use scannable formatting: <h2> subheads, bulleted lists.
      * Keep paragraphs short.
      * CRITICAL (VISUALS): You MUST include a "Data Visual" HTML block. Choose one:
        - A "Snow Report" Bar Chart using Tailwind (e.g., <div class="w-full bg-gray-200 rounded-full h-4">...</div>)
        - A "Vibe Meter" using ⭐️ emojis in a styled box.
        - A "Stat of the Day" infographic box (Big Number + Label).
    - Write a Social Media Caption (Instagram/FB) with hashtags.
    - Define a Catchy Subject Line.
    - Define a PUNCHY Blog Title (Max 7 words).

    INSTRUCTIONS:
    - Respond with VALID JSON ONLY. No markdown fencing.
    
    REQUIRED JSON STRUCTURE:
    {
        "topic_summary": "Short summary of the chosen topic",
        "blog_title": "Punchy, Short Headline (Under 60 chars)",
        "blog_html": "<h1>Title</h1><p>Full SEO Blog Post HTML...</p>",
        "social_caption": "Instagram/FB Caption with hashtags",
        "email_subject_line": "Catchy Subject Line"
    }
    `;

    // FALLBACK: Remote Agent is timing out. Using Local Gemini.
    let agentResponseRaw = "";
    let contentData = {};

    try {
        const result = await modelReasoning.generateContent(agentPrompt);
        agentResponseRaw = result.response.text();

        // Clean cleanup in case of markdown blocks
        const CleanJson = agentResponseRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        contentData = JSON.parse(CleanJson);
    } catch (e) {
        console.error("❌ Agent JSON failed:", e.message);
        console.log("Raw Output:", agentResponseRaw);
        return;
    }

    console.log("✅ Agent Drafted Content (JSON Parsed). Topic:", contentData.topic_summary);

    // 2. VISUALS (Asset Chaining + Randomized Resilience)
    console.log("🎨 Generating Daily Master Asset...");

    // Pick a random fallback FIRST
    const randomFallback = CONFIG.FALLBACK_IMAGES[Math.floor(Math.random() * CONFIG.FALLBACK_IMAGES.length)];
    let imageUrl = randomFallback;

    try {
        const visualPrompt = `Based on this blog topic: "${contentData.topic_summary}", describe a photorealistic 16:9 hero image of Bend, Oregon. Output ONLY the prompt text.`;
        const result = await modelReasoning.generateContent(visualPrompt);
        const generatedPrompt = result.response.text();

        console.log("📸 Image Prompt:", generatedPrompt);
        const generated = await generateImage(generatedPrompt);
        if (generated) imageUrl = generated;

    } catch (e) {
        console.error("⚠️ Image Gen failed/billing limit. Using Randomized Fallback.", e.message);
    }

    // 3. UPLOAD DRAFTS (Brand Identity Edition)
    console.log("💾 Uploading Draft Artifacts (Brand Colors + BIG TYPE)...");

    // 3a. Save Structured Data to Firestore (Persistence Layer)
    const { db } = require('../lib/firebase');
    const draftId = `draft-${Date.now()}`;
    const draftRef = db.collection('drafts').doc(draftId);

    await draftRef.set({
        ...contentData,
        imageUrl: imageUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
        generatedBy: 'publisher_v4'
    });
    console.log(`📝 Draft Data Saved to Firestore: ${draftId}`);

    // Cloud Function Base URL (Gen 2 / Cloud Run)
    // Updated after deployment check
    const FUNCTION_URL = "https://main-nfvkqznekq-uc.a.run.app";

    // 3b. Blog HTML Wrapper (Branded + Scaled Up)
    const blogDraftHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Blog Draft</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #0d1b12; antialiased; }
                /* Typography Boost */
                h1 { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; color: #0d1b12; font-size: 3.5rem; line-height: 1.1; }
                h2 { font-family: 'Playfair Display', serif; font-size: 2.5rem; margin-top: 2em; margin-bottom: 0.75em; color: #0d1b12; }
                
                /* Massive Readable Body Text */
                .prose p { font-size: 1.35rem; line-height: 1.9; color: #334155; margin-bottom: 2em; max-width: 65ch; }
                .prose strong { color: #0d1b12; font-weight: 700; }
                .prose li { font-size: 1.25rem; margin-bottom: 0.75em; }
                
                .brand-accent { color: #13ec5b; }
                .brand-bg { background-color: #0d1b12; }
                
                /* Action Bar */
                .action-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); display: flex; justify-content: center; gap: 20px; padding: 20px; border-top: 1px solid #e2e8f0; z-index: 50; }
            </style>
        </head>
        <body class="pb-40">
            <!-- Review Header (Deep Ponderosa Pine) -->
            <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
                <span>Good Day Bend // Draft</span>
                <span>${getTodayStr()}</span>
            </div>

            <!-- Main Content -->
            <main class="max-w-4xl mx-auto px-6 py-16">
                
                <!-- Hero Section -->
                <div class="mb-16 text-center md:text-left">
                    <span class="inline-block bg-[#13ec5b] text-[#0d1b12] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">Daily Pulse</span>
                    <h1 class="mb-8">
                        ${contentData.blog_title || contentData.topic_summary} 
                    </h1>
                    
                    <div class="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl mb-16 border border-[#0d1b12]/10">
                        <img src="${imageUrl}" class="w-full h-full object-cover"/>
                    </div>
                </div>

                <!-- Article Body (Scaled Up) -->
                <article class="prose prose-xl max-w-none prose-headings:font-serif prose-a:text-[#13ec5b] prose-img:rounded-2xl">
                    ${contentData.blog_html}
                </article>

            </main>

            <!-- Sticky Action Bar -->
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
    const blogUrl = await uploadDraft(`blog-${Date.now()}.html`, 'text/html', blogDraftHtml);

    // 3b. Socials Preview Wrapper (Instagram Mockup)
    const socialDraftHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Socials Draft</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
            <style>body { font-family: 'Inter', sans-serif; background-color: #F8FAFC; }</style>
        </head>
        <body class="min-h-screen flex items-center justify-center py-12 px-4 pb-32">
            
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
                     <img src="${imageUrl}" class="w-full h-full object-cover"/>
                </div>

                <!-- Actions -->
                <div class="p-4 pb-0">
                    <div class="flex justify-between mb-3">
                        <div class="flex gap-4 text-[#0d1b12]">
                            <svg class="w-7 h-7 hover:text-red-500 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                            <svg class="w-7 h-7 hover:text-gray-500 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            <svg class="w-7 h-7 hover:text-gray-500 transition cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15a4 5 0 004 5h12.5a4.5 4.5 0 004.5-5M3 15a4.5 4.5 0 01-4.5-4.5m4.5 4.5c0 .351.028.698.082 1.036m19.49-1.036c.055-.338.082-.685.082-1.036m0 0a4.5 4.5 0 00-4.5-4.5m4.5 4.5c0 .351-.028.698-.082 1.036"></path></svg>
                        </div>
                        <svg class="w-7 h-7 text-[#0d1b12]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    </div>
                    <div class="font-semibold text-sm mb-2 text-[#0d1b12]">412 likes</div>
                    <div class="text-sm">
                        <span class="font-semibold mr-1 text-[#0d1b12]">gooddaybend</span>
                        ${contentData.social_caption}
                    </div>
                </div>
                 <!-- Bottom spacing simulating scrolling -->
                <div class="h-12 border-t mt-4 flex justify-around items-center text-gray-400">
                     <svg class="w-6 h-6 text-[#0A1915]" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                     <div class="w-6 h-6 rounded-full bg-gray-300"></div>
                </div>
            </div>

            <!-- Sticky Action Bar -->
            <div style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); padding: 20px; display: flex; justify-content: center; gap: 20px; box-shadow: 0 -4px 20px rgba(0,0,0,0.1);">
                <a href="${FUNCTION_URL}?type=review_action&action=approve&draftId=${draftId}" 
                   class="bg-[#13ec5b] text-[#0d1b12] px-8 py-3 rounded-full font-bold shadow-lg hover:bg-green-400 transition flex items-center gap-2">
                   <span>📱</span> Approve Post (Branded)
                </a>
            </div>

        </body>
        </html>
    `;
    const socialUrl = await uploadDraft(`socials-${Date.now()}.html`, 'text/html', socialDraftHtml);

    // 4. APPROVAL BRIDGE (Email)
    console.log("bridge 🌉 Sending to Approval Bridge...");

    // Get subject line from JSON, or fallback
    const emailSubject = contentData.email_subject_line || `[POST] Good Day Bend ${getTodayStr()}`;
    const emailBody = `
    <h1>Good Day Bend Daily Approval</h1>
    <p><strong>Topic:</strong> ${contentData.topic_summary}</p>
    <hr>
    
    <h2>🔎 Review Drafts (Branded Edition)</h2>
    <ul>
        <li><a href="${blogUrl}" style="font-size:18px; font-weight:bold; color:#0d1b12;">📄 Review Blog Post Draft</a></li>
        <li><a href="${socialUrl}" style="font-size:18px; font-weight:bold; color:#0d1b12;">📱 Review Social Media Draft</a></li>
    </ul>
    
    <br>
    <img src="${imageUrl}" width="300" style="border-radius:8px;"/>
    <br><br>
    
    <p>Reply "APPROVED" to publish.</p>
    `;

    try {
        const targetEmail = "mdesautel@gmail.com";
        const contact = await ghl.upsertContact({ email: targetEmail, firstName: "MJ", lastName: "Owner", tags: ["admin", "approver"] });

        await ghl.sendEmail({
            contactId: contact.contact.id,
            email: targetEmail,
            subject: emailSubject,
            message: "Please view the HTML version of this email.",
            html: emailBody
        });

        console.log(`✅ Draft Links sent to ${targetEmail}`);

    } catch (e) {
        console.error("❌ Approval Email failed:", e.message);
    }
}

runDailyGrind();
