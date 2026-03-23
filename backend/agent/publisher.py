"""
Publisher Agent - Daily Article Generation for Good Day Bend v7

Multi-agent system migrated from v6 publisher_v2.js:
- StrategyAgent: Analyzes events, determines vibe
- WriterAgent: Generates HTML article with massive typography
- SocialAgent: Creates captions and SMS
- Orchestrator: Coordinates workflow and approval

Pattern: Fetch Events → Strategy → Write → Social → Image → Draft → Email
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from google.cloud import firestore, storage
from vertexai.generative_models import GenerativeModel
import vertexai

from agent.config import (
    PROJECT_ID,
    COLLECTION_EVENTS,
    COLLECTION_DAILY_UPDATES,
    COLLECTION_ARTICLES,
    COLLECTION_DRAFTS,
    MODEL_VISION,
    STORAGE_BUCKET,
    TRUSTED_SOURCES
)
from agent.ghl import GHLClient
from agent.image_generation import generate_image_with_vision
from agent.weekend_preview import generate_weekend_preview_html, should_include_weekend_preview


async def get_weekend_preview(db, target_date: datetime) -> Dict[str, List[Dict]]:
    """
    Fetch weekend events for preview section (Fri, Sat, Sun)
    
    Only returns events if target_date is Mon-Thu
    
    Args:
        db: Firestore client
        target_date: The date we're publishing for
        
    Returns:
        Dict with weekend events grouped by day, or empty if not applicable
    """
    day_of_week = target_date.weekday()  # 0=Mon, 4=Fri, 6=Sun
    
    # Only show weekend preview for Mon-Thu
    if day_of_week >= 4:  # Fri, Sat, Sun - no preview needed
        return {}
    
    weekend_events = {}
    days_to_fetch = [
        ("Friday", 4 - day_of_week),       # Days until Friday
        ("Saturday", 5 - day_of_week),     # Days until Saturday
        ("Sunday", 6 - day_of_week),       # Days until Sunday
    ]
    
    for day_name, days_ahead in days_to_fetch:
        weekend_date = target_date + timedelta(days=days_ahead)
        iso_date = weekend_date.strftime("%Y-%m-%d")
        
        events_ref = db.collection(COLLECTION_EVENTS).where("eventDate", "==", iso_date).limit(5)
        events_snapshot = await asyncio.to_thread(events_ref.get)
        
        if events_snapshot:
            weekend_events[day_name] = [
                {
                    "title": doc.to_dict().get("title", "Event"),
                    "venue": doc.to_dict().get("venue", doc.to_dict().get("location", "TBD")),
                    "time": doc.to_dict().get("time", "")
                }
                for doc in events_snapshot
            ]
    
    return weekend_events


def make_json_safe(obj):
    """Convert Firestore objects to JSON-serializable format"""
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_safe(item) for item in obj]
    elif hasattr(obj, 'isoformat'):  # Datetime
        return obj.isoformat()
    elif obj is None:
        return ""
    elif not isinstance(obj, (str, int, float, bool)):
        return str(obj)
    return obj


@dataclass
class VibeData:
    """Strategy analysis output"""
    vibe: str
    headliners: List[str]
    metrics: Dict[str, int]  # FamilyFriendly, Nightlife, Outdoors (1-5)


@dataclass
class ArticleContent:
    """Writer output"""
    html: str
    title: str


@dataclass
class SocialContent:
    """Social agent output"""
    caption: str
    sms: str


class StrategyAgent:
    """
    Analyzes events and determines the day's vibe
    
    Mirrors v6's modelStrategy with Gemini Flash
    """
    
    def __init__(self):
        self.model = GenerativeModel(MODEL_VISION)
    
    async def analyze_events(self, events: List[Dict], date_str: str) -> VibeData:
        """
        Analyze events and extract vibe + headliners + metrics
        
        Args:
            events: List of event dictionaries
            date_str: Human-readable date
            
        Returns:
            VibeData with analysis results
        """
        # Convert Firestore objects to JSON-safe format
        safe_events = make_json_safe(events)
        
        prompt = f"""
Analyze these {len(safe_events)} events in Bend, OR for {date_str}:
{json.dumps(safe_events, indent=2)}

1. Identify the "Vibe of the Day" - be specific and creative (e.g., "Indie Beats & Brews", "Artsy Afternoon")
2. Pick the Top 3 "Headliner" events based on appeal
3. Rate the day on metrics (1-5 stars): FamilyFriendly, Nightlife, Outdoors

