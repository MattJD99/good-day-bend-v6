"""
Trend Blog Agent V7 — Best-in-Class Edition (Feb 2026)

Upgraded from original v7 with:
- Segmented models: Gemini 3 Flash (research) + Gemini 3 Pro (writing)
- V6 queue system: trend_queue → legacy reports → AI fallback
- Approval flow: draft upload to Storage + email via GHL
- Queue topic marking after use

Pattern: Queue Check → Research Trend → Deduplicate → Write Article →
         Art Director → Generate Image → Upload Draft → Save to Drafts → Send Email
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict
from google.cloud import firestore, storage
from vertexai.generative_models import GenerativeModel
import vertexai

from agent.config import (
    PROJECT_ID,
    COLLECTION_BLOGS,
    COLLECTION_ARTICLES,
    COLLECTION_DRAFTS,
    COLLECTION_TREND_QUEUE,
    COLLECTION_TREND_REPORTS,
    MODEL_RESEARCH,
    MODEL_WRITING,
    MODEL_WRITING_BACKUP,
    MODEL_VISION,
    TRUSTED_SOURCES,
    FEATURED_SPONSORS,
    STORAGE_BUCKET
)
from agent.image_generation import generate_image_with_vision
from agent.ghl import GHLClient

# Approval endpoint (Cloud Function URL for review actions)
FUNCTION_URL = "https://us-central1-good-day-bend-v6.cloudfunctions.net/main"

# Admin email for approval notifications
ADMIN_EMAIL = "mdesautel@gmail.com"


class TrendResearchAgent:
    """
    Discovers trending topics relevant to Bend, Oregon.
    Uses Gemini 3 Flash (MODEL_RESEARCH) for fast data ingestion.
    """

    def __init__(self):
        self.model = GenerativeModel(MODEL_RESEARCH)

    async def find_trending_topic(self) -> str:
        """
        Find a trending topic for Bend, Oregon

        Returns:
            Topic name/title
        """
        current_date = datetime.now()
        date_str = current_date.strftime("%B %Y")  # e.g., "February 2026"
        month = current_date.strftime("%B")

        prompt = f"""
Find a trending or interesting topic relevant to Bend, Oregon RIGHT NOW.

Current Date: {current_date.strftime("%A, %B %d, %Y")}

CONSTRAINTS:
1. IGNORE news older than 14 days
2. IGNORE events that have already passed
3. If seasonal topic (e.g., "Hiking"), ensure it's accurate for {month}

TOPIC CATEGORIES:
- Local News (new business, development, city updates)
- Seasonal Activities (skiing, hiking, floating, etc.)
- Housing Market
- Tourism trends
- Local Culture
- Outdoor Recreation
- Community events

Examples:
- "First Snow at Mt. Bachelor"
- "New Brewery Opening in Old Mill District"
- "Summer Floating Season Kicks Off"
- "Bend Housing Market Update {date_str}"

Return ONLY the topic name/title. No explanation.
"""

        print("🔍 Trend Research Agent (Gemini 3 Flash): Scanning for topics...")

        try:
            result = await asyncio.to_thread(self.model.generate_content, prompt)
            topic = result.text.strip().strip('"\'')

            print(f"💡 Found trending topic: {topic}")
            return topic

        except Exception as e:
            print(f"⚠️ Trend research failed: {e}")
            # Fallback topics by season
            fallback_topics = {
                1: "Winter Activities at Mt. Bachelor",
                2: "Late Season Skiing in Bend",
                3: "Spring Hiking Season Opens",
                4: "Bend's Best Spring Trails",
                5: "Summer Floating on the Deschutes",
                6: "Best Outdoor Dining in Bend",
                7: "Summer Concert Series",
                8: "Late Summer Activities in Bend",
                9: "Fall Colors in Central Oregon",
                10: "Oktoberfest Celebrations in Bend",
                11: "Early Season Skiing Opens",
                12: "Holiday Events in Bend"
            }
            return fallback_topics.get(current_date.month, "Good Day Bend")


class ArtDirectorAgent:
    """
    Creates optimized image generation prompts.
    Uses MODEL_VISION for visual analysis.
    """

    def __init__(self):
        self.model = GenerativeModel(MODEL_VISION)

    async def create_image_prompt(self, title: str, topic: str) -> str:
        """
        Create optimized visual prompt for image generation
        """
        prompt = f"""
