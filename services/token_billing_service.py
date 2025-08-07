"""
Token-Based Billing Service - Usage-Based Pricing with Margin Optimization
Real-time AI token tracking, cost calculation, and subscription management
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from decimal import Decimal, ROUND_UP
import uuid
import sqlite3
import aiosqlite
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TokenUsage:
    """Track AI token consumption with cost calculation"""
    tenant_id: str
    model_provider: str  # openai, anthropic, google
    model_name: str      # gpt-4, claude-3, gemini-pro
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: Decimal
    marked_up_price: Decimal
    timestamp: datetime
    request_id: str
    feature_used: str    # analytics, forecasting, recommendations

@dataclass
class PricingTier:
    """Subscription tier with token allowances"""
    name: str
    monthly_base: Decimal
    included_tokens: int
    overage_rate: Decimal  # per 1000 tokens
    features: List[str]
    max_barbershops: int

# AI Model Pricing (actual costs from providers)
AI_MODEL_COSTS = {
    # OpenAI GPT-4 Pricing (per 1M tokens)
    "openai": {
        "gpt-4": {"input": 30.00, "output": 60.00},
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50}
    },
    # Anthropic Claude Pricing (per 1M tokens)
    "anthropic": {
        "claude-3-opus": {"input": 15.00, "output": 75.00},
        "claude-3-sonnet": {"input": 3.00, "output": 15.00},
        "claude-3-haiku": {"input": 0.25, "output": 1.25}
    },
    # Google Gemini Pricing (per 1M tokens)
    "google": {
        "gemini-pro": {"input": 0.50, "output": 1.50},
        "gemini-pro-vision": {"input": 0.50, "output": 1.50}
    }
}

# Pricing Strategy: Base markup covers infrastructure, support, and development
TOKEN_MARKUP_MULTIPLIER = 2.5  # Reduced from 3x to 2.5x for better value
# Platform costs already covered in base subscription pricing

# Subscription Tiers - Optimized Base + Lower Token Costs
PRICING_TIERS = {
    "starter": PricingTier(
        name="Starter",
        monthly_base=Decimal("19.99"),    # Higher base for predictable revenue
        included_tokens=15000,            # More tokens included
        overage_rate=Decimal("0.008"),    # $0.008 per 1000 tokens (lower cost)
        features=["basic_analytics", "forecasting", "email_support"],
        max_barbershops=1
    ),
    "professional": PricingTier(
        name="Professional", 
        monthly_base=Decimal("49.99"),    # Higher base, better value
        included_tokens=75000,            # More tokens included
        overage_rate=Decimal("0.006"),    # $0.006 per 1000 tokens (bulk discount)
        features=["advanced_analytics", "real_time_alerts", "priority_support", "custom_branding"],
        max_barbershops=5
    ),
    "enterprise": PricingTier(
        name="Enterprise",
        monthly_base=Decimal("99.99"),    # Higher base, premium value
        included_tokens=300000,           # Much more tokens included
        overage_rate=Decimal("0.004"),    # $0.004 per 1000 tokens (best rate)
        features=["full_ai_suite", "white_label", "dedicated_support", "api_access", "custom_integrations"],
        max_barbershops=999999  # Unlimited
    )
}

class TokenBillingService:
    """Advanced token-based billing with real-time tracking and margin optimization"""
    
    def __init__(self, db_path: str = "billing_system.db"):
        self.db_path = db_path
        self.usage_cache = {}  # Real-time usage cache
        
    async def initialize(self):
        """Initialize billing database schema"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript("""
                -- Token usage tracking
                CREATE TABLE IF NOT EXISTS token_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    request_id TEXT UNIQUE,
                    model_provider TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    input_tokens INTEGER DEFAULT 0,
                    output_tokens INTEGER DEFAULT 0,
                    total_tokens INTEGER DEFAULT 0,
                    actual_cost_usd DECIMAL(10,6) DEFAULT 0,
                    marked_up_price DECIMAL(10,6) DEFAULT 0,
                    feature_used TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Tenant subscriptions
                CREATE TABLE IF NOT EXISTS tenant_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT UNIQUE NOT NULL,
                    tier TEXT DEFAULT 'starter',
                    status TEXT DEFAULT 'trial',
                    trial_start DATETIME,
                    trial_end DATETIME,
                    billing_cycle_start DATETIME,
                    billing_cycle_end DATETIME,
                    tokens_included INTEGER DEFAULT 10000,
                    tokens_used INTEGER DEFAULT 0,
                    monthly_base DECIMAL(10,2) DEFAULT 9.99,
                    overage_charges DECIMAL(10,2) DEFAULT 0,
                    total_bill DECIMAL(10,2) DEFAULT 0,
                    payment_method_id TEXT,
                    stripe_subscription_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Usage analytics for margin optimization
                CREATE TABLE IF NOT EXISTS usage_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    total_tenants INTEGER DEFAULT 0,
                    total_tokens_consumed INTEGER DEFAULT 0,
                    total_actual_costs DECIMAL(10,2) DEFAULT 0,
                    total_revenue DECIMAL(10,2) DEFAULT 0,
                    gross_margin DECIMAL(5,4) DEFAULT 0,
                    avg_tokens_per_tenant INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Free trial tracking
                CREATE TABLE IF NOT EXISTS trial_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT UNIQUE NOT NULL,
                    trial_start DATETIME NOT NULL,
                    trial_end DATETIME NOT NULL,
                    tokens_used INTEGER DEFAULT 0,
                    conversion_date DATETIME,
                    converted_to_tier TEXT,
                    trial_status TEXT DEFAULT 'active',
                    reminder_emails_sent INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_token_usage_tenant ON token_usage(tenant_id, timestamp);
                CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON tenant_subscriptions(tenant_id);
                CREATE INDEX IF NOT EXISTS idx_trial_status ON trial_tracking(tenant_id, trial_status);
            """)
            await db.commit()
            
    async def calculate_token_cost(self, provider: str, model: str, input_tokens: int, output_tokens: int) -> Tuple[Decimal, Decimal]:
        """Calculate actual cost and marked-up price for token usage"""
        if provider not in AI_MODEL_COSTS or model not in AI_MODEL_COSTS[provider]:
            logger.warning(f"Unknown model {provider}/{model}, using default pricing")
            # Default fallback pricing
            input_cost_per_million = 5.00
            output_cost_per_million = 15.00
        else:
            pricing = AI_MODEL_COSTS[provider][model]
            input_cost_per_million = pricing["input"]
            output_cost_per_million = pricing["output"]
        
        # Calculate actual costs
        actual_input_cost = Decimal(str(input_tokens * input_cost_per_million / 1_000_000))
        actual_output_cost = Decimal(str(output_tokens * output_cost_per_million / 1_000_000))
        actual_total_cost = actual_input_cost + actual_output_cost
        
        # Apply markup (platform costs covered by base subscription)
        final_price = actual_total_cost * Decimal(str(TOKEN_MARKUP_MULTIPLIER))
        
        return actual_total_cost.quantize(Decimal('0.000001'), rounding=ROUND_UP), \
               final_price.quantize(Decimal('0.000001'), rounding=ROUND_UP)
    
    async def track_token_usage(self, tenant_id: str, provider: str, model: str, 
                              input_tokens: int, output_tokens: int, feature: str) -> TokenUsage:
        """Track token usage with real-time cost calculation"""
        request_id = str(uuid.uuid4())
        total_tokens = input_tokens + output_tokens
        
        # Calculate costs
        actual_cost, marked_up_price = await self.calculate_token_cost(
            provider, model, input_tokens, output_tokens
        )
        
        usage = TokenUsage(
            tenant_id=tenant_id,
            model_provider=provider,
            model_name=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            cost_usd=actual_cost,
            marked_up_price=marked_up_price,
            timestamp=datetime.now(),
            request_id=request_id,
            feature_used=feature
        )
        
        # Store in database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO token_usage 
                (tenant_id, request_id, model_provider, model_name, input_tokens, 
                 output_tokens, total_tokens, actual_cost_usd, marked_up_price, feature_used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (tenant_id, request_id, provider, model, input_tokens, output_tokens,
                  total_tokens, float(actual_cost), float(marked_up_price), feature))
            
            # Update tenant subscription usage
            await db.execute("""
                UPDATE tenant_subscriptions 
                SET tokens_used = tokens_used + ?, updated_at = CURRENT_TIMESTAMP
                WHERE tenant_id = ?
            """, (total_tokens, tenant_id))
            
            await db.commit()
        
        # Update real-time cache
        if tenant_id not in self.usage_cache:
            self.usage_cache[tenant_id] = {"tokens": 0, "cost": Decimal("0")}
        
        self.usage_cache[tenant_id]["tokens"] += total_tokens
        self.usage_cache[tenant_id]["cost"] += marked_up_price
        
        logger.info(f"Tracked {total_tokens} tokens for tenant {tenant_id}, cost: ${marked_up_price}")
        return usage
    
    async def start_free_trial(self, tenant_id: str, tier: str = "starter") -> Dict[str, Any]:
        """Start 14-day free trial for new tenant"""
        trial_start = datetime.now()
        trial_end = trial_start + timedelta(days=14)
        
        selected_tier = PRICING_TIERS[tier]
        
        async with aiosqlite.connect(self.db_path) as db:
            # Create subscription record
            await db.execute("""
                INSERT OR REPLACE INTO tenant_subscriptions
                (tenant_id, tier, status, trial_start, trial_end, tokens_included,
                 monthly_base, tokens_used, overage_charges, total_bill)
                VALUES (?, ?, 'trial', ?, ?, ?, ?, 0, 0, 0)
            """, (tenant_id, tier, trial_start, trial_end, selected_tier.included_tokens,
                  float(selected_tier.monthly_base)))
            
            # Create trial tracking record
            await db.execute("""
                INSERT OR REPLACE INTO trial_tracking
                (tenant_id, trial_start, trial_end, trial_status)
                VALUES (?, ?, ?, 'active')
            """, (tenant_id, trial_start, trial_end))
            
            await db.commit()
        
        return {
            "tenant_id": tenant_id,
            "tier": tier,
            "trial_start": trial_start.isoformat(),
            "trial_end": trial_end.isoformat(),
            "included_tokens": selected_tier.included_tokens,
            "features": selected_tier.features,
            "status": "trial_active"
        }
    
    async def check_usage_limits(self, tenant_id: str) -> Dict[str, Any]:
        """Check tenant usage against their plan limits"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT tier, status, tokens_included, tokens_used, trial_end
                FROM tenant_subscriptions 
                WHERE tenant_id = ?
            """, (tenant_id,))
            
            subscription = await cursor.fetchone()
            if not subscription:
                return {"error": "No subscription found", "limit_exceeded": True}
            
            tier, status, tokens_included, tokens_used, trial_end = subscription
            
            # Check trial expiration
            if status == "trial" and datetime.fromisoformat(trial_end) < datetime.now():
                return {
                    "status": "trial_expired",
                    "limit_exceeded": True,
                    "message": "Free trial has expired. Please upgrade to continue using AI features."
                }
            
            # Check token limits
            usage_percentage = (tokens_used / tokens_included) * 100 if tokens_included > 0 else 0
            limit_exceeded = tokens_used >= tokens_included
            
            selected_tier = PRICING_TIERS[tier]
            
            return {
                "tenant_id": tenant_id,
                "tier": tier,
                "status": status,
                "tokens_included": tokens_included,
                "tokens_used": tokens_used,
                "tokens_remaining": max(0, tokens_included - tokens_used),
                "usage_percentage": round(usage_percentage, 1),
                "limit_exceeded": limit_exceeded,
                "overage_rate": float(selected_tier.overage_rate),
                "trial_end": trial_end if status == "trial" else None
            }
    
    async def calculate_monthly_bill(self, tenant_id: str) -> Dict[str, Any]:
        """Calculate monthly bill including base fee and token overages"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT tier, tokens_included, tokens_used, monthly_base, status
                FROM tenant_subscriptions 
                WHERE tenant_id = ?
            """, (tenant_id,))
            
            subscription = await cursor.fetchone()
            if not subscription:
                return {"error": "No subscription found"}
            
            tier, tokens_included, tokens_used, monthly_base, status = subscription
            selected_tier = PRICING_TIERS[tier]
            
            # Base monthly fee (free during trial)
            base_fee = Decimal("0") if status == "trial" else Decimal(str(monthly_base))
            
            # Calculate overages
            overage_tokens = max(0, tokens_used - tokens_included)
            overage_charge = (overage_tokens / 1000) * selected_tier.overage_rate
            
            # Total bill
            total_bill = base_fee + overage_charge
            
            # Update subscription record
            await db.execute("""
                UPDATE tenant_subscriptions 
                SET overage_charges = ?, total_bill = ?, updated_at = CURRENT_TIMESTAMP
                WHERE tenant_id = ?
            """, (float(overage_charge), float(total_bill), tenant_id))
            
            await db.commit()
            
            return {
                "tenant_id": tenant_id,
                "tier": tier,
                "status": status,
                "base_fee": float(base_fee),
                "tokens_included": tokens_included,
                "tokens_used": tokens_used,
                "overage_tokens": overage_tokens,
                "overage_rate_per_1k": float(selected_tier.overage_rate),
                "overage_charge": float(overage_charge),
                "total_bill": float(total_bill),
                "billing_period": "monthly"
            }
    
    async def get_usage_analytics(self, tenant_id: str, days: int = 30) -> Dict[str, Any]:
        """Get detailed usage analytics for tenant"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        async with aiosqlite.connect(self.db_path) as db:
            # Daily usage breakdown
            cursor = await db.execute("""
                SELECT DATE(timestamp) as date, 
                       SUM(total_tokens) as tokens,
                       SUM(marked_up_price) as cost,
                       COUNT(*) as requests,
                       model_provider,
                       feature_used
                FROM token_usage 
                WHERE tenant_id = ? AND timestamp >= ?
                GROUP BY DATE(timestamp), model_provider, feature_used
                ORDER BY date DESC
            """, (tenant_id, start_date))
            
            daily_usage = await cursor.fetchall()
            
            # Summary statistics
            cursor = await db.execute("""
                SELECT SUM(total_tokens) as total_tokens,
                       SUM(marked_up_price) as total_cost,
                       COUNT(*) as total_requests,
                       AVG(total_tokens) as avg_tokens_per_request
                FROM token_usage 
                WHERE tenant_id = ? AND timestamp >= ?
            """, (tenant_id, start_date))
            
            summary = await cursor.fetchone()
            
            return {
                "tenant_id": tenant_id,
                "period_days": days,
                "summary": {
                    "total_tokens": summary[0] or 0,
                    "total_cost": float(summary[1]) if summary[1] else 0.0,
                    "total_requests": summary[2] or 0,
                    "avg_tokens_per_request": float(summary[3]) if summary[3] else 0.0
                },
                "daily_breakdown": [
                    {
                        "date": row[0],
                        "tokens": row[1],
                        "cost": float(row[2]),
                        "requests": row[3],
                        "provider": row[4],
                        "feature": row[5]
                    } for row in daily_usage
                ]
            }
    
    async def upgrade_subscription(self, tenant_id: str, new_tier: str, stripe_subscription_id: str) -> Dict[str, Any]:
        """Upgrade tenant from trial to paid subscription"""
        if new_tier not in PRICING_TIERS:
            return {"error": f"Invalid tier: {new_tier}"}
        
        selected_tier = PRICING_TIERS[new_tier]
        billing_start = datetime.now()
        billing_end = billing_start + timedelta(days=30)  # Monthly billing
        
        async with aiosqlite.connect(self.db_path) as db:
            # Update subscription
            await db.execute("""
                UPDATE tenant_subscriptions 
                SET tier = ?, status = 'active', 
                    billing_cycle_start = ?, billing_cycle_end = ?,
                    tokens_included = ?, monthly_base = ?,
                    stripe_subscription_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE tenant_id = ?
            """, (new_tier, billing_start, billing_end, selected_tier.included_tokens,
                  float(selected_tier.monthly_base), stripe_subscription_id, tenant_id))
            
            # Update trial tracking
            await db.execute("""
                UPDATE trial_tracking 
                SET conversion_date = CURRENT_TIMESTAMP, 
                    converted_to_tier = ?, trial_status = 'converted'
                WHERE tenant_id = ?
            """, (new_tier, tenant_id))
            
            await db.commit()
        
        return {
            "tenant_id": tenant_id,
            "new_tier": new_tier,
            "status": "active",
            "monthly_base": float(selected_tier.monthly_base),
            "included_tokens": selected_tier.included_tokens,
            "features": selected_tier.features,
            "billing_start": billing_start.isoformat()
        }

