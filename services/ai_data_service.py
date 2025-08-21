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
        """Get customer data and insights with intelligence metrics"""
        try:
            # Get customers with intelligence data
            customers_response = supabase.table('customers').select('*').eq('barbershop_id', barbershop_id).execute()
            customers = customers_response.data or []
            
            # Get customer intelligence data
            intelligence_response = supabase.table('customer_intelligence').select('*').eq('barbershop_id', barbershop_id).execute()
            intelligence_data = intelligence_response.data or []
            
            # Get customer segments
            segments_response = supabase.table('customer_segments').select('*').eq('barbershop_id', barbershop_id).execute()
            segments = segments_response.data or []
            
            # Get loyalty data
            loyalty_response = supabase.table('customer_loyalty').select('*').eq('barbershop_id', barbershop_id).execute()
            loyalty_data = loyalty_response.data or []
            
            # Calculate customer insights
            total_customers = len(customers)
            recent_customers = len([c for c in customers if c.get('created_at') and 
                                 datetime.fromisoformat(c['created_at'].replace('Z', '+00:00')) > 
                                 datetime.now() - timedelta(days=30)])
            
            # Calculate intelligence metrics
            total_clv = sum(float(intel.get('clv', 0)) for intel in intelligence_data if intel.get('clv'))
            avg_clv = total_clv / len(intelligence_data) if intelligence_data else 0
            
            # Health score distribution
            health_scores = [intel.get('health_score', 0) for intel in intelligence_data if intel.get('health_score')]
            avg_health_score = sum(health_scores) / len(health_scores) if health_scores else 0
            
            # Churn risk analysis
            high_churn_risk = len([intel for intel in intelligence_data if intel.get('churn_risk_score', 0) > 0.7])
            medium_churn_risk = len([intel for intel in intelligence_data if 0.3 < intel.get('churn_risk_score', 0) <= 0.7])
            low_churn_risk = len([intel for intel in intelligence_data if intel.get('churn_risk_score', 0) <= 0.3])
            
            # Loyalty metrics
            total_loyalty_points = sum(float(loyalty.get('points', 0)) for loyalty in loyalty_data if loyalty.get('points'))
            avg_loyalty_points = total_loyalty_points / len(loyalty_data) if loyalty_data else 0
            
            # Tier distribution
            tier_distribution = {}
            for loyalty in loyalty_data:
                tier = loyalty.get('tier', 'bronze')
                tier_distribution[tier] = tier_distribution.get(tier, 0) + 1
            
            # Segment distribution
            segment_distribution = {}
            for segment in segments:
                seg_name = segment.get('segment_name', 'unknown')
                segment_distribution[seg_name] = segment_distribution.get(seg_name, 0) + 1
            
            return {
                "total_customers": total_customers,
                "recent_customers": recent_customers,
                "growth_rate": (recent_customers / total_customers * 100) if total_customers > 0 else 0,
                "intelligence_metrics": {
                    "total_clv": total_clv,
                    "average_clv": avg_clv,
                    "average_health_score": avg_health_score,
                    "churn_risk_distribution": {
                        "high_risk": high_churn_risk,
                        "medium_risk": medium_churn_risk,
                        "low_risk": low_churn_risk
                    },
                    "health_score_range": {
                        "min": min(health_scores) if health_scores else 0,
                        "max": max(health_scores) if health_scores else 0
                    }
                },
                "loyalty_metrics": {
                    "total_points": total_loyalty_points,
                    "average_points": avg_loyalty_points,
                    "tier_distribution": tier_distribution,
                    "active_loyalty_members": len(loyalty_data)
                },
                "segmentation": {
                    "segments": segments,
                    "segment_distribution": segment_distribution,
                    "total_segments": len(segments)
                },
                "raw_data": {
                    "customers": customers,
                    "intelligence": intelligence_data,
                    "loyalty": loyalty_data
                },
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
    async def get_customer_intelligence_data(barbershop_id: str, customer_id: Optional[str] = None) -> Dict[str, Any]:
        """Get detailed customer intelligence data for AI analysis"""
        try:
            # Base query for customer intelligence
            query = supabase.table('customer_intelligence').select('*').eq('barbershop_id', barbershop_id)
            
            if customer_id:
                query = query.eq('customer_id', customer_id)
                
            intelligence_response = query.execute()
            intelligence_data = intelligence_response.data or []
            
            # Get related customer data
            customer_query = supabase.table('customers').select('*').eq('barbershop_id', barbershop_id)
            if customer_id:
                customer_query = customer_query.eq('id', customer_id)
            customer_response = customer_query.execute()
            customers = customer_response.data or []
            
            # Get loyalty data
            loyalty_query = supabase.table('customer_loyalty').select('*').eq('barbershop_id', barbershop_id)
            if customer_id:
                loyalty_query = loyalty_query.eq('customer_id', customer_id)
            loyalty_response = loyalty_query.execute()
            loyalty_data = loyalty_response.data or []
            
            # Get feedback data
            feedback_query = supabase.table('customer_feedback').select('*').eq('barbershop_id', barbershop_id)
            if customer_id:
                feedback_query = feedback_query.eq('customer_id', customer_id)
            feedback_response = feedback_query.execute()
            feedback_data = feedback_response.data or []
            
            return {
                "intelligence": intelligence_data,
                "customers": customers,
                "loyalty": loyalty_data,
                "feedback": feedback_data,
                "has_data": len(intelligence_data) > 0
            }
            
        except Exception as e:
            print(f"Error getting customer intelligence data: {e}")
            return {"error": str(e), "has_data": False}
    
    @staticmethod
    async def get_customer_segments_for_ai(barbershop_id: str) -> Dict[str, Any]:
        """Get customer segments with AI-ready analytics"""
        try:
            segments_response = supabase.table('customer_segments').select('*').eq('barbershop_id', barbershop_id).execute()
            segments = segments_response.data or []
            
            # Get segment-specific intelligence data
            segment_analytics = {}
            for segment in segments:
                segment_id = segment.get('id')
                if segment_id:
                    # Get customers in this segment
                    segment_customers_response = supabase.table('customer_segment_memberships')\
                        .select('customer_id')\
                        .eq('segment_id', segment_id)\
                        .execute()
                    
                    customer_ids = [sc['customer_id'] for sc in segment_customers_response.data or []]
                    
                    if customer_ids:
                        # Get intelligence data for these customers
                        intelligence_response = supabase.table('customer_intelligence')\
                            .select('*')\
                            .in_('customer_id', customer_ids)\
                            .execute()
                        
                        intelligence_data = intelligence_response.data or []
                        
                        # Calculate segment metrics
                        avg_clv = sum(float(intel.get('clv', 0)) for intel in intelligence_data) / len(intelligence_data) if intelligence_data else 0
                        avg_health_score = sum(intel.get('health_score', 0) for intel in intelligence_data) / len(intelligence_data) if intelligence_data else 0
                        avg_churn_risk = sum(intel.get('churn_risk_score', 0) for intel in intelligence_data) / len(intelligence_data) if intelligence_data else 0
                        
                        segment_analytics[segment_id] = {
                            "customer_count": len(customer_ids),
                            "avg_clv": avg_clv,
                            "avg_health_score": avg_health_score,
                            "avg_churn_risk": avg_churn_risk,
                            "segment_info": segment
                        }
            
            return {
                "segments": segments,
                "segment_analytics": segment_analytics,
                "total_segments": len(segments),
                "has_data": len(segments) > 0
            }
            
        except Exception as e:
            print(f"Error getting customer segments: {e}")
            return {"error": str(e), "has_data": False}
    
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
            
            # Get customer intelligence data
            customer_intelligence = await AIDataService.get_customer_intelligence_data(barbershop_id)
            
            # Get segment analytics
            segment_analytics = await AIDataService.get_customer_segments_for_ai(barbershop_id)
            
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
                "customer_intelligence": customer_intelligence,
                "segment_analytics": segment_analytics,
                "data_quality": {
                    "sufficient_for_analysis": context['has_sufficient_data'],
                    "data_sources": {
                        "appointments": context['appointments'].get('data_available', False),
                        "customers": context['customers'].get('data_available', False),
                        "revenue": revenue_analysis.get('data_available', False),
                        "staff": context['staff'].get('data_available', False),
                        "intelligence": customer_intelligence.get('has_data', False),
                        "segments": segment_analytics.get('has_data', False)
                    }
                }
            }
            
            return training_data
            
        except Exception as e:
            print(f"Error getting AI training data: {e}")
            return {"error": str(e), "barbershop_id": barbershop_id}

# Singleton instance
ai_data_service = AIDataService()