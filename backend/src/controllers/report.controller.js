const Report = require('../models/Report.model');
const ExcelService = require('../services/excel.service');
const db = require('../config/mysql');
const fs = require('fs').promises;
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');

class ReportController {
    // Generate report
    generateReport = asyncHandler(async (req, res) => {
        const { report_type, filters = {} } = req.body;
        const { schoolId, userId } = req.user;

        // Validate report type
        const validTypes = ['student_performance', 'class_summary', 'system_usage', 'module_analytics'];
        if (!validTypes.includes(report_type)) {
            throw new AppError('Invalid report type', 400);
        }

        // Get data based on report type
        let data;
        switch (report_type) {
            case 'student_performance':
                data = await Report.getStudentPerformanceData(schoolId, filters);
                break;
            case 'class_summary':
                data = await Report.getClassSummaryData(schoolId, filters);
                break;
            case 'system_usage':
                data = await Report.getSystemUsageData(schoolId, filters.days || 30);
                break;
            case 'module_analytics':
                data = await Report.getModuleAnalyticsData(schoolId, filters);
                break;
        }

        if (!data || data.length === 0) {
            throw new AppError('No data available for the selected criteria', 404);
        }

        // Generate Excel file
        const result = await ExcelService.generateReport(report_type, data, filters);

        // Save report metadata to database
        const reportId = await Report.createReport({
            school_id: schoolId,
            report_type,
            report_name: `${report_type.replace('_', ' ')} report`,
            generated_by: userId,
            parameters: filters,
            file_path: result.filePath,
            file_size_bytes: result.fileSize
        });

        res.status(201).json({
            success: true,
            data: {
                report_id: reportId,
                filename: result.filename,
                download_url: `/api/reports/download/${reportId}`,
                file_size: result.fileSize,
                record_count: data.length,
                generated_at: new Date().toISOString()
            }
        });
    });

    // Get all reports
    getReports = asyncHandler(async (req, res) => {
        const { schoolId, userId, role } = req.user;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const reports = await Report.getReports(schoolId, userId, role, parseInt(limit), parseInt(offset));

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM reports WHERE school_id = ?';
        const countParams = [schoolId];

        if (role === 'teacher') {
            countSql += ' AND generated_by = ?';
            countParams.push(userId);
        }

        const countResult = await db.query(countSql, countParams);
        const total = countResult[0]?.total || 0;

        res.json({
            success: true,
            data: reports,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    });

    // Download report
    downloadReport = asyncHandler(async (req, res) => {
        const { reportId } = req.params;
        const { schoolId } = req.user;

        const report = await Report.getReportById(reportId, schoolId);

        if (!report) {
            throw new AppError('Report not found or access denied', 404);
        }

        if (!await fs.access(report.file_path).then(() => true).catch(() => false)) {
            throw new AppError('Report file not found', 404);
        }

        // Increment download count
        await Report.incrementDownloadCount(reportId);

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${report.report_name}.xlsx"`);
        res.setHeader('Content-Length', report.file_size_bytes);

        // Stream the file
        const fileStream = require('fs').createReadStream(report.file_path);
        fileStream.pipe(res);
    });

    // Delete report
    deleteReport = asyncHandler(async (req, res) => {
        const { reportId } = req.params;
        const { schoolId, role, userId } = req.user;

        const report = await Report.getReportById(reportId, schoolId);

        if (!report) {
            throw new AppError('Report not found', 404);
        }

        // Only allow deletion by admin or the creator
        if (role !== 'admin' && report.generated_by !== userId) {
            throw new AppError('Not authorized to delete this report', 403);
        }

        // Delete file from disk
        try {
            await fs.unlink(report.file_path);
        } catch (error) {
            console.error('Failed to delete file:', error);
        }

        // Delete from database
        const sql = 'DELETE FROM reports WHERE report_id = ? AND school_id = ?';
        await db.execute(sql, [reportId, schoolId]);

        res.json({
            success: true,
            message: 'Report deleted successfully'
        });
    });

    // Get report types and configurations
    getReportConfigurations = asyncHandler(async (req, res) => {
        const { report_type } = req.query;

        let reportTypes = [];
        if (report_type) {
            const items = await Report.getReportItems(report_type);
            reportTypes = [{
                type: report_type,
                name: report_type.replace('_', ' ').toUpperCase(),
                description: this.getReportDescription(report_type),
                columns: items
            }];
        } else {
            reportTypes = [
                {
                    type: 'student_performance',
                    name: 'STUDENT PERFORMANCE',
                    description: 'Detailed performance analysis for individual students',
                    sample_filters: {
                        classGrade: 'Grade 6',
                        startDate: '2024-01-01',
                        endDate: '2024-12-31',
                        moduleId: 1
                    }
                },
                {
                    type: 'class_summary',
                    name: 'CLASS SUMMARY',
                    description: 'Summary of class performance and analytics',
                    sample_filters: {
                        startDate: '2024-01-01',
                        endDate: '2024-12-31'
                    }
                },
                {
                    type: 'system_usage',
                    name: 'SYSTEM USAGE',
                    description: 'System usage statistics and trends',
                    sample_filters: {
                        days: 30
                    }
                },
                {
                    type: 'module_analytics',
                    name: 'MODULE ANALYTICS',
                    description: 'Analysis of module effectiveness and engagement',
                    sample_filters: {
                        gradeLevel: 'Grade 6'
                    }
                }
            ];
        }

        res.json({
            success: true,
            data: reportTypes
        });
    });

    getReportDescription(type) {
        const descriptions = {
            student_performance: 'Shows individual student performance across modules, assignments, and time spent',
            class_summary: 'Provides class-level analytics including averages, top performers, and areas needing attention',
            system_usage: 'Tracks system engagement including logins, active users, and assignment completion rates',
            module_analytics: 'Analyzes module effectiveness, completion rates, and student feedback'
        };
        return descriptions[type] || 'No description available';
    }

    // Schedule report generation
    scheduleReport = asyncHandler(async (req, res) => {
        const { report_type, schedule, filters, email_notification } = req.body;
        const { schoolId, userId } = req.user;

        // Validate schedule
        const validSchedules = ['daily', 'weekly', 'monthly', 'custom'];
        if (!validSchedules.includes(schedule)) {
            throw new AppError('Invalid schedule', 400);
        }

        // In a real application, you would:
        // 1. Save schedule to database
        // 2. Set up cron job or queue
        // 3. Configure email notifications

        // For now, return success
        res.json({
            success: true,
            message: `Report scheduled for ${schedule} generation`,
            schedule_id: `sch_${Date.now()}`,
            next_run: this.calculateNextRun(schedule)
        });
    });

    calculateNextRun(schedule) {
        const now = new Date();
        switch (schedule) {
            case 'daily':
                now.setDate(now.getDate() + 1);
                break;
            case 'weekly':
                now.setDate(now.getDate() + 7);
                break;
            case 'monthly':
                now.setMonth(now.getMonth() + 1);
                break;
            default:
                now.setDate(now.getDate() + 1);
        }
        return now.toISOString();
    }
}

module.exports = new ReportController();