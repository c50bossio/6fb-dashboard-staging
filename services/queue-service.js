/**
 * Production Queue Service
 * Manages message queuing for scalable campaign processing
 */

const Bull = require('bull');
const Redis = require('ioredis');

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
        const delay = Math.min(times * 1000, 30000);
        console.log(`Redis reconnecting in ${delay}ms...`);
        return delay;
    }
};

// Create Redis clients
const redisClient = new Redis(redisConfig);
const redisSubscriber = new Redis(redisConfig);

// Queue definitions
const queues = {
    email: null,
    sms: null,
    webhook: null,
    analytics: null
};

// Queue configurations
const queueConfigs = {
    email: {
        name: 'email-campaigns',
        concurrency: parseInt(process.env.QUEUE_MAX_CONCURRENT_WORKERS) || 5,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        }
    },
    sms: {
        name: 'sms-campaigns',
        concurrency: 3,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 3000
            }
        }
    },
    webhook: {
        name: 'webhook-processing',
        concurrency: 10,
        defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 100,
            attempts: 5,
            backoff: {
                type: 'fixed',
                delay: 1000
            }
        }
    },
    analytics: {
        name: 'analytics-processing',
        concurrency: 2,
        defaultJobOptions: {
            removeOnComplete: 20,
            removeOnFail: 50,
            attempts: 2
        }
    }
};

class QueueService {
    constructor() {
        this.initialized = false;
        this.queues = {};
        this.metrics = {
            jobsProcessed: 0,
            jobsFailed: 0,
            avgProcessingTime: 0
        };
    }

    /**
     * Initialize all queues
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Test Redis connection
            await redisClient.ping();
            console.log('✅ Redis connection established');

            // Initialize each queue
            for (const [key, config] of Object.entries(queueConfigs)) {
                this.queues[key] = new Bull(config.name, {
                    redis: redisConfig,
                    defaultJobOptions: config.defaultJobOptions
                });

                // Set up event listeners
                this.setupQueueListeners(key, this.queues[key]);
                
                console.log(`✅ Queue initialized: ${config.name}`);
            }

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize queue service:', error);
            throw error;
        }
    }

    /**
     * Set up queue event listeners
     */
    setupQueueListeners(queueName, queue) {
        queue.on('completed', (job, result) => {
            this.metrics.jobsProcessed++;
            console.log(`✅ Job ${job.id} completed in ${queueName}`);
        });

        queue.on('failed', (job, err) => {
            this.metrics.jobsFailed++;
            console.error(`❌ Job ${job.id} failed in ${queueName}:`, err.message);
        });

        queue.on('stalled', (job) => {
            console.warn(`⚠️ Job ${job.id} stalled in ${queueName}`);
        });

        queue.on('error', (error) => {
            console.error(`❌ Queue error in ${queueName}:`, error);
        });
    }

    /**
     * Add email campaign to queue
     */
    async queueEmailCampaign(campaignData, options = {}) {
        if (!this.initialized) await this.initialize();

        const jobOptions = {
            priority: options.priority || parseInt(process.env.QUEUE_DEFAULT_PRIORITY) || 5,
            delay: options.delay || 0,
            attempts: options.attempts || 3
        };

        const job = await this.queues.email.add('send-email-campaign', campaignData, jobOptions);
        
        console.log(`📧 Email campaign queued: ${job.id}`);
        return job;
    }

    /**
     * Add SMS campaign to queue
     */
    async queueSMSCampaign(campaignData, options = {}) {
        if (!this.initialized) await this.initialize();

        const jobOptions = {
            priority: options.priority || 5,
            delay: options.delay || 0,
            attempts: options.attempts || 3
        };

        const job = await this.queues.sms.add('send-sms-campaign', campaignData, jobOptions);
        
        console.log(`📱 SMS campaign queued: ${job.id}`);
        return job;
    }

    /**
     * Add webhook processing job
     */
    async queueWebhook(webhookData, provider) {
        if (!this.initialized) await this.initialize();

        const job = await this.queues.webhook.add(`process-${provider}-webhook`, webhookData, {
            priority: 1,
            attempts: 5
        });

        return job;
    }

    /**
     * Add analytics processing job
     */
    async queueAnalytics(analyticsData) {
        if (!this.initialized) await this.initialize();

        const job = await this.queues.analytics.add('process-analytics', analyticsData, {
            priority: 10,
            delay: 5000
        });

        return job;
    }

