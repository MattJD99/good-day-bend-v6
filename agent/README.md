# Good Day Bend v7 - Agent Architecture

This directory contains the Vertex AI Agent Engine implementation for Good Day Bend v7, transforming the workflow-based v6 architecture into an agentic system.

## 📁 Directory Structure

```
Good-Day-Bend-v7-Test/
├── agent/              # Vertex AI Agent Engine (Python ADK)
│   ├── manager.py      # Main agent orchestrator
│   └── config.yaml     # Agent configuration (TODO)
├── tools/              # OpenAPI specs for Cloud Functions
│   ├── publisher.yaml  # Publishing workflow tools ✅
│   ├── content.yaml    # Content management tools (TODO)
│   └── maintenance.yaml# Debugging/audit tools (TODO)
├── mcp/               # Model Context Protocol
│   └── firestore.json # Firestore MCP config ✅
├── functions/         # Existing Cloud Functions (to be wrapped)
└── public/            # Frontend (unchanged)
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install google-cloud-aiplatform vertexai

# Ensure Node.js dependencies are installed for existing functions
cd functions && npm install && cd ..
```

### 2. Run the Agent

```python
from agent.manager import create_agent
import asyncio

async def main():
    # Create and initialize the agent
    agent = create_agent()
    
    # Run the publisher workflow
    result = await agent.run_publisher_workflow()
    print(result)

asyncio.run(main())
```

## 🎯 Components

### 1. Agent Manager (`agent/manager.py`)

The core orchestrator that uses Vertex AI's Python ADK to coordinate the publishing workflow.

**Key Features:**
- Natural language command processing
- Tool orchestration via OpenAPI specs
- Integration with existing Cloud Functions
- Maintains approval flow for content quality

**Example Usage:**

```python
from agent.manager import GoodDayBendAgent

# Initialize agent
agent = GoodDayBendAgent(
    project_id="good-day-bend-v7-test",
    location="us-central1"
)
agent.initialize()

# Natural language query
response = await agent.query("Run the publisher workflow for today")

# Direct workflow execution
result = await agent.run_publisher_workflow(target_date="2026-01-22")
```

### 2. Publisher Tools (`tools/publisher.yaml`)

OpenAPI 3.1 specification that wraps the existing publisher workflow as agent-callable tools.

**Available Endpoints:**
- `POST /publisher/run` - Execute complete daily workflow
- `GET /events/fetch` - Retrieve events from Firestore
- `POST /strategy/analyze` - Analyze events for content strategy
- `POST /content/blog` - Generate SEO-optimized blog HTML
- `POST /content/social` - Generate social media captions
- `POST /content/sms` - Generate SMS broadcast text
- `POST /drafts/upload` - Upload draft to Firebase Storage
- `POST /drafts/save-metadata` - Save draft metadata to Firestore
- `POST /email/approval` - Send approval email via GoHighLevel

**Schema Components:**
- `Event` - Event data structure
- `StrategyData` - Day vibe, headliners, metrics
- `DraftMetadata` - Draft content and metadata

### 3. Firestore MCP (`mcp/firestore.json`)

Model Context Protocol configuration for Firestore database access.

**Collections:**
- `events` - Scouted events (read, write, query)
- `articles` - Published blog articles (read, write, query)
- `dailyUpdates` - Daily update posts (read, write, query)
- `drafts` - Content awaiting approval (read, write, query, delete)
- `generated_images` - AI image metadata log (read, write, query)
- `trend_reports` - Trend analysis data (read, write, query)
- `image_library` - Curated image fallbacks (read, query)

**Usage Example:**

```javascript
// Fetch today's events
const events = await firestore.query({
  collection: "events",
  where: ["eventDate", "==", "2026-01-22"]
});

// Save a new draft
await firestore.write({
  collection: "drafts",
  document: {
    title: "Good Day Bend: Indie Beats & Brews",
    status: "pending",
    type: "daily_update",
    publishDate: "2026-01-22"
  }
});
```

## 🔄 Migration from v6

### What Changed?

**v6 (Workflow-based):**
```javascript
// Direct Node.js script execution
const runPublisherV6 = require('./workflows/publisher_v6');
await runPublisherV6();
```

