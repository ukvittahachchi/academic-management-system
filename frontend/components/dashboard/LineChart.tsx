'use client';

import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface LineChartProps {
    data: Array<{
        date: string;
        [key: string]: any;
    }>;
    lines: Array<{
        key: string;
        name: string;
        color: string;
    }>;
    title?: string;
    height?: number;
}

export default function LineChart({ data, lines, title, height = 300 }: LineChartProps) {
    const formatDate = (date: string) => {
        try {
            return format(new Date(date), 'MMM dd');
        } catch {
            return date;
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border">
                    <p className="font-medium text-gray-900">{formatDate(label)}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center mt-1">
                            <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: entry.color }}
                            ></div>
                            <span className="text-sm text-gray-600">{entry.name}:</span>
                            <span className="text-sm font-medium ml-2">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            )}

            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            stroke="#666"
                            fontSize={12}
                        />
                        <YAxis
                            stroke="#666"
                            fontSize={12}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {lines.map((line) => (
                            <Line
                                key={line.key}
                                type="monotone"
                                dataKey={line.key}
                                name={line.name}
                                stroke={line.color}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </RechartsLineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}