# Usage tracking decorator for AI service calls
def track_ai_usage(provider: str, model: str, feature: str):
    """Decorator to automatically track AI token usage"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract tenant_id from args or kwargs
            tenant_id = kwargs.get('tenant_id') or (args[0] if args else None)
            
            if not tenant_id:
                logger.warning("No tenant_id provided for AI usage tracking")
                return await func(*args, **kwargs)
            
            # Call the AI function
            result = await func(*args, **kwargs)
            
            # Extract token usage from result (assuming standardized format)
            if isinstance(result, dict) and 'usage' in result:
                usage = result['usage']
                input_tokens = usage.get('prompt_tokens', 0)
                output_tokens = usage.get('completion_tokens', 0)
                
                # Track usage
                billing_service = TokenBillingService()
                await billing_service.initialize()
                await billing_service.track_token_usage(
                    tenant_id, provider, model, input_tokens, output_tokens, feature
                )
            
            return result
        return wrapper
    return decorator

# Example usage:

async def demo_billing_system():
    """Demonstrate the token billing system"""
    billing = TokenBillingService()
    await billing.initialize()
    
    # Start free trial
    trial = await billing.start_free_trial("tenant_123", "professional")
    print("Free Trial Started:", trial)
    
    # Simulate AI usage
    usage = await billing.track_token_usage(
        tenant_id="tenant_123",
        provider="openai", 
        model="gpt-4-turbo",
        input_tokens=1500,
        output_tokens=800,
        feature="analytics"
    )
    print("Token Usage Tracked:", usage)
    
    # Check limits
    limits = await billing.check_usage_limits("tenant_123")
    print("Usage Limits:", limits)
    
    # Calculate bill
    bill = await billing.calculate_monthly_bill("tenant_123")
    print("Monthly Bill:", bill)
    
    # Get analytics
    analytics = await billing.get_usage_analytics("tenant_123")
    print("Usage Analytics:", analytics)

if __name__ == "__main__":
    asyncio.run(demo_billing_system())