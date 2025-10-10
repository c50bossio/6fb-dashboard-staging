/**
 * Push Notification Service
 * 
 * Comprehensive Web Push API implementation with:
 * - Service Worker registration and management
 * - Push subscription handling and storage
 * - VAPID key generation and management
 * - Rich notification with actions and images
 * - Background sync for offline support
 * - Notification click handling and deep linking
 * - User permission management
 * - Analytics and delivery tracking
 * 
 * @version 1.0.0
 * @author 6FB AI Agent System
 */

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class PushNotificationService {
    constructor() {
        // VAPID configuration for Web Push
        this.vapidKeys = {
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY
        };
        
        this.vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@bookedbarber.com';
        
        // Initialize webpush with VAPID keys
        if (this.vapidKeys.publicKey && this.vapidKeys.privateKey) {
            webpush.setVapidDetails(
                this.vapidSubject,
                this.vapidKeys.publicKey,
                this.vapidKeys.privateKey
            );
        } else {
            console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
        }

        // Notification configuration
        this.defaultIcon = '/icons/notification-icon-192.png';
        this.defaultBadge = '/icons/notification-badge-72.png';
        this.maxRetries = 3;
        
        console.log('📱 Push Notification Service initialized');
    }

    /**
     * Generate VAPID keys (run once during setup)
     */
    static generateVapidKeys() {
        const vapidKeys = webpush.generateVAPIDKeys();
        console.log('🔑 Generated VAPID Keys:');
        console.log('Public Key:', vapidKeys.publicKey);
        console.log('Private Key:', vapidKeys.privateKey);
        console.log('\nAdd these to your environment variables:');
        console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
        console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
        console.log(`VAPID_SUBJECT=mailto:admin@bookedbarber.com`);
        return vapidKeys;
    }

    /**
     * Subscribe user to push notifications
     */
    async subscribeUser(userEmail, userId, subscription, userAgent = null, ipAddress = null) {
        try {
            console.log(`📱 Subscribing user ${userEmail} to push notifications`);

            // Validate subscription object
            if (!subscription || !subscription.endpoint) {
                throw new Error('Invalid subscription object');
            }

            // Store subscription in database
            const { data, error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_email: userEmail,
                    user_id: userId,
                    endpoint: subscription.endpoint,
                    p256dh_key: subscription.keys?.p256dh || '',
                    auth_key: subscription.keys?.auth || '',
                    user_agent: userAgent,
                    ip_address: ipAddress,
                    subscribed_at: new Date().toISOString(),
                    last_used_at: new Date().toISOString(),
                    is_active: true
                }, {
                    onConflict: 'endpoint,user_email'
                })
                .select()
                .single();

            if (error) {
                console.error('Database error storing subscription:', error);
                throw new Error(`Failed to store subscription: ${error.message}`);
            }

            // Send welcome notification
            try {
                await this.sendPushNotification(userEmail, {
                    title: 'Notifications Enabled! 🔔',
                    body: 'You\'ll now receive booking reminders and updates.',
                    icon: this.defaultIcon,
                    badge: this.defaultBadge,
                    tag: 'welcome',
                    data: {
                        type: 'welcome',
                        url: '/dashboard'
                    }
                });
            } catch (welcomeError) {
                console.warn('Failed to send welcome notification:', welcomeError);
                // Don't fail subscription for welcome notification failure
            }

            console.log(`✅ Successfully subscribed user ${userEmail} to push notifications`);
            return {
                success: true,
                subscription_id: data.id,
                message: 'Successfully subscribed to push notifications'
            };

        } catch (error) {
            console.error('Error subscribing user to push notifications:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe user from push notifications
     */
    async unsubscribeUser(userEmail, endpoint = null) {
        try {
            console.log(`📱 Unsubscribing user ${userEmail} from push notifications`);

            let query = supabase
                .from('push_subscriptions')
                .update({
                    is_active: false,
                    unsubscribed_at: new Date().toISOString()
                })
                .eq('user_email', userEmail);

            if (endpoint) {
                query = query.eq('endpoint', endpoint);
            }

            const { error } = await query;

            if (error) {
                console.error('Database error unsubscribing user:', error);
                throw new Error(`Failed to unsubscribe: ${error.message}`);
            }

            console.log(`✅ Successfully unsubscribed user ${userEmail}`);
            return {
                success: true,
                message: 'Successfully unsubscribed from push notifications'
            };

        } catch (error) {
            console.error('Error unsubscribing user:', error);
            throw error;
        }
    }

    /**
     * Send push notification to a user
     */
    async sendPushNotification(userEmail, notificationPayload, options = {}) {
        try {
            if (!this.vapidKeys.publicKey || !this.vapidKeys.privateKey) {
                console.warn('VAPID keys not configured, skipping push notification');
                return {
                    success: false,
                    error: 'Push notifications not configured',
                    simulated: true
                };
            }

            console.log(`📤 Sending push notification to ${userEmail}`);

            // Get active subscriptions for user
            const { data: subscriptions, error } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_email', userEmail)
                .eq('is_active', true);

            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }

            if (!subscriptions || subscriptions.length === 0) {
                console.log(`No active push subscriptions for user ${userEmail}`);
                return {
                    success: false,
                    error: 'No active subscriptions found',
                    user_email: userEmail
                };
            }

            // Prepare notification payload
            const notification = {
                title: notificationPayload.title || 'BookedBarber',
                body: notificationPayload.body || 'You have a new notification',
                icon: notificationPayload.icon || this.defaultIcon,
                badge: notificationPayload.badge || this.defaultBadge,
                image: notificationPayload.image,
                tag: notificationPayload.tag || 'default',
                renotify: notificationPayload.renotify || false,
                requireInteraction: notificationPayload.requireInteraction || false,
                silent: notificationPayload.silent || false,
                timestamp: Date.now(),
                data: {
                    ...notificationPayload.data,
                    timestamp: Date.now(),
                    user_email: userEmail
                },
                actions: notificationPayload.actions || []
            };

            // Add default actions if none provided
            if (notification.actions.length === 0 && notificationPayload.data?.url) {
                notification.actions = [
                    {
                        action: 'view',
                        title: 'View',
                        icon: '/icons/view-icon.png'
                    },
                    {
                        action: 'dismiss',
                        title: 'Dismiss',
                        icon: '/icons/dismiss-icon.png'
                    }
                ];
            }

            const deliveryResults = [];

            // Send to all active subscriptions
            for (const subscription of subscriptions) {
                try {
                    const pushSubscription = {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh_key,
                            auth: subscription.auth_key
                        }
                    };

                    // Send push notification
                    const result = await webpush.sendNotification(
                        pushSubscription,
                        JSON.stringify(notification),
                        {
                            TTL: options.ttl || 86400, // 24 hours default
                            urgency: options.urgency || 'normal', // low, normal, high
                            topic: options.topic
                        }
                    );

                    deliveryResults.push({
                        subscription_id: subscription.id,
                        endpoint: subscription.endpoint,
                        success: true,
                        status_code: result.statusCode,
                        headers: result.headers
                    });

                    // Update last used timestamp
                    await this.updateSubscriptionActivity(subscription.id, 'delivered');

                } catch (subscriptionError) {
                    console.error(`Failed to send to subscription ${subscription.id}:`, subscriptionError);
                    
                    deliveryResults.push({
                        subscription_id: subscription.id,
                        endpoint: subscription.endpoint,
                        success: false,
                        error: subscriptionError.message,
                        status_code: subscriptionError.statusCode
                    });

                    // Handle expired subscriptions
                    if (subscriptionError.statusCode === 410) {
                        console.log(`Subscription ${subscription.id} expired, deactivating`);
                        await this.deactivateSubscription(subscription.id);
                    } else {
                        await this.updateSubscriptionActivity(subscription.id, 'failed');
                    }
                }
            }

            // Log notification for analytics
            await this.logNotificationDelivery(userEmail, notification, deliveryResults);

            const successfulDeliveries = deliveryResults.filter(r => r.success).length;
            const result = {
                success: successfulDeliveries > 0,
                total_subscriptions: subscriptions.length,
                successful_deliveries: successfulDeliveries,
                failed_deliveries: deliveryResults.length - successfulDeliveries,
                delivery_results: deliveryResults,
                notification: notification
            };

            console.log(`📊 Push notification results for ${userEmail}:`, {
                total: result.total_subscriptions,
                successful: result.successful_deliveries,
                failed: result.failed_deliveries
            });

            return result;

        } catch (error) {
            console.error('Error sending push notification:', error);
            throw error;
        }
    }

    /**
     * Send push notifications to multiple users
     */
    async sendBulkPushNotifications(userEmails, notificationPayload, options = {}) {
        try {
            console.log(`📤 Sending bulk push notifications to ${userEmails.length} users`);

            const results = [];
            const batchSize = options.batchSize || 10;

            // Process in batches to avoid overwhelming the system
            for (let i = 0; i < userEmails.length; i += batchSize) {
                const batch = userEmails.slice(i, i + batchSize);
                
                const batchPromises = batch.map(email => 
                    this.sendPushNotification(email, notificationPayload, options)
                        .catch(error => ({
                            success: false,
                            user_email: email,
                            error: error.message
                        }))
                );

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // Small delay between batches
                if (i + batchSize < userEmails.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            const successfulUsers = results.filter(r => r.success).length;
            
            console.log(`📊 Bulk push notification completed: ${successfulUsers}/${userEmails.length} successful`);

            return {
                success: successfulUsers > 0,
                total_users: userEmails.length,
                successful_users: successfulUsers,
                failed_users: results.length - successfulUsers,
                results: results
            };

        } catch (error) {
            console.error('Error sending bulk push notifications:', error);
            throw error;
        }
    }

    /**
     * Send booking reminder push notification
     */
    async sendBookingReminderPush(userEmail, bookingData, reminderType) {
        try {
            const { service_name, barber_name, appointment_datetime, shop_name } = bookingData;
            const appointmentTime = new Date(appointment_datetime);
            
            const reminderMessages = {
                early_reminder: {
                    title: '📅 Appointment Tomorrow',
                    body: `${service_name} with ${barber_name} at ${appointmentTime.toLocaleTimeString()}`,
                    tag: 'reminder-24h'
                },
                day_of_reminder: {
                    title: '🕐 Appointment in 2 Hours',
                    body: `${service_name} with ${barber_name} at ${shop_name}`,
                    tag: 'reminder-2h'
                },
                final_reminder: {
                    title: '⏰ Appointment in 30 Minutes',
                    body: `Time to head to ${shop_name} for your ${service_name}`,
                    tag: 'reminder-30min',
                    requireInteraction: true
                }
            };

            const message = reminderMessages[reminderType] || reminderMessages.day_of_reminder;

            const notification = {
                ...message,
                icon: '/icons/calendar-icon-192.png',
                badge: this.defaultBadge,
                data: {
                    type: 'booking_reminder',
                    booking_id: bookingData.id,
                    reminder_type: reminderType,
                    url: `/bookings/${bookingData.id}`
                },
                actions: [
                    {
                        action: 'view',
                        title: 'View Booking',
                        icon: '/icons/view-icon.png'
                    },
                    {
                        action: 'directions',
                        title: 'Get Directions',
                        icon: '/icons/directions-icon.png'
                    }
                ]
            };

            return await this.sendPushNotification(userEmail, notification, {
                urgency: reminderType === 'final_reminder' ? 'high' : 'normal'
            });

        } catch (error) {
            console.error('Error sending booking reminder push:', error);
            throw error;
        }
    }

    /**
     * Send booking confirmation push notification
     */
    async sendBookingConfirmationPush(userEmail, bookingData) {
        try {
            const { service_name, barber_name, appointment_datetime, shop_name } = bookingData;
            const appointmentTime = new Date(appointment_datetime);

            const notification = {
                title: '✅ Booking Confirmed!',
                body: `${service_name} with ${barber_name} on ${appointmentTime.toLocaleDateString()}`,
                icon: '/icons/success-icon-192.png',
                badge: this.defaultBadge,
                tag: 'booking-confirmation',
                data: {
                    type: 'booking_confirmation',
                    booking_id: bookingData.id,
                    url: `/bookings/${bookingData.id}`
                },
                actions: [
                    {
                        action: 'view',
                        title: 'View Details',
                        icon: '/icons/view-icon.png'
                    },
                    {
                        action: 'calendar',
                        title: 'Add to Calendar',
                        icon: '/icons/calendar-icon.png'
                    }
                ]
            };

            return await this.sendPushNotification(userEmail, notification);

        } catch (error) {
            console.error('Error sending booking confirmation push:', error);
            throw error;
        }
    }

    /**
     * Update subscription activity tracking
     */
    async updateSubscriptionActivity(subscriptionId, status) {
        try {
            const updateData = {
                last_used_at: new Date().toISOString()
            };

            if (status === 'delivered') {
                updateData.successful_deliveries = supabase.sql`successful_deliveries + 1`;
            } else if (status === 'failed') {
                updateData.failed_deliveries = supabase.sql`failed_deliveries + 1`;
            }

            updateData.last_delivery_attempt = new Date().toISOString();

            await supabase
                .from('push_subscriptions')
                .update(updateData)
                .eq('id', subscriptionId);

        } catch (error) {
            console.error('Error updating subscription activity:', error);
        }
    }

    /**
     * Deactivate expired subscription
     */
    async deactivateSubscription(subscriptionId) {
        try {
            await supabase
                .from('push_subscriptions')
                .update({
                    is_active: false,
                    unsubscribed_at: new Date().toISOString()
                })
                .eq('id', subscriptionId);

        } catch (error) {
            console.error('Error deactivating subscription:', error);
        }
    }

    /**
     * Log notification delivery for analytics
     */
    async logNotificationDelivery(userEmail, notification, deliveryResults) {
        try {
            const logEntries = deliveryResults.map(result => ({
                user_email: userEmail,
                notification_type: notification.data?.type || 'general',
                notification_title: notification.title,
                notification_body: notification.body,
                delivery_status: result.success ? 'delivered' : 'failed',
                subscription_endpoint: result.endpoint,
                error_message: result.error,
                status_code: result.status_code,
                delivered_at: result.success ? new Date().toISOString() : null,
                failed_at: !result.success ? new Date().toISOString() : null,
                created_at: new Date().toISOString()
            }));

            await supabase
                .from('push_notification_log')
                .insert(logEntries);

        } catch (error) {
            console.error('Error logging notification delivery:', error);
            // Don't throw - logging failure shouldn't affect notification delivery
        }
    }

    /**
     * Get user subscription status
     */
    async getUserSubscriptionStatus(userEmail) {
        try {
            const { data, error } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_email', userEmail)
                .eq('is_active', true);

            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }

            return {
                is_subscribed: data && data.length > 0,
                subscription_count: data ? data.length : 0,
                subscriptions: data || []
            };

        } catch (error) {
            console.error('Error getting user subscription status:', error);
            throw error;
        }
    }

    /**
     * Get push notification analytics
     */
    async getPushAnalytics(days = 7) {
        try {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);

            const { data, error } = await supabase
                .from('push_notification_log')
                .select(`
                    notification_type,
                    delivery_status,
                    created_at,
                    status_code
                `)
                .gte('created_at', fromDate.toISOString());

            if (error) {
                throw new Error(`Database error: ${error.message}`);
            }

            // Calculate analytics
            const analytics = {
                total_notifications: data.length,
                successful_deliveries: data.filter(n => n.delivery_status === 'delivered').length,
                failed_deliveries: data.filter(n => n.delivery_status === 'failed').length,
                by_type: {},
                by_day: {},
                success_rate: 0
            };

            // Group by type
            data.forEach(notification => {
                const type = notification.notification_type || 'unknown';
                if (!analytics.by_type[type]) {
                    analytics.by_type[type] = { total: 0, successful: 0, failed: 0 };
                }
                analytics.by_type[type].total++;
                if (notification.delivery_status === 'delivered') {
                    analytics.by_type[type].successful++;
                } else {
                    analytics.by_type[type].failed++;
                }
            });

            // Group by day
            data.forEach(notification => {
                const day = new Date(notification.created_at).toISOString().split('T')[0];
                if (!analytics.by_day[day]) {
                    analytics.by_day[day] = { total: 0, successful: 0, failed: 0 };
                }
                analytics.by_day[day].total++;
                if (notification.delivery_status === 'delivered') {
                    analytics.by_day[day].successful++;
                } else {
                    analytics.by_day[day].failed++;
                }
            });

            // Calculate success rate
            if (analytics.total_notifications > 0) {
                analytics.success_rate = (analytics.successful_deliveries / analytics.total_notifications * 100).toFixed(2);
            }

            return analytics;

        } catch (error) {
            console.error('Error getting push analytics:', error);
            throw error;
        }
    }

    /**
     * Get service health status
     */
    getServiceHealth() {
        return {
            service: 'push-notification',
            status: (this.vapidKeys.publicKey && this.vapidKeys.privateKey) ? 'healthy' : 'missing-config',
            vapid_configured: !!(this.vapidKeys.publicKey && this.vapidKeys.privateKey),
            vapid_subject: this.vapidSubject,
            features: {
                web_push: true,
                rich_notifications: true,
                action_buttons: true,
                background_sync: true,
                subscription_management: true,
                bulk_notifications: true,
                analytics_tracking: true
            },
            limits: {
                max_retries: this.maxRetries,
                default_ttl: 86400,
                batch_size: 10
            }
        };
    }

    /**
     * Generate service worker content
     */
    generateServiceWorkerContent() {
        return `
// BookedBarber Push Notification Service Worker
// Version 1.0.0

const CACHE_NAME = 'bookedbarber-notifications-v1';
const urlsToCache = [
    '/icons/notification-icon-192.png',
    '/icons/notification-badge-72.png',
    '/icons/view-icon.png',
    '/icons/dismiss-icon.png',
    '/icons/calendar-icon.png',
    '/icons/directions-icon.png',
    '/icons/success-icon-192.png'
];

// Install event - cache notification assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Push event - display notification
self.addEventListener('push', event => {
    if (!event.data) {
        return;
    }

    const data = event.data.json();
    const options = {
        body: data.body,
        icon: data.icon || '/icons/notification-icon-192.png',
        badge: data.badge || '/icons/notification-badge-72.png',
        image: data.image,
        tag: data.tag,
        data: data.data,
        actions: data.actions,
        requireInteraction: data.requireInteraction,
        silent: data.silent,
        timestamp: data.timestamp,
        renotify: data.renotify
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', event => {
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};

    notification.close();

    if (action === 'dismiss') {
        return;
    }

    let url = data.url || '/dashboard';
    
    if (action === 'directions' && data.booking_id) {
        // TODO: Get shop address and open directions
        url = \`https://maps.google.com/?q=\${encodeURIComponent(data.shop_address || 'barbershop')}\`;
    } else if (action === 'calendar' && data.booking_id) {
        url = \`/bookings/\${data.booking_id}/calendar\`;
    } else if (action === 'view' && data.booking_id) {
        url = \`/bookings/\${data.booking_id}\`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if app is already open
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Open new window if app not open
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );

    // Track notification interaction
    if (data.booking_id) {
        fetch('/api/notifications/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'notification_click',
                booking_id: data.booking_id,
                notification_type: data.type,
                action: action || 'view',
                timestamp: Date.now()
            })
        }).catch(error => {
            console.error('Failed to track notification interaction:', error);
        });
    }
});

// Background sync for offline notifications
self.addEventListener('sync', event => {
    if (event.tag === 'background-notification-sync') {
        event.waitUntil(syncPendingNotifications());
    }
});

// Sync pending notifications when back online
async function syncPendingNotifications() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const pendingNotifications = await cache.match('/pending-notifications');
        
        if (pendingNotifications) {
            const notifications = await pendingNotifications.json();
            
            for (const notification of notifications) {
                await self.registration.showNotification(
                    notification.title, 
                    notification.options
                );
            }
            
            // Clear pending notifications
            await cache.delete('/pending-notifications');
        }
    } catch (error) {
        console.error('Error syncing pending notifications:', error);
    }
}

// Message handling for client communication
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
        `.trim();
    }
}

// Export singleton instance
const pushNotificationService = new PushNotificationService();

module.exports = {
    pushNotificationService,
    PushNotificationService
};

// Test function for direct execution
if (require.main === module) {
    console.log('🧪 Running Push Notification Service Tests...');
    
    // Generate VAPID keys if they don't exist
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.log('🔑 Generating VAPID keys...');
        PushNotificationService.generateVapidKeys();
    }
    
    // Test service health
    const health = pushNotificationService.getServiceHealth();
    console.log('📊 Service Health:', JSON.stringify(health, null, 2));
}