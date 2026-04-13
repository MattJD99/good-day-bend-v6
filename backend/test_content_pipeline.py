#!/usr/bin/env python3
"""
Good Day Bend v7 - Content Pipeline Test Runner

Tests the full integration:
1. Event scraping with Tavily + Serper + Gemini
2. Calendar events in GHL
3. Blog draft creation in GHL
4. Social media post drafts in GHL

Run: python3 test_content_pipeline.py
"""

import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

load_dotenv()

from agent.event_scraper_enhanced import run_event_scraper
from agent.ghl import GHLClient


def test_event_scraper():
    """Test the enhanced event scraper"""
    print("\n" + "=" * 70)
    print("🎯 STEP 1: Event Scraping with Tavily + Serper + Gemini")
    print("=" * 70)
    
    result = run_event_scraper()
    
    if result.get("status") == "success":
        print(f"✅ Event scraping complete: {result['count']} events found")
        return result
    else:
        print(f"❌ Event scraping failed: {result.get('error', 'Unknown error')}")
        return None


def load_scraped_events():
    """Load the latest scraped events"""
    output_dir = backend_dir / "output" / "events"
    latest_file = output_dir / "events_latest.json"
    
    if not latest_file.exists():
        print("⚠️ No events_latest.json found")
        return []
    
    with open(latest_file, 'r') as f:
        data = json.load(f)
    
    events = data.get("events", [])
    print(f"📦 Loaded {len(events)} events from {latest_file}")
    return events


def test_calendar_events(ghl: GHLClient, events: list):
    """Create calendar events in GHL from scraped events"""
    print("\n" + "=" * 70)
    print("📅 STEP 2: Creating Calendar Events in GHL")
    print("=" * 70)
    
    if not events:
        print("⚠️ No events to create")
        return []
    
    # Get available calendars first
    calendars = ghl.get_calendars()
    calendar_id = None
    if calendars:
        calendar_id = calendars[0].get("id")
        print(f"📅 Using calendar: {calendars[0].get('name')}")
    
    created_events = []
    
    # Create up to 5 events as examples
    for event in events[:5]:
        title = event.get("title", "Untitled Event")
        description = event.get("description", "")
        venue = event.get("venue_name", "")
        url = event.get("url", "")
        
        if description and url:
            description += f"\n\nMore info: {url}"
        
        # Parse start date
        start_date_str = event.get("start_date", "")
        try:
            if start_date_str:
                start_time = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            else:
                start_time = datetime.now() + timedelta(days=1, hours=18)
        except Exception as e:
            print(f"⚠️ Could not parse date for '{title}': {e}")
            start_time = datetime.now() + timedelta(days=1, hours=18)
        
        # End time (default 2 hours)
        end_time = start_time + timedelta(hours=2)
        
        print(f"\n📍 Creating: {title}")
        event_id = ghl.create_calendar_event(
            title=title,
            description=description,
            start_time=start_time,
            end_time=end_time,
            location=venue,
            calendar_id=calendar_id
        )
        
        if event_id:
            created_events.append({
                "title": title,
                "ghl_id": event_id
            })
    
    print(f"\n✅ Created {len(created_events)} calendar events in GHL")
    return created_events


def test_blog_draft(ghl: GHLClient, events: list):
    """Create a blog draft in GHL from scraped events"""
    print("\n" + "=" * 70)
    print("📝 STEP 3: Creating Blog Draft in GHL")
    print("=" * 70)
    
    if not events:
        print("⚠️ No events for blog post")
        return None
    
    # Get blog sites
    blog_sites = ghl.get_blog_sites()
    if not blog_sites:
        print("⚠️ No blog sites configured in GHL")
        print("💡 Tip: Create a blog site in GHL (Sites → Add Blog Site)")
        return None
    
    # Generate blog content from events
    today = datetime.now()
    date_str = today.strftime("%A, %B %d, %Y")
    
    # Pick top 5 events
    top_events = events[:5]
    
    # Build HTML content
    html_content = f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #2c5282; border-bottom: 3px solid #4299e1; padding-bottom: 10px;">
        Today in Bend: {date_str}
    </h1>
    
    <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">
        Here are today's top events happening in Bend, Oregon. From live music to 
        community gatherings, there's something for everyone!
    </p>
    
    <h2 style="color: #2d3748; margin-top: 30px;">🎯 Featured Events</h2>
"""
    
    for i, event in enumerate(top_events, 1):
        title = event.get("title", "Event")
        description = event.get("description", "")
        venue = event.get("venue_name", "TBD")
        url = event.get("url", "")
        start_date = event.get("start_date", "")
        cost = event.get("cost", "Unknown")
        
        html_content += f"""
    <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #2c5282; margin: 0 0 10px 0;">{i}. {title}</h3>
        <p style="color: #4a5568; margin: 5px 0;"><strong>📍 Venue:</strong> {venue}</p>
        <p style="color: #4a5568; margin: 5px 0;"><strong>📅 When:</strong> {start_date or "TBD"}</p>
        <p style="color: #4a5568; margin: 5px 0;"><strong>💰 Cost:</strong> {cost}</p>
        <p style="color: #718096; margin: 10px 0 0 0; font-style: italic;">{description}</p>
        {f'<p style="margin: 10px 0 0 0;"><a href="{url}" style="color: #4299e1; text-decoration: none;">Learn More →</a></p>' if url else ''}
    </div>
"""
    
    html_content += """
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center;">
        <p style="color: #718096; font-size: 14px;">
            Want more Bend events? Follow us for daily updates!
        </p>
    </div>
