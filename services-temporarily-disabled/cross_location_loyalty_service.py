"""
Cross-Location Loyalty Service
Manages unified customer loyalty programs across franchise locations
Handles point tracking, tier management, rewards, and cross-location benefits
"""

import os
import sqlite3
import json
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import decimal
import logging
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# ENUMS AND DATA MODELS
# ==========================================

class LoyaltyTier(Enum):
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"
    DIAMOND = "DIAMOND"

class RewardType(Enum):
    PERCENTAGE_DISCOUNT = "PERCENTAGE_DISCOUNT"
    FIXED_AMOUNT_DISCOUNT = "FIXED_AMOUNT_DISCOUNT"
    FREE_SERVICE = "FREE_SERVICE"
    PRIORITY_BOOKING = "PRIORITY_BOOKING"
    EXCLUSIVE_ACCESS = "EXCLUSIVE_ACCESS"
    GIFT_CARD = "GIFT_CARD"

class TransactionType(Enum):
    EARN = "EARN"
    REDEEM = "REDEEM"
    EXPIRE = "EXPIRE"
    BONUS = "BONUS"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"

@dataclass
class LoyaltyTransaction:
    """Loyalty points transaction record"""
    id: str
    customer_id: str
    franchise_id: str
    location_id: str
    transaction_type: TransactionType
    points_amount: int
    appointment_id: Optional[str] = None
    reward_id: Optional[str] = None
    description: str = ""
    reference_data: Dict[str, Any] = None
    processed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    def __post_init__(self):
        if self.reference_data is None:
            self.reference_data = {}
        if self.processed_at is None:
            self.processed_at = datetime.utcnow()

@dataclass
class LoyaltyReward:
    """Loyalty reward definition"""
    id: str
    franchise_id: str
    name: str
    description: str
    reward_type: RewardType
    points_cost: int
    tier_requirement: Optional[LoyaltyTier] = None
    discount_value: Optional[decimal.Decimal] = None
    free_service_id: Optional[str] = None
    valid_locations: List[str] = None  # If None, valid at all locations
    is_active: bool = True
    expires_at: Optional[datetime] = None
    usage_limit_per_customer: Optional[int] = None
    total_usage_limit: Optional[int] = None
    current_usage_count: int = 0
    terms_conditions: str = ""
    created_at: Optional[datetime] = None

    def __post_init__(self):
        if self.valid_locations is None:
            self.valid_locations = []
        if self.created_at is None:
            self.created_at = datetime.utcnow()

@dataclass
class CustomerRedemption:
    """Customer reward redemption record"""
    id: str
    customer_id: str
    reward_id: str
    franchise_id: str
    location_id: str
    appointment_id: Optional[str] = None
    points_used: int = 0
    discount_amount: Optional[decimal.Decimal] = None
    status: str = "ACTIVE"  # ACTIVE, USED, EXPIRED, CANCELLED
    redeemed_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    def __post_init__(self):
        if self.redeemed_at is None:
            self.redeemed_at = datetime.utcnow()

