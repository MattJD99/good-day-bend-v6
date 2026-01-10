import os
import glob

PUBLIC_DIR = "/Users/md/Documents/Good Day Bend v6/public"
FILES = [
    "index.html", "daily-updates.html", "daily-details.html", 
    "events.html", "event-details.html", "calendar.html", 
    "blog.html", "blog-post.html"
]

MOBILE_MENU_HTML = """
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden border-t border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark">
            <div class="space-y-1 px-4 py-3">
                <a href="daily-updates.html" class="block rounded-lg px-3 py-2 text-base font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors">Daily Updates</a>
                <a href="events.html" class="block rounded-lg px-3 py-2 text-base font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors">Events</a>
                <a href="calendar.html" class="block rounded-lg px-3 py-2 text-base font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors">Calendar</a>
                <a href="blog.html" class="block rounded-lg px-3 py-2 text-base font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors">Blog</a>
                <button class="w-full mt-4 flex items-center justify-center rounded-lg bg-primary hover:bg-green-400 px-5 py-2 text-sm font-bold text-[#0d1b12] transition-colors">
                    Sign In
                </button>
            </div>
        </div>
"""

def process_file(filename):
    path = os.path.join(PUBLIC_DIR, filename)
    if not os.path.exists(path):
        print(f"Skipping {filename} (not found)")
        return

    with open(path, 'r') as f:
        content = f.read()

    # 1. Add ID to button
    # Look for the mobile menu button pattern
    # <button class="p-2 text-slate-600 dark:text-slate-300">
    # We want to change it to:
    # <button id="mobile-menu-btn" class="p-2 text-slate-600 dark:text-slate-300">
    
    target_btn = '<button class="p-2 text-slate-600 dark:text-slate-300">'
    replacement_btn = '<button id="mobile-menu-btn" class="p-2 text-slate-600 dark:text-slate-300">'
    
    if 'id="mobile-menu-btn"' not in content:
        if target_btn in content:
            content = content.replace(target_btn, replacement_btn)
            print(f"Updated button in {filename}")
        else:
            print(f"Warning: Could not find button pattern in {filename}")
    
    # 2. Add Mobile Menu HTML
    # We want to insert it before the closing </nav> tag
    # But only if it doesn't already exist
    if 'id="mobile-menu"' not in content:
        if '</nav>' in content:
            # Only replace the FIRST occurrence of </nav> which matches the top nav
            # Wait, checking if there are multiple navs... usually just one top nav.
            # Let's replace the first </nav> found.
            content = content.replace('</nav>', MOBILE_MENU_HTML + '\n    </nav>', 1)
            print(f"Added menu HTML to {filename}")
        else:
            print(f"Warning: Could not find </nav> in {filename}")

    with open(path, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    for fname in FILES:
        process_file(fname)
