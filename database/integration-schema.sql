-- Integration Schema for SQLite
-- Supports Google Calendar, Traft.com, and other platform integrations

-- Core integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,  -- 'google_calendar', 'trafft', etc.
    barbershop_id TEXT NOT NULL DEFAULT 'default',
    is_active INTEGER NOT NULL DEFAULT 1,
    
    -- Encrypted credentials storage
    credentials TEXT NOT NULL,  -- JSON encrypted credentials
    account_info TEXT,  -- JSON account information
    
    -- Sync configuration
    sync_schedule TEXT DEFAULT 'hourly',  -- 'hourly', 'daily', 'manual'
    last_sync_at TEXT,
    next_sync_at TEXT,
    last_sync_error TEXT,
    
    -- Metadata
    metadata TEXT,  -- JSON platform-specific metadata
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Normalized appointments from all platforms
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_id TEXT NOT NULL,
    barbershop_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    platform_appointment_id TEXT NOT NULL,
    
    -- Core appointment data
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT DEFAULT '',
    status TEXT DEFAULT 'confirmed',  -- 'confirmed', 'cancelled', 'completed', 'no_show'
    
    -- Participant data (JSON)
    attendees TEXT DEFAULT '[]',  -- JSON array of attendees
    
    -- Additional metadata (JSON)
    metadata TEXT DEFAULT '{}',  -- JSON platform-specific data
    
    -- Timestamps
    created_at TEXT,
    updated_at TEXT,
    synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE,
    UNIQUE(integration_id, platform_appointment_id)
);

-- Integration statistics and analytics
CREATE TABLE IF NOT EXISTS integration_stats (
    integration_id TEXT PRIMARY KEY,
    total_appointments INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0.0,
    last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_barbershop_platform 
ON integrations(barbershop_id, platform);

CREATE INDEX IF NOT EXISTS idx_integrations_active_sync 
ON integrations(is_active, next_sync_at);

CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_time 
ON appointments(barbershop_id, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_integration_platform 
ON appointments(integration_id, platform);

CREATE INDEX IF NOT EXISTS idx_appointments_platform_status 
ON appointments(platform, status);

CREATE INDEX IF NOT EXISTS idx_appointments_sync_time 
ON appointments(synced_at);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_integrations_updated_at 
AFTER UPDATE ON integrations
BEGIN
    UPDATE integrations SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_integration_stats_timestamp 
AFTER UPDATE ON integration_stats
BEGIN
    UPDATE integration_stats SET last_updated = CURRENT_TIMESTAMP 
    WHERE integration_id = NEW.integration_id;
END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS active_integrations AS
SELECT 
    i.*,
    s.total_appointments,
    s.total_customers,
    s.total_revenue,
    s.last_updated as stats_updated
FROM integrations i
LEFT JOIN integration_stats s ON i.id = s.integration_id
WHERE i.is_active = 1;

CREATE VIEW IF NOT EXISTS recent_appointments AS
SELECT 
    a.*,
    i.platform as integration_platform,
    i.barbershop_id
FROM appointments a
JOIN integrations i ON a.integration_id = i.id
WHERE a.start_time >= date('now', '-7 days')
ORDER BY a.start_time DESC;

CREATE VIEW IF NOT EXISTS upcoming_appointments AS
SELECT 
    a.*,
    i.platform as integration_platform,
    i.barbershop_id
FROM appointments a
JOIN integrations i ON a.integration_id = i.id
WHERE a.start_time >= datetime('now')
AND a.status NOT IN ('cancelled', 'completed')
ORDER BY a.start_time ASC;

-- Sample data for testing (optional - can be removed in production)
-- INSERT OR IGNORE INTO integrations (id, platform, barbershop_id, credentials, account_info, metadata) 
-- VALUES (
--     'demo_google_cal',
--     'google_calendar', 
--     'default',
--     '{"encrypted": "demo_credentials"}',
--     '{"email": "demo@example.com", "name": "Demo Calendar"}',
--     '{"timezone": "America/New_York", "calendarsCount": 1}'
-- );

-- Clean up old appointments (optional maintenance)
-- DELETE FROM appointments WHERE synced_at < date('now', '-90 days');

-- Performance optimization settings for SQLite
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456; -- 256MB