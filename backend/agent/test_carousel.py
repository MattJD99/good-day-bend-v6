#!/usr/bin/env python3
"""
Test script for Weekly Carousel Generator
Generates preview images for a specified week
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from agent.carousel_agent import publish_weekly_carousel

def main():
    print("=" * 60)
    print("🎠 Good Day Bend - Weekly Carousel Generator")
    print("=" * 60)
    
    # Parse arguments
    week_start_str = None
    schedule = False
    
    for arg in sys.argv[1:]:
        if arg == "--schedule":
            schedule = True
            print("⚠️  SCHEDULE mode enabled - will post to GHL!")
        elif arg == "--help":
            print("""
Usage: python3 agent/test_carousel.py [YYYY-MM-DD] [--schedule]

Arguments:
  YYYY-MM-DD   Monday of the week to generate (default: next Monday)
  --schedule   Actually schedule to GHL (default: preview only)

Examples:
  python3 agent/test_carousel.py                    # Next week, preview only
  python3 agent/test_carousel.py 2026-02-03         # Week of Feb 3, preview
  python3 agent/test_carousel.py 2026-02-03 --schedule  # Week of Feb 3, schedule
""")
            return
        elif "-" in arg and len(arg) == 10:
            week_start_str = arg
            print(f"📅 Week start: {week_start_str}")
    
    if not week_start_str:
        print("📅 Using next Monday as default")
    
    print()
    
    # Run the carousel generator
    result = publish_weekly_carousel(week_start_str, schedule)
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 RESULT SUMMARY")
    print("=" * 60)
    print(f"  Week Start:    {result['week_start']}")
    print(f"  Total Events:  {result['total_events']}")
    print(f"  Slides:        {result['slide_count']}")
    print(f"  Preview Dir:   {result['preview_dir']}")
    print(f"  Scheduled:     {result['scheduled']}")
    
    if result.get('ghl_post_id'):
        print(f"  GHL Post ID:   {result['ghl_post_id']}")
    
    print("\n📅 Events per day:")
    for day, count in result['events_by_day'].items():
        print(f"    {day}: {count} events")
    
    print("\n📝 Caption Preview:")
    print("-" * 40)
    print(result['caption'])
    print("-" * 40)
    
    if result['preview_dir']:
        print(f"\n✅ Open preview folder:")
        print(f"   open {result['preview_dir']}")


if __name__ == "__main__":
    main()
