-- Data Import System Schema
-- Handles importing customer data from various booking platforms
-- Supports: Square, Booksy, Schedulicity, Acuity, Trafft, and generic CSV

-- Main import tracking table
CREATE TABLE IF NOT EXISTS data_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  source_platform VARCHAR(50) NOT NULL CHECK (source_platform IN ('square', 'booksy', 'schedulicity', 'acuity', 'trafft', 'csv', 'other')),
  import_type VARCHAR(50) NOT NULL CHECK (import_type IN ('customers', 'appointments', 'services', 'full')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'processing', 'completed', 'failed', 'partial', 'rolled_back')),
  
  -- File information
  original_filename TEXT,
  file_path TEXT,
  file_size_bytes BIGINT,
  file_format VARCHAR(20) CHECK (file_format IN ('csv', 'xlsx', 'xls', 'json', 'zip')),
  delimiter VARCHAR(10) DEFAULT ',',
  
  -- Import statistics
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  skipped_duplicates INTEGER DEFAULT 0,
  
  -- Configuration and results
  field_mapping JSONB, -- Maps source fields to our schema
  import_options JSONB, -- User-selected options (merge strategy, etc.)
  validation_errors JSONB, -- Array of validation errors
  error_summary TEXT, -- Human-readable error summary
  rollback_data JSONB, -- Data needed to undo the import
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  
  -- Performance metrics
  processing_time_ms INTEGER
  
  -- Indexes will be created separately after table creation
);

-- Staging table for validation before import
CREATE TABLE IF NOT EXISTS import_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES data_imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customer', 'appointment', 'service')),
  
  -- Raw and processed data
  raw_data JSONB NOT NULL, -- Original row data from CSV
  mapped_data JSONB, -- Data after field mapping
  normalized_data JSONB, -- Data after normalization (phone, email, etc.)
  
  -- Validation
  validation_status VARCHAR(50) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
  validation_errors JSONB, -- Array of validation error objects
  validation_warnings JSONB, -- Non-blocking issues
  
  -- Duplicate detection
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_id UUID, -- Reference to existing record if duplicate
  similarity_score DECIMAL(3,2), -- 0.00 to 1.00 similarity
  
  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  target_record_id UUID, -- ID of created/updated record
  processing_error TEXT
  
  -- Indexes will be created separately after table creation
);

