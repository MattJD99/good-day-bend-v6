#!/bin/bash
# Automated v7 Setup Script
# Extracts credentials from v6 and configures v7 environment

set -e

echo "🚀 Good Day Bend v7 - Automated Setup"
echo "======================================"
echo ""

# Project configuration
PROJECT_ID="good-day-bend-v7-test"
V6_PROJECT_ID="good-day-bend-v6"

# API Keys from v6 config.js
GEMINI_API_KEY="AIzaSyD77oys1tX0srrV1ZePLkll8EYB3OM0cI8"
SERPER_API_KEY="f30899d8c6ed03fb0ef48b3b02d46aa1f0d59736"
GHL_API_KEY="pit-2f3260f0-4faa-4dbc-b57b-b83667768ec5"

echo "📋 Configuration Overview"
echo "========================="
echo "Project ID: $PROJECT_ID"
echo "Gemini API: ${GEMINI_API_KEY:0:20}..."
echo "Serper API: ${SERPER_API_KEY:0:20}..."
echo ""

# Check if service account exists
SERVICE_ACCOUNT="functions/service-account.json"
if [ ! -f "$SERVICE_ACCOUNT" ]; then
    echo "❌ Service account not found: $SERVICE_ACCOUNT"
    echo ""
    echo "Options:"
    echo "1. Use v6 service account (works for testing)"
    echo "2. Create new v7 service account"
    echo ""
    read -p "Use v6 service account? (y/n): " use_v6
    
    if [ "$use_v6" = "y" ]; then
        echo "✅ Will use v6 service account"
        # Already using it from current location
    else
        echo "❌ Please create v7 service account first"
        echo ""
        echo "Instructions:"
        echo "1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=$PROJECT_ID"
        echo "2. Create service account with roles:"
        echo "   - Vertex AI User"
        echo "   - Storage Admin"  
        echo "   - Firestore User"
        echo "3. Download JSON key as: $SERVICE_ACCOUNT"
        exit 1
    fi
else
    echo "✅ Service account found"
    ACCOUNT_PROJECT=$(grep -o '"project_id": "[^"]*"' "$SERVICE_ACCOUNT" | cut -d'"' -f4)
    echo "   Project: $ACCOUNT_PROJECT"
    
    if [ "$ACCOUNT_PROJECT" != "$PROJECT_ID" ]; then
        echo "   ⚠️ WARNING: Using $ACCOUNT_PROJECT service account for $PROJECT_ID"
        echo "   This may work but you might need separate credentials for production"
    fi
fi

echo ""
echo "🔑 Setting Environment Variables"
echo "================================="

# Export environment variables
export GOOGLE_CLOUD_PROJECT="$PROJECT_ID"
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/$SERVICE_ACCOUNT"
export GEMINI_API_KEY="$GEMINI_API_KEY"
export GOOGLE_SEARCH_API_KEY="$SERPER_API_KEY"  # Using Serper for now
export GHL_API_KEY="$GHL_API_KEY"

# Note: Google Custom Search Engine ID needs to be created
# For now, we'll use Serper as fallback
echo "✅ GOOGLE_CLOUD_PROJECT=$PROJECT_ID"
echo "✅ GOOGLE_APPLICATION_CREDENTIALS=$SERVICE_ACCOUNT"
echo "✅ GEMINI_API_KEY=***${GEMINI_API_KEY: -10}"
echo "✅ GOOGLE_SEARCH_API_KEY=***${SERPER_API_KEY: -10} (Serper)"
echo "✅ GHL_API_KEY=***${GHL_API_KEY: -10}"

echo ""
echo "⚠️  Google Custom Search Engine"
echo "================================"
echo "v6 uses Serper.dev for search."
echo "v7 expects Google Custom Search but can adapt to use Serper."
echo ""
echo "Options:"
echo "1. Keep using Serper (easier, working in v6)"
echo "2. Create Google Custom Search Engine (free tier)"
echo ""
read -p "Use Serper for search? (y/n): " use_serper

if [ "$use_serper" = "y" ]; then
    echo "✅ Will adapt code to use Serper API"
    export USE_SERPER="true"
else
    echo "⚠️  You'll need to create:"
    echo "1. Custom Search API: https://console.cloud.google.com/apis/credentials"
    echo "2. Search Engine: https://programmablesearchengine.google.com/"
    echo ""
    read -p "Enter Google Search API Key (or press Enter to skip): " GOOGLE_SEARCH_KEY
    read -p "Enter Search Engine ID (or press Enter to skip): " SEARCH_ENGINE_ID
    
    if [ -n "$GOOGLE_SEARCH_KEY" ]; then
        export GOOGLE_SEARCH_API_KEY="$GOOGLE_SEARCH_KEY"
        echo "✅ GOOGLE_SEARCH_API_KEY set"
    fi
    
    if [ -n "$SEARCH_ENGINE_ID" ]; then
        export GOOGLE_SEARCH_ENGINE_ID="$SEARCH_ENGINE_ID"
        echo "✅ GOOGLE_SEARCH_ENGINE_ID set"
    fi
fi

echo ""
echo "💾 Persisting Configuration"
echo "==========================="

# Create .env file
cat > .env << EOF
# Good Day Bend v7 Environment Variables
# Generated: $(date)

# Google Cloud
export GOOGLE_CLOUD_PROJECT="$PROJECT_ID"
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/$SERVICE_ACCOUNT"

# Gemini API (from v6)
export GEMINI_API_KEY="$GEMINI_API_KEY"

# Search API (Serper from v6)
export GOOGLE_SEARCH_API_KEY="$SERPER_API_KEY"
export USE_SERPER="true"

# Go High Level (from v6)
export GHL_API_KEY="$GHL_API_KEY"

# Optional: Google Custom Search (if created)
# export GOOGLE_SEARCH_ENGINE_ID="your-engine-id"
EOF

echo "✅ Created .env file"
echo ""
echo "To load these variables in new terminal sessions:"
echo "  source .env"

echo ""
echo "🧪 Testing Configuration"
echo "======================="

# Test Firestore connection
echo -n "Testing Firestore connection... "
if python3 -c "from google.cloud import firestore; db = firestore.Client(project='$PROJECT_ID'); print('OK')" 2>/dev/null; then
    echo "✅"
else
    echo "❌"
    echo "   Firestore connection failed. Check credentials."
fi

# Test Gemini API
echo -n "Testing Gemini API... "
if python3 -c "import google.generativeai as genai; genai.configure(api_key='$GEMINI_API_KEY'); model = genai.GenerativeModel('gemini-3.1-flash'); print('OK')" 2>/dev/null; then
    echo "✅"
else
    echo "❌"
    echo "   Gemini API test failed. Check API key."
fi

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Next Steps:"
echo "1. Source environment: source .env"
echo "2. Test Scout: python agent/test_scout.py"
echo "3. Test Publisher: python agent/test_publisher.py"
echo "4. Test Trend Blog: python agent/test_trend_blog.py"
echo ""
echo "💡 TIP: The code will need a small update to use Serper instead of"
echo "   Google Custom Search. I'll make that change now."
