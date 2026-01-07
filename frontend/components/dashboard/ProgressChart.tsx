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

    // Check if we have any actual data to show
    const hasData = data && data.length > 0 && data.some(item => item.value > 0);

    // Prepare data for rendering - use placeholder if no real data
    const displayData = hasData ? data : [{ name: 'No Progress', value: 1, color: '#F3F4F6' }];

    const CustomTooltip = ({ active, payload }: any) => {
        if (!hasData) return null;

        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 backdrop-blur border border-gray-100 p-3 rounded-2xl shadow-xl">
                    <p className="font-bold text-gray-800">{payload[0].name}</p>
                    <p className="text-sm font-medium text-gray-500">
                        {payload[0].value} completed ({((payload[0].value / (total || 1)) * 100).toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    // Calculate overall percentage
    const overallPercentage = total && total > 0 ? Math.round(((completed || 0) / total) * 100) : 0;

    return (
        <div className="flex flex-col h-full w-full">
            {/* Always show title section if provided, even if empty */}
            {title && (
                <div className="mb-6 shrink-0 flex items-baseline justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
                        <p className="text-sm text-gray-500 font-medium">Your learning journey</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-brand-600">{completed || 0}</span>
                        <span className="text-gray-400 text-sm font-medium">/{total || 0}</span>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center min-h-[220px]">
                {/* Force explicit height for Recharts */}
                <div className="h-[220px] w-full relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={displayData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={100}
                                cornerRadius={8}
                                paddingAngle={hasData ? 4 : 0}
                                dataKey="value"
                                isAnimationActive={hasData} // Disable animation for static placeholder
                                stroke="none"
                            >
                                {displayData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color || COLORS[index % COLORS.length]}
                                        className="outline-none"
                                    />
                                ))}
                            </Pie>
                            {/* Central Text for Overall Progress */}
                            <text
                                x="50%"
                                y="50%"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-gray-900"
                            >
                                <tspan x="50%" dy="-0.5em" className="text-5xl font-black tracking-tighter" style={{ fontSize: '2.5rem', fontWeight: 900 }}>
                                    {overallPercentage}%
                                </tspan>
                                <tspan x="50%" dy="1.6em" className="text-xs font-bold uppercase tracking-widest fill-gray-400" style={{ fontSize: '0.75rem' }}>
                                    Done
                                </tspan>
                            </text>
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hasData ? (
                    data.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                            <div
                                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm font-medium text-gray-600 truncate flex-1">{item.name}</span>
                            <span className="text-sm font-bold text-gray-900">
                                {item.value}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center text-sm font-medium text-gray-400 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                        No progress recorded yet. Start learning! 🚀
                    </div>
                )}
            </div>
        </div>
    );
}