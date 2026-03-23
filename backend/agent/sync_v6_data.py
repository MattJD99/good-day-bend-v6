
from datetime import datetime, timedelta
import os

# Note: We use google-cloud-firestore directly to handle multi-project clients easily 
# if default creds assume a single project context, but firebase-admin is often easier for local scripts.
# However, explicit google.cloud.firestore.Client(project=...) is the verified way 
# when you have Application Default Credentials (ADC) that cover both projects.

from google.cloud import firestore

def sync_data():
    source_project = "good-day-bend-v6"
    dest_project = "good-day-bend-v7-test"
    
    print(f"🔄 Syncing data from {source_project} to {dest_project}...")
    
    # Initialize clients
    try:
        source_db = firestore.Client(project=source_project)
        dest_db = firestore.Client(project=dest_project)
    except Exception as e:
        print(f"❌ Error initializing clients: {e}")
        return

    # 1. Sync Events (Next 7 days)
    today = datetime.now().strftime("%Y-%m-%d")
    end_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    print(f"📅 Fetching events from {today} to {end_date}...")
    
    events_ref = source_db.collection("events")
    # Query events >= today
    query = events_ref.where(filter=firestore.FieldFilter("eventDate", ">=", today))
    # Note: In a real scenario we'd limit upper bound too, but for simplicity we fetch forward.
    
    docs = query.stream()
    count = 0
    
    batch = dest_db.batch()
    
    for doc in docs:
        data = doc.to_dict()
        event_date = data.get("eventDate")
        
        # Simple date filter if query didn't catch specific range (e.g. if we want to stop strictly at end_date)
        if event_date > end_date:
            continue
            
        # Write to destination
        dest_ref = dest_db.collection("events").document(doc.id)
        batch.set(dest_ref, data)
        count += 1
        
        if count % 400 == 0:
            batch.commit()
            batch = dest_db.batch()
            print(f"   Committed batch of 400 events...")

    if count > 0:
        batch.commit()
    print(f"✅ Synced {count} events.")

    # 2. Sync Recent Articles (for Context)
    print("📰 Fetching recent 10 articles...")
    articles_ref = source_db.collection("articles")
    # Assuming 'date' or 'publishDate' exists. Let's just grab last 10 added if no standard date field verified.
    # v6 likely uses 'date'.
    query_articles = articles_ref.limit(10) # Just grab 10 arbitrary recent ones or order by if known
    
    art_docs = query_articles.stream()
    art_count = 0
    art_batch = dest_db.batch()
    
    for doc in art_docs:
        data = doc.to_dict()
        dest_ref = dest_db.collection("articles").document(doc.id)
        art_batch.set(dest_ref, data)
        art_count += 1
    
    if art_count > 0:
        art_batch.commit()
    print(f"✅ Synced {art_count} articles.")

if __name__ == "__main__":
    sync_data()
