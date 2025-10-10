# AgentKit Admin UI - Complete Implementation Guide

## Overview

A production-ready admin interface for managing AgentKit AI agents without requiring code changes. This system allows Shop Owners and Super Admins to configure agent behavior, test queries, and monitor performance through a user-friendly web interface.

## Features Implemented

### 1. Agent Management Dashboard
**Location**: `/app/(protected)/admin/agents/page.js`

Features:
- List all 7 AI agents with their configurations
- Real-time search and filtering (enabled/disabled)
- Agent statistics summary cards
- Grid layout with responsive design
- Access control (SUPER_ADMIN and SHOP_OWNER only)

### 2. Agent Display Cards
**Component**: `/components/admin/AgentCard.js`

Features:
- Agent icon, name, and description
- Expandable instructions preview
- Tool assignments display
- Usage statistics (queries, avg cost, avg response time)
- Model and temperature settings
- Quick actions: Test, Configure, View Stats
- Enable/disable indicator

### 3. Agent Configuration Modal
**Component**: `/components/admin/AgentConfigModal.js`

Features:
- Rich text editor for agent instructions
- Preview mode for instructions
- Model selection dropdown (GPT-4, Claude, Gemini, etc.)
- Temperature slider (0.0 - 1.0)
- Max tokens input
- Multi-select tool assignment
- Handoff target configuration
- Enable/disable toggle
- Real-time character count
- Validation and error handling

### 4. Agent Testing Interface
**Component**: `/components/admin/AgentTester.js`

Features:
- Query input textarea
- Real-time testing with loading states
- Response display with formatting
- Performance metrics (response time, cost, tokens)
- Tool calls visualization
- Save successful test cases
- Error handling with user-friendly messages

### 5. API Endpoints

#### Next.js API Routes:
- `GET /api/admin/agents` - List all agents
- `GET /api/admin/agents/[id]` - Get single agent
- `PUT /api/admin/agents/[id]` - Update agent configuration
- `POST /api/admin/agents/[id]/test` - Test agent with query
- `DELETE /api/admin/agents/[id]` - Reset to defaults

#### FastAPI Backend Routes:
- `GET /api/v1/agents/list` - List agents with details
- `GET /api/v1/agents/{agent_name}` - Get agent configuration
- `PUT /api/v1/agents/{agent_name}/update` - Update agent
- `GET /api/v1/agents/tools/available` - List available tools
- `POST /api/v1/agents/query` - Query an agent

### 6. Backend Services

**Files Created:**
- `/services/agentkit/admin_api.py` - Agent management functions
- `/services/agentkit/router.py` - FastAPI router for agent endpoints

## Installation & Setup

### Step 1: Verify File Structure

Ensure all files are in place:

```
app/
├── (protected)/
│   └── admin/
│       └── agents/
│           └── page.js                    # Main admin page
│
├── api/
│   └── admin/
│       └── agents/
│           ├── route.js                   # List/reload agents
│           ├── [id]/
│           │   ├── route.js               # Get/update single agent
│           │   └── test/
│           │       └── route.js           # Test agent endpoint
│
components/
└── admin/
    ├── AgentCard.js                       # Agent display card
    ├── AgentConfigModal.js                # Edit modal
    └── AgentTester.js                     # Testing interface

services/
└── agentkit/
    ├── admin_api.py                       # Agent management logic
    └── router.py                          # FastAPI router
```

### Step 2: Integrate FastAPI Router

Add to `/fastapi_backend.py`:

```python
# Import AgentKit router
try:
    from services.agentkit.router import router as agentkit_router
    AGENTKIT_AVAILABLE = True
    print("✅ AgentKit router loaded")
except ImportError as e:
    AGENTKIT_AVAILABLE = False
    print(f"⚠️ AgentKit router not available: {e}")

# After app initialization, include router
if AGENTKIT_AVAILABLE:
    app.include_router(agentkit_router)
```

### Step 3: Environment Variables

Ensure these are set in `.env.local`:

```bash
# Backend URL for API communication
BACKEND_URL=http://localhost:8001

# Supabase configuration (for production database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Model Keys (for agents)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key
```

### Step 4: Database Setup (Optional)

For persistent agent configurations, create a table:

```sql
CREATE TABLE agent_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL UNIQUE,
  instructions TEXT,
  handoff_description TEXT,
  model TEXT DEFAULT 'gpt-4-turbo-preview',
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4000,
  tools JSONB DEFAULT '[]'::jsonb,
  handoffs JSONB DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_agent_name ON agent_configurations(agent_name);
```

## Usage Guide

### Accessing the Admin UI

1. Navigate to: `http://localhost:9999/admin/agents`
2. Login as SUPER_ADMIN or SHOP_OWNER
3. You'll see the agent management dashboard

### Managing Agents

#### Viewing Agent Details:
- Click on any agent card to expand instructions
- Hover over stats to see detailed metrics
- Check enable/disable status indicator

#### Editing Agent Configuration:
1. Click "Configure" button on agent card
2. Modify instructions, settings, or tool assignments
3. Adjust temperature slider for creativity level
4. Select AI model from dropdown
5. Choose handoff targets (which agents can this agent handoff to)
6. Click "Save Changes"
7. Changes take effect immediately (no restart needed)

