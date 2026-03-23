# Project Context: Good Day Bend v9 (Updated Mar 23, 2026)

## Current Status (v9-production)
1. **Frontend**: Stabilized. Image fallback logic is fixed in `calendar.js` and `dynamic-content.js`. Any event with a missing/empty image string will now show a branded dark green placeholder instead of a blank space. Calendar month navigation is working.
2. **Scout Agent**: Patched. The Python scout agent (`agent/scout.py`) now uses the `google-generativeai` SDK with the `GEMINI_API_KEY` directly (fixing the previous Vertex AI 404 error).
3. **Database**: The Firestore `events` collection has confirmed data up to March 14, 2026. The `favorites` collection is fully populated with real business data.
4. **Blocker**: The **Serper.dev** API credits are currently depleted (Status: 400). This prevents the scout from finding new events online.

## Overnight Mandate (OpenClaw Instructions)
Your goal is to continue the data-population phase for v9 while the user sleeps.

**Immediate Tasks:**
1. **Refill Search Data**: The `scout.py` agent needs a working search API to find fresh events. 
   - Check if the user provided a new `GOOGLE_SEARCH_API_KEY` in `.env`.
   - If search remains blocked, explore fallback methods or manually add high-value events for late March / April 2026 if requested.
2. **Run Scout Mission**: Once search is restored, run `python3 agent/test_scout.py YYYY-MM-DD` for today and the next 14 days to populate the calendar with fresh events.
3. **Email Verification**: Review the `agent/publisher.py` (which handles the GHL email triggers). Ensure it follows the v6 HTML template format and includes the duplicate-post protection logic the user requested.
4. **Local Favorites**: Ensure the homepage `favorites-container` is displaying 4 random highlights from the `favorites` Firestore collection on every refresh (already implemented in `dynamic-content.js`).

## Tech Details
- **Location:** `/Users/md/Documents/Good-Day-Bend-v9`
- **Primary Branch:** `v9-production`
- **Key Files:** 
  - `agent/scout.py` (Event discovery)
  - `agent/publisher.py` (GHL email dispatch)
  - `public/dynamic-content.js` (Homepage rendering)
  - `public/calendar.js` (Full calendar page)

*Focus on populating the database with high-quality events and ensuring the GHL email output is identical to the successful v6 format.*
