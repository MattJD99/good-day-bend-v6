"""
Google Trends Research for Good Day Bend
Discovers trending search topics about Bend, Oregon
"""

from pytrends.request import TrendReq
from typing import List, Dict
import time

def get_trending_bend_topics(max_topics=10, timeframe='today 3-m') -> List[Dict]:
    """
    Get trending search topics related to Bend, Oregon
    
    Args:
        max_topics: Maximum number of trending topics to return
        timeframe: Google Trends timeframe ('today 1-m', 'today 3-m', 'today 12-m')
    
    Returns:
        List of trending topics with search interest scores:
        [
            {
                "query": "things to do bend oregon winter",
                "interest": 87,  # 0-100 scale
                "type": "rising" or "top"
            },
            ...
        ]
    """
    print(f"🔍 Fetching trending topics for 'Bend Oregon' (timeframe: {timeframe})")
    
    try:
        # Initialize pytrends
        pytrends = TrendReq(hl='en-US', tz=360)
        
        # Build keyword list for Bend
        bend_keywords = ['Bend Oregon', 'Visit Bend', 'Bend OR']
        
        all_topics = []
        
        for keyword in bend_keywords:
            retry_count = 0
            max_retries = 3
            
            while retry_count < max_retries:
                try:
                    # Build payload for keyword
                    pytrends.build_payload([keyword], timeframe=timeframe, geo='US')
                    
                    # Get related queries (both rising and top)
                    related_queries = pytrends.related_queries()
                    
                    if keyword in related_queries:
                        # Process rising queries (trending up)
                        if 'rising' in related_queries[keyword] and related_queries[keyword]['rising'] is not None:
                            rising_df = related_queries[keyword]['rising']
                            for _, row in rising_df.head(max_topics).iterrows():
                                all_topics.append({
                                    'query': row['query'],
                                    'interest': row['value'] if row['value'] != '+Infinity%' else 100,
                                    'type': 'rising',
                                    'source_keyword': keyword
                                })
                        
                        # Process top queries (highest volume)
                        if 'top' in related_queries[keyword] and related_queries[keyword]['top'] is not None:
                            top_df = related_queries[keyword]['top']
                            for _, row in top_df.head(max_topics).iterrows():
                                all_topics.append({
                                    'query': row['query'],
                                    'interest': row['value'],
                                    'type': 'top',
                                    'source_keyword': keyword
                                })
                    
                    # Success - break retry loop
                    break
                    
                except Exception as e:
                    retry_count += 1
                    if retry_count < max_retries:
                        print(f"⚠️ Error for '{keyword}' (attempt {retry_count}/{max_retries}): {e}")
                        print(f"   Retrying in {retry_count * 2} seconds...")
                        time.sleep(retry_count * 2)
                    else:
                        print(f"❌ Failed after {max_retries} attempts for '{keyword}': {e}")
                        continue
            
            # Be nice to Google Trends API
            time.sleep(2)

        
        # Deduplicate and sort by interest
        seen_queries = set()
        unique_topics = []
        
        for topic in sorted(all_topics, key=lambda x: x['interest'], reverse=True):
            query_normalized = topic['query'].lower().strip()
            if query_normalized not in seen_queries:
                seen_queries.add(query_normalized)
                unique_topics.append(topic)
        
        # Take top N
        result = unique_topics[:max_topics]
        
        print(f"✅ Found {len(result)} unique trending topics")
        for i, topic in enumerate(result[:5], 1):
            print(f"   {i}. {topic['query']} (interest: {topic['interest']}, {topic['type']})")
        
        return result
        
    except Exception as e:
        print(f"❌ Error fetching Google Trends: {e}")
        return []


def filter_relevant_topics(topics: List[Dict], min_interest=20) -> List[Dict]:
    """
    Filter trending topics to remove irrelevant or low-interest queries
    
    Args:
        topics: List of trending topics from get_trending_bend_topics
        min_interest: Minimum interest score to include
    
    Returns:
        Filtered list of relevant topics
    """
    # Keywords to exclude (too generic, irrelevant, etc.)
    exclude_keywords = [
        'weather', 'zip code', 'population', 'map', 'time zone',
        'county', 'elevation', 'real estate', 'homes for sale',
        'jobs', 'craigslist', 'zillow'
    ]
    
    filtered = []
    
    for topic in topics:
        query = topic['query'].lower()
        
        # Skip if interest too low
        if topic['interest'] < min_interest:
            continue
        
        # Skip if contains excluded keywords
        if any(exclude in query for exclude in exclude_keywords):
            continue
        
        # Skip if too generic
        if len(query.split()) < 2:
            continue
        
        filtered.append(topic)
    
    return filtered


def get_best_blog_topic(max_topics=10, timeframe='today 3-m') -> Dict:
    """
    Get the single best trending topic to write a blog article about
    
    Returns:
        Single topic dict or None if no suitable topics found
    """
    print("🎯 Finding best blog topic from Google Trends...")
    
    # Get trending topics
    topics = get_trending_bend_topics(max_topics=max_topics, timeframe=timeframe)
    
    # Filter to relevant topics
    filtered = filter_relevant_topics(topics)
    
    if not filtered:
        print("⚠️ No suitable trending topics found")
        return None
    
    best_topic = filtered[0]
    print(f"✅ Best topic: '{best_topic['query']}' (interest: {best_topic['interest']})")
    
    return best_topic
