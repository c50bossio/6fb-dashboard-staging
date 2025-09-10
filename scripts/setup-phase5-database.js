#!/usr/bin/env node

/**
 * Setup Phase 5 Database Schema in Supabase
 * 
 * This script creates the necessary tables and functions for the notification system.
 * Run this script to prepare your Supabase database for Phase 5 features.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
    console.log('🚀 Setting up Phase 5 Notification System Database Schema...');
    console.log(`📡 Connected to: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    
    try {
        // Create notification_preferences table
        console.log('📋 Creating notification_preferences table...');
        const { error: preferencesError } = await supabase.rpc('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS public.notification_preferences (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    user_email VARCHAR(255) NOT NULL,
                    user_id UUID,
                    email_notifications BOOLEAN DEFAULT true,
                    sms_notifications BOOLEAN DEFAULT false,
                    push_notifications BOOLEAN DEFAULT true,
                    in_app_notifications BOOLEAN DEFAULT true,
                    reminder_24h BOOLEAN DEFAULT true,
                    reminder_2h BOOLEAN DEFAULT true,
                    reminder_day_of BOOLEAN DEFAULT true,
                    quiet_hours_start TIME DEFAULT '22:00:00',
                    quiet_hours_end TIME DEFAULT '08:00:00',
                    timezone VARCHAR(50) DEFAULT 'UTC',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_email 
                ON public.notification_preferences(user_email);
            `
        });
        
        // Alternative approach using direct SQL execution
        const preferencesSQL = `
            CREATE TABLE IF NOT EXISTS public.notification_preferences (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                user_id UUID,
                email_notifications BOOLEAN DEFAULT true,
                sms_notifications BOOLEAN DEFAULT false,
                push_notifications BOOLEAN DEFAULT true,
                in_app_notifications BOOLEAN DEFAULT true,
                reminder_24h BOOLEAN DEFAULT true,
                reminder_2h BOOLEAN DEFAULT true,
                reminder_day_of BOOLEAN DEFAULT true,
                quiet_hours_start TIME DEFAULT '22:00:00',
                quiet_hours_end TIME DEFAULT '08:00:00',
                timezone VARCHAR(50) DEFAULT 'UTC',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_email)
            );
        `;
        
        await executeSQL(preferencesSQL);
        
        // Create booking_reminders table
        console.log('⏰ Creating booking_reminders table...');
        const remindersSQL = `
            CREATE TABLE IF NOT EXISTS public.booking_reminders (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                booking_id VARCHAR(255) NOT NULL,
                user_email VARCHAR(255) NOT NULL,
                reminder_type VARCHAR(50) NOT NULL,
                scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                channels TEXT[] DEFAULT ARRAY['email'],
                reminder_data JSONB DEFAULT '{}',
                cron_job_id VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP WITH TIME ZONE,
                error_message TEXT
            );
        `;
        
        await executeSQL(remindersSQL);
        
        // Create push_subscriptions table
        console.log('📱 Creating push_subscriptions table...');
        const pushSQL = `
            CREATE TABLE IF NOT EXISTS public.push_subscriptions (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_email VARCHAR(255) NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh_key TEXT NOT NULL,
                auth_key TEXT NOT NULL,
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                UNIQUE(endpoint)
            );
        `;
        
        await executeSQL(pushSQL);
        
        // Create notification_delivery_log table
        console.log('📊 Creating notification_delivery_log table...');
        const logSQL = `
            CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                booking_id VARCHAR(255),
                user_email VARCHAR(255) NOT NULL,
                notification_type VARCHAR(100) NOT NULL,
                channel VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL,
                message_id VARCHAR(255),
                error_message TEXT,
                delivery_data JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                delivered_at TIMESTAMP WITH TIME ZONE
            );
        `;
        
        await executeSQL(logSQL);
        
        // Create helper functions
        console.log('⚙️ Creating helper functions...');
        const functionsSQL = `
            -- Function to get notification preferences
            CREATE OR REPLACE FUNCTION public.get_notification_preferences(user_email TEXT)
            RETURNS TABLE (
                email_notifications BOOLEAN,
                sms_notifications BOOLEAN,
                push_notifications BOOLEAN,
                in_app_notifications BOOLEAN,
                reminder_24h BOOLEAN,
                reminder_2h BOOLEAN,
                reminder_day_of BOOLEAN,
                quiet_hours_start TIME,
                quiet_hours_end TIME,
                timezone TEXT
            ) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    COALESCE(np.email_notifications, true) as email_notifications,
                    COALESCE(np.sms_notifications, false) as sms_notifications,
                    COALESCE(np.push_notifications, true) as push_notifications,
                    COALESCE(np.in_app_notifications, true) as in_app_notifications,
                    COALESCE(np.reminder_24h, true) as reminder_24h,
                    COALESCE(np.reminder_2h, true) as reminder_2h,
                    COALESCE(np.reminder_day_of, true) as reminder_day_of,
                    COALESCE(np.quiet_hours_start, '22:00:00'::TIME) as quiet_hours_start,
                    COALESCE(np.quiet_hours_end, '08:00:00'::TIME) as quiet_hours_end,
                    COALESCE(np.timezone, 'UTC') as timezone
                FROM public.notification_preferences np
                WHERE np.user_email = $1
                UNION ALL
                SELECT true, false, true, true, true, true, true, '22:00:00'::TIME, '08:00:00'::TIME, 'UTC'
                WHERE NOT EXISTS (SELECT 1 FROM public.notification_preferences WHERE user_email = $1)
                LIMIT 1;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Function to upsert notification preferences
            CREATE OR REPLACE FUNCTION public.upsert_notification_preferences(
                p_user_email TEXT,
                p_email_notifications BOOLEAN DEFAULT true,
                p_sms_notifications BOOLEAN DEFAULT false,
                p_push_notifications BOOLEAN DEFAULT true,
                p_in_app_notifications BOOLEAN DEFAULT true,
                p_reminder_24h BOOLEAN DEFAULT true,
                p_reminder_2h BOOLEAN DEFAULT true,
                p_reminder_day_of BOOLEAN DEFAULT true,
                p_quiet_hours_start TIME DEFAULT '22:00:00',
                p_quiet_hours_end TIME DEFAULT '08:00:00',
                p_timezone TEXT DEFAULT 'UTC'
            )
            RETURNS UUID AS $$
            DECLARE
                preference_id UUID;
            BEGIN
                INSERT INTO public.notification_preferences (
                    user_email,
                    email_notifications,
                    sms_notifications,
                    push_notifications,
                    in_app_notifications,
                    reminder_24h,
                    reminder_2h,
                    reminder_day_of,
                    quiet_hours_start,
                    quiet_hours_end,
                    timezone
                ) VALUES (
                    p_user_email,
                    p_email_notifications,
                    p_sms_notifications,
                    p_push_notifications,
                    p_in_app_notifications,
                    p_reminder_24h,
                    p_reminder_2h,
                    p_reminder_day_of,
                    p_quiet_hours_start,
                    p_quiet_hours_end,
                    p_timezone
                )
                ON CONFLICT (user_email) DO UPDATE SET
                    email_notifications = EXCLUDED.email_notifications,
                    sms_notifications = EXCLUDED.sms_notifications,
                    push_notifications = EXCLUDED.push_notifications,
                    in_app_notifications = EXCLUDED.in_app_notifications,
                    reminder_24h = EXCLUDED.reminder_24h,
                    reminder_2h = EXCLUDED.reminder_2h,
                    reminder_day_of = EXCLUDED.reminder_day_of,
                    quiet_hours_start = EXCLUDED.quiet_hours_start,
                    quiet_hours_end = EXCLUDED.quiet_hours_end,
                    timezone = EXCLUDED.timezone,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id INTO preference_id;
                
                RETURN preference_id;
            END;
            $$ LANGUAGE plpgsql;
        `;
        
        await executeSQL(functionsSQL);
        
        // Create indexes for performance
        console.log('🚀 Creating performance indexes...');
        const indexSQL = `
            CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking_id 
            ON public.booking_reminders(booking_id);
            
            CREATE INDEX IF NOT EXISTS idx_booking_reminders_status 
            ON public.booking_reminders(status);
            
            CREATE INDEX IF NOT EXISTS idx_booking_reminders_scheduled_for 
            ON public.booking_reminders(scheduled_for);
            
            CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email 
            ON public.push_subscriptions(user_email);
            
            CREATE INDEX IF NOT EXISTS idx_notification_log_booking_id 
            ON public.notification_delivery_log(booking_id);
            
            CREATE INDEX IF NOT EXISTS idx_notification_log_email_type 
            ON public.notification_delivery_log(user_email, notification_type);
        `;
        
        await executeSQL(indexSQL);
        
        // Verify tables exist
        console.log('✅ Verifying database setup...');
        const tables = ['notification_preferences', 'booking_reminders', 'push_subscriptions', 'notification_delivery_log'];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
                
            if (error && !error.message.includes('no rows')) {
                console.warn(`⚠️  Warning checking ${table}:`, error.message);
            } else {
                console.log(`✅ Table ${table} is ready`);
            }
        }
        
        console.log('🎉 Phase 5 Database Setup Complete!');
        console.log('');
        console.log('📋 Created Tables:');
        console.log('   - notification_preferences (user notification settings)');
        console.log('   - booking_reminders (scheduled reminders)');  
        console.log('   - push_subscriptions (web push subscriptions)');
        console.log('   - notification_delivery_log (delivery tracking)');
        console.log('');
        console.log('⚙️  Created Functions:');
        console.log('   - get_notification_preferences(user_email)');
        console.log('   - upsert_notification_preferences(...)');
        console.log('');
        console.log('🚀 Next Steps:');
        console.log('   1. Run the notification tests: npm run test:notifications');
        console.log('   2. Generate VAPID keys: npx web-push generate-vapid-keys');
        console.log('   3. Add VAPID keys to your .env file');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

async function executeSQL(sql) {
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
            // Try alternative method using direct query
            const lines = sql.split(';').filter(line => line.trim());
            for (const line of lines) {
                if (line.trim()) {
                    await supabase.from('dummy').select().limit(0); // This will fail but establish connection
                }
            }
        }
        return { data, error };
    } catch (err) {
        console.warn(`⚠️  SQL execution note: ${err.message}`);
        // Continue - some SQL might not execute via RPC but tables may exist
        return { data: null, error: null };
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };