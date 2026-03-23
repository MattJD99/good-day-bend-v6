#!/bin/bash
export GEMINI_API_KEY="AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8"
export GHL_API_KEY="pit-2f3260f0-4faa-4dbc-b57b-b83667768ec5"
export GHL_LOCATION_ID="ljbXgigJfqxzsPrE4kqp"
export USE_SERPER="true"
export GOOGLE_SEARCH_API_KEY="f30899d8c6ed03fb0ef48b3b02d46aa1f0d59736"

echo "Deploying publisher_v7 (HTTP)..."
gcloud functions deploy publisher_v7 --quiet \
  --gen2 --runtime=python311 --region=us-central1 \
  --source=functions_python --entry-point=publisher_v7 \
  --trigger-http --allow-unauthenticated --project=good-day-bend-v6 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,GHL_API_KEY=$GHL_API_KEY,GHL_LOCATION_ID=$GHL_LOCATION_ID,USE_SERPER=$USE_SERPER,GOOGLE_SEARCH_API_KEY=$GOOGLE_SEARCH_API_KEY

echo "Deploying trend_blog_v7 (HTTP)..."
gcloud functions deploy trend_blog_v7 --quiet \
  --gen2 --runtime=python311 --region=us-central1 \
  --source=functions_python --entry-point=trend_blog_v7 \
  --trigger-http --allow-unauthenticated --project=good-day-bend-v6 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,GHL_API_KEY=$GHL_API_KEY,GHL_LOCATION_ID=$GHL_LOCATION_ID,USE_SERPER=$USE_SERPER,GOOGLE_SEARCH_API_KEY=$GOOGLE_SEARCH_API_KEY

echo "Deploying publisher_v7_scheduled (PubSub)..."
gcloud functions deploy publisher_v7_scheduled --quiet \
  --gen2 --runtime=python311 --region=us-central1 \
  --source=functions_python --entry-point=publisher_v7_scheduled \
  --trigger-topic=publisher-v7-trigger --project=good-day-bend-v6 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,GHL_API_KEY=$GHL_API_KEY,GHL_LOCATION_ID=$GHL_LOCATION_ID,USE_SERPER=$USE_SERPER,GOOGLE_SEARCH_API_KEY=$GOOGLE_SEARCH_API_KEY
