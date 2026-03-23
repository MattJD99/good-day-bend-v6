#!/bin/bash
# Cloud Scheduler Setup for Good Day Bend v7
# Sets up automated runs for Scout, Publisher, and Trend Blog

set -e

PROJECT_ID="good-day-bend-v7-test"
REGION="us-west1"
TIMEZONE="America/Los_Angeles"

echo "🚀 Setting up Cloud Scheduler for Good Day Bend v7"
echo "================================================="

# Switch to the correct project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📦 Enabling required APIs..."
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable run.googleapis.com

echo ""
echo "📅 Current schedule (Hybrid approach):"
echo "======================================="
echo "• Scout Weekly: Sunday 11PM - 14 days ahead"
echo "• Scout Daily: Mon-Sat 5AM - today+1 only"
echo "• Publisher: Daily 6AM - today's article"
echo "• Trend Blog: Tue/Thu 7AM - SEO articles"
echo ""

# Note: For now, we'll use local cron or a simple implementation
# Full Cloud Functions deployment requires additional setup

echo "⚠️  Note: Full Cloud Scheduler requires Cloud Functions endpoints"
echo ""
echo "For local/VPS automation, add to crontab:"
echo ""
echo "# Good Day Bend v7 Automation"
echo "# Scout: Sunday weekly + daily light scan"
echo "0 23 * * 0 cd /path/to/Good-Day-Bend-v7-Test && source .env && python3 agent/scout.py --days 14"
echo "0 5 * * 1-6 cd /path/to/Good-Day-Bend-v7-Test && source .env && python3 agent/scout.py --days 2"
echo ""
echo "# Publisher: Daily at 6AM"
echo "0 6 * * * cd /path/to/Good-Day-Bend-v7-Test && source .env && python3 agent/publisher.py"
echo ""
echo "# Trend Blog: Tue/Thu at 7AM"
echo "0 7 * * 2,4 cd /path/to/Good-Day-Bend-v7-Test && source .env && python3 agent/trend_blog.py"
echo ""

echo "✅ Setup reference complete!"
echo ""
echo "To deploy Cloud Functions for serverless scheduling, run:"
echo "  firebase deploy --only functions"
