'use client';

import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface ProgressChartProps {
    data: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    title?: string;
    total?: number;
    completed?: number;
}

export default function ProgressChart({ data, title, total, completed }: ProgressChartProps) {
    const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-sm font-bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border">
                    <p className="font-medium">{payload[0].name}</p>
                    <p className="text-sm text-gray-600">
                        {payload[0].value} ({((payload[0].value / (total || 1)) * 100).toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            {title && (
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    {total !== undefined && completed !== undefined && (
                        <p className="text-sm text-gray-600 mt-1">
                            {completed} of {total} completed ({((completed / total) * 100).toFixed(1)}%)
                        </p>
                    )}
                </div>
            )}

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={renderCustomLabel}
                            labelLine={false}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color || COLORS[index % COLORS.length]}
                                    stroke="#fff"
                                    strokeWidth={2}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center">
                        <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm text-gray-700 truncate">{item.name}</span>
                        <span className="text-sm font-medium ml-auto">
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}