Context: You are an Art Director for a magazine in Bend, Oregon.
Article Title: "{title}"
Article Topic: "{topic}"

Task: Write a strictly visual image generation prompt for this article.

RULES:
1. DO NOT use text in the image
2. Focus on a specific scene, object, or lighting
   Examples:
   - "Close up of a sold sign with snow-capped mountains"
   - "Cinematic wide shot of the Deschutes River at sunset"
   - "Overhead view of hikers on a pine-lined trail"
3. Style: Photorealistic, 4k, High Desert aesthetic, warm lighting
4. Output: Just the prompt string. No conversational text.
"""

        print("🎨 Art Director: Designing image prompt...")

        try:
            result = await asyncio.to_thread(self.model.generate_content, prompt)
            optimized_prompt = result.text.strip()

            print(f"✅ Optimized prompt: {optimized_prompt[:80]}...")
            return optimized_prompt

        except Exception as e:
            print(f"⚠️ Art director failed: {e}")
            return f"Professional editorial photography of {topic} in Bend, Oregon. Photorealistic, golden hour lighting, f/1.8, 8k resolution."


class BlogWriterAgent:
    """
    Generates infographic-style blog articles.
    Uses Gemini 3 Pro (MODEL_WRITING) for frontier writing quality.
    """

    def __init__(self):
        self.model = GenerativeModel(MODEL_WRITING)

    async def write_article(self, topic: str, research_context: str = "") -> Dict[str, str]:
        """
        Generate infographic-style HTML article

        Args:
            topic: The trending topic
            research_context: Optional research/context from queue

        Returns:
            Dict with 'title' and 'content' (HTML)
        """
        import random
        sources = random.sample(TRUSTED_SOURCES, min(2, len(TRUSTED_SOURCES)))
        sources_text = ', '.join([f"{s['name']} ({s['url']})" for s in sources])

        # Pick a sponsor if available
        sponsor = FEATURED_SPONSORS[0] if FEATURED_SPONSORS else None
        sponsor_block = ""
        if sponsor:
            sponsor_block = f"""
5. **⭐ FEATURED SPONSOR (The "Gold" Slot)**:
   <div style="background: linear-gradient(135deg, #fffbeb 0%, #fff 100%); border: 2px solid #b45309; border-radius: 16px; padding: 25px; margin-bottom: 30px; position: relative;">
      <div style="position: absolute; top: -12px; right: 20px; background: #b45309; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; font-family: 'Outfit', sans-serif;">VIP PARTNER</div>
      <h3 style="font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #b45309; margin-top: 0; margin-bottom: 10px;">{sponsor['name']}</h3>
      <p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; color: #451a03; margin-bottom: 15px;"><strong>VIP Deal:</strong> {sponsor['offer']} 🍕</p>
      <a href="{sponsor['url']}" style="background: #b45309; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Claim Deal &rarr;</a>
   </div>
"""

        research_section = ""
        if research_context:
            research_section = f"\nRESEARCH CONTEXT (use this for accuracy):\n{research_context}\n"

        prompt = f"""
Role: Expert Content Creator for "Good Day Bend"
Topic: {topic}
Goal: Write a visually stunning, "Infographic-style" blog post
{research_section}
CRITICAL: Do NOT write walls of text. Use HTML/CSS to visualize data.

STRUCTURE & STYLING (Use INLINE CSS):

1. **Hero Section**:
   <h1 style="font-family: 'Playfair Display', serif; font-size: 2.8rem; color: #2e5948;">Title</h1>
   <p class="intro" style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; color: #334155;">Hook paragraph</p>

2. **"Quick Hits" Infographic**:
   <div style="background: #f0f7f4; padding: 20px; border-radius: 12px; border-left: 5px solid #2e5948; margin: 20px 0;">
      <h3>Key Takeaways</h3>
      - Emoji bullet points with bold insights
   </div>

3. **Visual Breakdown**:
   Instead of paragraphs, use:
   - <ul> with custom styled <li> elements
   - <h3> headers for sections
   - Colored boxes for callouts

4. **The Vibe Check** (Visual Meter):
   <div style="background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <strong>Family Friendliness:</strong> ⭐️⭐️⭐️⭐️⭐️
   </div>

{sponsor_block}

