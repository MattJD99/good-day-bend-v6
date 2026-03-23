import os
import sys
import json
from google.cloud import firestore
import google.generativeai as genai
from google.api_core import retry

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from agent.config import (
    PROJECT_ID,
    COLLECTION_EVENTS,
    GEMINI_API_KEY,
    TRUSTED_SOURCES
)

# Serper.dev Search integration (from v6)
def search_bend_events(date_str: str) -> List[Dict]:
    """Search for Bend events using Serper.dev API"""
    SERPER_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
    if not SERPER_API_KEY:
        print("⚠️ Serper API not configured")
        return []
    
    import requests
    queries = [
        f"events in Bend Oregon on {date_str}",
        f"live music Bend Oregon {date_str}"
    ]
    
    all_results = []
    for query in queries:
        try:
            print(f"🔍 Searching: {query}")
            response = requests.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
                json={"q": query, "num": 10},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                all_results.extend(data.get("organic", []))
            else:
                print(f"⚠️ Serper query failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"❌ Serper error: {e}")
            
    return all_results

async def scout_events(date: datetime = None, days_ahead: int = 1):
    """Scout events for the specified number of days"""
    if not date:
        date = datetime.now()
    
    print("💎 Initializing Gemini AI...")
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    db = firestore.Client(project=PROJECT_ID)
    
    results_summary = {}
    
    for i in range(days_ahead):
        current_date = date + timedelta(days=i)
        date_str = current_date.strftime("%A, %B %d, %Y")
        iso_date = current_date.strftime("%Y-%m-%d")
        
        print(f"\n🕵️ Scouting events for {date_str}...")
        raw_data = search_bend_events(date_str)
        
        if not raw_data:
            results_summary[iso_date] = 0
            continue
            
        print(f"🧠 Extracting events with Gemini for {date_str}...")
        context = json.dumps(raw_data)
        prompt = f"Extract all unique events from this raw search data for {date_str} in Bend, Oregon. Return as a JSON list of objects with keys: title, time, venue, description, price, category, link. Search data: {context}"
        
        try:
            response = model.generate_content(prompt)
            # Basic parsing of JSON from markdown if needed
            text = response.text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
                
            events = json.loads(text)
            print(f"✅ Found {len(events)} events")
            
            # Store in Firestore
            for event in events:
                event['date'] = iso_date
                event['scouted_at'] = firestore.SERVER_TIMESTAMP
                # Simple ID generation
                doc_id = f"{iso_date}_{hash(event['title']) % 10000}"
                db.collection(COLLECTION_EVENTS).document(doc_id).set(event)
                
            results_summary[iso_date] = len(events)
        except Exception as e:
            print(f"❌ Extraction failed: {e}")
            results_summary[iso_date] = 0
            
    return results_summary

async def main():
    target_date = datetime.now()
    if len(sys.argv) > 1:
        target_date = datetime.strptime(sys.argv[1], "%Y-%m-%d")
    
    days = 1
    if len(sys.argv) > 2:
        days = int(sys.argv[2])
        
    print("🚀 Scout Agent Activated")
    results = await scout_events(date=target_date, days_ahead=days)
    print(f"\n✅ Scout Mission Complete. Summary: {results}")

if __name__ == "__main__":
    asyncio.run(main())
