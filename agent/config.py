
# Good Day Bend v7 Agent Configuration

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project Configuration
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "good-day-bend-v6")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

# Firestore Collections
COLLECTION_EVENTS = "events"
COLLECTION_DAILY_UPDATES = "daily_updates"
COLLECTION_ARTICLES = "articles"
COLLECTION_DRAFTS = "drafts"
COLLECTION_BLOG_ARTICLES = "blog_articles"  # New: SEO blog articles

# Storage Configuration
STORAGE_BUCKET = "good-day-bend-v6.firebasestorage.app"

# Blog Topics Queue for SEO Articles
BLOG_TOPICS_QUEUE = [
    {
        "topic": "Non-Alcoholic Beer & Mocktails in Bend, Oregon",
        "keywords": ["non-alcoholic bend oregon", "mocktails bend", "NA beer bend", "sober curious bend"],
        "category": "food-drink"
    },
    {
        "topic": "Best Hiking Trails Near Bend, Oregon",
        "keywords": ["bend hiking trails", "central oregon hikes", "bend oregon trails"],
        "category": "outdoor"
    },
    {
        "topic": "Family-Friendly Activities in Bend, Oregon",
        "keywords": ["family activities bend", "things to do with kids bend oregon"],
        "category": "family"
    },
    {
        "topic": "Bend's Craft Beer Scene: A Local's Guide",
        "keywords": ["bend breweries", "craft beer bend oregon", "bend ale trail"],
        "category": "food-drink"
    },
    {
        "topic": "Best Coffee Shops in Bend, Oregon",
        "keywords": ["bend coffee shops", "best coffee bend", "bend oregon cafes"],
        "category": "food-drink"
    }
]  # Trending topic blog articles

# GoHighLevel Configuration
GHL_API_KEY = os.getenv("GHL_API_KEY")
GHL_LOCATION_ID = os.getenv("GHL_LOCATION_ID")


# Models - Updated Mar 2026 (Best Available GA Production Stack)
# Segmented by role for optimal quality and cost
MODEL_RESEARCH = "gemini-1.5-flash"                   # The "Researcher" — fast data ingestion
MODEL_WRITING = "gemini-1.5-pro"                      # The "Writer" — best quality for articles
MODEL_WRITING_BACKUP = "gemini-1.5-flash"             # Backup if Pro quota exhausted
MODEL_REASONING = "gemini-1.5-flash"                  # Strategy and analysis
MODEL_VISION = "gemini-1.5-flash"                     # Vision/extraction tasks
MODEL_IMAGE_FAST = "imagen-3.0-generate-001"          # Imagen 3
MODEL_IMAGE_STANDARD = "imagen-3.0-generate-001"      # Imagen 3 Standard

# Collection name consistency
COLLECTION_BLOGS = "blogs"  # SEO/Trend blog articles (separate from daily updates)
COLLECTION_TREND_QUEUE = "trend_queue"  # Pre-researched trending topics (from scout_trends_v2)
COLLECTION_TREND_REPORTS = "trend_reports"  # Legacy trend reports

# Monetization & Sponsors (Placeholder for GHL Tags)
FEATURED_SPONSORS = [
    {
        "name": "Bend Pizza Kitchen",
        "offer": "Free Garlic Knots with Large Pizza",
        "url": "https://bendpizzakitchen.com",
        "type": "featured_business"
    },
    {
        "name": "WinterFest 2026",
        "offer": "Buy One Get One Tickets - VIP Only",
        "url": "https://oregonwinterfest.com",
        "type": "featured_event"
    }
]

# Trusted Sources for SEO
TRUSTED_SOURCES = [
    # User-Provided High-Quality Sources
    {"name": "McMenamins Old St. Francis", "url": "https://www.mcmenamins.com/to-do/live-music-events/music-event-calendar"},
    {"name": "Tower Theatre", "url": "https://www.towertheatre.org/events/month"},
    {"name": "Silver Moon Brewing", "url": "https://www.silvermoonbrewing.com/events"},
    {"name": "Midtown Ballroom", "url": "https://midtownballroom.com/calendar"},
    {"name": "Volcanic Theatre Pub", "url": "https://volcanictheatre.com/"},
    {"name": "River's Place", "url": "https://riversplacebend.com/events-monthly-lineup"},
    {"name": "Mt. Bachelor Events", "url": "https://www.mtbachelor.com/events-activities/events/events-calendar/"},
    {"name": "The Bend Wine Bar", "url": "https://www.bendwinebar.com/events"},
    {"name": "Viaggio Wine", "url": "https://www.viaggiowine.com/events-offerings"},
    {"name": "Dogwood at the Pine Shed", "url": "https://www.dogwoodatthepineshed.com/events"},
    {"name": "Two Suns Art Studio", "url": "https://www.twosunsartstudio.com/upcoming-events"},
    {"name": "DIY Cave", "url": "https://www.diycave.com"},
    {"name": "Namaspa", "url": "https://www.namaspa.com/workshops"},
    {"name": "Swing N Line", "url": "https://www.swingnline.com/calendar/"},
    {"name": "Street Dog Hero (Bend)", "url": "https://www.streetdoghero.org/events/"},
    {"name": "Let's Paint", "url": "https://www.letspaintclasses.art/artclasses"},
    {"name": "Wanderlust Tours", "url": "https://www.wanderlusttours.com/winter-tours"},
    {"name": "Octane Adventures", "url": "https://octaneadventures.com"},
    
    # Generic Backups
    {"name": "Visit Bend", "url": "https://www.visitbend.com/"},
    {"name": "Bend Source Weekly", "url": "https://www.bendsource.com/"},
    {"name": "KTVZ News", "url": "https://ktvz.com/"},
    {"name": "Bend Magazine", "url": "https://bendmagazine.com/"},
    {"name": "Central Oregon Daily", "url": "https://centraloregondaily.com/"}
]
