const ghl = require('../lib/ghl');
const CONFIG = require('../config');

async function testEmail() {
    const targetEmail = "mdesautel@gmail.com";
    console.log(`🧪 Starting Email Test to: ${targetEmail}`);
    console.log(`🔑 Using GHL Key: ${CONFIG.GHL_KEY.substring(0, 10)}...`);

    try {
        // 1. Upsert Contact
        console.log("1️⃣ Upserting Contact...");
        const contactRes = await ghl.upsertContact({
            email: targetEmail,
            firstName: "MJ",
            lastName: "Test",
            tags: ["test-email"]
        });

        const contactId = contactRes.contact ? contactRes.contact.id : (contactRes.meta ? contactRes.meta.contactId : null);

        if (!contactId) {
            console.error("❌ Failed to get Contact ID. Response:", JSON.stringify(contactRes, null, 2));
            return;
        }
        console.log(`✅ Contact ID Found: ${contactId}`);

        // 2. Send Email
        console.log("2️⃣ Sending Email...");
        const emailRes = await ghl.sendEmail({
            contactId: contactId,
            subject: "GHL V2 Test Email (System Check)",
            message: "If you are reading this, the email system is fully functional.",
            html: "<h1>System Status: Operational</h1><p>The V2 Email Pipeline is working.</p>"
        });

        console.log("✅ Email API Response:", JSON.stringify(emailRes, null, 2));

    } catch (error) {
        console.error("❌ TEST FAILED:", error.message);
        if (error.response) {
            console.error("   API Error Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

if (require.main === module) {
    testEmail();
}
