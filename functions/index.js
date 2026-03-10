const scout = require('./workflows_v2/scout_v2.js');  // v2 Upgrade
const publisher = require('./workflows_v2/publisher_v2.js'); // v2 Upgrade
const feedback = require('./workflows_v2/feedback.js');      // v2 Upgrade

const blog = require('./workflows/trend_blog_v3.js'); // V3 UPGRADE
const opal = require('./workflows/opal.js');

async function runDailyFlow() {
    console.log("🚀 Starting Unified Daily Flow...");
    try {
        console.log("--- Step 1: The Scout (Gathering Events) ---");
        await scout();

        console.log("--- Step 2: The Publisher (Creating Content) ---");
        await publisher();

        console.log("✅ Unified Flow Complete.");
    } catch (e) {
        console.error("Daily Flow Failed:", e);
    }
}

// HTTP Entry Point for Cloud Functions
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

// Set default region
setGlobalOptions({ region: "us-central1" });

exports.main = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.end();
        return;
    }

    console.log("🚀 Triggered via HTTP");

    // Check query param ?type=daily or ?type=trend
    // Access query from req.query directly
    const type = req.query.type || 'daily';

    try {
        if (type === 'trend') {
            await blog();
            res.send("✅ Trend Blog Flow Complete");
        } else if (type === 'opal') {
            const date = req.query.date; // Optional date param
            await opal(date);
            await opal(date);
            res.send("✅ Opal Workflow Complete");
        } else if (type === 'scout') {
            const days = req.query.days;
            await scout(days);
            res.send("✅ Scout Mission Complete");
        } else if (type === 'scout_deep') {
            const date = req.query.date;
            await require('./workflows/scout_deep_v3.js')(date); // V3 UPGRADE
            res.send("🧠 Scout V2 (Deep Research) Mission Complete");
        } else if (type === 'scout_trends') {
            await require('./workflows/scout_trends_v2.js')();
            res.send("🔍 Trend Scout V2 (Grounded Search) Mission Complete");
        } else if (type === 'test_welcome') {
            // Test welcome email - sends to admin email only
            const ghl = require('./lib/ghl');
            const sendWelcomeEmail = require('./workflows/welcome_email');

            // Get or create test contact
            const testContact = await ghl.upsertContact({
                email: 'mdesautel@gmail.com',
                firstName: 'MJ',
                lastName: 'Test',
                tags: ['Newsletter', 'Test']
            });

            // Send welcome email in TEST mode
            const result = await sendWelcomeEmail(
                testContact.contact.id,
                'mdesautel@gmail.com',
                'MJ',
                true // TEST MODE
            );

            if (result.success) {
                res.send(`✅ [TEST] Welcome email sent to ${result.email}`);
            } else {
                res.status(500).send(`❌ Failed: ${result.error}`);
            }
        } else if (type === 'publisher') {
            const date = req.query.date;
            await publisher(date);
            res.send("✅ Publisher Mission Complete");
        } else if (type === 'submit_form') {
            const { db } = require('./lib/firebase');
            const ghl = require('./lib/ghl');
            const data = req.body;

            console.log("📩 Form Submission Received:", data);

            // 1. Save to Firestore for redundancy
            await db.collection('submissions').add({
                ...data,
                receivedAt: new Date(),
                status: 'pending',
                isFeaturedCandidate: true // [FEATURED AGENT] Flag for upcoming events
            });

            // 2. Notification Pipeline
            try {
                // A. Upsert Lead (The person who filled the form)
                const bizName = data.bizName || data.eventName || data.name || "Anonymous";
                const leadPayload = {
                    email: data.email || data.submitterEmail || "no-email@provided.com",
                    firstName: bizName,
                    lastName: " (Form Submission)",
                    tags: ["Website Form", data.formType || "General"],
                    customFields: [
                        { key: 'submission_data', value: JSON.stringify(data) }
                    ]
                };
                await ghl.upsertContact(leadPayload);

                // B. Notify Admin (MJ) via GHL Email
                const adminEmail = "mdesautel@gmail.com";
                const adminContact = await ghl.upsertContact({
                    email: adminEmail,
                    firstName: "MJ",
                    lastName: "Admin",
                    tags: ["admin"]
                });

                const emailBody = `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                        <h2 style="color: #0d1b12;">New Website Submission: ${data.formType || 'General'}</h2>
                        <p><strong>From:</strong> ${bizName} (${leadPayload.email})</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <pre style="background: #f8fafc; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</pre>
                        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">GDB v6 automated notification</p>
                    </div>
                `;

                await ghl.sendEmail({
                    contactId: adminContact.contact.id,
                    email: adminEmail,
                    subject: `[Form Submission] ${data.formType || 'New Lead'}: ${bizName}`,
                    message: "A new form was submitted on the website.",
                    html: emailBody
                });

                console.log(`✅ Email notification sent to ${adminEmail}`);
            } catch (e) {
                console.warn("⚠️ Notification pipeline partially failed:", e.message);
            }

            res.send("✅ Form submitted successfully");
        } else if (type === 'sms_broadcast') {
            /** 
             * SMS BROADCAST HANDLER
             * Triggers GHL Workflow to send SMS to list
             */
            const { draftId, message } = req.query;
            const { db } = require('./lib/firebase');
            const ghl = require('./lib/ghl');
            const CONFIG = require('./config');

            if (!draftId || !message) return res.send("❌ Missing draftId or message");

            try {
                // 1. Trigger Workflow
                if (CONFIG.SMS_WORKFLOW_ID && CONFIG.SMS_WORKFLOW_ID !== "REPLACE_WITH_YOUR_SMS_WORKFLOW_ID") {
                    await ghl.triggerWorkflow(CONFIG.SMS_WORKFLOW_ID, {
                        draftId: draftId,
                        message: message
                    });
                    // 2. Mark as sent in Firestore
                    await db.collection('drafts').doc(draftId).update({
                        smsSentAt: new Date().toISOString(),
                        smsStatus: 'broadcast_triggered'
                    });

                    res.send(`
                        <body style="font-family:sans-serif; text-align:center; background:#0d1b12; color:#13ec5b; padding:50px;">
                            <h1 style="font-size:3rem;">📲 SMS Blasted!</h1>
                            <p style="font-size:1.5rem; color:white;">Broadcast workflow triggered for GHL.</p>
                            <p style="opacity:0.6;">Message: "${message}"</p>
                        </body>
                    `);
                } else {
                    res.send(`
                        <body style="font-family:sans-serif; text-align:center; background:#0d1b12; color:orange; padding:50px;">
                            <h1 style="font-size:3rem;">⚠️ Config Missing</h1>
                            <p style="font-size:1.5rem; color:white;">SMS_WORKFLOW_ID is not set in config.js.</p>
                        </body>
                    `);
                }

            } catch (e) {
                console.error("SMS Broadcast Failed:", e);
                res.status(500).send("Error triggering SMS workflow: " + e.message);
            }

        } else if (type === 'subscribe') {
            // Newsletter subscription with welcome email
            const ghl = require('./lib/ghl');
            const sendWelcomeEmail = require('./workflows/welcome_email');
            const { email, firstName, lastName } = req.body;

            if (!email) {
                return res.status(400).send("Email is required");
            }

            const payload = {
                email,
                firstName: firstName || "",
                lastName: lastName || "",
                tags: ["Newsletter"],
                customFields: [
                    { key: 'signup_date', value: new Date().toISOString() },
                    { key: 'signup_source', value: 'website' }
                ]
            };

            try {
                // Create/update contact in GHL
                const contactResult = await ghl.upsertContact(payload);
                const contactId = contactResult.contact.id;

                // Send welcome email (TEST MODE = true for now)
                const testMode = true; // Set to false when ready for production
                await sendWelcomeEmail(contactId, email, firstName, testMode);

                console.log(`✅ Newsletter signup complete for ${email}`);
                res.send("✅ Subscribed successfully");
            } catch (error) {
                console.error("Newsletter signup error:", error);
                res.status(500).send("Error processing subscription");
            }
        } else if (type === 'review_action') {
            /**
             * REVIEW ACTION HANDLER
             * Handles "Approve" (Publish) or "Keep" (Archive) clicks from Draft Emails
             */
            const { action, draftId } = req.query;
            const { db } = require('./lib/firebase');
            const ghl = require('./lib/ghl');

            if (!draftId) return res.send("❌ Error: Missing draftId");

            const draftRef = db.collection('drafts').doc(draftId);
            const doc = await draftRef.get();

            if (!doc.exists) return res.send("❌ Error: Draft not found. It may have expired.");

            const data = doc.data();

            if (action === 'approve') {
                if (data.status === 'published') return res.send("✅ Already Published! You're good to go.");

                // Sanitize undefined fields to prevent Firestore errors
                const finalSocialCaption = data.socialCaption || data.social_caption || "";

                // 1. Publish to GHL Blog
                console.log(`🚀 Publishing Draft ${draftId} to GHL...`);
                try {
                    await ghl.createBlogPost({
                        title: data.title || data.blog_title || data.topic_summary,
                        body: data.rawHTML || data.blog_html,
                        imageUrl: data.imageUrl,
                        categories: ["Daily Pulse", "Bend News"],
                        tags: ["auto-generated", "v6-verified"]
                    });
                } catch (e) {
                    console.error("GHL Publish Failed", e);
                }

                // 2. Publish to Firestore (Route based on draft type)
                const publishData = {
                    title: data.title || data.blog_title || data.topic_summary,
                    content: data.rawHTML || data.blog_html,
                    html: data.rawHTML || data.blog_html,
                    image: data.imageUrl,
                    imageUrl: data.imageUrl,
                    socialCaption: finalSocialCaption,
                    publishedAt: new Date(),
                    source: 'v6_approval_fixed'
                };

                // Route to correct collection based on draft type
                let targetCollection = 'daily_updates'; // default
                if (data.type === 'trend' || data.type === 'trend_blog') {
                    targetCollection = 'articles';
                } else if (data.type === 'blog') {
                    targetCollection = 'articles';
                }

                console.log(`📦 Publishing to collection: ${targetCollection} (draft type: ${data.type})`);
                await db.collection(targetCollection).add(publishData);

                // 3. Mark as Published
                await draftRef.update({ status: 'published', publishedAt: new Date().toISOString() });

                // [FEATURED AGENT] 3b. Trigger Email Broadcast (If Configured)
                const CONFIG = require('./config');
                if (CONFIG.EMAIL_WORKFLOW_ID && CONFIG.EMAIL_WORKFLOW_ID !== "REPLACE_WITH_YOUR_EMAIL_WORKFLOW_ID") {
                    try {
                        console.log("📧 Triggering Email Broadcast Workflow...");
                        await ghl.triggerWorkflow(CONFIG.EMAIL_WORKFLOW_ID, {
                            draftId: draftId,
                            title: data.title,
                            // Assuming the new doc ID in daily_updates matches the draft ID or we need to query it? 
                            // Actually, we just added it to a collection but didn't get the ID easily in v6 without a ref. 
                            // The 'add' result is not captured in the original code snippet (await db.collection...).
                            // Let's just pass the draftId for now, the email workflow might just need the content.
                            vibe: data.vibe || "Daily Update"
                        });
                        console.log("✅ Email Broadcast Triggered.");
                    } catch (err) {
                        console.error("⚠️ Email Broadcast Trigger Failed:", err.message);
                    }
                }

                // 4. Return Success Page
                res.send(`
                    <body style="font-family:sans-serif; text-align:center; background:#0d1b12; color:#13ec5b; padding:50px;">
                        <h1 style="font-size:3rem;">🚀 Blastoff!</h1>
                        <p style="font-size:1.5rem; color:white;">Daily Update has been <strong>PUBLISHED</strong> to the website and app.</p>
                        <p style="opacity:0.6;">Draft ID: ${draftId}</p>
                        ${CONFIG.EMAIL_WORKFLOW_ID ? '<p style="font-size:0.9rem; color:#888;">📧 Email Broadcast Triggered</p>' : ''}
                    </body>
                `);

            } else if (action === 'approve_social') {
                // SOCIAL HANDOFF & AUTO-POST ATTEMPT
                const caption = data.socialCaption || "Check out the latest update!";
                const { LOCATION_ID } = require('./config');
                const ghlUrl = `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/marketing/social-planner/`;

                let autoPostError = null;
                let accounts = [];

                try {
                    // 1. Try to fetch connected accounts
                    const accountsData = await ghl.getSocialAccounts();
                    // accountsData might be an array or object. Based on typical v2, it's response.data.accounts or response.data.
                    accounts = Array.isArray(accountsData) ? accountsData : (accountsData.accounts || []);

                    if (accounts.length > 0) {
                        const accountIds = accounts.map(a => a.id || a.accountId); // Determine correct ID field

                        console.log(`📱 Posting to ${accounts.length} social accounts...`);

                        // 2. Create Draft Post
                        await ghl.createSocialPost({
                            accountIds: accountIds,
                            content: caption,
                            media: [{ url: data.imageUrl }],
                            status: 'DRAFT' // Attempting to set as Draft
                        });

                        // Success!
                        return res.send(`
                            <body style="font-family:sans-serif; text-align:center; background:#0d1b12; color:#13ec5b; padding:50px;">
                                <h1 style="font-size:3rem;">📱 Sent to Planner!</h1>
                                <p style="font-size:1.5rem; color:white;">Social Draft has been pushed to GHL Social Planner.</p>
                                <a href="${ghlUrl}" target="_blank" style="color:white; text-decoration:underline;">Open Social Planner</a>
                            </body>
                        `);
                    } else {
                        autoPostError = "No connected social accounts found in GHL.";
                    }
                } catch (e) {
                    console.error("Auto-Post Failed:", e);
                    autoPostError = "API Error: " + e.message;
                }

                // FALLBACK: Copy & Go Page
                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family:sans-serif; text-align:center; background:#f0f9ff; color:#333; padding:20px;">
                        <h1>📱 Social Handoff</h1>
                        ${autoPostError ? `<div style="color:orange; margin-bottom:10px;">⚠️ Automated Draft Failed: ${autoPostError}</div>` : ''}
                        <p>Falling back to manual copy:</p>
                        
                        <div style="background:white; padding:20px; border-radius:8px; border:1px solid #ccc; max-width:600px; margin:20px auto; text-align:left;">
                            <img src="${data.imageUrl}" style="max-width:100%; border-radius:8px; margin-bottom:15px;">
                            <textarea id="caption" style="width:100%; height:150px; padding:10px; border:1px solid #ddd; border-radius:4px;">${caption}</textarea>
                        </div>

                        <button onclick="copyAndGo()" style="background:#1877F2; color:white; font-size:18px; padding:15px 30px; border:none; border-radius:50px; cursor:pointer; font-weight:bold;">
                            📋 Copy Caption & Open GHL Planner
                        </button>

                        <script>
                            function copyAndGo() {
                                var copyText = document.getElementById("caption");
                                copyText.select();
                                document.execCommand("copy");
                                // Open GHL in new tab
                                window.open('${ghlUrl}', '_blank');
                                document.body.innerHTML += '<p style="color:green; font-weight:bold; margin-top:20px;">✅ Copied! Opening GHL...</p>';
                            }
                        </script>
                    </body>
                    </html>
                 `);

            } else if (action === 'keep') {
                await draftRef.update({ status: 'saved' });
                res.send(`
                    <body style="font-family:sans-serif; text-align:center; background:#F8FAFC; color:#0d1b12; padding:50px;">
                        <h1 style="font-size:3rem;">📂 Saved.</h1>
                        <p style="font-size:1.5rem;">Draft has been kept in the archives for later.</p>
                    </body>
                `);
            } else {
                res.send("❓ Unknown Action");
            }

        } else {
            // Default to daily
            await runDailyFlow();
            res.send("✅ Daily Flow Complete");
        }
    } catch (e) {
        console.error("Flow Failed:", e);
        res.status(500).send("Error encountered: " + e.message);
    }
});

// CLI Entry Point logic
async function runCLI() {
    const args = process.argv.slice(2);

    if (args.includes('trend')) {
        await blog();
    } else if (args.includes('daily')) {
        await runDailyFlow();
    } else {
        console.log("Usage: node index.js [daily | trend]");
        // Default run for convenience
        console.log("Running Daily Flow by default...");
        await runDailyFlow();
    }
}

// Check if running directly via Node (CLI)
if (require.main === module) {
    runCLI();
}

exports.runDailyFlow = runDailyFlow;
exports.blog = blog;
exports.opal = opal;
exports.scout = scout;
exports.publisher = publisher;

const { onSchedule } = require("firebase-functions/v2/scheduler");


// Scheduled Tasks
// 1. Daily Quick Scan (Mon-Sat): Look 2 Days Ahead (Today + Tomorrow)
exports.dailyQuickScout = onSchedule({
    schedule: "every mon,tue,wed,thu,fri,sat 03:00",
    timeoutSeconds: 1800, // 30 min (max for scheduled)
    region: "us-central1",
    timeZone: "America/Los_Angeles"
}, async (event) => {
    console.log("⏰ Daily Quick Scout Triggered (2 Days)");
    await scout(2);
});

// 2. Weekly Big Scan (Sunday): Look 14 Days Ahead
exports.weeklyBigScout = onSchedule({
    schedule: "every sunday 03:00",
    timeoutSeconds: 1800, // 30 min (max for scheduled)
    region: "us-central1",
    timeZone: "America/Los_Angeles"
}, async (event) => {
    console.log("⏰ Weekly Big Scout Triggered (14 Days)");
    await scout(14);
});

exports.dailyPublisher = onSchedule({
    schedule: "every day 07:00",
    timeoutSeconds: 540,
    region: "us-central1",
    timeZone: "America/Los_Angeles"
}, async (event) => {
    console.log("⏰ Daily Publisher Triggered");
    await publisher();
});

// exports.dailyTrend = onSchedule({ schedule: "every day 05:00", timeoutSeconds: 540, region: "us-central1" }, async (event) => {
//     console.log("⏰ Daily Trend Blog (Writer) Triggered");
//     await blog();
// });

// Deep Research Trend Scout (Gen 2, Gemini Grounded Search)
exports.dailyTrendScout = onSchedule({
    schedule: "every day 04:00",
    timeoutSeconds: 1800, // 30 min (max for scheduled)
    memory: "2GiB",
    region: "us-central1",
    timeZone: "America/Los_Angeles"
}, async (event) => {
    console.log("⏰ Trend Scout V2 (Grounded Search) Triggered");
    await require('./workflows/scout_trends_v2.js')();
});

exports.debugSchema = onRequest({ timeoutSeconds: 60, region: "us-central1" }, async (req, res) => {
    try {
        const { db } = require('./lib/firebase');
        const collections = ['events', 'daily_updates', 'articles'];
        const result = {};

        for (const colName of collections) {
            const snap = await db.collection(colName).limit(3).get();
            result[colName] = [];
            snap.forEach(doc => {
                result[colName].push({ id: doc.id, ...doc.data() });
            });
        }
        res.json(result);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

exports.migrateData = require('./migrate_cloud').run;
exports.feedback = onRequest({ timeoutSeconds: 60 }, feedback); // V2 Feedback Loop
exports.scoutDeep = require('./workflows/scout_deep_v3.js'); // V3 UPGRADE
exports.scoutTrends = require('./workflows/scout_trends.js');
exports.syncFavorites = require('./workflows/sync_favorites.js');

// Schedule Sync (e.g., Daily at 6 AM)
exports.scheduledSyncFavorites = onSchedule({
    schedule: "every day 06:00",
    timeoutSeconds: 300,
    region: "us-central1",
    timeZone: "America/Los_Angeles"
}, async (event) => {
    console.log("⏰ Daily Favorites Sync Triggered");
    await require('./workflows/sync_favorites.js')();
});
