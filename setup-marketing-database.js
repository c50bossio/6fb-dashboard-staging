#!/usr/bin/env node

/**
 * Marketing Campaign Database Setup Script
 * 
 * This script sets up the complete marketing campaign database schema
 * including tables for campaigns, accounts, recipients, analytics, and billing.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DB_PATH = path.join(__dirname, 'data', 'agent_system.db');
const SCHEMA_PATH = path.join(__dirname, 'database', 'marketing-campaigns-schema.sql');

console.log('🚀 Setting up Marketing Campaign Database...');
console.log(`Database: ${DB_PATH}`);
console.log(`Schema: ${SCHEMA_PATH}`);

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`✅ Created data directory: ${dataDir}`);
}

// Read the schema file
if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`❌ Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
}

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
console.log(`✅ Read schema file (${schema.length} characters)`);

// SQLite-compatible version of the schema (PostgreSQL -> SQLite conversions)
const sqliteSchema = schema
    // Remove PostgreSQL extensions
    .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '')
    
    // Convert UUID generation
    .replace(/uuid_generate_v4\(\)/g, 'lower(hex(randomblob(4))) || "-" || lower(hex(randomblob(2))) || "-4" || substr(lower(hex(randomblob(2))),2) || "-" || substr("89ab",abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || "-" || lower(hex(randomblob(6)))')
    
    // Convert UUID type to TEXT
    .replace(/UUID/g, 'TEXT')
    
    // Convert TIMESTAMPTZ to DATETIME
    .replace(/TIMESTAMPTZ/g, 'DATETIME')
    
    // Convert DECIMAL to REAL
    .replace(/DECIMAL\([0-9,]+\)/g, 'REAL')
    
    // Convert INET to TEXT
    .replace(/INET/g, 'TEXT')
    
    // Convert array types to JSON
    .replace(/TEXT\[\]/g, 'JSON')
    
    // Convert JSONB to JSON
    .replace(/JSONB/g, 'JSON')
    
    // Remove PostgreSQL-specific syntax
    .replace(/ON DELETE CASCADE/g, '')
    .replace(/REFERENCES auth\.users\([^)]+\)/g, 'REFERENCES users(id)')
    
    // Convert NOW() to datetime('now')
    .replace(/NOW\(\)/g, "datetime('now')")
    .replace(/DEFAULT NOW\(\)/g, "DEFAULT (datetime('now'))")
    
    // Remove PostgreSQL functions and triggers (not supported in SQLite)
    .replace(/CREATE OR REPLACE FUNCTION[^$]*?\$\$ LANGUAGE plpgsql[^;]*;/gs, '-- PostgreSQL function removed for SQLite compatibility')
    .replace(/CREATE TRIGGER[^;]*;/g, '-- PostgreSQL trigger removed for SQLite compatibility')
    
    // Remove complex CHECK constraints that might not work in SQLite
    .replace(/CHECK \([^)]*IN \([^)]*\)\)/g, '')
    
    // Remove UNIQUE constraints that reference multiple columns with conditions
    .replace(/UNIQUE\([^)]*\bwhere\b[^)]*\)/gi, '')
    
    // Remove comments (not essential for functionality)
    .replace(/COMMENT ON [^;]*;/g, '')
    
    // Remove GRANT statements
    .replace(/GRANT [^;]*;/g, '');

// Write the SQLite schema to a temporary file
const tempSchemaPath = path.join(__dirname, 'temp-marketing-schema.sql');
fs.writeFileSync(tempSchemaPath, sqliteSchema);
console.log(`✅ Wrote SQLite-compatible schema to temp file`);

// Execute the schema using sqlite3 command
const sqlite3Process = spawn('sqlite3', [DB_PATH], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errors = '';

// Send the schema to sqlite3 via stdin
sqlite3Process.stdin.write(`.read ${tempSchemaPath}\n`);
sqlite3Process.stdin.end();

sqlite3Process.stdout.on('data', (data) => {
    output += data.toString();
});

sqlite3Process.stderr.on('data', (data) => {
    errors += data.toString();
});

sqlite3Process.on('close', (code) => {
    // Clean up temp file
    fs.unlinkSync(tempSchemaPath);
    
    if (code === 0) {
        console.log('✅ Schema applied successfully');
        
        // Verify tables were created
        const verifyProcess = spawn('sqlite3', [DB_PATH, "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%marketing%' OR name LIKE '%campaign%');"], {
            stdio: ['inherit', 'pipe', 'pipe']
        });
        
        let tableOutput = '';
        verifyProcess.stdout.on('data', (data) => {
            tableOutput += data.toString();
        });
        
        verifyProcess.on('close', (verifyCode) => {
            if (verifyCode === 0) {
                const tables = tableOutput.trim().split('\n').filter(t => t);
                
                if (tables.length > 0) {
                    console.log('\n📋 Marketing tables created:');
                    tables.forEach(table => {
                        console.log(`  - ${table}`);
                    });
                    console.log(`\n🎉 Marketing database setup completed! (${tables.length} tables created)`);
                } else {
                    console.log('\n⚠️  No marketing tables found - schema may have failed');
                }
            }
            
            // Insert basic test data
            console.log('\n📝 Inserting test data...');
            const testDataSQL = `
                INSERT OR IGNORE INTO marketing_accounts (
                    id, owner_id, owner_type, account_name, description, provider, 
                    sendgrid_from_email, sendgrid_from_name, is_active, is_verified, created_at
                ) VALUES (
                    'test-account-${Date.now()}',
                    'test-user-123',
                    'shop',
                    'Test Marketing Account',
                    'Default marketing account for testing',
                    'sendgrid',
                    'test@example.com',
                    'Test Barbershop',
                    1,
                    1,
                    datetime('now')
                );
                
                INSERT OR IGNORE INTO customer_segments (
                    id, created_by, name, description, criteria, segment_type, is_active, created_at
                ) VALUES (
                    'test-segment-${Date.now()}',
                    'test-user-123',
                    'All Customers',
                    'All active customers with email opt-in',
                    '{"email_opt_in": true, "is_active": true}',
                    'dynamic',
                    1,
                    datetime('now')
                );
            `;
            
            const testDataProcess = spawn('sqlite3', [DB_PATH], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            testDataProcess.stdin.write(testDataSQL);
            testDataProcess.stdin.end();
            
            testDataProcess.on('close', (testCode) => {
                if (testCode === 0) {
                    console.log('  ✅ Test data inserted successfully');
                } else {
                    console.log('  ⚠️  Could not insert test data');
                }
                
                console.log('\n✅ Marketing database setup completed successfully!');
            });
        });
        
    } else {
        console.error('❌ Schema application failed:');
        console.error(errors);
        process.exit(1);
    }
});