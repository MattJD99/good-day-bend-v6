
# Prompts for Good Day Bend v7 Agent

def get_blog_writer_prompt(date_str, vibe, events, headliners, source_links):
    """
    Returns the prompt for generating the daily update blog post.
    """
    return f"""
    You are the Editor of "Good Day Bend". Write today's daily update.
    
    INPUT DATA:
    - Date: {date_str}
    - Vibe: {vibe}
    - Events: {events}
    - Headliners: {headliners}
    
    DESIGN & TYPOGRAPHY RULES (Global CSS Injected via Wrapper):
    * The wrapper has "Outfit" (Body) and "Playfair Display" (Headings).
    * **CRITICAL**: Use specific classes or inline styles to enforce the "Massive" look.
    
    COMPONENTS TO GENERATE:
    
    1. **The Pulse Box**:
       <div style="background-color: #F8FAFC; border: 2px solid #0A1915; padding: 25px; margin-bottom: 30px; border-radius: 12px; box-shadow: 5px 5px 0px #0A1915;">
          <h2 style="font-family: 'Playfair Display', serif; margin-top:0;">Today's Vibe: {vibe}</h2>
          <p style="font-size: 1.25rem;">[Add star ratings for Family/Nightlife if available, else generic vibe check]</p>
       </div>

    2. **The Headliners (Card Style)**:
       Create a DIV for each Top 3 event.
       <div style="background:white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 1.8rem; color: #0A1915; margin-bottom: 5px;">HEADLINE TITLE HERE</h3>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; color: #64748b; margin-bottom: 15px; font-weight: 600;">
             🕒 TIME | 📍 VENUE | 💵 PRICE
          </div>
          <p style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; line-height: 1.6;">Description...</p>
          <a href="GOOGLE_MAPS_LINK" style="display:inline-block; margin-top:10px; font-weight:bold; color:#13ec5b; text-decoration:underline;">📍 Map It</a>
       </div>

    3. **The Rundown**:
       <ul style="font-size: 1.25rem; line-height: 1.8; list-style-type: square; padding-left: 20px;">
          <li>...</li>
       </ul>

    SEO & AEO MASTERY (The Secret Sauce):
    1.  **Semantic Search**: Use natural language to describe venue locations (e.g. "Located in the heart of the Old Mill District").
    2.  **Trusted Backlinks**: You MUST include references to these local authorities naturally: {source_links}.
    3.  **Entity Optimization**: Use full names for businesses and places.
    4.  **Internal Linking**: "Planning ahead? Check our <a href='/calendar.html'>Full Calendar</a>."

    OUTPUT: Pure HTML Body Content. NO <html> tags.
    """

def get_social_writer_prompt(article_content):
    """
    Returns the prompt for generating social media captions.
    """
    return f"""
    Based on this article: {article_content}
    Write a catchy Instagram/Facebook caption.
    - Start with a Hook.
    - Use 3-5 relevant hashtags: #BendOregon #InBend
    - Keep it under 280 chars.
    - Call to Action: "Link in Bio"
    """
