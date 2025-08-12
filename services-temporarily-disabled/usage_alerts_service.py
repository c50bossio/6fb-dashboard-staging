"""
Usage Alerts Service - Automated notifications for token usage and billing
Proactive alerts to prevent service interruptions and encourage upgrades
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import sqlite3
import aiosqlite
from token_billing_service import TokenBillingService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class UsageAlert:
    """Usage alert configuration"""
    tenant_id: str
    alert_type: str  # 'usage_warning', 'usage_critical', 'trial_ending', 'payment_failed'
    threshold: float  # Percentage or days
    message: str
    action_required: bool
    created_at: datetime
    sent_at: Optional[datetime] = None

class UsageAlertsService:
    """Automated usage monitoring and alert system"""
    
    def __init__(self, db_path: str = "billing_system.db"):
        self.db_path = db_path
        self.billing_service = TokenBillingService(db_path)
        
        # Alert thresholds
        self.USAGE_WARNING_THRESHOLD = 80.0  # 80% of included tokens
        self.USAGE_CRITICAL_THRESHOLD = 95.0  # 95% of included tokens
        self.TRIAL_WARNING_DAYS = 3  # 3 days before trial ends
        self.TRIAL_CRITICAL_DAYS = 1  # 1 day before trial ends
        
    async def initialize(self):
        """Initialize alerts service database"""
        await self.billing_service.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript("""
                -- Usage alerts tracking
                CREATE TABLE IF NOT EXISTS usage_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    threshold_value REAL NOT NULL,
                    current_value REAL NOT NULL,
                    message TEXT NOT NULL,
                    action_required BOOLEAN DEFAULT FALSE,
                    sent_at DATETIME,
                    acknowledged_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Alert preferences per tenant
                CREATE TABLE IF NOT EXISTS alert_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT UNIQUE NOT NULL,
                    email_alerts BOOLEAN DEFAULT TRUE,
                    sms_alerts BOOLEAN DEFAULT FALSE,
                    in_app_alerts BOOLEAN DEFAULT TRUE,
                    usage_warning_enabled BOOLEAN DEFAULT TRUE,
                    usage_critical_enabled BOOLEAN DEFAULT TRUE,
                    trial_alerts_enabled BOOLEAN DEFAULT TRUE,
                    billing_alerts_enabled BOOLEAN DEFAULT TRUE,
                    custom_thresholds TEXT, -- JSON for custom alert thresholds
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON usage_alerts(tenant_id, alert_type);
                CREATE INDEX IF NOT EXISTS idx_alert_prefs_tenant ON alert_preferences(tenant_id);
            """)
            await db.commit()
    
    async def check_all_tenants_usage(self):
        """Check usage for all active tenants and send alerts"""
        logger.info("Starting usage check for all tenants...")
        
        # Get all active tenants
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT DISTINCT tenant_id, status, tier, trial_end 
                FROM tenant_subscriptions 
                WHERE status IN ('trial', 'active')
            """)
            tenants = await cursor.fetchall()
        
        alerts_sent = 0
        for tenant_id, status, tier, trial_end in tenants:
            try:
                alerts = await self.check_tenant_usage(tenant_id)
                alerts_sent += len(alerts)
            except Exception as error:
                logger.error(f"Error checking usage for tenant {tenant_id}: {error}")
        
        logger.info(f"Usage check completed. {alerts_sent} alerts sent across {len(tenants)} tenants.")
        return alerts_sent
    
    async def check_tenant_usage(self, tenant_id: str) -> List[UsageAlert]:
        """Check specific tenant usage and generate alerts"""
        alerts = []
        
        try:
            # Get current usage status
            usage_status = await self.billing_service.check_usage_limits(tenant_id)
            
            if not usage_status or 'error' in usage_status:
                return alerts
            
            # Check token usage alerts
            usage_percentage = usage_status.get('usage_percentage', 0)
            status = usage_status.get('status', 'unknown')
            
            if usage_percentage >= self.USAGE_CRITICAL_THRESHOLD:
                alert = await self._create_usage_critical_alert(tenant_id, usage_status)
                if alert:
                    alerts.append(alert)
            
            elif usage_percentage >= self.USAGE_WARNING_THRESHOLD:
                alert = await self._create_usage_warning_alert(tenant_id, usage_status)
                if alert:
                    alerts.append(alert)
            
            # Check trial ending alerts
            if status == 'trial':
                trial_alert = await self._check_trial_ending(tenant_id, usage_status)
                if trial_alert:
                    alerts.append(trial_alert)
            
            # Check payment/billing alerts
            billing_alert = await self._check_billing_issues(tenant_id, usage_status)
            if billing_alert:
                alerts.append(billing_alert)
            
            # Send all alerts
            for alert in alerts:
                await self._send_alert(alert)
            
        except Exception as error:
            logger.error(f"Error checking tenant {tenant_id} usage: {error}")
        
        return alerts
    
    async def _create_usage_warning_alert(self, tenant_id: str, usage_status: Dict) -> Optional[UsageAlert]:
        """Create usage warning alert (80% threshold)"""
        # Check if we already sent this alert recently
        if await self._alert_recently_sent(tenant_id, 'usage_warning', hours=24):
            return None
        
        usage_percentage = usage_status['usage_percentage']
        tokens_used = usage_status['tokens_used']
        tokens_included = usage_status['tokens_included']
        tokens_remaining = usage_status['tokens_remaining']
        tier = usage_status['tier']
        
        message = f"""
🟡 Usage Warning - You've used {usage_percentage:.1f}% of your monthly AI tokens

Current Usage: {tokens_used:,} / {tokens_included:,} tokens
Remaining: {tokens_remaining:,} tokens
Plan: {tier.title()}

You're approaching your monthly limit. Consider upgrading to avoid overage charges.
"""
        
        alert = UsageAlert(
            tenant_id=tenant_id,
            alert_type='usage_warning',
            threshold=self.USAGE_WARNING_THRESHOLD,
            message=message.strip(),
            action_required=False,
            created_at=datetime.now()
        )
        
        return alert
    
    async def _create_usage_critical_alert(self, tenant_id: str, usage_status: Dict) -> Optional[UsageAlert]:
        """Create critical usage alert (95% threshold)"""
        # Check if we already sent this alert recently
        if await self._alert_recently_sent(tenant_id, 'usage_critical', hours=12):
            return None
        
        usage_percentage = usage_status['usage_percentage']
        tokens_used = usage_status['tokens_used']
        tokens_included = usage_status['tokens_included']
        tokens_remaining = usage_status['tokens_remaining']
        tier = usage_status['tier']
        overage_rate = usage_status['overage_rate']
        
        message = f"""
🔴 CRITICAL: You've used {usage_percentage:.1f}% of your monthly AI tokens

Current Usage: {tokens_used:,} / {tokens_included:,} tokens
Remaining: {tokens_remaining:,} tokens
Plan: {tier.title()}

⚠️ Additional usage will incur overage charges at ${overage_rate:.3f} per 1,000 tokens.

Upgrade now to avoid extra charges and get more included tokens.
"""
        
        alert = UsageAlert(
            tenant_id=tenant_id,
            alert_type='usage_critical',
            threshold=self.USAGE_CRITICAL_THRESHOLD,
            message=message.strip(),
            action_required=True,
            created_at=datetime.now()
        )
        
        return alert
    
    async def _check_trial_ending(self, tenant_id: str, usage_status: Dict) -> Optional[UsageAlert]:
        """Check for trial ending alerts"""
        trial_end = usage_status.get('trial_end')
        if not trial_end:
            return None
        
        trial_end_date = datetime.fromisoformat(trial_end.replace('Z', '+00:00')).replace(tzinfo=None)
        days_remaining = (trial_end_date - datetime.now()).days
        
        alert_type = None
        if days_remaining <= self.TRIAL_CRITICAL_DAYS:
            alert_type = 'trial_ending_critical'
            hours_check = 6  # Send every 6 hours when critical
        elif days_remaining <= self.TRIAL_WARNING_DAYS:
            alert_type = 'trial_ending_warning'
            hours_check = 24  # Send daily when warning
        else:
            return None
        
        # Check if we already sent this alert recently
        if await self._alert_recently_sent(tenant_id, alert_type, hours=hours_check):
            return None
        
        tier = usage_status['tier']
        tokens_used = usage_status['tokens_used']
        
        if days_remaining <= 0:
            message = f"""
🔴 Your free trial has ended!

Your {tier.title()} trial expired on {trial_end_date.strftime('%B %d, %Y')}.
You used {tokens_used:,} AI tokens during your trial.

Upgrade now to continue using AI features and avoid service interruption.
"""
        elif days_remaining == 1:
            message = f"""
🟡 Your free trial ends tomorrow!

Trial End: {trial_end_date.strftime('%B %d, %Y')}
Tokens Used: {tokens_used:,} during trial
Plan: {tier.title()}

Upgrade today to ensure uninterrupted service and unlock advanced features.
"""
        else:
            message = f"""
⏰ Your free trial ends in {days_remaining} days

Trial End: {trial_end_date.strftime('%B %d, %Y')}
Tokens Used: {tokens_used:,} so far
Plan: {tier.title()}

Upgrade anytime to unlock advanced features and avoid service interruption.
"""
        
        alert = UsageAlert(
            tenant_id=tenant_id,
            alert_type=alert_type,
            threshold=days_remaining,
            message=message.strip(),
            action_required=days_remaining <= 1,
            created_at=datetime.now()
        )
        
        return alert
    
    async def _check_billing_issues(self, tenant_id: str, usage_status: Dict) -> Optional[UsageAlert]:
        """Check for billing/payment issues"""
        # This would check for:
        # - Failed payments
        # - Expired credit cards
        # - High overage charges
        # - Subscription cancellations
        
        # For now, return None (would be implemented with payment status data)
        return None
    
    async def _alert_recently_sent(self, tenant_id: str, alert_type: str, hours: int = 24) -> bool:
        """Check if similar alert was sent recently to avoid spam"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT id FROM usage_alerts 
                WHERE tenant_id = ? AND alert_type = ? AND sent_at > ?
                LIMIT 1
            """, (tenant_id, alert_type, cutoff_time))
            
            recent_alert = await cursor.fetchone()
            return recent_alert is not None
    
    async def _send_alert(self, alert: UsageAlert):
        """Send alert via multiple channels"""
        try:
            # Save alert to database
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT INTO usage_alerts 
                    (tenant_id, alert_type, threshold_value, current_value, message, 
                     action_required, sent_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert.tenant_id,
                    alert.alert_type,
                    alert.threshold,
                    0,  # current_value would be calculated based on alert type
                    alert.message,
                    alert.action_required,
                    datetime.now()
                ))
                await db.commit()
            
            # Get alert preferences
            preferences = await self._get_alert_preferences(alert.tenant_id)
            
            # Send via different channels
            if preferences.get('email_alerts', True):
                await self._send_email_alert(alert)
            
            if preferences.get('in_app_alerts', True):
                await self._send_in_app_alert(alert)
            
            if preferences.get('sms_alerts', False):
                await self._send_sms_alert(alert)
            
            logger.info(f"Alert sent to tenant {alert.tenant_id}: {alert.alert_type}")
            
        except Exception as error:
            logger.error(f"Error sending alert: {error}")
    
    async def _get_alert_preferences(self, tenant_id: str) -> Dict[str, Any]:
        """Get alert preferences for tenant"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT email_alerts, sms_alerts, in_app_alerts,
                       usage_warning_enabled, usage_critical_enabled, 
                       trial_alerts_enabled, billing_alerts_enabled
                FROM alert_preferences 
                WHERE tenant_id = ?
            """, (tenant_id,))
            
            prefs = await cursor.fetchone()
            
            if prefs:
                return {
                    'email_alerts': prefs[0],
                    'sms_alerts': prefs[1],
                    'in_app_alerts': prefs[2],
                    'usage_warning_enabled': prefs[3],
                    'usage_critical_enabled': prefs[4],
                    'trial_alerts_enabled': prefs[5],
                    'billing_alerts_enabled': prefs[6]
                }
            else:
                # Default preferences
                return {
                    'email_alerts': True,
                    'sms_alerts': False,
                    'in_app_alerts': True,
                    'usage_warning_enabled': True,
                    'usage_critical_enabled': True,
                    'trial_alerts_enabled': True,
                    'billing_alerts_enabled': True
                }
    
    async def _send_email_alert(self, alert: UsageAlert):
        """Send email alert"""
        # Mock email sending - integrate with email service
        email_subject = {
            'usage_warning': f"⚠️ Usage Warning - {alert.threshold}% of AI tokens used",
            'usage_critical': f"🔴 CRITICAL - {alert.threshold}% of AI tokens used",
            'trial_ending_warning': f"⏰ Trial ending in {int(alert.threshold)} days",
            'trial_ending_critical': f"🔴 Trial ends tomorrow!",
            'payment_failed': f"💳 Payment failed - Action required"
        }.get(alert.alert_type, f"6FB AI Alert - {alert.alert_type}")
        
        logger.info(f"EMAIL ALERT [{alert.tenant_id}]: {email_subject}")
        logger.info(f"Message: {alert.message}")
        
        # TODO: Integrate with email service (SendGrid, Resend, etc.)
    
    async def _send_in_app_alert(self, alert: UsageAlert):
        """Send in-app notification"""
        # This would push to real-time notification system
        logger.info(f"IN-APP ALERT [{alert.tenant_id}]: {alert.alert_type}")
        
        # TODO: Integrate with WebSocket/SSE for real-time notifications
    
    async def _send_sms_alert(self, alert: UsageAlert):
        """Send SMS alert for critical issues"""
        if alert.action_required:
            sms_message = f"6FB AI Alert: {alert.alert_type.replace('_', ' ').title()}. Login to manage: app.6fb.ai/billing"
            logger.info(f"SMS ALERT [{alert.tenant_id}]: {sms_message}")
            
            # TODO: Integrate with SMS service (Twilio, etc.)
    
    async def get_tenant_alerts(self, tenant_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get recent alerts for a tenant"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                SELECT alert_type, threshold_value, message, action_required,
                       sent_at, acknowledged_at, created_at
                FROM usage_alerts 
                WHERE tenant_id = ? AND created_at > ?
                ORDER BY created_at DESC
            """, (tenant_id, cutoff_date))
            
            alerts = await cursor.fetchall()
            
            return [
                {
                    'alert_type': alert[0],
                    'threshold': alert[1],
                    'message': alert[2],
                    'action_required': bool(alert[3]),
                    'sent_at': alert[4],
                    'acknowledged_at': alert[5],
                    'created_at': alert[6]
                }
                for alert in alerts
            ]
    
    async def acknowledge_alert(self, tenant_id: str, alert_type: str):
        """Mark alert as acknowledged by tenant"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE usage_alerts 
                SET acknowledged_at = CURRENT_TIMESTAMP
                WHERE tenant_id = ? AND alert_type = ? AND acknowledged_at IS NULL
            """, (tenant_id, alert_type))
            await db.commit()
        
        logger.info(f"Alert acknowledged: {tenant_id} - {alert_type}")

# Background service runner
class UsageAlertsScheduler:
    """Scheduler for running usage checks periodically"""
    
    def __init__(self, alerts_service: UsageAlertsService):
        self.alerts_service = alerts_service
        self.running = False
    
    async def start_scheduler(self, check_interval_minutes: int = 60):
        """Start the background scheduler"""
        self.running = True
        logger.info(f"Usage alerts scheduler started (checking every {check_interval_minutes} minutes)")
        
        while self.running:
            try:
                await self.alerts_service.check_all_tenants_usage()
                await asyncio.sleep(check_interval_minutes * 60)  # Convert to seconds
            except Exception as error:
                logger.error(f"Scheduler error: {error}")
                await asyncio.sleep(300)  # Wait 5 minutes before retrying
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        self.running = False
        logger.info("Usage alerts scheduler stopped")

# Demo and testing
async def demo_usage_alerts():
    """Demonstrate the usage alerts system"""
    alerts_service = UsageAlertsService()
    await alerts_service.initialize()
    
    # Check usage for a demo tenant
    alerts = await alerts_service.check_tenant_usage("tenant_demo_123")
    print(f"Generated {len(alerts)} alerts")
    
    for alert in alerts:
        print(f"\nAlert: {alert.alert_type}")
        print(f"Message: {alert.message}")
        print(f"Action Required: {alert.action_required}")
    
    # Get recent alerts
    recent_alerts = await alerts_service.get_tenant_alerts("tenant_demo_123")
    print(f"\nRecent alerts: {len(recent_alerts)}")

if __name__ == "__main__":
    asyncio.run(demo_usage_alerts())