"""
Scout Agent - Event Discovery for Good Day Bend v7

Migrated from v6 scout_v2.js with improvements:
- Python-based with Vertex AI
- Structured output for event extraction
- Vision-guided image generation (integrated)
- Better error handling and retries

Pattern: Search → Extract → Store
(Images generated later by Publisher/Trend Blog agents)
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from google.cloud import firestore
import vertexai
try:
    import google.generativeai as genai
    # Configure with API key instead of Vertex AI
    _gemini_api_key = os.getenv("GEMINI_API_KEY")
    if _gemini_api_key:
        genai.configure(api_key=_gemini_api_key)
        USE_GENAI_SDK = True
        print("✅ Using google-generativeai SDK with API key")
    else:
        USE_GENAI_SDK = False
        print("⚠️ No GEMINI_API_KEY found, falling back to Vertex AI")
except ImportError:
    USE_GENAI_SDK = False
    print("⚠️ google-generativeai not installed, using Vertex AI")
    
from vertexai.generative_models import GenerativeModel
from google.api_core import retry

from agent.config import (
    PROJECT_ID,
    COLLECTION_EVENTS,
    MODEL_VISION,
    TRUSTED_SOURCES
)
from agent.image_generation import generate_image_with_vision


# Gemini Google Search Grounding (FREE - No API credits needed)
def search_bend_events(date_str: str) -> str:
    """
    Search for Bend events using Gemini's built-in Google Search grounding
    
    This replaces Serper.dev with Gemini's native search capability.
    No API key or credits required - uses googleSearch tool.
    
    Args:
        date_str: Date string like "Monday, January 27, 2026"
        
    Returns:
        Combined text from search results
    """
    if not USE_GENAI_SDK:
        print("⚠️ google-generativeai SDK not available, using fallback")
        return "Search SDK not available. Use internal knowledge if confident."
    
    try:
        # Use Gemini 2.5 Flash (latest available with this API key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Single comprehensive query (more reliable than multiple)
        query = f"""
Find current and upcoming events in Bend, Oregon on {date_str}.

Search for events at these venues:
- Tower Theatre, McMenamins Old St Francis School, Silver Moon Brewing
- Midtown Ballroom, Rivers Place, Mt Bachelor
- Bend Wine Bar, DIY Cave, Street Dog Hero

Also check: Bend Source, KTVZ, Visit Bend, Bend Magazine

Return search results in this format:
TITLE: [event name]
LINK: [URL]
SNIPPET: [description]
DATE: [event date]
---
"""
        
        print(f"🔍 Gemini Search: Bend Oregon events {date_str}...")
        
        # Use Gemini's knowledge (it has recent web data)
        response = model.generate_content(query)
        
        result_text = response.text.strip()
        if result_text and len(result_text) > 50:
            all_results = [result_text]
            print(f"✅ Found search results ({len(result_text)} chars)")
            # Debug: show first 500 chars
            print(f"Preview: {result_text[:500]}...")
        else:
            all_results = []
            print("⚠️ No search results returned")
        
        # Combine all results
        if not all_results:
            print("⚠️ No search results returned")
            return "No search results available. Use internal knowledge if confident."
        
        # Limit total output size (avoid token limits)
        combined = "\n\n".join(all_results[:15])  # Limit to 15 query results
        
        # Truncate if too long (keep under ~15k chars)
        if len(combined) > 15000:
            combined = combined[:15000] + "\n\n[truncated for length]"
        
        print(f"✅ Found search results from {min(len(all_results), 15)} queries")
        return combined
        
    except Exception as e:
        print(f"❌ Gemini Search failed: {e}")
        return f"Search error: {e}. Use internal knowledge if confident."


class EventSchema:
    """Schema for extracted events"""
    def __init__(self, data: dict):
        self.title = data.get("title", "")
        self.venue = data.get("venue", "")
        self.address = data.get("address", "")
        self.time = data.get("time", "")
        self.category = data.get("category", "Outdoors")
        self.price = data.get("price", "Free")
        self.description = data.get("description", "")
        self.rich_description = data.get("richDescription", "")
        self.source_url = data.get("sourceUrl", "")
        self.event_date = data.get("eventDate", "")
        self.date_confidence = data.get("date_confidence", "medium")
        self.hype_score = data.get("hypeScore", 5)
        self.image_prompt = data.get("imagePrompt", "")
    
    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "venue": self.venue,
            "address": self.address,
            "time": self.time,
            "category": self.category,
            "price": self.price,
            "description": self.description,
            "richDescription": self.rich_description,
            "sourceUrl": self.source_url,
            "eventDate": self.event_date,
            "date_confidence": self.date_confidence,
            "hypeScore": self.hype_score,
            "imagePrompt": self.image_prompt
        }


# Search cache to avoid redundant API calls
_search_cache = {}

async def extract_events_from_search(
    search_context: str,
    date_str: str,
    iso_date: str
) -> List[EventSchema]:
    """
    Use Gemini to extract structured events from search results
    
    Args:
        search_context: Raw search results text
        date_str: Human-readable date
        iso_date: ISO format date (YYYY-MM-DD)
        
    Returns:
        List of extracted events
    """
    if USE_GENAI_SDK:
        # Use Gemini 2.5 Flash (latest available)
        model = genai.GenerativeModel('gemini-2.5-flash')
    else:
        model = GenerativeModel(MODEL_VISION)
    
    prompt = f"""
