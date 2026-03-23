#!/bin/bash
# Setup script for Image Generation System
# This will check for required environment variables and guide you through setup

set -e

echo "🎨 Image Generation System Setup"
echo "=================================="
echo ""

PROJECT_ID="good-day-bend-v7-test"
SERVICE_ACCOUNT_FILE="functions/service-account.json"

# Check if service account exists
if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "❌ Service account file not found: $SERVICE_ACCOUNT_FILE"
    echo ""
    echo "To create a service account:"
    echo "1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=$PROJECT_ID"
    echo "2. Create service account with these roles:"
    echo "   - Vertex AI User"
    echo "   - Storage Admin"
    echo "   - Firestore User"
    echo "3. Download JSON key and save as: $SERVICE_ACCOUNT_FILE"
    echo ""
    exit 1
else
    echo "✅ Service account file found"
    # Check if it's for the right project
    ACCOUNT_PROJECT=$(grep -o '"project_id": "[^"]*"' "$SERVICE_ACCOUNT_FILE" | cut -d'"' -f4)
    if [ "$ACCOUNT_PROJECT" != "$PROJECT_ID" ]; then
        echo "⚠️  WARNING: Service account is for project '$ACCOUNT_PROJECT'"
        echo "   Expected: '$PROJECT_ID'"
        echo "   You may need to create a new service account for v7-test"
    else
        echo "   Project: $ACCOUNT_PROJECT ✓"
    fi
fi

echo ""
echo "Checking environment variables..."
echo ""

# Function to check and set environment variable
check_env_var() {
    VAR_NAME=$1
    VAR_DESC=$2
    SETUP_URL=$3
    
    if [ -z "${!VAR_NAME}" ]; then
        echo "❌ $VAR_NAME not set"
        echo "   Description: $VAR_DESC"
        if [ -n "$SETUP_URL" ]; then
            echo "   Setup: $SETUP_URL"
        fi
        return 1
    else
        echo "✅ $VAR_NAME is set"
        return 0
    fi
}

# Check all required variables
ALL_SET=true

if ! check_env_var "GOOGLE_CLOUD_PROJECT" "Your Google Cloud Project ID" ""; then
    echo "   Run: export GOOGLE_CLOUD_PROJECT=\"$PROJECT_ID\""
    ALL_SET=false
fi

if ! check_env_var "GOOGLE_APPLICATION_CREDENTIALS" "Path to service account JSON" ""; then
    echo "   Run: export GOOGLE_APPLICATION_CREDENTIALS=\"$(pwd)/$SERVICE_ACCOUNT_FILE\""
    ALL_SET=false
fi

if ! check_env_var "GEMINI_API_KEY" "Gemini API key for vision analysis" "https://aistudio.google.com/apikey"; then
    echo "   Get key from: https://aistudio.google.com/apikey"
    echo "   Run: export GEMINI_API_KEY=\"your-api-key-here\""
    ALL_SET=false
fi

if ! check_env_var "GOOGLE_SEARCH_API_KEY" "Google Custom Search API key" "https://console.cloud.google.com/apis/credentials"; then
    echo "   Get key from: https://console.cloud.google.com/apis/credentials"
    echo "   Run: export GOOGLE_SEARCH_API_KEY=\"your-api-key-here\""
    ALL_SET=false
fi

if ! check_env_var "GOOGLE_SEARCH_ENGINE_ID" "Custom Search Engine ID" "https://programmablesearchengine.google.com/"; then
    echo "   Create search engine at: https://programmablesearchengine.google.com/"
    echo "   Run: export GOOGLE_SEARCH_ENGINE_ID=\"your-engine-id-here\""
    ALL_SET=false
fi

echo ""

if [ "$ALL_SET" = true ]; then
    echo "🎉 All environment variables are set!"
    echo ""
    echo "Ready to test image generation."
    echo "Run: python agent/test_image_generation.py"
    echo ""
else
    echo "⚠️  Some environment variables need to be set."
    echo ""
    echo "Quick setup commands:"
    echo "--------------------"
    echo "export GOOGLE_CLOUD_PROJECT=\"$PROJECT_ID\""
    echo "export GOOGLE_APPLICATION_CREDENTIALS=\"$(pwd)/$SERVICE_ACCOUNT_FILE\""
    echo "export GEMINI_API_KEY=\"your-gemini-api-key\""
    echo "export GOOGLE_SEARCH_API_KEY=\"your-search-api-key\""
    echo "export GOOGLE_SEARCH_ENGINE_ID=\"your-search-engine-id\""
    echo ""
    echo "Or add to your ~/.zshrc or ~/.bashrc to persist"
    echo ""
fi
