"""
Test script for image generation system

This tests the vision-guided image generation without needing
full integration into the publisher workflow.
"""

import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.image_generation import (
    generate_blog_image,
    generate_daily_update_image,
    generate_image_with_vision
)


async def test_blog_image():
    """Test generating a blog article image"""
    print("\n" + "="*60)
    print("TEST: Blog Article Image Generation")
    print("="*60)
    
    url = await generate_blog_image(
        title="Bend Housing Market Shows Signs of Cooling in 2026",
        topic_category="real estate"
    )
    
    print(f"\n✅ Generated image URL: {url}\n")
    return url


async def test_daily_update_image():
    """Test generating a daily update image"""
    print("\n" + "="*60)
    print("TEST: Daily Update Image Generation")
    print("="*60)
    
    url = await generate_daily_update_image(
        headline="Live Music and Winter Sports",
        date="2026-01-26"
    )
    
    print(f"\n✅ Generated image URL: {url}\n")
    return url


async def test_custom_topic():
    """Test generating a custom topic image"""
    print("\n" + "="*60)
    print("TEST: Custom Topic Image Generation")
    print("="*60)
    
    url = await generate_image_with_vision(
        topic="craft brewery outdoor patio",
        context="This is for content about Bend's beer culture and outdoor dining scene."
    )
    
    print(f"\n✅ Generated image URL: {url}\n")
    return url


async def main():
    """Run all tests"""
    print("\n🎨 IMAGEN 4 FAST - Vision-Guided Image Generation Tests\n")
    print("This will test the complete workflow:")
    print("  1. Google Image Search")
    print("  2. Gemini 2.5 Flash Vision Analysis")
    print("  3. Imagen 4 Fast Generation")
    print("  4. Firebase Storage Upload")
    print("\n")
    
    # Check for required environment variables
    required_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_SEARCH_API_KEY",
        "GOOGLE_SEARCH_ENGINE_ID",
        "GEMINI_API_KEY"
    ]
    
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        print("⚠️  WARNING: Missing environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nTests may use fallback behavior or fail.")
        print("See README for setup instructions.\n")
    
    try:
        # Run tests
        await test_custom_topic()
        await test_daily_update_image()
        await test_blog_image()
        
        print("\n" + "="*60)
        print("✅ All tests completed successfully!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}\n")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
