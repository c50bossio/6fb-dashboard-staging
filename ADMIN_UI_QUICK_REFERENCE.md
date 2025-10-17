# AgentKit Admin UI - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Access the Admin Panel
```
URL: http://localhost:9999/admin/agents
Login: SUPER_ADMIN or SHOP_OWNER role required
```

### 2. Integrate Backend Router (One-time setup)

Add to `/fastapi_backend.py` around line 140:
```python
# Import AgentKit router
try:
    from services.agentkit.router import router as agentkit_router
    AGENTKIT_ROUTER_AVAILABLE = True
    print("✅ AgentKit Admin Router loaded")
except ImportError as e:
    AGENTKIT_ROUTER_AVAILABLE = False
    print(f"⚠️ AgentKit router not available: {e}")
```

Add around line 165 (after app initialization):
```python
if AGENTKIT_ROUTER_AVAILABLE:
    app.include_router(agentkit_router)
```

### 3. Restart Backend
```bash
python fastapi_backend.py
# Or: docker compose restart backend
```

### 4. Done!
Navigate to admin panel and start managing agents.

---

## 📋 Common Tasks

### Edit Agent Instructions
1. Click **Configure** button on agent card
2. Edit instructions in text area or preview mode
3. Click **Save Changes**
4. Done! Changes take effect immediately

### Change Agent Model
1. Click **Configure**
2. Select model from dropdown (GPT-4, Claude, etc.)
3. Adjust temperature if needed (0.0 = precise, 1.0 = creative)
4. Click **Save Changes**

### Assign Tools to Agent
1. Click **Configure**
2. Scroll to "Available Tools" section
3. Check/uncheck tool boxes
4. Click **Save Changes**

### Test an Agent
1. Click **Test Agent** button
2. Enter query: e.g., "What was our revenue this month?"
3. Click **Test Query**
4. View response, metrics, and tool calls

### Enable/Disable Agent
1. Click **Configure**
2. Toggle "Agent Status" switch at top
3. Click **Save Changes**

### Search for Agents
1. Type in search box (searches name and description)
2. Filter updates in real-time

### Filter by Status
1. Click filter dropdown
2. Select: All Agents / Enabled Only / Disabled Only

---

## 🎯 Agent Profiles

### Master Triage Agent
- **Purpose**: Route queries to specialists
- **Temperature**: 0.3 (precise routing)
- **Tools**: None (routes to other agents)
- **Handoffs**: All 6 specialist agents

### Financial Coach Agent
- **Purpose**: Revenue analysis, commissions, forecasting
- **Temperature**: 0.7 (balanced)
- **Tools**:
  - get_revenue_by_date_range
  - get_commission_summary
  - forecast_revenue
- **When to use**: Financial questions, revenue optimization

### Operations Manager Agent
- **Purpose**: Inventory, scheduling, workflow
- **Temperature**: 0.6 (practical)
- **Tools**:
  - get_inventory_status
  - get_appointment_metrics
- **When to use**: Operational efficiency, stock management

### Marketing Expert Agent
- **Purpose**: Social media, Google Reviews, campaigns
- **Temperature**: 0.8 (creative)
- **Tools**: None (advisory role)
- **When to use**: Marketing strategy, customer acquisition

### Customer Service Agent
- **Purpose**: Booking help, service recommendations
- **Temperature**: 0.7 (friendly)
- **Tools**: get_top_services
- **When to use**: Customer inquiries, bookings

### Booking Intelligence Agent
- **Purpose**: Appointment optimization, scheduling
- **Temperature**: 0.5 (logical)
- **Tools**:
  - get_appointment_metrics
  - get_customer_metrics
- **When to use**: Schedule optimization, capacity planning

### Analytics Agent
- **Purpose**: Performance metrics, trend analysis
- **Temperature**: 0.4 (precise)
- **Tools**:
  - get_appointment_metrics
  - get_revenue_by_date_range
  - get_customer_metrics
  - get_top_services
- **When to use**: Data analysis, reporting, insights

---

## 🛠 Available Database Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| `get_revenue_by_date_range` | Calculate revenue for date range | "What was revenue this month?" |
| `get_appointment_metrics` | Booking statistics and status | "How many appointments this week?" |
| `get_top_services` | Most popular services | "What are our best-selling services?" |
| `get_commission_summary` | Barber commission calculation | "How much commission did John earn?" |
| `get_customer_metrics` | Customer base analytics | "How many customers do we have?" |
| `get_inventory_status` | Product stock levels | "What products need reordering?" |
| `forecast_revenue` | Future revenue prediction | "What will revenue be next month?" |

---

## 💡 Best Practices