Output strictly JSON:
{{
    "vibe": "Creative vibe name",
    "headliners": ["Event Title 1", "Event Title 2", "Event Title 3"],
    "metrics": {{
        "FamilyFriendly": 5,
        "Nightlife": 3,
        "Outdoors": 4
    }}
}}
"""
        
        print("🧠 Strategy Agent: Analyzing events...")
        
        try:
            result = await asyncio.to_thread(self.model.generate_content, prompt)
            response_text = result.text.strip()
            
            # Extract JSON
            json_start = response_text.find('{')
            json_end = response_text.rfind('}')
            
            if json_start == -1 or json_end == -1:
                raise ValueError("No JSON found in response")
            
            json_str = response_text[json_start:json_end + 1]
            data = json.loads(json_str)
            
            vibe_data = VibeData(
                vibe=data.get("vibe", "Good Day Bend"),
                headliners=data.get("headliners", [e["title"] for e in events[:3]]),
                metrics=data.get("metrics", {"FamilyFriendly": 3, "Nightlife": 3, "Outdoors": 3})
            )
            
            print(f"✅ Vibe: {vibe_data.vibe}")
            print(f"   Headliners: {', '.join(vibe_data.headliners[:2])}...")
            
            return vibe_data
            
        except Exception as e:
            print(f"⚠️ Strategy failed, using fallback: {e}")
            return VibeData(
                vibe="Good Day Bend",
                headliners=[e["title"] for e in events[:3]],
                metrics={"FamilyFriendly": 3, "Nightlife": 3, "Outdoors": 3}
            )


class WriterAgent:
    """
    Generates HTML article with v6's massive typography style
    
    Mirrors v6's modelWriter with SEO optimization
    """
    
    def __init__(self):
        self.model = GenerativeModel(MODEL_VISION)
    
    async def generate_article(
        self,
        vibe_data: VibeData,
        events: List[Dict],
        date_str: str
    ) -> ArticleContent:
        """
        Generate HTML article with massive typography
        
        Args:
            vibe_data: Strategy analysis results
            events: Full event list
            date_str: Human-readable date
            
        Returns:
            ArticleContent with HTML and title
        """
        # Pick 2 random trusted sources for SEO
        import random
        sources = random.sample(TRUSTED_SOURCES, min(2, len(TRUSTED_SOURCES)))
        source_links = ', '.join([
            f'<a href="{s["url"]}" target="_blank" rel="noopener noreferrer">{s["name"]}</a>'
            for s in sources
        ])
        
        # Build metrics stars
        metrics_html = " | ".join([
            f"{key}: {'⭐' * value}"
            for key, value in vibe_data.metrics.items()
        ])
        
        # Convert to JSON-safe format
        safe_events = make_json_safe(events)
        
        prompt = f"""
You are the Editor of "Good Day Bend". Write today's daily update.

INPUT DATA:
- Date: {date_str}
- Vibe: {vibe_data.vibe}
- Headliners: {', '.join(vibe_data.headliners)}
- All Events: {json.dumps(safe_events, indent=2)}

DESIGN & TYPOGRAPHY RULES:
* Use "Outfit" (body) and "Playfair Display" (headings) fonts
* CRITICAL: Massive, bold typography

COMPONENTS TO GENERATE:

1. **The Pulse Box**:
<div style="background-color: #F8FAFC; border: 2px solid #0A1915; padding: 25px; margin-bottom: 30px; border-radius: 12px; box-shadow: 5px 5px 0px #0A1915;">
   <h2 style="font-family: 'Playfair Display', serif; margin-top:0;">Today's Vibe: {vibe_data.vibe}</h2>
   <p style="font-size: 1.25rem;">{metrics_html}</p>
</div>

2. **⭐ FEATURED SPONSOR (The "Gold" Slot)**:
   (Only if sponsored data exists. If generic, skip).
   <div style="background: linear-gradient(135deg, #fffbeb 0%, #fff 100%); border: 2px solid #b45309; border-radius: 16px; padding: 25px; margin-bottom: 30px; position: relative;">
      <div style="position: absolute; top: -12px; right: 20px; background: #b45309; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; font-family: 'Outfit', sans-serif;">VIP PARTNER</div>
      <h3 style="font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #b45309; margin-top: 0; margin-bottom: 10px;">Bend Pizza Kitchen</h3>
      <p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; color: #451a03; margin-bottom: 15px;"><strong>VIP Deal:</strong> Free Garlic Knots with Large Pizza 🍕</p>
      <a href="https://bendpizzakitchen.com" style="background: #b45309; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Claim Deal &rarr;</a>
   </div>

