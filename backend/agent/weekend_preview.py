"""
Weekend Preview HTML Generator for Good Day Bend

Generates the "Coming This Weekend" section for Mon-Thu daily updates
"""

from typing import Dict, List


def generate_weekend_preview_html(weekend_events: Dict[str, List[Dict]]) -> str:
    """
    Generate HTML for the weekend preview section
    
    Args:
        weekend_events: Dict with keys "Friday", "Saturday", "Sunday"
                       and values as lists of event dicts with title/venue/time
    
    Returns:
        HTML string for the weekend preview section, or empty string if no events
    """
    if not weekend_events:
        return ""
    
    # Count total events
    total_events = sum(len(events) for events in weekend_events.values())
    if total_events == 0:
        return ""
    
    # Build event lists for each day
    days_html = []
    
    for day_name in ["Friday", "Saturday", "Sunday"]:
        events = weekend_events.get(day_name, [])
        if not events:
            continue
        
        events_list = "".join([
            f'<li style="margin-bottom: 8px;">'
            f'<strong>{e.get("title", "Event")}</strong> '
            f'<span style="color: #64748b;">@ {e.get("venue", "TBD")}</span>'
            f'{" · " + e.get("time", "") if e.get("time") else ""}'
            f'</li>'
            for e in events[:5]  # Max 5 per day
        ])
        
        days_html.append(f'''
            <div style="margin-bottom: 20px;">
                <h4 style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; color: #0A1915; margin-bottom: 10px; font-weight: 700;">
                    {day_name}
                </h4>
                <ul style="list-style-type: disc; padding-left: 20px; margin: 0; font-family: 'Outfit', sans-serif; font-size: 1rem; line-height: 1.6;">
                    {events_list}
                </ul>
            </div>
        ''')
    
    if not days_html:
        return ""
    
    # Wrap in weekend preview container
    html = f'''
<!-- Weekend Preview Section -->
<div style="background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%); border: 2px solid #d97706; border-radius: 16px; padding: 25px; margin: 40px 0; position: relative;">
    <div style="position: absolute; top: -14px; left: 20px; background: #d97706; color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; font-family: 'Outfit', sans-serif; text-transform: uppercase; letter-spacing: 1px;">
        🌟 Coming This Weekend
    </div>
    
    <h3 style="font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #92400e; margin-top: 10px; margin-bottom: 20px;">
        Weekend Highlights
    </h3>
    
    {"".join(days_html)}
    
    <div style="margin-top: 20px; text-align: center;">
        <a href="/calendar" style="background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-family: 'Outfit', sans-serif;">
            See Full Weekend Calendar →
        </a>
    </div>
</div>
'''
    
    return html


def should_include_weekend_preview(target_date) -> bool:
    """
    Check if we should include weekend preview for this date
    
    Returns True for Mon-Thu, False for Fri-Sun
    """
    day_of_week = target_date.weekday()  # 0=Mon, 6=Sun
    return day_of_week < 4  # Mon-Thu only
