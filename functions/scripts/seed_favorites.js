// Seed the favorites collection with featured businesses
// Run: node functions/scripts/seed_favorites.js

const admin = require('firebase-admin');

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'good-day-bend-v6'
    });
}

const db = admin.firestore();

const favorites = [
    {
        name: "Amaterra Kitchen + Social Club",
        category: "Wine & Dining",
        rating: "4.9",
        reviews: "200+",
        websiteUrl: "https://amaterrawines.com/bend/",
        googleReviewsUrl: "https://www.google.com/search?q=Amaterra+Kitchen+Bend+Oregon+reviews",
        image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800", // Wine/dining
        address: "909 NW Bond Street, Bend, OR"
    },
    {
        name: "Thump Coffee",
        category: "Roastery & Cafe",
        rating: "4.9",
        reviews: "500+",
        websiteUrl: "https://www.thumpcoffee.com/",
        googleReviewsUrl: "https://www.google.com/search?q=Thump+Coffee+Bend+reviews",
        image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800", // Coffee
        address: "25 NW Minnesota Ave, Bend, OR"
    },
    {
        name: "Gear Fix",
        category: "Outdoor Consignment",
        rating: "5.0",
        reviews: "300+",
        websiteUrl: "https://www.gearfix.com/",
        googleReviewsUrl: "https://www.google.com/search?q=Gear+Fix+Bend+reviews",
        image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800", // Outdoor gear
        address: "815 NW Wall St, Bend, OR"
    },
    {
        name: "The Lemon Tree",
        category: "International Cuisine",
        rating: "4.7",
        reviews: "400+",
        websiteUrl: "https://www.thelemontreebend.com/",
        googleReviewsUrl: "https://www.google.com/search?q=The+Lemon+Tree+Bend+reviews",
        image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800", // Restaurant
        address: "1001 NW Wall St, Bend, OR"
    },
    {
        name: "Crux Fermentation Project",
        category: "Brewery & Taproom",
        rating: "4.8",
        reviews: "800+",
        websiteUrl: "https://www.cruxfermentation.com/",
        googleReviewsUrl: "https://www.google.com/search?q=Crux+Fermentation+Project+reviews",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", // Craft beer
        address: "50 SW Division St, Bend, OR"
    },
    {
        name: "kimwilson.photography",
        category: "Photography",
        rating: "5.0",
        reviews: "50+",
        websiteUrl: "https://kimwilson.photography/",
        googleReviewsUrl: "https://www.google.com/search?q=Kim+Wilson+Photography+Bend+reviews",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800", // Photography
        address: "Bend, OR"
    },
    {
        name: "Spoken Moto",
        category: "Moto & Coffee Bar",
        rating: "4.8",
        reviews: "350+",
        websiteUrl: "https://spokenmoto.com/",
        googleReviewsUrl: "https://www.google.com/search?q=Spoken+Moto+Bend+reviews",
        image: "https://images.unsplash.com/photo-1558618047-f4b511b440e4?w=800", // Motorcycle
        address: "310 SW Industrial Way, Bend, OR"
    },
    {
        name: "Deschutes Brewery",
        category: "Brewery & Pub",
        rating: "4.7",
        reviews: "2000+",
        websiteUrl: "https://www.deschutesbrewery.com/",
        googleReviewsUrl: "https://www.google.com/search?q=Deschutes+Brewery+Bend+reviews",
        image: "https://images.unsplash.com/photo-1559526642-c3f001ea68ee?w=800", // Brewery
        address: "1044 NW Bond St, Bend, OR"
    }
];

async function seedFavorites() {
    console.log("Seeding favorites collection...");

    for (const fav of favorites) {
        try {
            const docRef = await db.collection('favorites').add({
                ...fav,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Added: ${fav.name} (ID: ${docRef.id})`);
        } catch (error) {
            console.error(`❌ Error adding ${fav.name}:`, error.message);
        }
    }

    console.log("\n✅ Favorites seeding complete!");
}

seedFavorites().then(() => process.exit(0)).catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