### Temperature Settings
- **0.0 - 0.3**: Precise, deterministic (Analytics, Routing)
- **0.4 - 0.6**: Balanced, practical (Operations, Booking)
- **0.7 - 0.8**: Creative, personable (Financial, Customer Service)
- **0.9 - 1.0**: Highly creative (Marketing only)

### Instruction Writing
✅ **Good**: "When users ask about revenue, ALWAYS use get_revenue_by_date_range tool first. Provide specific numbers from database. Example: 'This month you earned $12,450 from 87 transactions.'"

❌ **Bad**: "Help with revenue questions."

### Tool Assignment
- Only assign tools the agent needs
- Financial agents get financial tools
- Don't overload agents with unnecessary tools
- Test after making changes

### Handoff Configuration
- Master Triage hands off to everyone
- Specialists hand off to related agents
- Avoid circular handoffs
- Document handoff conditions in instructions

---

## 🚨 Troubleshooting

### "Access Denied"
**Fix**: Verify user role in database
```sql
UPDATE profiles SET role = 'SUPER_ADMIN' WHERE email = 'you@example.com';
```

### Agents Not Loading
**Fix**: Check backend is running
```bash
curl http://localhost:8001/health
```

### Test Query Fails
**Fix**: Verify Supabase credentials in `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Changes Don't Save
**Note**: Changes are in-memory by default. Persist to database:
1. Create agent_configurations table (see docs)
2. Update admin_api.py to save to DB

---

## 🎨 UI Components Reference

### Agent Card Actions
- **Test Agent**: Open testing interface
- **Configure**: Open configuration modal
- **Stats Icon**: View detailed statistics (coming soon)

### Configuration Modal Sections
1. **Agent Status**: Enable/disable toggle
2. **Handoff Description**: Brief capability description
3. **Instructions**: Full agent prompt (supports preview)
4. **Model Settings**: Model, temperature, max tokens
5. **Available Tools**: Multi-select checkboxes
6. **Handoff Targets**: Which agents can receive handoffs

### Testing Interface Features
- **Query Input**: Enter test question
- **Metrics Display**: Response time, cost, tokens
- **Tool Calls**: See which database tools were used
- **Save Test Case**: Store successful tests for later

---

## 📊 Statistics Explained

### Queries Handled
Total number of user queries this agent processed

### Average Cost
Average API cost per query (in dollars)

### Average Response Time
Average time to generate response (in seconds)

### Success Rate
Percentage of queries answered successfully

---

## 🔐 Security Notes

### Who Can Access
- ✅ SUPER_ADMIN role
- ✅ SHOP_OWNER role
- ❌ BARBER role
- ❌ CLIENT role

### What Can Be Changed
- ✅ Agent instructions
- ✅ Model settings
- ✅ Tool assignments
- ✅ Handoff configuration
- ❌ Agent name (fixed)
- ❌ Guardrails (code-level only)

### Safety Features
- All inputs validated
- Guardrails prevent data leaks
- Jailbreak detection active
- Test queries isolated

---

## 📞 Support Resources

| Resource | Location |
|----------|----------|
| Full Documentation | `/AGENTKIT_ADMIN_UI_COMPLETE.md` |
| Integration Guide | `/INTEGRATION_CHECKLIST.md` |
| Implementation Summary | `/AGENTKIT_ADMIN_SUMMARY.md` |
| Project Architecture | `/CLAUDE.md` |
| API Endpoints | FastAPI docs at `/docs` |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search box |
| `Esc` | Close modal |
| `Enter` | Submit form/query |
| `Tab` | Navigate form fields |

---

## 📈 Performance Tips

- Keep instructions under 2000 characters for best performance
- Assign minimum tools needed (reduces latency)
- Use lower temperature for deterministic tasks
- Test queries before deploying config changes
- Monitor token usage in test interface

---

## 🎯 Example Workflows

### Scenario 1: Improve Financial Agent Accuracy
1. Click Configure on Financial Coach Agent
2. Add to instructions: "CRITICAL: Always query database first, never estimate"
3. Add forecast_revenue tool
4. Test with: "Predict next month's revenue"
5. Verify tool is called and data is real
6. Save changes

### Scenario 2: Create Marketing Campaign Agent
1. Edit Marketing Expert Agent instructions
2. Add campaign-specific guidance
3. Increase temperature to 0.85 for creativity
4. Test with: "Create Instagram campaign for October"
5. Review creative output
6. Save if satisfied

### Scenario 3: Debug Query Failures
1. Click Test Agent on failing agent
2. Enter failing query
3. Review tool calls made
4. Check if correct tools assigned
5. Adjust tool assignments if needed
6. Re-test and save

---

**Version**: 1.0.0
**Last Updated**: October 7, 2025
**Status**: Production Ready ✅
