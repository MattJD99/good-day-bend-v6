import sys
import os

print("STEP 0: Basic imports")
import json
import asyncio
from datetime import datetime
print("STEP 0: OK")

print("STEP 1: Protobuf implementation check")
# Set this explicitly in the code to be 100% sure
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
print(f"Protobuf impl: {os.environ.get('PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION')}")

print("STEP 2: Import firestore")
try:
    from google.cloud import firestore
    print("STEP 2: OK")
except Exception as e:
    print(f"STEP 2: FAILED: {e}")

print("STEP 3: Import vertexai")
try:
    import vertexai
    print("STEP 3: OK")
except Exception as e:
    print(f"STEP 3: FAILED: {e}")

print("STEP 4: Import generative_models")
try:
    from vertexai.generative_models import GenerativeModel
    print("STEP 4: OK")
except Exception as e:
    print(f"STEP 4: FAILED: {e}")

print("STEP 5: Import image_generation (local)")
try:
    # Set PYTHONPATH so this works
    from agent.image_generation import generate_image_with_vision
    print("STEP 5: OK")
except Exception as e:
    print(f"STEP 5: FAILED: {e}")
    import traceback
    traceback.print_exc()

print("STEP 6: Import config (local)")
try:
    from agent.config import PROJECT_ID
    print(f"STEP 6: OK (Project: {PROJECT_ID})")
except Exception as e:
    print(f"STEP 6: FAILED: {e}")

print("FINAL CHECK: Everything imported. Attempting dummy Gemini call...")
try:
    vertexai.init(project=PROJECT_ID, location="us-central1")
    model = GenerativeModel("gemini-1.5-flash-002")
    print("FINAL CHECK: Model initialized. Script success.")
except Exception as e:
    print(f"FINAL CHECK: Runtime failed: {e}")
