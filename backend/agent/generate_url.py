
from google.cloud import storage
import datetime
from agent import config

def get_url():
    bucket_name = "gcf-v2-sources-1028197907604-us-central1"
    blob_name = "comparison.html"
    
    try:
        client = storage.Client(project="good-day-bend-v7-test")
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        url = blob.generate_signed_url(expiration=datetime.timedelta(hours=24))
        print(f"URL: {url}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_url()