#### Testing an Agent:
1. Click "Test Agent" button
2. Enter a test query (e.g., "What was our revenue this month?")
3. Click "Test Query"
4. View response, metrics, and tool calls
5. Optionally save as test case for future reference

#### Searching and Filtering:
- Use search bar to find agents by name or description
- Filter by status: All, Enabled, Disabled
- View summary stats at top of page

## Agent Configuration Best Practices

### 1. Instructions
- Be specific and detailed
- Include examples of expected behavior
- Mention available database tools explicitly
- Define handoff conditions clearly
- Use bullet points for readability

### 2. Temperature Settings
- **0.0 - 0.3**: Precise, deterministic (Analytics, Booking)
- **0.4 - 0.7**: Balanced (Financial, Operations)
- **0.8 - 1.0**: Creative (Marketing, Customer Service)

### 3. Tool Assignment
- Only assign tools the agent needs
- Financial agents: revenue, commission, forecasting tools
- Operations agents: inventory tools
- Analytics agents: metrics and customer tools

### 4. Handoff Configuration
- Master Triage should handoff to all specialists
- Specialists should handoff to related agents
- Avoid circular handoff loops
- Define clear handoff criteria in instructions

## Available Database Tools

1. **get_revenue_by_date_range** - Calculate revenue for date range
2. **get_appointment_metrics** - Get booking statistics
3. **get_top_services** - Find most popular services
4. **get_commission_summary** - Calculate barber commissions
5. **get_customer_metrics** - Get customer base statistics
6. **get_inventory_status** - Track product inventory levels
7. **forecast_revenue** - Predict future revenue

## Security & Access Control

### Role-Based Access:
- **SUPER_ADMIN**: Full access to all agent management features
- **SHOP_OWNER**: Full access to all agent management features
- **Other roles**: No access (401 Unauthorized)

### Input Validation:
- All inputs sanitized on backend
- Temperature: 0.0 - 1.0 range enforced
- Max tokens: 500 - 8000 range
- Model: Validated against available models list

### Safety Features:
- Guardrails prevent exposure of sensitive data
- Jailbreak detection in all agents
- Prompt injection protection
- Test queries isolated from production data

## Troubleshooting

### Admin page shows "Access Denied"
**Solution**: Verify user has SUPER_ADMIN or SHOP_OWNER role in database

### Agents not loading
**Solution**:
1. Check backend is running: `http://localhost:8001/health`
2. Verify AgentKit router is loaded in FastAPI logs
3. Check browser console for API errors

### Test queries not working
**Solution**:
1. Verify BACKEND_URL in .env.local points to correct port
2. Check backend logs for errors
3. Ensure Supabase credentials are correct
4. Try the mock response fallback (should show if backend is down)

### Configuration changes not saving
**Solution**:
1. Check browser console for errors
2. Verify PUT endpoint returns 200 status
3. Check backend logs for validation errors
4. Refresh the page to see latest config

### Tools not appearing in dropdown
**Solution**:
1. Verify tools.py exports TOOL_FUNCTIONS correctly
2. Check admin_api.py get_available_tools() function
3. Ensure tools are registered in TOOL_SCHEMAS

## Performance Considerations

### Caching:
- Agent configurations cached in-memory on backend
- Frontend caches agent list for 5 minutes
- Stats refreshed on each page load

### Optimization Tips:
- Keep instructions concise (< 2000 characters ideal)
- Limit tool assignments to what's needed
- Monitor token usage in test interface
- Use lower temperature for deterministic tasks

## Future Enhancements

Planned features:
- [ ] Agent performance analytics dashboard
- [ ] A/B testing between agent configurations
- [ ] Bulk configuration export/import
- [ ] Agent versioning and rollback
- [ ] Real-time usage monitoring
- [ ] Cost tracking per agent
- [ ] Custom tool creation interface
- [ ] Agent conversation history viewer
- [ ] Automated testing suite

## API Integration Examples

### Listing All Agents (Frontend)
```javascript
const response = await fetch('/api/admin/agents')
const data = await response.json()
console.log(data.agents) // Array of agent configs
```

### Updating Agent Configuration
```javascript
const response = await fetch(`/api/admin/agents/${agentName}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    temperature: 0.5,
    instructions: 'Updated instructions...',
    tools: ['get_revenue_by_date_range', 'forecast_revenue']
  })
})
const data = await response.json()
console.log(data.agent) // Updated agent config
```

### Testing an Agent
```javascript
const response = await fetch(`/api/admin/agents/${agentName}/test`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What was our revenue this month?'
  })
})
const data = await response.json()
console.log(data.response) // Agent's response
console.log(data.tool_calls) // Tools used
console.log(data.cost) // API cost
```

## Support & Documentation

- Main Documentation: `/CLAUDE.md`
- AgentKit Docs: `/services/agentkit/agents.py` (inline comments)
- Tool Docs: `/services/agentkit/tools.py` (inline comments)
- API Reference: This file

## Summary

This implementation provides a complete, production-ready admin interface for managing AgentKit agents. All components are:
- ✅ Fully functional with error handling
- ✅ Mobile-responsive with Tailwind CSS
- ✅ Secured with role-based access control
- ✅ Integrated with existing AgentKit system
- ✅ Ready for immediate use

The system allows non-technical users to configure AI agent behavior, test queries, and monitor performance without touching code—exactly as specified in the requirements.