6. **The Daily Footer**:
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-family: 'Outfit', sans-serif; color: #64748b;">
   <p>✨ <strong>Good Day Bend</strong> - Your Daily Pulse of the High Desert</p>
   <p>
      <a href="https://gooddaybend.com" style="color: #0A1915; text-decoration: none; font-weight: bold;">Home</a> | 
      <a href="https://gooddaybend.com/archive" style="color: #0A1915; text-decoration: none; font-weight: bold;">Past Updates</a> | 
      <a href="https://instagram.com/gooddaybend" style="color: #0A1915; text-decoration: none; font-weight: bold;">Instagram</a>
   </p>
   <p style="font-size: 0.9rem;">Powered by <a href="https://daysaw.agency" style="color: #64748b; text-decoration: underline;">DaySaw Agency</a></p>
</div>

7. **Conclusion**: Brief wrap up

SEO & AEO MASTERY:
1. Include 2+ hyperlinks to these sources: {sources_text}
2. Internal link to "Good Day Bend Calendar" or "Daily Updates"
3. Keywords: "Bend Oregon", "High Desert", specific location names
4. Use descriptive alt text for any images
5. **CRITICAL:** For map links, use: `https://www.google.com/maps/search/?api=1&query=VENUE+NAME+Bend+Oregon`

TONE: Authentic, "High Desert Modern", smart

