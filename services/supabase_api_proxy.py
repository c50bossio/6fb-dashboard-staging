"""
Supabase API Proxy Service for FastAPI Backend
Provides consistent data access by proxying through Next.js APIs that connect to Supabase
"""

import httpx
import asyncio
import json
import os
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SupabaseAPIProxy:
    """
    PHASE 3: API Proxy service to route FastAPI requests through Next.js to Supabase
    This ensures data consistency across all endpoints
    """
    
    def __init__(self):
        # Use Docker internal networking if in Docker environment
        self.frontend_base_url = (
            'http://frontend:9999' if os.getenv('DOCKER_ENVIRONMENT') 
            else 'http://localhost:9999'
        )
        self.timeout = 10.0
        
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                           params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request to Next.js API"""
        url = f"{self.frontend_base_url}/api{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method.upper() == 'GET':
                    response = await client.get(url, params=params or {})
                elif method.upper() == 'POST':
                    response = await client.post(url, json=data, params=params or {})
                elif method.upper() == 'PUT':
                    response = await client.put(url, json=data, params=params or {})
                elif method.upper() == 'DELETE':
                    response = await client.delete(url, params=params or {})
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                # Parse response
                if response.status_code == 200:
                    return {
                        "success": True,
                        "data": response.json(),
                        "status_code": response.status_code
                    }
                else:
                    return {
                        "success": False,
                        "error": f"API returned status {response.status_code}",
                        "status_code": response.status_code,
                        "data": None
                    }
                    
        except Exception as e:
            logger.error(f"API proxy request failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": None
            }
    
    # Analytics & Business Data
    async def get_analytics_data(self, barbershop_id: Optional[str] = None, 
                               format: str = "json") -> Dict[str, Any]:
        """Get analytics data from Supabase via Next.js API"""
        params = {}
        if barbershop_id:
            params["barbershop_id"] = barbershop_id
        if format:
            params["format"] = format
            
        return await self._make_request("GET", "/analytics/live-data", params=params)
    
    async def get_business_metrics(self, barbershop_id: Optional[str] = None) -> Dict[str, Any]:
        """Get business metrics from Supabase via Next.js API"""
        params = {}
        if barbershop_id:
            params["barbershop_id"] = barbershop_id
            
        return await self._make_request("GET", "/business-data/metrics", params=params)
    
    async def get_dashboard_metrics(self, range: str = "7d", detailed: bool = False) -> Dict[str, Any]:
        """Get dashboard metrics from Next.js API"""
        params = {"range": range, "detailed": str(detailed).lower()}
        return await self._make_request("GET", "/dashboard/metrics", params=params)
    
    # Customer & User Data
    async def get_customers(self, barbershop_id: Optional[str] = None, 
                          limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get customers from Supabase via Next.js API"""
        params = {"limit": limit, "offset": offset}
        if barbershop_id:
            params["barbershop_id"] = barbershop_id
            
        return await self._make_request("GET", "/customers", params=params)
    
    async def get_appointments(self, barbershop_id: Optional[str] = None,
                             start_date: Optional[str] = None,
                             end_date: Optional[str] = None,
                             status: Optional[str] = None) -> Dict[str, Any]:
        """Get appointments from Supabase via Next.js API"""
        params = {}
        if barbershop_id:
            params["barbershop_id"] = barbershop_id
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if status:
            params["status"] = status
            
        return await self._make_request("GET", "/appointments", params=params)
    
    async def create_appointment(self, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create appointment via Next.js API"""
        return await self._make_request("POST", "/appointments", data=appointment_data)
    
    # Services & Barbershop Data
    async def get_services(self, barbershop_id: Optional[str] = None) -> Dict[str, Any]:
        """Get services from Supabase via Next.js API"""
        params = {}
        if barbershop_id:
            params["barbershop_id"] = barbershop_id
            
        return await self._make_request("GET", "/services", params=params)
    
    async def get_barbershop_info(self, barbershop_id: str) -> Dict[str, Any]:
        """Get barbershop information via Next.js API"""
        return await self._make_request("GET", f"/barbershops/{barbershop_id}")
    
    # Helper Methods
    async def test_connection(self) -> Dict[str, Any]:
        """Test the API proxy connection"""
        result = await self.get_analytics_data()
        
        if result["success"]:
            data = result["data"].get("data", {})
            return {
                "success": True,
                "message": "✅ API proxy connection successful",
                "customers": data.get("total_customers", 0),
                "revenue": data.get("total_revenue", 0),
                "data_source": result["data"].get("meta", {}).get("data_source", "unknown")
            }
        else:
            return {
                "success": False,
                "message": "❌ API proxy connection failed",
                "error": result.get("error", "Unknown error")
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get proxy service status"""
        return {
            "service": "supabase_api_proxy",
            "frontend_url": self.frontend_base_url,
            "timeout": self.timeout,
            "docker_mode": bool(os.getenv('DOCKER_ENVIRONMENT')),
            "available_endpoints": [
                "/analytics/live-data",
                "/business-data/metrics", 
                "/dashboard/metrics",
                "/customers",
                "/appointments",
                "/services",
                "/barbershops/{id}"
            ]
        }

# Global proxy instance
supabase_proxy = SupabaseAPIProxy()

# Convenience functions for easy imports
async def get_supabase_analytics() -> Dict[str, Any]:
    """Quick access to analytics data"""
    return await supabase_proxy.get_analytics_data()

async def get_supabase_customers() -> Dict[str, Any]:
    """Quick access to customer data"""
    return await supabase_proxy.get_customers()

async def get_supabase_business_metrics() -> Dict[str, Any]:
    """Quick access to business metrics"""
    return await supabase_proxy.get_business_metrics()

async def test_supabase_connection() -> Dict[str, Any]:
    """Quick connection test"""
    return await supabase_proxy.test_connection()