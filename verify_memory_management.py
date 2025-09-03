#!/usr/bin/env python3
"""
Verify Memory Management for Authentication System
Checks if the memory management system is working properly and identifies potential issues.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

import asyncio
import time
import gc
from services.memory_manager import memory_manager, get_memory_stats
import requests
import subprocess


def test_memory_manager_basic():
    """Test basic memory manager functionality"""
    print("🧠 Testing Memory Manager Basic Functionality")
    print("=" * 60)
    
    # Test memory stats
    stats = get_memory_stats()
    print(f"✅ Memory Stats Retrieved:")
    print(f"   Total Memory: {stats.total_memory:.1f} GB")
    print(f"   Available Memory: {stats.available_memory:.1f} GB") 
    print(f"   Used Memory: {stats.used_memory:.1f} GB")
    print(f"   Process Memory: {stats.process_memory:.1f} MB")
    print(f"   Memory Pressure: {stats.memory_pressure:.1%}")
    
    # Test memory pressure detection
    is_pressure = memory_manager.is_memory_pressure()
    is_critical = memory_manager.is_critical_memory_pressure()
    print(f"   Memory Pressure: {'⚠️  Yes' if is_pressure else '✅ No'}")
    print(f"   Critical Pressure: {'🚨 Yes' if is_critical else '✅ No'}")
    
    # Test OAuth session tracking
    oauth_sessions_count = len(memory_manager.oauth_sessions)
    print(f"   OAuth Sessions: {oauth_sessions_count}")
    
    # Test monitoring status
    monitoring_active = memory_manager.monitoring_active
    print(f"   Monitoring Active: {'✅ Yes' if monitoring_active else '❌ No'}")
    
    return stats


def test_oauth_session_management():
    """Test OAuth session registration and cleanup"""
    print("\n🔐 Testing OAuth Session Management")
    print("=" * 60)
    
    # Register test OAuth sessions
    test_sessions = []
    for i in range(5):
        session_id = f"test_oauth_session_{i}"
        session_data = {
            'user_id': f'user_{i}',
            'provider': 'google',
            'scope': 'email profile'
        }
        memory_manager.register_oauth_session(session_id, session_data)
        test_sessions.append(session_id)
    
    print(f"✅ Registered {len(test_sessions)} test OAuth sessions")
    print(f"   Total OAuth sessions: {len(memory_manager.oauth_sessions)}")
    
    # Test session cleanup
    for session_id in test_sessions:
        memory_manager.cleanup_oauth_session(session_id)
    
    remaining_sessions = len(memory_manager.oauth_sessions)
    print(f"✅ Cleaned up test sessions")
    print(f"   Remaining OAuth sessions: {remaining_sessions}")
    
    return remaining_sessions == 0


def test_memory_limited_operation():
    """Test memory-limited operation context manager"""
    print("\n🔒 Testing Memory-Limited Operations")
    print("=" * 60)
    
    initial_stats = get_memory_stats()
    print(f"Initial memory: {initial_stats.process_memory:.1f} MB")
    
    # Test memory-limited operation
    with memory_manager.memory_limited_operation("Test OAuth Flow"):
        # Simulate some memory-intensive work
        data = [i * j for i in range(1000) for j in range(100)]
        time.sleep(0.1)  # Short processing time
        
        current_stats = get_memory_stats()
        print(f"During operation: {current_stats.process_memory:.1f} MB")
    
    # Force garbage collection and check memory
    gc.collect()
    final_stats = get_memory_stats()
    memory_delta = final_stats.process_memory - initial_stats.process_memory
    
    print(f"Final memory: {final_stats.process_memory:.1f} MB")
    print(f"Memory delta: {memory_delta:+.1f} MB")
    print("✅ Memory-limited operation completed successfully")
    
    return abs(memory_delta) < 50  # Should not leak more than 50MB


def test_garbage_collection():
    """Test forced garbage collection"""
    print("\n🗑️  Testing Forced Garbage Collection")
    print("=" * 60)
    
    initial_stats = get_memory_stats()
    print(f"Initial memory: {initial_stats.process_memory:.1f} MB")
    
    # Create some garbage
    garbage_data = []
    for i in range(10000):
        garbage_data.append([j * i for j in range(100)])
    
    before_gc_stats = get_memory_stats()
    print(f"After creating garbage: {before_gc_stats.process_memory:.1f} MB")
    
    # Force garbage collection
    collected = memory_manager.force_garbage_collection()
    
    after_gc_stats = get_memory_stats()
    memory_freed = before_gc_stats.process_memory - after_gc_stats.process_memory
    
    print(f"Objects collected: {collected}")
    print(f"After garbage collection: {after_gc_stats.process_memory:.1f} MB")
    print(f"Memory freed: {memory_freed:.1f} MB")
    
    # Clean up
    del garbage_data
    gc.collect()
    
    return memory_freed > 0


def test_fastapi_integration():
    """Test if FastAPI backend is running and memory management is active"""
    print("\n🚀 Testing FastAPI Integration")
    print("=" * 60)
    
    port = int(os.getenv("PORT", 8000))
    base_url = f"http://localhost:{port}"
    
    try:
        # Test health endpoint
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ FastAPI backend is running")
            
            # Check if memory stats are included in health response
            health_data = response.json()
            if 'memory' in health_data:
                print("✅ Memory statistics integrated into health endpoint")
                memory_info = health_data['memory']
                print(f"   Memory pressure: {memory_info.get('pressure', 'unknown')}")
                print(f"   OAuth sessions: {memory_info.get('oauth_sessions', 'unknown')}")
            else:
                print("⚠️  Memory statistics not found in health endpoint")
            
            return True
        else:
            print(f"❌ FastAPI backend returned status {response.status_code}")
            return False
            
    except requests.RequestException as e:
        print(f"❌ FastAPI backend not accessible: {e}")
        return False


def check_for_memory_leaks():
    """Check for potential memory leaks in authentication system"""
    print("\n🔍 Checking for Memory Leaks")
    print("=" * 60)
    
    initial_stats = get_memory_stats()
    print(f"Initial memory: {initial_stats.process_memory:.1f} MB")
    
    # Simulate multiple authentication operations
    for i in range(10):
        with memory_manager.memory_limited_operation(f"Auth Operation {i}"):
            # Simulate OAuth session creation and cleanup
            session_id = f"leak_test_{i}"
            memory_manager.register_oauth_session(session_id, {'test': True})
            time.sleep(0.01)  # Small delay
            memory_manager.cleanup_oauth_session(session_id)
    
    # Force cleanup
    memory_manager.clear_internal_caches()
    gc.collect()
    
    final_stats = get_memory_stats()
    memory_delta = final_stats.process_memory - initial_stats.process_memory
    
    print(f"Final memory: {final_stats.process_memory:.1f} MB")
    print(f"Memory delta after 10 auth operations: {memory_delta:+.1f} MB")
    
    # Should not leak more than 5MB after 10 operations
    if abs(memory_delta) < 5:
        print("✅ No significant memory leaks detected")
        return True
    else:
        print(f"⚠️  Potential memory leak detected: {memory_delta:.1f} MB")
        return False


def main():
    """Run all memory management verification tests"""
    print("🧠 6FB AI Agent System - Memory Management Verification")
    print("=" * 70)
    
    results = {}
    
    # Test 1: Basic functionality
    try:
        stats = test_memory_manager_basic()
        results['basic'] = True
        
        # Alert if memory pressure is high
        if stats.memory_pressure > 0.85:
            print(f"\n⚠️  WARNING: High memory pressure detected ({stats.memory_pressure:.1%})")
            print("   Consider restarting services or increasing memory allocation")
        
    except Exception as e:
        print(f"❌ Basic functionality test failed: {e}")
        results['basic'] = False
    
    # Test 2: OAuth session management
    try:
        results['oauth_sessions'] = test_oauth_session_management()
    except Exception as e:
        print(f"❌ OAuth session management test failed: {e}")
        results['oauth_sessions'] = False
    
    # Test 3: Memory-limited operations
    try:
        results['memory_limited'] = test_memory_limited_operation()
    except Exception as e:
        print(f"❌ Memory-limited operation test failed: {e}")
        results['memory_limited'] = False
    
    # Test 4: Garbage collection
    try:
        results['garbage_collection'] = test_garbage_collection()
    except Exception as e:
        print(f"❌ Garbage collection test failed: {e}")
        results['garbage_collection'] = False
    
    # Test 5: Memory leak detection
    try:
        results['memory_leaks'] = check_for_memory_leaks()
    except Exception as e:
        print(f"❌ Memory leak detection failed: {e}")
        results['memory_leaks'] = False
    
    # Test 6: FastAPI integration (optional)
    try:
        results['fastapi_integration'] = test_fastapi_integration()
    except Exception as e:
        print(f"❌ FastAPI integration test failed: {e}")
        results['fastapi_integration'] = False
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 MEMORY MANAGEMENT VERIFICATION SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall Result: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All memory management tests passed!")
        print("✅ Authentication memory management is working correctly")
        return 0
    else:
        print(f"⚠️  {total - passed} tests failed - memory management needs attention")
        
        # Provide specific recommendations
        if not results.get('memory_leaks', True):
            print("\n🔧 RECOMMENDATION: Memory leaks detected")
            print("   - Review OAuth callback implementations")
            print("   - Ensure all sessions are properly cleaned up")
            print("   - Consider reducing session cache time")
        
        if not results.get('fastapi_integration', True):
            print("\n🔧 RECOMMENDATION: FastAPI integration issues")
            print("   - Start FastAPI backend: python fastapi_backend.py")
            print("   - Ensure memory middleware is properly configured")
        
        return 1


if __name__ == "__main__":
    exit(main())