
import sys
import logging
from agent import publisher_tools
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)

def main():
    print("🧪 Testing Publisher Tools (Isolated)...")
    
    today = datetime.now().strftime("%Y-%m-%d")
    print(f"📅 Target Date: {today}")
    
    try:
        print("▶️ Calling fetch_events...")
        events = publisher_tools.fetch_events(today)
        print(f"✅ fetch_events returned: {len(events)} events")
        
        if not events:
            print("⚠️ No events found. Attempting seed...")
            publisher_tools.seed_test_events(today)
            events = publisher_tools.fetch_events(today)
            print(f"✅ After seed: {len(events)} events")
            
        if events:
            print(f"📝 Sample Event: {events[0]['title']}")
            sys.stdout.flush()
            
            print("▶️ Calling analyze_strategy...")
            sys.stdout.flush()
            
            strategy = publisher_tools.analyze_strategy(events)
            
            print(f"🧠 Strategy Vibe: {strategy.get('vibe')}")
            print(f"📊 Metrics: {strategy.get('metrics')}")
            sys.stdout.flush()
            
            print("▶️ Calling generate_blog_content...")
            sys.stdout.flush()
            
            html = publisher_tools.generate_blog_content(events, strategy, today)
            print(f"📝 Blog Snippet: {html[:200]}...")
            sys.stdout.flush()
            
            print("▶️ Calling generate_social_content...")
            sys.stdout.flush()
            
            social = publisher_tools.generate_social_content(html)
            print(f"📱 Social Caption: {social}")


            
    except Exception as e:
        print(f"❌ Test Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
