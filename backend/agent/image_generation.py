"""
Image Generation Module for Good Day Bend v7

Provides vision-guided image generation using:
- Google Image Search for reference images
- Gemini 2.5 Flash for vision analysis
- Imagen 4 Fast for image generation
- Firebase Storage for hosting
"""

import os
import base64
import requests
import asyncio
from io import BytesIO
from datetime import datetime
from typing import List, Optional, Dict
from google.cloud import firestore, storage
from vertexai.generative_models import GenerativeModel, Part
from vertexai.preview.vision_models import ImageGenerationModel
import vertexai

from agent.config import (
    PROJECT_ID,
    LOCATION,
    COLLECTION_BLOGS,
    COLLECTION_ARTICLES,
    MODEL_VISION,
    STORAGE_BUCKET
)

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

# Google Search API Configuration (you'll need to set these)
GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
GOOGLE_SEARCH_ENGINE_ID = os.getenv("GOOGLE_SEARCH_ENGINE_ID")


async def search_google_images(query: str, num_results: int = 3) -> List[str]:
    """
    Search Google Images and return URLs
    
    Args:
        query: Search query
        num_results: Number of images to find
        
    Returns:
        List of image URLs
    """
    if not GOOGLE_SEARCH_API_KEY or not GOOGLE_SEARCH_ENGINE_ID:
        print("⚠️ Google Search API not configured, skipping image search")
        return []
    
    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": GOOGLE_SEARCH_API_KEY,
            "cx": GOOGLE_SEARCH_ENGINE_ID,
            "q": query,
            "searchType": "image",
            "num": num_results,
            "safe": "active"
        }
        
        response = await asyncio.to_thread(requests.get, url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        image_urls = [item["link"] for item in data.get("items", [])]
        
        print(f"✅ Found {len(image_urls)} reference images")
        return image_urls
        
    except Exception as e:
        print(f"⚠️ Image search failed: {e}")
        return []


def download_image_as_base64(url: str) -> Optional[Dict]:
    """Download image and convert to base64 for Gemini"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        content_type = response.headers.get("content-type", "image/jpeg")
        
        return {
            "mime_type": content_type,
            "data": base64.b64encode(response.content).decode("utf-8"),
            "raw_data": response.content  # Keep raw bytes for Part
        }
        
    except Exception as e:
        print(f"⚠️ Failed to download image from {url}: {e}")
        return None


async def analyze_images_with_gemini(
    image_urls: List[str],
    topic: str,
    context: str = ""
) -> str:
    """
    Use Gemini 2.5 Flash to analyze reference images and create refined prompt
    
    Args:
        image_urls: List of reference image URLs
        topic: The subject matter (e.g., "Bend housing market")
        context: Additional context for the vision model
        
    Returns:
        Refined image generation prompt
    """
    if not image_urls:
        print("ℹ️ No reference images, using dry prompt")
        return f"Professional editorial photography of {topic} in Bend, Oregon. Photorealistic, depth of field, golden hour lighting, f/1.8, 8k resolution."
    
    try:
        # Download images and create Parts
        image_parts = []
        for url in image_urls:
            img_data = download_image_as_base64(url)
            if img_data:
                # Use Vertex AI Part object
                part = Part.from_data(
                    data=img_data["raw_data"],
                    mime_type=img_data["mime_type"]
                )
                image_parts.append(part)
        
        if not image_parts:
            print("⚠️ Failed to download any reference images")
            return f"Professional editorial photography of {topic} in Bend, Oregon. Photorealistic, depth of field, golden hour lighting, f/1.8, 8k resolution."
        
        # Configure Gemini
        model = GenerativeModel(MODEL_VISION)
        
        vision_prompt = f"""
You are an Art Director for "Good Day Bend", a premium lifestyle blog about Bend, Oregon.

Task:
1. Analyze these real-world reference images of "{topic}"
2. Extract key visual details:
   - Lighting (time of day, quality, shadows)
   - Composition (framing, focal points, rule of thirds)
   - Colors (palette, saturation, mood)
   - Environment (outdoor/indoor, weather, season)
   - Specific Bend landmarks or recognizable Central Oregon features
3. Write a high-fidelity image generation prompt that captures this realistic vibe

Constraints:
- NO TEXT or words in the image
- Style: Professional editorial photography, photorealistic
- Technical: depth of field, 8k resolution, sharp focus
- Focus on details you actually see (e.g., if snow → mention snow; pine trees → mention them)
- Make it feel authentically Bend, Oregon

{context}

Output ONLY the raw prompt string, no explanations.
"""
        
        # Combine prompt and images
        contents = [vision_prompt] + image_parts
        
        print("👁️ Analyzing reference images with Gemini 2.5 Flash...")
        response = model.generate_content(contents)
        refined_prompt = response.text.strip()
        
        print(f"✨ Vision-refined prompt: {refined_prompt[:100]}...")
        return refined_prompt
        
    except Exception as e:
        print(f"❌ Vision analysis failed: {e}")
        return f"Professional editorial photography of {topic} in Bend, Oregon. Photorealistic, depth of field, golden hour lighting, f/1.8, 8k resolution."


def should_apply_rockwell_style() -> bool:
    """
    Check if we should apply Norman Rockwell style (every 3rd image)
    
    Returns:
        True if Rockwell style should be applied
    """
    try:
        db = firestore.Client()
        counter_ref = db.collection("counters").document("imageGen")
        
        # Atomic counter increment
        @firestore.transactional
        def increment_counter(transaction):
            snapshot = counter_ref.get(transaction=transaction)
            new_count = 1
            
            if snapshot.exists:
                new_count = snapshot.get("count") + 1
            
            transaction.set(counter_ref, {"count": new_count}, merge=True)
            return new_count
        
        transaction = db.transaction()
        count = increment_counter(transaction)
        
        # Apply Rockwell every 3rd image
        if count % 3 == 0:
            print("🎨 Applying Norman Rockwell style!")
            return True
            
        return False
        
    except Exception as e:
        print(f"⚠️ Counter logic failed: {e}")
        return False


async def generate_image_with_vision(
    topic: str,
    context: str = "",
    search_query_suffix: str = "Bend Oregon",
    model_name: str = "imagen-4.0-generate-001"  # Imagen 4
) -> str:
    """
    Generate image using vision-guided workflow
    
    Steps:
    1. Search Google Images for reference
    2. Analyze with Gemini Vision
    3. Generate with Imagen 4
    4. Upload to Firebase Storage
    
    Args:
        topic: Main subject (e.g., "housing market trends")
        context: Additional context for vision analysis
        search_query_suffix: Append to search (default "Bend Oregon")
        model_name: Imagen model to use
        
    Returns:
        Public URL of generated image
    """
    print(f"🎨 Starting vision-guided generation for: {topic}")
    
    # Step 1: Search for reference images
    search_query = f"{topic} {search_query_suffix}"
    reference_urls = await search_google_images(search_query, num_results=3)
    
    # Step 2: Analyze with Gemini Vision
    refined_prompt = await analyze_images_with_gemini(reference_urls, topic, context)
    
    # Step 3: Apply Rockwell style occasionally
    if should_apply_rockwell_style():
        refined_prompt += " in the style of the painter Norman Rockwell"
    
    # Step 4: Generate with Imagen 4
    try:
        print(f"🖼️ Generating with Vertex AI: {model_name}")
        
        model = ImageGenerationModel.from_pretrained(model_name)
        
        response = model.generate_images(
            prompt=refined_prompt,
            number_of_images=1
        )
        
        if not response.images:
            raise Exception("No images generated")
        
        image = response.images[0]
        
        # Step 5: Upload to Firebase Storage
        bucket_name = STORAGE_BUCKET
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"blog-images/vertex-{timestamp}.jpg"
        blob = bucket.blob(filename)
        
        # Save image bytes
        img_bytes = BytesIO()
        image._pil_image.save(img_bytes, format="JPEG", quality=95)
        img_bytes.seek(0)
        
        blob.upload_from_file(img_bytes, content_type="image/jpeg")
        
        # Make publicly accessible (matches V6 behavior)
        blob.make_public()
        
        # Use GCS public URL format (same as V6 — no auth required)
        public_url = f"https://storage.googleapis.com/{STORAGE_BUCKET}/{filename}"
        print(f"✅ Image uploaded: {public_url}")
        
        return public_url
        
    except Exception as e:
        print(f"❌ Image generation failed: {e}")
        
        # Fallback to a stock image (you can customize this)
        fallback_url = "https://storage.googleapis.com/good-day-bend-v6.firebasestorage.app/fallback/bend-default.jpg"
        print(f"⚠️ Using fallback image: {fallback_url}")
        return fallback_url


# Convenience functions for specific use cases

async def generate_daily_update_image(headline: str, date: str) -> str:
    """Generate image for daily update article"""
    topic = f"{headline} Bend Oregon events"
    context = f"This is for a daily events roundup for {date}. Focus on community, lifestyle, and local Bend activities."
    return await generate_image_with_vision(topic, context)


async def generate_blog_image(title: str, topic_category: str) -> str:
    """Generate image for blog article"""
    context = f"This is for a blog article about {topic_category} in Bend, Oregon. Professional editorial quality."
    return await generate_image_with_vision(title, context)


if __name__ == "__main__":
    # Test the image generation
    import asyncio
    
    async def test():
        print("Testing image generation...")
        url = await generate_blog_image(
            "Bend Housing Market Shows Signs of Cooling",
            "real estate"
        )
        print(f"Generated image: {url}")
    
    asyncio.run(test())
