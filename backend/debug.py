import sys
import asyncio
print("About to import scout")
from agent.scout import main
print("Entering main")
asyncio.run(main())
print("Exiting main")
