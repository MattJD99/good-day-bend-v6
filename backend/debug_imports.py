import sys
import traceback

def test_import(module_name):
    print(f"Importing {module_name}...")
    try:
        __import__(module_name)
        print(f"SUCCESS: {module_name}")
    except Exception as e:
        print(f"FAILED: {module_name} -> {e}")

test_import("os")
test_import("json")
test_import("asyncio")
test_import("datetime")
test_import("pytz")
test_import("google.cloud.firestore")
test_import("vertexai")
test_import("vertexai.generative_models")
test_import("google.api_core.retry")
test_import("agent.config")
test_import("agent.image_generation")
print("Finished all imports!")
