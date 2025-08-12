#!/usr/bin/env python3
"""
Evaluation System Configuration
Connects evaluations to real AI models and Supabase database
"""

import os
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class EvaluationConfig:
    """Central configuration for evaluation system"""
    
    def __init__(self):
        # API Endpoints
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:8001")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:9999")
        
        # Supabase Configuration
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_anon_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        self.supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        # AI Model API Keys
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.google_ai_api_key = os.getenv("GOOGLE_AI_API_KEY")
        
        # Evaluation Thresholds
        self.thresholds = {
            "accuracy": 0.85,
            "response_time_simple": 2.0,  # seconds
            "response_time_complex": 5.0,  # seconds
            "hallucination_rate": 0.05,  # max 5% hallucination
            "context_retention": 0.80,  # 80% context retention
            "cost_per_query_max": 0.10,  # $0.10 max per query
        }
        
        # Model Selection Rules
        self.model_routing = {
            "complex_coding": "claude-opus-4-1-20250805",
            "simple_query": "gemini-2.0-flash-exp",
            "business_analysis": "gpt-5",
            "default": "gpt-5"
        }
        
    def get_ai_endpoint(self, agent_type: str) -> str:
        """Get the API endpoint for a specific AI agent"""
        endpoints = {
            "master_coach": f"{self.backend_url}/api/v1/agents/master-coach",
            "financial": f"{self.backend_url}/api/v1/agents/financial",
            "marketing": f"{self.backend_url}/api/v1/agents/marketing",
            "operations": f"{self.backend_url}/api/v1/agents/operations",
            "customer_relations": f"{self.backend_url}/api/v1/agents/customer-relations",
            "growth": f"{self.backend_url}/api/v1/agents/growth",
            "brand": f"{self.backend_url}/api/v1/agents/brand",
            "strategic": f"{self.backend_url}/api/v1/agents/strategic"
        }
        return endpoints.get(agent_type, f"{self.backend_url}/api/v1/ai/chat")
    
    def get_supabase_headers(self) -> Dict[str, str]:
        """Get headers for Supabase API calls"""
        return {
            "apikey": self.supabase_service_key,
            "Authorization": f"Bearer {self.supabase_service_key}",
            "Content-Type": "application/json"
        }


class AIModelClient:
    """Client for calling real AI models"""
    
    def __init__(self, config: EvaluationConfig):
        self.config = config
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def query_ai_agent(self, agent_type: str, prompt: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Query a specific AI agent with real API call"""
        endpoint = self.config.get_ai_endpoint(agent_type)
        
        payload = {
            "prompt": prompt,
            "context": context or {},
            "model": self._select_model_for_query(prompt),
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        try:
            response = await self.client.post(
                endpoint,
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.config.openai_api_key}",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {
                "error": str(e),
                "success": False,
                "response": None
            }
    
    async def query_business_intelligence(self, query_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Query business intelligence endpoints"""
        endpoints = {
            "revenue_prediction": f"{self.config.backend_url}/api/v1/analytics/revenue/predict",
            "customer_behavior": f"{self.config.backend_url}/api/v1/analytics/customers/behavior",
            "booking_optimization": f"{self.config.backend_url}/api/v1/analytics/bookings/optimize",
            "seasonal_analysis": f"{self.config.backend_url}/api/v1/analytics/seasonal"
        }
        
        endpoint = endpoints.get(query_type, f"{self.config.backend_url}/api/v1/analytics/general")
        
        try:
            response = await self.client.post(endpoint, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e), "success": False}
    
    def _select_model_for_query(self, prompt: str) -> str:
        """Select the appropriate model based on query complexity"""
        prompt_lower = prompt.lower()
        
        # Complex coding tasks
        if any(word in prompt_lower for word in ["algorithm", "implement", "code", "script", "function"]):
            return self.config.model_routing["complex_coding"]
        
        # Simple queries
        if any(word in prompt_lower for word in ["what time", "how much", "when", "where"]):
            return self.config.model_routing["simple_query"]
        
        # Business analysis
        if any(word in prompt_lower for word in ["revenue", "analyze", "trend", "forecast", "strategy"]):
            return self.config.model_routing["business_analysis"]
        
        return self.config.model_routing["default"]
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class SupabaseClient:
    """Client for real Supabase database operations"""
    
    def __init__(self, config: EvaluationConfig):
        self.config = config
        self.client = httpx.AsyncClient(timeout=30.0)
        self.base_url = f"{config.supabase_url}/rest/v1"
        
    async def get_business_metrics(self, metric_type: str, date_range: Dict[str, str]) -> Dict[str, Any]:
        """Get real business metrics from Supabase"""
        queries = {
            "revenue": f"{self.base_url}/transactions?select=amount&created_at=gte.{date_range['start']}&created_at=lte.{date_range['end']}",
            "bookings": f"{self.base_url}/appointments?select=*&date=gte.{date_range['start']}&date=lte.{date_range['end']}",
            "customers": f"{self.base_url}/customers?select=*&created_at=gte.{date_range['start']}&created_at=lte.{date_range['end']}"
        }
        
        url = queries.get(metric_type, f"{self.base_url}/barbershops")
        
        try:
            response = await self.client.get(
                url,
                headers=self.config.get_supabase_headers()
            )
            response.raise_for_status()
            return {"success": True, "data": response.json()}
        except Exception as e:
            return {"success": False, "error": str(e), "data": []}
    
    async def get_customer_history(self, customer_id: str) -> Dict[str, Any]:
        """Get real customer booking history"""
        try:
            response = await self.client.get(
                f"{self.base_url}/appointments?customer_id=eq.{customer_id}&order=date.desc",
                headers=self.config.get_supabase_headers()
            )
            response.raise_for_status()
            return {"success": True, "appointments": response.json()}
        except Exception as e:
            return {"success": False, "error": str(e), "appointments": []}
    
    async def get_barbershop_data(self, shop_id: Optional[str] = None) -> Dict[str, Any]:
        """Get barbershop operational data"""
        url = f"{self.base_url}/barbershops"
        if shop_id:
            url += f"?id=eq.{shop_id}"
        
        try:
            response = await self.client.get(
                url,
                headers=self.config.get_supabase_headers()
            )
            response.raise_for_status()
            return {"success": True, "barbershops": response.json()}
        except Exception as e:
            return {"success": False, "error": str(e), "barbershops": []}
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


# Singleton instances
_config = None
_ai_client = None
_supabase_client = None

def get_config() -> EvaluationConfig:
    """Get or create configuration singleton"""
    global _config
    if _config is None:
        _config = EvaluationConfig()
    return _config

async def get_ai_client() -> AIModelClient:
    """Get or create AI client singleton"""
    global _ai_client
    if _ai_client is None:
        _ai_client = AIModelClient(get_config())
    return _ai_client

async def get_supabase_client() -> SupabaseClient:
    """Get or create Supabase client singleton"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient(get_config())
    return _supabase_client