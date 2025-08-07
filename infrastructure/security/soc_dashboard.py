#!/usr/bin/env python3
"""
Security Operations Center (SOC) Dashboard
Implements comprehensive security monitoring and threat detection
"""

import os
import asyncio
import logging
import json
import time
import hashlib
import sqlite3
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
import ipaddress
import geoip2.database
import geoip2.errors

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/soc-dashboard.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AttackType(Enum):
    BRUTE_FORCE = "brute_force"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    DDoS = "ddos"
    MALWARE = "malware"
    SUSPICIOUS_LOGIN = "suspicious_login"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_EXFILTRATION = "data_exfiltration"

@dataclass
class SecurityEvent:
    """Security event data structure"""
    id: str
    timestamp: datetime
    event_type: AttackType
    threat_level: ThreatLevel
    source_ip: str
    target: str
    description: str
    raw_data: Dict[str, Any]
    country: Optional[str] = None
    blocked: bool = False
    
@dataclass
class ThreatIntelligence:
    """Threat intelligence data"""
    ip_address: str
    reputation_score: int  # 0-100, higher is worse
    threat_types: List[str]
    first_seen: datetime
    last_seen: datetime
    source: str
    
@dataclass
class SecurityMetrics:
    """Security metrics summary"""
    total_events: int
    critical_events: int
    blocked_attempts: int
    unique_attackers: int
    top_attack_types: List[Tuple[str, int]]
    geographic_distribution: Dict[str, int]
    timestamp: datetime