-- Store field mapping configurations per barbershop/platform
CREATE TABLE IF NOT EXISTS import_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  source_platform VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customer', 'appointment', 'service')),
  
  -- Mapping configuration
  field_mappings JSONB NOT NULL, -- Array of {source: "field", target: "field", transform: "rule"}
  
  -- Metadata
  is_default BOOLEAN DEFAULT FALSE, -- Use as default for this platform
  name VARCHAR(255), -- User-friendly name for this mapping
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Log individual import actions for audit trail
CREATE TABLE IF NOT EXISTS import_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES data_imports(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) CHECK (action_type IN ('info', 'warning', 'error', 'success')),
  details JSONB,
  row_numbers INTEGER[], -- Affected row numbers if applicable
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Platform-specific configurations and limits
CREATE TABLE IF NOT EXISTS import_platform_configs (
  platform VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Import capabilities
  supports_customers BOOLEAN DEFAULT TRUE,
  supports_appointments BOOLEAN DEFAULT TRUE,
  supports_services BOOLEAN DEFAULT TRUE,
  supports_api BOOLEAN DEFAULT FALSE,
  supports_webhooks BOOLEAN DEFAULT FALSE,
  
  -- File specifications
  expected_delimiter VARCHAR(10) DEFAULT ',',
  expected_encoding VARCHAR(50) DEFAULT 'UTF-8',
  date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
  time_format VARCHAR(50) DEFAULT 'HH:mm:ss',
  max_file_size_mb INTEGER DEFAULT 50,
  typical_file_size_mb VARCHAR(50), -- e.g., "5-15"
  
  -- Field information
  required_fields JSONB, -- Array of required field names
  optional_fields JSONB, -- Array of optional field names
  field_descriptions JSONB, -- Field name -> description mapping
  
  -- User guidance
  export_instructions JSONB, -- Step-by-step export guide
  import_notes TEXT, -- Important notes for users
  known_limitations TEXT, -- Platform limitations
  estimated_time VARCHAR(50), -- e.g., "5-10 minutes"
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert platform configurations based on our research
INSERT INTO import_platform_configs (platform, display_name, description, typical_file_size_mb, estimated_time, export_instructions, known_limitations) VALUES
('square', 'Square Appointments', 'Import from Square Appointments', '5-15', '5-10 minutes', 
 '["Export Customer Directory from Square Dashboard", "Export Appointment History separately", "Upload both files here"]'::jsonb,
 'Square does not export future appointments. Services must be added manually.'),

('booksy', 'Booksy', 'Import from Booksy platform', '10-25', '1-2 days (support required)',
 '["Contact Booksy support for data export", "Convert Excel to CSV if needed", "Upload CSV file here"]'::jsonb,
 'Requires support assistance. Reviews may not be included.'),

('schedulicity', 'Schedulicity', 'Import from Schedulicity', '2-5 per barber', '15-30 minutes',
 '["Go to My Business > Reports", "Export Schedule by Provider", "Export each barber separately", "Upload all files here"]'::jsonb,
 'Must export each provider individually. Combine files or upload separately.'),

('acuity', 'Acuity Scheduling', 'Import from Acuity Scheduling', '20-40', '10-15 minutes',
 '["Go to Reports > Export", "Select date range", "Include intake forms if needed", "Download and upload CSV here"]'::jsonb,
 'Large exports may include extensive intake form data.'),

('trafft', 'Trafft', 'Import from Trafft.com', '5-20', '5-10 minutes',
 '["Navigate to Appointments tab", "Select date range", "Click Export Data", "Choose delimiter and columns", "Upload CSV here"]'::jsonb,
 'Custom fields will be imported. API integration coming soon.'),

('csv', 'Generic CSV', 'Upload any CSV file with customer or appointment data', 'Varies', '5-15 minutes',
 '["Prepare CSV with headers", "Ensure required fields are present", "Upload file here", "Map fields manually"]'::jsonb,
 'Manual field mapping required. Ensure proper date/time formatting.');

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_import_field_mappings_updated_at BEFORE UPDATE ON import_field_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_platform_configs_updated_at BEFORE UPDATE ON import_platform_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their barbershop's imports
CREATE POLICY "Users can view own barbershop imports" ON data_imports
  FOR SELECT TO authenticated
  USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create imports for own barbershop" ON data_imports
  FOR INSERT TO authenticated
  WITH CHECK (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'admin')
    )
  );

CREATE POLICY "Users can update own barbershop imports" ON data_imports
  FOR UPDATE TO authenticated
  USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'admin')
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users can view own staging data" ON import_staging
  FOR SELECT TO authenticated
  USING (
    import_id IN (SELECT id FROM data_imports WHERE barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can view own field mappings" ON import_field_mappings
  FOR ALL TO authenticated
  USING (
    barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own audit logs" ON import_audit_log
  FOR SELECT TO authenticated
  USING (
    import_id IN (SELECT id FROM data_imports WHERE barbershop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    ))
  );

-- Platform configs are public read
CREATE POLICY "Anyone can view platform configs" ON import_platform_configs
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_data_imports_barbershop ON data_imports(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_data_imports_status ON data_imports(status);
CREATE INDEX IF NOT EXISTS idx_data_imports_created ON data_imports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_import ON import_staging(import_id);
CREATE INDEX IF NOT EXISTS idx_staging_status ON import_staging(validation_status);
CREATE INDEX IF NOT EXISTS idx_staging_processed ON import_staging(processed);
CREATE INDEX IF NOT EXISTS idx_field_mappings_barbershop ON import_field_mappings(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_platform ON import_field_mappings(source_platform);
-- Ensure only one default per platform/entity/barbershop
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_mappings_unique_default ON import_field_mappings(barbershop_id, source_platform, entity_type) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_import ON import_audit_log(import_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON import_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imports_recent ON data_imports(barbershop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_validation ON import_staging(import_id, validation_status) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_recent ON import_audit_log(import_id, created_at DESC);

COMMENT ON TABLE data_imports IS 'Tracks all data import operations from external platforms';
COMMENT ON TABLE import_staging IS 'Temporary staging area for data validation before import';
COMMENT ON TABLE import_field_mappings IS 'Saved field mapping configurations per platform';
COMMENT ON TABLE import_audit_log IS 'Detailed audit trail of import operations';
COMMENT ON TABLE import_platform_configs IS 'Platform-specific import configurations and guidance';