3. **The Headliners (Card Style)** - Create DIV for each Top 3:
<div style="background:white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
   <h3 style="font-family: 'Playfair Display', serif; font-size: 1.8rem; color: #0A1915; margin-bottom: 5px;">EVENT TITLE</h3>
   <div style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; color: #64748b; margin-bottom: 15px; font-weight: 600;">
      🕒 TIME | 📍 VENUE | 💵 PRICE
   </div>
   <p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; line-height: 1.6;">Description...</p>
   <div style="margin-top: 15px;">
       <a href="GOOGLE_MAPS_LINK" style="display:inline-block; margin-right: 15px; font-weight:bold; color:#13ec5b; text-decoration:underline;">📍 Map It</a>
       <!-- IF sourceUrl exists in data: -->
       <a href="SOURCE_URL" style="display:inline-block; font-weight:bold; color:#0A1915; text-decoration:underline;">🎟️ Tickets / Info</a>
   </div>
</div>

3. **The Rundown** - Remaining events as list:
<ul style="font-size: 1.25rem; line-height: 1.8; list-style-type: square; padding-left: 20px;">
   <li>Event name - Venue - Time</li>
</ul>

4. **The Daily Footer**:
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-family: 'Outfit', sans-serif; color: #64748b;">
   <p>✨ <strong>Good Day Bend</strong> - Your Daily Pulse of the High Desert</p>
   <p>
      <a href="https://gooddaybend.com" style="color: #0A1915; text-decoration: none; font-weight: bold;">Home</a> | 
      <a href="https://gooddaybend.com/archive" style="color: #0A1915; text-decoration: none; font-weight: bold;">Past Updates</a> | 
      <a href="https://instagram.com/gooddaybend" style="color: #0A1915; text-decoration: none; font-weight: bold;">Instagram</a>
   </p>
   <p style="font-size: 0.9rem;">Powered by <a href="https://daysaw.agency" style="color: #64748b; text-decoration: underline;">DaySaw Agency</a></p>
</div>

SEO & AEO MASTERY:
1. Semantic descriptions of venue locations
2. Include these trusted backlinks naturally: {source_links}
3. Use full business names
4. Internal link to Calendar: <a href='/calendar.html'>Full Calendar</a>
5. **CRITICAL:** For "GOOGLE_MAPS_LINK", use the format: `https://www.google.com/maps/search/?api=1&query=VENUE+NAME+Bend+Oregon` (URL encoded).

OUTPUT: Pure HTML body content (Divs, H2, H3, P, A). NO <html> tags. NO markdown.
"""
        
        print("✍️ Writer Agent: Generating article...")
        
        try:
            result = await asyncio.to_thread(self.model.generate_content, prompt)
            html_content = result.text.strip()
            
            # Clean up any markdown artifacts
            html_content = html_content.replace('```html', '').replace('```', '').strip()
            
            title = f"Good Day Bend: {vibe_data.vibe} ({date_str})"
            
            print(f"✅ Generated {len(html_content)} chars of HTML")
            
            return ArticleContent(html=html_content, title=title)
            
        except Exception as e:
            print(f"❌ Writer failed: {e}")
            raise


class SocialAgent:
    """
    Generates social media captions and SMS
    
    Mirrors v6's modelSocial
    """
    
    def __init__(self):
        self.model = GenerativeModel(MODEL_VISION)
    
    async def generate_social(
        self,
        vibe: str,
        headliners: List[str]
    ) -> SocialContent:
        """
        Generate social media caption and SMS
        
        Args:
            vibe: The day's vibe
            headliners: Top events
            
        Returns:
            SocialContent with caption and SMS
        """
        # Social caption
        social_prompt = f"""
Based on this vibe: "{vibe}" and top events: {', '.join(headliners[:3])}

Write a catchy Instagram/Facebook caption:
- Start with a Hook
- Use 3-5 relevant hashtags including #BendOregon #InBend
- Keep under 280 chars
- Call to Action: "Link in Bio"
"""
        
        # SMS text
        sms_prompt = f"""
Based on vibe: "{vibe}" and events: {', '.join(headliners[:2])}

