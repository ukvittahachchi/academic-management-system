const ExcelJS = require('exceljs');

const excelConfig = {
    // Style configurations
    styles: {
        header: {
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            },
            font: {
                color: { argb: 'FFFFFFFF' },
                bold: true,
                size: 12
            },
            alignment: {
                vertical: 'middle',
                horizontal: 'center'
            },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        },
        title: {
            font: {
                size: 16,
                bold: true,
                color: { argb: 'FF000000' }
            }
        },
        subTitle: {
            font: {
                size: 12,
                italic: true,
                color: { argb: 'FF666666' }
            }
        },
        percentage: {
            numFmt: '0.00%'
        },
        date: {
            numFmt: 'yyyy-mm-dd hh:mm'
        },
        highlightGood: {
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC6EFCE' }
            }
        },
        highlightWarning: {
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEB9C' }
            }
        },
        highlightBad: {
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFC7CE' }
            }
        }
    },

    // Column widths
    columnWidths: {
        student_performance: {
            'student_name': 25,
            'username': 20,
            'class_grade': 15,
            'module_name': 30,
            'units_completed': 15,
            'total_assignments': 15,
            'assignments_completed': 15,
            'average_score': 15,
            'total_time_spent': 15,
            'last_active': 20
        }
    }
};

module.exports = { excelConfig };