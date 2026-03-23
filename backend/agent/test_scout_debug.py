import os
import sys
import json

print("DEBUG: Pre-import checks")
try:
    import vertexai
    print("DEBUG: VertexAI imported")
    from google.cloud import firestore
    print("DEBUG: Firestore imported")
    import asyncio
    print("DEBUG: Asyncio imported")
except Exception as e:
    print(f"DEBUG: Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

from agent.scout import scout_events

async def test():
    print("DEBUG: Starting test coroutine")
    try:
        # Just scout for 1 day in the future
        result = await scout_events(days_ahead=1)
        print(f"DEBUG: result = {result}")
    except Exception as e:
        print(f"DEBUG: Execution failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("DEBUG: __main__ start")
    asyncio.run(test())
    print("DEBUG: __main__ end")
