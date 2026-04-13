#!/usr/bin/env python3
"""
Event Scraper Agent - Good Day Bend v7 Enhancement

Scrapes events using a modern AI-extraction pipeline:

Tier 1: Serper.dev (Google Search API) for broad/major events.
Tier 2: Tavily API for deep extraction of hyper-local venues.
Processing: Gemini extracts, deduplicates, and formats into clean JSON.

This integrates with the existing scout.py architecture.
"""
import os
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Configuration
OUTPUT_DIR = Path(__file__).parent.parent / "output" / "events"
MEMORY_DIR = Path(__file__).parent.parent.parent / "memory"

# Ensure directories exist
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MEMORY_DIR.mkdir(parents=True, exist_ok=True)

# API Keys - ALL from environment variables (security first!)
SERPER_API_KEY = os.getenv("SERPER_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDZmXkHHMU-aypR0bkJkD4qxIwojIdJBOs")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Define Hyper-Local Venues for Tavily (Tier 2)
# These are the trusted sources from config.py
LOCAL_VENUES = [
    {"name": "Volcanic Theatre Pub", "url": "https://volcanictheatre.com/events"},
    {"name": "Tower Theatre", "url": "https://towertheatre.org/tickets-and-events/"},
    {"name": "Silver Moon Brewing", "url": "https://silvermoonbrewing.com/events/"},
    {"name": "Midtown Ballroom", "url": "https://midtownballroom.com/events"},
    {"name": "McMenamins Old St. Francis", "url": "https://www.mcmenamins.com/to-do/live-music-events/music-event-calendar"},
    {"name": "River's Place", "url": "https://riversplacebend.com/events-monthly-lineup"},
    {"name": "Mt. Bachelor Events", "url": "https://www.mtbachelor.com/events-activities/events/events-calendar/"},
    {"name": "The Bend Wine Bar", "url": "https://www.bendwinebar.com/events"},
    {"name": "Dogwood at the Pine Shed", "url": "https://www.dogwoodatthepineshed.com/events"},
]


def scrape_serper(query: str = "events in Bend Oregon this week") -> str:
    """Tier 1: Scrape Google Search for broad events"""
    print(f" 🔍 Scraping Tier 1 (Serper.dev): '{query}'...")

    if not SERPER_API_KEY:
        print(" ⚠️ SERPER_API_KEY not found. Skipping Google Search.")
        return ""

    url = "https://google.serper.dev/search"
    payload = json.dumps({
        "q": query,
        "location": "Bend, Oregon, United States"
    })
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(url, headers=headers, data=payload, timeout=30)
        response.raise_for_status()
        data = response.json()

        # Extract organic text and any rich snippets
        raw_text = "--- SERPER SEARCH RESULTS ---\n"
        for result in data.get("organic", []):
            raw_text += f"Title: {result.get('title')}\nSnippet: {result.get('snippet')}\nLink: {result.get('link')}\n\n"

        print(" ✅ Serper search complete.")
        return raw_text
    except Exception as e:
        print(f" ❌ Serper failed: {e}")
        return ""


