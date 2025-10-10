# Testing Guide: New AgentKit Tools

## Quick Start

### Test via Command Line
```bash
cd /Users/bossio/6FB\ AI\ Agent\ System
python test-new-agentkit-tools.py
```

### Test via AI Chat Interface
Navigate to: `http://localhost:9999/dashboard`

## Tool 1: Inventory Tracking

### Sample Queries

**Basic Inventory Check**:
```
"Show me my inventory status"
"What products do I have in stock?"
"Check my current inventory"
```

**Low Stock Alerts**:
```
"What products need reordering?"
"Show me low stock items"
"Which items are running out?"
```

**Category Filtering**:
```
"Check my hair care inventory"
"Show beard care products in stock"
"List styling products inventory"
```

### Expected Agent Response

The **Operations Manager Agent** should:
1. Call `get_inventory_status()` tool
2. Present inventory summary with counts
3. Highlight low stock items
4. Show inventory values
5. Provide reorder recommendations

### Response Format
```
You currently have 45 products in stock.

Summary:
- Total Products: 45
- Low Stock Items: 7
- Out of Stock: 2
- Total Inventory Value: $2,450.00

Items Needing Reorder:
1. Pomade Brand X - 2 units (reorder at 5)
2. Beard Oil Premium - 4 units (reorder at 10)
...
```

---

## Tool 2: Revenue Forecasting

### Sample Queries

**Monthly Forecast**:
```
"Forecast my revenue for next month"
"What will my revenue be in 30 days?"
"Predict next month's income"
```

**Weekly Forecast**:
```
"Project revenue for next week"
"What's my 7-day forecast?"
```

**Custom Period**:
```
"Forecast 60 days of revenue"
"Show me next quarter projection"
```

### Expected Agent Response

The **Financial Coach Agent** should:
1. Call `forecast_revenue()` tool
2. Analyze historical data
3. Present forecast with confidence level
4. Show trend direction
5. Provide forecast range
6. Offer financial insights

### Response Format
```
Based on 90 days of historical data:

Historical Performance:
- Total Revenue: $7,650.00
- Daily Average: $283.33
- Trend: INCREASING ↗

30-Day Forecast:
- Expected: $8,500.00
- Confidence: Medium
- Range: $7,225 - $9,775

Your revenue is trending upward! Consider:
1. Maintaining service quality
2. Adding peak-time availability
3. Marketing to capitalize on growth
```

---

## Direct Tool Testing

### Python Script Testing

```python
import asyncio
from services.agentkit.tools import get_inventory_status, forecast_revenue

async def test():
    # Test inventory
    inventory = await get_inventory_status(
        barbershop_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    )
    print("Inventory:", inventory)

    # Test forecasting
    forecast = await forecast_revenue(
        barbershop_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        forecast_days=30
    )
    print("Forecast:", forecast)

asyncio.run(test())
```

---

## Verification Checklist

### Inventory Tool
- [ ] Tool is called by Operations Manager Agent
- [ ] Returns success: true
- [ ] Shows product count (even if 0)
- [ ] Calculates inventory value correctly
- [ ] Identifies low stock items
- [ ] Handles category filtering
- [ ] Gracefully handles empty inventory

### Forecasting Tool
- [ ] Tool is called by Financial Coach Agent
- [ ] Returns success: true
- [ ] Calculates daily/weekly/monthly averages
- [ ] Detects trend (increasing/stable/decreasing)
- [ ] Provides confidence level
- [ ] Shows forecast range
- [ ] Handles insufficient data gracefully

---

## Common Issues & Solutions

### Issue: "Column reserved_stock does not exist"
**Status**: ✅ FIXED
**Solution**: Updated tool to only query existing columns

### Issue: "No products found"
**Status**: ✅ EXPECTED (demo database empty)
**Solution**: Add products to database or test with shop that has inventory

### Issue: "Insufficient data for forecast"
**Status**: ✅ HANDLED
**Solution**: Tool returns low confidence forecast with message

---

## Testing with Real Data

### Add Test Products (Optional)
```sql
INSERT INTO products (barbershop_id, name, brand, category, current_stock, reorder_point, retail_price, cost_price, is_active, track_inventory)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Premium Pomade', 'Brand X', 'hair_care', 3, 10, 25.99, 12.50, true, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Beard Oil', 'Brand Y', 'beard_care', 15, 10, 29.99, 15.00, true, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Hair Gel', 'Brand Z', 'styling', 20, 10, 19.99, 10.00, true, true);
```

---

## Success Indicators

### Tool is Working When:
1. ✅ Agent selects correct tool for query
2. ✅ Tool returns `"success": true`
3. ✅ Data is from actual database (not mock)
4. ✅ Numbers match expected calculations
5. ✅ Agent presents data in natural language
6. ✅ No error messages in console

### Tool Needs Attention When:
1. ❌ Returns `"success": false`
2. ❌ Shows database connection errors
3. ❌ Agent doesn't call tool (generic response)
4. ❌ Data appears fabricated/incorrect
5. ❌ Console shows exceptions

---

## Performance Benchmarks

### Expected Response Times
- **Inventory Query**: < 500ms
- **Revenue Forecast**: < 1000ms (90 days)
- **Agent Response**: < 3000ms (total)

### Database Load
- **Inventory**: Single SELECT query
- **Forecasting**: Single SELECT with date filters
- Both queries use indexed columns (barbershop_id)

---

## Next Actions

1. **Test in AI Chat**:
   - Navigate to dashboard
   - Ask inventory questions
   - Ask forecasting questions
   - Verify agent routing

2. **Verify Data**:
   - Check if database returns real data
   - Confirm calculations are accurate
   - Test edge cases (empty, low data)

3. **Monitor Performance**:
   - Check response times
   - Review error logs
   - Verify tool selection accuracy

---

## Support

### Debug Mode
Add logging to see tool calls:
```python
import logging
logging.basicConfig(level=logging.INFO)
```

### View Tool Registry
```python
from services.agentkit.tools import TOOL_FUNCTIONS
print(f"Total tools: {len(TOOL_FUNCTIONS)}")
print("Available:", list(TOOL_FUNCTIONS.keys()))
```

### Check Agent Assignment
```python
from services.agentkit.agents import operations_manager_agent, financial_coach_agent
print("Operations Manager:", "inventory" in operations_manager_agent["instructions"])
print("Financial Coach:", "forecast" in financial_coach_agent["instructions"])
```

---

## Questions to Ask AI

### For Inventory (Operations Manager)
```
✅ "Show my inventory"
✅ "What needs reordering?"
✅ "Check hair care stock"
✅ "Low stock alerts"
❌ "Show my revenue" (wrong tool)
```

### For Forecasting (Financial Coach)
```
✅ "Forecast next month"
✅ "Revenue projection"
✅ "What's my trend?"
✅ "Predict 60 days"
❌ "Check inventory" (wrong agent)
```

---

## Troubleshooting

### Tool Not Being Called
1. Check agent instructions reference tool
2. Verify tool is registered in TOOL_FUNCTIONS
3. Check OpenAI schema is valid
4. Review agent selection logic

### Database Errors
1. Verify Supabase credentials
2. Check table exists in database
3. Confirm column names match schema
4. Review RLS policies

### Incorrect Data
1. Verify calculations in tool code
2. Check date handling for forecasts
3. Review stock level logic
4. Confirm barbershop_id is correct

---

## Demo Barbershop ID
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Use this ID for all tests until real barbershop data is available.

---

**Status**: ✅ Tools Implemented and Tested
**Ready**: Production Testing via AI Chat Interface
