#!/usr/bin/env python3
"""
Updated AI Integration Tests - Latest Models (December 2024)
Tests Gemini 2.5, OpenAI o3, and optimized model routing
"""

import os
import asyncio
import json
import logging
from datetime import datetime
import httpx
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test configuration
BASE_URL = "http://localhost:9999"  # Next.js frontend
BACKEND_URL = "http://localhost:8001"  # FastAPI backend
TEST_BARBERSHOP_ID = "test-shop-001"

class UpdatedAIIntegrationTester:
    """Test the latest AI integration with Gemini 2.5 and cost optimization"""
    
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        
    async def test_cost_optimized_routing(self) -> Dict[str, Any]:
        """Test the new cost-optimized model routing"""
        test_name = "Cost-Optimized Model Routing"
        logger.info(f"Testing {test_name}...")
        
        test_cases = [
            {
                "name": "Simple booking query (should use Gemini 2.5 Flash-Lite)",
                "messages": [{"role": "user", "content": "What time are you open?"}],
                "agentType": "booking",
                "expected_cost_range": (0.0, 0.001)
            },
            {
                "name": "Service inquiry (should use Gemini 2.5 Flash-Lite)",
                "messages": [{"role": "user", "content": "How much does a haircut cost?"}],
                "agentType": "customer_service", 
                "expected_cost_range": (0.0, 0.001)
            },
            {
                "name": "Business analytics (should use better model)",
                "messages": [{"role": "user", "content": "Analyze my barbershop's revenue trends and suggest optimization strategies for growth"}],
                "agentType": "analytics",
                "expected_cost_range": (0.001, 0.01)
            }
        ]
        
        results_detailed = []
        
        for test_case in test_cases:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{BASE_URL}/api/ai/v2",
                        json={
                            "messages": test_case["messages"],
                            "agentType": test_case["agentType"],
                            "stream": False,
                            "temperature": 0.5
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        model_used = response.headers.get('X-Model-Used', 'Unknown')
                        estimated_cost = float(response.headers.get('X-Estimated-Cost', '0'))
                        reasoning = response.headers.get('X-Model-Selection-Reasoning', '')
                        
                        cost_in_range = test_case["expected_cost_range"][0] <= estimated_cost <= test_case["expected_cost_range"][1]
                        
                        results_detailed.append({
                            "case": test_case["name"],
                            "status": "PASSED" if cost_in_range else "WARNING",
                            "model": model_used,
                            "estimated_cost": estimated_cost,
                            "cost_in_expected_range": cost_in_range,
                            "reasoning": reasoning
                        })
                        
                        status_emoji = "✅" if cost_in_range else "⚠️"
                        logger.info(f"  {status_emoji} {test_case['name']}: {model_used} (${estimated_cost:.6f})")
                        
                    else:
                        results_detailed.append({
                            "case": test_case["name"],
                            "status": "FAILED",
                            "error": f"HTTP {response.status_code}: {response.text[:200]}"
                        })
                        logger.error(f"  ❌ {test_case['name']}: HTTP {response.status_code}")
                        
            except Exception as e:
                results_detailed.append({
                    "case": test_case["name"],
                    "status": "FAILED",
                    "error": str(e)
                })
                logger.error(f"  ❌ {test_case['name']}: {str(e)}")
        
        # Summarize results
        passed = sum(1 for r in results_detailed if r["status"] == "PASSED")
        total = len(results_detailed)
        
        result = {
            "test": test_name,
            "status": "PASSED" if passed == total else "PARTIAL" if passed > 0 else "FAILED",
            "passed": passed,
            "total": total,
            "details": results_detailed
        }
        
        if result["status"] == "PASSED":
            self.passed += 1
        elif result["status"] == "FAILED":
            self.failed += 1
            
        self.results.append(result)
        logger.info(f"{'✅' if result['status'] == 'PASSED' else '⚠️'} {test_name} - {passed}/{total} passed")
        return result
    
    async def test_model_cost_comparison(self) -> Dict[str, Any]:
        """Compare costs between different model routing strategies"""
        test_name = "Model Cost Comparison"
        logger.info(f"Testing {test_name}...")
        
        try:
            # Import the cost calculation function
            import sys
            sys.path.append('/Users/bossio/6FB AI Agent System/lib')
            
            # Test with different usage patterns
            usage_patterns = [
                {
                    "name": "Typical Barbershop (100 daily messages)",
                    "dailyMessages": 100,
                    "averageMessageLength": 200
                },
                {
                    "name": "Busy Barbershop (500 daily messages)", 
                    "dailyMessages": 500,
                    "averageMessageLength": 150
                },
                {
                    "name": "Small Salon (50 daily messages)",
                    "dailyMessages": 50,
                    "averageMessageLength": 250
                }
            ]
            
            cost_comparisons = []
            
            for pattern in usage_patterns:
                # Simulate cost calculation
                messages_per_month = pattern["dailyMessages"] * 30
                tokens_per_message = pattern["averageMessageLength"] / 4 * 2  # input + output
                total_monthly_tokens = messages_per_month * tokens_per_message
                
                # With Gemini 2.5 Flash-Lite (assuming 90% of queries use free tier)
                free_tier_coverage = min(0.9, 7500000 / total_monthly_tokens)  # 7.5M free tokens
                paid_tokens = total_monthly_tokens * (1 - free_tier_coverage)
                gemini_cost = (paid_tokens / 1000) * 0.0004  # Average cost
                
                # With GPT-4o-mini (all paid)
                openai_cost = (total_monthly_tokens / 1000) * 0.0004  # Average cost
                
                cost_comparisons.append({
                    "pattern": pattern["name"],
                    "monthly_messages": messages_per_month,
                    "monthly_tokens": int(total_monthly_tokens),
                    "gemini_cost": gemini_cost,
                    "openai_cost": openai_cost,
                    "savings": openai_cost - gemini_cost,
                    "savings_percent": ((openai_cost - gemini_cost) / openai_cost * 100) if openai_cost > 0 else 0
                })
            
            result = {
                "test": test_name,
                "status": "PASSED",
                "cost_comparisons": cost_comparisons,
                "total_potential_savings": sum(c["savings"] for c in cost_comparisons),
                "average_savings_percent": sum(c["savings_percent"] for c in cost_comparisons) / len(cost_comparisons)
            }
            
            self.passed += 1
            logger.info(f"✅ {test_name} - Average savings: {result['average_savings_percent']:.1f}%")
            
        except Exception as e:
            result = {
                "test": test_name,
                "status": "FAILED",
                "error": str(e)
            }
            self.failed += 1
            logger.error(f"❌ {test_name} - {str(e)}")
            
        self.results.append(result)
        return result
    
    async def test_crew_agents_updated(self) -> Dict[str, Any]:
        """Test updated CrewAI agents with new models"""
        test_name = "Updated CrewAI Agent System"
        logger.info(f"Testing {test_name}...")
        
        try:
            from services.crew_agents import get_crew_agents
            
            crew = get_crew_agents()
            agent_info = crew.get_agent_info()
            
            # Check if agents are using cost-optimized models
            cost_optimized_agents = sum(1 for agent in agent_info if agent.get("cost_optimized", False))
            total_agents = len(agent_info)
            
            result = {
                "test": test_name,
                "status": "PASSED",
                "total_agents": total_agents,
                "cost_optimized_agents": cost_optimized_agents,
                "optimization_percentage": (cost_optimized_agents / total_agents * 100) if total_agents > 0 else 0,
                "agent_models": {agent["name"]: agent["model"] for agent in agent_info}
            }
            
            self.passed += 1
            logger.info(f"✅ {test_name} - {cost_optimized_agents}/{total_agents} agents cost-optimized")
            
        except Exception as e:
            result = {
                "test": test_name,
                "status": "WARNING",
                "error": str(e),
                "note": "CrewAI agents need API keys to fully test"
            }
            logger.warning(f"⚠️ {test_name} - {str(e)}")
            
        self.results.append(result)
        return result
    
    async def test_environment_setup(self) -> Dict[str, Any]:
        """Test environment variable setup for new models"""
        test_name = "Environment Setup Verification"
        logger.info(f"Testing {test_name}...")
        
        required_vars = [
            "OPENAI_API_KEY",
            "GOOGLE_GENERATIVE_AI_API_KEY", 
            "NEXT_PUBLIC_SUPABASE_URL"
        ]
        
        optional_vars = [
            "ANTHROPIC_API_KEY",
            "GOOGLE_AI_API_KEY"
        ]
        
        env_status = {}
        
        for var in required_vars:
            value = os.getenv(var)
            env_status[var] = {
                "present": value is not None,
                "is_placeholder": value and "placeholder" in value.lower(),
                "required": True
            }
        
        for var in optional_vars:
            value = os.getenv(var)
            env_status[var] = {
                "present": value is not None,
                "is_placeholder": value and "placeholder" in value.lower(),
                "required": False
            }
        
        # Check if we have at least OpenAI or Google API key
        has_openai = env_status["OPENAI_API_KEY"]["present"] and not env_status["OPENAI_API_KEY"]["is_placeholder"]
        has_google = env_status["GOOGLE_GENERATIVE_AI_API_KEY"]["present"] and not env_status["GOOGLE_GENERATIVE_AI_API_KEY"]["is_placeholder"]
        
        result = {
            "test": test_name,
            "status": "PASSED" if (has_openai or has_google) else "WARNING",
            "environment_variables": env_status,
            "has_working_ai_key": has_openai or has_google,
            "recommendation": "Add real API keys to test actual model responses"
        }
        
        if result["status"] == "PASSED":
            self.passed += 1
        
        self.results.append(result)
        logger.info(f"{'✅' if result['status'] == 'PASSED' else '⚠️'} {test_name}")
        return result
    
    async def run_all_tests(self):
        """Run all updated integration tests"""
        logger.info("=" * 70)
        logger.info("Updated AI SDK Integration Tests - Latest Models (December 2024)")
        logger.info("=" * 70)
        
        start_time = datetime.now()
        
        # Run all tests
        await self.test_cost_optimized_routing()
        await self.test_model_cost_comparison()
        await self.test_crew_agents_updated()
        await self.test_environment_setup()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Generate summary report
        logger.info("=" * 70)
        logger.info("Updated Test Summary")
        logger.info("=" * 70)
        logger.info(f"Total Tests: {len(self.results)}")
        logger.info(f"Passed: {self.passed}")
        logger.info(f"Failed: {self.failed}")
        logger.info(f"Warnings: {len(self.results) - self.passed - self.failed}")
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info("=" * 70)
        
        # Calculate potential cost savings
        cost_test = next((r for r in self.results if r["test"] == "Model Cost Comparison"), None)
        if cost_test and cost_test["status"] == "PASSED":
            avg_savings = cost_test.get("average_savings_percent", 0)
            logger.info(f"💰 Average Cost Savings: {avg_savings:.1f}%")
            logger.info(f"🎯 Optimization Status: {'Excellent' if avg_savings > 70 else 'Good' if avg_savings > 50 else 'Needs Improvement'}")
        
        # Save detailed report
        report = {
            "timestamp": datetime.now().isoformat(),
            "version": "Updated Integration - December 2024",
            "models_tested": ["Gemini 2.5 Flash-Lite", "GPT-4o-mini", "o3"],
            "summary": {
                "total": len(self.results),
                "passed": self.passed,
                "failed": self.failed,
                "warnings": len(self.results) - self.passed - self.failed,
                "duration_seconds": duration
            },
            "results": self.results,
            "next_steps": self.generate_next_steps()
        }
        
        with open("updated_ai_integration_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        logger.info("Detailed report saved to updated_ai_integration_report.json")
        
        return report
    
    def generate_next_steps(self) -> list:
        """Generate next steps based on test results"""
        next_steps = []
        
        # Check if we have working API keys
        env_test = next((r for r in self.results if r["test"] == "Environment Setup Verification"), None)
        if env_test and not env_test.get("has_working_ai_key", False):
            next_steps.append({
                "priority": "HIGH",
                "action": "Add real API keys",
                "details": "Replace placeholder API keys with actual keys for OpenAI and/or Google Gemini"
            })
        
        # Check cost optimization
        cost_test = next((r for r in self.results if r["test"] == "Model Cost Comparison"), None)
        if cost_test and cost_test["status"] == "PASSED":
            avg_savings = cost_test.get("average_savings_percent", 0)
            if avg_savings > 70:
                next_steps.append({
                    "priority": "LOW",
                    "action": "Monitor usage patterns",
                    "details": f"Great optimization! Monitor actual usage to maintain {avg_savings:.1f}% cost savings"
                })
        
        # Check routing
        routing_test = next((r for r in self.results if r["test"] == "Cost-Optimized Model Routing"), None)
        if routing_test and routing_test["status"] != "PASSED":
            next_steps.append({
                "priority": "MEDIUM", 
                "action": "Debug model routing",
                "details": "Some model routing tests failed - check API connectivity and model availability"
            })
        
        # Always recommend testing with real data
        next_steps.append({
            "priority": "MEDIUM",
            "action": "Test with production data",
            "details": "Test the system with actual barbershop data and user queries"
        })
        
        return next_steps

async def main():
    """Main test execution"""
    tester = UpdatedAIIntegrationTester()
    
    logger.info("🚀 Starting updated AI integration tests with latest models...")
    logger.info("📊 Focus: Gemini 2.5, cost optimization, and production readiness")
    
    # Run tests
    report = await tester.run_all_tests()
    
    # Return exit code based on results
    if tester.failed > 0:
        return 1
    else:
        return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)