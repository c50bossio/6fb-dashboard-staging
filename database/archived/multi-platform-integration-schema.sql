-- Multi-Platform Integration Database Schema
-- Extends existing schema to support multiple booking platform integrations

-- Integration management table (extends existing integrations table)
CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barbershop_id TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'trafft', 'google', 'acuity', 'square', 'booksy', 'generic'
    platform_display_name TEXT,
    credentials TEXT, -- JSON encrypted credentials
    is_active BOOLEAN DEFAULT 1,
    sync_schedule TEXT DEFAULT 'every_4_hours', -- 'realtime', 'hourly', 'every_4_hours', 'daily'
    last_sync_at DATETIME,
    next_sync_at DATETIME,
    last_sync_error TEXT,
    sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'completed', 'error'
    configuration TEXT, -- JSON platform-specific configuration
    metadata TEXT, -- JSON additional metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(barbershop_id, platform, metadata) -- Allow multiple integrations of same platform with different configs
);

-- Integration statistics
CREATE TABLE IF NOT EXISTS integration_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER NOT NULL,
    total_appointments INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    total_services INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0.0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
);

-- Unified appointments table (normalized from all platforms)
CREATE TABLE IF NOT EXISTS unified_appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barbershop_id TEXT NOT NULL,
    external_id TEXT NOT NULL, -- ID from source platform
    platform_id TEXT NOT NULL, -- Platform identifier
    integration_id INTEGER NOT NULL,
    
    -- Client data (JSON)
    client_data TEXT NOT NULL, -- JSON: {id, name, email, phone, isNewClient, etc.}
    
    -- Service data (JSON)
    service_data TEXT NOT NULL, -- JSON: {id, name, category, duration, price, etc.}
    
    -- Staff data (JSON)  
    staff_data TEXT NOT NULL, -- JSON: {id, name, role, specialties, etc.}
    
    -- Scheduling data (JSON)
    scheduling_data TEXT NOT NULL, -- JSON: {dateTime, timezone, duration, status, etc.}
    
    -- Business data (JSON)
    business_data TEXT NOT NULL, -- JSON: {location, room, chair, equipment, etc.}
    
    -- Payment data (JSON)
    payment_data TEXT NOT NULL, -- JSON: {total, currency, method, status, tip, etc.}
    
    -- Feedback data (JSON)
    feedback_data TEXT NOT NULL, -- JSON: {clientRating, review, staffNotes, etc.}
    
    -- Metadata (JSON)
    metadata TEXT NOT NULL, -- JSON: {source, bookingDate, lastModified, tags, customFields, etc.}
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE,
    UNIQUE(barbershop_id, external_id, platform_id) -- Prevent duplicates
);

-- Platform-specific sync logs
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER NOT NULL,
    sync_type TEXT NOT NULL, -- 'full', 'incremental', 'webhook'
    sync_status TEXT NOT NULL, -- 'started', 'completed', 'failed'
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_duration_ms INTEGER,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
);

-- Conflict resolution log
CREATE TABLE IF NOT EXISTS conflict_resolutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barbershop_id TEXT NOT NULL,
    appointment1_id INTEGER NOT NULL,
    appointment2_id INTEGER NOT NULL,
    conflict_type TEXT NOT NULL, -- 'duplicate_appointment', 'scheduling_conflict', 'data_mismatch'
    resolution_strategy TEXT NOT NULL, -- 'last_write_wins', 'platform_priority', 'revenue_priority'
    winner_appointment_id INTEGER NOT NULL,
    loser_appointment_id INTEGER NOT NULL,
    resolution_details TEXT, -- JSON details about the resolution
    resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment1_id) REFERENCES unified_appointments(id),
    FOREIGN KEY (appointment2_id) REFERENCES unified_appointments(id),
    FOREIGN KEY (winner_appointment_id) REFERENCES unified_appointments(id),
    FOREIGN KEY (loser_appointment_id) REFERENCES unified_appointments(id)
);

-- Business context for AI agents (enhanced)
CREATE TABLE IF NOT EXISTS business_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barbershop_id TEXT NOT NULL,
    context_type TEXT NOT NULL, -- 'financial_context', 'operations_context', 'client_acquisition_context', etc.
    agent_type TEXT NOT NULL, -- 'financial', 'operations', 'client_acquisition', 'master_coach', etc.
    context_data TEXT NOT NULL, -- JSON comprehensive business context
    data_quality_score REAL DEFAULT 0, -- 0-100 score of data completeness
    platforms_included TEXT, -- JSON array of platforms contributing to this context
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- When this context becomes stale
    UNIQUE(barbershop_id, context_type, agent_type)
);

-- Platform webhooks management
CREATE TABLE IF NOT EXISTS platform_webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id INTEGER NOT NULL,
    webhook_url TEXT NOT NULL,
    webhook_secret TEXT,
    event_types TEXT, -- JSON array of event types
    is_active BOOLEAN DEFAULT 1,
    last_ping_at DATETIME,
    ping_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
);

-- Webhook event log
CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL, -- JSON webhook payload
    processed_at DATETIME,
    processing_status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    error_message TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES platform_webhooks(id) ON DELETE CASCADE
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    barbershop_id TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start DATETIME NOT NULL,
    window_end DATETIME NOT NULL,
    is_limited BOOLEAN DEFAULT 0,
    PRIMARY KEY (platform, barbershop_id, window_start)
);

