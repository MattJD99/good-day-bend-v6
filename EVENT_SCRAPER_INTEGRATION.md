# Good Day Bend v7 - Event Scraper Integration Guide

**Created:** April 13, 2026  
**Status:** ✅ Code Complete | ⚠️ API Keys Required

---

## 🎯 What Was Integrated

We've enhanced your Good Day Bend v7 content pipeline with the best ideas from Gemini's suggestions:

### ✅ Completed Integrations

1. **Enhanced Event Scraper** (`event_scraper_enhanced.py`)
   - Tier 1: Serper.dev for broad Google Search scraping
   - Tier 2: Tavily API for deep venue website extraction
   - AI Processing: Gemini 1.5 Flash for extraction + deduplication
   - Output: Clean JSON events saved to `output/events/`

2. **GHL Client Enhancements** (`ghl.py`)
   - ✅ `create_calendar_event()` - Add events to GHL calendar
   - ✅ `get_calendars()` - List available calendars
   - ✅ `create_blog_post()` - Create draft/published blog posts
   - ✅ `get_blog_sites()` - List blog sites
   - ✅ Existing: `create_social_post()`, `send_email()`, etc.

3. **Test Pipeline** (`test_content_pipeline.py`)
   - Full end-to-end test runner
   - Scrapes events → Creates calendar → Blog draft → Social posts

---

## 🔑 Required API Keys

Add these to your `.env` file:

```bash
# Event Scraping (NEW)
SERPER_API_KEY=your_serper_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# GoHighLevel (existing, needs real values)
GHL_API_KEY=your_actual_ghl_jwt_token
GHL_LOCATION_ID=your_actual_ghl_location_id

# Gemini (already configured)
GEMINI_API_KEY=AIzaSyDZmXkHHMU-aypR0bkJkD4qxIwojIdJBOs
```

### How to Get API Keys

#### 1. Serper.dev (Google Search API)
- **URL:** https://serper.dev
- **Free Tier:** 2,500 searches/month
- **Setup:**
  1. Sign up at serper.dev
  2. Get API key from dashboard
  3. Add to `.env`

#### 2. Tavily (Web Extraction API)
- **URL:** https://tavily.com
- **Free Tier:** 1,000 API calls/month
- **Setup:**
  1. Sign up at tavily.com
  2. Get API key from dashboard
  3. Add to `.env`

#### 3. GoHighLevel (GHL)
- **JWT Token:** From GHL Agency Settings → API
- **Location ID:** From GHL URL or Settings
- **Setup:**
  1. Go to agency settings in GHL
  2. Generate JWT token
  3. Copy location ID from URL (e.g., `.../location/123456789`)

---

## 🚀 How to Run

### Full Pipeline Test

```bash
cd /Users/daysawagency/.openclaw/workspace/repos/_archived/good-day-bend-v6/backend
python3 test_content_pipeline.py
```

### Expected Output

```
🚀 GOOD DAY BEND V7 - CONTENT PIPELINE TEST
======================================================================
📅 Running at: 2026-04-13 11:45:00

🔑 Checking API keys...
✅ SERPER_API_KEY configured
✅ TAVILY_API_KEY configured
✅ GHL_API_KEY configured

======================================================================
🎯 STEP 1: Event Scraping with Tavily + Serper + Gemini
======================================================================
 🔍 Scraping Tier 1 (Serper.dev): 'upcoming events in Bend Oregon this week'...
 ✅ Serper search complete.
 🌐 Scraping Tier 2 (Tavily): Volcanic Theatre Pub...
 ✅ Tavily extracted 15234 characters from Volcanic Theatre Pub
 ...
 🧠 Processing raw data with Gemini...
 ✅ Gemini successfully extracted 23 clean events.
 💾 Saved to: output/events/events_2026-04-13_11-45-30.json
✅ Event scraping complete: 23 events found

======================================================================
📅 STEP 2: Creating Calendar Events in GHL
======================================================================
✅ Found 2 calendars
   - Good Day Bend Events (ID: abc123)
📅 Using calendar: Good Day Bend Events

📍 Creating: Live Music at Volcanic Theatre
✅ Calendar event created: xyz789
...
✅ Created 5 calendar events in GHL

======================================================================
📝 STEP 3: Creating Blog Draft in GHL
======================================================================
✅ Found 1 blog sites
   - Good Day Bend Blog (ID: blog456)

📝 Creating blog draft: Today in Bend: Top Events for Monday, April 13, 2026
✅ Blog post created: post123
✅ Blog draft created successfully!

======================================================================
📱 STEP 4: Creating Social Media Post Drafts in GHL
======================================================================
✅ Found 3 connected social accounts
   - facebook: Good Day Bend
   - instagram: @gooddaybend
...
✅ Created 3 social media post drafts

======================================================================
📊 PIPELINE TEST SUMMARY
======================================================================

✅ Calendar Events Created: 5
   • Live Music at Volcanic Theatre
   • Comedy Night at Silver Moon
   • Art Walk Downtown
   • Wine Tasting at Bend Wine Bar
   • Hiking Group Meetup

✅ Blog Draft Created: Today in Bend: Top Events for Monday, April 13, 2026

✅ Social Post Drafts: 3
   • Live Music at Volcanic Theatre
   • Comedy Night at Silver Moon
   • Art Walk Downtown

======================================================================
🎉 Pipeline test complete!
======================================================================

💡 Next steps:
   1. Review calendar events in GHL
   2. Edit and publish the blog draft
   3. Add images to social posts and schedule
```

