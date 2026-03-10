/**
 * Verify Featured Events Logic
 * 1. Inserts a dummy "Featured" event for tomorrow.
 * 2. Runs the same query logic as publisher_v2.js.
 * 3. Asserts that the event is found.
 * 4. Cleans up.
 */

const CONFIG = require('./config');

const { db } = require('./lib/firebase');

async function verify() {
    console.log("🕵️ Verifying Featured Events Query...");

    // 1. Setup Dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // 2. Create Dummy Event
    const dummyEvent = {
        title: "TEST FEATURED EVENT - DO NOT PUBLISH",
        eventDate: dateStr,
        isFeatured: true,
        description: "This is a test event for the featured agent verification.",
        location: "Test Venue",
        source: "verification_script"
    };

    console.log(`📝 Inserting dummy event for ${dateStr}...`);
    const docRef = await db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS).add(dummyEvent);
    console.log(`✅ Inserted ID: ${docRef.id}`);

    // 3. Test Query (Logic from publisher_v2.js)
    console.log("🧠 Running Publisher Query Logic...");
    try {
        const targetDate = new Date(); // Today
        // Logic from publisher_v2.js:
        const tmrw = new Date(targetDate);
        tmrw.setDate(tmrw.getDate() + 1);
        const threeDaysOut = new Date(targetDate);
        threeDaysOut.setDate(threeDaysOut.getDate() + 3);

        console.log(`   Query Range: ${tmrw.toISOString().split('T')[0]} to ${threeDaysOut.toISOString().split('T')[0]}`);

        const featuredSnap = await db.collection(CONFIG.FIREBASE_COLLECTION_EVENTS)
            .where('eventDate', '>=', tmrw.toISOString().split('T')[0])
            .where('eventDate', '<=', threeDaysOut.toISOString().split('T')[0])
            .get();

        let found = false;
        let count = 0;
        featuredSnap.forEach(doc => {
            const data = doc.data();
            if (data.isFeatured || data.isSponsored || data.featured) {
                count++;
                if (doc.id === docRef.id) {
                    found = true;
                    console.log(`   ✅ Found our test event! (${data.title})`);
                }
            }
        });

        console.log(`   ✨ Total Featured Events Found: ${count}`);

        if (found) {
            console.log("\n✅ VERIFICATION SUCCESS: Publisher logic correctly finds upcoming featured events.");
        } else {
            console.error("\n❌ VERIFICATION FAILED: Test event was NOT found by the query.");
        }

    } catch (e) {
        console.error("❌ Query Failed:", e);
    } finally {
        // 4. Cleanup
        console.log("🧹 Cleaning up...");
        await docRef.delete();
        console.log("✅ Dummy event deleted.");
    }
}

verify().catch(console.error);