def scrape_tavily(venue: dict) -> str:
    """Tier 2: Extract clean markdown from venue websites using the Tavily Extract API"""
    print(f" 🌐 Scraping Tier 2 (Tavily): {venue['name']}...")

    if not TAVILY_API_KEY:
        print(" ⚠️ TAVILY_API_KEY not found. Skipping direct venue scraping.")
        return ""

    url = "https://api.tavily.com/extract"
    payload = {
        "urls": [venue['url']],
        "extract_depth": "advanced"  # Advanced depth renders JavaScript on event pages
    }
    headers = {
        'Authorization': f'Bearer {TAVILY_API_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()

        results = data.get("results", [])
        if results and results[0].get("raw_content"):
            markdown = results[0]["raw_content"]
            print(f" ✅ Tavily extracted {len(markdown)} characters from {venue['name']}")
            return f"--- VENUE: {venue['name']} ({venue['url']}) ---\n{markdown}\n\n"
        else:
            failed = data.get("failed_results", [])
            error_msg = failed[0].get('error') if failed else "No content extracted"
            print(f" ⚠️ Tavily failed for {venue['name']}: {error_msg}")
            return ""
    except Exception as e:
        print(f" ❌ Tavily request failed for {venue['name']}: {e}")
        return ""


def process_with_gemini(raw_text_dump: str) -> list:
    """Extract, deduplicate, and format raw text into strict JSON using Gemini"""
    print(" 🧠 Processing raw data with Gemini...")

    if not GEMINI_API_KEY:
        print(" ❌ GEMINI_API_KEY missing. Cannot process data.")
        return []

    # Use stable Gemini model
    model = genai.GenerativeModel("gemini-1.5-flash-002")

    # Truncate to ensure it fits in context window
    truncated_text = raw_text_dump[:80000]

    prompt = f"""You are an elite Event Data Extractor.
I have dumped raw text scraped from Google Search and local venue websites in Bend, Oregon.
Your job is to read this messy text, identify actual upcoming events, deduplicate them (don't list the same event twice), and output a clean JSON array.

RAW TEXT DATA:
{truncated_text}

Format requirements:
Return ONLY a valid JSON array. Each object must have:
- "id": a unique string (e.g., "venue_date_name")
- "source": where you found it (e.g., "Tower Theatre", "Google Search")
- "title": Clean event title
- "description": 1-2 sentence description
- "start_date": ISO format (e.g., "2026-04-15T19:00:00") if known, otherwise best guess ISO.
- "end_date": ISO format or empty string
- "venue_name": Name of the location
- "cost": Price if mentioned, otherwise "Unknown"
- "url": link to the event if provided
- "category": e.g., "music", "community", "arts", "food-drink", "outdoor"

ONLY return the JSON array. Do not include markdown code blocks (like ```json) in the final output. Start directly with [ and end with ]."""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean up in case the model ignored instructions and wrapped in markdown
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        events = json.loads(text)
        print(f" ✅ Gemini successfully extracted {len(events)} clean events.")
        return events
    except Exception as e:
        print(f" ❌ Gemini processing failed: {e}")
        
        # Debug output if JSON parsing failed
        print("--- RAW GEMINI OUTPUT ---")
        print(response.text if 'response' in locals() else "No response")
        return []


def save_events(events: list) -> str:
    """Save the clean JSON events to the output directory"""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_file = OUTPUT_DIR / f"events_{timestamp}.json"

    # Add metadata
    final_data = {
        "scraped_at": datetime.now().isoformat(),
        "event_count": len(events),
        "events": events
    }

    with open(output_file, 'w') as f:
        json.dump(final_data, f, indent=2)

    # Save as "latest" for Content Engine to pick up
    latest_file = OUTPUT_DIR / "events_latest.json"
    with open(latest_file, 'w') as f:
        json.dump(final_data, f, indent=2)

    # Update scraping memory
    memory_file = MEMORY_DIR / "scraped_events.md"
    with open(memory_file, 'a') as f:
        f.write(f"\n## {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        f.write(f"- Successfully processed {len(events)} unique events via AI pipeline.\n")

    print(f" 💾 Saved to: {output_file}")
    return str(output_file)


def run_event_scraper() -> dict:
    """Main execution function"""
    print("=" * 60)
    print("🎯 EVENT SCRAPER PRO - AI Pipeline")
    print("=" * 60)

    all_raw_text = ""

    # Step 1: Broad Search
    all_raw_text += scrape_serper("upcoming events in Bend Oregon this week")

    # Step 2: Deep Venue Scrapes
    for venue in LOCAL_VENUES:
        all_raw_text += scrape_tavily(venue)

    if not all_raw_text.strip():
        print("❌ No raw data collected. Check API keys.")
        return {"error": "No raw data collected"}

    # Step 3: AI Processing
    clean_events = process_with_gemini(all_raw_text)

    # Step 4: Save
    if clean_events:
        output_file = save_events(clean_events)
        print("\n" + "=" * 60)
        print(f"✅ PIPELINE COMPLETE: {len(clean_events)} events ready")
        print("=" * 60)
        return {"status": "success", "count": len(clean_events), "file": output_file}
    else:
        print("\n❌ Pipeline failed at AI extraction step.")
        return {"error": "AI extraction failed"}


if __name__ == "__main__":
    result = run_event_scraper()
    print(json.dumps(result, indent=2))
