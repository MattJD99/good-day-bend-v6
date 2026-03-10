const { db } = require('./lib/firebase');
const ghl = require('./lib/ghl');

async function sendSampleEmail() {
    console.log("🔍 Fetching latest Daily Update...");
    const snapshot = await db.collection('daily_updates')
        .orderBy('publishedAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.log("⚠️ No daily updates found.");
        return;
    }

    let dailyUpdate = null;
    snapshot.forEach(doc => dailyUpdate = doc.data());

    console.log(`📝 Found: ${dailyUpdate.title}`);

    // Create a nice email wrapper (similar to welcome email)
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { margin: 0; padding: 0; background-color: #f6f8f6; font-family: sans-serif; }
            .wrapper { width: 100%; padding: 40px 0; background-color: #f6f8f6; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 1px solid #eee; }
            .content { padding: 0; } /* Let the inner HTML control padding */
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #888; background-color: #f8fafc; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <h2 style="margin:0; color:#0d1b12;">Good Day Bend</h2>
                    <p style="margin:5px 0 0 0; color:#13ec5b; font-weight:bold;">DAILY UPDATE SAMPLE</p>
                </div>
                <div class="content">
                    <!-- INJECTED DAILY UPDATE CONTENT -->
                    ${dailyUpdate.html || dailyUpdate.content}
                </div>
                <div class="footer">
                    <p>This is a sample of how the Daily Update looks.</p>
                    <p>Sent via Good Day Bend v6 Admin Tool</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    console.log("📧 Sending Sample Email to mdesautel@gmail.com...");

    // We need a dummy contact ID to send via GHL
    // Upsert admin contact to be sure
    try {
        const contact = await ghl.upsertContact({
            email: 'mdesautel@gmail.com',
            firstName: 'MJ',
            lastName: 'Admin',
            tags: ['admin']
        });

        await ghl.sendEmail({
            contactId: contact.contact.id,
            email: 'mdesautel@gmail.com',
            subject: `[SAMPLE] ${dailyUpdate.title}`,
            message: "Verify HTML content",
            html: emailHtml
        });

        console.log("✅ Sample Email Sent Successfully!");
    } catch (e) {
        console.error("❌ Failed to send sample email:", e.message);
    }
}

sendSampleEmail().catch(console.error);