---

## 📁 File Structure

```
good-day-bend-v6/
├── backend/
│   ├── agent/
│   │   ├── config.py              # Existing config
│   │   ├── ghl.py                 # ✨ ENHANCED with calendar + blog
│   │   ├── scout.py               # Existing scraper (still works)
│   │   ├── event_scraper_enhanced.py  # ✨ NEW: Tavily + Serper pipeline
│   │   └── publisher.py           # Existing publisher
│   ├── test_content_pipeline.py   # ✨ NEW: Full pipeline test
│   ├── main.py                    # Cloud Function entry points
│   └── .env                       # ⚠️ UPDATE with API keys
├── output/
│   └── events/
│       ├── events_latest.json     # Latest scraped events
│       └── events_YYYY-MM-DD_HH-MM-SS.json
└── memory/
    └── scraped_events.md          # Scraping history log
```

---

## 🔧 Configuration Options

### Customize Venues to Scrape

Edit `event_scraper_enhanced.py`:

```python
LOCAL_VENUES = [
    {"name": "Your Venue", "url": "https://venue-url.com/events"},
    # Add more venues...
]
```

### Change AI Model

```python
# In event_scraper_enhanced.py
model = genai.GenerativeModel("gemini-1.5-pro-002")  # Higher quality, slower
# or
model = genai.GenerativeModel("gemini-1.5-flash-002")  # Faster, good quality
```

### Adjust Number of Events

```python
# In test_content_pipeline.py
for event in events[:5]:  # Change 5 to desired number
```

---

## 🐛 Troubleshooting

### "SERPER_API_KEY not found"
- Add `SERPER_API_KEY=your_key` to `.env`
- Or skip Serper (Tavily will still work)

### "TAVILY_API_KEY not found"
- Add `TAVILY_API_KEY=your_key` to `.env`
- Or skip Tavily (Serper will still work)

### "GHL API key not set"
- Update `GHL_API_KEY` and `GHL_LOCATION_ID` in `.env`
- Get JWT from GHL Agency Settings → API

### "No blog sites configured"
- Create a blog site in GHL: Sites → Add Blog Site
- Configure domain and theme

### "No social media accounts connected"
- Connect social accounts in GHL: Marketing → Social Media
- Authorize Facebook/Instagram accounts

### Gemini JSON parsing fails
- Check Gemini API key is valid
- Review raw output in console for debugging

---

## 📊 Cost Estimates

| Service | Free Tier | Paid Plans | Estimated Monthly Cost |
|---------|-----------|------------|----------------------|
| Serper.dev | 2,500 searches | $50/mo for 10k | $0-50 (daily scraping) |
| Tavily | 1,000 calls | $59/mo for 5k | $0-59 (10 venues/day) |
| Gemini | 15 requests/min free | $0.000125/1K tokens | ~$2-5/month |
| GHL | Included | Included | $0 (existing subscription) |

**Total Estimated:** $0-115/month (depending on usage)

---

## 🎯 Next Steps

1. **Add API Keys** to `.env`
2. **Run Test:** `python3 test_content_pipeline.py`
3. **Review Output** in GHL dashboard
4. **Schedule Daily:** Add to cron or Cloud Scheduler

### Optional Enhancements

- [ ] Add image generation for social posts
- [ ] Integrate with existing `publisher.py` workflow
- [ ] Add performance tracking (which events get most engagement)
- [ ] Create weekly "best of" blog compilation
- [ ] Add SMS notifications for VIP events

---

## 📞 Support

Questions? Check:
- Serper docs: https://serper.dev/docs
- Tavily docs: https://docs.tavily.com
- GHL API: https://highlevel.stoplight.io/docs/integrations

---

**Built by:** DaySaw.agency + Gemini Collaboration  
**Date:** April 13, 2026  
**Version:** v7.1 (Event Scraper Enhancement)
