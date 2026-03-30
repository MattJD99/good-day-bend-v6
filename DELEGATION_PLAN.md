# 📋 Delegation Plan - Good Day Bend v9
**CEO:** Claw-E-O | **Date:** March 26, 2026

---

## 🚨 IMMEDIATE ACTION REQUIRED

### Task 1.1: Firebase Credentials Setup
**Assigned to:** GDB-Deploy  
**Priority:** 🔴 CRITICAL (blocks all other work)  
**ETA:** 2 hours

**Instructions:**
1. Generate Firebase service account key for `good-day-bend-v6` project
2. Save as `firebase-service-account.json` in project root (add to .gitignore)
3. Add to `.env`:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
   ```
4. Test connection:
   ```bash
   cd /Users/daysawagency/.openclaw/workspace/repos/good-day-bend-v6
   node verify_firestore_data.js
   ```
5. Report back when scout agent can successfully write to Firestore

**Success Criteria:**
- ✅ `python3 agent/test_scout.py 2026-03-26 1` completes without credential errors
- ✅ Events visible in Firestore console for March 26, 2026

---

## 📅 TODAY'S MISSIONS (March 26)

### Task 2.1: Scout Mission - March 26-28
**Assigned to:** GDB-Scout  
**Priority:** 🟡 HIGH  
**ETA:** 4 hours (after Firebase setup complete)

**Instructions:**
1. Wait for GDB-Deploy to confirm Firebase credentials working
2. Run scout for 3 days:
   ```bash
   python3 agent/test_scout.py 2026-03-26 3
   ```
3. Monitor output for:
   - ✅ "Using google-generativeai SDK with API key"
   - ✅ "✅ Extracted X events" per date
   - ✅ "💾 Saved X events" per date
4. Verify in Firestore console:
   - Navigate to `events` collection
   - Check documents for dates 2026-03-26, 2026-03-27, 2026-03-28
   - Spot-check 2-3 events for accuracy (venue names, times)

**Expected Output:**
- 15-30 events total across 3 days
- No duplicate events
- Accurate venue information

**Report Back:**
- Total events scouted per date
- Any errors or warnings encountered
- Screenshot of Firestore events collection

---

### Task 2.2: Scout Mission - March 29 - April 5
**Assigned to:** GDB-Scout  
**Priority:** 🟡 HIGH  
**ETA:** 6 hours (after Task 2.1 complete)

**Instructions:**
1. Run scout for 7 days:
   ```bash
   python3 agent/test_scout.py 2026-03-29 7
   ```
2. Same monitoring as Task 2.1
3. Watch for date accuracy (ensure events match correct dates)

**Expected Output:**
- 35-70 events total across 7 days
- Weekend (Mar 28-29) should have more events than weekdays

---

### Task 3.1: GHL Integration Test
**Assigned to:** GDB-Publisher  
**Priority:** 🟡 HIGH  
**ETA:** 3 hours (can run parallel to Scout missions)

**Instructions:**
1. Update `.env` with real GHL credentials:
   ```bash
   GHL_API_KEY=<actual_jwt_token>
   GHL_LOCATION_ID=<actual_location_id>
   ```
2. Test GHL connection:
   ```bash
   python3 -c "from agent.ghl import GHLClient; ghl = GHLClient(); print('✅ GHL connected' if ghl else '❌ GHL failed')"
   ```
3. Send test email to `mdesautel@gmail.com`:
   ```bash
   python3 -c "
   from agent.ghl import GHLClient
   ghl = GHLClient()
   contact_id = ghl.upsert_contact('mdesautel@gmail.com', 'Matt', 'Test')
   if contact_id:
       ghl.send_email(contact_id, 'GHL Test', '<h1>Test Email</h1><p>If you see this, GHL is working!</p>')
       print('✅ Test email sent')
   else:
       print('❌ Failed to create contact')
   "
   ```

**Success Criteria:**
- ✅ Contact created/updated in GHL
- ✅ Test email received at mdesautel@gmail.com
- ✅ No API errors in console

---

## 📅 TOMORROW'S MISSIONS (March 27)

### Task 4.1: Publisher Test Run
**Assigned to:** GDB-Publisher  
**Priority:** 🟡 HIGH  
**ETA:** 4 hours (after Scout missions complete + GHL working)

**Instructions:**
1. Verify database has 10+ events for March 27:
   ```bash
   # Check Firestore console or run:
   node -e "
   const admin = require('firebase-admin');
   admin.initializeApp();
   const db = admin.firestore();
   db.collection('events').where('eventDate', '==', '2026-03-27').get().then(snap => {
     console.log('Events for Mar 27:', snap.size);
   });
   "
   ```
2. Run publisher:
   ```bash
   python3 agent/test_publisher.py 2026-03-27
   ```
3. Monitor for:
   - ✅ "Found X events"
   - ✅ "Vibe: [creative vibe name]"
   - ✅ "Generated X chars of HTML"
   - ✅ "Hero image generated"
   - ✅ "Approval email sent to mdesautel@gmail.com"
4. Check email inbox for approval email with:
   - Blog preview link
   - Email preview link
   - Social preview link
   - Approve/Keep buttons

**Success Criteria:**
- ✅ Draft created in Firestore `drafts` collection
- ✅ Approval email received with working preview links
- ✅ HTML format matches v6 template style

---

### Task 5.1: Frontend Validation
**Assigned to:** Cody Coder  
**Priority:** 🟢 MEDIUM  
**ETA:** 3 hours

**Instructions:**
1. Start local Firebase emulator or deploy to staging:
   ```bash
   firebase emulators:start
   # OR
   firebase deploy --only hosting:staging
   ```
2. Test homepage (`/`):
   - [ ] Favorites container shows 4 random businesses
   - [ ] Featured events display correctly
   - [ ] No broken images (check for dark green fallbacks)
   - [ ] Mobile view responsive
3. Test calendar page (`/calendar.html`):
   - [ ] Month navigation works (← →)
   - [ ] Events display on correct dates
   - [ ] Click event → shows details modal
   - [ ] "Add to Calendar" buttons work
4. Check browser console for errors:
   ```bash
   # In Chrome DevTools Console:
   # Should have NO red errors
   ```

**Report Back:**
- List of any bugs found
- Screenshots of homepage + calendar
- Lighthouse scores (Performance, Accessibility, SEO)

---

### Task 6.1: SEO Blog Article #1
**Assigned to:** GDB-Trend-Blog  
**Priority:** 🟢 MEDIUM  
**ETA:** 4 hours

**Instructions:**
1. Generate first SEO article:
   ```bash
   python3 agent/trend_blog.py --topic "Non-Alcoholic Beer & Mocktails in Bend, Oregon"
   ```
2. Review generated content:
   - [ ] 1500+ words
   - [ ] Includes local business mentions
   - [ ] Has internal links to calendar
   - [ ] SEO meta description included
3. Publish to Firestore `blog_articles` collection
4. Deploy to `/blog/non-alcoholic-beer-bend` route

**Success Criteria:**
- ✅ Article generated with high-quality content
- ✅ Published and accessible via URL
- ✅ SEO metadata properly configured

---

## 📋 QUALITY CONTROL CHECKLIST

### Before Each Scout Mission
- [ ] Firebase credentials working
- [ ] GEMINI_API_KEY set in .env
- [ ] Test run on 1 date successful

### Before Publisher Run
- [ ] 10+ events in database for target date
- [ ] GHL integration tested
- [ ] Admin email verified

### Before Deployment
- [ ] All pages render without errors
- [ ] Mobile responsiveness confirmed
- [ ] No console errors
- [ ] Publisher email workflow tested
- [ ] Rollback plan documented

---

## 🔄 FEEDBACK LOOPS

### Daily Standup Template (Discord #good-day-bend)
```
📊 Daily Standup - [DATE]
**Agent:** [Name]
**Yesterday:** [What was accomplished]
**Today:** [What will be done]
**Blockers:** [Any issues preventing work]
**ETA:** [When current task will be done]
```

### Milestone Complete Template
```
✅ MILESTONE COMPLETE: [Name]
**Agent:** [Name]
**Time:** [Timestamp]
**Results:** [Key metrics/outcomes]
**Evidence:** [Screenshot/link]
**Next:** [What happens next]
```

### Blocker Alert Template
```
🚨 BLOCKER ALERT
**Agent:** [Name]
**Issue:** [What's blocked]
**Impact:** [What can't proceed]
**Need:** [What's required to unblock]
**Urgency:** [High/Medium/Low]
```

---

## 📞 ESCALATION PATH

1. **Agent → CEO (Claw-E-O):** Tag in Discord for task reassignment or priority changes
2. **CEO → User (Matt):** Tag @Matt for approvals, credential access, or strategic decisions
3. **Emergency:** Direct message @Matt for production issues or data loss

---

**Delegation Plan Created:** March 26, 2026 1:35 AM PDT  
**CEO:** Claw-E-O 🤖  
**Status:** READY FOR EXECUTION
