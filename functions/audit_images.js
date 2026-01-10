const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function auditArticleImages() {
    console.log('Auditing blog articles for duplicate images...');

    try {
        const snapshot = await db.collection('articles').get();

        if (snapshot.empty) {
            console.log('No articles found.');
            return;
        }

        const articles = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            articles.push({
                id: doc.id,
                title: data.title,
                imageUrl: data.imageUrl || data.image || 'NO_IMAGE', // Check both fields
                date: data.date
            });
        });

        // Group by image URL
        const imageCounts = {};
        articles.forEach(article => {
            const url = article.imageUrl;
            if (!imageCounts[url]) {
                imageCounts[url] = [];
            }
            imageCounts[url].push(article.title);
        });

        // Report duplicates
        let duplicateCount = 0;
        for (const [url, titles] of Object.entries(imageCounts)) {
            if (titles.length > 1 && url !== 'NO_IMAGE') {
                console.log(`\nDuplicate Image Found: ${url}`);
                console.log(`Used in ${titles.length} articles:`);
                titles.forEach(title => console.log(` - ${title}`));
                duplicateCount++;
            }
        }

        if (duplicateCount === 0) {
            console.log('\nNo duplicate images found.');
        } else {
            console.log(`\nFound ${duplicateCount} images used in multiple articles.`);
        }

    } catch (error) {
        console.error('Error auditing articles:', error);
    }
}

auditArticleImages();
