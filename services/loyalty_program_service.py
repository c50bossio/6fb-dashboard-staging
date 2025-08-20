"""
Loyalty Program Service
Comprehensive loyalty and rewards management for barbershop platform
Handles points, tiers, rewards, referrals, and gamification
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Dict, List, Optional, Any, Union
import redis
from supabase import Client

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LoyaltyProgramService:
    """Service for managing loyalty programs, points, tiers, and rewards"""
    
    def __init__(self, supabase_client: Client, redis_client: redis.Redis):
        self.supabase = supabase_client
        self.redis = redis_client
        self.cache_ttl = 3600  # 1 hour cache TTL
        
    # ============================================
    # LOYALTY PROGRAM MANAGEMENT
    # ============================================
    
    async def create_loyalty_program(self, barbershop_id: str, program_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new loyalty program"""
        try:
            # Validate program data
            self._validate_program_data(program_data)
            
            # Prepare program data
            program_record = {
                "id": str(uuid.uuid4()),
                "barbershop_id": barbershop_id,
                **program_data,
                "is_active": True,
                "total_members": 0,
                "active_members": 0,
                "total_points_issued": 0,
                "total_points_redeemed": 0,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert program
            result = self.supabase.table("loyalty_programs").insert(program_record).execute()
            if not result.data:
                raise Exception("Failed to create loyalty program")
            
            program = result.data[0]
            
            # Create default tiers if it's a tier-based program
            if program_data.get("program_type") in ["tier", "hybrid"]:
                await self._create_default_tiers(program["id"], barbershop_id)
            
            # Clear cache
            await self._clear_program_cache(barbershop_id)
            
            logger.info(f"Created loyalty program {program['id']} for barbershop {barbershop_id}")
            return program
            
        except Exception as e:
            logger.error(f"Error creating loyalty program: {str(e)}")
            raise e
    
    async def get_loyalty_program(self, program_id: str, barbershop_id: str) -> Optional[Dict[str, Any]]:
        """Get loyalty program by ID"""
        try:
            # Check cache first
            cache_key = f"loyalty_program:{program_id}"
            cached_result = self.redis.get(cache_key)
            if cached_result:
                program = json.loads(cached_result)
                if program.get("barbershop_id") == barbershop_id:
                    return program
            
            # Query database
            result = self.supabase.table("loyalty_programs").select("*").eq("id", program_id).eq("barbershop_id", barbershop_id).execute()
            
            if result.data:
                program = result.data[0]
                # Cache result
                self.redis.setex(cache_key, self.cache_ttl, json.dumps(program, default=str))
                return program
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting loyalty program {program_id}: {str(e)}")
            raise e
    
    async def list_loyalty_programs(self, barbershop_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        """List all loyalty programs for a barbershop"""
        try:
            query = self.supabase.table("loyalty_programs").select("*").eq("barbershop_id", barbershop_id)
            
            if active_only:
                query = query.eq("is_active", True)
            
            result = query.execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"Error listing loyalty programs for barbershop {barbershop_id}: {str(e)}")
            raise e
    
    async def update_loyalty_program(self, program_id: str, barbershop_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update loyalty program"""
        try:
            # Add updated_at timestamp
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            # Update program
            result = self.supabase.table("loyalty_programs").update(update_data).eq("id", program_id).eq("barbershop_id", barbershop_id).execute()
            
            if result.data:
                program = result.data[0]
                # Clear cache
                await self._clear_program_cache(barbershop_id, program_id)
                return program
            
            return None
            
        except Exception as e:
            logger.error(f"Error updating loyalty program {program_id}: {str(e)}")
            raise e
    
    # ============================================
    # POINTS MANAGEMENT
    # ============================================
    
    async def process_points_transaction(self, barbershop_id: str, transaction_data: Dict[str, Any], processed_by_user_id: str) -> Dict[str, Any]:
        """Process a points transaction (earn or redeem)"""
        try:
            customer_id = transaction_data["customer_id"]
            loyalty_program_id = transaction_data["loyalty_program_id"]
            points_amount = transaction_data["points_amount"]
            
            # Get current customer enrollment
            enrollment = await self._get_customer_enrollment(customer_id, loyalty_program_id, barbershop_id)
            if not enrollment:
                raise Exception("Customer not enrolled in loyalty program")
            
            # Get current balance
            current_balance = enrollment.get("current_points", 0)
            
            # Validate transaction
            if transaction_data["transaction_type"] == "redeemed" and current_balance < abs(points_amount):
                raise Exception("Insufficient points balance")
            
            # Calculate expiration date for earned points
            if transaction_data["transaction_type"] in ["earned", "bonus"]:
                program = await self.get_loyalty_program(loyalty_program_id, barbershop_id)
                if program and program.get("points_expiration_months"):
                    expires_at = datetime.utcnow() + timedelta(days=program["points_expiration_months"] * 30)
                    transaction_data["expires_at"] = expires_at.isoformat()
            
            # Create points transaction record
            transaction_record = {
                "id": str(uuid.uuid4()),
                "barbershop_id": barbershop_id,
                **transaction_data,
                "balance_before": current_balance,
                "balance_after": current_balance + points_amount,
                "processed_by_user_id": processed_by_user_id,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Insert transaction
            result = self.supabase.table("loyalty_points").insert(transaction_record).execute()
            if not result.data:
                raise Exception("Failed to create points transaction")
            
            transaction = result.data[0]
            
            # Check for tier upgrade
            tier_upgrade_info = await self._check_and_process_tier_upgrade(customer_id, loyalty_program_id, barbershop_id)
            
            # Clear customer cache
            await self._clear_customer_cache(customer_id, barbershop_id)
            
            return {
                "transaction_id": transaction["id"],
                "new_balance": transaction["balance_after"],
                "tier_upgraded": tier_upgrade_info.get("upgraded", False),
                "new_tier": tier_upgrade_info.get("new_tier_name")
            }
            
        except Exception as e:
            logger.error(f"Error processing points transaction: {str(e)}")
            raise e
    
    async def get_customer_points_balance(self, customer_id: str, barbershop_id: str, program_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get customer's points balance and tier status"""
        try:
            # Check cache first
            cache_key = f"customer_balance:{customer_id}:{barbershop_id}"
            if program_id:
                cache_key += f":{program_id}"
            
            cached_result = self.redis.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Query enrollment
            query = self.supabase.table("loyalty_program_enrollments").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id)
            
            if program_id:
                query = query.eq("loyalty_program_id", program_id)
            
            result = query.execute()
            
            if result.data:
                enrollment = result.data[0] if program_id else result.data[-1]  # Get latest if no specific program
                
                # Calculate tier progress
                tier_progress = await self._calculate_tier_progress(customer_id, enrollment["loyalty_program_id"], barbershop_id)
                enrollment.update(tier_progress)
                
                # Cache result
                self.redis.setex(cache_key, self.cache_ttl, json.dumps(enrollment, default=str))
                return enrollment
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting customer points balance: {str(e)}")
            raise e
    
    async def get_points_history(self, customer_id: str, barbershop_id: str, program_id: Optional[str] = None, limit: int = 50, offset: int = 0, transaction_type: Optional[str] = None) -> Dict[str, Any]:
        """Get customer's points transaction history"""
        try:
            # Build query
            query = self.supabase.table("loyalty_points").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id)
            
            if program_id:
                query = query.eq("loyalty_program_id", program_id)
            
            if transaction_type:
                query = query.eq("transaction_type", transaction_type)
            
            # Get total count
            count_result = query.execute()
            total_count = len(count_result.data) if count_result.data else 0
            
            # Get paginated results
            result = query.order("created_at", desc=True).limit(limit).offset(offset).execute()
            transactions = result.data or []
            
            # Calculate summary
            summary = await self._calculate_points_summary(customer_id, barbershop_id, program_id)
            
            return {
                "transactions": transactions,
                "total_count": total_count,
                "summary": summary
            }
            
        except Exception as e:
            logger.error(f"Error getting points history: {str(e)}")
            raise e
    
    # ============================================
    # TIER MANAGEMENT
    # ============================================
    
    async def create_loyalty_tier(self, barbershop_id: str, tier_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new loyalty tier"""
        try:
            # Prepare tier record
            tier_record = {
                "id": str(uuid.uuid4()),
                "barbershop_id": barbershop_id,
                **tier_data,
                "is_active": True,
                "current_members": 0,
                "average_spending": 0,
                "retention_rate": 0,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert tier
            result = self.supabase.table("loyalty_tiers").insert(tier_record).execute()
            if not result.data:
                raise Exception("Failed to create loyalty tier")
            
            tier = result.data[0]
            
            # Clear cache
            await self._clear_program_cache(barbershop_id, tier_data["loyalty_program_id"])
            
            logger.info(f"Created loyalty tier {tier['id']} for program {tier_data['loyalty_program_id']}")
            return tier
            
        except Exception as e:
            logger.error(f"Error creating loyalty tier: {str(e)}")
            raise e
    
    async def get_loyalty_tiers(self, barbershop_id: str, program_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get loyalty tiers"""
        try:
            query = self.supabase.table("loyalty_tiers").select("*").eq("barbershop_id", barbershop_id).eq("is_active", True)
            
            if program_id:
                query = query.eq("loyalty_program_id", program_id)
            
            result = query.order("tier_level").execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"Error getting loyalty tiers: {str(e)}")
            raise e
    
    async def check_tier_upgrade_eligibility(self, customer_id: str, barbershop_id: str, program_id: Optional[str] = None) -> Dict[str, Any]:
        """Check if customer is eligible for tier upgrade"""
        try:
            # Get customer enrollment
            enrollment = await self._get_customer_enrollment(customer_id, program_id, barbershop_id)
            if not enrollment:
                return {"eligible": False, "reason": "Customer not enrolled"}
            
            # Get customer analytics
            analytics = await self._get_customer_analytics(customer_id, barbershop_id)
            
            # Get available tiers
            tiers = await self.get_loyalty_tiers(barbershop_id, enrollment["loyalty_program_id"])
            
            # Find current tier level
            current_tier_level = 0
            if enrollment.get("current_tier"):
                current_tier = next((t for t in tiers if t["tier_name"] == enrollment["current_tier"]), None)
                if current_tier:
                    current_tier_level = current_tier["tier_level"]
            
            # Check eligibility for higher tiers
            eligible_tiers = []
            for tier in tiers:
                if tier["tier_level"] > current_tier_level:
                    if await self._meets_tier_requirements(tier, analytics):
                        eligible_tiers.append(tier)
            
            # Get the highest eligible tier
            if eligible_tiers:
                next_tier = max(eligible_tiers, key=lambda t: t["tier_level"])
                return {
                    "eligible": True,
                    "next_tier": next_tier,
                    "current_tier_level": current_tier_level,
                    "analytics": analytics
                }
            
            # Check progress to next tier
            next_tier = next((t for t in tiers if t["tier_level"] == current_tier_level + 1), None)
            if next_tier:
                progress = await self._calculate_tier_requirement_progress(next_tier, analytics)
                return {
                    "eligible": False,
                    "next_tier": next_tier,
                    "progress": progress,
                    "current_tier_level": current_tier_level
                }
            
            return {"eligible": False, "reason": "Already at highest tier"}
            
        except Exception as e:
            logger.error(f"Error checking tier upgrade eligibility: {str(e)}")
            raise e
    
    async def upgrade_customer_tier(self, customer_id: str, new_tier_id: str, barbershop_id: str, processed_by_user_id: str) -> Dict[str, Any]:
        """Upgrade customer to new tier"""
        try:
            # Get tier information
            tier_result = self.supabase.table("loyalty_tiers").select("*").eq("id", new_tier_id).eq("barbershop_id", barbershop_id).execute()
            if not tier_result.data:
                raise Exception("Tier not found")
            
            tier = tier_result.data[0]
            
            # Get customer enrollment
            enrollment = await self._get_customer_enrollment(customer_id, tier["loyalty_program_id"], barbershop_id)
            if not enrollment:
                raise Exception("Customer not enrolled in loyalty program")
            
            # Update enrollment with new tier
            update_data = {
                "current_tier": tier["tier_name"],
                "tier_progress": 0,  # Reset progress for new tier
                "updated_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("loyalty_program_enrollments").update(update_data).eq("id", enrollment["id"]).execute()
            
            if not result.data:
                raise Exception("Failed to upgrade customer tier")
            
            # Create milestone record
            await self._create_tier_upgrade_milestone(customer_id, barbershop_id, tier["tier_name"])
            
            # Clear cache
            await self._clear_customer_cache(customer_id, barbershop_id)
            
            logger.info(f"Upgraded customer {customer_id} to tier {tier['tier_name']}")
            
            return {
                "success": True,
                "new_tier_name": tier["tier_name"],
                "new_tier_level": tier["tier_level"],
                "tier_benefits": tier["benefits"]
            }
            
        except Exception as e:
            logger.error(f"Error upgrading customer tier: {str(e)}")
            raise e
    
    # ============================================
    # REWARDS MANAGEMENT
    # ============================================
    
    async def get_available_rewards(self, barbershop_id: str, program_id: Optional[str] = None, customer_tier: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available rewards catalog"""
        try:
            # Get program(s)
            programs = []
            if program_id:
                program = await self.get_loyalty_program(program_id, barbershop_id)
                if program:
                    programs.append(program)
            else:
                programs = await self.list_loyalty_programs(barbershop_id)
            
            # Extract rewards from program redemption rules
            rewards = []
            for program in programs:
                redemption_rules = program.get("redemption_rules", {})
                redemption_options = redemption_rules.get("redemption_options", [])
                
                for option in redemption_options:
                    reward = {
                        "program_id": program["id"],
                        "program_name": program["program_name"],
                        "points_required": option.get("points", 0),
                        "reward_type": self._determine_reward_type(option.get("reward", "")),
                        "reward_name": option.get("reward", ""),
                        "description": option.get("description", ""),
                        "terms": option.get("terms", ""),
                        "available_for_tier": option.get("tier_requirement", "all")
                    }
                    
                    # Filter by customer tier if provided
                    if customer_tier and reward["available_for_tier"] != "all":
                        if isinstance(reward["available_for_tier"], list):
                            if customer_tier not in reward["available_for_tier"]:
                                continue
                        elif customer_tier != reward["available_for_tier"]:
                            continue
                    
                    rewards.append(reward)
            
            return sorted(rewards, key=lambda r: r["points_required"])
            
        except Exception as e:
            logger.error(f"Error getting available rewards: {str(e)}")
            raise e
    
    async def redeem_points(self, barbershop_id: str, redemption_data: Dict[str, Any], processed_by_user_id: str) -> Dict[str, Any]:
        """Redeem points for rewards"""
        try:
            customer_id = redemption_data["customer_id"]
            loyalty_program_id = redemption_data["loyalty_program_id"]
            points_redeemed = redemption_data["points_redeemed"]
            
            # Check customer balance
            balance = await self.get_customer_points_balance(customer_id, barbershop_id, loyalty_program_id)
            if not balance or balance["current_points"] < points_redeemed:
                raise Exception("Insufficient points balance")
            
            # Create redemption record
            redemption_record = {
                "id": str(uuid.uuid4()),
                "barbershop_id": barbershop_id,
                **redemption_data,
                "redemption_code": self._generate_redemption_code(),
                "redeemed_at": datetime.utcnow().isoformat(),
                "status": "active",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert redemption
            result = self.supabase.table("reward_redemptions").insert(redemption_record).execute()
            if not result.data:
                raise Exception("Failed to create reward redemption")
            
            redemption = result.data[0]
            
            # Process points deduction
            await self.process_points_transaction(
                barbershop_id=barbershop_id,
                transaction_data={
                    "customer_id": customer_id,
                    "loyalty_program_id": loyalty_program_id,
                    "transaction_type": "redeemed",
                    "points_amount": -points_redeemed,
                    "redemption_value": redemption_data["monetary_value"],
                    "redemption_type": redemption_data["reward_type"],
                    "source_type": "reward_redemption",
                    "source_id": redemption["id"],
                    "description": f"Redeemed: {redemption_data['reward_name']}"
                },
                processed_by_user_id=processed_by_user_id
            )
            
            # Update remaining balance
            new_balance = balance["current_points"] - points_redeemed
            
            return {
                "redemption_id": redemption["id"],
                "redemption_code": redemption["redemption_code"],
                "remaining_balance": new_balance,
                "expires_at": redemption.get("expires_at")
            }
            
        except Exception as e:
            logger.error(f"Error redeeming points: {str(e)}")
            raise e
    
    async def get_redemption_history(self, barbershop_id: str, customer_id: Optional[str] = None, limit: int = 50, offset: int = 0, status: Optional[str] = None) -> Dict[str, Any]:
        """Get reward redemption history"""
        try:
            # Build query
            query = self.supabase.table("reward_redemptions").select("*").eq("barbershop_id", barbershop_id)
            
            if customer_id:
                query = query.eq("customer_id", customer_id)
            
            if status:
                query = query.eq("status", status)
            
            # Get total count
            count_result = query.execute()
            total_count = len(count_result.data) if count_result.data else 0
            
            # Get paginated results
            result = query.order("redeemed_at", desc=True).limit(limit).offset(offset).execute()
            redemptions = result.data or []
            
            return {
                "redemptions": redemptions,
                "total_count": total_count
            }
            
        except Exception as e:
            logger.error(f"Error getting redemption history: {str(e)}")
            raise e
    
    # ============================================
    # REFERRAL MANAGEMENT
    # ============================================
    
    async def create_referral(self, barbershop_id: str, referral_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new referral tracking record"""
        try:
            # Generate unique referral code
            referral_code = await self._generate_unique_referral_code(barbershop_id)
            
            # Prepare referral record
            referral_record = {
                "id": str(uuid.uuid4()),
                "barbershop_id": barbershop_id,
                **referral_data,
                "referral_code": referral_code,
                "status": "sent",
                "sent_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),  # 30 day expiry
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert referral
            result = self.supabase.table("referral_tracking").insert(referral_record).execute()
            if not result.data:
                raise Exception("Failed to create referral")
            
            referral = result.data[0]
            
            logger.info(f"Created referral {referral['id']} with code {referral_code}")
            return referral
            
        except Exception as e:
            logger.error(f"Error creating referral: {str(e)}")
            raise e
    
    async def get_referrals(self, barbershop_id: str, customer_id: Optional[str] = None, status: Optional[str] = None, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """Get referral tracking data"""
        try:
            # Build query
            query = self.supabase.table("referral_tracking").select("*").eq("barbershop_id", barbershop_id)
            
            if customer_id:
                query = query.eq("referrer_customer_id", customer_id)
            
            if status:
                query = query.eq("status", status)
            
            # Get total count
            count_result = query.execute()
            total_count = len(count_result.data) if count_result.data else 0
            
            # Get paginated results
            result = query.order("created_at", desc=True).limit(limit).offset(offset).execute()
            referrals = result.data or []
            
            return {
                "referrals": referrals,
                "total_count": total_count
            }
            
        except Exception as e:
            logger.error(f"Error getting referrals: {str(e)}")
            raise e
    
    async def update_referral_status(self, referral_id: str, new_status: str, barbershop_id: str) -> Dict[str, Any]:
        """Update referral status and process rewards if qualified"""
        try:
            # Get referral
            result = self.supabase.table("referral_tracking").select("*").eq("id", referral_id).eq("barbershop_id", barbershop_id).execute()
            if not result.data:
                raise Exception("Referral not found")
            
            referral = result.data[0]
            
            # Update status
            update_data = {
                "status": new_status,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Add timestamp for status change
            status_timestamp_field = f"{new_status}_at"
            if hasattr(datetime, 'utcnow'):
                update_data[status_timestamp_field] = datetime.utcnow().isoformat()
            
            # Check if referral qualifies for rewards
            qualified = await self._check_referral_qualification(referral, new_status)
            if qualified and not referral.get("referrer_reward_given"):
                await self._process_referral_rewards(referral, barbershop_id)
                update_data["referrer_reward_given"] = True
                update_data["referee_reward_given"] = True
                update_data["referrer_reward_given_at"] = datetime.utcnow().isoformat()
                update_data["referee_reward_given_at"] = datetime.utcnow().isoformat()
            
            # Update referral
            update_result = self.supabase.table("referral_tracking").update(update_data).eq("id", referral_id).execute()
            
            return {
                "success": True,
                "new_status": new_status,
                "qualified": qualified,
                "rewards_processed": qualified and not referral.get("referrer_reward_given"),
                "updated_referral": update_result.data[0] if update_result.data else None
            }
            
        except Exception as e:
            logger.error(f"Error updating referral status: {str(e)}")
            raise e
    
    # ============================================
    # GAMIFICATION AND LEADERBOARD
    # ============================================
    
    async def get_leaderboard(self, barbershop_id: str, program_id: Optional[str] = None, period: str = "all_time", limit: int = 10) -> List[Dict[str, Any]]:
        """Get customer leaderboard"""
        try:
            # Build base query
            query = self.supabase.table("loyalty_program_enrollments").select("""
                customer_id,
                current_points,
                lifetime_points_earned,
                current_tier,
                customers!inner(first_name, last_name)
            """).eq("barbershop_id", barbershop_id).eq("is_active", True)
            
            if program_id:
                query = query.eq("loyalty_program_id", program_id)
            
            # Apply period filter for points earned
            if period != "all_time":
                # This would require additional logic to filter by time period
                pass
            
            # Execute query and sort by points
            result = query.execute()
            enrollments = result.data or []
            
            # Sort by total points and add position
            sorted_enrollments = sorted(enrollments, key=lambda e: e["current_points"], reverse=True)
            
            # Format leaderboard entries
            leaderboard = []
            for i, enrollment in enumerate(sorted_enrollments[:limit]):
                customer = enrollment["customers"]
                entry = {
                    "customer_id": enrollment["customer_id"],
                    "customer_name": f"{customer['first_name']} {customer['last_name']}",
                    "total_points": enrollment["current_points"],
                    "tier": enrollment.get("current_tier"),
                    "position": i + 1,
                    "badge": self._get_position_badge(i + 1)
                }
                leaderboard.append(entry)
            
            return leaderboard
            
        except Exception as e:
            logger.error(f"Error getting leaderboard: {str(e)}")
            raise e
    
    async def get_customer_achievements(self, customer_id: str, barbershop_id: str, program_id: Optional[str] = None) -> Dict[str, Any]:
        """Get customer achievements and badges"""
        try:
            # Get customer milestones
            milestones_result = self.supabase.table("customer_milestones").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).execute()
            milestones = milestones_result.data or []
            
            # Get customer analytics for achievement calculation
            analytics = await self._get_customer_analytics(customer_id, barbershop_id)
            
            # Calculate achievements
            achievements = await self._calculate_customer_achievements(customer_id, barbershop_id, analytics, milestones)
            
            return {
                "customer_id": customer_id,
                "milestones": milestones,
                "achievements": achievements,
                "analytics_summary": analytics
            }
            
        except Exception as e:
            logger.error(f"Error getting customer achievements: {str(e)}")
            raise e
    
    async def get_loyalty_program_stats(self, barbershop_id: str, program_id: Optional[str] = None) -> Dict[str, Any]:
        """Get loyalty program statistics"""
        try:
            # Build query for enrollments
            query = self.supabase.table("loyalty_program_enrollments").select("*").eq("barbershop_id", barbershop_id)
            if program_id:
                query = query.eq("loyalty_program_id", program_id)
            
            enrollments_result = query.execute()
            enrollments = enrollments_result.data or []
            
            # Calculate basic stats
            total_members = len(enrollments)
            active_members = len([e for e in enrollments if e.get("is_active")])
            
            # Get points transactions for additional stats
            points_query = self.supabase.table("loyalty_points").select("*").eq("barbershop_id", barbershop_id)
            if program_id:
                points_query = points_query.eq("loyalty_program_id", program_id)
            
            points_result = points_query.execute()
            transactions = points_result.data or []
            
            # Calculate points stats
            total_points_issued = sum(t["points_amount"] for t in transactions if t["points_amount"] > 0)
            total_points_redeemed = abs(sum(t["points_amount"] for t in transactions if t["points_amount"] < 0))
            
            # Calculate tier distribution
            tier_distribution = {}
            for enrollment in enrollments:
                tier = enrollment.get("current_tier", "No Tier")
                tier_distribution[tier] = tier_distribution.get(tier, 0) + 1
            
            # Calculate engagement metrics
            recent_activity = len([t for t in transactions if self._is_recent_activity(t["created_at"])])
            
            return {
                "total_members": total_members,
                "active_members": active_members,
                "total_points_issued": total_points_issued,
                "total_points_redeemed": total_points_redeemed,
                "points_outstanding": total_points_issued - total_points_redeemed,
                "tier_distribution": tier_distribution,
                "recent_activity_count": recent_activity,
                "average_points_per_member": total_points_issued / max(total_members, 1),
                "redemption_rate": (total_points_redeemed / max(total_points_issued, 1)) * 100
            }
            
        except Exception as e:
            logger.error(f"Error getting loyalty program stats: {str(e)}")
            raise e
    
    # ============================================
    # AUTOMATION METHODS
    # ============================================
    
    async def process_expired_points(self, barbershop_id: str, dry_run: bool = True) -> Dict[str, Any]:
        """Process expired loyalty points"""
        try:
            # Find expired points
            expired_points_result = self.supabase.table("loyalty_points").select("*").eq("barbershop_id", barbershop_id).eq("is_expired", False).lt("expires_at", datetime.utcnow().isoformat()).execute()
            
            expired_points = expired_points_result.data or []
            
            if dry_run:
                return {
                    "dry_run": True,
                    "expired_points_count": len(expired_points),
                    "total_points_to_expire": sum(p["points_amount"] for p in expired_points if p["points_amount"] > 0)
                }
            
            # Process each expired point transaction
            processed_count = 0
            total_expired_points = 0
            
            for point_transaction in expired_points:
                if point_transaction["points_amount"] > 0:  # Only process earned points
                    # Create expiration transaction
                    await self.process_points_transaction(
                        barbershop_id=barbershop_id,
                        transaction_data={
                            "customer_id": point_transaction["customer_id"],
                            "loyalty_program_id": point_transaction["loyalty_program_id"],
                            "transaction_type": "expired",
                            "points_amount": -point_transaction["points_amount"],
                            "source_type": "point_expiration",
                            "source_id": point_transaction["id"],
                            "description": f"Points expired from transaction {point_transaction['id']}"
                        },
                        processed_by_user_id="system"
                    )
                    
                    # Mark original transaction as expired
                    self.supabase.table("loyalty_points").update({"is_expired": True}).eq("id", point_transaction["id"]).execute()
                    
                    processed_count += 1
                    total_expired_points += point_transaction["points_amount"]
            
            return {
                "dry_run": False,
                "processed_count": processed_count,
                "total_expired_points": total_expired_points
            }
            
        except Exception as e:
            logger.error(f"Error processing expired points: {str(e)}")
            raise e
    
    async def calculate_tier_upgrades(self, barbershop_id: str, program_id: Optional[str] = None, dry_run: bool = True) -> Dict[str, Any]:
        """Calculate and process tier upgrades for eligible customers"""
        try:
            # Get all active enrollments
            query = self.supabase.table("loyalty_program_enrollments").select("*").eq("barbershop_id", barbershop_id).eq("is_active", True)
            if program_id:
                query = query.eq("loyalty_program_id", program_id)
            
            enrollments_result = query.execute()
            enrollments = enrollments_result.data or []
            
            eligible_upgrades = []
            
            # Check each customer for tier upgrade eligibility
            for enrollment in enrollments:
                upgrade_info = await self.check_tier_upgrade_eligibility(
                    enrollment["customer_id"],
                    barbershop_id,
                    enrollment["loyalty_program_id"]
                )
                
                if upgrade_info.get("eligible"):
                    eligible_upgrades.append({
                        "customer_id": enrollment["customer_id"],
                        "current_tier": enrollment.get("current_tier"),
                        "new_tier": upgrade_info["next_tier"],
                        "enrollment_id": enrollment["id"]
                    })
            
            if dry_run:
                return {
                    "dry_run": True,
                    "eligible_customers": len(eligible_upgrades),
                    "upgrades": eligible_upgrades
                }
            
            # Process upgrades
            upgraded_customers = []
            for upgrade in eligible_upgrades:
                try:
                    result = await self.upgrade_customer_tier(
                        upgrade["customer_id"],
                        upgrade["new_tier"]["id"],
                        barbershop_id,
                        "system"
                    )
                    if result["success"]:
                        upgraded_customers.append({
                            "customer_id": upgrade["customer_id"],
                            "new_tier": result["new_tier_name"]
                        })
                except Exception as e:
                    logger.error(f"Failed to upgrade customer {upgrade['customer_id']}: {str(e)}")
            
            return {
                "dry_run": False,
                "eligible_customers": len(eligible_upgrades),
                "upgrades_processed": len(upgraded_customers),
                "upgraded_customers": upgraded_customers
            }
            
        except Exception as e:
            logger.error(f"Error calculating tier upgrades: {str(e)}")
            raise e
    
    async def process_birthday_bonuses(self, barbershop_id: str, program_id: Optional[str] = None, dry_run: bool = True) -> Dict[str, Any]:
        """Process birthday bonus points for customers"""
        try:
            # Get customers with birthdays today
            today = date.today()
            
            # Query customers with today's birthday
            customers_result = self.supabase.table("customers").select("id, user_id, date_of_birth").eq("barbershop_id", barbershop_id).execute()
            customers = customers_result.data or []
            
            birthday_customers = []
            for customer in customers:
                if customer.get("date_of_birth"):
                    try:
                        birth_date = datetime.fromisoformat(customer["date_of_birth"]).date()
                        if birth_date.month == today.month and birth_date.day == today.day:
                            birthday_customers.append(customer)
                    except:
                        continue
            
            if dry_run:
                return {
                    "dry_run": True,
                    "birthday_customers_count": len(birthday_customers),
                    "birthday_customers": [c["id"] for c in birthday_customers]
                }
            
            # Process birthday bonuses
            processed_bonuses = []
            for customer in birthday_customers:
                # Check if customer is enrolled in loyalty program
                enrollment_query = self.supabase.table("loyalty_program_enrollments").select("*").eq("customer_id", customer["id"]).eq("barbershop_id", barbershop_id).eq("is_active", True)
                if program_id:
                    enrollment_query = enrollment_query.eq("loyalty_program_id", program_id)
                
                enrollment_result = enrollment_query.execute()
                if enrollment_result.data:
                    # Get loyalty program details
                    enrollment = enrollment_result.data[0]
                    program = await self.get_loyalty_program(enrollment["loyalty_program_id"], barbershop_id)
                    
                    # Calculate birthday bonus
                    bonus_points = program.get("earning_rules", {}).get("bonus_multipliers", {}).get("birthday_bonus", 100)
                    
                    # Award birthday bonus
                    await self.process_points_transaction(
                        barbershop_id=barbershop_id,
                        transaction_data={
                            "customer_id": customer["id"],
                            "loyalty_program_id": enrollment["loyalty_program_id"],
                            "transaction_type": "bonus",
                            "points_amount": bonus_points,
                            "source_type": "birthday_bonus",
                            "description": "Happy Birthday bonus points!"
                        },
                        processed_by_user_id="system"
                    )
                    
                    processed_bonuses.append({
                        "customer_id": customer["id"],
                        "bonus_points": bonus_points
                    })
            
            return {
                "dry_run": False,
                "birthday_customers_count": len(birthday_customers),
                "bonuses_processed": len(processed_bonuses),
                "birthday_customers": processed_bonuses
            }
            
        except Exception as e:
            logger.error(f"Error processing birthday bonuses: {str(e)}")
            raise e
    
    # ============================================
    # INTEGRATION METHODS
    # ============================================
    
    async def process_appointment_completion(self, appointment_id: str, customer_id: str, service_amount: Decimal, barbershop_id: str) -> Dict[str, Any]:
        """Process appointment completion and award loyalty points"""
        try:
            # Get customer's active loyalty enrollments
            enrollments_result = self.supabase.table("loyalty_program_enrollments").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).eq("is_active", True).execute()
            
            if not enrollments_result.data:
                return {"points_awarded": 0, "message": "Customer not enrolled in loyalty program"}
            
            total_points_awarded = 0
            transactions = []
            
            # Process each enrollment
            for enrollment in enrollments_result.data:
                # Get loyalty program details
                program = await self.get_loyalty_program(enrollment["loyalty_program_id"], barbershop_id)
                if not program or not program.get("is_active"):
                    continue
                
                # Calculate points based on earning rules
                earning_rules = program.get("earning_rules", {})
                points_per_dollar = earning_rules.get("points_per_dollar", 1)
                bonus_multipliers = earning_rules.get("bonus_multipliers", {})
                
                # Base points calculation
                base_points = int(float(service_amount) * points_per_dollar)
                
                # Apply tier multiplier if customer has a tier
                tier_multiplier = 1.0
                if enrollment.get("current_tier"):
                    # Get tier benefits
                    tiers = await self.get_loyalty_tiers(barbershop_id, enrollment["loyalty_program_id"])
                    customer_tier = next((t for t in tiers if t["tier_name"] == enrollment["current_tier"]), None)
                    if customer_tier:
                        tier_benefits = customer_tier.get("benefits", {})
                        tier_multiplier = tier_benefits.get("point_multiplier", 1.0)
                
                # Calculate final points
                final_points = int(base_points * tier_multiplier)
                
                # Apply daily/transaction limits
                if program.get("max_points_per_transaction") and final_points > program["max_points_per_transaction"]:
                    final_points = program["max_points_per_transaction"]
                
                # Award points
                if final_points > 0:
                    transaction_result = await self.process_points_transaction(
                        barbershop_id=barbershop_id,
                        transaction_data={
                            "customer_id": customer_id,
                            "loyalty_program_id": enrollment["loyalty_program_id"],
                            "transaction_type": "earned",
                            "points_amount": final_points,
                            "source_type": "appointment",
                            "source_id": appointment_id,
                            "earning_rate": points_per_dollar,
                            "base_amount": service_amount,
                            "multiplier": tier_multiplier,
                            "description": f"Points earned from appointment completion"
                        },
                        processed_by_user_id="system"
                    )
                    
                    total_points_awarded += final_points
                    transactions.append(transaction_result)
            
            return {
                "points_awarded": total_points_awarded,
                "transactions": transactions,
                "appointment_id": appointment_id
            }
            
        except Exception as e:
            logger.error(f"Error processing appointment completion: {str(e)}")
            raise e
    
    async def process_review_submission(self, customer_id: str, appointment_id: str, rating: int, barbershop_id: str) -> Dict[str, Any]:
        """Process review submission and award bonus points"""
        try:
            # Get customer's active loyalty enrollments
            enrollments_result = self.supabase.table("loyalty_program_enrollments").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).eq("is_active", True).execute()
            
            if not enrollments_result.data:
                return {"points_awarded": 0, "message": "Customer not enrolled in loyalty program"}
            
            total_points_awarded = 0
            
            # Process each enrollment
            for enrollment in enrollments_result.data:
                # Get loyalty program details
                program = await self.get_loyalty_program(enrollment["loyalty_program_id"], barbershop_id)
                if not program or not program.get("is_active"):
                    continue
                
                # Calculate review bonus points
                earning_rules = program.get("earning_rules", {})
                bonus_multipliers = earning_rules.get("bonus_multipliers", {})
                
                # Base review bonus
                review_bonus = bonus_multipliers.get("review_bonus", 50)
                
                # Bonus for high ratings
                if rating >= 5:
                    review_bonus = int(review_bonus * bonus_multipliers.get("excellent_review_multiplier", 1.5))
                elif rating >= 4:
                    review_bonus = int(review_bonus * bonus_multipliers.get("good_review_multiplier", 1.2))
                
                # Award bonus points
                if review_bonus > 0:
                    await self.process_points_transaction(
                        barbershop_id=barbershop_id,
                        transaction_data={
                            "customer_id": customer_id,
                            "loyalty_program_id": enrollment["loyalty_program_id"],
                            "transaction_type": "bonus",
                            "points_amount": review_bonus,
                            "source_type": "review",
                            "source_id": appointment_id,
                            "description": f"Bonus points for {rating}-star review"
                        },
                        processed_by_user_id="system"
                    )
                    
                    total_points_awarded += review_bonus
            
            return {
                "points_awarded": total_points_awarded,
                "rating": rating,
                "appointment_id": appointment_id
            }
            
        except Exception as e:
            logger.error(f"Error processing review submission: {str(e)}")
            raise e
    
    # ============================================
    # BULK OPERATIONS
    # ============================================
    
    async def bulk_enroll_customers(self, program_id: str, customer_ids: List[str], barbershop_id: str) -> Dict[str, Any]:
        """Bulk enroll customers into loyalty program"""
        try:
            successfully_enrolled = []
            failed_enrollments = []
            
            for customer_id in customer_ids:
                try:
                    # Check if customer already enrolled
                    existing_result = self.supabase.table("loyalty_program_enrollments").select("id").eq("customer_id", customer_id).eq("loyalty_program_id", program_id).execute()
                    
                    if existing_result.data:
                        failed_enrollments.append({"customer_id": customer_id, "reason": "Already enrolled"})
                        continue
                    
                    # Create enrollment
                    enrollment_record = {
                        "id": str(uuid.uuid4()),
                        "barbershop_id": barbershop_id,
                        "customer_id": customer_id,
                        "loyalty_program_id": program_id,
                        "enrolled_at": datetime.utcnow().isoformat(),
                        "enrollment_method": "bulk_manual",
                        "status": "active",
                        "current_points": 0,
                        "lifetime_points_earned": 0,
                        "lifetime_points_redeemed": 0,
                        "member_since": date.today().isoformat(),
                        "is_active": True,
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    result = self.supabase.table("loyalty_program_enrollments").insert(enrollment_record).execute()
                    if result.data:
                        successfully_enrolled.append(customer_id)
                    else:
                        failed_enrollments.append({"customer_id": customer_id, "reason": "Database insertion failed"})
                        
                except Exception as e:
                    failed_enrollments.append({"customer_id": customer_id, "reason": str(e)})
            
            return {
                "total_requested": len(customer_ids),
                "enrolled_count": len(successfully_enrolled),
                "failed_count": len(failed_enrollments),
                "successfully_enrolled": successfully_enrolled,
                "failed_enrollments": failed_enrollments
            }
            
        except Exception as e:
            logger.error(f"Error bulk enrolling customers: {str(e)}")
            raise e
    
    async def bulk_award_points(self, customer_ids: List[str], points_amount: int, reason: str, program_id: Optional[str], barbershop_id: str, processed_by_user_id: str) -> Dict[str, Any]:
        """Bulk award points to multiple customers"""
        try:
            successfully_awarded = []
            failed_awards = []
            
            for customer_id in customer_ids:
                try:
                    # Get customer enrollment
                    query = self.supabase.table("loyalty_program_enrollments").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).eq("is_active", True)
                    if program_id:
                        query = query.eq("loyalty_program_id", program_id)
                    
                    enrollment_result = query.execute()
                    if not enrollment_result.data:
                        failed_awards.append({"customer_id": customer_id, "reason": "Not enrolled in loyalty program"})
                        continue
                    
                    enrollment = enrollment_result.data[0]
                    
                    # Award points
                    await self.process_points_transaction(
                        barbershop_id=barbershop_id,
                        transaction_data={
                            "customer_id": customer_id,
                            "loyalty_program_id": enrollment["loyalty_program_id"],
                            "transaction_type": "bonus",
                            "points_amount": points_amount,
                            "source_type": "bulk_award",
                            "description": reason
                        },
                        processed_by_user_id=processed_by_user_id
                    )
                    
                    successfully_awarded.append(customer_id)
                    
                except Exception as e:
                    failed_awards.append({"customer_id": customer_id, "reason": str(e)})
            
            return {
                "total_requested": len(customer_ids),
                "points_awarded_count": len(successfully_awarded),
                "failed_count": len(failed_awards),
                "successfully_awarded": successfully_awarded,
                "failed_awards": failed_awards
            }
            
        except Exception as e:
            logger.error(f"Error bulk awarding points: {str(e)}")
            raise e
    
    # ============================================
    # NOTIFICATION METHODS (Background Tasks)
    # ============================================
    
    async def send_points_earned_notification(self, customer_id: str, points_amount: int, barbershop_id: str):
        """Send notification for points earned"""
        # Implementation would integrate with notification service
        logger.info(f"Would send points earned notification to customer {customer_id}: {points_amount} points")
    
    async def send_redemption_notification(self, customer_id: str, reward_name: str, barbershop_id: str):
        """Send notification for reward redemption"""
        logger.info(f"Would send redemption notification to customer {customer_id}: {reward_name}")
    
    async def send_tier_upgrade_notification(self, customer_id: str, new_tier_name: str, barbershop_id: str):
        """Send notification for tier upgrade"""
        logger.info(f"Would send tier upgrade notification to customer {customer_id}: {new_tier_name}")
    
    async def send_referral_invitation(self, referral_id: str, barbershop_id: str):
        """Send referral invitation"""
        logger.info(f"Would send referral invitation for referral {referral_id}")
    
    async def send_referral_reward_notification(self, referral_id: str, barbershop_id: str):
        """Send referral reward notification"""
        logger.info(f"Would send referral reward notification for referral {referral_id}")
    
    async def send_bulk_tier_upgrade_notifications(self, upgrades: List[Dict], barbershop_id: str):
        """Send bulk tier upgrade notifications"""
        logger.info(f"Would send {len(upgrades)} tier upgrade notifications")
    
    async def send_birthday_bonus_notifications(self, customers: List[Dict], barbershop_id: str):
        """Send birthday bonus notifications"""
        logger.info(f"Would send {len(customers)} birthday bonus notifications")
    
    async def send_bulk_welcome_notifications(self, program_id: str, customer_ids: List[str], barbershop_id: str):
        """Send bulk welcome notifications"""
        logger.info(f"Would send {len(customer_ids)} welcome notifications for program {program_id}")
    
    async def send_bulk_points_awarded_notifications(self, customer_ids: List[str], points_amount: int, reason: str, barbershop_id: str):
        """Send bulk points awarded notifications"""
        logger.info(f"Would send {len(customer_ids)} points awarded notifications: {points_amount} points")
    
    async def send_review_bonus_notification(self, customer_id: str, points_amount: int, barbershop_id: str):
        """Send review bonus notification"""
        logger.info(f"Would send review bonus notification to customer {customer_id}: {points_amount} points")
    
    # ============================================
    # PRIVATE HELPER METHODS
    # ============================================
    
    def _validate_program_data(self, program_data: Dict[str, Any]):
        """Validate loyalty program data"""
        required_fields = ["program_name", "program_type", "earning_rules", "redemption_rules"]
        for field in required_fields:
            if field not in program_data:
                raise Exception(f"Missing required field: {field}")
        
        if program_data["program_type"] not in ["points", "visits", "spending", "tier", "hybrid"]:
            raise Exception("Invalid program type")
    
    async def _create_default_tiers(self, program_id: str, barbershop_id: str):
        """Create default tiers for tier-based programs"""
        default_tiers = [
            {
                "tier_name": "Bronze",
                "tier_description": "Starting tier for new members",
                "tier_level": 1,
                "qualification_criteria": {"points_required": 0},
                "benefits": {"point_multiplier": 1.0},
                "color_code": "#CD7F32"
            },
            {
                "tier_name": "Silver", 
                "tier_description": "Intermediate tier for regular customers",
                "tier_level": 2,
                "qualification_criteria": {"points_required": 500},
                "benefits": {"point_multiplier": 1.25, "discount_percentage": 5},
                "color_code": "#C0C0C0"
            },
            {
                "tier_name": "Gold",
                "tier_description": "Premium tier for valued customers",
                "tier_level": 3,
                "qualification_criteria": {"points_required": 1500},
                "benefits": {"point_multiplier": 1.5, "discount_percentage": 10, "priority_booking": True},
                "color_code": "#FFD700"
            },
            {
                "tier_name": "Platinum",
                "tier_description": "Elite tier for VIP customers", 
                "tier_level": 4,
                "qualification_criteria": {"points_required": 3000},
                "benefits": {"point_multiplier": 2.0, "discount_percentage": 15, "priority_booking": True, "exclusive_offers": True},
                "color_code": "#E5E4E2"
            }
        ]
        
        for tier_data in default_tiers:
            tier_data["loyalty_program_id"] = program_id
            await self.create_loyalty_tier(barbershop_id, tier_data)
    
    async def _get_customer_enrollment(self, customer_id: str, program_id: Optional[str], barbershop_id: str) -> Optional[Dict[str, Any]]:
        """Get customer enrollment in loyalty program"""
        query = self.supabase.table("loyalty_program_enrollments").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).eq("is_active", True)
        
        if program_id:
            query = query.eq("loyalty_program_id", program_id)
        
        result = query.execute()
        if result.data:
            return result.data[0] if program_id else result.data[-1]  # Get latest if no specific program
        return None
    
    async def _get_customer_analytics(self, customer_id: str, barbershop_id: str) -> Dict[str, Any]:
        """Get customer analytics for tier calculations"""
        # This would typically pull from customer_analytics_summary table
        # For now, return basic mock data
        return {
            "total_visits": 10,
            "total_spent": 500.00,
            "visit_frequency": 2.5,
            "last_visit_days_ago": 7,
            "average_rating": 4.8
        }
    
    async def _meets_tier_requirements(self, tier: Dict[str, Any], analytics: Dict[str, Any]) -> bool:
        """Check if customer meets tier requirements"""
        criteria = tier.get("qualification_criteria", {})
        
        # Check points requirement
        if "points_required" in criteria:
            # Would need to check actual points balance
            pass
        
        # Check other criteria
        if "visits_required" in criteria and analytics.get("total_visits", 0) < criteria["visits_required"]:
            return False
        
        if "spending_required" in criteria and analytics.get("total_spent", 0) < criteria["spending_required"]:
            return False
        
        return True
    
    async def _calculate_tier_progress(self, customer_id: str, program_id: str, barbershop_id: str) -> Dict[str, Any]:
        """Calculate customer's progress toward next tier"""
        # Get customer's current points and tier
        enrollment = await self._get_customer_enrollment(customer_id, program_id, barbershop_id)
        if not enrollment:
            return {"tier_progress": 0, "next_tier_threshold": None}
        
        current_points = enrollment.get("current_points", 0)
        current_tier = enrollment.get("current_tier")
        
        # Get tiers for this program
        tiers = await self.get_loyalty_tiers(barbershop_id, program_id)
        
        # Find current tier level
        current_tier_level = 0
        if current_tier:
            tier_obj = next((t for t in tiers if t["tier_name"] == current_tier), None)
            if tier_obj:
                current_tier_level = tier_obj["tier_level"]
        
        # Find next tier
        next_tier = next((t for t in tiers if t["tier_level"] == current_tier_level + 1), None)
        if not next_tier:
            return {"tier_progress": 100, "next_tier_threshold": None}
        
        # Calculate progress
        next_tier_points = next_tier.get("qualification_criteria", {}).get("points_required", 0)
        current_tier_points = 0
        
        if current_tier_level > 0:
            current_tier_obj = next((t for t in tiers if t["tier_level"] == current_tier_level), None)
            if current_tier_obj:
                current_tier_points = current_tier_obj.get("qualification_criteria", {}).get("points_required", 0)
        
        points_needed = next_tier_points - current_tier_points
        points_progress = max(0, current_points - current_tier_points)
        progress_percentage = min(100, (points_progress / points_needed) * 100) if points_needed > 0 else 100
        
        return {
            "tier_progress": round(progress_percentage, 2),
            "next_tier_threshold": next_tier_points,
            "points_to_next_tier": max(0, next_tier_points - current_points)
        }
    
    async def _calculate_tier_requirement_progress(self, tier: Dict[str, Any], analytics: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate progress toward tier requirements"""
        criteria = tier.get("qualification_criteria", {})
        progress = {}
        
        if "points_required" in criteria:
            current_points = analytics.get("current_points", 0)
            required_points = criteria["points_required"]
            progress["points"] = {
                "current": current_points,
                "required": required_points,
                "percentage": min(100, (current_points / required_points) * 100) if required_points > 0 else 100
            }
        
        if "visits_required" in criteria:
            current_visits = analytics.get("total_visits", 0)
            required_visits = criteria["visits_required"]
            progress["visits"] = {
                "current": current_visits,
                "required": required_visits,
                "percentage": min(100, (current_visits / required_visits) * 100) if required_visits > 0 else 100
            }
        
        if "spending_required" in criteria:
            current_spending = analytics.get("total_spent", 0)
            required_spending = criteria["spending_required"]
            progress["spending"] = {
                "current": current_spending,
                "required": required_spending,
                "percentage": min(100, (current_spending / required_spending) * 100) if required_spending > 0 else 100
            }
        
        return progress
    
    async def _check_and_process_tier_upgrade(self, customer_id: str, program_id: str, barbershop_id: str) -> Dict[str, Any]:
        """Check and automatically process tier upgrades"""
        upgrade_info = await self.check_tier_upgrade_eligibility(customer_id, barbershop_id, program_id)
        
        if upgrade_info.get("eligible"):
            try:
                result = await self.upgrade_customer_tier(
                    customer_id,
                    upgrade_info["next_tier"]["id"],
                    barbershop_id,
                    "system"
                )
                return {"upgraded": True, "new_tier_name": result["new_tier_name"]}
            except Exception as e:
                logger.error(f"Failed to auto-upgrade customer tier: {str(e)}")
        
        return {"upgraded": False}
    
    async def _create_tier_upgrade_milestone(self, customer_id: str, barbershop_id: str, tier_name: str):
        """Create milestone for tier upgrade"""
        milestone_record = {
            "id": str(uuid.uuid4()),
            "barbershop_id": barbershop_id,
            "customer_id": customer_id,
            "milestone_type": "tier_upgrade",
            "milestone_name": f"Achieved {tier_name} Tier",
            "milestone_description": f"Customer upgraded to {tier_name} tier",
            "achieved_at": datetime.utcnow().isoformat(),
            "achievement_method": "automatic",
            "is_celebrated": False,
            "importance_level": 3,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        self.supabase.table("customer_milestones").insert(milestone_record).execute()
    
    def _determine_reward_type(self, reward_string: str) -> str:
        """Determine reward type from reward string"""
        reward_lower = reward_string.lower()
        if "discount" in reward_lower or "%" in reward_lower:
            return "discount"
        elif "free" in reward_lower:
            return "free_service"
        elif "product" in reward_lower:
            return "product"
        elif "cash" in reward_lower or "$" in reward_lower:
            return "cash_back"
        else:
            return "other"
    
    def _generate_redemption_code(self) -> str:
        """Generate unique redemption code"""
        import string
        import random
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    async def _generate_unique_referral_code(self, barbershop_id: str) -> str:
        """Generate unique referral code"""
        import string
        import random
        
        for _ in range(10):  # Try up to 10 times
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            
            # Check if code already exists
            existing = self.supabase.table("referral_tracking").select("id").eq("barbershop_id", barbershop_id).eq("referral_code", code).execute()
            if not existing.data:
                return code
        
        # Fallback to UUID if can't generate unique short code
        return str(uuid.uuid4())[:8].upper()
    
    async def _check_referral_qualification(self, referral: Dict[str, Any], new_status: str) -> bool:
        """Check if referral qualifies for rewards"""
        qualification_requirements = referral.get("qualification_requirements", {})
        
        # Default qualification is first visit
        if new_status == "first_visit" and not qualification_requirements:
            return True
        
        # Check specific requirements
        if new_status == "qualified":
            return True
        
        return False
    
    async def _process_referral_rewards(self, referral: Dict[str, Any], barbershop_id: str):
        """Process referral rewards for both referrer and referee"""
        # Award points to referrer
        if referral.get("referrer_reward_type") == "points" and referral.get("referrer_reward_value"):
            await self.process_points_transaction(
                barbershop_id=barbershop_id,
                transaction_data={
                    "customer_id": referral["referrer_customer_id"],
                    "loyalty_program_id": referral.get("loyalty_program_id"),  # Would need to determine this
                    "transaction_type": "bonus",
                    "points_amount": int(referral["referrer_reward_value"]),
                    "source_type": "referral_reward",
                    "source_id": referral["id"],
                    "description": f"Referral reward for {referral['referral_code']}"
                },
                processed_by_user_id="system"
            )
        
        # Award points to referee if they have an account
        if referral.get("referee_customer_id") and referral.get("referee_reward_type") == "points" and referral.get("referee_reward_value"):
            await self.process_points_transaction(
                barbershop_id=barbershop_id,
                transaction_data={
                    "customer_id": referral["referee_customer_id"],
                    "loyalty_program_id": referral.get("loyalty_program_id"),
                    "transaction_type": "bonus",
                    "points_amount": int(referral["referee_reward_value"]),
                    "source_type": "referral_reward",
                    "source_id": referral["id"],
                    "description": f"Welcome referral bonus from {referral['referral_code']}"
                },
                processed_by_user_id="system"
            )
    
    def _get_position_badge(self, position: int) -> Optional[str]:
        """Get badge for leaderboard position"""
        if position == 1:
            return "🥇"
        elif position == 2:
            return "🥈"
        elif position == 3:
            return "🥉"
        elif position <= 10:
            return "⭐"
        else:
            return None
    
    async def _calculate_customer_achievements(self, customer_id: str, barbershop_id: str, analytics: Dict[str, Any], milestones: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate customer achievements and badges"""
        achievements = {
            "badges": [],
            "streaks": {},
            "special_achievements": []
        }
        
        # Visit-based achievements
        total_visits = analytics.get("total_visits", 0)
        if total_visits >= 100:
            achievements["badges"].append({"name": "Century Club", "icon": "🏆", "description": "100+ visits"})
        elif total_visits >= 50:
            achievements["badges"].append({"name": "Loyal Customer", "icon": "🥇", "description": "50+ visits"})
        elif total_visits >= 10:
            achievements["badges"].append({"name": "Regular", "icon": "⭐", "description": "10+ visits"})
        
        # Spending-based achievements  
        total_spent = analytics.get("total_spent", 0)
        if total_spent >= 5000:
            achievements["badges"].append({"name": "High Roller", "icon": "💎", "description": "$5000+ spent"})
        elif total_spent >= 1000:
            achievements["badges"].append({"name": "Big Spender", "icon": "💰", "description": "$1000+ spent"})
        
        # Review-based achievements
        avg_rating = analytics.get("average_rating", 0)
        if avg_rating >= 4.8:
            achievements["badges"].append({"name": "5-Star Reviewer", "icon": "⭐⭐⭐⭐⭐", "description": "Consistently excellent reviews"})
        
        return achievements
    
    async def _calculate_points_summary(self, customer_id: str, barbershop_id: str, program_id: Optional[str]) -> Dict[str, Any]:
        """Calculate points transaction summary"""
        # Build query
        query = self.supabase.table("loyalty_points").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id)
        if program_id:
            query = query.eq("loyalty_program_id", program_id)
        
        result = query.execute()
        transactions = result.data or []
        
        # Calculate summary
        total_earned = sum(t["points_amount"] for t in transactions if t["points_amount"] > 0)
        total_redeemed = abs(sum(t["points_amount"] for t in transactions if t["points_amount"] < 0))
        
        return {
            "total_earned": total_earned,
            "total_redeemed": total_redeemed,
            "net_points": total_earned - total_redeemed,
            "transaction_count": len(transactions)
        }
    
    def _is_recent_activity(self, created_at: str) -> bool:
        """Check if activity is recent (within last 30 days)"""
        try:
            activity_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            return activity_date > thirty_days_ago
        except:
            return False
    
    async def _clear_program_cache(self, barbershop_id: str, program_id: Optional[str] = None):
        """Clear program-related cache"""
        if program_id:
            self.redis.delete(f"loyalty_program:{program_id}")
        # Clear other related cache keys as needed
    
    async def _clear_customer_cache(self, customer_id: str, barbershop_id: str):
        """Clear customer-related cache"""
        pattern = f"customer_balance:{customer_id}:{barbershop_id}*"
        # Would implement cache clearing logic based on Redis pattern matching
        pass