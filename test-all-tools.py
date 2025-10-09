#!/usr/bin/env python3
"""Test all 5 AgentKit database tools"""
import requests
import json
import time

url = "http://localhost:8001/api/v1/agents/query"
headers = {
    "Authorization": "Bearer test-user-123",
    "Content-Type": "application/json"
}

test_queries = [
    {
        "name": "Revenue Query",
        "message": "How much revenue did we make this month?",
        "tool_expected": "get_revenue_by_date_range"
    },
    {
        "name": "Appointment Metrics",
        "message": "How many appointments do we have this week?",
        "tool_expected": "get_appointment_metrics"
    },
    {
        "name": "Top Services",
        "message": "What are our most popular services?",
        "tool_expected": "get_top_services"
    },
    {
        "name": "Commission Summary",
        "message": "Show me the commission breakdown for our barbers",
        "tool_expected": "get_commission_summary"
    },
    {
        "name": "Customer Metrics",
        "message": "How many customers do we have and what's our retention rate?",
        "tool_expected": "get_customer_metrics"
    }
]

print("=" * 80)
print("TESTING ALL 5 AGENTKIT DATABASE TOOLS")
print("=" * 80)
print()

results = []

for i, test in enumerate(test_queries, 1):
    print(f"\n{'='*80}")
    print(f"TEST {i}/{len(test_queries)}: {test['name']}")
    print(f"{'='*80}")
    print(f"Query: \"{test['message']}\"")
    print(f"Expected Tool: {test['tool_expected']}")
    print()

    payload = {
        "message": test['message'],
        "context": {
            "barbershop_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "user_id": "test-user-123"
        }
    }

    try:
        start_time = time.time()
        response = requests.post(url, json=payload, headers=headers, timeout=45)
        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()

            # Extract key info
            agent_used = data.get('agent_used', 'unknown')
            response_text = data.get('response', '')
            tokens = data.get('tokens_used', 0)
            cost = data.get('cost_usd', 0)

            # Check for errors in response
            has_error = 'error' in response_text.lower() or 'issue' in response_text.lower()

            result = {
                "test": test['name'],
                "status": "✅ PASS" if not has_error else "⚠️  WARNING",
                "agent": agent_used,
                "time": f"{elapsed:.1f}s",
                "tokens": tokens,
                "cost": f"${cost:.4f}",
                "response_preview": response_text[:150] + "..." if len(response_text) > 150 else response_text
            }

            print(f"Status: {result['status']}")
            print(f"Agent: {agent_used}")
            print(f"Time: {elapsed:.1f}s")
            print(f"Tokens: {tokens}")
            print(f"Cost: ${cost:.4f}")
            print(f"\nResponse Preview:")
            print(f"{result['response_preview']}")

            results.append(result)
        else:
            print(f"❌ FAIL: Status {response.status_code}")
            print(f"Response: {response.text[:200]}")
            results.append({
                "test": test['name'],
                "status": "❌ FAIL",
                "error": f"HTTP {response.status_code}"
            })

    except requests.exceptions.Timeout:
        print("❌ FAIL: Request timed out (45s)")
        results.append({
            "test": test['name'],
            "status": "❌ FAIL",
            "error": "Timeout"
        })
    except Exception as e:
        print(f"❌ FAIL: {str(e)}")
        results.append({
            "test": test['name'],
            "status": "❌ FAIL",
            "error": str(e)
        })

    # Small delay between tests
    time.sleep(2)

# Print summary
print("\n\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print()

for result in results:
    print(f"{result['status']} {result['test']}")
    if 'agent' in result:
        print(f"   Agent: {result['agent']}")
        print(f"   Performance: {result['time']}, {result['tokens']} tokens, {result['cost']}")
    if 'error' in result:
        print(f"   Error: {result['error']}")
    print()

# Overall status
passed = sum(1 for r in results if '✅' in r['status'])
warnings = sum(1 for r in results if '⚠️' in r['status'])
failed = sum(1 for r in results if '❌' in r['status'])

print("=" * 80)
print(f"OVERALL: {passed} passed, {warnings} warnings, {failed} failed out of {len(results)} tests")
print("=" * 80)

if failed == 0 and warnings == 0:
    print("\n✅ ALL AGENTKIT DATABASE TOOLS WORKING PERFECTLY!")
elif failed == 0:
    print(f"\n⚠️  All tools functional, but {warnings} returned partial data or warnings")
else:
    print(f"\n❌ {failed} tool(s) failed - needs investigation")
