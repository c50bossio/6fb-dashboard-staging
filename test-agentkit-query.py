#!/usr/bin/env python3
"""Test AgentKit query endpoint"""
import requests
import json

url = "http://localhost:8001/api/v1/agents/query"
payload = {
    "message": "How much revenue did we make this month?",
    "context": {
        "barbershop_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "user_id": "test-user-123"
    }
}

headers = {
    "Authorization": "Bearer test-user-123",
    "Content-Type": "application/json"
}

print("Sending query to AgentKit:")
print(f"URL: {url}")
print(f"Headers: {headers}")
print(f"Payload: {json.dumps(payload, indent=2)}")
print("\n" + "="*70 + "\n")

try:
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
except requests.exceptions.Timeout:
    print("❌ Request timed out after 30 seconds")
except Exception as e:
    print(f"❌ Error: {e}")
    print(f"Response text: {response.text if 'response' in locals() else 'No response'}")
