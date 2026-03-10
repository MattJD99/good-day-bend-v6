import sys
import re

DOMAIN_URL = "https://gooddaybend.com"
FIREBASE_URL = "https://good-day-bend-v6.web.app"  # For static assets only

REPLACEMENTS = {
    # Navigation links - use clean URLs on gooddaybend.com
    'href="index.html"': f'href="{DOMAIN_URL}/"',
    'href="daily-updates.html"': f'href="{DOMAIN_URL}/daily-updates"',
    'href="daily-details.html"': f'href="{DOMAIN_URL}/daily-details"',
    'href="events.html"': f'href="{DOMAIN_URL}/events"',
    'href="event-details.html"': f'href="{DOMAIN_URL}/event-details"',
    'href="calendar.html"': f'href="{DOMAIN_URL}/calendar"',
    'href="blog.html"': f'href="{DOMAIN_URL}/blog"',
    'href="blog-post.html"': f'href="{DOMAIN_URL}/blog-post"',
    'href="featured.html"': f'href="{DOMAIN_URL}/featured"',
    'href="local-events.html"': f'href="{DOMAIN_URL}/local-events"',
    # Scripts - still load from Firebase hosting
    'src="./scripts/firebase-config.js"': f'src="{FIREBASE_URL}/firebase-config.js"',
    'src="./dynamic-content.js"': f'src="{FIREBASE_URL}/dynamic-content.js"',
    # Fix the broken onclick in daily-updates.html if encountered
    'text-text-secondary onclick=': 'text-text-secondary" onclick=',
    'hover:border-primary/20 onclick=': 'hover:border-primary/20" onclick=',
    # Replace relative onclicks - use clean URLs
    "onclick=\"window.location.href='daily-details.html'\"": f"onclick=\"window.location.href='{DOMAIN_URL}/daily-details'\"",
    "onclick=\"window.location.href='event-details.html'\"": f"onclick=\"window.location.href='{DOMAIN_URL}/event-details'\"",
    "onclick=\"window.location.href='/event-details?id='": f"onclick=\"window.location.href='{DOMAIN_URL}/event-details?id='",
}

SCRIPTS_BLOCK = f"""
    <!-- Firebase SDKs -->
    <script type="module" src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"></script>
    <script type="module" src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"></script>
    <!-- App Scripts -->
    <script type="module" src="{FIREBASE_URL}/firebase-config.js"></script>
    <script type="module" src="{FIREBASE_URL}/dynamic-content.js"></script>
"""

def process_file(input_path, output_path):
    with open(input_path, 'r') as f:
        content = f.read()

    # Apply replacements
    for old, new in REPLACEMENTS.items():
        content = content.replace(old, new)

    # Specific fix for daily-updates malformed HTML (regex might be safer for variations)
    # The grep showed: class="... onclick="
    # We want to insert a quote before onclick if it's missing.
    # Pattern: class="[^"]+ onclick=
    # This is hard to regex reliably without parsing.
    # The string replacements above `hover:border-primary/20 onclick=` should catch the specific cases in daily-updates.html.

    # Check if scripts already exist to avoid double injection
    if "firebase-config.js" not in content or "dynamic-content.js" not in content:
        # Inject scripts before </body>
        if "</body>" in content:
            content = content.replace("</body>", SCRIPTS_BLOCK + "\n</body>")
        else:
            content += SCRIPTS_BLOCK

    # Write output
    with open(output_path, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python generate_snippet.py <input_file> <output_file>")
        sys.exit(1)
    
    process_file(sys.argv[1], sys.argv[2])
