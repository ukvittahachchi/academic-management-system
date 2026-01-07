'use client';

import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarChartProps {
    data: Array<{
        name: string;
        value: number;
        color?: string;
    }>;
    title?: string;
    height?: number;
    showAxis?: boolean;
}

export default function BarChart({ data, title, height = 300, showAxis = true }: BarChartProps) {
    const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border">
                    <p className="font-medium text-gray-900">{payload[0].payload.name}</p>
                    <p className="text-sm text-gray-600">
                        Value: <span className="font-medium">{payload[0].value}</span>
                    </p>
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
                    <RechartsBarChart data={data}>
                        {showAxis && (
                            <>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                    stroke="#666"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="#666"
                                    fontSize={12}
                                />
                            </>
                        )}
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color || COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Bar>
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}