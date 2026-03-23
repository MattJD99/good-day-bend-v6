---
name: gdb-carousel
description: Generate and schedule the weekly Instagram carousel post
allowed-tools:
  - "Bash"
  - "Read"
  - "Write"
---

# Good Day Bend Weekly Carousel Skill

Generate the weekly Instagram carousel post showing events for each day of the upcoming week.

## Quick Start (Preview Only)

```bash
cd /Users/md/Documents/Good-Day-Bend-v7-Test
source .env
python3 agent/test_carousel.py
```

**This generates preview images in `/tmp/carousel_preview_YYYY-MM-DD/`**

## Generate for Specific Week

```bash
python3 agent/test_carousel.py 2026-02-03  # Monday date
```

## Actually Schedule to GHL

```bash
python3 agent/test_carousel.py 2026-02-03 --schedule
```

⚠️ Only use `--schedule` when you're ready to post!

## What It Creates

| Slide | Content |
|-------|---------|
| 1-7 | Daily event listings (Mon-Sun) |
| 8 | CTA: "like, comment, share & save" |

## Output Location

- **Preview images:** `/tmp/carousel_preview_YYYY-MM-DD/`
- **GHL:** Marketing → Social Planner (when scheduled)

## Requirements

- Events in Firestore `events` collection for the week
- GHL API key and Location ID in `.env`
- Instagram connected in GHL Social Planner

## Files Involved

- `agent/carousel_generator.py` - Image generation (Pillow)
- `agent/carousel_agent.py` - Main orchestrator
- `agent/ghl.py` - GHL social post API

## Debugging

### No events showing
```bash
# Check if Scout has run for the week
python3 agent/test_scout.py 2026-02-03
```

### Images look wrong
- Check fonts are available on system
- Preview images saved in `/tmp/` - open and inspect

### GHL scheduling failed
- Verify `GHL_API_KEY` is set in `.env`
- Check Instagram is connected in GHL → Social Planner