Write SMS broadcast (160 chars max):
- Start with emoji
- Be punchy and direct
- Include "gooddaybend.com"
- NO hashtags (this is SMS)
"""
        
        print("📱 Social Agent: Creating social content...")
        
        try:
            # Generate both concurrently
            social_task = asyncio.to_thread(self.model.generate_content, social_prompt)
            sms_task = asyncio.to_thread(self.model.generate_content, sms_prompt)
            
            social_result, sms_result = await asyncio.gather(social_task, sms_task)
            
            caption = social_result.text.strip()
            sms = sms_result.text.strip()
            
            print(f"✅ Social caption: {len(caption)} chars")
            print(f"✅ SMS text: {len(sms)} chars")
            
            return SocialContent(caption=caption, sms=sms)
            
        except Exception as e:
            print(f"⚠️ Social generation failed: {e}")
            return SocialContent(
                caption=f"Check out what's happening in Bend today! {vibe} #InBend #BendOregon",
                sms=f"☕ {vibe}. See what's happening: gooddaybend.com"
            )


async def upload_draft_html(filename: str, html_content: str) -> str:
    """
    Upload draft HTML to Firebase Storage
    
    Args:
        filename: Name for the file
        html_content: HTML content
        
    Returns:
        Public URL of uploaded file
    """
    storage_client = storage.Client(project=PROJECT_ID)
    bucket = storage_client.bucket(STORAGE_BUCKET)
    
    blob = bucket.blob(f"drafts/{filename}")
    
    await asyncio.to_thread(
        blob.upload_from_string,
        html_content,
        content_type="text/html"
    )
    
    # Make publicly accessible (matches V6 behavior)
    await asyncio.to_thread(blob.make_public)
    
    # Use GCS public URL format (same as V6 — no auth required)
    url = f"https://storage.googleapis.com/{STORAGE_BUCKET}/drafts/{filename}"
    return url


async def publish_daily_article(
    target_date: Optional[datetime] = None
) -> Dict:
    """
    Main Publisher workflow
    
    Args:
        target_date: Date to publish for (defaults to today)
        
    Returns:
        Dict with draft URLs and metadata
    """
    print("💎 Publisher Agent Activated")
    print("=" * 60)
    
    # Initialize Firestore
    db = firestore.Client(project=PROJECT_ID)
    
    # Determine target date
    if target_date is None:
        from zoneinfo import ZoneInfo
        pacific = ZoneInfo("America/Los_Angeles")
        target_date = datetime.now(pacific).replace(tzinfo=None)
    
    date_str = target_date.strftime("%A, %B %d, %Y")
    iso_date = target_date.strftime("%Y-%m-%d")
    
    print(f"📅 Publishing for: {date_str}")
    
    # Step 1: Fetch events from Firestore
    print("\n📥 Fetching events...")
    events_ref = db.collection(COLLECTION_EVENTS).where("eventDate", "==", iso_date)
    events_snapshot = await asyncio.to_thread(events_ref.get)
    
    if not events_snapshot:
        print("⚠️ No events found! Run Scout first.")
        return {"error": "No events found"}
    
    events = [doc.to_dict() for doc in events_snapshot]
    print(f"✅ Found {len(events)} events")
    
    # Step 2: Strategy Analysis
    strategy_agent = StrategyAgent()
    vibe_data = await strategy_agent.analyze_events(events, date_str)
    
    # Step 3: Generate Article
    writer_agent = WriterAgent()
    article = await writer_agent.generate_article(vibe_data, events, date_str)
    
    # Step 4: Generate Social Content
    social_agent = SocialAgent()
    social = await social_agent.generate_social(vibe_data.vibe, vibe_data.headliners)
    
    # Step 4.5: Fetch Weekend Preview (Mon-Thu only)
    weekend_html = ""
    if should_include_weekend_preview(target_date):
        print("\n📅 Fetching weekend preview events...")
        weekend_events = await get_weekend_preview(db, target_date)
        if weekend_events:
            total_weekend = sum(len(e) for e in weekend_events.values())
            print(f"✅ Found {total_weekend} weekend events")
            weekend_html = generate_weekend_preview_html(weekend_events)
        else:
            print("ℹ️ No weekend events found")
    
    # Append weekend preview to article if available
    if weekend_html:
        article = ArticleContent(
            html=article.html + weekend_html,
            title=article.title
        )
        print("✅ Weekend preview section added to article")
    
    # Step 5: Generate Hero Image
    print("\n🎨 Generating hero image...")
    image_url = await generate_image_with_vision(
        topic=vibe_data.vibe,
        context=f"Daily update for Bend, Oregon featuring: {', '.join(vibe_data.headliners)}"
    )
    
    # 6. Generate Email Wrapper (High Fidelity)
    print("\n📧 Preparing newsletter draft...")
    email_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{article.title}</title>
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        /* Base Resets */
        body {{ margin: 0; padding: 0; font-family: 'Outfit', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; line-height: 1.6; }}
        a {{ color: #13ec5b; text-decoration: none; }}
        
        /* Typography - Enforcing Fonts */
        h1, h2, h3, h4 {{ font-family: 'Playfair Display', Georgia, serif; color: #0A1915; }}
        
        /* Container */
        .email-container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }}
        
        /* Hero */
        .hero-image {{
            width: 100%;
            height: auto;
            display: block;
            border-bottom: 5px solid #0A1915;
        }}
        
        /* Content Padding */
        .content-wrap {{ padding: 30px 25px; }}
        
        /* Header Pill */
        .header-pill {{
            text-align: center;
            margin-bottom: 25px;
        }}
        .pill-badge {{
            background-color: #13ec5b; 
            color: #0A1915;
            padding: 6px 16px;
            border-radius: 50px;
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            display: inline-block;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Hero Image -->
        <a href="https://gooddaybend.com">
            <img src="{image_url}" alt="{article.title}" class="hero-image">
        </a>
        
        <div class="content-wrap">
            <!-- Branding Pill -->
            <div class="header-pill">
                <span class="pill-badge">The Daily Pulse</span>
            </div>
            
            <!-- Main Content (Injected HTML) -->
            {article.html}
            
            <!-- Email Footer -->
            <div style="margin-top: 50px; padding-top: 30px; border-top: 2px solid #f1f5f9; text-align: center;">
                <p style="font-family: 'Playfair Display', serif; font-size: 1.2rem; margin-bottom: 10px; color: #0A1915;">Good Day Bend</p>
                <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 20px;">
                    Your daily pulse of the High Desert.
                </p>
                <p style="font-size: 0.85rem;">
                    <a href="{{{{unsubscribe_link}}}}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a> | 
                    <a href="https://gooddaybend.com" style="color: #94a3b8; text-decoration: underline;">View Online</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""

    # 7. Create Draft Previews (V6-Style with proper draft pages)
    print("\n💾 Creating draft previews...")
    
    draft_id = f"draft-{int(datetime.now().timestamp())}"
    FUNCTION_URL = "https://us-central1-good-day-bend-v6.cloudfunctions.net/main"
    ADMIN_EMAIL = "mdesautel@gmail.com"
    today_str = datetime.now().strftime("%A, %B %d, %Y")
    
    # A.1 Blog Draft HTML (with approval bar — matches V6 publisher)
    blog_draft_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Blog Draft: {article.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #0d1b12; font-size: 18px; }}
        h1 {{ font-family: 'Playfair Display', serif; letter-spacing: -0.02em; color: #0d1b12; line-height: 1.1; }}
        h2, h3 {{ font-family: 'Playfair Display', serif; color: #0d1b12; }}
        .prose p {{ font-size: 1.35rem; line-height: 1.9; color: #334155; margin-bottom: 2em; }}
        a {{ color: #13ec5b; text-decoration: underline; }}
        .action-bar {{ position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); display: flex; justify-content: center; gap: 20px; padding: 20px; border-top: 1px solid #e2e8f0; z-index: 50; }}
    </style>
</head>
<body class="pb-40">
    <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
        <span>Good Day Bend // V7 Draft</span>
        <span>{today_str}</span>
    </div>

    <main class="max-w-4xl mx-auto px-6 py-16">
        <div class="mb-16 text-center md:text-left">
            <span class="inline-block bg-[#13ec5b] text-[#0d1b12] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">Daily Pulse</span>
            <h1 class="text-5xl md:text-6xl font-bold mb-8 text-[#0d1b12] mt-4">{article.title}</h1>
            <img src="{image_url}" class="w-full h-auto rounded-3xl shadow-xl mb-4 border border-gray-100">
        </div>
        <div class="prose prose-xl max-w-none prose-headings:font-serif">
            {article.html}
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
    
    # A.2 Social Draft HTML (Instagram phone mockup — matches V6)
    social_draft_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Social Draft: {article.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>body {{ font-family: 'Inter', sans-serif; background-color: #F8FAFC; }}</style>
</head>
<body class="bg-slate-50 relative pb-40">
    <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
        <span>Good Day Bend // Social Draft</span>
        <span>{today_str}</span>
    </div>

    <div class="w-full max-w-4xl mx-auto pt-16 flex flex-col items-center">
        <div class="bg-white w-full max-w-[400px] rounded-[3rem] border-[8px] border-[#0d1b12] shadow-2xl overflow-hidden relative">
            <div class="border-b px-4 py-3 flex justify-between items-center">
                <span class="font-bold text-lg tracking-tight text-[#0d1b12]">gooddaybend</span>
            </div>
            <div class="aspect-square bg-gray-100 relative">
                <img src="{image_url}" class="w-full h-full object-cover"/>
            </div>
            <div class="p-4">
                <div class="font-semibold text-sm mb-2 text-[#0d1b12]">412 likes</div>
                <div class="text-sm">
                    <span class="font-semibold mr-1 text-[#0d1b12]">gooddaybend</span>
                    {social.caption.replace(chr(10), '<br>')}
                </div>
            </div>
        </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-5 flex justify-center gap-5 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <a href="{FUNCTION_URL}?type=review_action&action=keep&draftId={draft_id}" 
           class="px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 transition">
           📂 Keep as Draft
        </a>
        <a href="{FUNCTION_URL}?type=review_action&action=approve_social&draftId={draft_id}" 
           class="bg-[#13ec5b] text-[#0d1b12] px-8 py-3 rounded-full text-sm font-bold hover:bg-green-400 hover:scale-105 transition shadow-lg flex items-center gap-2">
           🚀 Approve & Publish
        </a>
    </div>
</body>
</html>"""
    
    # A.3 SMS Draft HTML (Phone mockup — matches V6)
    from urllib.parse import quote
    sms_draft_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SMS Draft: {article.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>body {{ font-family: 'Inter', sans-serif; background-color: #F8FAFC; }}</style>
</head>
<body class="bg-slate-50 relative pb-40">
    <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
        <span>Good Day Bend // SMS Draft</span>
        <span>{today_str}</span>
    </div>

    <div class="max-w-2xl mx-auto pt-16 px-6">
        <h1 class="text-3xl font-bold text-[#0d1b12] mb-8">📲 SMS Broadcast Preview</h1>
        
        <div class="bg-gray-900 rounded-3xl p-4 max-w-sm mx-auto shadow-2xl">
            <div class="bg-[#13ec5b] rounded-2xl p-4">
                <div class="text-[#0d1b12] text-sm font-medium mb-1">Good Day Bend</div>
                <div class="text-[#0d1b12] text-base leading-relaxed">{social.sms}</div>
                <div class="text-[#0d1b12]/60 text-xs mt-2">Now</div>
            </div>
        </div>

        <div class="mt-8 text-center text-gray-500 text-sm">
            Character count: <span class="font-bold">{len(social.sms)}</span>/160
        </div>

        <div class="mt-8 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
            <h3 class="font-bold text-yellow-800 mb-2">⚠️ Workflow Required</h3>
            <p class="text-yellow-700 text-sm">To send this SMS to your list, create a workflow in GHL:</p>
            <ol class="text-yellow-700 text-sm mt-2 ml-4 list-decimal">
                <li>Go to Automation > Workflows</li>
                <li>Create "SMS Daily Broadcast" workflow</li>
                <li>Add trigger: "Manual/API Trigger"</li>
                <li>Add action: "Send SMS" to your subscriber list</li>
            </ol>
        </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-5 flex justify-center gap-5 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <a href="{FUNCTION_URL}?type=review_action&action=keep&draftId={draft_id}-sms" 
           class="px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 transition">
           📂 Keep as Draft
        </a>
        <a href="{FUNCTION_URL}?type=sms_broadcast&draftId={draft_id}&message={quote(social.sms)}" 
           class="bg-[#13ec5b] text-[#0d1b12] px-8 py-3 rounded-full text-sm font-bold hover:bg-green-400 hover:scale-105 transition shadow-lg flex items-center gap-2">
           🚀 Approve & Send SMS
        </a>
    </div>
</body>
</html>"""
    
    # Upload all drafts to Storage
    blog_url = await upload_draft_html(f"blog-draft-{draft_id}.html", blog_draft_html)
    social_url = await upload_draft_html(f"social-draft-{draft_id}.html", social_draft_html)
    sms_url = await upload_draft_html(f"sms-draft-{draft_id}.html", sms_draft_html)
    
    print(f"✅ Blog draft: {blog_url}")
    print(f"✅ Social draft: {social_url}")
    print(f"✅ SMS draft: {sms_url}")
    
    # Step 7b: Save draft metadata to Firestore
    await asyncio.to_thread(
        db.collection(COLLECTION_DRAFTS).document(draft_id).set,
        {
            "title": article.title,
            "rawHTML": article.html,
            "socialCaption": social.caption,
            "smsText": social.sms,
            "imageUrl": image_url,
            "publishDate": iso_date,
            "vibe": vibe_data.vibe,
            "status": "pending",
            "type": "daily_update",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "generatedBy": "publisher_v7",
            "draftUrl": blog_url
        }
    )
    print(f"💾 Saved draft to drafts/{draft_id} (status: pending)")
    
    # Step 7c: Generate Trend Blog (Merged Flow — matches V6 pattern)
    print("\n🧩 Sub-Process: Running Trend Blog V7...")
    trend_data = None
    try:
        from agent.trend_blog import publish_trend_blog
        trend_data = await publish_trend_blog(send_email=False)
        if trend_data and not trend_data.get("skipped"):
            print(f"✅ Trend Blog generated: {trend_data.get('title', 'N/A')}")
        else:
            print(f"ℹ️ Trend Blog skipped: {trend_data.get('reason', 'unknown')}")
            trend_data = None
    except Exception as e:
        print(f"⚠️ Trend Blog Sub-Process failed: {e}")
    
    # Step 8: Send Unified Approval Email (matches V6 format)
    print("\n📧 Sending Unified Approval Email...")
    try:
        # Build optional Trend Blog Link HTML
        trend_link_html = ""
        if trend_data:
            trend_link_html = f'<li><a href="{trend_data.get("url", trend_data.get("draft_url", ""))}" style="font-size:18px; font-weight:bold; color:#0d1b12;">✨ Review Trend Blog Draft: {trend_data.get("title", "Trend Blog")}</a></li>'
        
        # Feedback stars (Learning Loop)
        feedback_url = f"{FUNCTION_URL}?type=feedback"
        stars = "".join([
            f'<a href="{feedback_url}&rating={score}" style="text-decoration:none; font-size:24px; margin:0 5px;">{"⭐" if score >= 4 else "☆"}</a>'
            for score in range(1, 6)
        ])
        
        email_subject = f"[REVIEW] Daily Update: {vibe_data.vibe}"
        email_body = f"""
    <div style="font-family: sans-serif; color: #333;">
        <h1>Good Day Bend Daily Approval</h1>
        <p><strong>Topic:</strong> {vibe_data.vibe}</p>
        <hr style="border:0; border-top:1px solid #111; margin:20px 0;">
        
        <h2>🔎 Review Drafts (Premium 2025 Edition)</h2>
        <ul>
            <li><a href="{blog_url}" style="font-size:18px; font-weight:bold; color:#0d1b12;">📄 Review Daily Update Post Draft</a></li>
            <li><a href="{social_url}" style="font-size:18px; font-weight:bold; color:#0d1b12;">📱 Review Social Media Draft</a></li>
            {trend_link_html}
        </ul>
        
        <div style="margin: 30px 0;">
            <p>If good, click "Approve" inside each Draft.</p>
        </div>
        
        <img src="{image_url}" width="300" style="border-radius:12px; margin-top:20px; border:1px solid #eee;"/>
    </div>
        """
        
        ghl = GHLClient()
        contact_id = ghl.upsert_contact(ADMIN_EMAIL, first_name="MJ", last_name="Owner", tags=["admin", "approver"])
        if contact_id:
            ghl.send_email(contact_id, email_subject, email_body)
            print(f"✅ Unified approval email sent to {ADMIN_EMAIL}")
        else:
            print("⚠️ Could not get GHL contact. Email skipped.")
    except Exception as e:
        print(f"❌ Email failed: {e}")
    
    print("\n✅ Publisher Complete!")
    print("=" * 60)
    
    return {
        "draft_id": draft_id,
        "blog_url": blog_url,
        "social_url": social_url,
        "sms_url": sms_url,
        "vibe": vibe_data.vibe,
        "image_url": image_url
    }


def create_blog_draft_html(
    title: str,
    vibe: str,
    date_str: str,
    image_url: str,
    html_content: str,
    draft_id: str
) -> str:
    """Create blog draft HTML preview (v6 style)"""
    
    function_url = "https://us-central1-good-day-bend-v6.cloudfunctions.net/main"
    
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Blog Draft: {title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Outfit', sans-serif; background-color: #F8FAFC; color: #0d1b12; font-size: 18px; }}
        h1, h2, h3 {{ font-family: 'Playfair Display', serif; color: #0d1b12; }}
        .prose p {{ font-size: 1.35rem; line-height: 1.9; color: #334155; margin-bottom: 2em; }}
        a {{ color: #13ec5b; text-decoration: underline; }}
        .action-bar {{ position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); display: flex; justify-content: center; gap: 20px; padding: 20px; border-top: 1px solid #e2e8f0; z-index: 50; }}
    </style>
</head>
<body class="pb-40">
    <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
        <span>Good Day Bend // v7 Draft</span>
        <span>{date_str}</span>
    </div>

    <main class="max-w-4xl mx-auto px-6 py-16">
        <div class="mb-16 text-center md:text-left">
            <span class="inline-block bg-[#13ec5b] text-[#0d1b12] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">Daily Pulse</span>
            <h1 class="text-5xl md:text-6xl font-bold mb-8 text-[#0d1b12] mt-4">{title}</h1>
            <img src="{image_url}" class="w-full h-auto rounded-3xl shadow-xl mb-4 border border-gray-100">
        </div>
        
        <div class="prose prose-xl max-w-none prose-headings:font-serif">
            {html_content}
        </div>
    </main>

    <div class="action-bar">
        <a href="{function_url}?type=review_action&action=keep&draftId={draft_id}" 
           class="px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 transition">
           📂 Keep as Draft
        </a>
        <a href="{function_url}?type=review_action&action=approve&draftId={draft_id}" 
           class="bg-[#13ec5b] text-[#0d1b12] px-8 py-3 rounded-full text-sm font-bold hover:bg-green-400 hover:scale-105 transition shadow-lg flex items-center gap-2">
           🚀 Approve & Publish
        </a>
    </div>
</body>
</html>
"""


def create_social_draft_html(
    title: str,
    date_str: str,
    image_url: str,
    caption: str,
    draft_id: str
) -> str:
    """Create social draft HTML preview (v6 Instagram mockup style)"""
    
    function_url = "https://us-central1-good-day-bend-v6.cloudfunctions.net/main"
    
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Social Draft: {title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>body {{ font-family: 'Inter', sans-serif; background-color: #F8FAFC; }}</style>
</head>
<body class="bg-slate-50 relative pb-40">
    <div class="bg-[#0d1b12] text-[#13ec5b] px-6 py-4 text-sm font-bold tracking-widest uppercase flex justify-between items-center sticky top-0 z-40 shadow-md">
        <span>Good Day Bend // Social Draft</span>
        <span>{date_str}</span>
    </div>

    <div class="w-full max-w-4xl mx-auto pt-16 flex flex-col items-center">
        <div class="bg-white w-full max-w-[400px] rounded-[3rem] border-[8px] border-[#0d1b12] shadow-2xl overflow-hidden relative">
            <div class="border-b px-4 py-3 flex justify-between items-center">
                <span class="font-bold text-lg tracking-tight text-[#0d1b12]">gooddaybend</span>
            </div>
            
            <div class="aspect-square bg-gray-100 relative">
                <img src="{image_url}" class="w-full h-full object-cover"/>
            </div>
            
            <div class="p-4">
                <div class="font-semibold text-sm mb-2 text-[#0d1b12]">412 likes</div>
                <div class="text-sm">
                    <span class="font-semibold mr-1 text-[#0d1b12]">gooddaybend</span>
                    {caption.replace(chr(10), '<br>')}
                </div>
            </div>
        </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-5 flex justify-center gap-5 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <a href="{function_url}?type=review_action&action=keep&draftId={draft_id}" 
           class="px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 transition">
           📂 Keep as Draft
        </a>
        <a href="{function_url}?type=review_action&action=approve&draftId={draft_id}" 
           class="bg-[#13ec5b] text-[#0d1b12] px-8 py-3 rounded-full text-sm font-bold hover:bg-green-400 hover:scale-105 transition shadow-lg flex items-center gap-2">
           🚀 Approve & Publish
        </a>
    </div>
</body>
</html>
"""


# CLI entry point
async def main():
    """Test the publisher agent"""
    import sys
    
    if len(sys.argv) > 1:
        target_date_str = sys.argv[1]
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    else:
        target_date = None
    
    result = await publish_daily_article(target_date)
    
    if "error" not in result:
        print("\n📊 Summary:")
        print(f"  Vibe: {result['vibe']}")
        print(f"  Blog: {result['blog_url']}")
        print(f"  Social: {result['social_url']}")


if __name__ == "__main__":
    asyncio.run(main())
