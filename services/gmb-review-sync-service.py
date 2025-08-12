#!/usr/bin/env python3
"""
Google My Business Review Sync Service
Handles synchronization of reviews, automated responses, and real-time processing
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import aiohttp
import asyncpg
import os
from dataclasses import dataclass

from ai_review_attribution_engine import AIReviewAttributionEngine, BarberProfile

logger = logging.getLogger(__name__)

@dataclass
class GMBAccount:
    """GMB account configuration"""
    id: str
    barbershop_id: str
    gmb_account_id: str
    gmb_location_id: str
    access_token: str
    refresh_token: Optional[str]
    token_expires_at: datetime
    business_name: str

@dataclass
class GMBReview:
    """GMB review data structure"""
    google_review_id: str
    reviewer_name: str
    review_text: str
    star_rating: int
    review_date: datetime
    reviewer_profile_photo_url: Optional[str] = None
    review_url: Optional[str] = None

class GMBReviewSyncService:
    """
    Service for synchronizing Google My Business reviews and automating responses
    """
    
    def __init__(self, database_url: str, openai_api_key: str, anthropic_api_key: str):
        self.database_url = database_url
        self.db_pool = None
        
        # Initialize AI attribution engine
        self.attribution_engine = AIReviewAttributionEngine(
            openai_api_key=openai_api_key,
            anthropic_api_key=anthropic_api_key
        )
        
        # GMB API configuration
        self.gmb_api_base = "https://mybusiness.googleapis.com/v4"
        
    async def initialize(self):
        """Initialize database connection pool"""
        self.db_pool = await asyncpg.create_pool(
            self.database_url,
            min_size=2,
            max_size=10
        )
        logger.info("GMB Review Sync Service initialized")
    
    async def sync_all_accounts(self):
        """Sync reviews for all active GMB accounts"""
        try:
            accounts = await self._get_active_gmb_accounts()
            logger.info(f"Starting sync for {len(accounts)} GMB accounts")
            
            # Process accounts concurrently
            tasks = [self.sync_account_reviews(account) for account in accounts]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            success_count = sum(1 for result in results if not isinstance(result, Exception))
            error_count = len(results) - success_count
            
            logger.info(f"Sync completed: {success_count} successful, {error_count} errors")
            
        except Exception as e:
            logger.error(f"Error in sync_all_accounts: {e}")
    
    async def sync_account_reviews(self, account: GMBAccount) -> Dict[str, Any]:
        """Sync reviews for a specific GMB account"""
        sync_id = None
        try:
            # Create sync log entry
            sync_id = await self._create_sync_log(account.id, 'reviews')
            
            # Check if token needs refresh
            if self._token_needs_refresh(account):
                account = await self._refresh_access_token(account)
            
            # Fetch new reviews from GMB API
            new_reviews = await self._fetch_new_reviews(account)
            
            if not new_reviews:
                await self._complete_sync_log(sync_id, 'completed', 0, 0, 0)
                return {'status': 'no_new_reviews', 'account_id': account.id}
            
            # Process reviews with AI attribution
            processed_count = 0
            success_count = 0
            error_count = 0
            
            for review_data in new_reviews:
                try:
                    # Save review to database
                    review_id = await self._save_review(account.id, review_data)
                    
                    # Get barbershop staff for attribution
                    staff = await self._get_barbershop_staff(account.barbershop_id)
                    
                    # Perform AI attribution analysis
                    attribution = await self.attribution_engine.analyze_review(
                        review_text=review_data.review_text,
                        review_id=review_id,
                        barbershop_staff=staff
                    )
                    
                    # Save attribution results
                    await self._save_review_attribution(attribution)
                    
                    # Generate automated response if enabled
                    await self._generate_automated_response(account, review_data, attribution)
                    
                    success_count += 1
                    processed_count += 1
                    
                except Exception as review_error:
                    logger.error(f"Error processing review {review_data.google_review_id}: {review_error}")
                    error_count += 1
                    processed_count += 1
            
            # Update sync log
            await self._complete_sync_log(sync_id, 'completed', processed_count, success_count, error_count)
            
            # Trigger metrics recalculation
            await self._trigger_metrics_update(account.barbershop_id)
            
            logger.info(f"Account {account.id} sync completed: {success_count}/{processed_count} successful")
            
            return {
                'status': 'success',
                'account_id': account.id,
                'processed': processed_count,
                'successful': success_count,
                'errors': error_count
            }
            
        except Exception as e:
            logger.error(f"Error syncing account {account.id}: {e}")
            if sync_id:
                await self._complete_sync_log(sync_id, 'failed', 0, 0, 0, str(e))
            
            return {
                'status': 'error',
                'account_id': account.id,
                'error': str(e)
            }
    
    async def _get_active_gmb_accounts(self) -> List[GMBAccount]:
        """Get all active GMB accounts that need syncing"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, barbershop_id, gmb_account_id, gmb_location_id,
                       access_token, refresh_token, token_expires_at, business_name
                FROM gmb_accounts 
                WHERE is_active = true
                ORDER BY last_sync_at ASC NULLS FIRST
            """)
            
            return [
                GMBAccount(
                    id=str(row['id']),
                    barbershop_id=str(row['barbershop_id']),
                    gmb_account_id=row['gmb_account_id'],
                    gmb_location_id=row['gmb_location_id'],
                    access_token=row['access_token'],
                    refresh_token=row['refresh_token'],
                    token_expires_at=row['token_expires_at'],
                    business_name=row['business_name']
                )
                for row in rows
            ]
    
    def _token_needs_refresh(self, account: GMBAccount) -> bool:
        """Check if access token needs refresh"""
        return account.token_expires_at <= datetime.now() + timedelta(minutes=5)
    
    async def _refresh_access_token(self, account: GMBAccount) -> GMBAccount:
        """Refresh expired access token"""
        if not account.refresh_token:
            raise Exception("No refresh token available")
        
        token_url = "https://oauth2.googleapis.com/token"
        
        async with aiohttp.ClientSession() as session:
            data = {
                'client_id': os.getenv('GOOGLE_CLIENT_ID'),
                'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
                'refresh_token': account.refresh_token,
                'grant_type': 'refresh_token'
            }
            
            async with session.post(token_url, data=data) as response:
                if not response.ok:
                    raise Exception(f"Token refresh failed: {response.status}")
                
                token_data = await response.json()
                
                # Update account with new token
                new_expires_at = datetime.now() + timedelta(seconds=token_data['expires_in'])
                
                async with self.db_pool.acquire() as conn:
                    await conn.execute("""
                        UPDATE gmb_accounts 
                        SET access_token = $1, token_expires_at = $2, updated_at = NOW()
                        WHERE id = $3
                    """, token_data['access_token'], new_expires_at, account.id)
                
                # Return updated account
                account.access_token = token_data['access_token']
                account.token_expires_at = new_expires_at
                
                logger.info(f"Refreshed access token for account {account.id}")
                return account
    
    async def _fetch_new_reviews(self, account: GMBAccount) -> List[GMBReview]:
        """Fetch new reviews from GMB API"""
        try:
            # Get last sync timestamp to only fetch new reviews
            last_sync = await self._get_last_sync_timestamp(account.id)
            
            # Build GMB API URL
            url = f"{self.gmb_api_base}/{account.gmb_location_id}/reviews"
            
            headers = {
                'Authorization': f'Bearer {account.access_token}',
                'Content-Type': 'application/json'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if not response.ok:
                        raise Exception(f"GMB API error: {response.status}")
                    
                    data = await response.json()
                    reviews_data = data.get('reviews', [])
                    
                    # Filter to only new reviews
                    new_reviews = []
                    for review_data in reviews_data:
                        review_date = self._parse_gmb_date(review_data.get('createTime'))
                        if not last_sync or review_date > last_sync:
                            new_reviews.append(GMBReview(
                                google_review_id=review_data['name'],
                                reviewer_name=review_data.get('reviewer', {}).get('displayName', 'Anonymous'),
                                review_text=review_data.get('comment', ''),
                                star_rating=review_data.get('starRating', 5),
                                review_date=review_date,
                                reviewer_profile_photo_url=review_data.get('reviewer', {}).get('profilePhotoUrl'),
                                review_url=f"https://www.google.com/maps/reviews/{review_data['name']}"
                            ))
                    
                    logger.info(f"Fetched {len(new_reviews)} new reviews for account {account.id}")
                    return new_reviews
                    
        except Exception as e:
            logger.error(f"Error fetching reviews for account {account.id}: {e}")
            raise
    
    async def _get_last_sync_timestamp(self, account_id: str) -> Optional[datetime]:
        """Get timestamp of last successful review sync"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT MAX(review_date) as last_review_date
                FROM gmb_reviews gr
                JOIN gmb_accounts ga ON gr.gmb_account_id = ga.id
                WHERE ga.id = $1
            """, account_id)
            
            return row['last_review_date'] if row else None
    
    def _parse_gmb_date(self, date_string: str) -> datetime:
        """Parse GMB API date format to datetime"""
        try:
            # GMB API returns dates in RFC3339 format
            return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        except:
            return datetime.now()
    
    async def _save_review(self, account_id: str, review: GMBReview) -> str:
        """Save review to database"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO gmb_reviews (
                    gmb_account_id, google_review_id, reviewer_name, reviewer_profile_photo_url,
                    review_text, star_rating, review_date, review_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (google_review_id) DO UPDATE SET
                    review_text = EXCLUDED.review_text,
                    star_rating = EXCLUDED.star_rating,
                    updated_at = NOW()
                RETURNING id
            """, 
            account_id, review.google_review_id, review.reviewer_name,
            review.reviewer_profile_photo_url, review.review_text, 
            review.star_rating, review.review_date, review.review_url)
            
            return str(row['id'])
    
    async def _get_barbershop_staff(self, barbershop_id: str) -> List[BarberProfile]:
        """Get barbershop staff for attribution matching"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT bs.id, bs.first_name, bs.last_name, 
                       array_agg(DISTINCT bna.alias_name) FILTER (WHERE bna.alias_name IS NOT NULL) as aliases
                FROM barbershop_staff bs
                LEFT JOIN barber_name_aliases bna ON bs.id = bna.barber_id AND bna.is_active = true
                WHERE bs.barbershop_id = $1 AND bs.is_active = true
                GROUP BY bs.id, bs.first_name, bs.last_name
            """, barbershop_id)
            
            return [
                BarberProfile(
                    id=str(row['id']),
                    first_name=row['first_name'],
                    last_name=row['last_name'],
                    aliases=list(row['aliases']) if row['aliases'] else [],
                    barbershop_id=barbershop_id
                )
                for row in rows
            ]
    
    async def _save_review_attribution(self, attribution):
        """Save AI attribution results to database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO gmb_review_attributions (
                    review_id, barber_id, confidence_level, confidence_score,
                    sentiment, sentiment_score, mentioned_phrases, extracted_names, ai_reasoning
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (review_id) DO UPDATE SET
                    barber_id = EXCLUDED.barber_id,
                    confidence_level = EXCLUDED.confidence_level,
                    confidence_score = EXCLUDED.confidence_score,
                    sentiment = EXCLUDED.sentiment,
                    sentiment_score = EXCLUDED.sentiment_score,
                    mentioned_phrases = EXCLUDED.mentioned_phrases,
                    extracted_names = EXCLUDED.extracted_names,
                    ai_reasoning = EXCLUDED.ai_reasoning,
                    updated_at = NOW()
            """,
            attribution.review_id, attribution.barber_id, attribution.confidence.value,
            attribution.confidence_score, attribution.sentiment.value, attribution.sentiment_score,
            attribution.mentioned_phrases, attribution.extracted_names, attribution.reasoning)
    
    async def _generate_automated_response(self, account: GMBAccount, review: GMBReview, attribution):
        """Generate and queue automated response to review"""
        # This would generate AI responses and queue them for approval/posting
        # Implementation depends on business rules for auto-response
        pass
    
    async def _create_sync_log(self, account_id: str, sync_type: str) -> str:
        """Create sync log entry"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO gmb_sync_logs (gmb_account_id, sync_type, sync_status, started_at)
                VALUES ($1, $2, 'started', NOW())
                RETURNING id
            """, account_id, sync_type)
            
            return str(row['id'])
    
    async def _complete_sync_log(self, sync_id: str, status: str, processed: int, 
                                 success: int, failed: int, error_message: str = None):
        """Complete sync log entry"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                UPDATE gmb_sync_logs 
                SET sync_status = $2, completed_at = NOW(),
                    duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at)),
                    items_processed = $3, items_success = $4, items_failed = $5,
                    error_message = $6
                WHERE id = $1
            """, sync_id, status, processed, success, failed, error_message)
    
    async def _trigger_metrics_update(self, barbershop_id: str):
        """Trigger barber metrics recalculation"""
        # This would typically queue a background job to recalculate metrics
        logger.info(f"Triggering metrics update for barbershop {barbershop_id}")

# Background service runner
async def run_continuous_sync():
    """Run continuous review sync service"""
    service = GMBReviewSyncService(
        database_url=os.getenv('DATABASE_URL'),
        openai_api_key=os.getenv('OPENAI_API_KEY'),
        anthropic_api_key=os.getenv('ANTHROPIC_API_KEY')
    )
    
    await service.initialize()
    
    logger.info("Starting continuous GMB review sync")
    
    while True:
        try:
            await service.sync_all_accounts()
            # Wait 15 minutes between sync cycles
            await asyncio.sleep(15 * 60)
        except Exception as e:
            logger.error(f"Error in continuous sync: {e}")
            # Wait 5 minutes before retrying on error
            await asyncio.sleep(5 * 60)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_continuous_sync())