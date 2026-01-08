import React from 'react';

interface TeacherStatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'teal';
    trend?: {
        value: number;
        isPositive: boolean;
    };
    subtitle?: string;
}

export default function TeacherStatCard({
    title,
    value,
    icon,
    color,
    trend,
    subtitle
}: TeacherStatCardProps) {
    const colorClasses = {
        blue: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
        green: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
        purple: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200',
        orange: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
        red: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
        indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200',
        teal: 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200'
    };

    const iconClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
        indigo: 'bg-indigo-500',
        teal: 'bg-teal-500'
    };

    return (
        <div className={`p-6 rounded-xl border ${colorClasses[color]} transition-all hover:shadow-lg`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>

                    {trend && (
                        <div className="flex items-center mt-2">
                            <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-gray-500 ml-2">from last week</span>
                        </div>
                    )}

                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
                    )}
                </div>

                <div className={`p-3 rounded-full ${iconClasses[color]} text-white`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}