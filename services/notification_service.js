/**
 * Core Notification Service
 * 
 * Central hub for managing all types of notifications across channels.
 * Handles in-app notifications, delivery tracking, and notification routing.
 * 
 * @version 1.0.0
 * @author 6FB AI Agent System
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

class NotificationService {
    constructor() {
        this.isInitialized = false;
        this.initialize();
    }

    async initialize() {
        try {
            console.log('🔔 Initializing Notification Service...');
            this.isInitialized = true;
            console.log('✅ Notification Service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Notification Service:', error);
        }
    }

    /**
     * Send in-app notification
     * @param {string} userEmail - User's email address
     * @param {Object} notification - Notification data
     * @returns {Promise<Object>} Result of notification send
     */
    async sendInAppNotification(userEmail, notification) {
        try {
            console.log(`📱 Sending in-app notification to ${userEmail}`);

            // For now, simulate in-app notification
            // In a real implementation, this would integrate with your real-time system
            const notificationData = {
                id: `in-app-${Date.now()}`,
                user_email: userEmail,
                type: notification.type || 'general',
                title: notification.title,
                message: notification.message,
                data: notification.data || {},
                created_at: new Date().toISOString(),
                read: false
            };

            // Log to delivery tracking (if tables exist)
            try {
                await this.logDelivery({
                    booking_id: notification.booking_id,
                    user_email: userEmail,
                    notification_type: notification.type || 'in_app',
                    channel: 'in_app',
                    status: 'sent',
                    delivery_data: notificationData
                });
            } catch (logError) {
                console.warn('Failed to log in-app notification delivery:', logError.message);
            }

            return {
                success: true,
                notification_id: notificationData.id,
                channel: 'in_app',
                timestamp: notificationData.created_at
            };

        } catch (error) {
            console.error('Error sending in-app notification:', error);
            
            // Log failed delivery
            try {
                await this.logDelivery({
                    booking_id: notification.booking_id,
                    user_email: userEmail,
                    notification_type: notification.type || 'in_app',
                    channel: 'in_app',
                    status: 'failed',
                    error_message: error.message
                });
            } catch (logError) {
                console.warn('Failed to log delivery error:', logError.message);
            }

            return {
                success: false,
                error: error.message,
                channel: 'in_app'
            };
        }
    }

    /**
     * Get user's notification preferences
     * @param {string} userEmail - User's email address
     * @returns {Promise<Object>} User's notification preferences
     */
    async getNotificationPreferences(userEmail) {
        try {
            // Try to get preferences from database
            const { data, error } = await supabase
                .rpc('get_notification_preferences', { user_email: userEmail });

            if (error) {
                console.warn('Error getting preferences, using defaults:', error);
                return this.getDefaultPreferences();
            }

            if (data && data.length > 0) {
                return data[0];
            }

            return this.getDefaultPreferences();

        } catch (error) {
            console.warn('Error fetching notification preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    /**
     * Get default notification preferences
     * @returns {Object} Default preferences
     */
    getDefaultPreferences() {
        return {
            email_notifications: true,
            sms_notifications: false,
            push_notifications: true,
            in_app_notifications: true,
            reminder_24h: true,
            reminder_2h: true,
            reminder_day_of: true,
            quiet_hours_start: '22:00:00',
            quiet_hours_end: '08:00:00',
            timezone: 'UTC'
        };
    }

    /**
     * Update user's notification preferences
     * @param {string} userEmail - User's email address
     * @param {Object} preferences - New preferences
     * @returns {Promise<Object>} Update result
     */
    async updateNotificationPreferences(userEmail, preferences) {
        try {
            const { data, error } = await supabase
                .rpc('upsert_notification_preferences', {
                    p_user_email: userEmail,
                    p_email_notifications: preferences.email_notifications,
                    p_sms_notifications: preferences.sms_notifications,
                    p_push_notifications: preferences.push_notifications,
                    p_in_app_notifications: preferences.in_app_notifications,
                    p_reminder_24h: preferences.reminder_24h,
                    p_reminder_2h: preferences.reminder_2h,
                    p_reminder_day_of: preferences.reminder_day_of,
                    p_quiet_hours_start: preferences.quiet_hours_start,
                    p_quiet_hours_end: preferences.quiet_hours_end,
                    p_timezone: preferences.timezone || 'UTC'
                });

            if (error) {
                throw error;
            }

            return {
                success: true,
                preference_id: data,
                updated_preferences: preferences
            };

        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Log notification delivery
     * @param {Object} deliveryData - Delivery log data
     * @returns {Promise<void>}
     */
    async logDelivery(deliveryData) {
        try {
            const { error } = await supabase
                .from('notification_delivery_log')
                .insert({
                    booking_id: deliveryData.booking_id,
                    user_email: deliveryData.user_email,
                    notification_type: deliveryData.notification_type,
                    channel: deliveryData.channel,
                    status: deliveryData.status,
                    message_id: deliveryData.message_id,
                    error_message: deliveryData.error_message,
                    delivery_data: deliveryData.delivery_data || {},
                    delivered_at: deliveryData.status === 'sent' ? new Date().toISOString() : null
                });

            if (error) {
                console.warn('Failed to log notification delivery:', error.message);
            }

        } catch (error) {
            console.warn('Error logging delivery:', error.message);
        }
    }

    /**
     * Check if user is in quiet hours
     * @param {string} userEmail - User's email address
     * @param {string} timezone - User's timezone
     * @returns {Promise<boolean>} Whether user is in quiet hours
     */
    async isInQuietHours(userEmail, timezone = 'UTC') {
        try {
            const preferences = await this.getNotificationPreferences(userEmail);
            const now = new Date();
            
            // Convert to user's timezone
            const userTime = new Intl.DateTimeFormat('en', {
                timeZone: timezone || preferences.timezone || 'UTC',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(now);

            const [hours, minutes] = userTime.split(':').map(Number);
            const currentTime = hours * 60 + minutes;

            const [startHours, startMinutes] = preferences.quiet_hours_start.split(':').map(Number);
            const [endHours, endMinutes] = preferences.quiet_hours_end.split(':').map(Number);
            
            const quietStart = startHours * 60 + startMinutes;
            const quietEnd = endHours * 60 + endMinutes;

            // Handle quiet hours that span midnight
            if (quietStart > quietEnd) {
                return currentTime >= quietStart || currentTime <= quietEnd;
            } else {
                return currentTime >= quietStart && currentTime <= quietEnd;
            }

        } catch (error) {
            console.warn('Error checking quiet hours:', error);
            return false; // Default to not in quiet hours
        }
    }

    /**
     * Get notification stats for a user
     * @param {string} userEmail - User's email address
     * @param {number} days - Number of days to look back
     * @returns {Promise<Object>} Notification statistics
     */
    async getNotificationStats(userEmail, days = 30) {
        try {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - days);

            const { data, error } = await supabase
                .from('notification_delivery_log')
                .select('channel, status, notification_type')
                .eq('user_email', userEmail)
                .gte('created_at', sinceDate.toISOString());

            if (error) {
                console.warn('Error fetching notification stats:', error);
                return { total: 0, by_channel: {}, by_status: {}, by_type: {} };
            }

            const stats = {
                total: data.length,
                by_channel: {},
                by_status: {},
                by_type: {}
            };

            data.forEach(log => {
                // Count by channel
                stats.by_channel[log.channel] = (stats.by_channel[log.channel] || 0) + 1;
                
                // Count by status
                stats.by_status[log.status] = (stats.by_status[log.status] || 0) + 1;
                
                // Count by type
                stats.by_type[log.notification_type] = (stats.by_type[log.notification_type] || 0) + 1;
            });

            return stats;

        } catch (error) {
            console.error('Error getting notification stats:', error);
            return { total: 0, by_channel: {}, by_status: {}, by_type: {} };
        }
    }

    /**
     * Clean up old notifications
     * @param {number} days - Days to keep notifications
     * @returns {Promise<number>} Number of notifications deleted
     */
    async cleanupOldNotifications(days = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const { data, error } = await supabase
                .from('notification_delivery_log')
                .delete()
                .lt('created_at', cutoffDate.toISOString())
                .select('id');

            if (error) {
                console.error('Error cleaning up notifications:', error);
                return 0;
            }

            const deletedCount = data ? data.length : 0;
            console.log(`🧹 Cleaned up ${deletedCount} old notifications`);
            return deletedCount;

        } catch (error) {
            console.error('Error during notification cleanup:', error);
            return 0;
        }
    }

    /**
     * Health check for notification service
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            // Test database connectivity
            const { error } = await supabase
                .from('notification_delivery_log')
                .select('id')
                .limit(1);

            const dbHealthy = !error || error.message.includes('no rows');

            return {
                healthy: this.isInitialized && dbHealthy,
                initialized: this.isInitialized,
                database_connected: dbHealthy,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                healthy: false,
                initialized: this.isInitialized,
                database_connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
const notificationService = new NotificationService();

module.exports = {
    notificationService,
    NotificationService
};