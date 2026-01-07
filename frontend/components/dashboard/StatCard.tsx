import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    change?: string;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
    description?: string;
}

export default function StatCard({ title, value, change, icon, color, description }: StatCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };

    const iconClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
        red: 'bg-red-100 text-red-600',
        indigo: 'bg-indigo-100 text-indigo-600'
    };

    return (
        <div className={`p-6 rounded-xl border ${colorClasses[color]} transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <p className="text-3xl font-bold mt-2">{value}</p>

                    {change && (
                        <div className="flex items-center mt-2">
                            <span className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                {change}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">from last week</span>
                        </div>
                    )}

                    {description && (
                        <p className="text-xs text-gray-600 mt-2">{description}</p>
                    )}
                </div>

                <div className={`p-3 rounded-full ${iconClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}