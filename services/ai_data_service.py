"""
AI Data Service - Aggregates real barbershop data for AI analysis
Provides comprehensive business intelligence data for AI agents
"""

import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from supabase import create_client, Client

# Initialize Supabase client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise Exception("Missing Supabase configuration")

supabase: Client = create_client(supabase_url, supabase_key)

class AIDataService:
    """Service to aggregate real barbershop data for AI analysis"""
    
    @staticmethod
    async def get_barbershop_context(barbershop_id: str) -> Dict[str, Any]:
        """Get comprehensive barbershop context for AI analysis"""
        try:
            # Get barbershop basic info
            barbershop_response = supabase.table('barbershops').select('*').eq('id', barbershop_id).execute()
            if not barbershop_response.data:
                return {"error": "Barbershop not found", "barbershop_id": barbershop_id}
            
            barbershop = barbershop_response.data[0]
            
            # Get business metrics if they exist
            metrics = await AIDataService.get_business_metrics(barbershop_id)
            
            # Get staff information
            staff = await AIDataService.get_staff_info(barbershop_id)
            
            # Get customer insights
            customer_data = await AIDataService.get_customer_insights(barbershop_id)
            
            # Get appointment patterns
            appointment_data = await AIDataService.get_appointment_patterns(barbershop_id)
            
            return {
                "barbershop": barbershop,
                "metrics": metrics,
                "staff": staff,
                "customers": customer_data,
                "appointments": appointment_data,
                "has_sufficient_data": AIDataService._assess_data_sufficiency(metrics, customer_data, appointment_data)
            }
            
        except Exception as e:
            print(f"Error getting barbershop context: {e}")
            return {"error": str(e), "barbershop_id": barbershop_id}
    
    @staticmethod
    async def get_business_metrics(barbershop_id: str) -> Dict[str, Any]:
        """Get business performance metrics"""
        try:
            # Get recent analytics events for revenue tracking
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            analytics_response = supabase.table('analytics_events').select('*').eq('barbershop_id', barbershop_id).gte('created_at', thirty_days_ago).execute()
            
            # Calculate basic metrics from available data
            events = analytics_response.data or []
            
            # Count different types of events
            appointment_events = [e for e in events if e.get('event_type') == 'appointment_booked']
            revenue_events = [e for e in events if e.get('event_type') == 'payment_completed']
            
            total_appointments = len(appointment_events)
            total_revenue = sum(float(e.get('revenue', 0)) for e in revenue_events if e.get('revenue'))
            
            return {
                "period": "30_days",
                "total_appointments": total_appointments,
                "total_revenue": total_revenue,
                "average_appointment_value": total_revenue / total_appointments if total_appointments > 0 else 0,
                "events_count": len(events),
                "data_available": len(events) > 0
            }
            
        except Exception as e:
            print(f"Error getting business metrics: {e}")
            return {"error": str(e), "data_available": False}
    
    @staticmethod
    async def get_staff_info(barbershop_id: str) -> Dict[str, Any]:
        """Get staff and barber information"""
        try:
            # Get barbers
            barbers_response = supabase.table('barbers').select('*').eq('barbershop_id', barbershop_id).execute()
            barbers = barbers_response.data or []
            
            # Get staff if different table exists
            staff_response = supabase.table('barbershop_staff').select('*').eq('barbershop_id', barbershop_id).execute()
            staff = staff_response.data or []
            
            # Get barber services
            barber_services = []
            for barber in barbers:
                services_response = supabase.table('barber_services').select('*').eq('barber_id', barber['id']).execute()
                barber_services.extend(services_response.data or [])
            
            return {
                "barbers": barbers,
                "staff": staff,
                "total_barbers": len(barbers),
                "total_staff": len(staff),
                "services_offered": len(barber_services),
                "barber_services": barber_services,
                "data_available": len(barbers) > 0 or len(staff) > 0
            }
            
        except Exception as e:
            print(f"Error getting staff info: {e}")
            return {"error": str(e), "data_available": False}
    
    @staticmethod
    async def get_customer_insights(barbershop_id: str) -> Dict[str, Any]:
        """Get customer data and insights"""
        try:
            # Get customers
            customers_response = supabase.table('customers').select('*').eq('barbershop_id', barbershop_id).execute()
            customers = customers_response.data or []
            
            # Get customer segments if available
            segments_response = supabase.table('customer_segments').select('*').eq('barbershop_id', barbershop_id).execute()
            segments = segments_response.data or []
            
            # Calculate customer insights
            total_customers = len(customers)
            recent_customers = len([c for c in customers if c.get('created_at') and 
                                 datetime.fromisoformat(c['created_at'].replace('Z', '+00:00')) > 
                                 datetime.now() - timedelta(days=30)])
            
            return {
                "total_customers": total_customers,
                "recent_customers": recent_customers,
                "customer_segments": segments,
                "growth_rate": (recent_customers / total_customers * 100) if total_customers > 0 else 0,
                "data_available": total_customers > 0
            }
            
        except Exception as e:
            print(f"Error getting customer insights: {e}")
            return {"error": str(e), "data_available": False}
    
    @staticmethod
    async def get_appointment_patterns(barbershop_id: str) -> Dict[str, Any]:
        """Get appointment booking patterns and trends"""
        try:
            # Get recent appointments
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            appointments_response = supabase.table('appointments').select('*').eq('barbershop_id', barbershop_id).gte('created_at', thirty_days_ago).execute()
            appointments = appointments_response.data or []
            
            # Get appointment details
            appointment_details = []
            for appointment in appointments:
                details_response = supabase.table('appointment_details').select('*').eq('appointment_id', appointment['id']).execute()
                appointment_details.extend(details_response.data or [])
            
            # Calculate patterns
            total_appointments = len(appointments)
            completed_appointments = len([a for a in appointments if a.get('status') == 'completed'])
            cancelled_appointments = len([a for a in appointments if a.get('status') == 'cancelled'])
            
            completion_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
            cancellation_rate = (cancelled_appointments / total_appointments * 100) if total_appointments > 0 else 0
            
            return {
                "total_appointments": total_appointments,
                "completed_appointments": completed_appointments,
                "cancelled_appointments": cancelled_appointments,
                "completion_rate": completion_rate,
                "cancellation_rate": cancellation_rate,
                "appointment_details": appointment_details,
                "data_available": total_appointments > 0
            }
            
        except Exception as e:
            print(f"Error getting appointment patterns: {e}")
            return {"error": str(e), "data_available": False}
    
    @staticmethod
    async def get_revenue_analysis(barbershop_id: str) -> Dict[str, Any]:
        """Get revenue analysis from multiple sources"""
        try:
            # Try to get payment records if available
            payment_response = supabase.table('payment_records').select('*').eq('barbershop_id', barbershop_id).execute()
            payments = payment_response.data or []
            
            # Calculate revenue metrics
            total_revenue = sum(float(p.get('amount', 0)) for p in payments)
            recent_revenue = sum(float(p.get('amount', 0)) for p in payments 
                               if p.get('created_at') and 
                               datetime.fromisoformat(p['created_at'].replace('Z', '+00:00')) > 
                               datetime.now() - timedelta(days=30))
            
            return {
                "total_revenue": total_revenue,
                "recent_revenue": recent_revenue,
                "payment_count": len(payments),
                "average_payment": total_revenue / len(payments) if payments else 0,
                "data_available": len(payments) > 0
            }
            
        except Exception as e:
            print(f"Error getting revenue analysis: {e}")
            return {"error": str(e), "data_available": False}
    
    @staticmethod
    def _assess_data_sufficiency(metrics: Dict, customers: Dict, appointments: Dict) -> bool:
        """Assess if there's sufficient data for meaningful AI analysis"""
        has_metrics = metrics.get('data_available', False)
        has_customers = customers.get('data_available', False) and customers.get('total_customers', 0) > 0
        has_appointments = appointments.get('data_available', False) and appointments.get('total_appointments', 0) > 0
        
        # At minimum, we need customer and appointment data
        return has_customers and has_appointments
    
    @staticmethod
    async def get_ai_training_data(barbershop_id: str) -> Dict[str, Any]:
        """Get comprehensive data for AI model training and insights"""
        try:
            context = await AIDataService.get_barbershop_context(barbershop_id)
            
            if context.get('error'):
                return context
            
            # Get additional revenue analysis
            revenue_analysis = await AIDataService.get_revenue_analysis(barbershop_id)
            context['revenue_analysis'] = revenue_analysis
            
            # Compile training data structure
            training_data = {
                "barbershop_info": {
                    "id": barbershop_id,
                    "name": context['barbershop'].get('name', 'Unknown'),
                    "location": context['barbershop'].get('address', 'Unknown'),
                    "type": context['barbershop'].get('business_type', 'barbershop')
                },
                "business_performance": {
                    "appointments": context['appointments'],
                    "revenue": revenue_analysis,
                    "metrics": context['metrics']
                },
                "operations": {
                    "staff": context['staff'],
                    "services": context['staff'].get('barber_services', [])
                },
                "customers": context['customers'],
                "data_quality": {
                    "sufficient_for_analysis": context['has_sufficient_data'],
                    "data_sources": {
                        "appointments": context['appointments'].get('data_available', False),
                        "customers": context['customers'].get('data_available', False),
                        "revenue": revenue_analysis.get('data_available', False),
                        "staff": context['staff'].get('data_available', False)
                    }
                }
            }
            
            return training_data
            
        except Exception as e:
            print(f"Error getting AI training data: {e}")
            return {"error": str(e), "barbershop_id": barbershop_id}

# Singleton instance
ai_data_service = AIDataService()