"""
Test script for Trend Blog Agent

Usage:
  python agent/test_trend_blog.py
"""

import asyncio
import sys

# Add parent to path
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from agent.trend_blog import publish_trend_blog
from agent.config import PROJECT_ID, STORAGE_BUCKET

print(f"DEBUG: PROJECT_ID={PROJECT_ID}")
print(f"DEBUG: STORAGE_BUCKET={STORAGE_BUCKET}")
print(f"DEBUG: GOOGLE_CLOUD_PROJECT={os.getenv('GOOGLE_CLOUD_PROJECT')}")


async def main():
    print("🧪 TESTING TREND BLOG AGENT")
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
        print("\nTrend Blog may fail.")
        print("See SETUP_GUIDE.md for instructions.\n")
    
    print("\n" + "=" * 60)
    print("Starting Trend Blog Workflow...")
    print("=" * 60 + "\n")
    
    try:
        result = await publish_trend_blog()
        
        if result.get("skipped"):
            print("\n" + "=" * 60)
            print("⏭️ SKIPPED")
            print("=" * 60)
            print(f"\nReason: {result['reason']}")
            print(f"Topic: {result['topic']}")
            print("\nThis topic was already covered recently.")
            return
        
        print("\n" + "=" * 60)
        print("✅ TREND BLOG PUBLISHED")
        print("=" * 60)
        
        print("\n📊 Results:")
        print(f"  Title: {result['title']}")
        print(f"  Topic: {result['topic']}")
        print(f"  Slug: {result['slug']}")
        print(f"  Collection: {result['collection']}")
        print(f"  Image: {result['image_url']}")
        
        print("\n💡 Next Steps:")
        print("  1. Check Firestore 'blogs' collection")
        print("  2. View the article in your app")
        print(f"  3. Blog is live at: /blog/{result['slug']}")
        
    except Exception as e:
        print(f"\n❌ Trend Blog failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
