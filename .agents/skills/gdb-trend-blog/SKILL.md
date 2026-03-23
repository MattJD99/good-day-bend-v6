---
name: gdb-trend-blog
description: Run and debug the Good Day Bend Trend Blog agent for SEO articles
allowed-tools:
  - "Bash"
  - "Read"
  - "Write"
---

# Good Day Bend Trend Blog Skill

Run and debug the Trend Blog agent which creates SEO-optimized articles on trending local topics.

## Quick Start

```bash
cd /Users/md/Documents/Good-Day-Bend-v7-Test
source .env
python3 agent/test_trend_blog.py
```

## What Trend Blog Does

1. Researches trending topics for Bend, Oregon (Google Trends + Gemini)
2. Checks for duplicate topics (avoids repeating recent articles)
3. Generates infographic-style HTML article
4. Creates hero image with Art Director pattern
5. Saves to Firestore `blogs` collection

## Topic Queue

Pre-defined topics in `config.py` → `BLOG_TOPICS_QUEUE`:
- Non-Alcoholic Beer & Mocktails
- Best Hiking Trails
- Family-Friendly Activities
- Craft Beer Scene
- Best Coffee Shops

## Expected Output

- ✅ Topic selected (e.g., "Mt. Bachelor Powder Alert!")
- ✅ Article title and SEO keywords
- ✅ Hero image URL (Imagen 4)
- ✅ Firestore document ID

## Debugging Common Issues

### Duplicate Topic Error
- Recent articles are checked to avoid repeats
- Add new topics to `BLOG_TOPICS_QUEUE` in config.py

### Image Generation Failed
- Check Art Director prompt is reasonable length
- Verify Imagen 4 API is enabled

## Files Involved

- `agent/trend_blog.py` - Main agent (TrendResearchAgent, ArtDirectorAgent, BlogWriterAgent)
- `agent/trends_research.py` - Google Trends API (pytrends)
- `agent/config.py` - `BLOG_TOPICS_QUEUE`
