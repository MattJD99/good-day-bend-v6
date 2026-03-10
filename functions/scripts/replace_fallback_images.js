/**
 * Replace Fallback Images with Categorized Library Images
 * Matches event categories to image library categories for visual variety
 */

const admin = require('firebase-admin');
const serviceAccount = require('/Users/md/Documents/GDB-v8/good-day-bend-v6-firebase-adminsdk-fbsvc-c418b0b503.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800';

// Category mapping: Event Category → Image Library Category
const CATEGORY_MAP = {
    // Music & Nightlife
    'music': 'Nightlife',
    'live music': 'Nightlife',
    'jazz': 'Nightlife',
    'concert': 'Nightlife',
    'dj': 'Nightlife',
    'nightlife': 'Nightlife',

    // Arts & Culture
    'art': 'Arts',
    'arts': 'Arts',
    'film': 'Arts',
    'theater': 'Arts',
    'gallery': 'Arts',
    'comedy': 'Nightlife',

    // Food & Drink
    'food': 'Dining',
    'dining': 'Dining',
    'restaurant': 'Dining',
    'brewfest': 'Dining',
    'beer': 'Dining',
    'wine': 'Dining',
    'tasting': 'Dining',

    // Outdoor & Sports
    'outdoor': 'Outdoors',
    'outdoors': 'Outdoors',
    'sports': 'Outdoors',
    'adventure': 'Outdoors',
    'hiking': 'Outdoors',
    'skiing': 'Outdoors',
    'running': 'Outdoors',

    // Family
    'family': 'Family',
    'kids': 'Family',
    'children': 'Family',

    // Default
    'general': 'Scenic',
    'community': 'Scenic',
    'market': 'Scenic'
};

async function loadImageLibrary() {
    const images = {};
    const snap = await db.collection('image_library')
        .where('quality_score', '>=', 7)
        .get();

    snap.forEach(doc => {
        const data = doc.data();
        const cat = data.category || 'Other';
        if (!images[cat]) images[cat] = [];
        images[cat].push(data.url);
    });

    console.log('📚 Loaded image library:');
    Object.keys(images).forEach(cat => {
        console.log(`  ${cat}: ${images[cat].length} images`);
    });

    return images;
}

function getBestCategory(eventCategory) {
    if (!eventCategory) return 'Scenic';

    const lower = eventCategory.toLowerCase();

    // Check direct match
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(key)) return value;
    }

    return 'Scenic'; // Default fallback
}

function getRandomImage(images, category) {
    const pool = images[category] || images['Scenic'] || images['Outdoors'];
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

async function main() {
    console.log('🔄 Loading image library...');
    const images = await loadImageLibrary();

    console.log('\n🔍 Finding events with fallback image...');
    const eventsSnap = await db.collection('events')
        .where('image', '==', FALLBACK_IMAGE)
        .get();

    console.log(`Found ${eventsSnap.size} events to update.\n`);

    let updated = 0;
    let failed = 0;
    const usedImages = new Set(); // Track used images to avoid duplicates

    for (const doc of eventsSnap.docs) {
        const data = doc.data();
        const category = getBestCategory(data.category);
        let newImage = getRandomImage(images, category);

        // Try to avoid duplicates by picking another if this one was used
        let attempts = 0;
        while (usedImages.has(newImage) && attempts < 5) {
            newImage = getRandomImage(images, category);
            attempts++;
        }

        if (newImage) {
            usedImages.add(newImage);
            try {
                await doc.ref.update({
                    image: newImage,
                    imageSource: 'library_replacement'
                });
                console.log(`✅ ${data.title}`);
                console.log(`   Category: ${data.category} → ${category}`);
                updated++;
            } catch (e) {
                console.error(`❌ Failed: ${data.title} - ${e.message}`);
                failed++;
            }
        } else {
            console.warn(`⚠️ No image found for category ${category}`);
            failed++;
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${eventsSnap.size}`);
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
