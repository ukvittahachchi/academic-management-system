const cron = require('node-cron');
const Report = require('../models/Report.model');
const ExcelService = require('../services/excel.service');
const logger = require('./logger');

class ReportScheduler {
    constructor() {
        this.jobs = new Map();
    }

    async init() {
        // Load scheduled reports from database
        await this.loadScheduledReports();

        // Set up daily cleanup of old reports
        this.setupCleanupJob();
    }

    async loadScheduledReports() {
        try {
            // In a real app, you'd load from a scheduled_reports table
            logger.info('Report scheduler initialized');
        } catch (error) {
            logger.error('Failed to load scheduled reports:', error);
        }
    }

    setupCleanupJob() {
        // Run daily at 2 AM
        cron.schedule('0 2 * * *', async () => {
            try {
                const deletedCount = await Report.deleteOldReports(30);
                if (deletedCount > 0) {
                    logger.info(`Cleaned up ${deletedCount} old reports`);
                }
            } catch (error) {
                logger.error('Failed to clean up old reports:', error);
            }
        });
    }

    scheduleReport(scheduleId, cronExpression, callback) {
        if (this.jobs.has(scheduleId)) {
            this.jobs.get(scheduleId).stop();
        }

        const job = cron.schedule(cronExpression, callback);
        this.jobs.set(scheduleId, job);

        logger.info(`Scheduled report ${scheduleId} with expression ${cronExpression}`);
        return job;
    }

    cancelSchedule(scheduleId) {
        if (this.jobs.has(scheduleId)) {
            this.jobs.get(scheduleId).stop();
            this.jobs.delete(scheduleId);
            logger.info(`Cancelled schedule ${scheduleId}`);
        }
    }

    getCronExpression(schedule, dayOfWeek = 1, hour = 2) {
        switch (schedule) {
            case 'daily':
                return `0 ${hour} * * *`;
            case 'weekly':
                return `0 ${hour} * * ${dayOfWeek}`; // 0-6 (Sunday=0)
            case 'monthly':
                return `0 ${hour} 1 * *`;
            default:
                return `0 ${hour} * * *`;
        }
    }
}

module.exports = new ReportScheduler();