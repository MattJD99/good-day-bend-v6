# Project Context: Good Day Bend v9

## The Situation
1. **v6 Status:** The v6 architecture worked great. The frontend was solid, events displayed correctly, and the GoHighLevel (GHL) email format was exactly what we wanted.
2. **v7 Status:** We moved to an "agentic" flow for v7, which caused several major regressions:
   - The frontend fell apart.
   - Placeholder images were used instead of real event cover photos.
   - Pinned/featured events and general event fetching broke (not many events showing).
   - The email format changed for the worse and no longer met our needs.
3. **v9 Objective:** We are now establishing **v9** as the definitive Path Forward. We want to preserve the powerful "agentic" data-gathering capabilities (Scout/Publisher) built recently, but we **MUST** graft them onto the proven, working frontend UI and GHL email templates from **v6**.

## Agentic Mandate (Overnight Instructions)
Your goal as the autonomous agent is to stabilize v9 by reverting the broken downstream pieces while keeping the new upstream data pipelines.

**Immediate Priorities for the Agent:**
1. **Frontend Restoration:** Review the `/public` directory (HTML/JS/CSS). It needs to look and function exactly like v6. Ensure that the dynamic rendering logic (e.g. `dynamic-content.js` or `init.js`) pulls from the new Firestore schema properly WITHOUT falling back to placeholder images. Fix the image paths so real scouted images are used.
2. **Email Template Restoration:** Locate the GHL email dispatch logic (likely in the Cloud Functions or Python publisher scripts). Revert the HTML payload and workflow triggers to exactly match the working v6 format. It must include duplicate-post protections and the precise layout from v6.
3. **Event Population:** Verify that the new Python-based Scout agents (`/backend/agent/`) are legitimately storing full event data into Firestore and that the frontend is actually displaying all of them, not just a handful. 

## Codebase Details
- **Location:** `/Users/md/Documents/Good-Day-Bend-v9`
- **Branch:** `v9-production`
- **Known Working Reference:** The user has the working v6 codebase locally (likely in `/Users/md/Documents/Good-Day-Bend-v7-Test` or similar previous folders) which you can ask the user to provide if you need the exact v6 `index.html` or `ghl.py` template.

*Do not overhaul the entire codebase. Focus specifically on reconnecting the new agentic data scraper outputs to the robust v6 frontend and email systems.*