-- Platform capabilities and limitations
CREATE TABLE IF NOT EXISTS platform_capabilities (
    platform TEXT PRIMARY KEY,
    supports_webhooks BOOLEAN DEFAULT 0,
    supports_realtime_sync BOOLEAN DEFAULT 0,
    max_requests_per_hour INTEGER DEFAULT 100,
    max_requests_per_minute INTEGER DEFAULT 10,
    supported_operations TEXT, -- JSON array: ['read', 'create', 'update', 'delete']
    data_fields_available TEXT, -- JSON object mapping available fields
    rate_limit_reset_strategy TEXT, -- 'sliding_window', 'fixed_window'
    documentation_url TEXT,
    api_version TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default platform capabilities
INSERT OR REPLACE INTO platform_capabilities (
    platform, supports_webhooks, supports_realtime_sync, 
    max_requests_per_hour, max_requests_per_minute,
    supported_operations, data_fields_available
) VALUES 
('trafft', 1, 1, 100, 5, 
 '["read", "create", "update", "delete"]',
 '{"appointments": true, "customers": true, "services": true, "payments": true}'),
('google', 1, 1, 1000, 30, 
 '["read", "create", "update", "delete"]',
 '{"calendar_events": true, "attendees": true, "reminders": true}'),
('acuity', 1, 0, 300, 10, 
 '["read", "create", "update", "delete"]',
 '{"appointments": true, "clients": true, "services": true, "forms": true}'),
('square', 1, 1, 500, 20, 
 '["read", "create", "update", "delete"]',
 '{"bookings": true, "customers": true, "catalog": true, "payments": true}'),
('booksy', 0, 0, 50, 2, 
 '["read"]',
 '{"appointments": true, "customers": true, "reviews": true}'),
('generic', 0, 0, 10, 1, 
 '["read"]',
 '{"file_upload": true, "csv_parsing": true, "ical_parsing": true}');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_barbershop_active ON integrations(barbershop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_integrations_sync_schedule ON integrations(next_sync_at, is_active);
CREATE INDEX IF NOT EXISTS idx_unified_appointments_barbershop ON unified_appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_unified_appointments_external ON unified_appointments(external_id, platform_id);
CREATE INDEX IF NOT EXISTS idx_unified_appointments_datetime ON unified_appointments(barbershop_id, json_extract(scheduling_data, '$.dateTime'));
CREATE INDEX IF NOT EXISTS idx_unified_appointments_integration ON unified_appointments(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON sync_logs(integration_id, started_at);
CREATE INDEX IF NOT EXISTS idx_business_context_barbershop ON business_context(barbershop_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(processing_status, received_at);

-- Views for common queries
CREATE VIEW IF NOT EXISTS active_integrations AS
SELECT 
    i.*,
    s.total_appointments,
    s.total_customers,
    s.total_revenue,
    s.last_updated as stats_last_updated,
    pc.supports_webhooks,
    pc.max_requests_per_hour
FROM integrations i
LEFT JOIN integration_stats s ON i.id = s.integration_id
LEFT JOIN platform_capabilities pc ON i.platform = pc.platform
WHERE i.is_active = 1;

CREATE VIEW IF NOT EXISTS recent_appointments AS
SELECT 
    ua.*,
    i.platform,
    i.platform_display_name,
    json_extract(ua.scheduling_data, '$.dateTime') as appointment_datetime,
    json_extract(ua.client_data, '$.name') as client_name,
    json_extract(ua.service_data, '$.name') as service_name,
    json_extract(ua.payment_data, '$.total') as payment_total,
    json_extract(ua.scheduling_data, '$.status') as appointment_status
FROM unified_appointments ua
JOIN integrations i ON ua.integration_id = i.id
WHERE datetime(json_extract(ua.scheduling_data, '$.dateTime')) >= datetime('now', '-30 days')
  AND json_extract(ua.metadata, '$.isDuplicate') IS NULL
ORDER BY json_extract(ua.scheduling_data, '$.dateTime') DESC;

CREATE VIEW IF NOT EXISTS business_summary AS
SELECT 
    barbershop_id,
    COUNT(*) as total_appointments,
    COUNT(DISTINCT json_extract(client_data, '$.email')) as unique_clients,
    SUM(CAST(json_extract(payment_data, '$.total') as REAL)) as total_revenue,
    AVG(CAST(json_extract(payment_data, '$.total') as REAL)) as avg_revenue_per_appointment,
    COUNT(DISTINCT platform_id) as connected_platforms,
    MIN(datetime(json_extract(scheduling_data, '$.dateTime'))) as first_appointment,
    MAX(datetime(json_extract(scheduling_data, '$.dateTime'))) as last_appointment
FROM unified_appointments
WHERE json_extract(metadata, '$.isDuplicate') IS NULL
  AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', '-30 days')
GROUP BY barbershop_id;

-- Triggers for data integrity and automatic updates
CREATE TRIGGER IF NOT EXISTS update_integration_stats_on_appointment_insert
AFTER INSERT ON unified_appointments
BEGIN
    INSERT OR REPLACE INTO integration_stats (
        integration_id, 
        total_appointments, 
        total_customers, 
        total_revenue, 
        last_updated
    )
    SELECT 
        NEW.integration_id,
        COUNT(*),
        COUNT(DISTINCT json_extract(client_data, '$.email')),
        SUM(CAST(json_extract(payment_data, '$.total') as REAL)),
        datetime('now')
    FROM unified_appointments 
    WHERE integration_id = NEW.integration_id
      AND json_extract(metadata, '$.isDuplicate') IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS update_integration_updated_at
AFTER UPDATE ON integrations
BEGIN
    UPDATE integrations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_appointment_updated_at
AFTER UPDATE ON unified_appointments
BEGIN
    UPDATE unified_appointments SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Cleanup old data (optional - can be run periodically)
-- DELETE FROM sync_logs WHERE started_at < datetime('now', '-90 days');
-- DELETE FROM webhook_events WHERE received_at < datetime('now', '-30 days') AND processing_status = 'processed';
-- DELETE FROM rate_limit_tracking WHERE window_end < datetime('now', '-1 day');