const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const { excelConfig } = require('../config/excel');
const logger = require('../utils/logger');

class ExcelService {
    constructor() {
        this.reportsPath = path.join(__dirname, '../../reports');
        this.ensureReportsDirectory();
    }

    async ensureReportsDirectory() {
        try {
            await fs.mkdir(this.reportsPath, { recursive: true });
        } catch (error) {
            logger.error('Failed to create reports directory:', error);
        }
    }

    async generateStudentPerformanceReport(data, filters = {}) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Student Performance');

        // Add title and metadata
        this.addReportHeader(worksheet, 'Student Performance Report', filters);

        // Define columns
        const columns = [
            { header: 'Student Name', key: 'student_name', width: 25 },
            { header: 'Username', key: 'username', width: 20 },
            { header: 'Class/Grade', key: 'class_grade', width: 15 },
            { header: 'Module', key: 'module_name', width: 30 },
            { header: 'Units Completed', key: 'units_completed', width: 15 },
            { header: 'Total Assignments', key: 'total_assignments', width: 15 },
            { header: 'Assignments Done', key: 'assignments_completed', width: 15 },
            { header: 'Average Score %', key: 'average_score', width: 15, style: { numFmt: '0.00%' } },
            { header: 'Time Spent (hours)', key: 'total_time_spent', width: 15 },
            { header: 'Last Active', key: 'last_active', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
            { header: 'Status', key: 'status', width: 15 }
        ];

        worksheet.columns = columns;

        // Apply header styles
        worksheet.getRow(4).eachCell((cell) => {
            cell.fill = excelConfig.styles.header.fill;
            cell.font = excelConfig.styles.header.font;
            cell.alignment = excelConfig.styles.header.alignment;
            cell.border = excelConfig.styles.header.border;
        });

        // Add data rows with conditional formatting
        data.forEach((row, index) => {
            const dataRow = worksheet.addRow({
                student_name: row.full_name,
                username: row.username,
                class_grade: row.class_grade,
                module_name: row.module_name,
                units_completed: row.units_completed,
                total_assignments: row.total_assignments,
                assignments_completed: row.assignments_completed,
                average_score: row.average_score / 100,
                total_time_spent: (row.total_time_spent / 3600).toFixed(2),
                last_active: new Date(row.last_active),
                status: this.getPerformanceStatus(row.average_score)
            });

            // Apply conditional formatting
            const scoreCell = dataRow.getCell('average_score');
            if (row.average_score >= 80) {
                scoreCell.fill = excelConfig.styles.highlightGood.fill;
            } else if (row.average_score >= 60) {
                scoreCell.fill = excelConfig.styles.highlightWarning.fill;
            } else {
                scoreCell.fill = excelConfig.styles.highlightBad.fill;
            }

            // Format date cells
            dataRow.getCell('last_active').numFmt = 'yyyy-mm-dd hh:mm';
        });

        // Add summary row
        this.addSummaryRow(worksheet, data);

        // Auto-filter
        worksheet.autoFilter = {
            from: { row: 4, column: 1 },
            to: { row: worksheet.rowCount, column: columns.length }
        };

        // Freeze header row
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 4 }
        ];

        return workbook;
    }

    async generateClassSummaryReport(data, filters = {}) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Class Summary');

        this.addReportHeader(worksheet, 'Class Summary Report', filters);

        const columns = [
            { header: 'Class/Grade', key: 'class_grade', width: 20 },
            { header: 'Total Students', key: 'total_students', width: 15 },
            { header: 'Active Students', key: 'active_students', width: 15 },
            { header: 'Avg Completion %', key: 'avg_completion_rate', width: 15, style: { numFmt: '0.00%' } },
            { header: 'Average Score %', key: 'avg_score', width: 15, style: { numFmt: '0.00%' } },
            { header: 'Top Performer', key: 'top_performer', width: 25 },
            { header: 'Top Score %', key: 'top_score', width: 15, style: { numFmt: '0.00%' } },
            { header: 'Need Attention', key: 'need_attention', width: 15 },
            { header: 'Avg Time Spent (hrs)', key: 'avg_time_spent', width: 20 }
        ];

        worksheet.columns = columns;

        // Apply header styles
        worksheet.getRow(4).eachCell((cell) => {
            cell.fill = excelConfig.styles.header.fill;
            cell.font = excelConfig.styles.header.font;
            cell.alignment = excelConfig.styles.header.alignment;
            cell.border = excelConfig.styles.header.border;
        });

        // Add data
        data.forEach((row) => {
            worksheet.addRow({
                class_grade: row.class_grade,
                total_students: row.total_students,
                active_students: row.active_students,
                avg_completion_rate: row.avg_completion_rate / 100,
                avg_score: row.avg_score / 100,
                top_performer: row.top_performer,
                top_score: row.top_score / 100,
                need_attention: row.need_attention,
                avg_time_spent: (row.avg_time_spent / 3600).toFixed(2)
            });
        });

        // Add charts
        this.addClassCharts(worksheet, data);

        return workbook;
    }

    async generateSystemUsageReport(data, filters = {}) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('System Usage');

        this.addReportHeader(worksheet, 'System Usage Report', filters);

        const columns = [
            { header: 'Date', key: 'date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
            { header: 'Total Logins', key: 'total_logins', width: 15 },
            { header: 'Active Users', key: 'active_users', width: 15 },
            { header: 'Assignments Taken', key: 'new_assignments', width: 20 },
            { header: 'Modules Accessed', key: 'modules_accessed', width: 20 },
            { header: 'Avg Session (min)', key: 'avg_session_time', width: 20 },
            { header: 'Errors', key: 'error_count', width: 15 },
            { header: 'Peak Hour', key: 'peak_hour', width: 15 }
        ];

        worksheet.columns = columns;

        // Apply header styles
        worksheet.getRow(4).eachCell((cell) => {
            cell.fill = excelConfig.styles.header.fill;
            cell.font = excelConfig.styles.header.font;
            cell.alignment = excelConfig.styles.header.alignment;
            cell.border = excelConfig.styles.header.border;
        });

        // Add data
        data.forEach((row) => {
            worksheet.addRow({
                date: new Date(row.date),
                total_logins: row.total_logins,
                active_users: row.active_users,
                new_assignments: row.new_assignments,
                modules_accessed: row.modules_accessed,
                avg_session_time: row.avg_session_time,
                error_count: row.error_count,
                peak_hour: row.peak_hour
            });
        });

        // Add trend analysis
        this.addUsageTrends(worksheet, data);

        return workbook;
    }

    addReportHeader(worksheet, title, filters) {
        // Title
        worksheet.mergeCells('A1:K1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = title;
        titleCell.font = excelConfig.styles.title.font;
        titleCell.alignment = { horizontal: 'center' };

        // Subtitle with filters
        worksheet.mergeCells('A2:K2');
        const subtitleCell = worksheet.getCell('A2');
        subtitleCell.value = this.generateFilterText(filters);
        subtitleCell.font = excelConfig.styles.subTitle.font;
        subtitleCell.alignment = { horizontal: 'center' };

        // Generated date
        worksheet.mergeCells('A3:K3');
        const dateCell = worksheet.getCell('A3');
        dateCell.value = `Generated on: ${new Date().toLocaleString()}`;
        dateCell.font = { italic: true };
        dateCell.alignment = { horizontal: 'center' };
    }

    generateFilterText(filters) {
        const filterText = [];
        if (filters.startDate && filters.endDate) {
            filterText.push(`Period: ${filters.startDate} to ${filters.endDate}`);
        }
        if (filters.classGrade) {
            filterText.push(`Class: ${filters.classGrade}`);
        }
        if (filters.moduleId) {
            filterText.push(`Module ID: ${filters.moduleId}`);
        }
        return filterText.join(' | ') || 'All data';
    }

    getPerformanceStatus(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Average';
        return 'Needs Improvement';
    }

    addSummaryRow(worksheet, data) {
        const summaryRow = worksheet.addRow([]);
        summaryRow.height = 25;

        const avgScore = data.reduce((sum, row) => sum + row.average_score, 0) / data.length;
        const totalStudents = data.length;
        const completedAssignments = data.reduce((sum, row) => sum + row.assignments_completed, 0);
        const totalAssignments = data.reduce((sum, row) => sum + row.total_assignments, 0);
        const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments * 100).toFixed(2) : 0;

        worksheet.mergeCells(`A${summaryRow.number}:C${summaryRow.number}`);
        const summaryCell = worksheet.getCell(`A${summaryRow.number}`);
        summaryCell.value = 'SUMMARY';
        summaryCell.font = { bold: true, size: 11 };
        summaryCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
        };

        worksheet.getCell(`D${summaryRow.number}`).value = 'Avg Score:';
        worksheet.getCell(`E${summaryRow.number}`).value = `${avgScore.toFixed(2)}%`;

        worksheet.getCell(`F${summaryRow.number}`).value = 'Students:';
        worksheet.getCell(`G${summaryRow.number}`).value = totalStudents;

        worksheet.getCell(`H${summaryRow.number}`).value = 'Completion:';
        worksheet.getCell(`I${summaryRow.number}`).value = `${completionRate}%`;
    }

    addClassCharts(worksheet, data) {
        // This would add Excel charts - implementation depends on your needs
        // For now, we'll leave it as a placeholder
    }

    addUsageTrends(worksheet, data) {
        // Add trend analysis formulas
    }

    async saveWorkbook(workbook, filename) {
        const filePath = path.join(this.reportsPath, filename);
        await workbook.xlsx.writeFile(filePath);
        return filePath;
    }

    async generateReport(reportType, data, filters = {}) {
        let workbook;

        switch (reportType) {
            case 'student_performance':
                workbook = await this.generateStudentPerformanceReport(data, filters);
                break;
            case 'class_summary':
                workbook = await this.generateClassSummaryReport(data, filters);
                break;
            case 'system_usage':
                workbook = await this.generateSystemUsageReport(data, filters);
                break;
            case 'module_analytics':
                // Similar implementation for module analytics
                break;
            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }

        const filename = `${reportType}_${Date.now()}.xlsx`;
        const filePath = await this.saveWorkbook(workbook, filename);

        return {
            filename,
            filePath,
            fileSize: (await fs.stat(filePath)).size
        };
    }
}

module.exports = new ExcelService();