</div>
"""
    
    # Generate title
    blog_title = f"Today in Bend: Top Events for {date_str}"
    
    # Create slug
    slug = f"today-in-bend-{today.strftime('%Y-%m-%d')}"
    
    print(f"\n📝 Creating blog draft: {blog_title}")
    
    blog_id = ghl.create_blog_post(
        title=blog_title,
        content=html_content,
        status="draft",
        slug=slug,
        tags=["events", "bend", "oregon", "things-to-do"],
        categories=["Local Events"],
        meta_description=f"Discover the best events in Bend, Oregon for {date_str}. Live music, community events, and more!"
    )
    
    if blog_id:
        print(f"✅ Blog draft created successfully!")
        return {"id": blog_id, "title": blog_title, "slug": slug}
    else:
        print("❌ Failed to create blog draft")
        return None


def test_social_posts(ghl: GHLClient, events: list):
    """Create social media post drafts in GHL"""
    print("\n" + "=" * 70)
    print("📱 STEP 4: Creating Social Media Post Drafts in GHL")
    print("=" * 70)
    
    if not events:
        print("⚠️ No events for social posts")
        return []
    
    # Get social accounts
    social_accounts = ghl.get_social_accounts()
    if not social_accounts:
        print("⚠️ No social media accounts connected in GHL")
        print("💡 Tip: Connect social accounts in GHL (Marketing → Social Media)")
        return []
    
    created_posts = []
    
    # Create social posts for top 3 events
    for event in events[:3]:
        title = event.get("title", "Event")
        venue = event.get("venue_name", "")
        start_date = event.get("start_date", "")
        url = event.get("url", "")
        
        # Generate caption
        caption = f"""🎯 Happening in Bend: {title}!

📍 {venue}
📅 {start_date or "Check link for details"}

{f"🔗 {url}" if url else ""}

#BendOregon #CentralOregon #ThingsToDoInBend #BendEvents"""
        
        # Schedule for tomorrow at 9 AM
        scheduled_time = datetime.now() + timedelta(days=1, hour=9, minute=0)
        
        print(f"\n📱 Creating social post draft: {title}")
        
        # Note: This would need actual images, so we'll skip the image upload for now
        # and just create a text-only post
        post_id = ghl.create_social_post(
            slides=[],  # Empty for now - would need actual images
            caption=caption,
            scheduled_time=scheduled_time,
            platforms=["facebook", "instagram"]
        )
        
        if post_id:
            created_posts.append({
                "title": title,
                "ghl_id": post_id
            })
    
    if created_posts:
        print(f"\n✅ Created {len(created_posts)} social media post drafts")
    else:
        print("\n⚠️ No posts created (may need images or connected accounts)")
    
    return created_posts


def print_summary(calendar_events, blog, social_posts):
    """Print a summary of what was created"""
    print("\n" + "=" * 70)
    print("📊 PIPELINE TEST SUMMARY")
    print("=" * 70)
    
    print(f"\n✅ Calendar Events Created: {len(calendar_events)}")
    for event in calendar_events:
        print(f"   • {event['title']}")
    
    if blog:
        print(f"\n✅ Blog Draft Created: {blog['title']}")
    else:
        print(f"\n⚠️ Blog Draft: Not created (check blog site configuration)")
    
    print(f"\n✅ Social Post Drafts: {len(social_posts)}")
    for post in social_posts:
        print(f"   • {post['title']}")
    
    print("\n" + "=" * 70)
    print("🎉 Pipeline test complete!")
    print("=" * 70)
    print("\n💡 Next steps:")
    print("   1. Review calendar events in GHL")
    print("   2. Edit and publish the blog draft")
    print("   3. Add images to social posts and schedule")
    print("")


def main():
    """Run the full pipeline test"""
    print("\n" + "=" * 70)
    print("🚀 GOOD DAY BEND V7 - CONTENT PIPELINE TEST")
    print("=" * 70)
    print(f"📅 Running at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("")
    
    # Check API keys
    print("🔑 Checking API keys...")
    serper_key = os.getenv("SERPER_API_KEY")
    tavily_key = os.getenv("TAVILY_API_KEY")
    ghl_key = os.getenv("GHL_API_KEY")
    
    if not serper_key:
        print("⚠️ SERPER_API_KEY not set - Google Search scraping disabled")
    else:
        print("✅ SERPER_API_KEY configured")
    
    if not tavily_key:
        print("⚠️ TAVILY_API_KEY not set - Venue scraping disabled")
    else:
        print("✅ TAVILY_API_KEY configured")
    
    if not ghl_key or ghl_key == "your_ghl_jwt_token_here":
        print("⚠️ GHL_API_KEY not configured - GHL integration will mock/skip")
    else:
        print("✅ GHL_API_KEY configured")
    
    print("")
    
    # Step 1: Scrape events
    scrape_result = test_event_scraper()
    events = load_scraped_events() if scrape_result else []
    
    # Initialize GHL client
    ghl = GHLClient()
    
    # Step 2: Create calendar events
    calendar_events = test_calendar_events(ghl, events)
    
    # Step 3: Create blog draft
    blog = test_blog_draft(ghl, events)
    
    # Step 4: Create social posts
    social_posts = test_social_posts(ghl, events)
    
    # Print summary
    print_summary(calendar_events, blog, social_posts)
    
    return {
        "events_scraped": len(events),
        "calendar_events": len(calendar_events),
        "blog_created": blog is not None,
        "social_posts": len(social_posts)
    }


if __name__ == "__main__":
    result = main()
    sys.exit(0 if result["events_scraped"] > 0 else 1)
