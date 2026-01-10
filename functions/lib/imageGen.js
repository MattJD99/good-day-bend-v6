const CONFIG = require('../config');
const { admin, db } = require('./firebase');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { searchGoogleImages } = require('./google_search');
const { getSegmentedModel } = require('./gemini');

// Helper to convert URL to Base64 Part for Gemini
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
        console.warn(`⚠️ Failed to fetch inspiration image: ${url}`, error.message);
        return null;
    }
}

/**
 * Enhanced Image Generation: Search -> Vision -> Generate
 */
async function generateImageWithInspiration(topic, originalContext) {
    console.log(`🎨 Starting Enhanced Generation for: "${topic}"`);

    // 1. Search for Inspiration
    const inspirationUrls = await searchGoogleImages(topic + " Bend Oregon", 3);

    let refinedPrompt = originalContext; // Fallback to original if search fails

    if (inspirationUrls.length > 0) {
        console.log("👁️ Analysis: Showing inspiration images to Gemini Vision...");

        // 2. Fetch Images for Vision
        const imagePartsPromise = inspirationUrls.map(url => urlToGenerativePart(url));
        const imageParts = (await Promise.all(imagePartsPromise)).filter(p => p !== null);

        if (imageParts.length > 0) {
            // 3. Ask Gemini to Describe & Refine
            const visionPrompt = `
            You are an Art Director for a premium lifestyle blog "Good Day Bend".
            
            Task:
            1. Analyze these real-world images of "${topic}".
            2. Extract key visual details (lighting, composition, colors, mood, specific landmarks).
            3. Write a high-fidelity image generation prompt that captures this realistic vibe but makes it look like professional editorial photography.
            
            Constraints:
            - NO TEXT in the image.
            - Style: Photorealistic, depth of field, golden hour, f/1.8, 8k resolution.
            - Focus on the details you see in the images (e.g. if you see snow, mention snow. If you see pine trees, mention them).
            
            Output ONLY the raw prompt string.
            `;

            try {
                // Use the RESEARCH model (likely Pro/Flash which is multimodal)
                const visionModel = getSegmentedModel("RESEARCH", CONFIG.MODEL_REASONING);
                const result = await visionModel.generateContent([visionPrompt, ...imageParts]);
                refinedPrompt = result.response.text().trim();
                console.log("✨ Vision Refined Prompt:", refinedPrompt);
            } catch (e) {
                console.error("❌ Vision analysis failed, using dry text:", e.message);
            }
        }
    } else {
        console.log("ℹ️ No inspiration images found, proceeding with dry text.");
    }

    // 4. Generate Final Image
    const generatedUrl = await generateImage(refinedPrompt);

    // Check if it fell back to a generic image
    // Check if it fell back to a generic image
    // DISABLE: Do not return raw inspiration URLs as they are often hotlinked/unstable.
    /*
    if (CONFIG.FALLBACK_IMAGES.includes(generatedUrl) && inspirationUrls.length > 0) {
        console.log("⚠️ Generation used fallback, but we have Inspiration! Swapping for real found image.");
        return inspirationUrls[0];
    }
    */

    return generatedUrl;
}

async function generateImage(prompt, segmentKeyName = 'IMAGE_CREATION') {
    // v6 Upgrade: "Rockwell Every 3rd" Logic
    let finalPrompt = prompt;
    try {
        const counterRef = db.collection('counters').doc('imageGen');
        await db.runTransaction(async (t) => {
            const doc = await t.get(counterRef);
            let newCount = 1;
            if (doc.exists) {
                newCount = (doc.data().count || 0) + 1;
            }
            t.set(counterRef, { count: newCount }, { merge: true });
            if (newCount % 3 === 0) {
                finalPrompt += " in the style of the painter Norman Rockwell";
                console.log("🎨 Applied 'Norman Rockwell' style to this image!");
            }
        });
    } catch (err) {
        console.warn("⚠️ Counter logic failed, using original prompt.", err.message);
    }

    try {
        console.log(`🎨 Generating with Vertex AI (Enterprise): ${CONFIG.MODEL_IMAGE_PRO}`);

        // 1. Get OAuth Token using default credentials (works on Cloud Functions & Local with properly set GOOGLE_APPLICATION_CREDENTIALS)
        const auth = new admin.firestore.v1.FirestoreAdminClient().auth; // Hack to get auth client or just use GoogleAuth
        // Cleaner way:
        const { GoogleAuth } = require('google-auth-library');
        const authClient = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const client = await authClient.getClient();
        const accessToken = (await client.getAccessToken()).token;

        // 2. Project ID
        const projectId = await authClient.getProjectId();
        const location = 'us-central1';
        const modelId = CONFIG.MODEL_IMAGE_PRO; // e.g., 'imagen-3.0-fast-generate-001'

        // 3. Call Vertex AI Prediction API
        const apiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`;

        const requestBody = {
            instances: [
                { prompt: finalPrompt }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9",
                // includeRaiReasoning: true
            }
        };

        const response = await axios.post(apiUrl, requestBody, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // 4. Extract Image
        const predictions = response.data.predictions;
        if (predictions && predictions[0] && predictions[0].bytesBase64Encoded) {
            const base64Image = predictions[0].bytesBase64Encoded;

            console.log(`🍌 Success! Image generated using ${modelId}`);
            const buffer = Buffer.from(base64Image, 'base64');
            const filename = `vertex-${Date.now()}.jpg`;
            const bucket = admin.storage().bucket("good-day-bend-v6.firebasestorage.app");
            const file = bucket.file(`blog-images/${filename}`);
            const token = uuidv4();

            await file.save(buffer, {
                metadata: {
                    contentType: 'image/jpeg',
                    metadata: {
                        firebaseStorageDownloadTokens: token,
                        generatedByModel: modelId
                    }
                },
                public: true
            });

            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
            console.log("🔗 URL:", publicUrl);
            return publicUrl;
        }

        throw new Error("No image bytes in Vertex AI response");

    } catch (e) {
        console.error("⚠️ Vertex AI Failed:", e.message);
        if (e.response) {
            console.error("   Response Data:", JSON.stringify(e.response.data));
        }

        console.log("Using Seasonal Fallback...");
        const pool = CONFIG.FALLBACK_IMAGES;
        return pool[Math.floor(Math.random() * pool.length)];
    }
}

module.exports = { generateImage, generateImageWithInspiration };
