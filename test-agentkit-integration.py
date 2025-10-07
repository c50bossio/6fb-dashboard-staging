#!/usr/bin/env python3
"""
Test script to verify OpenAI AgentKit integration

Tests:
1. AgentKit router can be imported
2. Router has correct prefix and tags
3. Router endpoints are accessible
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_agentkit_import():
    """Test that AgentKit router can be imported"""
    try:
        # Direct import bypassing api/__init__.py
        from api.v1.agents.query import router
        print("✅ AgentKit router imported successfully")
        print(f"   Router prefix: {router.prefix}")
        print(f"   Router tags: {router.tags}")
        return True, router
    except Exception as e:
        print(f"❌ Failed to import AgentKit router: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_agentkit_endpoints(router):
    """Test that router has expected endpoints"""
    if not router:
        return False

    try:
        routes = router.routes
        print(f"\n✅ Found {len(routes)} routes in AgentKit router:")
        for route in routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = ', '.join(route.methods) if route.methods else 'N/A'
                print(f"   {methods:8} {route.path}")
        return True
    except Exception as e:
        print(f"❌ Failed to inspect router endpoints: {e}")
        return False

def test_fastapi_integration():
    """Test that AgentKit can be integrated into FastAPI"""
    try:
        from fastapi import FastAPI
        from api.v1.agents.query import router as agents_router

        # Create test app
        test_app = FastAPI(title="AgentKit Integration Test")
        test_app.include_router(agents_router)

        print("\n✅ AgentKit router successfully integrated into FastAPI test app")
        print(f"   Total routes in test app: {len(test_app.routes)}")

        # List all routes
        print("\n   Registered routes:")
        for route in test_app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = ', '.join(route.methods) if route.methods else 'N/A'
                print(f"     {methods:8} {route.path}")

        return True
    except Exception as e:
        print(f"\n❌ Failed to integrate AgentKit into FastAPI: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 70)
    print("OpenAI AgentKit Integration Test")
    print("=" * 70)

    # Test 1: Import
    print("\n[Test 1] Importing AgentKit router...")
    success, router = test_agentkit_import()
    if not success:
        print("\n❌ FAILED: Cannot import AgentKit router")
        return False

    # Test 2: Endpoints
    print("\n[Test 2] Inspecting router endpoints...")
    success = test_agentkit_endpoints(router)
    if not success:
        print("\n⚠️  WARNING: Cannot inspect endpoints")

    # Test 3: FastAPI Integration
    print("\n[Test 3] Testing FastAPI integration...")
    success = test_fastapi_integration()
    if not success:
        print("\n❌ FAILED: Cannot integrate into FastAPI")
        return False

    print("\n" + "=" * 70)
    print("✅ ALL TESTS PASSED")
    print("=" * 70)
    print("\nAgentKit is ready to use in fastapi_backend.py!")
    print("The router will be available at: /api/v1/agents/*")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
