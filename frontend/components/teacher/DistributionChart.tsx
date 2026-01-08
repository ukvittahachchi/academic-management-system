'use client';

import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DistributionChartProps {
    data: Array<{
        score_range: string;
        student_count: number;
        avg_score_in_range: number;
        avg_study_time: number;
    }>;
    title?: string;
    height?: number;
}

export default function DistributionChart({ data, title, height = 300 }: DistributionChartProps) {
    const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];

    const chartData = data.map(item => ({
        name: item.score_range,
        value: item.student_count,
        avgScore: item.avg_score_in_range.toFixed(1),
        avgStudyTime: Math.round(item.avg_study_time)
    }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border">
                    <p className="font-medium text-gray-900">{payload[0].name}</p>
                    <p className="text-sm text-gray-600">
                        Students: {payload[0].value}
                    </p>
                    <p className="text-sm text-gray-600">
                        Avg Score: {payload[0].payload.avgScore}
                    </p>
                    <p className="text-sm text-gray-600">
                        Avg Study Time: {payload[0].payload.avgStudyTime} min
                    </p>
                </div>
            );
        }
        return null;
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-xs font-bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            )}

            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={80}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stroke="#fff"
                                    strokeWidth={2}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                {chartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center">
                            <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                            {item.value} students
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}