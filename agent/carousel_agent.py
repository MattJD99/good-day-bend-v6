"""
Weekly Instagram Carousel Agent for Good Day Bend
Orchestrates carousel generation and GHL scheduling
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from google.cloud import firestore
from vertexai.generative_models import GenerativeModel

from agent.config import (
    PROJECT_ID, 
    MODEL_WRITING,
    COLLECTION_EVENTS,
)
from agent.carousel_generator import generate_week_carousel, save_carousel_preview
from agent.ghl import GHLClient


class CarouselAgent:
    """
    Generates weekly Instagram carousel posts showing events for each day
    """
    
    def __init__(self):
        self.db = firestore.Client(project=PROJECT_ID)
        self.model = GenerativeModel(MODEL_WRITING)
        self.ghl = GHLClient()
        
    def get_week_events(self, week_start: datetime) -> Dict[str, List[Dict]]:
        """
        Fetch events from Firestore for the week and group by day
        
        Args:
            week_start: Monday of the week to fetch
            
        Returns:
            Dict mapping day names to event lists
        """
        events_by_day = {
            "Monday": [],
            "Tuesday": [],
            "Wednesday": [],
            "Thursday": [],
            "Friday": [],
            "Saturday": [],
            "Sunday": [],
        }
        
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        for i, day_name in enumerate(days):
            day_date = week_start + timedelta(days=i)
            date_str = day_date.strftime("%Y-%m-%d")
            
            print(f"📅 Fetching events for {day_name} ({date_str})...")
            
            # Query Firestore for events on this date
            events_ref = self.db.collection(COLLECTION_EVENTS)
            query = events_ref.where("eventDate", "==", date_str).limit(20)
            
            docs = query.stream()
            
            for doc in docs:
                data = doc.to_dict()
                events_by_day[day_name].append({
                    "name": data.get("title", data.get("name", "Event")),
                    "venue": data.get("venue", data.get("location", "Bend"))
                })
            
            print(f"   Found {len(events_by_day[day_name])} events")
        
        return events_by_day
    
    def generate_caption(self, week_start: datetime) -> str:
        """
        Generate the Instagram caption for the carousel post
        """
        week_end = week_start + timedelta(days=6)
        
        # Format date range
        if week_start.month == week_end.month:
            date_range = f"{week_start.strftime('%B')} {week_start.day}-{week_end.day}"
        else:
            date_range = f"{week_start.strftime('%B %d')} - {week_end.strftime('%B %d')}"
        
        caption = f"""🌲 Looking for a Good Day in Bend? Here's what's happening this week - {date_range}th

Be sure to tag your friends to let them know which events are on your list! Don't forget to follow @gooddaybend to stay updated on all the happenings here in Bend, Oregon.

#inbend #gooddaybend #thebendlife #bend #bendoregon centraloregon travelbend bendor visitbend bendevents whattodo"""
        
        return caption
    
    def generate_weekly_carousel(
        self, 
        week_start: Optional[datetime] = None,
        save_preview: bool = True,
        schedule_post: bool = False,
        post_time: Optional[datetime] = None
    ) -> Dict:
        """
        Generate the complete weekly carousel
        
        Args:
            week_start: Monday of the week (defaults to next Monday)
            save_preview: Save images to disk for review
            schedule_post: Actually schedule to GHL (False = draft only)
            post_time: When to schedule the post (defaults to Sunday 10am PST)
            
        Returns:
            Dict with carousel details and image paths
        """
        # Default to next Monday if not specified
        if week_start is None:
            today = datetime.now()
            days_until_monday = (7 - today.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            week_start = today + timedelta(days=days_until_monday)
            week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        print(f"🎠 Generating carousel for week of {week_start.strftime('%B %d, %Y')}")
        
        # Step 1: Fetch events
        events_by_day = self.get_week_events(week_start)
        
        total_events = sum(len(events) for events in events_by_day.values())
        print(f"📊 Total events found: {total_events}")
        
        # Step 2: Generate carousel images
        print("🎨 Generating carousel slides...")
        slides = generate_week_carousel(week_start, events_by_day)
        print(f"✅ Generated {len(slides)} slides")
        
        # Step 3: Save preview if requested
        preview_dir = None
        if save_preview:
            preview_dir = f"/tmp/carousel_preview_{week_start.strftime('%Y-%m-%d')}"
            save_carousel_preview(slides, preview_dir)
        
        # Step 4: Generate caption
        caption = self.generate_caption(week_start)
        print(f"📝 Caption generated ({len(caption)} chars)")
        
        # Step 5: Schedule to GHL if requested
        ghl_post_id = None
        if schedule_post:
            # Default post time: Sunday before the week starts, 10am PST
            if post_time is None:
                # Sunday = week_start - 1 day, at 10am
                post_time = week_start - timedelta(days=1)
                post_time = post_time.replace(hour=10, minute=0, second=0)
            
            print(f"📅 Scheduling post for {post_time.strftime('%Y-%m-%d %H:%M')}")
            ghl_post_id = self.ghl.create_social_post(
                slides=slides,
                caption=caption,
                scheduled_time=post_time
            )
        
        result = {
            "week_start": week_start.strftime("%Y-%m-%d"),
            "total_events": total_events,
            "events_by_day": {day: len(events) for day, events in events_by_day.items()},
            "slide_count": len(slides),
            "preview_dir": preview_dir,
            "caption": caption,
            "ghl_post_id": ghl_post_id,
            "scheduled": schedule_post
        }
        
        print("\n✅ Carousel generation complete!")
        return result


def publish_weekly_carousel(week_start_str: Optional[str] = None, schedule: bool = False) -> Dict:
    """
    Main entry point for weekly carousel generation
    
    Args:
        week_start_str: Optional date string "YYYY-MM-DD" for Monday of the week
        schedule: If True, schedule to GHL. If False, just preview.
    
    Returns:
        Result dict with carousel details
    """
    agent = CarouselAgent()
    
    week_start = None
    if week_start_str:
        week_start = datetime.strptime(week_start_str, "%Y-%m-%d")
    
    return agent.generate_weekly_carousel(
        week_start=week_start,
        save_preview=True,
        schedule_post=schedule
    )


if __name__ == "__main__":
    import sys
    
    # Usage: python3 agent/carousel_agent.py [YYYY-MM-DD] [--schedule]
    week_start_str = None
    schedule = False
    
    for arg in sys.argv[1:]:
        if arg == "--schedule":
            schedule = True
        elif "-" in arg:
            week_start_str = arg
    
    result = publish_weekly_carousel(week_start_str, schedule)
    
    print("\n" + "="*50)
    print("📊 RESULT")
    print("="*50)
    for key, value in result.items():
        if key != "caption":
            print(f"  {key}: {value}")
    print(f"\nCaption preview:\n{result['caption'][:200]}...")