class ThreatDetectionEngine:
    """Advanced threat detection engine"""
    
    def __init__(self):
        self.patterns = {
            AttackType.SQL_INJECTION: [
                r"(\bunion\b.*\bselect\b)",
                r"(\bselect\b.*\bfrom\b.*\bwhere\b)",
                r"('.*or.*'.*=.*')",
                r"(\bdrop\b.*\btable\b)",
                r"(\binsert\b.*\binto\b)",
                r"(\bupdate\b.*\bset\b)",
                r"(\bdelete\b.*\bfrom\b)"
            ],
            AttackType.XSS: [
                r"(<script.*?>.*?</script>)",
                r"(javascript:.*)",
                r"(on\w+\s*=.*)",
                r"(<iframe.*?>)",
                r"(<object.*?>)",
                r"(eval\s*\(.*\))"
            ],
            AttackType.BRUTE_FORCE: [
                # Detected by frequency analysis rather than patterns
            ]
        }
        
        self.ip_whitelist = set()
        self.ip_blacklist = set()
        self.failed_login_tracking = {}
        
    async def analyze_request(self, request_data: Dict[str, Any]) -> Optional[SecurityEvent]:
        """Analyze incoming request for threats"""
        try:
            source_ip = request_data.get('source_ip', '')
            user_agent = request_data.get('user_agent', '')
            url = request_data.get('url', '')
            method = request_data.get('method', '')
            headers = request_data.get('headers', {})
            body = request_data.get('body', '')
            
            # Check IP reputation
            if await self._is_malicious_ip(source_ip):
                return SecurityEvent(
                    id=self._generate_event_id(),
                    timestamp=datetime.now(),
                    event_type=AttackType.UNAUTHORIZED_ACCESS,
                    threat_level=ThreatLevel.HIGH,
                    source_ip=source_ip,
                    target=url,
                    description="Request from known malicious IP",
                    raw_data=request_data,
                    blocked=True
                )
                
            # Check for SQL injection
            sql_injection = await self._detect_sql_injection(url, body, headers)
            if sql_injection:
                return sql_injection
                
            # Check for XSS
            xss_attack = await self._detect_xss(url, body, headers)
            if xss_attack:
                return xss_attack
                
            # Check for suspicious user agents
            if await self._is_suspicious_user_agent(user_agent):
                return SecurityEvent(
                    id=self._generate_event_id(),
                    timestamp=datetime.now(),
                    event_type=AttackType.SUSPICIOUS_LOGIN,
                    threat_level=ThreatLevel.MEDIUM,
                    source_ip=source_ip,
                    target=url,
                    description=f"Suspicious user agent: {user_agent}",
                    raw_data=request_data
                )
                
            # Check rate limiting
            if await self._check_rate_limit(source_ip):
                return SecurityEvent(
                    id=self._generate_event_id(),
                    timestamp=datetime.now(),
                    event_type=AttackType.RATE_LIMIT_EXCEEDED,
                    threat_level=ThreatLevel.MEDIUM,
                    source_ip=source_ip,
                    target=url,
                    description="Rate limit exceeded",
                    raw_data=request_data,
                    blocked=True
                )
                
            return None
            
        except Exception as e:
            logger.error(f"Threat analysis failed: {e}")
            return None
            
    async def _detect_sql_injection(self, url: str, body: str, 
                                  headers: Dict[str, str]) -> Optional[SecurityEvent]:
        """Detect SQL injection attempts"""
        try:
            # Combine all input sources
            combined_input = f"{url} {body} {json.dumps(headers)}"
            combined_input = combined_input.lower()
            
            for pattern in self.patterns[AttackType.SQL_INJECTION]:
                if re.search(pattern, combined_input, re.IGNORECASE):
                    return SecurityEvent(
                        id=self._generate_event_id(),
                        timestamp=datetime.now(),
                        event_type=AttackType.SQL_INJECTION,
                        threat_level=ThreatLevel.CRITICAL,
                        source_ip=headers.get('x-forwarded-for', 'unknown'),
                        target=url,
                        description=f"SQL injection attempt detected: {pattern}",
                        raw_data={'url': url, 'body': body, 'headers': headers},
                        blocked=True
                    )
                    
            return None
            
        except Exception as e:
            logger.error(f"SQL injection detection failed: {e}")
            return None
            
    async def _detect_xss(self, url: str, body: str, 
                         headers: Dict[str, str]) -> Optional[SecurityEvent]:
        """Detect XSS attempts"""
        try:
            combined_input = f"{url} {body}"
            
            for pattern in self.patterns[AttackType.XSS]:
                if re.search(pattern, combined_input, re.IGNORECASE):
                    return SecurityEvent(
                        id=self._generate_event_id(),
                        timestamp=datetime.now(),
                        event_type=AttackType.XSS,
                        threat_level=ThreatLevel.HIGH,
                        source_ip=headers.get('x-forwarded-for', 'unknown'),
                        target=url,
                        description=f"XSS attempt detected: {pattern}",
                        raw_data={'url': url, 'body': body, 'headers': headers},
                        blocked=True
                    )
                    
            return None
            
        except Exception as e:
            logger.error(f"XSS detection failed: {e}")
            return None
            
    async def _is_malicious_ip(self, ip: str) -> bool:
        """Check if IP is known to be malicious"""
        try:
            if ip in self.ip_blacklist:
                return True
                
            if ip in self.ip_whitelist:
                return False
                
            # Check against threat intelligence feeds
            return await self._check_threat_intelligence(ip)
            
        except Exception:
            return False
            
    async def _check_threat_intelligence(self, ip: str) -> bool:
        """Check IP against threat intelligence feeds"""
        try:
            # Check AbuseIPDB (free tier available)
            api_key = os.getenv('ABUSEIPDB_API_KEY')
            if api_key:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Key': api_key,
                        'Accept': 'application/json'
                    }
                    
                    async with session.get(
                        f'https://api.abuseipdb.com/api/v2/check',
                        params={'ipAddress': ip, 'maxAgeInDays': 90},
                        headers=headers
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            abuse_confidence = data.get('data', {}).get('abuseConfidencePercentage', 0)
                            return abuse_confidence > 50  # 50% confidence threshold
                            
            return False
            
        except Exception as e:
            logger.error(f"Threat intelligence check failed: {e}")
            return False
            
    async def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if user agent is suspicious"""
        suspicious_patterns = [
            r'sqlmap',
            r'nikto',
            r'burp',
            r'wget',
            r'curl',
            r'python-requests',
            r'scanner',
            r'bot.*crawler'
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, user_agent, re.IGNORECASE):
                return True
                
        return False
        
    async def _check_rate_limit(self, ip: str) -> bool:
        """Check if IP has exceeded rate limits"""
        try:
            current_time = time.time()
            window = 60  # 1 minute window
            max_requests = 100  # Max requests per minute
            
            if ip not in self.failed_login_tracking:
                self.failed_login_tracking[ip] = []
                
            # Clean old entries
            self.failed_login_tracking[ip] = [
                t for t in self.failed_login_tracking[ip] 
                if current_time - t < window
            ]
            
            # Add current request
            self.failed_login_tracking[ip].append(current_time)
            
            return len(self.failed_login_tracking[ip]) > max_requests
            
        except Exception:
            return False
            
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        return f"SEC-{int(time.time())}-{hashlib.md5(str(time.time()).encode()).hexdigest()[:8]}"

class GeolocationService:
    """IP geolocation service"""
    
    def __init__(self):
        self.geoip_db_path = "/usr/share/GeoIP/GeoLite2-City.mmdb"
        self.reader = None
        self._initialize_geoip()
        
    def _initialize_geoip(self):
        """Initialize GeoIP database"""
        try:
            if os.path.exists(self.geoip_db_path):
                self.reader = geoip2.database.Reader(self.geoip_db_path)
                logger.info("GeoIP database initialized")
            else:
                logger.warning("GeoIP database not found")
        except Exception as e:
            logger.error(f"Failed to initialize GeoIP: {e}")
            
    async def get_location(self, ip: str) -> Optional[Dict[str, str]]:
        """Get geolocation for IP address"""
        try:
            if not self.reader:
                return None
                
            response = self.reader.city(ip)
            
            return {
                'country': response.country.name,
                'country_code': response.country.iso_code,
                'city': response.city.name,
                'latitude': str(response.location.latitude),
                'longitude': str(response.location.longitude)
            }
            
        except geoip2.errors.AddressNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Geolocation lookup failed: {e}")
            return None

class SecurityDatabase:
    """Security events database"""
    
    def __init__(self, db_path: str = "/var/lib/security/events.db"):
        self.db_path = db_path
        self._initialize_database()
        
    def _initialize_database(self):
        """Initialize security events database"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create security events table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_events (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    threat_level TEXT NOT NULL,
                    source_ip TEXT NOT NULL,
                    target TEXT NOT NULL,
                    description TEXT NOT NULL,
                    country TEXT,
                    blocked INTEGER DEFAULT 0,
                    raw_data TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create threat intelligence table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS threat_intelligence (
                    ip_address TEXT PRIMARY KEY,
                    reputation_score INTEGER NOT NULL,
                    threat_types TEXT NOT NULL,
                    first_seen TEXT NOT NULL,
                    last_seen TEXT NOT NULL,
                    source TEXT NOT NULL,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON security_events(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_source_ip ON security_events(source_ip)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_threat_level ON security_events(threat_level)')
            
            conn.commit()
            conn.close()
            
            logger.info("Security database initialized")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            
    async def store_event(self, event: SecurityEvent):
        """Store security event in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO security_events 
                (id, timestamp, event_type, threat_level, source_ip, target, 
                 description, country, blocked, raw_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                event.id,
                event.timestamp.isoformat(),
                event.event_type.value,
                event.threat_level.value,
                event.source_ip,
                event.target,
                event.description,
                event.country,
                1 if event.blocked else 0,
                json.dumps(event.raw_data)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to store security event: {e}")
            
    async def get_events(self, limit: int = 100, 
                        threat_level: Optional[ThreatLevel] = None,
                        hours_back: int = 24) -> List[SecurityEvent]:
        """Retrieve security events"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build query
            query = '''
                SELECT id, timestamp, event_type, threat_level, source_ip, target,
                       description, country, blocked, raw_data
                FROM security_events
                WHERE timestamp > ?
            '''
            params = [(datetime.now() - timedelta(hours=hours_back)).isoformat()]
            
            if threat_level:
                query += ' AND threat_level = ?'
                params.append(threat_level.value)
                
            query += ' ORDER BY timestamp DESC LIMIT ?'
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            events = []
            for row in rows:
                events.append(SecurityEvent(
                    id=row[0],
                    timestamp=datetime.fromisoformat(row[1]),
                    event_type=AttackType(row[2]),
                    threat_level=ThreatLevel(row[3]),
                    source_ip=row[4],
                    target=row[5],
                    description=row[6],
                    country=row[7],
                    blocked=bool(row[8]),
                    raw_data=json.loads(row[9]) if row[9] else {}
                ))
                
            conn.close()
            return events
            
        except Exception as e:
            logger.error(f"Failed to retrieve security events: {e}")
            return []
            
    async def get_metrics(self, hours_back: int = 24) -> SecurityMetrics:
        """Get security metrics summary"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_time = (datetime.now() - timedelta(hours=hours_back)).isoformat()
            
            # Total events
            cursor.execute(
                'SELECT COUNT(*) FROM security_events WHERE timestamp > ?',
                (cutoff_time,)
            )
            total_events = cursor.fetchone()[0]
            
            # Critical events
            cursor.execute(
                'SELECT COUNT(*) FROM security_events WHERE timestamp > ? AND threat_level = ?',
                (cutoff_time, ThreatLevel.CRITICAL.value)
            )
            critical_events = cursor.fetchone()[0]
            
            # Blocked attempts
            cursor.execute(
                'SELECT COUNT(*) FROM security_events WHERE timestamp > ? AND blocked = 1',
                (cutoff_time,)
            )
            blocked_attempts = cursor.fetchone()[0]
            
            # Unique attackers
            cursor.execute(
                'SELECT COUNT(DISTINCT source_ip) FROM security_events WHERE timestamp > ?',
                (cutoff_time,)
            )
            unique_attackers = cursor.fetchone()[0]
            
            # Top attack types
            cursor.execute('''
                SELECT event_type, COUNT(*) as count 
                FROM security_events 
                WHERE timestamp > ? 
                GROUP BY event_type 
                ORDER BY count DESC 
                LIMIT 5
            ''', (cutoff_time,))
            top_attack_types = cursor.fetchall()
            
            # Geographic distribution
            cursor.execute('''
                SELECT country, COUNT(*) as count 
                FROM security_events 
                WHERE timestamp > ? AND country IS NOT NULL
                GROUP BY country 
                ORDER BY count DESC 
                LIMIT 10
            ''', (cutoff_time,))
            geographic_distribution = dict(cursor.fetchall())
            
            conn.close()
            
            return SecurityMetrics(
                total_events=total_events,
                critical_events=critical_events,
                blocked_attempts=blocked_attempts,
                unique_attackers=unique_attackers,
                top_attack_types=top_attack_types,
                geographic_distribution=geographic_distribution,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Failed to get security metrics: {e}")
            return SecurityMetrics(0, 0, 0, 0, [], {}, datetime.now())

class SecurityAlertManager:
    """Security alerting and notification"""
    
    def __init__(self):
        self.alert_thresholds = {
            ThreatLevel.CRITICAL: 1,  # Alert on any critical event
            ThreatLevel.HIGH: 5,      # Alert on 5+ high events in 10 minutes
            ThreatLevel.MEDIUM: 20    # Alert on 20+ medium events in 10 minutes
        }
        
        self.recent_alerts = {}
        
    async def evaluate_alert(self, event: SecurityEvent) -> bool:
        """Evaluate if event should trigger an alert"""
        try:
            if event.threat_level == ThreatLevel.CRITICAL:
                await self._send_alert(event, "Critical security threat detected")
                return True
                
            # Check for alert thresholds
            current_time = time.time()
            window = 600  # 10 minutes
            
            # Clean old events
            if event.threat_level not in self.recent_alerts:
                self.recent_alerts[event.threat_level] = []
                
            self.recent_alerts[event.threat_level] = [
                t for t in self.recent_alerts[event.threat_level]
                if current_time - t < window
            ]
            
            # Add current event
            self.recent_alerts[event.threat_level].append(current_time)
            
            # Check threshold
            threshold = self.alert_thresholds.get(event.threat_level, 100)
            if len(self.recent_alerts[event.threat_level]) >= threshold:
                await self._send_alert(event, f"Multiple {event.threat_level.value} events detected")
                # Reset counter after alert
                self.recent_alerts[event.threat_level] = []
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Alert evaluation failed: {e}")
            return False
            
    async def _send_alert(self, event: SecurityEvent, title: str):
        """Send security alert"""
        try:
            # Send to multiple channels
            await self._send_slack_alert(event, title)
            await self._send_email_alert(event, title)
            await self._send_webhook_alert(event, title)
            
        except Exception as e:
            logger.error(f"Failed to send security alert: {e}")
            
    async def _send_slack_alert(self, event: SecurityEvent, title: str):
        """Send alert to Slack"""
        try:
            webhook_url = os.getenv('SLACK_SECURITY_WEBHOOK_URL')
            if not webhook_url:
                return
                
            color = {
                ThreatLevel.CRITICAL: "danger",
                ThreatLevel.HIGH: "warning",
                ThreatLevel.MEDIUM: "#ff9500",  # Orange
                ThreatLevel.LOW: "good"
            }.get(event.threat_level, "warning")
            
            payload = {
                "text": f"🚨 {title}",
                "attachments": [{
                    "color": color,
                    "fields": [
                        {"title": "Event ID", "value": event.id, "short": True},
                        {"title": "Threat Level", "value": event.threat_level.value.upper(), "short": True},
                        {"title": "Attack Type", "value": event.event_type.value, "short": True},
                        {"title": "Source IP", "value": event.source_ip, "short": True},
                        {"title": "Target", "value": event.target, "short": False},
                        {"title": "Description", "value": event.description, "short": False}
                    ],
                    "footer": "6FB AI Agent Security",
                    "ts": int(event.timestamp.timestamp())
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status != 200:
                        logger.error(f"Slack alert failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Slack alert failed: {e}")
            
    async def _send_email_alert(self, event: SecurityEvent, title: str):
        """Send alert via email"""
        # Email implementation would go here
        pass
        
    async def _send_webhook_alert(self, event: SecurityEvent, title: str):
        """Send alert to webhook endpoint"""
        try:
            webhook_url = os.getenv('SECURITY_ALERT_WEBHOOK_URL')
            if not webhook_url:
                return
                
            payload = {
                "title": title,
                "event": asdict(event),
                "timestamp": datetime.now().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status != 200:
                        logger.error(f"Webhook alert failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Webhook alert failed: {e}")

class SOCDashboard:
    """Main Security Operations Center dashboard"""
    
    def __init__(self):
        self.threat_detector = ThreatDetectionEngine()
        self.geolocation = GeolocationService()
        self.database = SecurityDatabase()
        self.alert_manager = SecurityAlertManager()
        self.running = False
        
    async def process_security_event(self, request_data: Dict[str, Any]) -> Optional[SecurityEvent]:
        """Process incoming request for security analysis"""
        try:
            # Analyze for threats
            event = await self.threat_detector.analyze_request(request_data)
            
            if event:
                # Add geolocation data
                location = await self.geolocation.get_location(event.source_ip)
                if location:
                    event.country = location.get('country')
                    
                # Store event
                await self.database.store_event(event)
                
                # Evaluate for alerts
                await self.alert_manager.evaluate_alert(event)
                
                logger.info(f"Security event detected: {event.id} - {event.description}")
                
            return event
            
        except Exception as e:
            logger.error(f"Security event processing failed: {e}")
            return None
            
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive dashboard data"""
        try:
            # Get recent metrics
            metrics = await self.database.get_metrics(hours_back=24)
            
            # Get recent events
            recent_events = await self.database.get_events(limit=50)
            
            # Get critical events
            critical_events = await self.database.get_events(
                limit=20, 
                threat_level=ThreatLevel.CRITICAL
            )
            
            # Calculate trends
            yesterday_metrics = await self.database.get_metrics(hours_back=48)
            
            return {
                "overview": {
                    "total_events_24h": metrics.total_events,
                    "critical_events_24h": metrics.critical_events,
                    "blocked_attempts_24h": metrics.blocked_attempts,
                    "unique_attackers_24h": metrics.unique_attackers,
                    "events_trend": metrics.total_events - yesterday_metrics.total_events
                },
                "attack_types": dict(metrics.top_attack_types),
                "geographic_distribution": metrics.geographic_distribution,
                "recent_events": [
                    {
                        "id": event.id,
                        "timestamp": event.timestamp.isoformat(),
                        "type": event.event_type.value,
                        "level": event.threat_level.value,
                        "source_ip": event.source_ip,
                        "target": event.target,
                        "description": event.description,
                        "country": event.country,
                        "blocked": event.blocked
                    } for event in recent_events
                ],
                "critical_events": [
                    {
                        "id": event.id,
                        "timestamp": event.timestamp.isoformat(),
                        "type": event.event_type.value,
                        "source_ip": event.source_ip,
                        "description": event.description
                    } for event in critical_events
                ],
                "system_status": {
                    "monitoring_active": self.running,
                    "last_update": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard data: {e}")
            return {}
            
    async def start_monitoring(self):
        """Start security monitoring"""
        self.running = True
        logger.info("SOC monitoring started")
        
        # Start log monitoring task
        asyncio.create_task(self._monitor_system_logs())
        
    async def stop_monitoring(self):
        """Stop security monitoring"""
        self.running = False
        logger.info("SOC monitoring stopped")
        
    async def _monitor_system_logs(self):
        """Monitor system logs for security events"""
        while self.running:
            try:
                # Monitor nginx access logs
                await self._process_nginx_logs()
                
                # Monitor application logs
                await self._process_application_logs()
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Log monitoring error: {e}")
                await asyncio.sleep(60)
                
    async def _process_nginx_logs(self):
        """Process nginx access logs"""
        try:
            log_file = "/var/log/nginx/access.log"
            if not os.path.exists(log_file):
                return
                
            # Read recent log entries (simplified - in production use log rotation)
            with open(log_file, 'r') as f:
                lines = f.readlines()[-1000:]  # Last 1000 lines
                
            for line in lines:
                # Parse nginx log format
                log_entry = self._parse_nginx_log(line)
                if log_entry:
                    await self.process_security_event(log_entry)
                    
        except Exception as e:
            logger.error(f"Nginx log processing failed: {e}")
            
    def _parse_nginx_log(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse nginx log line"""
        try:
            # Simple nginx log parsing (improve for production)
            parts = line.split()
            if len(parts) < 10:
                return None
                
            return {
                'source_ip': parts[0],
                'timestamp': parts[3] + ' ' + parts[4],
                'method': parts[5].strip('"'),
                'url': parts[6],
                'status_code': parts[8],
                'user_agent': ' '.join(parts[11:]).strip('"'),
                'headers': {}
            }
            
        except Exception:
            return None
            
    async def _process_application_logs(self):
        """Process application logs"""
        try:
            # Monitor for failed login attempts, errors, etc.
            log_files = [
                "/var/log/6fb-ai-agent/application.log",
                "/var/log/6fb-ai-agent/error.log"
            ]
            
            for log_file in log_files:
                if os.path.exists(log_file):
                    with open(log_file, 'r') as f:
                        lines = f.readlines()[-500:]  # Last 500 lines
                        
                    for line in lines:
                        if 'failed' in line.lower() or 'error' in line.lower():
                            # Process potential security events
                            pass
                            
        except Exception as e:
            logger.error(f"Application log processing failed: {e}")

# Usage example
async def main():
    # Initialize SOC dashboard
    soc = SOCDashboard()
    
    # Start monitoring
    await soc.start_monitoring()
    
    # Simulate security events
    test_requests = [
        {
            'source_ip': '192.168.1.100',
            'url': '/api/users?id=1 UNION SELECT * FROM users',
            'method': 'GET',
            'user_agent': 'Mozilla/5.0',
            'headers': {},
            'body': ''
        },
        {
            'source_ip': '10.0.0.50',
            'url': '/login',
            'method': 'POST',
            'user_agent': 'sqlmap/1.0',
            'headers': {},
            'body': 'username=admin&password=password'
        }
    ]
    
    for request in test_requests:
        event = await soc.process_security_event(request)
        if event:
            logger.info(f"Detected: {event.description}")
            
    # Get dashboard data
    dashboard_data = await soc.get_dashboard_data()
    logger.info(f"Dashboard data: {json.dumps(dashboard_data, indent=2)}")
    
    # Keep running
    try:
        while True:
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        await soc.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())