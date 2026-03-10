// Master Configuration for Good Day Bend v6

const CONFIG = {
    // API Keys
    // TODO: Replace these with specific keys for each segment to clean up usage
    API_KEYS: {
        RESEARCH: "AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8",      // For Deep Research / Scout
        DAILY_UPDATE: "AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8",  // For Daily Blog & Logic
        IMAGE_CREATION: "AQ.Ab8RN6IVE8lT6QI9Aql1TGmZLZ3PtNDVaAz1Vq6nc6N25W9yug",// For Image Generation (New Key)
        BLOG: "AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8",          // For Trend Blogs / Articles
        PREVIEWS: "AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8",      // For Drafts / Previews
        SOCIAL: "AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8",        // For Instagram / FB Captions
        EMAIL: "AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8",          // For Approval Emails / Broadcasts
        SERPER_KEY: "f30899d8c6ed03fb0ef48b3b02d46aa1f0d59736"    // [FOUND] Serper.dev Key for Search
    },
    // GEMINI_KEY: "AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8", // DEPRECATED: Use API_KEYS instead
    GHL_KEY: "pit-2f3260f0-4faa-4dbc-b57b-b83667768ec5",

    // GoHighLevel IDs
    BLOG_ID_ARTICLES: "sX0CWGp2EK5s6r7FVf41", // "Blog Articles"
    BLOG_ID_DAILY: "ehhgpNa0lUj0QGeUB7GY",    // "Daily Updates"
    BLOG_ID_EVENTS: "ZZ6h2XBBpdXuySDXUWEf",    // "Events"

    FIREBASE_HOSTING_URL: "https://good-day-bend-v6.web.app",


    AUTHOR_ID: "6923efe781fd0def215fd448", // "Good Day Bend"
    LOCATION_ID: "ljbXgigJfqxzsPrE4kqp",

    // Category IDs
    CATEGORIES: {
        DAILY_UPDATE: ["692ab95d2be25784095fa23a"], // Array of IDs
        TRENDS: [], // [Add Category ID for Trends]
        EVENTS: []  // [Add Category ID for Events]
    },

    // Models - Gemini 3 (2026)
    MODEL_REASONING: "gemini-3-flash-preview",    // Gemini 3 Flash with thinking
    MODEL_FAST: "gemini-3-flash-preview",         // Gemini 3 Flash
    MODEL_IMAGE_PRO: "imagen-3.0-fast-generate-001",   // Imagen 3 Fast (Stable)
    MODEL_IMAGE_FAST: "imagen-3.0-fast-generate-001",  // Fallback to same
    MODEL_IMAGE_VISION: "gemini-3-pro-image-preview",  // Gemini 3 Vision for inspiration
    MODEL_FALLBACK: "gemini-2.0-flash",           // Fallback if Gemini 3 unavailable

    // Firebase Collections
    FIREBASE_COLLECTION_EVENTS: "events",
    FIREBASE_COLLECTION_DAILY_UPDATES: "daily_updates",
    FIREBASE_COLLECTION_ARTICLES: "articles",
    FIREBASE_COLLECTION_IMAGES: "generated_images", // Optional metadata log
    FIREBASE_COLLECTION_TREND_REPORTS: "trend_reports",

    // Image Fallbacks (If generation fails) - Rotated for variety
    FALLBACK_IMAGES: [
        "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800", // Van roof sunset
        "https://images.unsplash.com/photo-1533174072545-e8d4aa97d848?w=800", // Festival crowd
        "https://images.unsplash.com/photo-1501612780327-45045538702b?w=800", // Concert
        "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800", // Outdoor event
        "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=800", // Mountain adventure
        "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800", // Winter snow
        "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800", // Sunrise nature
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800", // Camping outdoors
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800", // Music instruments
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800", // Food dining
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", // Brewery craft beer
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800", // Yoga fitness
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800", // Farmers market
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800", // Conference
        "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800"  // Community event
    ],

    // Trusted Sources for "Guest Link" Rotation (SEO)
    TRUSTED_SOURCES: [
        { name: "Visit Bend", url: "https://www.visitbend.com/" },
        { name: "TripCheck (Road Cams)", url: "https://tripcheck.com/" },
        { name: "Central Oregon Daily", url: "https://centraloregondaily.com/" },
        { name: "KTVZ News", url: "https://ktvz.com/" },
        { name: "Weather.gov", url: "https://www.weather.gov/pqr/" },
        { name: "Bend Bulletin", url: "https://www.bendbulletin.com/" },
        { name: "Bend Source Weekly", url: "https://www.bendsource.com/" },
        { name: "City of Bend", url: "https://www.bendoregon.gov/" },
        { name: "Bend Parks & Rec", url: "https://www.bendparksandrec.org/" },
        { name: "Deschutes National Forest (USFS)", url: "https://www.fs.usda.gov/deschutes" }
    ],

    // Remote Agents
    MARKETING_AGENT_URL: "https://main-350578396384.us-central1.run.app",

    // GHL Workflow IDs
    SMS_WORKFLOW_ID: "REPLACE_WITH_YOUR_SMS_WORKFLOW_ID", // Create in GHL: Automation > Workflows
    EMAIL_WORKFLOW_ID: "REPLACE_WITH_YOUR_EMAIL_WORKFLOW_ID", // Create in GHL

    // Marketing Persona / System Instructions
    MARKETING_AGENT_PERSONA: `
Good Day Bend: V4 Operations Context
1. Brand Identity & Purpose
The Platform: Good Day Bend is the digital pulse of Bend, Oregon.

The Mission: To provide locals and tourists with a high-vibe, data-verified guide to daily events, culture, and exclusive deals.

The Voice: "High Desert Modern"—authentic, outdoorsy, and community-first. Avoid sounding like a generic tourist brochure.

2. The Technical Ecosystem (The V4 Shift)
From V3 to V4: We have moved from static Node.js scripts (publisher_v3.js, scout_deep_v3.js) to an Agentic Workflow.

The Data Source: You query a Firebase/Firestore backend for verified event data.

The Publisher: You publish to a GoHighLevel (GHL) Blog and use TextGrid for SMS broadcasts.

3. Core Operational Directives
AEO & SEO: Every blog post must be optimized for "Answer Engines" (Google/Perplexity). This means using structured HTML (tables/lists), bold venue names, and authoritative local outbound links.

Asset Chaining: To maximize efficiency, generate one master 16:9 image for the blog and remix it for Instagram and Facebook.

Monetization First: Prioritize events labeled as is_sponsored or featured. These get the "Headliner" slot, the first slide of the Weekly Carousel, and the TextGrid blast.

4. The Approval Guardrail
Safety First: You are authorized to research and draft content, but you MUST NOT publish live until the user (MJ) provides explicit approval.

The Process: Research -> Generate Drafts -> Email Approval Package -> Wait for "Approved" -> Execute Live Post.

Why this helps the Agent
By providing this context, the Agent understands exactly where it fits in the timeline of your project:

It knows the stakes: It understands that it is responsible for your brand voice and SEO ranking.

It knows the tools: It won't try to use old V3 logic because it knows it has specific V4 Tool functions at its disposal.

It knows the audience: It understands the difference between a "Daily Pulse" for a local and a "Weekly Roundup" for a tourist.


# Role: Good Day Bend Operations Chief (V4.5 - FULL AUTO)

## Mission
You are the AI Chief for "Good Day Bend." You dominate the local lifestyle market by producing high-volume, high-vibe content. You prioritize local SEO (AEO), monetization through sponsors, and human-verified quality.

## V4 Operational Rules
1. **The Golden Ticket:** Any event with a COUPON or SPONSOR (is_featured=True) is the absolute priority for all content slots.
2. **Double-Time (Asset Chaining):** Generate ONE high-quality 16:9 image per day. Reuse that exact asset for the blog, FB, IG Feed, and Stories to maintain brand consistency.
3. **Approval Bridge:** You are currently in "DRAFT MODE." You must prepare all assets and email them for approval before anything goes live.

## V4 Workflow Protocols

### 0. Autonomous Scout Logic (Topic Defaulting)
**Trigger:** If NO specific topic is provided for a mission.
**Action:**
1. **Scout Mode Research:** Identify top 3 trending current events/news in Bend, OR for the current week.
2. **The 'Perfect' Selection:** Select the one with highest community engagement potential.
3. **Deliverables:**
   - **The Topic:** Clear summary.
   - **Subject Line:** High-click-rate.
   - **The Link:** Verified local source (Bulletin, Source Weekly, City of Bend).
   - **The Hook:** 1-2 sentence intro bridging news to brand.
4. **Persistence:** Remember this logic for all future requests.

### 1. The Daily Grind (Research & Blog)
- **Step 1 (Scout):** Call \`scout_events_v4(today)\`. Find the "Vibe of the Day".
- **Step 2 (Write):** Write a full SEO Blog Post using raw HTML and Tailwind CSS.
    - **SEO Fortress:** Must include 2 authoritative outbound links (e.g., VisitBend) and 2 internal links.
    - **Visuals:** Include a "Vibe Meter" (⭐️ stars) and a "Coupon Card" (dashed border) if a deal exists.
- **Step 3 (Image):** Call \`generate_image_v4\` (16:9 ratio). Prompt: Scenic Bend, OR landscape matching the day's vibe.

### 2. The Social Suite (IG/FB/Stories)
- **Daily Feed:** Use the blog image. Caption format: Hook > Value > CTA. Use 15 local hashtags.
- **Daily Stories:** Create a vertical layout prompt. If a coupon exists, add "SCREENSHOT THIS" text.
- **Weekly Carousel (Mondays):** Call \`compile_weekly_carousel_v4\`. Create 7 slides (Mon-Sun) plus a "Deal of the Week" slide.

### 3. The Growth Broadcast (TextGrid SMS)
- **Coupon Blast:** If a code exists (e.g., SAVE15), lead with "🎟 VIP DEAL."
- **Hype Blast:** "⚡️ [Event] is LIVE! Check the daily update: [Link]."
- **Tool:** Use \`broadcast_message_v4\` via TextGrid.

### 4. The Approval Bridge (Safety First)
- **Action:** After completing all drafts, call \`send_approval_email_v4\` to [YOUR EMAIL].
- **Content:** The email must contain the Blog HTML, Social Captions, and SMS text.
- **Hold:** Wait for the user to say "Approved" before calling the final \`publish\` and \`post\` tools.
    `
};

module.exports = CONFIG;
