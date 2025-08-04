#!/usr/bin/env python3
"""
Centralized Log Aggregation System
Implements ELK stack integration with log correlation and analysis
"""

import os
import asyncio
import logging
import json
import time
import gzip
import shutil
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import elasticsearch
from elasticsearch import AsyncElasticsearch
import subprocess
from pathlib import Path
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/centralized-logging.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class LogLevel(Enum):
    TRACE = "trace"
    DEBUG = "debug"
    INFO = "info"
    WARN = "warn"
    ERROR = "error"
    FATAL = "fatal"

class LogSource(Enum):
    APPLICATION = "application"
    NGINX = "nginx"
    SYSTEM = "system"
    SECURITY = "security"
    DATABASE = "database"
    DOCKER = "docker"
    KUBERNETES = "kubernetes"

@dataclass
class LogEntry:
    """Structured log entry"""
    timestamp: datetime
    level: LogLevel
    source: LogSource
    service: str
    message: str
    context: Dict[str, Any]
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    correlation_id: Optional[str] = None
    
@dataclass
class LogPattern:
    """Log pattern definition for parsing"""
    name: str
    pattern: str
    source: LogSource
    level_field: str
    message_field: str
    timestamp_field: str
    context_fields: List[str]

class LogParser:
    """Log parsing and normalization"""
    
    def __init__(self):
        self.patterns = self._initialize_patterns()
        
    def _initialize_patterns(self) -> Dict[str, LogPattern]:
        """Initialize log parsing patterns"""
        return {
            'nginx_access': LogPattern(
                name='nginx_access',
                pattern=r'(?P<remote_addr>\S+) - (?P<remote_user>\S+) \[(?P<timestamp>[^\]]+)\] "(?P<method>\S+) (?P<request>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)"',
                source=LogSource.NGINX,
                level_field='status',
                message_field='request',
                timestamp_field='timestamp',
                context_fields=['remote_addr', 'method', 'status', 'body_bytes_sent', 'http_user_agent']
            ),
            'nginx_error': LogPattern(
                name='nginx_error',
                pattern=r'(?P<timestamp>\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) \[(?P<level>\w+)\] (?P<pid>\d+)#(?P<tid>\d+): (?P<message>.*)',
                source=LogSource.NGINX,
                level_field='level',
                message_field='message',
                timestamp_field='timestamp',
                context_fields=['pid', 'tid']
            ),
            'application_json': LogPattern(
                name='application_json',
                pattern=r'(?P<json_data>.*)',
                source=LogSource.APPLICATION,
                level_field='level',
                message_field='message',
                timestamp_field='timestamp',
                context_fields=['service', 'request_id', 'user_id']
            ),
            'docker_container': LogPattern(
                name='docker_container',
                pattern=r'(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z) (?P<container_id>\w+) (?P<stream>stdout|stderr) (?P<message>.*)',
                source=LogSource.DOCKER,
                level_field='stream',
                message_field='message',
                timestamp_field='timestamp',
                context_fields=['container_id', 'stream']
            )
        }
        
    async def parse_log_line(self, line: str, source_hint: LogSource = None) -> Optional[LogEntry]:
        """Parse a single log line"""
        try:
            # Try JSON parsing first for structured logs
            if line.strip().startswith('{'):
                return await self._parse_json_log(line)
                
            # Try pattern matching based on source hint
            if source_hint:
                pattern_candidates = [p for p in self.patterns.values() if p.source == source_hint]
            else:
                pattern_candidates = list(self.patterns.values())
                
            for pattern in pattern_candidates:
                parsed_entry = await self._parse_with_pattern(line, pattern)
                if parsed_entry:
                    return parsed_entry
                    
            # Fallback to generic parsing
            return await self._parse_generic_log(line)
            
        except Exception as e:
            logger.error(f"Log parsing failed: {e}")
            return None
            
    async def _parse_json_log(self, line: str) -> Optional[LogEntry]:
        """Parse JSON structured log"""
        try:
            log_data = json.loads(line.strip())
            
            # Extract timestamp
            timestamp_str = log_data.get('timestamp', log_data.get('@timestamp', ''))
            if timestamp_str:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            else:
                timestamp = datetime.now()
                
            # Extract log level
            level_str = log_data.get('level', log_data.get('severity', 'info')).lower()
            try:
                level = LogLevel(level_str)
            except ValueError:
                level = LogLevel.INFO
                
            # Extract source
            source_str = log_data.get('source', log_data.get('logger', 'application'))
            try:
                source = LogSource(source_str.lower())
            except ValueError:
                source = LogSource.APPLICATION
                
            # Build context
            context = {k: v for k, v in log_data.items() 
                      if k not in ['timestamp', '@timestamp', 'level', 'severity', 'message', 'source']}
            
            return LogEntry(
                timestamp=timestamp,
                level=level,
                source=source,
                service=log_data.get('service', 'unknown'),
                message=log_data.get('message', ''),
                context=context,
                request_id=log_data.get('request_id'),
                user_id=log_data.get('user_id'),
                session_id=log_data.get('session_id'),
                correlation_id=log_data.get('correlation_id')
            )
            
        except Exception as e:
            logger.error(f"JSON log parsing failed: {e}")
            return None
            
    async def _parse_with_pattern(self, line: str, pattern: LogPattern) -> Optional[LogEntry]:
        """Parse log line with specific pattern"""
        try:
            match = re.match(pattern.pattern, line.strip())
            if not match:
                return None
                
            groups = match.groupdict()
            
            # Extract timestamp
            timestamp_str = groups.get(pattern.timestamp_field, '')
            if timestamp_str:
                # Handle different timestamp formats
                timestamp = await self._parse_timestamp(timestamp_str)
            else:
                timestamp = datetime.now()
                
            # Extract level
            level_value = groups.get(pattern.level_field, 'info')
            level = await self._normalize_log_level(level_value)
            
            # Build context
            context = {field: groups.get(field) for field in pattern.context_fields if field in groups}
            
            return LogEntry(
                timestamp=timestamp,
                level=level,
                source=pattern.source,
                service=groups.get('service', 'unknown'),
                message=groups.get(pattern.message_field, ''),
                context=context
            )
            
        except Exception as e:
            logger.error(f"Pattern parsing failed: {e}")
            return None
            
    async def _parse_generic_log(self, line: str) -> LogEntry:
        """Parse generic log line"""
        return LogEntry(
            timestamp=datetime.now(),
            level=LogLevel.INFO,
            source=LogSource.APPLICATION,
            service='unknown',
            message=line.strip(),
            context={}
        )
        
    async def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp from various formats"""
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y/%m/%d %H:%M:%S',
            '%d/%b/%Y:%H:%M:%S %z',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
                
        # Fallback to current time
        return datetime.now()
        
    async def _normalize_log_level(self, level_str: str) -> LogLevel:
        """Normalize log level from various formats"""
        level_mapping = {
            '200': LogLevel.INFO, '201': LogLevel.INFO, '204': LogLevel.INFO,
            '400': LogLevel.WARN, '401': LogLevel.WARN, '403': LogLevel.WARN, '404': LogLevel.WARN,
            '500': LogLevel.ERROR, '502': LogLevel.ERROR, '503': LogLevel.ERROR,
            'stdout': LogLevel.INFO,
            'stderr': LogLevel.ERROR,
            'emerg': LogLevel.FATAL, 'alert': LogLevel.FATAL, 'crit': LogLevel.FATAL,
            'err': LogLevel.ERROR, 'warning': LogLevel.WARN, 'notice': LogLevel.INFO,
            'info': LogLevel.INFO, 'debug': LogLevel.DEBUG
        }
        
        normalized = level_mapping.get(level_str.lower())
        if normalized:
            return normalized
            
        try:
            return LogLevel(level_str.lower())
        except ValueError:
            return LogLevel.INFO

class ElasticsearchManager:
    """Elasticsearch integration"""
    
    def __init__(self):
        self.es_client = None
        self.index_template = "logs-6fb-ai-agent"
        self._initialize_client()
        
    def _initialize_client(self):
        """Initialize Elasticsearch client"""
        try:
            elasticsearch_url = os.getenv('ELASTICSEARCH_URL', 'http://elasticsearch:9200')
            elasticsearch_user = os.getenv('ELASTICSEARCH_USER')
            elasticsearch_password = os.getenv('ELASTICSEARCH_PASSWORD')
            
            if elasticsearch_user and elasticsearch_password:
                self.es_client = AsyncElasticsearch(
                    [elasticsearch_url],
                    http_auth=(elasticsearch_user, elasticsearch_password)
                )
            else:
                self.es_client = AsyncElasticsearch([elasticsearch_url])
                
            logger.info("Elasticsearch client initialized")
            
        except Exception as e:
            logger.error(f"Elasticsearch initialization failed: {e}")
            
    async def create_index_template(self):
        """Create Elasticsearch index template"""
        try:
            if not self.es_client:
                return False
                
            template = {
                "index_patterns": [f"{self.index_template}-*"],
                "template": {
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 1,
                        "index.lifecycle.name": "logs-policy",
                        "index.lifecycle.rollover_alias": self.index_template
                    },
                    "mappings": {
                        "properties": {
                            "@timestamp": {"type": "date"},
                            "level": {"type": "keyword"},
                            "source": {"type": "keyword"},
                            "service": {"type": "keyword"},
                            "message": {"type": "text"},
                            "context": {"type": "object"},
                            "request_id": {"type": "keyword"},
                            "user_id": {"type": "keyword"},
                            "session_id": {"type": "keyword"},
                            "correlation_id": {"type": "keyword"}
                        }
                    }
                }
            }
            
            await self.es_client.indices.put_index_template(
                name=f"{self.index_template}-template",
                body=template
            )
            
            logger.info("Elasticsearch index template created")
            return True
            
        except Exception as e:
            logger.error(f"Index template creation failed: {e}")
            return False
            
    async def index_log_entry(self, log_entry: LogEntry) -> bool:
        """Index log entry in Elasticsearch"""
        try:
            if not self.es_client:
                return False
                
            # Create index name with date
            index_name = f"{self.index_template}-{log_entry.timestamp.strftime('%Y.%m.%d')}"
            
            # Prepare document
            doc = {
                "@timestamp": log_entry.timestamp.isoformat(),
                "level": log_entry.level.value,
                "source": log_entry.source.value,
                "service": log_entry.service,
                "message": log_entry.message,
                "context": log_entry.context,
                "request_id": log_entry.request_id,
                "user_id": log_entry.user_id,
                "session_id": log_entry.session_id,
                "correlation_id": log_entry.correlation_id
            }
            
            # Index document
            await self.es_client.index(
                index=index_name,
                body=doc
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Log indexing failed: {e}")
            return False
            
    async def search_logs(self, query: Dict[str, Any], 
                         from_time: datetime = None,
                         to_time: datetime = None,
                         size: int = 100) -> List[Dict[str, Any]]:
        """Search logs in Elasticsearch"""
        try:
            if not self.es_client:
                return []
                
            # Build time range filter
            time_filter = {}
            if from_time or to_time:
                time_range = {}
                if from_time:
                    time_range["gte"] = from_time.isoformat()
                if to_time:
                    time_range["lte"] = to_time.isoformat()
                time_filter = {"range": {"@timestamp": time_range}}
                
            # Build search query
            search_query = {
                "query": {
                    "bool": {
                        "must": [query] if query else [{"match_all": {}}],
                        "filter": [time_filter] if time_filter else []
                    }
                },
                "sort": [{"@timestamp": {"order": "desc"}}],
                "size": size
            }
            
            # Execute search
            response = await self.es_client.search(
                index=f"{self.index_template}-*",
                body=search_query
            )
            
            return [hit["_source"] for hit in response["hits"]["hits"]]
            
        except Exception as e:
            logger.error(f"Log search failed: {e}")
            return []
            
    async def get_aggregated_metrics(self, from_time: datetime, 
                                   to_time: datetime) -> Dict[str, Any]:
        """Get aggregated log metrics"""
        try:
            if not self.es_client:
                return {}
                
            agg_query = {
                "query": {
                    "range": {
                        "@timestamp": {
                            "gte": from_time.isoformat(),
                            "lte": to_time.isoformat()
                        }
                    }
                },
                "aggs": {
                    "levels": {
                        "terms": {"field": "level"}
                    },
                    "sources": {
                        "terms": {"field": "source"}
                    },
                    "services": {
                        "terms": {"field": "service"}
                    },
                    "timeline": {
                        "date_histogram": {
                            "field": "@timestamp",
                            "calendar_interval": "1h"
                        }
                    }
                },
                "size": 0
            }
            
            response = await self.es_client.search(
                index=f"{self.index_template}-*",
                body=agg_query
            )
            
            return response["aggregations"]
            
        except Exception as e:
            logger.error(f"Metrics aggregation failed: {e}")
            return {}

class LogCorrelator:
    """Log correlation and analysis"""
    
    def __init__(self):
        self.correlation_rules = []
        self.active_correlations = {}
        
    def add_correlation_rule(self, rule: Dict[str, Any]):
        """Add log correlation rule"""
        self.correlation_rules.append(rule)
        
    async def correlate_logs(self, log_entries: List[LogEntry]) -> List[Dict[str, Any]]:
        """Correlate related log entries"""
        correlations = []
        
        try:
            # Group by correlation ID
            correlation_groups = {}
            for entry in log_entries:
                if entry.correlation_id:
                    if entry.correlation_id not in correlation_groups:
                        correlation_groups[entry.correlation_id] = []
                    correlation_groups[entry.correlation_id].append(entry)
                    
            # Group by request ID
            request_groups = {}
            for entry in log_entries:
                if entry.request_id:
                    if entry.request_id not in request_groups:
                        request_groups[entry.request_id] = []
                    request_groups[entry.request_id].append(entry)
                    
            # Group by user session
            session_groups = {}
            for entry in log_entries:
                if entry.user_id and entry.session_id:
                    session_key = f"{entry.user_id}:{entry.session_id}"
                    if session_key not in session_groups:
                        session_groups[session_key] = []
                    session_groups[session_key].append(entry)
                    
            # Create correlation objects
            for correlation_id, entries in correlation_groups.items():
                correlations.append({
                    'type': 'correlation_id',
                    'key': correlation_id,
                    'entries': len(entries),
                    'time_span': self._calculate_time_span(entries),
                    'services': list(set(entry.service for entry in entries)),
                    'levels': list(set(entry.level.value for entry in entries))
                })
                
            for request_id, entries in request_groups.items():
                correlations.append({
                    'type': 'request_id',
                    'key': request_id,
                    'entries': len(entries),
                    'time_span': self._calculate_time_span(entries),
                    'services': list(set(entry.service for entry in entries)),
                    'levels': list(set(entry.level.value for entry in entries))
                })
                
            return correlations
            
        except Exception as e:
            logger.error(f"Log correlation failed: {e}")
            return []
            
    def _calculate_time_span(self, entries: List[LogEntry]) -> float:
        """Calculate time span of log entries"""
        if len(entries) < 2:
            return 0.0
            
        timestamps = [entry.timestamp for entry in entries]
        return (max(timestamps) - min(timestamps)).total_seconds()
        
    async def detect_anomalies(self, log_entries: List[LogEntry]) -> List[Dict[str, Any]]:
        """Detect anomalies in log patterns"""
        anomalies = []
        
        try:
            # Error rate anomalies
            error_entries = [entry for entry in log_entries if entry.level in [LogLevel.ERROR, LogLevel.FATAL]]
            if len(error_entries) > len(log_entries) * 0.1:  # More than 10% errors
                anomalies.append({
                    'type': 'high_error_rate',
                    'severity': 'high',
                    'description': f'High error rate detected: {len(error_entries)} errors out of {len(log_entries)} entries',
                    'entries': len(error_entries)
                })
                
            # Repeated error messages
            error_messages = [entry.message for entry in error_entries]
            message_counts = {}
            for message in error_messages:
                message_counts[message] = message_counts.get(message, 0) + 1
                
            for message, count in message_counts.items():
                if count > 5:  # Same error message repeated more than 5 times
                    anomalies.append({
                        'type': 'repeated_error',
                        'severity': 'medium',
                        'description': f'Repeated error message: {message}',
                        'count': count
                    })
                    
            # Service availability issues
            service_entries = {}
            for entry in log_entries:
                if entry.service not in service_entries:
                    service_entries[entry.service] = []
                service_entries[entry.service].append(entry)
                
            for service, entries in service_entries.items():
                service_errors = [e for e in entries if e.level in [LogLevel.ERROR, LogLevel.FATAL]]
                if len(service_errors) > len(entries) * 0.2:  # More than 20% errors for a service
                    anomalies.append({
                        'type': 'service_degradation',
                        'severity': 'high',
                        'description': f'Service {service} showing high error rate',
                        'service': service,
                        'error_rate': len(service_errors) / len(entries)
                    })
                    
            return anomalies
            
        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}")
            return []

class LogCollector:
    """Log collection from various sources"""
    
    def __init__(self):
        self.log_sources = {}
        self.parser = LogParser()
        self.running = False
        
    def add_log_source(self, name: str, path: str, source_type: LogSource):
        """Add log source"""
        self.log_sources[name] = {
            'path': path,
            'type': source_type,
            'position': 0,
            'inode': None
        }
        
    async def start_collection(self):
        """Start log collection"""
        self.running = True
        logger.info("Log collection started")
        
        # Start collection tasks for each source
        for name, config in self.log_sources.items():
            asyncio.create_task(self._collect_from_source(name, config))
            
    async def stop_collection(self):
        """Stop log collection"""
        self.running = False
        logger.info("Log collection stopped")
        
    async def _collect_from_source(self, name: str, config: Dict[str, Any]):
        """Collect logs from specific source"""
        while self.running:
            try:
                log_path = config['path']
                
                if not os.path.exists(log_path):
                    await asyncio.sleep(10)
                    continue
                    
                # Check if file was rotated
                current_inode = os.stat(log_path).st_ino
                if config['inode'] and config['inode'] != current_inode:
                    # File was rotated, reset position
                    config['position'] = 0
                    
                config['inode'] = current_inode
                
                # Read new lines
                with open(log_path, 'r') as f:
                    f.seek(config['position'])
                    
                    for line in f:
                        if line.strip():
                            log_entry = await self.parser.parse_log_line(
                                line, config['type']
                            )
                            
                            if log_entry:
                                # Yield log entry for processing
                                yield log_entry
                                
                    config['position'] = f.tell()
                    
                await asyncio.sleep(1)  # Check every second
                
            except Exception as e:
                logger.error(f"Log collection error for {name}: {e}")
                await asyncio.sleep(10)

class CentralizedLoggingSystem:
    """Main centralized logging system"""
    
    def __init__(self):
        self.elasticsearch = ElasticsearchManager()
        self.correlator = LogCorrelator()
        self.collector = LogCollector()
        self.running = False
        
        # Metrics
        self.processed_logs = 0
        self.processing_errors = 0
        
    async def initialize(self):
        """Initialize the logging system"""
        logger.info("Initializing centralized logging system")
        
        # Setup Elasticsearch
        await self.elasticsearch.create_index_template()
        
        # Add default log sources
        self._setup_default_sources()
        
        # Setup correlation rules
        self._setup_correlation_rules()
        
        logger.info("Centralized logging system initialized")
        
    def _setup_default_sources(self):
        """Setup default log sources"""
        sources = [
            ('nginx_access', '/var/log/nginx/access.log', LogSource.NGINX),
            ('nginx_error', '/var/log/nginx/error.log', LogSource.NGINX),
            ('application', '/var/log/6fb-ai-agent/application.log', LogSource.APPLICATION),
            ('system', '/var/log/syslog', LogSource.SYSTEM),
            ('docker', '/var/lib/docker/containers/*/*-json.log', LogSource.DOCKER)
        ]
        
        for name, path, source_type in sources:
            self.collector.add_log_source(name, path, source_type)
            
    def _setup_correlation_rules(self):
        """Setup log correlation rules"""
        rules = [
            {
                'name': 'request_flow',
                'pattern': 'correlate by request_id',
                'window': 300  # 5 minutes
            },
            {
                'name': 'user_session',
                'pattern': 'correlate by user_id and session_id',
                'window': 3600  # 1 hour
            },
            {
                'name': 'error_cascade',
                'pattern': 'correlate errors within time window',
                'window': 60  # 1 minute
            }
        ]
        
        for rule in rules:
            self.correlator.add_correlation_rule(rule)
            
    async def start_processing(self):
        """Start log processing"""
        self.running = True
        logger.info("Log processing started")
        
        # Start log collection
        await self.collector.start_collection()
        
        # Start processing tasks
        asyncio.create_task(self._log_processing_loop())
        asyncio.create_task(self._correlation_analysis_loop())
        asyncio.create_task(self._anomaly_detection_loop())
        
    async def stop_processing(self):
        """Stop log processing"""
        self.running = False
        await self.collector.stop_collection()
        logger.info("Log processing stopped")
        
    async def _log_processing_loop(self):
        """Main log processing loop"""
        while self.running:
            try:
                # Process logs from collector
                async for log_entry in self.collector._collect_from_source("application", {"path": "/var/log/application.log", "type": LogSource.APPLICATION, "position": 0, "inode": None}):
                    # Index in Elasticsearch
                    success = await self.elasticsearch.index_log_entry(log_entry)
                    
                    if success:
                        self.processed_logs += 1
                    else:
                        self.processing_errors += 1
                        
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Log processing error: {e}")
                self.processing_errors += 1
                await asyncio.sleep(5)
                
    async def _correlation_analysis_loop(self):
        """Correlation analysis loop"""
        while self.running:
            try:
                # Get recent logs for correlation
                from_time = datetime.now() - timedelta(minutes=5)
                to_time = datetime.now()
                
                recent_logs = await self.elasticsearch.search_logs(
                    query={"match_all": {}},
                    from_time=from_time,
                    to_time=to_time,
                    size=1000
                )
                
                if recent_logs:
                    # Convert to LogEntry objects (simplified)
                    log_entries = []  # Would convert from ES results
                    
                    # Perform correlation
                    correlations = await self.correlator.correlate_logs(log_entries)
                    
                    # Log significant correlations
                    for correlation in correlations:
                        if correlation['entries'] > 10:  # Significant correlation
                            logger.info(f"Significant correlation detected: {correlation}")
                            
                await asyncio.sleep(300)  # Every 5 minutes
                
            except Exception as e:
                logger.error(f"Correlation analysis error: {e}")
                await asyncio.sleep(300)
                
    async def _anomaly_detection_loop(self):
        """Anomaly detection loop"""
        while self.running:
            try:
                # Get recent logs for anomaly detection
                from_time = datetime.now() - timedelta(minutes=10)
                to_time = datetime.now()
                
                recent_logs = await self.elasticsearch.search_logs(
                    query={"match_all": {}},
                    from_time=from_time,
                    to_time=to_time,
                    size=1000
                )
                
                if recent_logs:
                    # Convert to LogEntry objects (simplified)
                    log_entries = []  # Would convert from ES results
                    
                    # Detect anomalies
                    anomalies = await self.correlator.detect_anomalies(log_entries)
                    
                    # Alert on high severity anomalies
                    for anomaly in anomalies:
                        if anomaly['severity'] == 'high':
                            await self._send_anomaly_alert(anomaly)
                            
                await asyncio.sleep(600)  # Every 10 minutes
                
            except Exception as e:
                logger.error(f"Anomaly detection error: {e}")
                await asyncio.sleep(600)
                
    async def _send_anomaly_alert(self, anomaly: Dict[str, Any]):
        """Send anomaly alert"""
        try:
            webhook_url = os.getenv('SLACK_LOGGING_WEBHOOK_URL')
            if webhook_url:
                payload = {
                    "text": f"🚨 Log anomaly detected: {anomaly['type']}",
                    "attachments": [{
                        "color": "danger" if anomaly['severity'] == 'high' else "warning",
                        "fields": [
                            {"title": "Type", "value": anomaly['type'], "short": True},
                            {"title": "Severity", "value": anomaly['severity'], "short": True},
                            {"title": "Description", "value": anomaly['description'], "short": False}
                        ]
                    }]
                }
                
                async with aiohttp.ClientSession() as session:
                    await session.post(webhook_url, json=payload)
                    
        except Exception as e:
            logger.error(f"Anomaly alert failed: {e}")
            
    async def search_logs(self, query: str, from_time: datetime = None, 
                         to_time: datetime = None, size: int = 100) -> List[Dict[str, Any]]:
        """Search logs with query string"""
        try:
            # Convert query string to Elasticsearch query
            es_query = {"query_string": {"query": query}}
            
            return await self.elasticsearch.search_logs(
                query=es_query,
                from_time=from_time,
                to_time=to_time,
                size=size
            )
            
        except Exception as e:
            logger.error(f"Log search failed: {e}")
            return []
            
    async def get_system_status(self) -> Dict[str, Any]:
        """Get logging system status"""
        try:
            # Get recent metrics
            from_time = datetime.now() - timedelta(hours=1)
            to_time = datetime.now()
            
            metrics = await self.elasticsearch.get_aggregated_metrics(from_time, to_time)
            
            return {
                "processing_active": self.running,
                "processed_logs": self.processed_logs,
                "processing_errors": self.processing_errors,
                "error_rate": self.processing_errors / max(self.processed_logs, 1),
                "log_sources": len(self.collector.log_sources),
                "recent_metrics": metrics,
                "elasticsearch_connected": self.elasticsearch.es_client is not None
            }
            
        except Exception as e:
            logger.error(f"Status retrieval failed: {e}")
            return {}

# Usage example
async def main():
    # Initialize centralized logging system
    logging_system = CentralizedLoggingSystem()
    
    # Initialize system
    await logging_system.initialize()
    
    # Start processing
    await logging_system.start_processing()
    
    # Keep running
    try:
        while True:
            status = await logging_system.get_system_status()
            logger.info(f"Processed logs: {status.get('processed_logs', 0)}")
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        await logging_system.stop_processing()

if __name__ == "__main__":
    asyncio.run(main())