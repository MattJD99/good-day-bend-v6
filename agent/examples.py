#!/usr/bin/env python3
"""
Example: Running the Good Day Bend v7 Agent

This script demonstrates how to use the agent to execute the publisher workflow.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from agent.manager import GoodDayBendAgent, create_agent


async def example_1_basic_workflow():
    """Example 1: Run the basic publisher workflow for today"""
    print("=" * 60)
    print("Example 1: Basic Publisher Workflow")
    print("=" * 60)
    
    # Create agent
    agent = create_agent()
    
    # Run workflow for today
    result = await agent.run_publisher_workflow()
    print(f"\n✅ Workflow Result: {result}")


async def example_2_specific_date():
    """Example 2: Run workflow for a specific date"""
    print("\n" + "=" * 60)
    print("Example 2: Workflow for Specific Date")
    print("=" * 60)
    
    # Create agent
    agent = create_agent()
    
    # Run workflow for tomorrow
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    result = await agent.run_publisher_workflow(target_date=tomorrow)
    print(f"\n✅ Workflow Result for {tomorrow}: {result}")


async def example_3_natural_language():
    """Example 3: Use natural language commands"""
    print("\n" + "=" * 60)
    print("Example 3: Natural Language Commands")
    print("=" * 60)
    
    # Create agent
    agent = GoodDayBendAgent(
        project_id=os.getenv("GCP_PROJECT_ID", "good-day-bend-v7-test"),
        location=os.getenv("GCP_LOCATION", "us-central1")
    )
    agent.initialize()
    
    # Example queries
    queries = [
        "Run the daily publisher workflow for today",
        "What events are happening tomorrow in Bend?",
        "Generate a social media post about tonight's events",
        "Create a draft for the weekend roundup"
    ]
    
    for query in queries:
        print(f"\n📝 Query: {query}")
        response = await agent.query(query)
        print(f"💬 Response: {response}")


async def example_4_multi_day_batch():
    """Example 4: Generate content for multiple days"""
    print("\n" + "=" * 60)
    print("Example 4: Multi-day Batch Processing")
    print("=" * 60)
    
    agent = create_agent()
    
    # Generate content for next 3 days
    results = []
    for i in range(3):
        target_date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
        print(f"\n🔄 Processing {target_date}...")
        
        result = await agent.run_publisher_workflow(target_date=target_date)
        results.append(result)
        
        print(f"✅ Completed: {result.get('status')}")
    
    print(f"\n📊 Processed {len(results)} days successfully")


async def example_5_custom_workflow():
    """Example 5: Custom workflow using individual tools"""
    print("\n" + "=" * 60)
    print("Example 5: Custom Workflow (Advanced)")
    print("=" * 60)
    
    agent = create_agent()
    
    # This would demonstrate calling individual tools
    # In production, these would be actual tool calls via OpenAPI
    
    workflow_steps = [
        "1. Fetch events for today",
        "2. Analyze strategy (determine vibe)",
        "3. Generate blog content",
        "4. Generate social content",
        "5. Upload drafts",
        "6. Send approval email"
    ]
    
    print("\n📋 Custom Workflow Steps:")
    for step in workflow_steps:
        print(f"  {step}")
    
    print("\n💡 Note: Individual tool calls will be available once Cloud Function wrappers are implemented")


async def main():
    """Run all examples"""
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║     Good Day Bend v7 - Agent Examples                     ║
    ║     Vertex AI Agent Engine Implementation                 ║
    ╚════════════════════════════════════════════════════════════╝
    """)
    
    # Check environment
    project_id = os.getenv("GCP_PROJECT_ID", "good-day-bend-v7-test")
    print(f"🔧 Project ID: {project_id}")
    print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run examples
    try:
        await example_1_basic_workflow()
        await example_2_specific_date()
        await example_3_natural_language()
        # Commented out to avoid long execution
        # await example_4_multi_day_batch()
        await example_5_custom_workflow()
        
        print("\n" + "=" * 60)
        print("✅ All examples completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Run async main
    asyncio.run(main())
