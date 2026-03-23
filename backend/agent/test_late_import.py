import os
import sys

print("Phase 0: Base imports")
import json
import asyncio
print("Phase 0: OK")

def run_scout():
    print("Phase 1: Entering function, about to import vertexai")
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        print("Phase 1: vertexai OK")
        
        print("Phase 2: Initializing vertexai")
        # Use simple project init
        vertexai.init(project="good-day-bend-v6", location="us-central1")
        print("Phase 2: OK")
        
        print("Phase 3: Creating model")
        model = GenerativeModel("gemini-1.5-flash-002")
        print("Phase 3: OK")
        
        return "SUCCESS"
    except Exception as e:
        print(f"Phase FAILED: {e}")
        return "FAIL"

if __name__ == "__main__":
    os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
    print("Phase 0.5: Calling run_scout")
    res = run_scout()
    print(f"Final result: {res}")
