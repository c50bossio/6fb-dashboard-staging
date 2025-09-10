"""
Supabase Service for 6FB AI Agent System
Production-ready Supabase client for FastAPI backend
"""

import os
import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import json
import logging
from supabase import create_client, Client
from postgrest.exceptions import APIError

# Setup logging
logger = logging.getLogger(__name__)

class SupabaseService:
    """Production Supabase service for FastAPI backend"""
    
    def __init__(self):
        # Get Supabase credentials from environment
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.service_role_key:
            logger.error("❌ Missing Supabase credentials")
            self.client = None
        else:
            try:
                # Create Supabase client with service role key for full access
                self.client: Client = create_client(
                    self.supabase_url, 
                    self.service_role_key
                )
                logger.info("✅ Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Supabase client: {e}")
                self.client = None
        
        # Connection statistics
        self._stats = {
            'queries_executed': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'last_error': None,
            'last_query_time': None
        }
    
    def is_connected(self) -> bool:
        """Check if Supabase client is available"""
        return self.client is not None
    
    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check"""
        if not self.client:
            return {
                "status": "unhealthy",
                "error": "Supabase client not initialized",
                "timestamp": datetime.now().isoformat()
            }
        
        try:
            # Test connection with a simple query
            result = self.client.table('profiles').select('id').limit(1).execute()
            
            # Check if query was successful
            if hasattr(result, 'data'):
                return {
                    "status": "healthy",
                    "type": "postgresql",
                    "provider": "supabase",
                    "connection": "active",
                    "project_url": self.supabase_url,
                    "stats": self._stats,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "status": "unhealthy",
                    "error": "Query returned unexpected format",
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def execute_query(self, table: str, operation: str = 'select', **kwargs) -> Dict[str, Any]:
        """Execute Supabase query with error handling"""
        if not self.client:
            raise Exception("Supabase client not available")
        
        start_time = datetime.now()
        self._stats['queries_executed'] += 1
        
        try:
            # Get table reference
            table_ref = self.client.table(table)
            
            # Execute operation based on type
            if operation == 'select':
                columns = kwargs.get('select', '*')
                result = table_ref.select(columns)
                
                # Apply filters if provided
                if 'eq' in kwargs:
                    for field, value in kwargs['eq'].items():
                        result = result.eq(field, value)
                
                if 'neq' in kwargs:
                    for field, value in kwargs['neq'].items():
                        result = result.neq(field, value)
                
                if 'gt' in kwargs:
                    for field, value in kwargs['gt'].items():
                        result = result.gt(field, value)
                
                if 'gte' in kwargs:
                    for field, value in kwargs['gte'].items():
                        result = result.gte(field, value)
                
                if 'lt' in kwargs:
                    for field, value in kwargs['lt'].items():
                        result = result.lt(field, value)
                
                if 'lte' in kwargs:
                    for field, value in kwargs['lte'].items():
                        result = result.lte(field, value)
                
                if 'like' in kwargs:
                    for field, value in kwargs['like'].items():
                        result = result.like(field, value)
                
                if 'ilike' in kwargs:
                    for field, value in kwargs['ilike'].items():
                        result = result.ilike(field, value)
                
                if 'in' in kwargs:
                    for field, value in kwargs['in'].items():
                        result = result.in_(field, value)
                
                # Apply ordering
                if 'order' in kwargs:
                    order_field = kwargs['order']
                    ascending = kwargs.get('ascending', True)
                    result = result.order(order_field, desc=not ascending)
                
                # Apply limit
                if 'limit' in kwargs:
                    result = result.limit(kwargs['limit'])
                
                # Apply offset
                if 'offset' in kwargs:
                    result = result.offset(kwargs['offset'])
                
                # Execute query
                response = result.execute()
                
            elif operation == 'insert':
                data = kwargs.get('data')
                if not data:
                    raise ValueError("Insert operation requires 'data' parameter")
                result = table_ref.insert(data)
                response = result.execute()
                
            elif operation == 'update':
                data = kwargs.get('data')
                if not data:
                    raise ValueError("Update operation requires 'data' parameter")
                result = table_ref.update(data)
                
                # Apply filters for update
                if 'eq' in kwargs:
                    for field, value in kwargs['eq'].items():
                        result = result.eq(field, value)
                
                response = result.execute()
                
            elif operation == 'delete':
                result = table_ref.delete()
                
                # Apply filters for delete
                if 'eq' in kwargs:
                    for field, value in kwargs['eq'].items():
                        result = result.eq(field, value)
                
                response = result.execute()
                
            else:
                raise ValueError(f"Unsupported operation: {operation}")
            
            # Update statistics
            self._stats['successful_queries'] += 1
            self._stats['last_query_time'] = datetime.now()
            
            return {
                'success': True,
                'data': response.data,
                'count': getattr(response, 'count', None)
            }
            
        except APIError as e:
            self._stats['failed_queries'] += 1
            self._stats['last_error'] = str(e)
            logger.error(f"Supabase API error: {e}")
            return {
                'success': False,
                'error': str(e),
                'code': getattr(e, 'code', None)
            }
        except Exception as e:
            self._stats['failed_queries'] += 1
            self._stats['last_error'] = str(e)
            logger.error(f"Query execution error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_barbershops(self, limit: int = 10) -> Dict[str, Any]:
        """Get barbershops list"""
        return self.execute_query('barbershops', 'select', limit=limit)
    
    def get_barbershop_by_id(self, barbershop_id: str) -> Dict[str, Any]:
        """Get barbershop by ID"""
        return self.execute_query('barbershops', 'select', eq={'id': barbershop_id})
    
    def get_services(self, barbershop_id: str = None, limit: int = 20) -> Dict[str, Any]:
        """Get services, optionally filtered by barbershop"""
        filters = {}
        if barbershop_id:
            filters['eq'] = {'barbershop_id': barbershop_id}
        return self.execute_query('services', 'select', limit=limit, **filters)
    
    def get_appointments(
        self, 
        barbershop_id: str = None, 
        barber_id: str = None,
        client_id: str = None,
        status: str = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get appointments with optional filters"""
        filters = {}
        eq_filters = {}
        
        if barbershop_id:
            eq_filters['barbershop_id'] = barbershop_id
        if barber_id:
            eq_filters['barber_id'] = barber_id
        if client_id:
            eq_filters['client_id'] = client_id
        if status:
            eq_filters['status'] = status
        
        if eq_filters:
            filters['eq'] = eq_filters
        
        return self.execute_query(
            'appointments', 
            'select',
            select='*, barbershops(name), services(name, duration_minutes, price)',
            limit=limit,
            order='scheduled_at',
            ascending=False,
            **filters
        )
    
    def create_appointment(self, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new appointment"""
        return self.execute_query('appointments', 'insert', data=appointment_data)
    
    def update_appointment(self, appointment_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update appointment"""
        return self.execute_query(
            'appointments', 
            'update', 
            data=update_data, 
            eq={'id': appointment_id}
        )
    
    def get_customers(self, limit: int = 50) -> Dict[str, Any]:
        """Get customers list"""
        return self.execute_query('customers', 'select', limit=limit)
    
    def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new customer"""
        return self.execute_query('customers', 'insert', data=customer_data)
    
    def get_barber_availability(self, barber_id: str, date_range: Dict = None) -> Dict[str, Any]:
        """Get barber availability"""
        filters = {'eq': {'barber_id': barber_id}}
        return self.execute_query('barber_availability', 'select', **filters)
    
    def get_ai_insights(self, barbershop_id: str, limit: int = 10) -> Dict[str, Any]:
        """Get AI insights for barbershop"""
        return self.execute_query(
            'ai_insights', 
            'select',
            eq={'barbershop_id': barbershop_id, 'is_active': True},
            order='created_at',
            ascending=False,
            limit=limit
        )
    
    def get_notifications(self, user_id: str = None, barbershop_id: str = None, limit: int = 20) -> Dict[str, Any]:
        """Get notifications"""
        filters = {}
        eq_filters = {}
        
        if user_id:
            eq_filters['user_id'] = user_id
        if barbershop_id:
            eq_filters['barbershop_id'] = barbershop_id
        
        if eq_filters:
            filters['eq'] = eq_filters
        
        return self.execute_query(
            'notifications',
            'select',
            order='created_at',
            ascending=False,
            limit=limit,
            **filters
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        return self._stats

# Global Supabase service instance
supabase_service = SupabaseService()

# Compatibility functions for existing code
def get_db_health():
    """Get database health (sync)"""
    import asyncio
    return asyncio.run(supabase_service.health_check())

def get_connection_stats():
    """Get connection statistics"""
    return supabase_service.get_stats()

def is_database_connected():
    """Check if database is connected"""
    return supabase_service.is_connected()