#!/bin/bash

# Directory for final GHL snippets
OUTPUT_DIR="/Users/md/Documents/Good Day Bend v6/ghl_snippets"
PUBLIC_DIR="/Users/md/Documents/Good Day Bend v6/public"

mkdir -p "$OUTPUT_DIR"

# Function to generate individual snippet file
generate_file() {
    local filename=$1
    local input_path="$PUBLIC_DIR/$filename"
    local output_path="$OUTPUT_DIR/$filename"

    echo "Generating $output_path..."
    python3 generate_snippet.py "$input_path" "$output_path"
}

# Process all 8 pages
generate_file "index.html"
generate_file "daily-updates.html"
generate_file "daily-details.html"
generate_file "events.html"
generate_file "event-details.html"
generate_file "calendar.html"
generate_file "blog.html"
generate_file "blog-post.html"

echo "---------------------------------------------------"
echo "Success! 8 separate GHL snippet files created in:"
echo "$OUTPUT_DIR"
