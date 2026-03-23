---
name: gdb-deploy
description: Deploy Good Day Bend v7 to Firebase production
allowed-tools:
  - "Bash"
  - "Read"
  - "Write"
---

# Good Day Bend Deploy Skill

Deploy the v7 project to Firebase Hosting and verify all endpoints.

## Quick Deploy

```bash
cd /Users/md/Documents/Good-Day-Bend-v7-Test
firebase deploy --only hosting
```

## Full Deploy (Hosting + Functions)

```bash
firebase deploy
```

## Pre-Deploy Checklist

1. **Environment Check**
   ```bash
   source .env
   echo $GOOGLE_CLOUD_PROJECT  # Should be: good-day-bend-v7-test
   ```

2. **Local Test**
   ```bash
   firebase serve --only hosting
   # Visit http://localhost:5000
   ```

3. **Verify Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

## Post-Deploy Verification

| Endpoint | URL |
|----------|-----|
| Homepage | https://good-day-bend-v7-test.web.app/ |
| Dashboard | https://good-day-bend-v7-test.web.app/v7test/dashboard.html |
| Blog | https://good-day-bend-v7-test.web.app/v7test/blog.html |

## Production (Live Site)

The live site at **gooddaybend.com** is served via GoHighLevel with a Universal Loader that pulls content from the Firebase-hosted site.

## Rollback

```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL TARGET_SITE_ID:live
```

## Files Involved

- `firebase.json` - Hosting configuration
- `firestore.rules` - Security rules
- `.firebaserc` - Project aliases
