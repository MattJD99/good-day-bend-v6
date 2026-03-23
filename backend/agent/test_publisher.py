"""
Test script for Publisher Agent

Usage:
  python agent/test_publisher.py              # Publish for today
  python agent/test_publisher.py 2026-01-28   # Publish for specific date
"""

import asyncio
import sys
from datetime import datetime

# Add parent to path
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.publisher import publish_daily_article


async def main():
    print("🧪 TESTING PUBLISHER AGENT")
    print("=" * 60)
    
    # Check environment variables
    required_vars = [
        "GEMINI_API_KEY",
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_APPLICATION_CREDENTIALS"
    ]
    
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print("\n⚠️  WARNING: Missing environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nPublisher may fail.")
        print("See SETUP_GUIDE.md for instructions.\n")
    
    # Parse command line args
    target_date = None
    
    if len(sys.argv) > 1:
        try:
            target_date = datetime.strptime(sys.argv[1], "%Y-%m-%d")
            print(f"🗓️  Target date: {target_date.strftime('%A, %B %d, %Y')}")
        except ValueError:
            print(f"❌ Invalid date format: {sys.argv[1]}")
            print("   Use: YYYY-MM-DD")
            return
    
    print("\n" + "=" * 60)
    print("Starting Publisher Workflow...")
    print("=" * 60 + "\n")
    
    try:
        result = await publish_daily_article(target_date)
        
        if "error" in result:
            print(f"\n❌ Publisher failed: {result['error']}")
            print("\nMake sure Scout has run first to populate events!")
            return
        
        print("\n" + "=" * 60)
        print("✅ PUBLISHER COMPLETE")
        print("=" * 60)
        
        print("\n📊 Results:")
        print(f"  Draft ID: {result['draft_id']}")
        print(f"  Vibe: {result['vibe']}")
        print(f"  Hero Image: {result['image_url']}")
        print(f"\n📄 Review Drafts:")
        print(f"  Blog: {result['blog_url']}")
        print(f"  Social: {result['social_url']}")
        
        print("\n💡 Next Steps:")
        print("  1. Open blog draft URL in browser")
        print("  2. Review the article")
        print("  3. Click 'Approve & Publish' to go live")
        
    except Exception as e:
        print(f"\n❌ Publisher failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
