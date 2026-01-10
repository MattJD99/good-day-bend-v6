const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixArticle() {
    console.log("Fixing missing article...");

    // ID of the "Home Insurance" daily update
    const sourceId = 'vA90BZsegF458GrPaQap';
    const sourceDoc = await db.collection('daily_updates').doc(sourceId).get();

    if (!sourceDoc.exists) {
        console.error("Source daily update not found!");
        return;
    }

    const data = sourceDoc.data();
    console.log("Found source:", data.title);

    // Prepare Article Data
    const articleData = {
        title: data.title,
        content: data.content,
        // Use image or imageUrl, prefer one
        imageUrl: data.image || data.imageUrl || "https://visitbend.com/wp-content/uploads/2022/09/aerial-bend-fall-blog.jpg",
        image: data.image || data.imageUrl || "https://visitbend.com/wp-content/uploads/2022/09/aerial-bend-fall-blog.jpg",
        createdAt: data.publishedAt || admin.firestore.FieldValue.serverTimestamp(),
        category: "Community", // Default category
        tags: ["Daily Update", "Local News"],
        description: data.description || "Latest update from Good Day Bend.",
        author: "Good Day Bend Team",
        featured: true // Make it featured so it shows up in the hero
    };

    // Create new document in 'articles'
    // We can use the same ID or a new one. Let's use a new one to avoid confusion, or same one to link?
    // Using same ID is cleaner for tracking.
    await db.collection('articles').doc(sourceId).set(articleData);

    console.log(`✓ Successfully created article with ID: ${sourceId}`);
}

fixArticle();
