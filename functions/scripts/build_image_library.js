const admin = require('firebase-admin');
const { getSegmentedModel } = require('../lib/gemini');
const CONFIG = require('../config');
const axios = require('axios');
const path = require('path');

// Initialize Firebase Admin (if not already via require)
if (!admin.apps.length) {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "good-day-bend-v6.firebasestorage.app"
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Helper: Convert URL to Generative Part
async function urlToGenerativePart(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return {
            inlineData: {
                data: Buffer.from(response.data).toString('base64'),
                mimeType: response.headers['content-type'] || 'image/jpeg',
            },
        };
    } catch (error) {
        console.warn(`⚠️ Failed to fetch image: ${url}`, error.message);
        return null;
    }
}

async function buildImageLibrary(dryRun = false, limit = 0) {
    console.log("📚 Building Image Library...");

    // 1. Get List of Files
    const [files] = await bucket.getFiles();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp']; // Limit types

    // Filter for valid images
    const validFiles = files.filter(f => imageExtensions.includes(path.extname(f.name).toLowerCase()));
    console.log(`found ${validFiles.length} total images in storage.`);

    // 2. Loop and Process
    let processed = 0;

    // Shuffle or sort? Let's just go sequentially but maybe newest first?
    // validFiles.sort((a,b) => b.metadata.timeCreated - a.metadata.timeCreated); // Need full metadata fetch for this usually

    for (const file of validFiles) {
        if (limit > 0 && processed >= limit) break;

        const url = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

        // Check if already exists in library
        const docRef = db.collection('image_library').doc(file.name.replace(/\//g, '_'));
        const doc = await docRef.get();

        if (doc.exists && !process.argv.includes('--force')) {
            console.log(`✅ [SKIP] Already indexed: ${file.name}`);
            continue;
        }

        console.log(`\n👁️ Analyzing: ${file.name}...`);

        if (dryRun) {
            console.log("   (Dry Run - Skipping AI calls)");
            processed++;
            continue;
        }

        // 3. AI Analysis
        const imagePart = await urlToGenerativePart(url);
        if (!imagePart) continue;

        const prompt = `
        Analyze this image for a fallback library for "Good Day Bend" (Bend, Oregon lifestyle blog).
        
        Output Strictly JSON:
        {
            "tags": ["tag1", "tag2", "tag3"],       // e.g. "Snow", "Concert", "Beer", "Hiking"
            "category": "CategoryName",             // Choose ONE: "Outdoors", "Nightlife", "Dining", "Arts", "Family", "Scenic", "Other"
            "quality_score": 8,                     // 1-10 based on aesthetic appeal/professionalism
            "description": "Short description",     // < 100 chars
            "time_of_day": "Day/Night/Sunset"
        }
        `;

        try {
            // Use RESEARCH key or similar (multimodal capable)
            const model = getSegmentedModel("RESEARCH", CONFIG.MODEL_REASONING); // Use Configured Model
            const result = await model.generateContent([prompt, imagePart]);
            const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const metadata = JSON.parse(text);

            // 4. Save to Firestore
            await docRef.set({
                ...metadata,
                url: url,
                fileName: file.name,
                bucket: bucket.name,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                indexedBy: 'build_image_library_v1'
            });

            console.log(`   💾 Saved: [${metadata.category}] ${metadata.description}`);
            processed++;

        } catch (e) {
            console.error("   ❌ AI Analysis failed:", e.message);
        }

        // Small delay to be nice to rate limits if running huge batch
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("\n Library Build Complete.");
}

// Run
const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 0;

buildImageLibrary(isDryRun, limit);
