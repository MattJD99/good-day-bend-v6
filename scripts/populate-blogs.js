#!/usr/bin/env node
/**
 * Populate Firestore Blogs Collection
 * 
 * Creates sample blog posts for Good Day Bend website.
 * Run this to fix the empty blogs collection issue.
 * 
 * Usage: node scripts/populate-blogs.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ service-account.json not found!');
  console.error('Generate one from Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Sample blog posts
const blogPosts = [
  {
    title: "Best Spring Events in Bend 2026",
    content: `
      <p>Spring has arrived in Central Oregon, and with it comes an incredible lineup of events!</p>
      
      <h2>Outdoor Adventures</h2>
      <p>From hiking trails blooming with wildflowers to mountain biking season kicking off, Bend is the perfect spring destination.</p>
      
      <h2>Food & Drink Festivals</h2>
      <p>Our local breweries and restaurants are hosting amazing spring festivals. Don't miss the Bend Brew Fest in April!</p>
      
      <h2>Live Music</h2>
      <p>The Tower Theatre and Volcanic Theatre Pub have incredible lineups this season. Check our events calendar for details.</p>
      
      <p>Stay tuned to Good Day Bend for daily event updates!</p>
    `,
    category: "Events",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800",
    featured: true,
    createdAt: new Date('2026-03-15')
  },
  {
    title: "Top 10 Hiking Trails Near Bend",
    content: `
      <p>Central Oregon is a hiker's paradise. Here are our favorite trails within 30 minutes of downtown Bend:</p>
      
      <h2>1. Pilot Butte</h2>
      <p>Easy 2-mile round trip with 360° views of the Cascades.</p>
      
      <h2>2. Smith Rock State Park</h2>
      <p>World-class climbing and stunning red rock formations.</p>
      
      <h2>3. Sparks Lake</h2>
      <p>Flat, family-friendly trail with mountain reflections.</p>
      
      <h2>4. Broken Top Loop</h2>
      <p>Moderate 8-mile loop through alpine meadows.</p>
      
      <h2>5. Tumalo Falls</h2>
      <p>Popular 7-mile round trip to a 97-foot waterfall.</p>
      
      <p>Remember to pack water, layers, and leave no trace!</p>
    `,
    category: "Outdoors",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
    featured: true,
    createdAt: new Date('2026-03-10')
  },
  {
    title: "Bend's Craft Beer Scene: A Complete Guide",
    content: `
      <p>With over 30 breweries in town, Bend has earned its reputation as Beer Town USA.</p>
      
      <h2>Must-Visit Breweries</h2>
      <ul>
        <li><strong>Deschutes Brewery</strong> - The original, with amazing pub food</li>
        <li><strong>Cascade Lakes</strong> - Known for Iron Butt Stout</li>
        <li><strong>10 Barrel Brewing</strong> - Large patio, great for groups</li>
        <li><strong>Crux Fermentation</strong> - Innovative beers and stunning views</li>
        <li><strong>Silver Moon Brewing</strong> - Family-friendly with live music</li>
      </ul>
      
      <h2>Beer Events</h2>
      <p>Check our calendar for brewery tours, tap takeovers, and the annual Bend Brew Fest!</p>
    `,
    category: "Food & Drink",
    image: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=800",
    featured: false,
    createdAt: new Date('2026-03-05')
  },
  {
    title: "Family-Friendly Weekend Activities in Bend",
    content: `
      <p>Looking for things to do with kids? Bend has endless options!</p>
      
      <h2>Outdoor Fun</h2>
      <ul>
        <li>Drake Park - Splash pad and playground</li>
        <li>Old Mill District - Shopping, dining, and carousel</li>
        <li>Lava Butte - Easy hike with volcanic views</li>
        <li>Tumalo State Park - Swimming and picnicking</li>
      </ul>
      
      <h2>Indoor Activities</h2>
      <ul>
        <li>High Desert Museum - Interactive exhibits</li>
        <li>My Place - Indoor play center</li>
        <li>Regal Cinema - Latest movies</li>
      </ul>
      
      <h2>Seasonal Events</h2>
      <p>Check our events calendar for family festivals, concerts in the park, and holiday celebrations!</p>
    `,
    category: "Family",
    image: "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800",
    featured: false,
    createdAt: new Date('2026-03-01')
  },
  {
    title: "Winter to Spring Transition: What's Open in Bend",
    content: `
      <p>As we transition from ski season to spring, here's what you need to know:</p>
      
      <h2>Skiing</h2>
      <p>Mt. Bachelor typically stays open through May! Spring skiing means softer snow and sunny days.</p>
      
      <h2>Hiking</h2>
      <p>Lower elevation trails are clearing. Higher elevations may still have snow - check conditions before heading out.</p>
      
      <h2>Biking</h2>
      <p>Phil's Trail Complex opens for mountain biking in April. Road cycling is great year-round on sunny days.</p>
      
      <h2>Events</h2>
      <p>Spring festivals start in April - check our calendar for the latest updates!</p>
    `,
    category: "Outdoors",
    image: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800",
    featured: false,
    createdAt: new Date('2026-02-25')
  },
  {
    title: "Best Coffee Shops in Bend",
    content: `
      <p>Bend takes its coffee seriously. Here are our local favorites:</p>
      
      <h2>Downtown</h2>
      <ul>
        <li><strong>Volcano Coffee Works</strong> - Small batch roaster, amazing espresso</li>
        <li><strong>Mirror Pond Creamery</strong> - Coffee + ice cream = perfect combo</li>
        <li><strong>Coffee In Motion</strong> - Drive-thru with quality beans</li>
      </ul>
      
      <h2>East Side</h2>
      <ul>
        <li><strong>Companjo Coffee</strong> - Cozy spot with pastries</li>
        <li><strong>Sparrow Bakery</strong> - Coffee + fresh croissants</li>
      </ul>
      
      <h2>West Side</h2>
      <ul>
        <li><strong>Starbucks Reserve</strong> - Elevated Starbucks experience</li>
        <li><strong>Dutch Bros</strong> - Oregon-born, always friendly</li>
      </ul>
    `,
    category: "Food & Drink",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    featured: false,
    createdAt: new Date('2026-02-20')
  },
  {
    title: "Ultimate Guide to Bend Farmers Markets",
    content: `
      <p>Support local farmers and artisans at Bend's amazing markets!</p>
      
      <h2>Bend Farmers Market</h2>
      <p><strong>When:</strong> Saturdays, May-October<br>
      <strong>Where:</strong> Old Mill District<br>
      <strong>What:</strong> 100+ vendors, live music, food trucks</p>
      
      <h2>Northwest Crossing Farmers Market</h2>
      <p><strong>When:</strong> Sundays, June-September<br>
      <strong>Where:</strong> NW Crossing<br>
      <strong>What:</strong> Neighborhood vibe, local produce</p>
      
      <h2>La Pine Farmers Market</h2>
      <p><strong>When:</strong> Thursdays, summer months<br>
      <strong>Where:</strong> La Pine Community Park<br>
      <strong>What:</strong> South County growers and makers</p>
      
      <p>Fresh, local, and community-focused!</p>
    `,
    category: "Food & Drink",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
    featured: false,
    createdAt: new Date('2026-02-15')
  },
  {
    title: "Mountain Biking in Bend: Beginner's Guide",
    content: `
      <p>Bend is a mountain biking destination. Here's how to get started:</p>
      
      <h2>Best Trails for Beginners</h2>
      <ul>
        <li><strong>Phil's Trail Complex</strong> - Flowy, well-marked, multiple difficulty levels</li>
        <li><strong>Wanoga</strong> - Similar to Phil's, less crowded</li>
        <li><strong>McKinney Butte</strong> - Gentle climbs, great views</li>
      </ul>
      
      <h2>Bike Rentals</h2>
      <p>Don't have a bike? Rent from:</p>
      <ul>
        <li>Bend Bike Shop - Downtown</li>
        <li>Hutch's Bikes - Multiple locations</li>
        <li>Good Bike - East side</li>
      </ul>
      
      <h2>Tips</h2>
      <ul>
        <li>Always wear a helmet</li>
        <li>Carry water and tools</li>
        <li>Yield to uphill riders</li>
        <li>Check trail conditions before heading out</li>
      </ul>
    `,
    category: "Outdoors",
    image: "https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=800",
    featured: false,
    createdAt: new Date('2026-02-10')
  }
];

async function populateBlogs() {
  console.log('📝 Populating Firestore blogs collection...\n');
  
  const blogsRef = db.collection('blogs');
  
  // Check current count
  const snapshot = await blogsRef.count().get();
  console.log(`Current blog count: ${snapshot.data().count}\n`);
  
  // Add each blog post
  for (const post of blogPosts) {
    try {
      const docRef = await blogsRef.add({
        title: post.title,
        content: post.content.trim(),
        category: post.category,
        image: post.image,
        featured: post.featured,
        createdAt: admin.firestore.Timestamp.fromDate(post.createdAt),
        published: true,
        author: 'Good Day Bend Team',
        slug: post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      });
      
      console.log(`✅ Created: "${post.title}"`);
    } catch (error) {
      console.error(`❌ Failed to create "${post.title}":`, error.message);
    }
  }
  
  // Verify final count
  const finalSnapshot = await blogsRef.count().get();
  console.log(`\n🎉 Final blog count: ${finalSnapshot.data().count}`);
  console.log('\n✨ Done! Blog posts should now appear on gooddaybend.com/blog');
}

// Run
populateBlogs().catch(console.error);
