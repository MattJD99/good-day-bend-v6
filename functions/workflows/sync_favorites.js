const { db } = require('../lib/firebase');
const ghl = require('../lib/ghl');
const { searchPlace } = require('../lib/google_search');

/**
 * Sync "Featured" businesses from GHL to Firestore.
 * 1. Fetch all contacts from GHL.
 * 2. Filter for those with "Featured" tag.
 * 3. Enrich with Google Places Data (Rating, Reviews, Category, Image)
 * 4. Save to 'favorites' collection in Firestore.
 */
async function syncFavorites() {
    console.log("🚀 Starting GHL Favorites Sync (Enriched)...");

    try {
        // 1. Fetch Contacts
        const contacts = await ghl.getContacts('');
        console.log(`📥 Fetched ${contacts.length} contacts from GHL.`);

        // 2. Filter for 'Featured' tag
        const featured = contacts.filter(c => c.tags && c.tags.map(t => t.toLowerCase()).includes('featured'));
        console.log(`✨ Found ${featured.length} featured businesses.`);

        if (featured.length === 0) {
            console.log("⚠️ No featured businesses found. Check GHL tags.");
            return;
        }

        // 3. Process & Enrich
        const batch = db.batch();
        const collectionRef = db.collection('favorites');

        for (const business of featured) {
            const bizName = business.businessName || business.companyName || `${business.firstName} ${business.lastName}`;
            if (!bizName) continue;

            console.log(`🔎 Enriching data for: ${bizName}`);

            // Search Google Places
            const placeData = await searchPlace(`${bizName} Bend Oregon`);

            // Mapping GHL data + Place Data to Frontend Model
            let businessImage = placeData?.imageUrl || "https://placehold.co/600x400/102216/13ec5b?text=Good+Day+Bend";

            // if we still have a placeholder or it's missing, try a dedicated image search
            if (businessImage.includes('placehold.co') || !placeData?.imageUrl) {
                console.log(`🖼️ No direct place image. Searching Google Images for: ${bizName}`);
                const images = await require('../lib/google_search').searchGoogleImages(`${bizName} Bend Oregon`, 1);
                if (images && images.length > 0) {
                    businessImage = images[0];
                }
            }

            const favoriteData = {
                id: business.id,
                name: bizName,
                // Prioritize Place category, fallback to Custom Field, then default
                category: placeData?.category || business.customField?.category || "Local Business",
                image: businessImage,
                rating: placeData?.rating || 5.0,
                reviews: placeData?.ratingCount || 100,
                websiteUrl: business.website || placeData?.website || "#",
                address: placeData?.address || "",
                // Robust Google Search URL
                googleReviewsUrl: `https://www.google.com/search?q=${encodeURIComponent(bizName + ' Bend reviews')}`,
                updatedAt: new Date()
            };

            const docRef = collectionRef.doc(`fav_${business.id}`);
            batch.set(docRef, favoriteData, { merge: true });
        }

        // 4. Commit
        await batch.commit();
        console.log("✅ Successfully synced enriched favorites to Firestore.");

    } catch (e) {
        console.error("❌ Sync Failed:", e);
    }
}

module.exports = syncFavorites;
