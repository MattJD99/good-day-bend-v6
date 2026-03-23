"""
Weekly Instagram Carousel Generator for Good Day Bend
EXACT match to Canva template style
"""

from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import os
import math

# Brand Colors (from Canva template)
TEAL = "#1A847C"           # Corner stripes + watermark
ORANGE = "#E67E4A"         # Date text + corner stripes
GOLD_BORDER = "#D4A43A"    # Border around content
CREAM = "#FFF8E7"          # Background
DARK = "#1A1A1A"           # Event text
WHITE = "#FFFFFF"

# Secondary colors for categories
TEAL_LIGHT = "#2D9A90"     # Trivia/Karaoke labels

# Image dimensions (Instagram square)
IMG_WIDTH = 1080
IMG_HEIGHT = 1350  # 4:5 ratio for IG (or 1080 for square)

# Layout constants
CORNER_STRIPE_WIDTH = 180
CONTENT_MARGIN = 100
BORDER_WIDTH = 8


def get_font(font_type: str, size: int) -> ImageFont.FreeTypeFont:
    """
    Load appropriate font
    font_type: "serif" (Playfair-like), "sans" (body text)
    """
    # Try to find suitable fonts on macOS
    serif_fonts = [
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/System/Library/Fonts/Times.ttc",
        "/System/Library/Fonts/NewYork.ttf",
    ]
    
    sans_fonts = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSText.ttf",
        "/System/Library/Fonts/SFNSDisplay.ttf",
    ]
    
    fonts = serif_fonts if font_type == "serif" else sans_fonts
    
    for font_path in fonts:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except:
                continue
    
    return ImageFont.load_default()


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def draw_diagonal_corners(draw: ImageDraw, width: int, height: int):
    """
    Draw the diagonal stripe corners matching Canva template
    Top-left & bottom-right: Teal + Orange stripes
    Top-right & bottom-left: Orange + Teal stripes
    """
    stripe_w = CORNER_STRIPE_WIDTH
    
    # Colors
    teal = hex_to_rgb(TEAL)
    orange = hex_to_rgb(ORANGE)
    yellow = hex_to_rgb("#F4D03F")  # Light yellow for accent
    
    # Top-left corner - teal background with orange/yellow stripes
    # Draw as polygon
    draw.polygon([
        (0, 0),
        (stripe_w * 2.5, 0),
        (0, stripe_w * 2.5)
    ], fill=teal)
    
    # Orange stripe in top-left
    draw.polygon([
        (0, stripe_w * 0.8),
        (stripe_w * 1.5, 0),
        (stripe_w * 2.2, 0),
        (0, stripe_w * 1.6)
    ], fill=orange)
    
    # Top-right corner
    draw.polygon([
        (width, 0),
        (width - stripe_w * 2.5, 0),
        (width, stripe_w * 2.5)
    ], fill=orange)
    
    # Blue stripe in top-right
    draw.polygon([
        (width, stripe_w * 0.6),
        (width - stripe_w * 1.3, 0),
        (width - stripe_w * 2.0, 0),
        (width, stripe_w * 1.4)
    ], fill=teal)
    
    # Yellow accent
    draw.polygon([
        (width, stripe_w * 1.5),
        (width - stripe_w * 0.7, 0),
        (width - stripe_w * 1.2, 0),
        (width, stripe_w * 2.0)
    ], fill=yellow)
    
    # Bottom-left corner
    draw.polygon([
        (0, height),
        (stripe_w * 2.5, height),
        (0, height - stripe_w * 2.5)
    ], fill=orange)
    
    # Teal stripe in bottom-left
    draw.polygon([
        (0, height - stripe_w * 0.6),
        (stripe_w * 1.3, height),
        (stripe_w * 2.0, height),
        (0, height - stripe_w * 1.4)
    ], fill=teal)
    
    # Yellow accent
    draw.polygon([
        (0, height - stripe_w * 1.5),
        (stripe_w * 0.7, height),
        (stripe_w * 1.2, height),
        (0, height - stripe_w * 2.0)
    ], fill=yellow)
    
    # Bottom-right corner
    draw.polygon([
        (width, height),
        (width - stripe_w * 2.5, height),
        (width, height - stripe_w * 2.5)
    ], fill=teal)
    
    # Orange stripe in bottom-right
    draw.polygon([
        (width, height - stripe_w * 0.8),
        (width - stripe_w * 1.5, height),
        (width - stripe_w * 2.2, height),
        (width, height - stripe_w * 1.6)
    ], fill=orange)


