---
name: gdb-publisher
description: Run and debug the Good Day Bend Publisher agent for daily updates
allowed-tools:
  - "Bash"
  - "Read"
  - "Write"
---

# Good Day Bend Publisher Skill

Run and debug the Publisher agent which creates daily content (blog, email, social, SMS).

## Quick Start

```bash
cd /Users/md/Documents/Good-Day-Bend-v7-Test
source .env
python3 agent/test_publisher.py [DATE]
```

**Example:** `python3 agent/test_publisher.py 2026-01-30`

## What Publisher Creates

| Output | Collection | Description |
|--------|------------|-------------|
| Blog Post | `articles` | Daily update with event headliners |
| Email Newsletter | Drafts | High-fidelity HTML for GoHighLevel |
| Social Caption | Drafts | Instagram-ready copy |
| SMS Message | Drafts | Short event teaser |

## Expected Output

After a successful run, you should see:
- ✅ Vibe analysis (e.g., "Melodic Midweek")
- ✅ Hero image URL (Imagen 4)
- ✅ Blog draft URL
- ✅ Email draft URL
- ✅ Social draft URL

## Debugging Common Issues

### No Events Found
- Check Scout ran first: `python3 agent/test_scout.py [DATE]`
- Verify events in Firestore `events` collection

### Image Generation Failed
- Check `GOOGLE_CLOUD_PROJECT` is set in `.env`
- Verify Imagen 4 API is enabled in Google Cloud

### Empty Output
- Check Gemini API quota
- Review error logs for model response issues

## Files Involved

- `agent/publisher.py` - Main agent (StrategyAgent, WriterAgent, SocialAgent)
- `agent/config.py` - Model settings, sponsors, sources
- `agent/image_generation.py` - Imagen 4 integration
