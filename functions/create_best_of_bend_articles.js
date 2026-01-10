const { modelReasoning: model } = require('./lib/gemini');
const { db, admin } = require('./lib/firebase');
const { generateImage } = require('./lib/imageGen');
const CONFIG = require('./config');

const ARTICLES = [
    {
        topic: "Best Brunch Spots in Bend for 2025",
        category: "Food & Drink",
        slug: "best-brunch-spots-bend-2025",
        imagePrompt: "Elegant brunch spread at a modern cafe in Bend, Oregon with mimosas, avocado toast, pancakes, and mountain views through windows"
    },
    {
        topic: "How to Spend a Perfect Weekend in Bend",
        category: "Travel",
        slug: "perfect-weekend-bend-guide",
        imagePrompt: "Collage of Bend Oregon weekend activities: hiking trail, brewery patio, shopping downtown, sunset over mountains"
    },
    {
        topic: "Top 10 Restaurants in Bend You Must Try",
        category: "Food & Drink",
        slug: "top-10-restaurants-bend",
        imagePrompt: "Upscale dining experience in Bend Oregon restaurant with local cuisine, craft cocktails, and warm ambiance"
    },
    {
        topic: "Best Outdoor Activities in Bend",
        category: "Outdoors",
        slug: "best-outdoor-activities-bend",
        imagePrompt: "Adventurers enjoying outdoor activities in Bend: mountain biking, kayaking on Deschutes River, skiing at Mt Bachelor, hiking trails"
    },
    {
        topic: "Hidden Gems: Best Local Shops in Bend",
        category: "Community",
        slug: "hidden-gem-local-shops-bend",
        imagePrompt: "Charming local boutique shop in downtown Bend with unique Oregon-made products, rustic interior, and friendly atmosphere"
    }
];