def generate_day_slide(
    date: datetime,
    events: List[Dict],
    trivia_venues: Optional[List[str]] = None,
    karaoke_venues: Optional[List[str]] = None
) -> bytes:
    """
    Generate a single day slide matching exact Canva template
    
    Args:
        date: The date for this slide
        events: List of events, each with 'name' and 'venue' keys
        trivia_venues: Optional list of venues with trivia
        karaoke_venues: Optional list of venues with karaoke
    
    Returns:
        PNG image as bytes
    """
    # Create base image
    img = Image.new('RGB', (IMG_WIDTH, IMG_HEIGHT), hex_to_rgb(CREAM))
    draw = ImageDraw.Draw(img)
    
    # Draw diagonal corner stripes
    draw_diagonal_corners(draw, IMG_WIDTH, IMG_HEIGHT)
    
    # Draw gold border around content area
    border_margin = 60
    content_box = [
        border_margin,
        border_margin,
        IMG_WIDTH - border_margin,
        IMG_HEIGHT - border_margin
    ]
    draw.rectangle(content_box, outline=hex_to_rgb(GOLD_BORDER), width=BORDER_WIDTH)
    
    # Fill content area with cream
    inner_box = [
        border_margin + BORDER_WIDTH,
        border_margin + BORDER_WIDTH,
        IMG_WIDTH - border_margin - BORDER_WIDTH,
        IMG_HEIGHT - border_margin - BORDER_WIDTH
    ]
    draw.rectangle(inner_box, fill=hex_to_rgb(CREAM))
    
    # Load fonts
    font_date = get_font("sans", 40)
    font_day = get_font("serif", 90)
    font_event = get_font("sans", 32)
    font_category = get_font("sans", 30)
    font_watermark = get_font("sans", 32)
    
    # Content area bounds
    content_left = border_margin + 30
    content_right = IMG_WIDTH - border_margin - 30
    content_center = IMG_WIDTH // 2
    
    # Draw date (e.g., "January 26")
    date_str = date.strftime("%B %-d") if os.name != 'nt' else date.strftime("%B %d").replace(" 0", " ")
    date_bbox = draw.textbbox((0, 0), date_str, font=font_date)
    date_width = date_bbox[2] - date_bbox[0]
    date_y = border_margin + 40
    draw.text(
        (content_center - date_width // 2, date_y),
        date_str,
        fill=hex_to_rgb(ORANGE),
        font=font_date
    )
    
    # Draw day name (e.g., "Monday")
    day_name = date.strftime("%A")
    day_bbox = draw.textbbox((0, 0), day_name, font=font_day)
    day_width = day_bbox[2] - day_bbox[0]
    day_y = date_y + 45
    draw.text(
        (content_center - day_width // 2, day_y),
        day_name,
        fill=hex_to_rgb(DARK),
        font=font_day
    )
    
    # Starting Y position for events
    y_pos = day_y + 110
    line_spacing = 42
    
    # Calculate max events that fit
    available_height = IMG_HEIGHT - y_pos - 150  # Leave room for categories + watermark
    max_events = int(available_height / line_spacing) - 3  # Reserve for trivia/karaoke
    
    # Draw events
    for i, event in enumerate(events[:max_events]):
        event_text = f"{event.get('name', 'Event')} @ {event.get('venue', 'Venue')}"
        
        # Truncate if too long
        max_chars = 55
        if len(event_text) > max_chars:
            event_text = event_text[:max_chars-3] + "..."
        
        # Center the text
        event_bbox = draw.textbbox((0, 0), event_text, font=font_event)
        event_width = event_bbox[2] - event_bbox[0]
        x_pos = content_center - event_width // 2
        
        draw.text(
            (x_pos, y_pos),
            event_text,
            fill=hex_to_rgb(DARK),
            font=font_event
        )
        y_pos += line_spacing
    
    # Add some padding before categories
    y_pos += 10
    
    # Draw Trivia section (if venues provided)
    if trivia_venues:
        trivia_label = "Trivia:"
        trivia_venues_text = " | ".join(trivia_venues[:5])
        
        # Label
        label_bbox = draw.textbbox((0, 0), trivia_label, font=font_category)
        label_width = label_bbox[2] - label_bbox[0]
        draw.text(
            (content_center - label_width // 2, y_pos),
            trivia_label,
            fill=hex_to_rgb(TEAL),
            font=font_category
        )
        y_pos += 35
        
        # Venues
        venues_bbox = draw.textbbox((0, 0), trivia_venues_text, font=font_category)
        venues_width = venues_bbox[2] - venues_bbox[0]
        draw.text(
            (content_center - venues_width // 2, y_pos),
            trivia_venues_text,
            fill=hex_to_rgb(ORANGE),
            font=font_category
        )
        y_pos += 40
    
    # Draw Karaoke section (if venues provided)
    if karaoke_venues:
        karaoke_label = "Karaoke:"
        karaoke_venues_text = " | ".join(karaoke_venues[:4])
        
        # Label
        label_bbox = draw.textbbox((0, 0), karaoke_label, font=font_category)
        label_width = label_bbox[2] - label_bbox[0]
        draw.text(
            (content_center - label_width // 2, y_pos),
            karaoke_label,
            fill=hex_to_rgb(TEAL),
            font=font_category
        )
        y_pos += 35
        
        # Venues
        venues_bbox = draw.textbbox((0, 0), karaoke_venues_text, font=font_category)
        venues_width = venues_bbox[2] - venues_bbox[0]
        draw.text(
            (content_center - venues_width // 2, y_pos),
            karaoke_venues_text,
            fill=hex_to_rgb(ORANGE),
            font=font_category
        )
        y_pos += 45
    
    # Draw watermark
    watermark = "@GoodDayBend"
    wm_bbox = draw.textbbox((0, 0), watermark, font=font_watermark)
    wm_width = wm_bbox[2] - wm_bbox[0]
    wm_y = IMG_HEIGHT - border_margin - 50
    draw.text(
        (content_center - wm_width // 2, wm_y),
        watermark,
        fill=hex_to_rgb(TEAL),
        font=font_watermark
    )
    
    # Convert to bytes
    buffer = BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)
    return buffer.getvalue()


def generate_cover_slide(
    week_start: datetime,
    week_end: datetime
) -> bytes:
    """
    Generate the cover/intro slide for the carousel
    Matches the "THIS WEEK Bend, OR" template
    """
    img = Image.new('RGB', (IMG_WIDTH, IMG_HEIGHT), hex_to_rgb(CREAM))
    draw = ImageDraw.Draw(img)
    
    # Draw diagonal corners
    draw_diagonal_corners(draw, IMG_WIDTH, IMG_HEIGHT)
    
    # Draw center gold box
    box_width = 600
    box_height = 450
    box_left = (IMG_WIDTH - box_width) // 2
    box_top = (IMG_HEIGHT - box_height) // 2
    
    draw.rectangle(
        [box_left, box_top, box_left + box_width, box_top + box_height],
        fill=hex_to_rgb("#C9923A")  # Golden brown
    )
    
    # Load fonts
    font_logo = get_font("serif", 60)
    font_date = get_font("sans", 36)
    font_title = get_font("sans", 72)
    font_location = get_font("serif", 56)
    font_handle = get_font("sans", 32)
    
    center_x = IMG_WIDTH // 2
    
    # "Good Day Bend" logo text (simplified)
    logo_text = "Good Day"
    logo_bbox = draw.textbbox((0, 0), logo_text, font=font_logo)
    logo_width = logo_bbox[2] - logo_bbox[0]
    draw.text(
        (center_x - logo_width // 2, box_top + 40),
        logo_text,
        fill=hex_to_rgb(WHITE),
        font=font_logo
    )
    
    bend_text = "Bend"
    bend_font = get_font("serif", 80)
    bend_bbox = draw.textbbox((0, 0), bend_text, font=bend_font)
    bend_width = bend_bbox[2] - bend_bbox[0]
    draw.text(
        (center_x - bend_width // 2, box_top + 90),
        bend_text,
        fill=hex_to_rgb(WHITE),
        font=bend_font
    )
    
    # Date range
    date_range = f"{week_start.strftime('%B %-d')}-{week_end.strftime('%-d')}" if os.name != 'nt' else \
                 f"{week_start.strftime('%B %d').replace(' 0', ' ')}-{week_end.day}"
    date_bbox = draw.textbbox((0, 0), date_range, font=font_date)
    date_width = date_bbox[2] - date_bbox[0]
    draw.text(
        (center_x - date_width // 2, box_top + 190),
        date_range,
        fill=hex_to_rgb(CREAM),
        font=font_date
    )
    
    # "THIS WEEK"
    title = "THIS WEEK"
    title_bbox = draw.textbbox((0, 0), title, font=font_title)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(
        (center_x - title_width // 2, box_top + 240),
        title,
        fill=hex_to_rgb(WHITE),
        font=font_title
    )
    
    # "Bend, OR"
    location = "Bend, OR"
    loc_bbox = draw.textbbox((0, 0), location, font=font_location)
    loc_width = loc_bbox[2] - loc_bbox[0]
    draw.text(
        (center_x - loc_width // 2, box_top + 320),
        location,
        fill=hex_to_rgb(WHITE),
        font=font_location
    )
    
    # Handle
    handle = "@GoodDayBend"
    handle_bbox = draw.textbbox((0, 0), handle, font=font_handle)
    handle_width = handle_bbox[2] - handle_bbox[0]
    draw.text(
        (center_x - handle_width // 2, box_top + 400),
        handle,
        fill=hex_to_rgb(CREAM),
        font=font_handle
    )
    
    buffer = BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)
    return buffer.getvalue()


def generate_cta_slide() -> bytes:
    """
    Generate the CTA slide (like, comment, share & save)
    """
    img = Image.new('RGB', (IMG_WIDTH, IMG_HEIGHT), hex_to_rgb(TEAL))
    draw = ImageDraw.Draw(img)
    
    # Gold rectangle in center
    box_width = 700
    box_height = 550
    box_left = (IMG_WIDTH - box_width) // 2
    box_top = (IMG_HEIGHT - box_height) // 2
    
    draw.rectangle(
        [box_left, box_top, box_left + box_width, box_top + box_height],
        fill=hex_to_rgb("#F4B942")  # Gold
    )
    
    # Load fonts
    font_small = get_font("sans", 32)
    font_large = get_font("sans", 56)
    font_body = get_font("sans", 26)
    font_handle = get_font("sans", 28)
    
    center_x = IMG_WIDTH // 2
    y_base = box_top + 60
    
    # "thank you for your support!"
    text1 = "thank you for your support!"
    t1_bbox = draw.textbbox((0, 0), text1, font=font_small)
    t1_width = t1_bbox[2] - t1_bbox[0]
    draw.text(
        (center_x - t1_width // 2, y_base),
        text1,
        fill=hex_to_rgb(DARK),
        font=font_small
    )
    
    # "like, comment,"
    text2 = "like, comment,"
    t2_bbox = draw.textbbox((0, 0), text2, font=font_large)
    t2_width = t2_bbox[2] - t2_bbox[0]
    draw.text(
        (center_x - t2_width // 2, y_base + 70),
        text2,
        fill=hex_to_rgb(TEAL),
        font=font_large
    )
    
    # "share & save"
    text3 = "share & save"
    t3_bbox = draw.textbbox((0, 0), text3, font=font_large)
    t3_width = t3_bbox[2] - t3_bbox[0]
    draw.text(
        (center_x - t3_width // 2, y_base + 140),
        text3,
        fill=hex_to_rgb(TEAL),
        font=font_large
    )
    
    # Body text
    lines = [
        "want your event to be featured with",
        "Good Day Bend? Head to the link in",
        "our bio and fill out our events form!"
    ]
    y_body = y_base + 250
    for line in lines:
        line_bbox = draw.textbbox((0, 0), line, font=font_body)
        line_width = line_bbox[2] - line_bbox[0]
        draw.text(
            (center_x - line_width // 2, y_body),
            line,
            fill=hex_to_rgb(DARK),
            font=font_body
        )
        y_body += 35
    
    # Handle
    handle = "@GoodDayBend"
    h_bbox = draw.textbbox((0, 0), handle, font=font_handle)
    h_width = h_bbox[2] - h_bbox[0]
    draw.text(
        (center_x - h_width // 2, y_base + 410),
        handle,
        fill=hex_to_rgb(TEAL),
        font=font_handle
    )
    
    buffer = BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)
    return buffer.getvalue()


def generate_week_carousel(
    week_start: datetime,
    events_by_day: Dict[str, List[Dict]],
    trivia_by_day: Optional[Dict[str, List[str]]] = None,
    karaoke_by_day: Optional[Dict[str, List[str]]] = None
) -> List[bytes]:
    """
    Generate complete carousel for a week (Canva template style)
    
    Args:
        week_start: Monday of the week
        events_by_day: Dict mapping day names to event lists
        trivia_by_day: Optional dict of trivia venues by day
        karaoke_by_day: Optional dict of karaoke venues by day
    
    Returns:
        List of PNG images as bytes (cover + 7 days + CTA)
    """
    slides = []
    
    # Calculate week end
    week_end = week_start + timedelta(days=6)
    
    # 1. Cover slide
    slides.append(generate_cover_slide(week_start, week_end))
    
    # 2. Day slides (Mon-Sun)
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    trivia_by_day = trivia_by_day or {}
    karaoke_by_day = karaoke_by_day or {}
    
    for i, day_name in enumerate(days):
        day_date = week_start + timedelta(days=i)
        day_events = events_by_day.get(day_name, [])
        
        # Generate placeholder if no events
        if not day_events:
            day_events = [{"name": "Check gooddaybend.com", "venue": "for events"}]
        
        slide = generate_day_slide(
            day_date,
            day_events,
            trivia_venues=trivia_by_day.get(day_name),
            karaoke_venues=karaoke_by_day.get(day_name)
        )
        slides.append(slide)
    
    # 3. CTA slide
    slides.append(generate_cta_slide())
    
    return slides


def save_carousel_preview(slides: List[bytes], output_dir: str = "/tmp/carousel_preview"):
    """Save carousel slides to disk for preview"""
    os.makedirs(output_dir, exist_ok=True)
    
    slide_names = ["00_cover"] + [f"{i+1:02d}_{day.lower()}" for i, day in enumerate(
        ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    )] + ["08_cta"]
    
    for i, slide_bytes in enumerate(slides):
        if i < len(slide_names):
            filename = f"{slide_names[i]}.png"
        else:
            filename = f"slide_{i+1:02d}.png"
        
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(slide_bytes)
        print(f"✅ Saved: {filepath}")
    
    print(f"\n📁 Preview saved to: {output_dir}")


if __name__ == "__main__":
    # Test: Generate sample carousel matching Canva template
    from datetime import datetime
    
    print("🎨 Generating Canva-style carousel...")
    
    # Sample events (matching the template examples)
    sample_events = {
        "Monday": [
            {"name": "Open Sew Adults", "venue": "Two Suns Art Studio"},
            {"name": "Visible Mending: Knits!", "venue": "Freak'n Art"},
            {"name": "Public Talk: Taylor Swift", "venue": "OSU Cascades"},
            {"name": "Comedy Through The Ages Trivia", "venue": "Bevel CB"},
            {"name": "Cocktail Class", "venue": "Waypoint BBC"},
            {"name": "Speed Dating (ages 50+)", "venue": "Stoller Wine Bar"},
            {"name": "Kids 3D Printing", "venue": "DIY Cave"},
            {"name": "Cuban Dance Class Series", "venue": "UPP Liquids"},
            {"name": "Women's Embodiment Circle", "venue": "Heartgrounds"},
            {"name": "Out of this World Book Club", "venue": "Roundabout"},
            {"name": "Trebled Souls Wellness", "venue": "Discovery West"},
            {"name": "Intro to Pilates", "venue": "Bend Pilates"},
            {"name": "Bluegrass Collective Mondays", "venue": "Silver Moon"},
        ],
        "Tuesday": [
            {"name": "Twins & Multiples Meet Up", "venue": "Play Society"},
            {"name": "Wild, Well, & Wealthy", "venue": "The Haven Co-Working"},
            {"name": "Beginner Line Dancing", "venue": "Blacksmith PH"},
            {"name": "Adults Open Art", "venue": "The Open Arts Center"},
            {"name": "History of Brewing in CO", "venue": "McMenamins OSF"},
            {"name": "Bachata Dance Class", "venue": "Foundation H+F"},
            {"name": "Pins & Chimes", "venue": "Still Water Yoga + Wellness"},
            {"name": "Bingo!", "venue": "River's Place"},
            {"name": "Nervous System Workbook", "venue": "Peoples Apothecary"},
            {"name": "Tuesday Night Jazz", "venue": "The Commonwealth Pub"},
        ],
        "Wednesday": [
            {"name": "Hello! Storytime", "venue": "Roundabout Books"},
            {"name": "BOGO Piercing Day", "venue": "Monolith Tattoo Studio"},
            {"name": "Kids Line Dance Lesson", "venue": "Cross-Eyed Cricket"},
            {"name": "Intro to Modern Swing", "venue": "The Coyote"},
            {"name": "Eric Leadbetter", "venue": "McMenamins OSF"},
            {"name": "Spaghetti Western Wednesday", "venue": "Tin Pan Theater"},
            {"name": "Kids Studio! Surrealism", "venue": "Freak'n Art"},
            {"name": "East Coast Swing Dance", "venue": "The Space"},
            {"name": "Be & Belong", "venue": "Cottage 33"},
            {"name": "Music Bingo", "venue": "Pinky G's Pizzeria"},
        ],
    }
    
    # Category examples
    trivia = {
        "Tuesday": ["Beach Hut Deli", "The Lot", "Pinky G's"],
        "Wednesday": ["Prost!", "Hosmer Bar", "Deschutes Brewery", "JC's"]
    }
    
    karaoke = {
        "Wednesday": ["Wonderland Chicken", "Astro Lounge", "Corey's"]
    }
    
    # Generate for sample week
    week_start = datetime(2026, 1, 26)
    slides = generate_week_carousel(week_start, sample_events, trivia, karaoke)
    save_carousel_preview(slides)
    
    print(f"\n✅ Generated {len(slides)} slides")
