const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
const { URL } = require('url');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function auditLocations() {
    const collections = ['daily_updates', 'articles', 'events'];
    const locationStats = {};

    console.log('--- Image Location Audit ---');

    for (const col of collections) {
        const snapshot = await db.collection(col).get();
        locationStats[col] = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const urlString = data.image || data.imageUrl;

            if (urlString && typeof urlString === 'string' && urlString.startsWith('http')) {
                try {
                    const parsed = new URL(urlString);
                    const domain = parsed.hostname;

                    // Identify bucket if google storage
                    let location = domain;
                    if (domain.includes('firebasestorage') || domain.includes('googleapis')) {
                        // Try to extract bucket name if possible, mainly just distinguish from Unsplash
                        if (urlString.includes('good-day-bend-v6')) location = 'Firebase Storage (v6)';
                        else if (urlString.includes('good-day-bend')) location = 'Firebase Storage (Legacy)';
                        else location = 'Google Storage (Other)';
                    } else if (domain.includes('unsplash')) {
                        location = 'Unsplash (Fallback)';
                    }

                    locationStats[col][location] = (locationStats[col][location] || 0) + 1;
                } catch (e) {
                    locationStats[col]['Invalid URL'] = (locationStats[col]['Invalid URL'] || 0) + 1;
                }
            } else {
                locationStats[col]['No Image'] = (locationStats[col]['No Image'] || 0) + 1;
            }
        });
    }

    console.log(JSON.stringify(locationStats, null, 2));
}

auditLocations();
