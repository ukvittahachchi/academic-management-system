'use client';

import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Bar, BarChart } from 'recharts';
import { format } from 'date-fns';

interface PerformanceChartProps {
    data: Array<{
        date: string;
        active_students?: number;
        completed_items?: number;
        avg_score?: number;
        total_study_time?: number;
    }>;
    type?: 'line' | 'bar';
    title?: string;
    height?: number;
    showLegend?: boolean;
}

export default function PerformanceChart({
    data,
    type = 'line',
    title,
    height = 300,
    showLegend = true
}: PerformanceChartProps) {
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
                    <p className="font-medium text-gray-900 mb-2">{formatDate(label)}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                                <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: entry.color }}
                                ></div>
                                <span className="text-sm text-gray-600">{entry.name}:</span>
                            </div>
                            <span className="text-sm font-medium ml-4">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const chartLines = [
        { key: 'active_students', name: 'Active Students', color: '#3B82F6' },
        { key: 'completed_items', name: 'Completed Items', color: '#10B981' },
        { key: 'avg_score', name: 'Avg Score', color: '#8B5CF6' },
        { key: 'total_study_time', name: 'Study Time (min)', color: '#F59E0B' }
    ].filter(line => data.some(item => (item as any)[line.key] !== undefined));

    const ChartComponent = type === 'line' ? RechartsLineChart : BarChart;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            )}

            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ChartComponent data={data}>
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
                        {showLegend && <Legend />}

                        {type === 'line' ? (
                            chartLines.map((line) => (
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
                            ))
                        ) : (
                            chartLines.map((line, index) => (
                                <Bar
                                    key={line.key}
                                    dataKey={line.key}
                                    name={line.name}
                                    fill={line.color}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))
                        )}
                    </ChartComponent>
                </ResponsiveContainer>
            </div>
        </div>
    );
}