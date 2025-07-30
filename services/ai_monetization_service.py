#!/usr/bin/env python3
"""
AI Monetization Service
Tracks AI usage, manages billing, and optimizes costs for profitable AI features
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class AIUsageRecord:
    """Track AI API usage for billing"""
    usage_id: str
    customer_id: str
    barbershop_id: str
    ai_service_type: str  # 'recommendation', 'behavior_analysis', 'insight_generation'
    model_used: str  # 'gpt-4', 'claude-3-sonnet', 'rule_based_fallback'
    tokens_used: int
    token_cost: float  # Actual API cost
    customer_charge: float  # What we charge customer
    profit_margin: float
    business_value_generated: Optional[float]  # Revenue impact if trackable
    timestamp: str
    billing_status: str  # 'pending', 'billed', 'paid'

@dataclass
class CustomerAIQuota:
    """Customer AI usage quotas and limits"""
    customer_id: str
    plan_type: str  # 'starter', 'smart', 'genius', 'enterprise'
    monthly_ai_credits: int
    used_credits: int
    overage_rate: float  # Cost per credit over limit
    auto_upgrade_enabled: bool
    current_period_start: str
    current_period_end: str

@dataclass
class AIROIMetrics:
    """Track AI return on investment"""
    customer_id: str
    period_start: str
    period_end: str
    ai_spend: float
    bookings_influenced: int
    revenue_attributed: float
    roi_percentage: float
    customer_satisfaction_delta: float
    retention_improvement: float

class AIMonetizationService:
    """Service for AI usage tracking, billing, and ROI optimization"""
    
    def __init__(self, db_path: str = "ai_monetization.db"):
        self.db_path = db_path
        self._init_database()
        
        # Pricing configuration
        self.pricing_config = {
            'plans': {
                'starter': {'monthly_fee': 29, 'ai_credits': 0, 'overage_rate': 0.20},
                'smart': {'monthly_fee': 79, 'ai_credits': 50, 'overage_rate': 0.15},
                'genius': {'monthly_fee': 199, 'ai_credits': 200, 'overage_rate': 0.10},
                'enterprise': {'monthly_fee': 'custom', 'ai_credits': 'unlimited', 'overage_rate': 0.08}
            },
            'ai_service_rates': {
                'recommendation': 0.135,  # 10% cheaper than $0.15
                'behavior_analysis': 0.225,  # 10% cheaper than $0.25  
                'insight_generation': 0.18,  # 10% cheaper than $0.20
                'predictive_analytics': 0.27  # 10% cheaper than $0.30
            },
            'token_costs': {
                'gpt-4': 0.00003,  # $0.03 per 1K tokens
                'claude-3-sonnet': 0.000015,  # $0.015 per 1K tokens
                'rule_based_fallback': 0.0  # Free
            }
        }
    
    def _init_database(self):
        """Initialize monetization tracking database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # AI usage tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_usage_records (
                usage_id TEXT PRIMARY KEY,
                customer_id TEXT,
                barbershop_id TEXT,
                ai_service_type TEXT,
                model_used TEXT,
                tokens_used INTEGER,
                token_cost REAL,
                customer_charge REAL,
                profit_margin REAL,
                business_value_generated REAL,
                timestamp TEXT,
                billing_status TEXT DEFAULT 'pending'
            )
        ''')
        
        # Customer quotas and plans
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_ai_quotas (
                customer_id TEXT PRIMARY KEY,
                plan_type TEXT,
                monthly_ai_credits INTEGER,
                used_credits INTEGER DEFAULT 0,
                overage_rate REAL,
                auto_upgrade_enabled BOOLEAN DEFAULT FALSE,
                current_period_start TEXT,
                current_period_end TEXT
            )
        ''')
        
        # ROI tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_roi_metrics (
                metric_id TEXT PRIMARY KEY,
                customer_id TEXT,
                period_start TEXT,
                period_end TEXT,
                ai_spend REAL,
                bookings_influenced INTEGER,
                revenue_attributed REAL,
                roi_percentage REAL,
                customer_satisfaction_delta REAL,
                retention_improvement REAL
            )
        ''')
        
        # Billing and invoicing
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_billing_cycles (
                billing_id TEXT PRIMARY KEY,
                customer_id TEXT,
                period_start TEXT,
                period_end TEXT,
                base_plan_fee REAL,
                ai_usage_charges REAL,
                total_amount REAL,
                invoice_sent_at TEXT,
                paid_at TEXT,
                payment_status TEXT DEFAULT 'pending'
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def track_ai_usage(self, customer_id: str, barbershop_id: str, ai_service_type: str, 
                      model_used: str, tokens_used: int = 0, business_value: float = None) -> AIUsageRecord:
        """Track AI API usage for billing purposes"""
        
        # Calculate costs
        token_cost = tokens_used * self.pricing_config['token_costs'].get(model_used, 0)
        customer_charge = self.pricing_config['ai_service_rates'].get(ai_service_type, 0.15)
        profit_margin = customer_charge - token_cost
        
        usage_record = AIUsageRecord(
            usage_id=f"ai_usage_{customer_id}_{int(datetime.now().timestamp())}",
            customer_id=customer_id,
            barbershop_id=barbershop_id,
            ai_service_type=ai_service_type,
            model_used=model_used,
            tokens_used=tokens_used,
            token_cost=token_cost,
            customer_charge=customer_charge,
            profit_margin=profit_margin,
            business_value_generated=business_value,
            timestamp=datetime.now().isoformat(),
            billing_status='pending'
        )
        
        # Store in database
        self._store_usage_record(usage_record)
        
        # Update customer quota usage
        self._update_customer_quota_usage(customer_id, 1)
        
        return usage_record
    
    def check_ai_quota(self, customer_id: str) -> Dict[str, Any]:
        """Check if customer can use AI services (quota/billing check)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM customer_ai_quotas WHERE customer_id = ?
            ''', (customer_id,))
            
            quota_row = cursor.fetchone()
            conn.close()
            
            if not quota_row:
                # New customer - assign starter plan
                self._initialize_customer_quota(customer_id, 'starter')
                return {'can_use_ai': False, 'reason': 'starter_plan', 'upgrade_required': True}
            
            plan_type, monthly_credits, used_credits = quota_row[1], quota_row[2], quota_row[3]
            
            # Check quota limits
            if plan_type == 'starter':
                return {'can_use_ai': False, 'reason': 'starter_plan', 'upgrade_required': True}
            elif plan_type == 'enterprise':
                return {'can_use_ai': True, 'reason': 'unlimited', 'credits_remaining': 'unlimited'}
            elif used_credits >= monthly_credits:
                # Check if auto-upgrade is enabled
                auto_upgrade = quota_row[5]
                if auto_upgrade:
                    return {'can_use_ai': True, 'reason': 'overage_billing', 'overage_rate': quota_row[4]}
                else:
                    return {'can_use_ai': False, 'reason': 'quota_exceeded', 'upgrade_required': True}
            else:
                return {'can_use_ai': True, 'reason': 'within_quota', 'credits_remaining': monthly_credits - used_credits}
                
        except Exception as e:
            logger.error(f"Error checking AI quota: {e}")
            return {'can_use_ai': False, 'reason': 'error', 'upgrade_required': True}
    
    def calculate_customer_roi(self, customer_id: str, period_days: int = 30) -> AIROIMetrics:
        """Calculate AI ROI metrics for customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            period_start = (datetime.now() - timedelta(days=period_days)).isoformat()
            period_end = datetime.now().isoformat()
            
            # Calculate AI spend
            cursor.execute('''
                SELECT SUM(customer_charge) FROM ai_usage_records 
                WHERE customer_id = ? AND timestamp BETWEEN ? AND ?
            ''', (customer_id, period_start, period_end))
            
            ai_spend = cursor.fetchone()[0] or 0.0
            
            # Estimate business impact (simplified - in production, integrate with booking data)
            bookings_influenced = int(ai_spend / 0.20 * 2)  # Rough estimate: each AI insight influences 2 bookings
            revenue_attributed = bookings_influenced * 35  # Average booking value
            roi_percentage = (revenue_attributed - ai_spend) / max(ai_spend, 1) * 100
            
            roi_metrics = AIROIMetrics(
                customer_id=customer_id,
                period_start=period_start,
                period_end=period_end,
                ai_spend=ai_spend,
                bookings_influenced=bookings_influenced,
                revenue_attributed=revenue_attributed,
                roi_percentage=roi_percentage,
                customer_satisfaction_delta=0.15,  # Placeholder - integrate with surveys
                retention_improvement=0.25  # Placeholder - integrate with churn analysis
            )
            
            conn.close()
            return roi_metrics
            
        except Exception as e:
            logger.error(f"Error calculating ROI: {e}")
            return None
    
    def generate_billing_summary(self, customer_id: str, period_days: int = 30) -> Dict[str, Any]:
        """Generate billing summary for customer"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            period_start = (datetime.now() - timedelta(days=period_days)).isoformat()
            period_end = datetime.now().isoformat()
            
            # Get usage breakdown
            cursor.execute('''
                SELECT ai_service_type, COUNT(*), SUM(customer_charge), AVG(profit_margin)
                FROM ai_usage_records 
                WHERE customer_id = ? AND timestamp BETWEEN ? AND ?
                GROUP BY ai_service_type
            ''', (customer_id, period_start, period_end))
            
            usage_breakdown = []
            total_charges = 0.0
            
            for row in cursor.fetchall():
                service_type, count, charges, avg_margin = row
                total_charges += charges
                usage_breakdown.append({
                    'service_type': service_type,
                    'usage_count': count,
                    'total_charges': charges,
                    'average_profit_margin': avg_margin
                })
            
            # Get customer plan
            cursor.execute('''
                SELECT plan_type, monthly_ai_credits, used_credits FROM customer_ai_quotas 
                WHERE customer_id = ?
            ''', (customer_id,))
            
            quota_info = cursor.fetchone()
            plan_type = quota_info[0] if quota_info else 'starter'
            base_fee = self.pricing_config['plans'][plan_type]['monthly_fee']
            
            conn.close()
            
            return {
                'customer_id': customer_id,
                'billing_period': f"{period_start[:10]} to {period_end[:10]}",
                'plan_type': plan_type,
                'base_monthly_fee': base_fee,
                'ai_usage_charges': total_charges,
                'total_amount': base_fee + total_charges if isinstance(base_fee, (int, float)) else total_charges,
                'usage_breakdown': usage_breakdown,
                'roi_metrics': self.calculate_customer_roi(customer_id, period_days)
            }
            
        except Exception as e:
            logger.error(f"Error generating billing summary: {e}")
            return {'error': str(e)}
    
    def optimize_ai_usage(self, customer_id: str, request_context: Dict) -> Dict[str, Any]:
        """Intelligent decision on whether to use AI or fallback based on cost/value"""
        
        # Check quota first
        quota_check = self.check_ai_quota(customer_id)
        if not quota_check['can_use_ai']:
            return {
                'use_ai': False,
                'reason': quota_check['reason'],
                'fallback_to': 'rule_based',
                'cost_savings': self.pricing_config['ai_service_rates'].get(request_context.get('service_type'), 0.15)
            }
        
        # Business logic for AI optimization
        booking_history_length = len(request_context.get('booking_history', []))
        days_since_last_ai = request_context.get('days_since_last_ai_analysis', 0)
        customer_value_tier = request_context.get('customer_value_tier', 'standard')  # 'high', 'standard', 'low'
        
        # High-value customers always get AI
        if customer_value_tier == 'high':
            return {'use_ai': True, 'reason': 'high_value_customer', 'model_preference': 'claude-3-sonnet'}
        
        # New customers get AI treatment
        if booking_history_length < 3:
            return {'use_ai': True, 'reason': 'new_customer_experience', 'model_preference': 'gpt-4'}
        
        # Only refresh AI insights periodically for cost efficiency
        if days_since_last_ai < 7 and booking_history_length > 5:
            return {'use_ai': False, 'reason': 'recent_ai_analysis_available', 'fallback_to': 'cached_insights'}
        
        # Default: use AI but optimize model choice
        return {
            'use_ai': True, 
            'reason': 'standard_optimization',
            'model_preference': 'claude-3-sonnet' if booking_history_length > 10 else 'gpt-4'
        }
    
    def _store_usage_record(self, record: AIUsageRecord):
        """Store AI usage record in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO ai_usage_records (
                    usage_id, customer_id, barbershop_id, ai_service_type, model_used,
                    tokens_used, token_cost, customer_charge, profit_margin,
                    business_value_generated, timestamp, billing_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record.usage_id, record.customer_id, record.barbershop_id,
                record.ai_service_type, record.model_used, record.tokens_used,
                record.token_cost, record.customer_charge, record.profit_margin,
                record.business_value_generated, record.timestamp, record.billing_status
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing usage record: {e}")
    
    def _initialize_customer_quota(self, customer_id: str, plan_type: str = 'starter'):
        """Initialize customer quota settings"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            plan_config = self.pricing_config['plans'][plan_type]
            
            cursor.execute('''
                INSERT OR REPLACE INTO customer_ai_quotas (
                    customer_id, plan_type, monthly_ai_credits, used_credits,
                    overage_rate, auto_upgrade_enabled, current_period_start, current_period_end
                ) VALUES (?, ?, ?, 0, ?, FALSE, ?, ?)
            ''', (
                customer_id, plan_type, plan_config['ai_credits'], plan_config['overage_rate'],
                datetime.now().isoformat(),
                (datetime.now() + timedelta(days=30)).isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error initializing customer quota: {e}")
    
    def _update_customer_quota_usage(self, customer_id: str, credits_used: int):
        """Update customer's AI credit usage"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE customer_ai_quotas 
                SET used_credits = used_credits + ?
                WHERE customer_id = ?
            ''', (credits_used, customer_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error updating quota usage: {e}")

# Usage example
if __name__ == "__main__":
    monetization = AIMonetizationService()
    
    # Track AI usage
    usage = monetization.track_ai_usage(
        customer_id="test_customer",
        barbershop_id="test_shop",
        ai_service_type="recommendation",
        model_used="claude-3-sonnet",
        tokens_used=800,
        business_value=50.0
    )
    
    print(f"AI Usage Tracked: ${usage.customer_charge:.2f} charge, ${usage.profit_margin:.2f} profit")
    
    # Check quota
    quota_check = monetization.check_ai_quota("test_customer")
    print(f"Quota Check: {quota_check}")
    
    # Generate billing summary
    billing = monetization.generate_billing_summary("test_customer")
    print(f"Billing Summary: {json.dumps(billing, indent=2, default=str)}")
    
    # Calculate ROI
    roi = monetization.calculate_customer_roi("test_customer")
    if roi:
        print(f"Customer ROI: {roi.roi_percentage:.1f}% ({roi.revenue_attributed:.2f} revenue from ${roi.ai_spend:.2f} AI spend)")