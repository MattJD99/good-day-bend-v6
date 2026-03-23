---
name: gdb-scout
description: Run and debug the Good Day Bend Scout agent for event discovery
allowed-tools:
  - "Bash"
  - "Read"
  - "Write"
---

# Good Day Bend Scout Skill

Run and debug the Scout agent which discovers local events from 17+ venue sources.

## Quick Start

```bash
cd /Users/md/Documents/Good-Day-Bend-v7-Test
source .env
python3 agent/test_scout.py [DATE]
```

**Example:** `python3 agent/test_scout.py 2026-01-30`

## What Scout Does

1. Scrapes event calendars from trusted sources (config.py `TRUSTED_SOURCES`)
2. Extracts event details using Gemini Vision
3. Deduplicates and validates events
4. Saves to Firestore `events` collection

## Sources Scraped

**Venues:** McMenamins, Tower Theatre, Silver Moon, Midtown Ballroom, Volcanic Theatre, River's Place, Mt. Bachelor, etc.

**Aggregators:** Visit Bend, KTVZ, Bend Magazine, Central Oregon Daily

## Expected Output

- ✅ Number of events found (e.g., "Found 12 events for Jan 30")
- ✅ Event titles and venues
- ✅ Firestore document IDs

## Debugging Common Issues

### No Events Found
- Check if date is too far in future (limit to 14 days)
- Verify source URLs are still valid in `config.py`

### Timeout Errors
- Some venue sites may be slow; increase timeout in scout.py
- Try running for a single source to isolate issue

### API Rate Limits
- Gemini has quota limits; wait and retry
- Check Google Cloud Console for quota status

## Files Involved

- `agent/scout.py` - Main Scout agent
- `agent/config.py` - `TRUSTED_SOURCES` list
