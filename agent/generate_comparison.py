
from agent import publisher_tools, config
from google.cloud import storage
import datetime
import os

def generate_and_share():
    # 1. Setup
    target_date = "2026-01-26" # Use Monday as a good test day
    print(f"🚀 Generating v7 Content for {target_date}...")
    
    # 2. Agent Workflow
    print("   Fetching events...")
    events = publisher_tools.fetch_events(target_date)
    if not events:
        print("❌ No events found! Did you run sync_v6_data.py?")
        return

    print("   Analyzing strategy...")
    strategy = publisher_tools.analyze_strategy(events)
    
    print("   Writing blog...")
    blog_html = publisher_tools.generate_blog_content(events, strategy, target_date)
    
    print("   Writing social...")
    social_caption = publisher_tools.generate_social_content(blog_html)
    
    # 3. Construct HTML View
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>v7 Agent Comparison - {target_date}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; background: #f9f9f9; }}
            .container {{ background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            .metadata {{ background: #f0f9ff; padding: 15px; margin-bottom: 30px; border-radius: 8px; border-left: 4px solid #0066cc; }}
            .social-card {{ background: #f0fdf4; padding: 20px; margin-top: 40px; border-radius: 8px; border: 1px dashed #16a34a; }}
            h1 {{ border-bottom: 2px solid #eee; padding-bottom: 10px; }}
            .label {{ font-weight: bold; color: #555; text-transform: uppercase; font-size: 0.8em; letter-spacing: 1px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>v7 Agent Output Preview</h1>
            
            <div class="metadata">
                <div class="label">Target Date</div>
                <div>{target_date}</div>
                <br>
                <div class="label">Strategy Vibe</div>
                <div>{strategy.get('vibe')}</div>
                <br>
                <div class="label">Events Found</div>
                <div>{len(events)}</div>
            </div>

            <div class="blog-preview">
                <div class="label">GENERATED BLOG CONTENT</div>
                <hr>
                {blog_html}
            </div>

            <div class="social-card">
                <div class="label">GENERATED INSTAGRAM CAPTION</div>
                <p style="white-space: pre-wrap; font-family: monospace; font-size: 1.1em;">{social_caption}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # 4. Save and Upload
    filename = "v7_comparison_preview.html"
    with open(filename, "w") as f:
        f.write(full_html)
        
    print(f"✅ Saved local preview: {os.path.abspath(filename)}")
    
    # Try Upload
    bucket_name = f"{config.PROJECT_ID}.appspot.com"
    try:
        print(f"☁️  Uploading to gs://{bucket_name}...")
        client = storage.Client(project=config.PROJECT_ID)
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(filename)
        
        # Upload
        blob.upload_from_filename(filename)
        
        # Make public (legacy method, or use signed URL)
        # Note: 'acl' might be disabled on uniform bucket-level access. 
        # using make_public() often fails if uniform access is on.
        # We'll try to just print the public link and if 403, we give signed url.
        
        try:
            blob.make_public()
            public_url = blob.public_url
            print(f"\n🎉 SUCCESS! View the comparison here:\n{public_url}\n")
        except:
            # Fallback to signed URL (valid 1 hour)
            print("   (Bucket is likely private/uniform, generating signed URL)")
            signed_url = blob.generate_signed_url(expiration=datetime.timedelta(hours=1))
            print(f"\n🎉 SUCCESS! View the comparison here (Valid 1hr):\n{signed_url}\n")
            
    except Exception as e:
        print(f"⚠️ Upload failed: {e}")
        print("   (Please check the local file instead)")

if __name__ == "__main__":
    generate_and_share()
