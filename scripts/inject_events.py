
import os
from google.cloud import firestore
from datetime import datetime
from agent.config import PROJECT_ID, COLLECTION_EVENTS

# Initialize Firestore
os.environ["GOOGLE_CLOUD_PROJECT"] = "good-day-bend-v6"
SERVICE_ACCOUNT_PATH = "/Users/md/Documents/Good-Day-Bend-v9/functions/service-account.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = SERVICE_ACCOUNT_PATH
db = firestore.Client(project="good-day-bend-v6")

events = [
    {
        "title": "Bend Winter PrideFest - Bonfire on the Snow",
        "date": "2026-03-09",
        "time": "Evening",
        "venue": "Mt. Bachelor / Bend",
        "category": "Community",
        "description": "Conclusion of Winter PrideFest with a cozy bonfire on the snow.",
        "hypeScore": 8
    },
    {
        "title": "Devon Allman Blues",
        "date": "2026-03-09",
        "time": "7:30 PM",
        "venue": "Tower Theatre",
        "category": "Music",
        "description": "Live blues performance by Devon Allman.",
        "hypeScore": 7
    },
    {
        "title": "Trivia at Beach Hut Deli",
        "date": "2026-03-10",
        "time": "6:00 PM - 8:00 PM",
        "venue": "Beach Hut Deli",
        "category": "Community",
        "description": "Weekly trivia night with prizes and good food.",
        "hypeScore": 6
    },
    {
        "title": "Head Games Trivia at Deschutes Brewery",
        "date": "2026-03-11",
        "time": "6:30 PM - 9:00 PM",
        "venue": "Deschutes Brewery Public House",
        "category": "Community",
        "description": "Popular weekly trivia at the famous Deschutes Brewery.",
        "hypeScore": 6
    },
    {
        "title": "Jazz at The Oxford - John Lloyd Young",
        "date": "2026-03-13",
        "time": "6:00 PM - 8:00 PM",
        "venue": "Oxford Hotel Bend",
        "category": "Music",
        "description": "The Definitive Voice of Frankie Valli performs live jazz.",
        "hypeScore": 9
    },
    {
        "title": "Hoodoo's Winter Carnival",
        "date": "2026-03-14",
        "time": "9:00 AM - 9:00 PM",
        "venue": "Hoodoo Ski Area",
        "category": "Outdoors",
        "description": "All-day winter celebration with free activities for the family.",
        "hypeScore": 10
    }
]

favorites = [
    {
        "name": "10 Barrel Brewing Co.",
        "category": "Brewery",
        "rating": 4.6,
        "reviews": "5k+",
        "websiteUrl": "https://10barrel.com",
        "googleReviewsUrl": "https://www.google.com/search?q=10+barrel+brewing+bend+oregon",
        "image": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef6?w=800&q=80"
    },
    {
        "name": "Spork",
        "category": "Restaurant",
        "rating": 4.7,
        "reviews": "2k+",
        "websiteUrl": "https://sporkbend.com",
        "googleReviewsUrl": "https://www.google.com/search?q=spork+bend+oregon",
        "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80"
    },
    {
        "name": "Pine Tavern Restaurant",
        "category": "Historic",
        "rating": 4.4,
        "reviews": "1.5k+",
        "websiteUrl": "https://pinetavern.com",
        "googleReviewsUrl": "https://www.google.com/search?q=pine+tavern+bend+oregon",
        "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80"
    },
    {
        "name": "Crux Fermentation Project",
        "category": "Brewery",
        "rating": 4.7,
        "reviews": "4k+",
        "websiteUrl": "https://cruxfermentation.com",
        "googleReviewsUrl": "https://www.google.com/search?q=crux+fermentation+bend+oregon",
        "image": "https://images.unsplash.com/photo-1555658636-6e4a36218be7?w=800&q=80"
    }
]

def inject():
    batch = db.batch()
    
    # Events
    for event in events:
        clean_title = "".join(c if c.isalnum() else "-" for c in event["title"]).lower()
        slug = f"{clean_title}-{event['date']}"
        doc_ref = db.collection(COLLECTION_EVENTS).document(slug)
        
        event_data = {
            **event,
            "eventDate": event["date"],
            "scoutedAt": firestore.SERVER_TIMESTAMP,
            "isRealData": True,
            "image": "", # Frontend will resolve
            "is_featured": event["hypeScore"] >= 8
        }
        batch.set(doc_ref, event_data, merge=True)
        print(f"Adding Event: {event['title']}")
    
    # Favorites
    for fav in favorites:
        slug = fav["name"].lower().replace(" ", "-")
        doc_ref = db.collection("favorites").document(slug)
        batch.set(doc_ref, fav, merge=True)
        print(f"Adding Favorite: {fav['name']}")
    
    batch.commit()
    print("✅ Injected successfully into good-day-bend-v6.")

if __name__ == "__main__":
    inject()
