#!/bin/bash

ARTIFACT_FILE="/Users/md/.gemini/antigravity/brain/71f97de3-b5b0-40fb-9d11-e00b8f53e941/ghl_snippets.md"
PUBLIC_DIR="/Users/md/Documents/Good Day Bend v6/public"

# Function to process and append
append_snippet() {
    local file=$1
    local title=$2
    local temp_out="temp_${file}"

    echo "Processing $file..."
    python3 generate_snippet.py "$PUBLIC_DIR/$file" "$temp_out"

    echo "" >> "$ARTIFACT_FILE"
    echo "## $title" >> "$ARTIFACT_FILE"
    echo "" >> "$ARTIFACT_FILE"
    echo '```html' >> "$ARTIFACT_FILE"
    cat "$temp_out" >> "$ARTIFACT_FILE"
    echo "" >> "$ARTIFACT_FILE"
    echo '```' >> "$ARTIFACT_FILE"
    echo "" >> "$ARTIFACT_FILE"

    rm "$temp_out"
}

# Process files
append_snippet "index.html" "Home Page (index.html)"
append_snippet "daily-updates.html" "Daily Updates List (daily-updates.html)"
append_snippet "daily-details.html" "Daily Update Details (daily-details.html)"
append_snippet "events.html" "Events List (events.html)"
append_snippet "event-details.html" "Event Details (event-details.html)"
append_snippet "calendar.html" "Calendar (calendar.html)"
append_snippet "blog.html" "Blog List (blog.html)"
append_snippet "blog-post.html" "Blog Post Details (blog-post.html)"

echo "Done generating GHL Snippets."