    /**
     * Batch queue multiple recipients
     */
    async batchQueueRecipients(campaignId, recipients, type = 'email') {
        if (!this.initialized) await this.initialize();

        const batchSize = parseInt(process.env.QUEUE_BATCH_SIZE) || 100;
        const batches = [];
        
        // Split recipients into batches
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            batches.push(batch);
        }

        // Queue each batch with delay
        const jobs = [];
        for (let i = 0; i < batches.length; i++) {
            const delay = i * parseInt(process.env.QUEUE_BATCH_DELAY_MS || 1000);
            
            const jobData = {
                campaignId,
                recipients: batches[i],
                batchNumber: i + 1,
                totalBatches: batches.length
            };

            const queue = type === 'sms' ? this.queues.sms : this.queues.email;
            const job = await queue.add(`send-batch-${i + 1}`, jobData, {
                delay,
                priority: 5
            });

            jobs.push(job);
        }

        console.log(`📦 Queued ${batches.length} batches for campaign ${campaignId}`);
        return jobs;
    }

    /**
     * Get queue status
     */
    async getQueueStatus(queueName) {
        if (!this.initialized) await this.initialize();

        const queue = this.queues[queueName];
        if (!queue) throw new Error(`Queue ${queueName} not found`);

        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount()
        ]);

        return {
            name: queueName,
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + delayed
        };
    }

    /**
     * Get all queues status
     */
    async getAllQueuesStatus() {
        const status = {};
        
        for (const queueName of Object.keys(this.queues)) {
            status[queueName] = await this.getQueueStatus(queueName);
        }

        status.metrics = this.metrics;
        return status;
    }

    /**
     * Pause a queue
     */
    async pauseQueue(queueName) {
        if (!this.initialized) await this.initialize();

        const queue = this.queues[queueName];
        if (!queue) throw new Error(`Queue ${queueName} not found`);

        await queue.pause();
        console.log(`⏸️ Queue ${queueName} paused`);
    }

    /**
     * Resume a queue
     */
    async resumeQueue(queueName) {
        if (!this.initialized) await this.initialize();

        const queue = this.queues[queueName];
        if (!queue) throw new Error(`Queue ${queueName} not found`);

        await queue.resume();
        console.log(`▶️ Queue ${queueName} resumed`);
    }

    /**
     * Clear failed jobs
     */
    async clearFailedJobs(queueName) {
        if (!this.initialized) await this.initialize();

        const queue = this.queues[queueName];
        if (!queue) throw new Error(`Queue ${queueName} not found`);

        await queue.clean(0, 'failed');
        console.log(`🧹 Cleared failed jobs from ${queueName}`);
    }

    /**
     * Retry failed jobs
     */
    async retryFailedJobs(queueName, limit = 100) {
        if (!this.initialized) await this.initialize();

        const queue = this.queues[queueName];
        if (!queue) throw new Error(`Queue ${queueName} not found`);

        const failedJobs = await queue.getFailed(0, limit);
        let retryCount = 0;

        for (const job of failedJobs) {
            await job.retry();
            retryCount++;
        }

        console.log(`🔄 Retried ${retryCount} failed jobs in ${queueName}`);
        return retryCount;
    }

    /**
     * Get job by ID
     */
    async getJob(queueName, jobId) {
        if (!this.initialized) await this.initialize();

        const queue = this.queues[queueName];
        if (!queue) throw new Error(`Queue ${queueName} not found`);

        return await queue.getJob(jobId);
    }

    /**
     * Remove completed jobs older than specified ms
     */
    async cleanOldJobs(queueName, ageMs = 86400000) { // 24 hours default
        if (!this.initialized) await this.initialize();

        const queue = this.queues[queueName];
        if (!queue) throw new Error(`Queue ${queueName} not found`);

        const removed = await queue.clean(ageMs, 'completed');
        console.log(`🧹 Removed ${removed.length} old completed jobs from ${queueName}`);
        return removed;
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Shutting down queue service...');

        for (const [name, queue] of Object.entries(this.queues)) {
            await queue.close();
            console.log(`✅ Queue ${name} closed`);
        }

        await redisClient.quit();
        await redisSubscriber.quit();
        
        this.initialized = false;
        console.log('✅ Queue service shutdown complete');
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            await redisClient.ping();
            const status = await this.getAllQueuesStatus();
            
            return {
                healthy: true,
                redis: 'connected',
                queues: status
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
}

// Export singleton instance
const queueService = new QueueService();

// Node.js CommonJS export for compatibility
module.exports = queueService;
module.exports.QueueService = QueueService;