OUTPUT: Pure HTML body content. NO markdown. NO <html> tags.
"""

        print("✍️ Blog Writer (Gemini 3 Pro): Creating infographic-style article...")

        try:
            result = await asyncio.to_thread(self.model.generate_content, prompt)
            content = result.text.strip()

            # Clean up markdown artifacts
            content = content.replace('```html', '').replace('```', '').strip()

            # Extract title from first <h1> tag
            import re
            title_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE)

            if title_match:
                title = title_match.group(1)
            else:
                title = f"Bend Update: {topic}"

            print(f"✅ Generated {len(content)} chars of HTML")
            print(f"   Title: {title}")

            return {
                "title": title,
                "content": content
            }

        except Exception as e:
            print(f"❌ Blog writer (Gemini 3 Pro) failed: {e}")
            # Try backup model
            print("🔄 Retrying with backup model (Gemini 2.5 Pro)...")
            try:
                backup_model = GenerativeModel(MODEL_WRITING_BACKUP)
                result = await asyncio.to_thread(backup_model.generate_content, prompt)
                content = result.text.strip()
                content = content.replace('```html', '').replace('```', '').strip()

                import re
                title_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.IGNORECASE)
                title = title_match.group(1) if title_match else f"Bend Update: {topic}"

                print(f"✅ Backup model generated {len(content)} chars of HTML")
                return {"title": title, "content": content}

            except Exception as e2:
                print(f"❌ Backup model also failed: {e2}")
                raise


# ============================
# HELPER FUNCTIONS
# ============================

async def check_duplicate_topic(topic: str, db) -> bool:
    """Check if this topic was already covered in the last 24 hours"""
    try:
        yesterday = datetime.now() - timedelta(days=1)

        # Check both blogs and articles collections
        for collection in [COLLECTION_BLOGS, COLLECTION_ARTICLES]:
            query = db.collection(collection) \
                .where("topic", "==", topic) \
                .where("createdAt", ">", yesterday) \
                .limit(1)

            docs = await asyncio.to_thread(query.get)

            if docs:
                print(f"⚠️ Topic '{topic}' already covered in {collection}")
                return True

        return False

    except Exception as e:
        print(f"⚠️ Deduplication check failed: {e}")
        return False  # Proceed if check fails


async def get_topic_from_queue(db) -> tuple:
    """
    V6 Queue System: Check trend_queue for pre-researched topics.
    Returns (topic, research_context, queue_doc_id) or (None, None, None).
    """
    try:
        # Simplified query to avoid composite index requirement (status + priority)
        query = db.collection(COLLECTION_TREND_QUEUE).where("status", "==", "queued")
        
        docs = await asyncio.to_thread(query.get)

        if docs:
            # Sort by priority in Python (Client-side)
            # Lower number = higher priority (e.g. 1 is first)
            sorted_docs = sorted(docs, key=lambda x: x.to_dict().get("priority", 999))
            
            doc = sorted_docs[0]
            data = doc.to_dict()
            print(f"📋 Found queued topic: \"{data.get('topic')}\" (Priority: {data.get('priority', '?')})")
            return (
                data.get("topic", ""),
                data.get("researchReport", ""),
                doc.id
            )
    except Exception as e:
        print(f"⚠️ Could not check trend_queue: {e}")

    return (None, None, None)


async def get_topic_from_legacy_reports(db) -> tuple:
    """
    V6 Fallback: Check legacy trend_reports collection.
    Returns (topic, research_context) or (None, None).
    """
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        report_slug = f"trend-report-{today_str}"

        doc_ref = db.collection(COLLECTION_TREND_REPORTS).document(report_slug)
        doc = await asyncio.to_thread(doc_ref.get)

        if doc.exists:
            data = doc.to_dict()
            if data.get("status") == "ready":
                print(f"🧠 Found legacy report: \"{data.get('topic')}\"")
                return (data.get("topic", ""), data.get("researchReport", ""))
    except Exception as e:
        print(f"⚠️ Could not check legacy reports: {e}")

    return (None, None)


async def mark_queue_topic_used(db, queue_doc_id: str, draft_id: str):
    """Mark a trend_queue topic as used after generating the blog."""
    try:
        doc_ref = db.collection(COLLECTION_TREND_QUEUE).document(queue_doc_id)
        await asyncio.to_thread(
            doc_ref.update,
            {
                "status": "used",
                "usedAt": firestore.SERVER_TIMESTAMP,
                "draftId": draft_id
            }
        )
        print(f"📋 Queue topic marked as used: {queue_doc_id}")
    except Exception as e:
        print(f"⚠️ Could not update queue status: {e}")


def upload_draft_html(filename: str, html_content: str) -> str:
    """
    Upload draft HTML to Firebase Storage (sync).
    Mirrors V6's uploadDraft function — uses makePublic() + GCS URL.
    Returns public URL.
    """
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(STORAGE_BUCKET)
    destination_blob_name = f"drafts/{filename}"

    try:
        blob = bucket.blob(destination_blob_name)
        blob.upload_from_string(html_content, content_type="text/html")

        # Make publicly accessible (matches V6 behavior)
        blob.make_public()

        # Use GCS public URL format (same as V6 — no auth required)
        url = f"https://storage.googleapis.com/{STORAGE_BUCKET}/{destination_blob_name}"
        print(f"✅ Draft uploaded: {url}")
        return url

    except Exception as e:
        print(f"⚠️ Upload failed: {e}")
        # Fallback to GCS URL format anyway
        return f"https://storage.googleapis.com/{STORAGE_BUCKET}/drafts/{filename}"


def build_draft_html(title: str, content: str, image_url: str, draft_id: str) -> str:
    """
    Build the full approval draft HTML page.
    Mirrors V6's trend_blog_v6.js HTML template with approve/keep buttons.
    """
    today_str = datetime.now().strftime("%A, %B %d, %Y")

    return f"""<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700;900&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body {{ font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #0A1915; font-size: 18px; }}
            h1 {{ font-family: 'Playfair Display', serif; font-size: 3.5rem; line-height: 1.1; margin-bottom: 0.5em; }}
            h2, h3 {{ font-family: 'Playfair Display', serif; color: #0A1915; }}
            .prose p {{ font-size: 1.35rem; line-height: 1.9; color: #334155; margin-bottom: 2em; }}
            .prose li {{ font-size: 1.25rem; margin-bottom: 0.75em; }}
            a {{ color: #047857; text-decoration: underline; font-weight: 600; }}
            .action-bar {{ position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); display: flex; justify-content: center; gap: 20px; padding: 20px; border-top: 1px solid #e2e8f0; z-index: 50; }}
        </style>
    </head>
    <body class="pb-40">
        <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
            <span>Good Day Bend // Trend Draft V7</span>
            <span>{today_str}</span>
        </div>

        <main class="max-w-4xl mx-auto px-6 py-16">
            <h1 class="text-5xl md:text-6xl font-bold mb-8 text-[#0A1915]">{title}</h1>
            <img src="{image_url}" class="w-full h-auto rounded-3xl shadow-xl mb-8 border border-gray-100">

            <div class="prose prose-xl max-w-none prose-headings:font-serif">
                {content}
            </div>
        </main>

        <div class="action-bar">
            <a href="{FUNCTION_URL}?type=review_action&action=keep&draftId={draft_id}"
               class="px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 transition">
               📂 Keep as Draft
            </a>
            <a href="{FUNCTION_URL}?type=review_action&action=approve&draftId={draft_id}"
               class="bg-[#13ec5b] text-[#0d1b12] px-8 py-3 rounded-full text-sm font-bold hover:bg-green-400 hover:scale-105 transition shadow-lg flex items-center gap-2">
               🚀 Approve & Publish
            </a>
        </div>
    </body>
</html>"""


def build_approval_email(title: str, topic: str, image_url: str, draft_url: str) -> str:
    """
    Build rich HTML email body for trend blog approval.
    """
    return f"""
    <div style="font-family: sans-serif; color: #333;">
        <h1>Good Day Bend Daily Approval</h1>
        <p><strong>Topic:</strong> {topic}</p>
        <hr style="border:0; border-top:1px solid #111; margin:20px 0;">

        <h2>🔎 Review Drafts (Premium 2025 Edition)</h2>
        <ul>
            <li><a href="{draft_url}" style="font-size:18px; font-weight:bold; color:#0d1b12;">✨ Review Trend Blog Draft: {title}</a></li>
        </ul>

        <div style="margin: 30px 0;">
            <p>Click the draft link above to review, then use the <strong>Approve &amp; Publish</strong> button at the bottom of the page.</p>
        </div>

        <img src="{image_url}" width="300" style="border-radius:12px; margin-top:20px; border:1px solid #eee;"/>
    </div>
    """


async def send_approval_email(title: str, topic: str, image_url: str, draft_url: str):
    """Send approval email via GHL."""
    ghl = GHLClient()

    if not ghl.api_key:
        print("⚠️ GHL_API_KEY not set. Skipping approval email.")
        return

    try:
        # Upsert contact
        contact_id = ghl.upsert_contact(
            email=ADMIN_EMAIL,
            first_name="MJ",
            last_name="Owner",
            tags=["admin", "approver"]
        )

        if not contact_id:
            print("❌ Could not get contact ID for email.")
            return

        # Send email
        email_subject = f"[REVIEW] Trend Blog: {title}"
        email_html = build_approval_email(title, topic, image_url, draft_url)

        ghl.send_email(
            contact_id=contact_id,
            subject=email_subject,
            html=email_html,
            message="Please view the HTML version."
        )

        print(f"✅ Approval email sent to {ADMIN_EMAIL}")

    except Exception as e:
        print(f"❌ Email failed: {e}")


# ============================
# MAIN WORKFLOW
# ============================

async def publish_trend_blog(send_email: bool = True) -> Dict:
    """
    Main Trend Blog workflow (V7 — Best-in-Class Edition)

    Flow: Queue Check → Research → Deduplicate → Write → Image → 
          Upload Draft → Save to Drafts → Send Email

    Args:
        send_email: If True, sends approval email via GHL.
                    If False, returns draft details for unified approval.

    Returns:
        Dict with blog/draft metadata
    """
    print("📈 Trend Blog V7 (Best-in-Class) Starting...")
    print("=" * 60)

    # Initialize Firestore
    db = firestore.Client(project=PROJECT_ID)

    # ─────────────────────────────────────────────────
    # STEP 1: TOPIC SELECTION (Queue → Legacy → AI)
    # ─────────────────────────────────────────────────
    topic = ""
    research_context = ""
    queue_doc_id = None

    # 1a. Check trend_queue first (priority order)
    topic, research_context, queue_doc_id = await get_topic_from_queue(db)

    # 1b. Fallback: check legacy trend_reports
    if not topic:
        topic, research_context = await get_topic_from_legacy_reports(db)
        if topic:
            research_context = research_context or ""

    # 1c. Last resort: AI-generated topic
    if not topic:
        print("⚠️ No queued topics found. Using AI fallback (consider running scout_trends_v2)...")
        research_agent = TrendResearchAgent()
        topic = await research_agent.find_trending_topic()

    print(f"💡 Identified Topic: {topic}")

    # ─────────────────────────────────────────────────
    # STEP 2: DEDUPLICATION
    # ─────────────────────────────────────────────────
    is_duplicate = await check_duplicate_topic(topic, db)

    if is_duplicate:
        print("⏭️ Skipping duplicate topic")
        return {"skipped": True, "reason": "duplicate", "topic": topic}

    # ─────────────────────────────────────────────────
    # STEP 3: WRITE ARTICLE (Gemini 3 Pro)
    # ─────────────────────────────────────────────────
    writer_agent = BlogWriterAgent()
    article = await writer_agent.write_article(topic, research_context=research_context or "")

    # ─────────────────────────────────────────────────
    # STEP 4: ART DIRECTOR → IMAGE GENERATION (Imagen 4)
    # ─────────────────────────────────────────────────
    art_director = ArtDirectorAgent()
    image_prompt = await art_director.create_image_prompt(article["title"], topic)

    print("\n🎨 Generating hero image with art director prompt...")
    image_url = await generate_image_with_vision(
        topic=topic,
        context=image_prompt
    )

    # ─────────────────────────────────────────────────
    # STEP 5: UPLOAD DRAFT HTML TO STORAGE
    # ─────────────────────────────────────────────────
    draft_id = f"trend-v7-{int(datetime.now().timestamp())}"
    slug = f"bend-trend-{int(datetime.now().timestamp())}"

    draft_html = build_draft_html(
        title=article["title"],
        content=article["content"],
        image_url=image_url,
        draft_id=draft_id
    )

    draft_url = await asyncio.to_thread(
        upload_draft_html,
        f"trend-draft-{int(datetime.now().timestamp())}.html",
        draft_html
    )

    # ─────────────────────────────────────────────────
    # STEP 6: SAVE TO DRAFTS COLLECTION (PENDING)
    # ─────────────────────────────────────────────────
    draft_data = {
        "title": article["title"],
        "urlSlug": slug,
        "rawHTML": article["content"],
        "imageUrl": image_url,
        "publishDate": datetime.now().strftime("%Y-%m-%d"),
        "status": "pending",
        "type": "trend_blog",
        "topic": topic,
        "categories": ["trending", "bend-oregon"],
        "createdAt": datetime.now().isoformat(),
        "socialCaption": "",  # Prevent undefined error
        "generatedBy": "trend_blog_v7",
        "queueDocId": queue_doc_id,
        "draftUrl": draft_url
    }

    await asyncio.to_thread(
        db.collection(COLLECTION_DRAFTS).document(draft_id).set,
        draft_data
    )
    print(f"💾 Saved draft to drafts/{draft_id} (status: pending)")

    # ─────────────────────────────────────────────────
    # STEP 7: MARK QUEUE TOPIC AS USED
    # ─────────────────────────────────────────────────
    if queue_doc_id:
        await mark_queue_topic_used(db, queue_doc_id, draft_id)

    # ─────────────────────────────────────────────────
    # STEP 8: SEND APPROVAL EMAIL
    # ─────────────────────────────────────────────────
    if not send_email:
        print("📧 sendEmail is false. Returning draft details for Unified Approval.")
        return {
            "draftId": draft_id,
            "url": draft_url,
            "title": article["title"],
            "imageUrl": image_url
        }

    print("📧 Sending Approval Email...")
    await send_approval_email(
        title=article["title"],
        topic=topic,
        image_url=image_url,
        draft_url=draft_url
    )

    print("=" * 60)
    print("✅ Trend Blog V7 Flow Complete. Waiting for Approval.")
    print("=" * 60)

    return {
        "draftId": draft_id,
        "slug": slug,
        "title": article["title"],
        "topic": topic,
        "image_url": image_url,
        "draft_url": draft_url,
        "status": "pending",
        "collection": COLLECTION_DRAFTS
    }


# CLI entry point
async def main():
    """Test the trend blog agent"""
    result = await publish_trend_blog()

    if result.get("skipped"):
        print(f"\n⏭️ Skipped: {result['reason']}")
        print(f"   Topic: {result['topic']}")
    else:
        print(f"\n📊 Draft Created! (Pending Approval)")
        print(f"   Title: {result['title']}")
        print(f"   Draft ID: {result.get('draftId', 'N/A')}")
        print(f"   Draft URL: {result.get('draft_url', 'N/A')}")
        print(f"   Image: {result.get('image_url', 'N/A')}")
        print(f"\n💡 Next Steps:")
        print(f"   1. Check email for approval link")
        print(f"   2. Review draft at: {result.get('draft_url', 'N/A')}")
        print(f"   3. Click 'Approve & Publish' to go live")


if __name__ == "__main__":
    asyncio.run(main())
