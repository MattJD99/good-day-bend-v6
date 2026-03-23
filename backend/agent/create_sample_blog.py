"""
Create a sample blog article in Firestore to demonstrate the blogs collection
"""

from google.cloud import firestore
from datetime import datetime

PROJECT_ID = "good-day-bend-v7-test"

# Sample blog article about a trending Bend topic
sample_blog = {
    "id": "2026-01-26-bend-housing-market-update",
    "date": "2026-01-26",
    "title": "Bend Housing Market Shows Early Signs of Cooling in 2026",
    "excerpt": "Recent data from local realtors suggests the Central Oregon housing market may be stabilizing after years of rapid growth. Inventory levels are up 15% compared to last year, and median home prices have plateaued around $725K.",
    "topic": "housing",
    "tags": ["real-estate", "housing", "bend-economy", "central-oregon"],
    "html_content": """
<div style="background-color: #F8FAFC; border: 2px solid #0A1915; padding: 25px; margin-bottom: 30px; border-radius: 12px; box-shadow: 5px 5px 0px #0A1915;">
    <h2 style="font-family: 'Playfair Display', serif; margin-top:0;">Bend Housing Market: A Shift Underway</h2>
    <p style="font-size: 1.2rem; font-family: 'Outfit', sans-serif;">After years of breakneck growth, Bend's housing market is showing signs of stabilization in early 2026. Local real estate data reveals important shifts that both buyers and sellers should understand.</p>
</div>

<h2 style="font-family: 'Playfair Display', serif; font-size: 2rem; border-bottom: 3px solid #13ec5b; padding-bottom: 10px;">Key Market Indicators</h2>

<div style="background:white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h3 style="font-family: 'Playfair Display', serif; color: #0A1915;">Inventory Levels Rising</h3>
    <p style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; line-height: 1.7;">
        According to the <a href="https://www.visitbend.com/" target="_blank">Central Oregon Association of Realtors</a>, housing inventory in Bend is up 15% year-over-year. This increase gives buyers more options and reduces the intense bidding wars that characterized the market in 2024-2025.
    </p>
</div>

<div style="background:white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h3 style="font-family: 'Playfair Display', serif; color: #0A1915;">Median Prices Plateau</h3>
    <p style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; line-height: 1.7;">
        The median home price in Bend has stabilized around $725,000 - neither climbing nor falling significantly over the past six months. This represents a cooling from the 20%+ annual increases seen in recent years.
    </p>
</div>

<div style="background:white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <h3 style="font-family: 'Playfair Display', serif; color: #0A1915;">Days on Market Increasing</h3>
    <p style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; line-height: 1.7;">
        Homes are staying on the market an average of 45 days in early 2026, compared to just 12 days during the same period last year. This shift indicates a more balanced market where buyers have time to make thoughtful decisions.
    </p>
</div>

<h2 style="font-family: 'Playfair Display', serif; font-size: 2rem; border-bottom: 3px solid #13ec5b; padding-bottom: 10px; margin-top: 40px;">What This Means for Bend Residents</h2>

<p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; line-height: 1.7; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border-left: 5px solid #13ec5b;">
    <strong>For Buyers:</strong> The cooling market presents opportunities. With more inventory and less competition, you can take time to find the right home without rushing into offers $50K over asking.
</p>

<p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; line-height: 1.7; padding: 20px; background-color: #fff7ed; border-radius: 8px; border-left: 5px solid #fb923c; margin-top: 20px;">
    <strong>For Sellers:</strong> Pricing strategy matters more than ever. Overpriced listings are sitting longer, while homes priced competitively based on recent comparable sales are still moving within 30-60 days.
</p>

<h2 style="font-family: 'Playfair Display', serif; font-size: 2rem; border-bottom: 3px solid #13ec5b; padding-bottom: 10px; margin-top: 40px;">Looking Ahead</h2>

<p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; line-height: 1.7;">
    Economic experts at the <a href="https://www.bendoregon.gov/" target="_blank">City of Bend</a> suggest this stabilization reflects a healthier, more sustainable market. While dramatic price increases may be behind us, Bend's appeal as a destination for outdoor enthusiasts and remote workers continues to support long-term demand.
</p>

<p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; line-height: 1.7; margin-top: 30px;">
    <em>Stay informed about Bend's real estate market and other trending local topics by checking our blog regularly. For daily event updates, visit our <a href="/v7test/dailyupdates.html" style="color: #13ec5b; font-weight: bold;">Daily Updates</a> page.</em>
</p>
    """,
    "trend_sources": {
        "google_trends_score": 78,
        "news_mentions": 15,
        "trending_keywords": ["bend housing", "central oregon real estate", "bend home prices"]
    },
    "generated_at": firestore.SERVER_TIMESTAMP,
    "published": True
}

def create_sample_blog():
    """Create a sample blog article in Firestore"""
    db = firestore.Client(project=PROJECT_ID)
    
    # Use the slug as document ID
    doc_id = sample_blog["id"]
    blog_ref = db.collection("blogs").document(doc_id)
    
    # Remove 'id' from data since it's the document ID
    blog_data = {k: v for k, v in sample_blog.items() if k != 'id'}
    
    blog_ref.set(blog_data)
    print(f"✅ Created sample blog article: {doc_id}")
    print(f"   Title: {sample_blog['title']}")
    print(f"   Tags: {', '.join(sample_blog['tags'])}")

if __name__ == "__main__":
    create_sample_blog()
