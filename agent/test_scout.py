"""
Test script for Scout Agent

Usage:
  python agent/test_scout.py                    # Scout today + tomorrow
  python agent/test_scout.py 2026-01-28         # Scout specific date
  python agent/test_scout.py 2026-01-28 7       # Scout 7 days ahead
"""

import asyncio
import sys
from datetime import datetime

# Add parent to path
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.scout import scout_events


async def main():
    print("🧪 TESTING SCOUT AGENT")
    print("=" * 60)
    
    # Check environment variables
    required_vars = ["GEMINI_API_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print("\n⚠️  WARNING: Missing environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nScout may fail or use fallback behavior.")
        print("See SETUP_GUIDE.md for instructions.\n")
    else:
        print("✅ GEMINI_API_KEY found - Google Search grounding enabled")
    
    # Parse command line args
    target_date = None
    days_ahead = 2
    
    if len(sys.argv) > 1:
        try:
            target_date = datetime.strptime(sys.argv[1], "%Y-%m-%d")
            print(f"🗓️  Target date: {target_date.strftime('%A, %B %d, %Y')}")
        except ValueError:
            print(f"❌ Invalid date format: {sys.argv[1]}")
            print("   Use: YYYY-MM-DD")
            return
    
    if len(sys.argv) > 2:
        try:
            days_ahead = int(sys.argv[2])
            print(f"📅 Days ahead: {days_ahead}")
        except ValueError:
            print(f"❌ Invalid days value: {sys.argv[2]}")
            return
    
    print("\n" + "=" * 60)
    print("Starting Scout Mission...")
    print("=" * 60 + "\n")
    
    try:
        result = await scout_events(date=target_date, days_ahead=days_ahead)
        
        print("\n" + "=" * 60)
        print("✅ SCOUT MISSION COMPLETE")
        print("=" * 60)
        print("\nResults by date:")
        for iso_date, count in result.items():
            print(f"  {iso_date}: {count} events")
        
        total = sum(result.values())
        print(f"\nTotal events scouted: {total}")
        
    except Exception as e:
        print(f"\n❌ Scout failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