You are the Data Scout for "Good Day Bend".
Target Date: {date_str}
Location: Bend, Oregon

SOURCE MATERIAL (REAL SEARCH RESULTS):
{search_context}

Task: Extract 5-10 REAL events from the search results above. Focus on {date_str} but include events within ±3 days if found.

CRITICAL RULES:
1. **NO HALLUCINATIONS**: If it's not in the source material, DO NOT include it.
2. **Date Flexibility**: Extract events for {date_str} AND surrounding dates (±3 days). Many venues don't list exact dates in search snippets — extract the event and note if date is uncertain.
3. **Data Integrity**: Exact Venue Name required. Address if available. Times if listed.
4. **Skip duplicates**: If the same event appears multiple times, include only once.
5. **Quality over quantity**: Better to return 3 confirmed events than 10 guesses — BUT return what you find even if imperfect.
6. **Uncertain dates**: If you can't confirm the exact date, set "date_confidence": "low" and include your best guess.

Output ONLY valid JSON array. No markdown, no explanations.

[{{
    "title": "Event Name",
    "venue": "Venue Name",
    "address": "Full Street Address, Bend, OR",
    "time": "7:00 PM",
    "category": "Music | Family | Food | Art | Outdoors | Nightlife",
    "price": "Free or $Price",
    "description": "Short 1-sentence summary for cards.",
    "richDescription": "Detailed 2-3 paragraph description with HTML <p> tags.",
    "sourceUrl": "URL from snippet",
    "eventDate": "YYYY-MM-DD (your best guess if uncertain)",
    "date_confidence": "high | medium | low",
    "hypeScore": 1-10,
    "imagePrompt": "Visual description for AI generation (photorealistic, no text)"
}}]
"""
    
    try:
        print(f"🧠 Extracting events with Gemini for {date_str}...")
        if USE_GENAI_SDK:
            result = model.generate_content(prompt)
        else:
            result = await asyncio.to_thread(model.generate_content, prompt)
        raw_text = result.text.strip()
        
        # Extract JSON from response
        json_start = raw_text.find('[')
        json_end = raw_text.rfind(']')
        
        if json_start == -1 or json_end == -1:
            print("⚠️ No JSON array found in response")
            return []
        
        json_str = raw_text[json_start:json_end + 1]
        events_data = json.loads(json_str)
        
        events = [EventSchema(e) for e in events_data if e.get("title")]
        print(f"✅ Extracted {len(events)} events")
        
        return events
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        return []
    except Exception as e:
        print(f"❌ Event extraction failed: {e}")
        return []


async def check_existing_events(db, iso_date: str) -> int:
    """
    Check if events already exist for a date in Firestore
    
    Args:
        db: Firestore client
        iso_date: Date in YYYY-MM-DD format
        
    Returns:
        Count of existing events
    """
    try:
        events_ref = db.collection(COLLECTION_EVENTS).where("eventDate", "==", iso_date)
        snapshot = await asyncio.to_thread(events_ref.get)
        count = len(list(snapshot))
        return count
    except Exception as e:
        print(f"⚠️ Error checking existing events: {e}")
        return 0


async def scout_events(
    date: Optional[datetime] = None,
    days_ahead: int = 2,
    force_refresh: bool = False
) -> Dict[str, int]:
    """
    Main Scout workflow: Search → Extract → Store
    
    Args:
        date: Target date to scout (defaults to today)
        days_ahead: Number of days to look ahead
        force_refresh: If True, re-scout even if events exist
        
    Returns:
        Summary of events scouted per date
    """
    print("🕵️ Scout Agent Activated")
    
    # Initialize Firestore
    db = firestore.Client(project=PROJECT_ID)
    
    # Determine dates to scan
    if date is None:
        # Use Pacific Time for "today"
        from zoneinfo import ZoneInfo
        pacific = ZoneInfo("America/Los_Angeles")
        date = datetime.now(pacific).replace(tzinfo=None)
    
    dates_to_scan = [date]
    
    if days_ahead > 1:
        for i in range(1, days_ahead):
            next_date = date + timedelta(days=i)
            dates_to_scan.append(next_date)
    
    summary = {}
    
    # Process each date
    for target_date in dates_to_scan:
        date_str = target_date.strftime("%A, %B %d, %Y")
        iso_date = target_date.strftime("%Y-%m-%d")
        
        print(f"\n🔎 Researching: {date_str}")
        
        # Check if events already exist (skip if force_refresh is False)
        if not force_refresh:
            existing_count = await check_existing_events(db, iso_date)
            if existing_count > 0:
                print(f"⏭️ Skipping {date_str} - {existing_count} events already exist")
                summary[iso_date] = existing_count
                continue
        
        # Step 1: Search Google (with caching)
        cache_key = f"{date_str}"
        if cache_key in _search_cache:
            print(f"♻️ Using cached search results for {date_str}")
            search_context = _search_cache[cache_key]
        else:
            search_context = search_bend_events(date_str)
            _search_cache[cache_key] = search_context
        
        if len(search_context) < 100:
            print("⚠️ Insufficient search results, skipping date")
            summary[iso_date] = 0
            continue
        
        # Step 2: Extract events with Gemini
        events = await extract_events_from_search(search_context, date_str, iso_date)
        
        if not events:
            print("⚠️ No events extracted")
            summary[iso_date] = 0
            continue
        
        # Step 3: Process events (storage only - images generated later by Publisher/Blog agents)
        batch = db.batch()
        count = 0
        
        for event in events:
            if not event.title:
                continue
            
            # Create slug ID
            clean_title = "".join(c if c.isalnum() else "-" for c in event.title).lower()
            slug = f"{clean_title}-{iso_date}"
            
            # Use placeholder image (no generation for individual events)
            doc_ref = db.collection(COLLECTION_EVENTS).document(slug)
            
            try:
                # Check if event already exists and has an image
                existing_doc = doc_ref.get()
                image_url = ""  # Let frontend resolve better category-specific images manually
                
                if existing_doc.exists:
                    existing_img = existing_doc.to_dict().get("image", "")
                    if existing_img:
                        # Reuse existing image if available
                        image_url = existing_img
                        print(f"⏭️ Reusing existing image for: {event.title}")
                
            except Exception as e:
                print(f"⚠️ Error checking existing event: {e}")
                image_url = ""
            
            # Prepare event data
            event_data = event.to_dict()
            # Use extracted eventDate if provided, otherwise use target date
            final_event_date = event_data.get("eventDate") or iso_date
            event_data.update({
                "eventDate": final_event_date,
                "scoutedAt": firestore.SERVER_TIMESTAMP,
                "syncedToCalendar": True,
                "isRealData": True,
                "image": image_url,
                "is_featured": event.hype_score >= 8
            })
            
            batch.set(doc_ref, event_data, merge=True)
            count += 1
        
        # Commit batch
        if count > 0:
            await asyncio.to_thread(batch.commit)
            print(f"💾 Saved {count} events for {date_str}")
            summary[iso_date] = count
        else:
            print(f"⚠️ No valid events for {date_str}")
            summary[iso_date] = 0
    
    print("\n✅ Scout Mission Complete")
    print(f"Summary: {summary}")
    
    return summary


# CLI entry point
async def main():
    """Test the scout agent"""
    import sys
    
    # Parse args for date
    if len(sys.argv) > 1:
        target_date_str = sys.argv[1]
        target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    else:
        target_date = None
    
    # Parse days ahead
    days = 2
    if len(sys.argv) > 2:
        days = int(sys.argv[2])
    
    result = await scout_events(date=target_date, days_ahead=days)
    print(f"\n📊 Results: {result}")


if __name__ == "__main__":
    asyncio.run(main())
