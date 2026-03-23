"""
Text Overlay Module for Good Day Bend Social Images
Adds branded text overlays to AI-generated images
"""

from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from typing import Optional, Tuple
import os
import requests

# Brand Colors
DARK = "#0A1915"
GOLD = "#FBBF24"
WHITE = "#FFFFFF"
CREAM = "#FAF3E3"

# Default overlay settings
DEFAULT_FONT_SIZE = 48
TITLE_FONT_SIZE = 64
WATERMARK_FONT_SIZE = 28


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Load system font with fallback"""
    font_names = [
        "Helvetica-Bold" if bold else "Helvetica",
        "Arial Bold" if bold else "Arial",
    ]
    
    for font_name in font_names:
        try:
            return ImageFont.truetype(f"/System/Library/Fonts/{font_name}.ttc", size)
        except:
            pass
    
    return ImageFont.load_default()


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def add_text_overlay(
    image_bytes: bytes,
    title: Optional[str] = None,
    subtitle: Optional[str] = None,
    watermark: str = "@GoodDayBend",
    position: str = "bottom",  # "top", "center", "bottom"
    overlay_opacity: float = 0.7
) -> bytes:
    """
    Add text overlay to an image
    
    Args:
        image_bytes: Original image as bytes
        title: Main title text (large)
        subtitle: Subtitle text (smaller)
        watermark: Bottom watermark text
        position: Where to place the text ("top", "center", "bottom")
        overlay_opacity: Opacity of the dark overlay (0-1)
    
    Returns:
        Modified image as bytes
    """
    # Load image
    img = Image.open(BytesIO(image_bytes)).convert('RGBA')
    width, height = img.size
    
    # Create overlay layer (semi-transparent dark gradient)
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # Calculate overlay area based on position
    if position == "top":
        overlay_top = 0
        overlay_bottom = int(height * 0.35)
        text_y_base = 40
    elif position == "center":
        overlay_top = int(height * 0.3)
        overlay_bottom = int(height * 0.7)
        text_y_base = int(height * 0.35)
    else:  # bottom
        overlay_top = int(height * 0.55)
        overlay_bottom = height
        text_y_base = int(height * 0.65)
    
    # Draw gradient overlay
    opacity = int(255 * overlay_opacity)
    for y in range(overlay_top, overlay_bottom):
        # Calculate gradient opacity
        if position == "bottom":
            progress = (y - overlay_top) / (overlay_bottom - overlay_top)
        else:
            progress = 1 - ((y - overlay_top) / (overlay_bottom - overlay_top))
        
        line_opacity = int(opacity * (0.3 + 0.7 * progress))
        overlay_draw.line([(0, y), (width, y)], fill=(10, 25, 21, line_opacity))
    
    # Composite overlay onto image
    img = Image.alpha_composite(img, overlay)
    
    # Create draw context for text
    draw = ImageDraw.Draw(img)
    
    # Load fonts
    title_font = get_font(TITLE_FONT_SIZE, bold=True)
    subtitle_font = get_font(DEFAULT_FONT_SIZE, bold=False)
    watermark_font = get_font(WATERMARK_FONT_SIZE, bold=True)
    
    # Draw title
    if title:
        # Wrap title if too long
        max_width = width - 80
        if len(title) > 30:
            title = title[:27] + "..."
        
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (width - title_width) // 2
        
        # Draw text shadow
        draw.text((title_x + 3, text_y_base + 3), title, font=title_font, fill=hex_to_rgb(DARK) + (180,))
        # Draw main text
        draw.text((title_x, text_y_base), title, font=title_font, fill=hex_to_rgb(WHITE))
        
        text_y_base += 70
    
    # Draw subtitle
    if subtitle:
        if len(subtitle) > 50:
            subtitle = subtitle[:47] + "..."
        
        subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
        subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
        subtitle_x = (width - subtitle_width) // 2
        
        draw.text((subtitle_x, text_y_base), subtitle, font=subtitle_font, fill=hex_to_rgb(GOLD))
    
    # Draw watermark
    if watermark:
        wm_bbox = draw.textbbox((0, 0), watermark, font=watermark_font)
        wm_width = wm_bbox[2] - wm_bbox[0]
        wm_x = (width - wm_width) // 2
        wm_y = height - 50
        
        draw.text((wm_x, wm_y), watermark, font=watermark_font, fill=hex_to_rgb(GOLD) + (200,))
    
    # Convert back to bytes
    output = BytesIO()
    img.convert('RGB').save(output, format='JPEG', quality=90)
    output.seek(0)
    return output.getvalue()


def add_event_overlay_to_url(
    image_url: str,
    title: str,
    venue: Optional[str] = None,
    **kwargs
) -> bytes:
    """
    Download image from URL and add event overlay
    
    Args:
        image_url: URL of the image
        title: Event title
        venue: Optional venue name for subtitle
        **kwargs: Additional args passed to add_text_overlay
    
    Returns:
        Modified image as bytes
    """
    # Download image
    response = requests.get(image_url, timeout=30)
    response.raise_for_status()
    
    # Add overlay
    subtitle = f"@ {venue}" if venue else None
    return add_text_overlay(
        response.content,
        title=title,
        subtitle=subtitle,
        **kwargs
    )


def create_social_image(
    image_bytes: bytes,
    vibe: str,
    date_str: str
) -> bytes:
    """
    Create social media image for daily update
    
    Args:
        image_bytes: Hero image bytes
        vibe: Day's vibe text
        date_str: Formatted date string
    
    Returns:
        Social-ready image with overlays
    """
    return add_text_overlay(
        image_bytes,
        title=vibe,
        subtitle=date_str,
        watermark="@GoodDayBend",
        position="bottom"
    )


if __name__ == "__main__":
    # Test with a sample image
    print("Testing text overlay...")
    
    # Create a test image
    test_img = Image.new('RGB', (1080, 1080), hex_to_rgb("#1A847C"))
    buffer = BytesIO()
    test_img.save(buffer, format='PNG')
    test_bytes = buffer.getvalue()
    
    # Add overlay
    result = add_text_overlay(
        test_bytes,
        title="Winter Vibes",
        subtitle="Saturday, February 1st",
        watermark="@GoodDayBend"
    )
    
    # Save
    with open("/tmp/overlay_test.jpg", 'wb') as f:
        f.write(result)
    
    print(f"✅ Saved test to /tmp/overlay_test.jpg ({len(result)} bytes)")
