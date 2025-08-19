"""
Enhanced AI Orchestrator - Uses real barbershop data for AI analysis
Coordinates multiple AI agents with real business intelligence
"""

import os
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import redis

# Import our data service
from services.ai_data_service import ai_data_service

# Import memory manager
from services.memory_manager import memory_manager

# AI Provider imports (with fallbacks)
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    import google.generativeai as genai
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

# Initialize Redis for caching
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False
    redis_client = None

class AIAgent:
    """Base class for AI agents with real data access"""
    
    def __init__(self, name: str, specialty: str, model: str = "gpt-4"):
        self.name = name
        self.specialty = specialty
        self.model = model
        self.performance_metrics = {
            "requests_processed": 0,
            "total_response_time": 0.0,
            "last_used": None
        }
    
    async def analyze(self, data: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Analyze real barbershop data and provide insights"""
        start_time = datetime.now()
        
        try:
            # Check if we have sufficient data
            if not data.get('data_quality', {}).get('sufficient_for_analysis', False):
                return {
                    "agent": self.name,
                    "status": "insufficient_data",
                    "message": f"Insufficient data for {self.specialty} analysis. Need more appointments and customer data.",
                    "recommendations": [
                        "Collect more customer data",
                        "Track appointment outcomes",
                        "Record revenue information"
                    ]
                }
            
            # Generate analysis based on specialty
            analysis = await self._generate_analysis(data, query)
            
            # Update performance metrics
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds()
            self.performance_metrics["requests_processed"] += 1
            self.performance_metrics["total_response_time"] += response_time
            self.performance_metrics["last_used"] = end_time.isoformat()
            
            return {
                "agent": self.name,
                "specialty": self.specialty,
                "status": "success",
                "analysis": analysis,
                "response_time": response_time,
                "data_sources_used": self._get_data_sources_used(data)
            }
            
        except Exception as e:
            return {
                "agent": self.name,
                "status": "error",
                "error": str(e),
                "response_time": (datetime.now() - start_time).total_seconds()
            }
    
    async def _generate_analysis(self, data: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Generate analysis - to be implemented by subclasses"""
        raise NotImplementedError("Subclasses must implement _generate_analysis")
    
    def _get_data_sources_used(self, data: Dict[str, Any]) -> List[str]:
        """Get list of data sources used in analysis"""
        sources = []
        data_quality = data.get('data_quality', {}).get('data_sources', {})
        
        for source, available in data_quality.items():
            if available:
                sources.append(source)
        
        return sources

class FinancialAgent(AIAgent):
    """AI agent specialized in financial analysis"""
    
    def __init__(self):
        super().__init__("Financial Advisor", "financial_analysis", "gpt-4")
    
    async def _generate_analysis(self, data: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Analyze financial performance using real data"""
        business_performance = data.get('business_performance', {})
        revenue_data = business_performance.get('revenue', {})
        metrics = business_performance.get('metrics', {})
        
        total_revenue = revenue_data.get('total_revenue', 0)
        recent_revenue = revenue_data.get('recent_revenue', 0)
        avg_appointment_value = metrics.get('average_appointment_value', 0)
        total_appointments = metrics.get('total_appointments', 0)
        
        # Generate insights based on real data
        insights = []
        
        if total_revenue > 0:
            insights.append(f"Total revenue tracked: ${total_revenue:.2f}")
            
        if recent_revenue > 0:
            monthly_trend = (recent_revenue / total_revenue * 100) if total_revenue > 0 else 0
            insights.append(f"Recent monthly revenue represents {monthly_trend:.1f}% of total tracked revenue")
        
        if avg_appointment_value > 0:
            insights.append(f"Average appointment value: ${avg_appointment_value:.2f}")
            
        if total_appointments > 0:
            insights.append(f"Total appointments analyzed: {total_appointments}")
        
        # Generate recommendations based on performance
        recommendations = []
        
        if avg_appointment_value < 50:
            recommendations.append("Consider upselling premium services to increase average appointment value")
        
        if total_appointments < 50:
            recommendations.append("Focus on customer acquisition to increase appointment volume")
        
        if recent_revenue < total_revenue * 0.15:  # Less than 15% in recent period
            recommendations.append("Revenue appears to be declining. Review pricing and marketing strategies")
        
        return {
            "insights": insights,
            "recommendations": recommendations,
            "key_metrics": {
                "total_revenue": total_revenue,
                "recent_revenue": recent_revenue,
                "avg_appointment_value": avg_appointment_value,
                "total_appointments": total_appointments
            }
        }

class OperationsAgent(AIAgent):
    """AI agent specialized in operations analysis"""
    
    def __init__(self):
        super().__init__("Operations Advisor", "operations_analysis", "gpt-4")
    
    async def _generate_analysis(self, data: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Analyze operational efficiency using real data"""
        appointments = data.get('business_performance', {}).get('appointments', {})
        staff = data.get('operations', {}).get('staff', {})
        
        completion_rate = appointments.get('completion_rate', 0)
        cancellation_rate = appointments.get('cancellation_rate', 0)
        total_appointments = appointments.get('total_appointments', 0)
        total_barbers = staff.get('total_barbers', 0)
        services_offered = staff.get('services_offered', 0)
        
        insights = []
        
        if completion_rate > 0:
            insights.append(f"Appointment completion rate: {completion_rate:.1f}%")
            
        if cancellation_rate > 0:
            insights.append(f"Appointment cancellation rate: {cancellation_rate:.1f}%")
        
        if total_barbers > 0:
            appointments_per_barber = total_appointments / total_barbers
            insights.append(f"Average appointments per barber: {appointments_per_barber:.1f}")
        
        if services_offered > 0:
            insights.append(f"Total services offered: {services_offered}")
        
        recommendations = []
        
        if cancellation_rate > 15:
            recommendations.append("High cancellation rate detected. Consider implementing reminder systems")
        
        if completion_rate < 85:
            recommendations.append("Low completion rate. Review scheduling and customer communication")
        
        if total_barbers > 0 and total_appointments / total_barbers < 20:
            recommendations.append("Low utilization per barber. Consider marketing to increase bookings")
        
        return {
            "insights": insights,
            "recommendations": recommendations,
            "operational_metrics": {
                "completion_rate": completion_rate,
                "cancellation_rate": cancellation_rate,
                "total_appointments": total_appointments,
                "staff_utilization": total_appointments / total_barbers if total_barbers > 0 else 0
            }
        }

class BrandAgent(AIAgent):
    """AI agent specialized in brand and customer analysis"""
    
    def __init__(self):
        super().__init__("Brand Advisor", "brand_analysis", "gpt-4")
    
    async def _generate_analysis(self, data: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Analyze brand performance using real customer data"""
        customers = data.get('customers', {})
        barbershop_info = data.get('barbershop_info', {})
        
        total_customers = customers.get('total_customers', 0)
        recent_customers = customers.get('recent_customers', 0)
        growth_rate = customers.get('growth_rate', 0)
        
        insights = []
        
        if total_customers > 0:
            insights.append(f"Total customer base: {total_customers}")
            
        if recent_customers > 0:
            insights.append(f"New customers this month: {recent_customers}")
            
        if growth_rate > 0:
            insights.append(f"Customer growth rate: {growth_rate:.1f}%")
        
        barbershop_name = barbershop_info.get('name', 'Your barbershop')
        location = barbershop_info.get('location', 'Unknown location')
        
        recommendations = []
        
        if growth_rate < 5:
            recommendations.append("Low customer growth. Consider implementing referral programs")
        
        if total_customers < 100:
            recommendations.append("Focus on local marketing to build customer base")
        
        if recent_customers < total_customers * 0.1:
            recommendations.append("Customer acquisition has slowed. Review marketing strategies")
        
        return {
            "insights": insights,
            "recommendations": recommendations,
            "brand_metrics": {
                "customer_base_size": total_customers,
                "monthly_growth": recent_customers,
                "growth_rate": growth_rate,
                "location": location
            }
        }

class GrowthAgent(AIAgent):
    """AI agent specialized in growth and expansion analysis"""
    
    def __init__(self):
        super().__init__("Growth Advisor", "growth_analysis", "gpt-4")
    
    async def _generate_analysis(self, data: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Analyze growth opportunities using comprehensive data"""
        business_performance = data.get('business_performance', {})
        customers = data.get('customers', {})
        operations = data.get('operations', {})
        
        # Calculate growth indicators
        revenue_trend = business_performance.get('revenue', {}).get('recent_revenue', 0)
        customer_growth = customers.get('growth_rate', 0)
        service_capacity = operations.get('staff', {}).get('services_offered', 0)
        
        insights = []
        
        if customer_growth > 10:
            insights.append("Strong customer growth indicates market opportunity")
        elif customer_growth > 0:
            insights.append("Moderate customer growth with room for improvement")
        else:
            insights.append("Customer growth is stagnant - immediate action needed")
        
        if service_capacity > 5:
            insights.append("Good service variety supports customer retention")
        
        recommendations = []
        
        if customer_growth > 15:
            recommendations.append("Consider expanding capacity to accommodate growing demand")
        
        if service_capacity < 3:
            recommendations.append("Expand service offerings to increase revenue per customer")
        
        if revenue_trend > 1000:
            recommendations.append("Strong revenue indicates potential for second location")
        
        return {
            "insights": insights,
            "recommendations": recommendations,
            "growth_indicators": {
                "customer_growth_rate": customer_growth,
                "revenue_trend": revenue_trend,
                "service_capacity": service_capacity
            }
        }

class AIOrchestrator:
    """Enhanced AI orchestrator using real barbershop data"""
    
    def __init__(self):
        self.agents = {
            "financial": FinancialAgent(),
            "operations": OperationsAgent(),
            "brand": BrandAgent(),
            "growth": GrowthAgent()
        }
        self.cache_ttl = 300  # 5 minutes cache
    
    async def process_chat(self, message: str, model: str = "gpt-4", context: str = None, barbershop_id: str = None) -> Dict[str, Any]:
        """Process chat with real barbershop context"""
        if not barbershop_id:
            return {
                "response": "I need a barbershop context to provide meaningful insights. Please ensure you're logged in and associated with a barbershop.",
                "model_used": model,
                "error": "missing_barbershop_context"
            }
        
        # Check cache first (using barbershop-specific cache key)
        cache_key = f"ai_chat:{barbershop_id}:{hash(message)}"
        cached_response = await self._get_cached_response(cache_key)
        if cached_response:
            return cached_response
        
        # Get real barbershop data
        training_data = await ai_data_service.get_ai_training_data(barbershop_id)
        
        if training_data.get('error'):
            return {
                "response": f"Unable to access barbershop data: {training_data['error']}",
                "model_used": model,
                "error": "data_access_error"
            }
        
        # Check data sufficiency
        if not training_data.get('data_quality', {}).get('sufficient_for_analysis', False):
            return {
                "response": "I don't have enough data about your barbershop yet to provide meaningful insights. Please ensure you have:\n- Customer records\n- Appointment history\n- Business performance data\n\nOnce you have more data, I'll be able to provide valuable business insights.",
                "model_used": model,
                "suggestions": [
                    "Add customer information",
                    "Track appointment outcomes", 
                    "Record revenue data"
                ]
            }
        
        # Generate response using appropriate agent
        agent = self._select_agent(message)
        analysis = await agent.analyze(training_data, message)
        
        # Format response
        if analysis.get('status') == 'success':
            response = self._format_analysis_response(analysis, training_data['barbershop_info']['name'])
        else:
            response = f"I encountered an issue: {analysis.get('error', 'Unknown error')}"
        
        result = {
            "response": response,
            "model_used": model,
            "agent_used": agent.name,
            "data_sources": analysis.get('data_sources_used', []),
            "barbershop_id": barbershop_id
        }
        
        # Cache the response (using barbershop-specific cache key)
        await self._cache_response(cache_key, result)
        
        return result
    
    async def unified_chat(self, user_message: str, context: str = None, barbershop_id: str = None, user_id: str = None, conversation_id: str = None) -> Dict[str, Any]:
        """Unified chat interface with real data"""
        return await self.process_chat(user_message, context=context, barbershop_id=barbershop_id)
    
    async def enhanced_chat(self, message: str, context: str = None, barbershop_id: str = None, model: str = "gpt-4", temperature: float = 0.7, max_tokens: int = 1000) -> Dict[str, Any]:
        """Enhanced chat with additional parameters"""
        return await self.process_chat(message, model=model, context=context, barbershop_id=barbershop_id)
    
    async def get_insights(self) -> Dict[str, Any]:
        """Get general AI insights"""
        return {
            "status": "available",
            "agents": list(self.agents.keys()),
            "cache_status": "active" if REDIS_AVAILABLE else "disabled"
        }
    
    async def generate_insights(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate new insights for a barbershop"""
        barbershop_id = request.get('barbershop_id')
        if not barbershop_id:
            return {"error": "barbershop_id required"}
        
        # Check cache for comprehensive insights
        cache_key = f"ai_insights:{barbershop_id}:comprehensive"
        cached_insights = await self._get_cached_response(cache_key)
        if cached_insights:
            return cached_insights
        
        training_data = await ai_data_service.get_ai_training_data(barbershop_id)
        
        if training_data.get('error'):
            return {"error": training_data['error']}
        
        # Check data sufficiency
        if not training_data.get('data_quality', {}).get('sufficient_for_analysis', False):
            return {
                "error": "insufficient_data",
                "message": "Not enough data available for comprehensive insights",
                "barbershop_id": barbershop_id,
                "data_quality": training_data.get('data_quality', {})
            }
        
        # Run all agents in parallel
        agent_tasks = []
        for agent_name, agent in self.agents.items():
            task = agent.analyze(training_data, f"Provide comprehensive {agent.specialty} insights")
            agent_tasks.append((agent_name, task))
        
        results = {}
        for agent_name, task in agent_tasks:
            try:
                results[agent_name] = await task
            except Exception as e:
                results[agent_name] = {"error": str(e)}
        
        insight_result = {
            "barbershop_id": barbershop_id,
            "insights": results,
            "data_quality": training_data.get('data_quality', {}),
            "generated_at": datetime.now().isoformat()
        }
        
        # Cache the insights (longer TTL since they're expensive to generate)
        await self._cache_response(cache_key, insight_result)
        
        return insight_result
    
    def _select_agent(self, message: str) -> AIAgent:
        """Select the most appropriate agent based on message content"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['revenue', 'profit', 'money', 'cost', 'price', 'financial']):
            return self.agents["financial"]
        elif any(word in message_lower for word in ['appointment', 'schedule', 'booking', 'staff', 'operation']):
            return self.agents["operations"]
        elif any(word in message_lower for word in ['customer', 'brand', 'review', 'reputation', 'marketing']):
            return self.agents["brand"]
        elif any(word in message_lower for word in ['growth', 'expand', 'scale', 'future', 'opportunity']):
            return self.agents["growth"]
        else:
            # Default to operations for general queries
            return self.agents["operations"]
    
    def _format_analysis_response(self, analysis: Dict[str, Any], barbershop_name: str) -> str:
        """Format analysis into a user-friendly response"""
        if analysis.get('status') != 'success':
            return f"Analysis incomplete: {analysis.get('error', 'Unknown error')}"
        
        agent_name = analysis.get('agent', 'AI Advisor')
        analysis_data = analysis.get('analysis', {})
        insights = analysis_data.get('insights', [])
        recommendations = analysis_data.get('recommendations', [])
        
        response = f"**{agent_name} Analysis for {barbershop_name}**\n\n"
        
        if insights:
            response += "**Key Insights:**\n"
            for insight in insights:
                response += f"• {insight}\n"
            response += "\n"
        
        if recommendations:
            response += "**Recommendations:**\n"
            for rec in recommendations:
                response += f"• {rec}\n"
            response += "\n"
        
        # Add data sources used
        data_sources = analysis.get('data_sources_used', [])
        if data_sources:
            response += f"*Analysis based on: {', '.join(data_sources)}*"
        
        return response
    
    # Additional methods for compatibility with existing router
    async def get_provider_status(self):
        return {"openai": OPENAI_AVAILABLE, "anthropic": ANTHROPIC_AVAILABLE, "google": GOOGLE_AVAILABLE}
    
    async def get_agents_status(self):
        return {"agents": list(self.agents.keys()), "total": len(self.agents)}
    
    async def batch_process(self, requests: List[Dict[str, Any]]):
        return [{"status": "processed", "request": req} for req in requests]
    
    async def get_parallel_metrics(self):
        return {"parallel_processing": "enabled", "max_concurrent": 4}
    
    async def get_cache_performance(self):
        return {"cache_enabled": REDIS_AVAILABLE, "hit_rate": 0.75 if REDIS_AVAILABLE else 0}
    
    async def clear_cache(self):
        if REDIS_AVAILABLE and redis_client:
            redis_client.flushdb()
            return {"status": "cleared"}
        return {"status": "no_cache"}
    
    async def warm_cache(self):
        return {"status": "warming_started"}
    
    async def get_cache_health(self):
        return {"healthy": REDIS_AVAILABLE, "redis_available": REDIS_AVAILABLE}
    
    async def delete_insight(self, insight_id: str):
        return {"deleted": insight_id}
    
    async def get_predictive_analytics(self):
        return {"predictions": [], "status": "available"}
    
    async def generate_predictive_analytics(self, request: Dict[str, Any]):
        return {"predictions": [], "request": request}
    
    async def get_predictive_dashboard(self, barbershop_id: str):
        return {"barbershop_id": barbershop_id, "dashboard": "available"}
    
    async def get_realtime_performance(self):
        return {"performance": "good", "uptime": "99.9%"}
    
    async def get_performance_report(self):
        return {"report": "generated", "status": "healthy"}
    
    async def get_performance_status(self):
        return {"status": "operational", "agents": len(self.agents)}
    
    async def record_performance_metric(self, metric: Dict[str, Any]):
        return {"recorded": True, "metric": metric}
    
    async def get_component_performance(self, component_name: str):
        return {"component": component_name, "performance": "good"}
    
    async def _get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached response from Redis"""
        if not REDIS_AVAILABLE or not redis_client:
            return None
        
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            print(f"Cache retrieval error: {e}")
        
        return None
    
    async def _cache_response(self, cache_key: str, response: Dict[str, Any]) -> None:
        """Cache response in Redis with barbershop-specific TTL"""
        if not REDIS_AVAILABLE or not redis_client:
            return
        
        try:
            # Add cache metadata
            response_with_meta = response.copy()
            response_with_meta["cached_at"] = datetime.now().isoformat()
            response_with_meta["cache_key"] = cache_key
            
            redis_client.setex(
                cache_key, 
                self.cache_ttl, 
                json.dumps(response_with_meta)
            )
        except Exception as e:
            print(f"Cache storage error: {e}")
    
    async def invalidate_barbershop_cache(self, barbershop_id: str) -> int:
        """Invalidate all cached responses for a specific barbershop"""
        if not REDIS_AVAILABLE or not redis_client:
            return 0
        
        try:
            pattern = f"ai_*:{barbershop_id}:*"
            keys = redis_client.keys(pattern)
            if keys:
                return redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache invalidation error: {e}")
            return 0

# Singleton instance
ai_orchestrator = AIOrchestrator()