@dataclass
class LoyaltyOperationResult:
    """Result of loyalty operation"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# ==========================================
# LOYALTY TIER CONFIGURATION
# ==========================================

class LoyaltyTierConfig:
    """Configuration for loyalty tiers and benefits"""
    
    TIER_THRESHOLDS = {
        LoyaltyTier.BRONZE: {"min_points": 0, "min_spend": 0, "min_visits": 0},
        LoyaltyTier.SILVER: {"min_points": 500, "min_spend": 500, "min_visits": 10},
        LoyaltyTier.GOLD: {"min_points": 2000, "min_spend": 2000, "min_visits": 25},
        LoyaltyTier.PLATINUM: {"min_points": 5000, "min_spend": 5000, "min_visits": 50},
        LoyaltyTier.DIAMOND: {"min_points": 10000, "min_spend": 10000, "min_visits": 100},
    }
    
    TIER_BENEFITS = {
        LoyaltyTier.BRONZE: {
            "points_multiplier": 1.0,
            "priority_booking_days": 0,
            "exclusive_rewards": False,
            "birthday_bonus_points": 50,
            "referral_bonus_points": 100
        },
        LoyaltyTier.SILVER: {
            "points_multiplier": 1.25,
            "priority_booking_days": 1,
            "exclusive_rewards": False,
            "birthday_bonus_points": 100,
            "referral_bonus_points": 150
        },
        LoyaltyTier.GOLD: {
            "points_multiplier": 1.5,
            "priority_booking_days": 2,
            "exclusive_rewards": True,
            "birthday_bonus_points": 200,
            "referral_bonus_points": 250
        },
        LoyaltyTier.PLATINUM: {
            "points_multiplier": 2.0,
            "priority_booking_days": 3,
            "exclusive_rewards": True,
            "birthday_bonus_points": 500,
            "referral_bonus_points": 500
        },
        LoyaltyTier.DIAMOND: {
            "points_multiplier": 2.5,
            "priority_booking_days": 7,
            "exclusive_rewards": True,
            "birthday_bonus_points": 1000,
            "referral_bonus_points": 1000
        }
    }
    
    # Points earning rates
    POINTS_PER_DOLLAR_SPENT = 10  # 10 points per $1
    POINTS_PER_VISIT = 50  # Bonus points for each visit
    POINTS_EXPIRY_MONTHS = 24  # Points expire after 24 months
    
    @classmethod
    def calculate_tier(cls, points: int, lifetime_spend: decimal.Decimal, total_visits: int) -> LoyaltyTier:
        """Calculate customer loyalty tier based on metrics"""
        for tier in reversed(list(LoyaltyTier)):  # Check from highest to lowest
            thresholds = cls.TIER_THRESHOLDS[tier]
            if (points >= thresholds["min_points"] and 
                float(lifetime_spend) >= thresholds["min_spend"] and 
                total_visits >= thresholds["min_visits"]):
                return tier
        return LoyaltyTier.BRONZE
    
    @classmethod
    def get_tier_benefits(cls, tier: LoyaltyTier) -> Dict[str, Any]:
        """Get benefits for a loyalty tier"""
        return cls.TIER_BENEFITS.get(tier, cls.TIER_BENEFITS[LoyaltyTier.BRONZE])

# ==========================================
# CROSS-LOCATION LOYALTY SERVICE
# ==========================================

class CrossLocationLoyaltyService:
    """
    Service for managing cross-location loyalty programs
    """
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self._init_database()
        
    def _init_database(self):
        """Initialize loyalty system tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Loyalty transactions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS loyalty_transactions (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                franchise_id TEXT NOT NULL,
                location_id TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                points_amount INTEGER NOT NULL,
                appointment_id TEXT,
                reward_id TEXT,
                description TEXT DEFAULT '',
                reference_data TEXT, -- JSON
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES franchise_customers(id) ON DELETE CASCADE
            )
        ''')
        
        # Loyalty rewards table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS loyalty_rewards (
                id TEXT PRIMARY KEY,
                franchise_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                reward_type TEXT NOT NULL,
                points_cost INTEGER NOT NULL,
                tier_requirement TEXT,
                discount_value DECIMAL(8,2),
                free_service_id TEXT,
                valid_locations TEXT, -- JSON array
                is_active BOOLEAN DEFAULT 1,
                expires_at TIMESTAMP,
                usage_limit_per_customer INTEGER,
                total_usage_limit INTEGER,
                current_usage_count INTEGER DEFAULT 0,
                terms_conditions TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Customer redemptions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_redemptions (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                reward_id TEXT NOT NULL,
                franchise_id TEXT NOT NULL,
                location_id TEXT NOT NULL,
                appointment_id TEXT,
                points_used INTEGER NOT NULL,
                discount_amount DECIMAL(8,2),
                status TEXT DEFAULT 'ACTIVE',
                redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES franchise_customers(id) ON DELETE CASCADE,
                FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE CASCADE
            )
        ''')
        
        # Customer loyalty summary table (for performance)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_loyalty_summary (
                customer_id TEXT PRIMARY KEY,
                franchise_id TEXT NOT NULL,
                current_points INTEGER DEFAULT 0,
                lifetime_points_earned INTEGER DEFAULT 0,
                lifetime_points_redeemed INTEGER DEFAULT 0,
                current_tier TEXT DEFAULT 'BRONZE',
                tier_progress INTEGER DEFAULT 0, -- Points towards next tier
                last_activity_date DATE,
                tier_anniversary_date DATE,
                points_expire_next_30_days INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES franchise_customers(id) ON DELETE CASCADE
            )
        ''')
        
        # Loyalty program campaigns table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS loyalty_campaigns (
                id TEXT PRIMARY KEY,
                franchise_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                campaign_type TEXT NOT NULL, -- 'BONUS_POINTS', 'DOUBLE_POINTS', 'SPECIAL_REWARD'
                
                -- Campaign rules
                bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,
                bonus_points INTEGER DEFAULT 0,
                minimum_spend DECIMAL(8,2),
                valid_services TEXT, -- JSON array
                valid_locations TEXT, -- JSON array
                eligible_tiers TEXT, -- JSON array
                
                -- Campaign period
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                
                -- Usage tracking
                max_uses_per_customer INTEGER,
                total_max_uses INTEGER,
                current_uses INTEGER DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_franchise ON loyalty_transactions(franchise_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_location ON loyalty_transactions(location_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON loyalty_transactions(transaction_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_processed ON loyalty_transactions(processed_at)')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_franchise ON loyalty_rewards(franchise_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_active ON loyalty_rewards(is_active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_tier ON loyalty_rewards(tier_requirement)')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_customer_redemptions_customer ON customer_redemptions(customer_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_customer_redemptions_reward ON customer_redemptions(reward_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_customer_redemptions_status ON customer_redemptions(status)')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_customer_loyalty_summary_franchise ON customer_loyalty_summary(franchise_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_customer_loyalty_summary_tier ON customer_loyalty_summary(current_tier)')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_franchise ON loyalty_campaigns(franchise_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_dates ON loyalty_campaigns(start_date, end_date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_active ON loyalty_campaigns(is_active)')
        
        conn.commit()
        conn.close()
        logger.info("Cross-location loyalty system database initialized")

    @contextmanager
    def get_db_connection(self):
        """Get database connection with context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    # ==========================================
    # POINTS MANAGEMENT
    # ==========================================

    def award_points(
        self,
        customer_id: str,
        franchise_id: str,
        location_id: str,
        points_amount: int,
        transaction_type: TransactionType = TransactionType.EARN,
        description: str = "",
        appointment_id: Optional[str] = None,
        reference_data: Optional[Dict[str, Any]] = None
    ) -> LoyaltyOperationResult:
        """Award loyalty points to a customer"""
        try:
            transaction_id = str(uuid.uuid4())
            expires_at = datetime.utcnow() + timedelta(days=30 * LoyaltyTierConfig.POINTS_EXPIRY_MONTHS)
            
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Record the transaction
                cursor.execute('''
                    INSERT INTO loyalty_transactions (
                        id, customer_id, franchise_id, location_id, transaction_type,
                        points_amount, appointment_id, description, reference_data, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    transaction_id, customer_id, franchise_id, location_id, transaction_type.value,
                    points_amount, appointment_id, description, 
                    json.dumps(reference_data or {}), expires_at
                ))
                
                # Update customer loyalty summary
                self._update_customer_loyalty_summary(cursor, customer_id, franchise_id)
                
                conn.commit()
                
            logger.info(f"Awarded {points_amount} points to customer {customer_id}")
            
            # Check for tier upgrade
            tier_check_result = self.check_tier_upgrade(customer_id, franchise_id)
            
            return LoyaltyOperationResult(
                success=True,
                data={
                    "transaction_id": transaction_id,
                    "points_awarded": points_amount,
                    "tier_upgrade": tier_check_result.data if tier_check_result.success else None
                }
            )
            
        except Exception as e:
            error_msg = f"Failed to award points: {str(e)}"
            logger.error(error_msg)
            return LoyaltyOperationResult(
                success=False,
                error=error_msg,
                error_code="AWARD_POINTS_ERROR"
            )

    def redeem_points(
        self,
        customer_id: str,
        reward_id: str,
        franchise_id: str,
        location_id: str,
        appointment_id: Optional[str] = None
    ) -> LoyaltyOperationResult:
        """Redeem points for a reward"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get reward details
                cursor.execute('SELECT * FROM loyalty_rewards WHERE id = ? AND is_active = 1', (reward_id,))
                reward_row = cursor.fetchone()
                
                if not reward_row:
                    return LoyaltyOperationResult(
                        success=False,
                        error="Reward not found or inactive",
                        error_code="REWARD_NOT_FOUND"
                    )
                
                reward = self._row_to_reward_dict(reward_row)
                
                # Check if reward is valid at this location
                if reward['valid_locations'] and location_id not in reward['valid_locations']:
                    return LoyaltyOperationResult(
                        success=False,
                        error="Reward not valid at this location",
                        error_code="LOCATION_NOT_VALID"
                    )
                
                # Get customer loyalty summary
                customer_summary = self._get_customer_loyalty_summary(cursor, customer_id)
                
                if not customer_summary:
                    return LoyaltyOperationResult(
                        success=False,
                        error="Customer loyalty profile not found",
                        error_code="CUSTOMER_NOT_FOUND"
                    )
                
                # Check if customer has enough points
                if customer_summary['current_points'] < reward['points_cost']:
                    return LoyaltyOperationResult(
                        success=False,
                        error=f"Insufficient points. Required: {reward['points_cost']}, Available: {customer_summary['current_points']}",
                        error_code="INSUFFICIENT_POINTS"
                    )
                
                # Check tier requirement
                if reward['tier_requirement']:
                    current_tier = LoyaltyTier(customer_summary['current_tier'])
                    required_tier = LoyaltyTier(reward['tier_requirement'])
                    
                    # Check if current tier meets requirement (higher tiers can access lower tier rewards)
                    tier_order = list(LoyaltyTier)
                    if tier_order.index(current_tier) < tier_order.index(required_tier):
                        return LoyaltyOperationResult(
                            success=False,
                            error=f"Tier requirement not met. Required: {required_tier.value}, Current: {current_tier.value}",
                            error_code="TIER_REQUIREMENT_NOT_MET"
                        )
                
                # Check usage limits
                if reward['usage_limit_per_customer']:
                    cursor.execute('''
                        SELECT COUNT(*) as usage_count 
                        FROM customer_redemptions 
                        WHERE customer_id = ? AND reward_id = ?
                    ''', (customer_id, reward_id))
                    
                    current_usage = cursor.fetchone()['usage_count']
                    if current_usage >= reward['usage_limit_per_customer']:
                        return LoyaltyOperationResult(
                            success=False,
                            error="Personal usage limit exceeded for this reward",
                            error_code="USAGE_LIMIT_EXCEEDED"
                        )
                
                if reward['total_usage_limit'] and reward['current_usage_count'] >= reward['total_usage_limit']:
                    return LoyaltyOperationResult(
                        success=False,
                        error="Total usage limit exceeded for this reward",
                        error_code="TOTAL_USAGE_LIMIT_EXCEEDED"
                    )
                
                # Create redemption record
                redemption_id = str(uuid.uuid4())
                redemption_expires_at = datetime.utcnow() + timedelta(days=30)  # Redemptions expire in 30 days
                
                cursor.execute('''
                    INSERT INTO customer_redemptions (
                        id, customer_id, reward_id, franchise_id, location_id,
                        appointment_id, points_used, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    redemption_id, customer_id, reward_id, franchise_id, location_id,
                    appointment_id, reward['points_cost'], redemption_expires_at
                ))
                
                # Create points deduction transaction
                deduction_transaction_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO loyalty_transactions (
                        id, customer_id, franchise_id, location_id, transaction_type,
                        points_amount, reward_id, description
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    deduction_transaction_id, customer_id, franchise_id, location_id,
                    TransactionType.REDEEM.value, -reward['points_cost'], reward_id,
                    f"Redeemed: {reward['name']}"
                ))
                
                # Update reward usage count
                cursor.execute('''
                    UPDATE loyalty_rewards 
                    SET current_usage_count = current_usage_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (reward_id,))
                
                # Update customer loyalty summary
                self._update_customer_loyalty_summary(cursor, customer_id, franchise_id)
                
                conn.commit()
                
            logger.info(f"Customer {customer_id} redeemed reward {reward_id} for {reward['points_cost']} points")
            
            return LoyaltyOperationResult(
                success=True,
                data={
                    "redemption_id": redemption_id,
                    "reward_name": reward['name'],
                    "points_used": reward['points_cost'],
                    "expires_at": redemption_expires_at.isoformat()
                }
            )
            
        except Exception as e:
            error_msg = f"Failed to redeem points: {str(e)}"
            logger.error(error_msg)
            return LoyaltyOperationResult(
                success=False,
                error=error_msg,
                error_code="REDEMPTION_ERROR"
            )

    def get_customer_loyalty_profile(
        self,
        customer_id: str,
        franchise_id: str
    ) -> LoyaltyOperationResult:
        """Get comprehensive loyalty profile for a customer"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get customer summary
                summary = self._get_customer_loyalty_summary(cursor, customer_id)
                
                if not summary:
                    return LoyaltyOperationResult(
                        success=False,
                        error="Customer loyalty profile not found",
                        error_code="PROFILE_NOT_FOUND"
                    )
                
                # Get recent transactions
                cursor.execute('''
                    SELECT * FROM loyalty_transactions 
                    WHERE customer_id = ? AND franchise_id = ?
                    ORDER BY processed_at DESC
                    LIMIT 20
                ''', (customer_id, franchise_id))
                
                transactions = [self._row_to_transaction_dict(row) for row in cursor.fetchall()]
                
                # Get active redemptions
                cursor.execute('''
                    SELECT cr.*, lr.name as reward_name, lr.description as reward_description
                    FROM customer_redemptions cr
                    JOIN loyalty_rewards lr ON cr.reward_id = lr.id
                    WHERE cr.customer_id = ? AND cr.status = 'ACTIVE'
                    ORDER BY cr.redeemed_at DESC
                ''', (customer_id,))
                
                active_redemptions = []
                for row in cursor.fetchall():
                    redemption = dict(row)
                    active_redemptions.append(redemption)
                
                # Get tier benefits
                current_tier = LoyaltyTier(summary['current_tier'])
                tier_benefits = LoyaltyTierConfig.get_tier_benefits(current_tier)
                
                # Calculate progress to next tier
                next_tier_info = self._calculate_next_tier_progress(summary)
                
                # Get expiring points
                cursor.execute('''
                    SELECT SUM(points_amount) as expiring_points
                    FROM loyalty_transactions
                    WHERE customer_id = ? 
                      AND transaction_type = 'EARN'
                      AND expires_at <= date('now', '+30 days')
                      AND expires_at > date('now')
                ''', (customer_id,))
                
                expiring_result = cursor.fetchone()
                expiring_points = expiring_result['expiring_points'] if expiring_result['expiring_points'] else 0
                
                loyalty_profile = {
                    "customer_id": customer_id,
                    "franchise_id": franchise_id,
                    "current_points": summary['current_points'],
                    "lifetime_points_earned": summary['lifetime_points_earned'],
                    "lifetime_points_redeemed": summary['lifetime_points_redeemed'],
                    "current_tier": summary['current_tier'],
                    "tier_benefits": tier_benefits,
                    "next_tier_info": next_tier_info,
                    "points_expiring_soon": expiring_points,
                    "last_activity_date": summary['last_activity_date'],
                    "recent_transactions": transactions,
                    "active_redemptions": active_redemptions
                }
                
                return LoyaltyOperationResult(success=True, data=loyalty_profile)
                
        except Exception as e:
            error_msg = f"Failed to get loyalty profile: {str(e)}"
            logger.error(error_msg)
            return LoyaltyOperationResult(
                success=False,
                error=error_msg,
                error_code="PROFILE_ERROR"
            )

    def check_tier_upgrade(
        self,
        customer_id: str,
        franchise_id: str
    ) -> LoyaltyOperationResult:
        """Check if customer qualifies for tier upgrade"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get customer data for tier calculation
                cursor.execute('''
                    SELECT fc.total_spend, fc.total_visits, cls.current_points, cls.current_tier
                    FROM franchise_customers fc
                    JOIN customer_loyalty_summary cls ON fc.id = cls.customer_id
                    WHERE fc.id = ? AND fc.franchise_id = ?
                ''', (customer_id, franchise_id))
                
                customer_row = cursor.fetchone()
                
                if not customer_row:
                    return LoyaltyOperationResult(
                        success=False,
                        error="Customer not found",
                        error_code="CUSTOMER_NOT_FOUND"
                    )
                
                # Calculate appropriate tier
                current_tier = LoyaltyTier(customer_row['current_tier'])
                calculated_tier = LoyaltyTierConfig.calculate_tier(
                    customer_row['current_points'],
                    decimal.Decimal(str(customer_row['total_spend'])),
                    customer_row['total_visits']
                )
                
                # Check if upgrade is needed
                tier_order = list(LoyaltyTier)
                if tier_order.index(calculated_tier) > tier_order.index(current_tier):
                    # Upgrade tier
                    cursor.execute('''
                        UPDATE customer_loyalty_summary
                        SET current_tier = ?, 
                            tier_anniversary_date = date('now'),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE customer_id = ?
                    ''', (calculated_tier.value, customer_id))
                    
                    # Award tier upgrade bonus points
                    tier_benefits = LoyaltyTierConfig.get_tier_benefits(calculated_tier)
                    bonus_points = tier_benefits.get('referral_bonus_points', 0)
                    
                    if bonus_points > 0:
                        bonus_transaction_id = str(uuid.uuid4())
                        cursor.execute('''
                            INSERT INTO loyalty_transactions (
                                id, customer_id, franchise_id, location_id, transaction_type,
                                points_amount, description
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            bonus_transaction_id, customer_id, franchise_id, franchise_id,
                            TransactionType.BONUS.value, bonus_points,
                            f"Tier upgrade bonus - Welcome to {calculated_tier.value}!"
                        ))
                    
                    conn.commit()
                    
                    logger.info(f"Customer {customer_id} upgraded from {current_tier.value} to {calculated_tier.value}")
                    
                    return LoyaltyOperationResult(
                        success=True,
                        data={
                            "upgraded": True,
                            "previous_tier": current_tier.value,
                            "new_tier": calculated_tier.value,
                            "bonus_points": bonus_points,
                            "new_benefits": LoyaltyTierConfig.get_tier_benefits(calculated_tier)
                        }
                    )
                else:
                    return LoyaltyOperationResult(
                        success=True,
                        data={"upgraded": False, "current_tier": current_tier.value}
                    )
                
        except Exception as e:
            error_msg = f"Failed to check tier upgrade: {str(e)}"
            logger.error(error_msg)
            return LoyaltyOperationResult(
                success=False,
                error=error_msg,
                error_code="TIER_CHECK_ERROR"
            )

    # ==========================================
    # UTILITY METHODS
    # ==========================================

    def _update_customer_loyalty_summary(self, cursor: sqlite3.Cursor, customer_id: str, franchise_id: str):
        """Update customer loyalty summary with latest data"""
        # Calculate current points (sum of all non-expired transactions)
        cursor.execute('''
            SELECT COALESCE(SUM(points_amount), 0) as current_points
            FROM loyalty_transactions
            WHERE customer_id = ? 
              AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ''', (customer_id,))
        current_points = cursor.fetchone()['current_points']
        
        # Calculate lifetime points earned and redeemed
        cursor.execute('''
            SELECT 
                COALESCE(SUM(CASE WHEN points_amount > 0 THEN points_amount ELSE 0 END), 0) as earned,
                COALESCE(SUM(CASE WHEN points_amount < 0 THEN ABS(points_amount) ELSE 0 END), 0) as redeemed
            FROM loyalty_transactions
            WHERE customer_id = ?
        ''', (customer_id,))
        
        points_data = cursor.fetchone()
        
        # Get customer data for tier calculation
        cursor.execute('''
            SELECT total_spend, total_visits
            FROM franchise_customers
            WHERE id = ?
        ''', (customer_id,))
        
        customer_data = cursor.fetchone()
        if customer_data:
            calculated_tier = LoyaltyTierConfig.calculate_tier(
                current_points,
                decimal.Decimal(str(customer_data['total_spend'])),
                customer_data['total_visits']
            )
        else:
            calculated_tier = LoyaltyTier.BRONZE
        
        # Calculate points expiring in next 30 days
        cursor.execute('''
            SELECT COALESCE(SUM(points_amount), 0) as expiring_points
            FROM loyalty_transactions
            WHERE customer_id = ? 
              AND transaction_type = 'EARN'
              AND expires_at <= date('now', '+30 days')
              AND expires_at > date('now')
        ''', (customer_id,))
        
        expiring_points = cursor.fetchone()['expiring_points']
        
        # Upsert customer loyalty summary
        cursor.execute('''
            INSERT OR REPLACE INTO customer_loyalty_summary (
                customer_id, franchise_id, current_points, lifetime_points_earned,
                lifetime_points_redeemed, current_tier, last_activity_date,
                points_expire_next_30_days, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, date('now'), ?, CURRENT_TIMESTAMP)
        ''', (
            customer_id, franchise_id, current_points, points_data['earned'],
            points_data['redeemed'], calculated_tier.value, expiring_points
        ))

    def _get_customer_loyalty_summary(self, cursor: sqlite3.Cursor, customer_id: str) -> Optional[Dict[str, Any]]:
        """Get customer loyalty summary"""
        cursor.execute('SELECT * FROM customer_loyalty_summary WHERE customer_id = ?', (customer_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def _calculate_next_tier_progress(self, summary: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate progress towards next tier"""
        current_tier = LoyaltyTier(summary['current_tier'])
        tier_order = list(LoyaltyTier)
        current_index = tier_order.index(current_tier)
        
        if current_index >= len(tier_order) - 1:
            # Already at highest tier
            return {
                "next_tier": None,
                "progress_percentage": 100,
                "points_needed": 0,
                "at_highest_tier": True
            }
        
        next_tier = tier_order[current_index + 1]
        next_tier_requirements = LoyaltyTierConfig.TIER_THRESHOLDS[next_tier]
        
        points_needed = max(0, next_tier_requirements['min_points'] - summary['current_points'])
        progress_percentage = min(100, (summary['current_points'] / next_tier_requirements['min_points']) * 100)
        
        return {
            "next_tier": next_tier.value,
            "points_needed": points_needed,
            "progress_percentage": round(progress_percentage, 1),
            "at_highest_tier": False
        }

    def _row_to_transaction_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to transaction dictionary"""
        transaction_dict = dict(row)
        if transaction_dict.get('reference_data'):
            try:
                transaction_dict['reference_data'] = json.loads(transaction_dict['reference_data'])
            except json.JSONDecodeError:
                transaction_dict['reference_data'] = {}
        return transaction_dict

    def _row_to_reward_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to reward dictionary"""
        reward_dict = dict(row)
        if reward_dict.get('valid_locations'):
            try:
                reward_dict['valid_locations'] = json.loads(reward_dict['valid_locations'])
            except json.JSONDecodeError:
                reward_dict['valid_locations'] = []
        return reward_dict

# ==========================================
# EXAMPLE USAGE
# ==========================================

if __name__ == "__main__":
    # Initialize service
    loyalty_service = CrossLocationLoyaltyService()
    
    print("Cross-location loyalty service initialized successfully!")
    
    # Example: Award points for a purchase
    # result = loyalty_service.award_points(
    #     customer_id="customer_123",
    #     franchise_id="franchise_456",
    #     location_id="location_789",
    #     points_amount=500,
    #     description="Haircut service - $50"
    # )
    # 
    # if result.success:
    #     print(f"Awarded points successfully: {result.data}")
    # else:
    #     print(f"Failed to award points: {result.error}")