async function createArticle(articleData) {
    const { topic, category, slug, imagePrompt } = articleData;
    
    console.log(`\n📝 Creating article: ${topic}`);
    
    // Check if article already exists
    try {
        const existing = await db.collection(CONFIG.FIREBASE_COLLECTION_ARTICLES).doc(slug).get();
        if (existing.exists) {
            console.log(`⚠️  Article "${topic}" already exists. Skipping.`);
            return existing.data();
        }
    } catch (err) {
        console.warn("Could not check for existing article:", err.message);
    }

    // Generate content
    const writePrompt = `
    Role: Expert Content Creator for "Good Day Bend" - a local guide for Bend, Oregon.
    Topic: ${topic}
    Category: ${category}
    
    Goal: Write a visually stunning, "Infographic-style" blog post that locals and visitors will LOVE.
    
    CRITICAL RULES:
    1. Do NOT write walls of text. Use HTML/CSS to visualize data.
    2. Use INLINE CSS for all styling (background colors, padding, borders, etc.)
    3. Make it feel premium, modern, and visually engaging
    4. Include specific Bend locations, businesses, and local knowledge
    5. BE AUTHENTIC - this is for real people planning real visits
    
    Structure (Use inline CSS for everything):
    
    1. **Hero Section**: 
       <h1 style="font-size: 2.5rem; font-weight: 800; color: #0d1b12; margin-bottom: 1rem;">${topic}</h1>
       <p style="font-size: 1.125rem; color: #4c9a66; margin-bottom: 2rem;">Compelling hook paragraph (2-3 sentences)</p>
    
    2. **Quick Hits Infographic**: 
       Create a styled info box with 3 KEY TAKEAWAYS:
       <div style="background: linear-gradient(135deg, #f0f7f4 0%, #e7f3eb 100%); padding: 24px; border-radius: 12px; border-left: 5px solid #13ec5b; margin: 2rem 0;">
         <h3 style="color: #0d1b12; font-weight: 700; margin-bottom: 1rem;">⚡ Quick Hits</h3>
         <ul style="list-style: none; padding: 0;">
           <li style="margin-bottom: 0.75rem; color: #2e5948;">✓ Takeaway 1</li>
           <li style="margin-bottom: 0.75rem; color: #2e5948;">✓ Takeaway 2</li>
           <li style="margin-bottom: 0.75rem; color: #2e5948;">✓ Takeaway 3</li>
         </ul>
       </div>
    
    3. **Main Content - Visual Breakdown**:
       For each item/section, use:
       - <h3> headers with inline styling
       - Styled <div> boxes for each recommendation
       - Include: Name, what makes it special, insider tip if applicable
       - Use emojis strategically (🍳 ☕ 🏔️ 🚴 🛍️ etc.)
       
       Example format for each item:
       <div style="background: white; border: 1px solid #e7f3eb; border-radius: 8px; padding: 20px; margin: 1.5rem 0;">
         <h4 style="color: #0d1b12; font-weight: 700; margin-bottom: 0.5rem;">🍳 [Place Name]</h4>
         <p style="color: #4c9a66; font-size: 0.875rem; margin-bottom: 0.5rem;">[Category/Type]</p>
         <p style="color: #2e5948; line-height: 1.6;">[Description - what makes it special]</p>
         <p style="color: #13ec5b; font-weight: 600; margin-top: 0.75rem;">💡 Insider Tip: [Local knowledge]</p>
       </div>
    
    4. **Vibe Check Section** (Optional but encouraged):
       Create a visual "rating" or "vibe meter" for relevant factors
       Example:
       <div style="background: #1a2e22; color: white; padding: 20px; border-radius: 12px; margin: 2rem 0;">
         <h3 style="margin-bottom: 1rem;">🎯 The Vibe Check</h3>
         <div style="margin-bottom: 0.5rem;">👨‍👩‍👧 Family Friendly: ⭐⭐⭐⭐⭐</div>
         <div style="margin-bottom: 0.5rem;">💰 Budget Level: $$-$$$</div>
         <div>🕒 Best Time to Visit: [Specific recommendation]</div>
       </div>
    
    5. **Conclusion**:
       Brief wrap-up (2-3 sentences) that ties it together and encourages action.
    
    
    Special Instructions for Each Category:
    - **Food & Drink**: Include specific menu items, price ranges, atmosphere descriptions
    - **Travel/Weekend**: Create a sample itinerary or timeline
    - **Outdoors**: Include difficulty levels, seasonality, what to bring
    - **Shopping**: Price ranges, unique products, why locals love it
    
    Tone: Enthusiastic but authentic. Like a knowledgeable local friend sharing their favorite spots.
    
    Output: Pure HTML body content with inline CSS. No markdown. No \`\`\`html tags.
    `;

    console.log("✍️  Writing article content...");
    const writeResult = await model.generateContent(writePrompt);
    let content = writeResult.response.text();
    
    // Clean up any markdown artifacts
    content = content.replace(/```html/g, '').replace(/```/g, '').trim();
    
    // Extract title from content
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : topic;
    
    console.log(`📸 Generating image: "${imagePrompt}"`);
    const imageUrl = await generateImage(imagePrompt);
    console.log(`✅ Image created: ${imageUrl}`);
    
    // Save to Firestore
    const articleDoc = {
        title,
        topic,
        content,
        imageUrl,
        slug,
        category,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        type: "best-of-bend",
        featured: true // Mark as featured for trending widget
    };
    
    await db.collection(CONFIG.FIREBASE_COLLECTION_ARTICLES).doc(slug).set(articleDoc);
    console.log(`💾 Saved to Firestore: ${slug}`);
    
    return articleDoc;
}

async function main() {
    console.log("🚀 Starting Best of Bend Articles Creation...\n");
    console.log(`📊 Creating ${ARTICLES.length} articles...\n`);
    
    const results = [];
    
    for (const articleData of ARTICLES) {
        try {
            const result = await createArticle(articleData);
            results.push({ success: true, slug: articleData.slug, data: result });
            console.log(`✅ Article created successfully!\n`);
        } catch (error) {
            console.error(`❌ Failed to create article "${articleData.topic}":`, error.message);
            results.push({ success: false, slug: articleData.slug, error: error.message });
        }
        
        // Small delay between articles to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("=".repeat(60) + "\n");
    
    if (failed > 0) {
        console.log("Failed articles:");
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.slug}: ${r.error}`);
        });
    }
    
    console.log("\n🎉 Best of Bend articles creation complete!");
    console.log("Next steps:");
    console.log("  1. Check Firestore to verify articles were created");
    console.log("  2. Update the trending widget on blog.html");
    console.log("  3. Test the articles on your site\n");
}

if (require.main === module) {
    main().catch(err => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
}

module.exports = main;
