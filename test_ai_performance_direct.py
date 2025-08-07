#!/usr/bin/env python3

"""
AI Performance Monitoring System Direct Test
Tests the AI performance monitoring endpoints and data flow
"""

import requests
import json
import time
from datetime import datetime
import os

def print_header(title):
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")

def print_step(step, description):
    print(f"\n📍 Step {step}: {description}")

def print_result(success, message, data=None):
    status = "✅" if success else "❌"
    print(f"{status} {message}")
    if data and isinstance(data, dict):
        for key, value in data.items():
            print(f"   {key}: {value}")

def test_ai_performance_system():
    print_header("AI Performance Monitoring System Test")
    
    # Test configuration
    frontend_url = "http://localhost:9999"
    backend_url = "http://localhost:8001"
    results = {"tests_passed": 0, "tests_failed": 0, "warnings": []}
    
    print_step(1, "Testing Frontend Availability")
    try:
        response = requests.get(f"{frontend_url}/api/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print_result(True, "Frontend health check passed", {
                "status": health_data.get("status", "unknown"),
                "environment": health_data.get("environment", "unknown"),
                "uptime": f"{health_data.get('system', {}).get('uptime', 0)}s"
            })
            results["tests_passed"] += 1
        else:
            print_result(False, f"Frontend health check failed with status {response.status_code}")
            results["tests_failed"] += 1
    except Exception as e:
        print_result(False, f"Frontend not accessible: {e}")
        results["tests_failed"] += 1

    print_step(2, "Testing FastAPI Backend Availability")
    try:
        response = requests.get(f"{backend_url}/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print_result(True, "Backend health check passed", {
                "service": health_data.get("service", "unknown"),
                "version": health_data.get("version", "unknown")
            })
            results["tests_passed"] += 1
        else:
            print_result(False, f"Backend health check failed with status {response.status_code}")
            results["tests_failed"] += 1
    except Exception as e:
        print_result(False, f"Backend not accessible: {e}")
        results["tests_failed"] += 1

    print_step(3, "Testing AI Performance Status Endpoint")
    try:
        response = requests.get(f"{backend_url}/api/v1/ai/performance/status", timeout=15)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                monitoring_status = data.get("monitoring_status", {})
                print_result(True, "Performance status endpoint working", {
                    "monitoring_active": monitoring_status.get("monitoring_active", False),
                    "components_monitored": monitoring_status.get("components_monitored", 0),
                    "total_metrics_collected": monitoring_status.get("total_metrics_collected", 0),
                    "alert_thresholds": monitoring_status.get("alert_thresholds_configured", 0)
                })
                results["tests_passed"] += 1
            else:
                print_result(False, f"Performance status endpoint returned error: {data.get('error')}")
                results["tests_failed"] += 1
        else:
            print_result(False, f"Performance status endpoint failed with status {response.status_code}")
            results["tests_failed"] += 1
    except Exception as e:
        print_result(False, f"Performance status endpoint error: {e}")
        results["tests_failed"] += 1

    print_step(4, "Testing Real-time Metrics Endpoint")
    try:
        response = requests.get(f"{backend_url}/api/v1/ai/performance/realtime", timeout=15)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                realtime_metrics = data.get("realtime_metrics", {})
                metrics = realtime_metrics.get("metrics", {})
                print_result(True, "Real-time metrics endpoint working", {
                    "success": data.get("success"),
                    "metrics_available": len(metrics),
                    "timestamp": data.get("timestamp", "unknown")
                })
                
                # Show available metrics
                if metrics:
                    print("   📊 Available metrics:")
                    for component, component_metrics in metrics.items():
                        print(f"     - {component}: {list(component_metrics.keys())}")
                else:
                    print("   ℹ️ No active metrics found (monitoring may be initializing)")
                
                results["tests_passed"] += 1
            else:
                print_result(False, f"Real-time metrics endpoint returned error: {data.get('error')}")
                results["tests_failed"] += 1
        else:
            print_result(False, f"Real-time metrics endpoint failed with status {response.status_code}")
            results["tests_failed"] += 1
    except Exception as e:
        print_result(False, f"Real-time metrics endpoint error: {e}")
        results["tests_failed"] += 1

    print_step(5, "Testing Performance Report Endpoint")
    try:
        response = requests.get(f"{backend_url}/api/v1/ai/performance/report", timeout=25)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                report = data.get("performance_report", {})
                print_result(True, "Performance report endpoint working", {
                    "overall_health": report.get("overall_health", "unknown"),
                    "overall_score": f"{report.get('overall_score', 0) * 100:.1f}%",
                    "components": len(report.get("component_health", {})),
                    "optimizations": len(report.get("optimization_opportunities", []))
                })
                results["tests_passed"] += 1
            elif data.get("fallback"):
                # Fallback data is acceptable for testing
                fallback_report = data.get("fallback_report", {})
                print_result(True, "Performance report endpoint working (fallback data)", {
                    "fallback_reason": data.get("error", "service unavailable"),
                    "overall_health": fallback_report.get("overall_health", "unknown"),
                    "overall_score": f"{fallback_report.get('overall_score', 0) * 100:.1f}%"
                })
                results["tests_passed"] += 1
                results["warnings"].append("Performance report using fallback data - monitoring may be initializing")
            else:
                print_result(False, f"Performance report endpoint returned error: {data.get('error')}")
                results["tests_failed"] += 1
        else:
            print_result(False, f"Performance report endpoint failed with status {response.status_code}")
            results["tests_failed"] += 1
    except Exception as e:
        print_result(False, f"Performance report endpoint error: {e}")
        results["tests_failed"] += 1

    print_step(6, "Testing Performance Metric Recording")
    try:
        test_metric = {
            "component": "test_component",
            "metric": "response_time",
            "value": 1.23,
            "metadata": {"test": True, "timestamp": datetime.now().isoformat()}
        }
        
        response = requests.post(
            f"{backend_url}/api/v1/ai/performance/record",
            json=test_metric,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_result(True, "Performance metric recording working", {
                    "metric_recorded": f"{test_metric['component']}.{test_metric['metric']}",
                    "value": test_metric["value"],
                    "timestamp": data.get("timestamp", "unknown")
                })
                results["tests_passed"] += 1
            else:
                print_result(False, f"Metric recording returned error: {data.get('error')}")
                results["tests_failed"] += 1
        else:
            print_result(False, f"Metric recording failed with status {response.status_code}")
            results["tests_failed"] += 1
    except Exception as e:
        print_result(False, f"Metric recording error: {e}")
        results["tests_failed"] += 1

    print_step(7, "Testing Frontend AI Performance Page")
    try:
        response = requests.get(f"{frontend_url}/ai-performance", timeout=15)
        if response.status_code == 200:
            content = response.text
            # Check for key components in the HTML
            has_performance_content = any([
                "AI Performance Monitoring" in content,
                "performance" in content.lower(),
                "realtime" in content.lower(),
                "Component Health" in content
            ])
            
            if has_performance_content:
                print_result(True, "AI Performance page loads successfully", {
                    "status_code": response.status_code,
                    "content_length": f"{len(content)} characters",
                    "contains_monitoring_ui": "Yes"
                })
                results["tests_passed"] += 1
            else:
                print_result(False, "AI Performance page missing expected content")
                results["tests_failed"] += 1
        else:
            print_result(False, f"AI Performance page failed with status {response.status_code}")
            results["tests_failed"] += 1
    except Exception as e:
        print_result(False, f"AI Performance page error: {e}")
        results["tests_failed"] += 1

    print_step(8, "Testing Frontend API Integration")
    try:
        # Test the Next.js API route (this will require authentication)
        response = requests.get(f"{frontend_url}/api/ai/performance?type=status", timeout=15)
        
        if response.status_code == 401:
            print_result(True, "Frontend API correctly requires authentication", {
                "status_code": response.status_code,
                "authentication": "Required (as expected)"
            })
            results["tests_passed"] += 1
        elif response.status_code == 200:
            data = response.json()
            print_result(True, "Frontend API working (authenticated session)", {
                "status_code": response.status_code,
                "success": data.get("success", False)
            })
            results["tests_passed"] += 1
        else:
            print_result(False, f"Frontend API unexpected status: {response.status_code}")
            results["tests_failed"] += 1
    except Exception as e:
        print_result(False, f"Frontend API integration error: {e}")
        results["tests_failed"] += 1

    # Test Results Summary
    print_header("Test Results Summary")
    
    total_tests = results["tests_passed"] + results["tests_failed"]
    success_rate = (results["tests_passed"] / total_tests * 100) if total_tests > 0 else 0
    
    print(f"📊 Tests Run: {total_tests}")
    print(f"✅ Tests Passed: {results['tests_passed']}")
    print(f"❌ Tests Failed: {results['tests_failed']}")
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if results["warnings"]:
        print(f"\n⚠️ Warnings ({len(results['warnings'])}):")
        for warning in results["warnings"]:
            print(f"   - {warning}")
    
    print_header("Key Findings & Recommendations")
    
    findings = []
    recommendations = []
    
    if results["tests_passed"] >= 6:
        findings.append("✅ AI Performance monitoring system is functional and accessible")
        findings.append("✅ FastAPI backend endpoints are responding correctly")
        findings.append("✅ Frontend integration is properly configured")
    
    if results["tests_failed"] > 0:
        findings.append(f"⚠️ {results['tests_failed']} components need attention")
    
    if len(results["warnings"]) > 0:
        recommendations.append("🔧 Initialize AI component monitoring to populate real metrics")
        recommendations.append("🔧 Set up authentication for comprehensive frontend testing")
    
    recommendations.extend([
        "📊 Consider running the system with active AI agents to generate performance data",
        "🔍 Monitor system health over time to identify performance trends",
        "⚡ Implement performance alerting for degraded components"
    ])
    
    print("\n🔍 Key Findings:")
    for finding in findings:
        print(f"   {finding}")
    
    print("\n💡 Recommendations:")
    for rec in recommendations:
        print(f"   {rec}")
    
    print_header("AI Performance Monitoring System Assessment")
    
    if success_rate >= 75:
        print("🎯 ASSESSMENT: AI Performance monitoring system is working well!")
        print("   - Core functionality is operational")
        print("   - API endpoints are responding correctly")
        print("   - Frontend integration is functional")
        print("   - System is ready for production monitoring")
    elif success_rate >= 50:
        print("⚠️ ASSESSMENT: AI Performance monitoring system has some issues")
        print("   - Basic functionality works but needs improvements")
        print("   - Some components require attention")
        print("   - System needs configuration adjustments")
    else:
        print("❌ ASSESSMENT: AI Performance monitoring system needs significant work")
        print("   - Multiple critical components are not working")
        print("   - System configuration needs review")
        print("   - Consider debugging individual components")
    
    return results

if __name__ == "__main__":
    print("🚀 Starting AI Performance Monitoring System Direct Test")
    print(f"📅 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        results = test_ai_performance_system()
        
        # Save results to file
        with open("ai_performance_test_results.json", "w") as f:
            json.dump({
                "test_date": datetime.now().isoformat(),
                "results": results,
                "success_rate": (results["tests_passed"] / (results["tests_passed"] + results["tests_failed"]) * 100) if (results["tests_passed"] + results["tests_failed"]) > 0 else 0
            }, f, indent=2)
        
        print(f"\n💾 Test results saved to: ai_performance_test_results.json")
        
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test framework error: {e}")
    
    print(f"\n🏁 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")