**v7 (Agent-based):**
```python
# Natural language or structured commands
agent = create_agent()
await agent.query("Run the daily publisher for today")
```

### What Stayed the Same?

- ✅ Cloud Functions remain unchanged (wrapped as tools)
- ✅ Firestore schema unchanged
- ✅ Firebase Storage for drafts
- ✅ GoHighLevel integration
- ✅ Approval workflow maintained

### Benefits of v7

1. **Natural Language Interface** - Interact with commands like "Create tomorrow's content"
2. **Tool Composition** - Agent can chain multiple tools intelligently
3. **Error Recovery** - Agent can retry or adjust strategy on failures
4. **Context Awareness** - Agent maintains conversation state
5. **Extensibility** - Easy to add new tools via OpenAPI specs

## 📊 Workflow Comparison

### v6 Workflow (Imperative)
```
1. Fetch events → 2. Analyze → 3. Generate content → 4. Upload → 5. Email
```

### v7 Workflow (Agentic)
```
User: "Create today's daily update"
  ↓
Agent: Interprets intent
  ↓
Agent: Calls fetch_events tool
  ↓
Agent: Calls analyze_strategy tool
  ↓
Agent: Calls generate_blog_content tool
  ↓
Agent: Calls upload_draft tool
  ↓
Agent: Calls send_approval_email tool
  ↓
User: Receives draft for approval
```

## 🛠️ Tool Implementation Guide

To wrap additional v6 functions as v7 tools:

1. **Define in OpenAPI Spec** (`tools/*.yaml`)
```yaml
paths:
  /new-tool:
    post:
      operationId: newTool
      description: "What this tool does"
      requestBody:
        # Define parameters
      responses:
        # Define outputs
```

2. **Update Agent** (`agent/manager.py`)
```python
tools = [
    {
        "function_declarations": [
            {
                "name": "new_tool",
                "description": "What this tool does",
                "parameters": {...}
            }
        ]
    }
]
```

3. **Implement Cloud Function** (or wrap existing)
```javascript
exports.newTool = functions.https.onRequest(async (req, res) => {
    // Implementation
});
```

## 🔐 Configuration

### Environment Variables
```bash
export GCP_PROJECT_ID="good-day-bend-v7-test"
export GCP_LOCATION="us-central1"
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

### Agent Config (TODO: `agent/config.yaml`)
```yaml
name: good-day-bend-agent
model: gemini-3-flash-preview
tools:
  - publisher.yaml
  - content.yaml
  - maintenance.yaml
mcp:
  - firestore.json
```

## 📝 Next Steps

Based on the MIGRATION_ROADMAP.md:

### Priority 1: Core Publishing (✅ In Progress)
- [x] `agent/manager.py` - Manager agent
- [x] `tools/publisher.yaml` - Publisher tools spec
- [x] `mcp/firestore.json` - Firestore MCP config
- [ ] `agent/config.yaml` - Agent configuration
- [ ] Implement Cloud Function wrappers for tools
- [ ] Test end-to-end publisher workflow

### Priority 2: Content Management
- [ ] `tools/content.yaml` - Scout and content tools
- [ ] Wrap `workflows_v2/scout_v2.js`
- [ ] Wrap `workflows/batch_scout.js`

### Priority 3: Maintenance Tools
- [ ] `tools/maintenance.yaml` - Debug/audit tools
- [ ] Wrap `debug_daily_data.js`
- [ ] Wrap `audit_events.js`
- [ ] Wrap `verify_data.js`

### Priority 4: Image Handling
- [ ] `tools/media.yaml` - Image generation tools
- [ ] Wrap `lib/imageGen.js`
- [ ] Wrap `generate_event_images.js`

## 🎓 Learning Resources

- [Vertex AI Agent Engine Docs](https://cloud.google.com/vertex-ai/docs/agent-engine)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## 📄 License

Proprietary - Good Day Bend © 2026

---

**Architecture Status:** 🟡 In Development  
**Last Updated:** January 22, 2026  
**Version:** 7.0.0-alpha
