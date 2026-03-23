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
from google.cloud import firestore
import vertexai
from vertexai.generative_models import GenerativeModel
from google.api_core import retry

from agent.config import (
    PROJECT_ID,
    COLLECTION_EVENTS,
    MODEL_VISION,
    TRUSTED_SOURCES
)
from agent.image_generation import generate_image_with_vision


# Serper.dev Search integration (from v6)
def search_bend_events(date_str: str) -> str:
    """
    Search for Bend events using Serper.dev API (from v6)
    
    Args:
        date_str: Date string like "Monday, January 27, 2026"
        
    Returns:
        Combined text from search results
    """
    SERPER_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")  # Using this env var for Serper
    
    if not SERPER_API_KEY:
        print("⚠️ Serper API not configured, using fallback")
        return "Search API not available. Use internal knowledge if confident."
    
    try:
        import requests
        
        # Multiple targeted queries (like v6)
        # 1. Targeted Venue Searches (High Quality)
        site_queries = [
            f"site:towertheatre.org events {date_str}",
            f"site:mcmenamins.com 'Old St. Francis School' {date_str}",  # Filter for OSF location
            f"site:silvermoonbrewing.com events {date_str}",
            f"site:midtownballroom.com {date_str}",
            f"site:riversplacebend.com {date_str}",
            f"site:mtbachelor.com events {date_str}",
            f"site:bendwinebar.com {date_str}",
            f"site:diycave.com {date_str}",
            f"site:streetdoghero.org -portland events {date_str}"  # Exclude Portland
        ]
        
        # 2. Major Local Aggregators (Broad Coverage)
        aggregator_queries = [
            f"site:bendsource.com calendar {date_str}",
            f"site:ktvz.com events {date_str}",
            f"site:bendmagazine.com events {date_str}",
            f"site:centraloregondaily.com events {date_str}",
            f"site:visitbend.com events {date_str}"
        ]
        
        # 3. General catch-all (Backup)
        general_queries = [
            f"events in Bend Oregon on {date_str}",
            f"live music Bend Oregon {date_str}"
        ]
        
        queries = site_queries + aggregator_queries + general_queries
        
        all_results = []
        
        for query in queries:
            print(f"🔍 Serper search: {query}")
            
            response = requests.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "q": query,
                    "num": 10
                },
                timeout=15
            )
            
            response.raise_for_status()
            data = response.json()
            
            # Extract organic results
            results = data.get("organic", [])
            all_results.extend(results)
        
        # Deduplicate by link
        seen_links = set()
        unique_results = []
        for r in all_results:
            link = r.get("link", "")
            if link and link not in seen_links:
                seen_links.add(link)
                unique_results.append(r)
        
        # Limit to top 30
        unique_results = unique_results[:30]
        
        # Format for LLM (like v6)
        context = "\n---\n".join([
            f"TITLE: {r.get('title', '')}\nLINK: {r.get('link', '')}\nSNIPPET: {r.get('snippet', '')}\nDATE: {r.get('date', 'Unknown')}"
            for r in unique_results
        ])
        
        print(f"✅ Found {len(unique_results)} unique search results")
        return context
        
    except Exception as e:
        print(f"❌ Serper search failed: {e}")
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
            "hypeScore": self.hype_score,
            "imagePrompt": self.image_prompt
        }


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
    model = GenerativeModel(MODEL_VISION)
    
    prompt = f"""
You are the Data Scout for "Good Day Bend".
Target Date: {date_str}
Location: Bend, Oregon

SOURCE MATERIAL (REAL SEARCH RESULTS):
{search_context}

Task: Extract 5-10 REAL, CONFIRMED events from the search results above for this specific date.

CRITICAL RULES:
1. **NO HALLUCINATIONS**: If it's not in the source material, DO NOT include it.
2. **Date Match**: Verify the search result actually refers to {date_str}.
3. **Data Integrity**: Exact Venue Name and Address required. Times must be specific.

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
    "hypeScore": 1-10,
    "imagePrompt": "Visual description for AI generation (photorealistic, no text)"
}}]
"""
    
    try:
        print(f"🧠 Extracting events with Gemini for {date_str}...")
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


async def scout_events(
    date: Optional[datetime] = None,
    days_ahead: int = 2
) -> Dict[str, int]:
    """
    Main Scout workflow: Search → Extract → Store
    
    Args:
        date: Target date to scout (defaults to today)
        days_ahead: Number of days to look ahead
        
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
        
        # Step 1: Search Google
        search_context = search_bend_events(date_str)
        
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
            event_data.update({
                "eventDate": iso_date,
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
