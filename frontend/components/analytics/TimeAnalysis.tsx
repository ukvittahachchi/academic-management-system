'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface TimeAnalysisProps {
    timeData: Array<{
        session_date: string;
        day_of_week: string;
        hour_of_day: number;
        session_type: 'learning' | 'review' | 'assignment' | 'assessment';
        total_minutes: number;
        avg_focus_score: number;
        part_type: string;
        module_name: string;
        daily_total_minutes: number;
        avg_daily_minutes: number;
    }>;
    studentName: string;
}

export default function TimeAnalysis({ timeData, studentName }: TimeAnalysisProps) {
    const getSessionTypeColor = (type: string) => {
        switch (type) {
            case 'learning': return '#3B82F6';
            case 'review': return '#10B981';
            case 'assignment': return '#8B5CF6';
            case 'assessment': return '#F59E0B';
            default: return '#6B7280';
        }
    };

    const getFocusColor = (score: number) => {
        if (score >= 4) return 'text-green-600';
        if (score >= 3) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Prepare data for charts
    const dailyData = timeData.reduce((acc, item) => {
        const existing = acc.find(d => d.date === item.session_date);
        if (existing) {
            existing.minutes += item.total_minutes;
        } else {
            acc.push({
                date: item.session_date,
                day: format(parseISO(item.session_date), 'EEE'),
                minutes: item.total_minutes,
                sessions: 1
            });
        }
        return acc;
    }, [] as Array<{ date: string, day: string, minutes: number, sessions: number }>);

    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourData = timeData.filter(item => item.hour_of_day === hour);
        const totalMinutes = hourData.reduce((sum, item) => sum + item.total_minutes, 0);
        return {
            hour: `${hour}:00`,
            value: totalMinutes,
            sessionCount: hourData.length
        };
    }).filter(item => item.value > 0);

    const sessionTypeData = timeData.reduce((acc, item) => {
        const existing = acc.find(d => d.type === item.session_type);
        if (existing) {
            existing.value += item.total_minutes;
            existing.count += 1;
        } else {
            acc.push({
                type: item.session_type,
                value: item.total_minutes,
                count: 1,
                color: getSessionTypeColor(item.session_type)
            });
        }
        return acc;
    }, [] as Array<{ type: string, value: number, count: number, color: string }>);

    const calculateStats = () => {
        const totalMinutes = timeData.reduce((sum, item) => sum + item.total_minutes, 0);
        const avgDailyMinutes = timeData.length > 0
            ? totalMinutes / new Set(timeData.map(item => item.session_date)).size
            : 0;
        const avgFocus = timeData.length > 0
            ? timeData.reduce((sum, item) => sum + item.avg_focus_score, 0) / timeData.length
            : 0;
        const sessionCount = timeData.length;

        return { totalMinutes, avgDailyMinutes, avgFocus, sessionCount };
    };

    const stats = calculateStats();

    const formatMinutes = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Time Analysis</h3>
                <p className="text-sm text-gray-600 mt-1">
                    {studentName}'s study time patterns and focus
                </p>
            </div>

            {/* Stats Overview */}
            <div className="p-6 border-b bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {formatMinutes(stats.totalMinutes)}
                        </div>
                        <div className="text-sm text-gray-600">Total Study Time</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {formatMinutes(stats.avgDailyMinutes)}
                        </div>
                        <div className="text-sm text-gray-600">Avg Daily Time</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {stats.sessionCount}
                        </div>
                        <div className="text-sm text-gray-600">Study Sessions</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {stats.avgFocus.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">Avg Focus (1-5)</div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Daily Study Time */}
                    <div>
                        <h4 className="font-medium text-gray-900 mb-4">Daily Study Time</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyData.slice(-7).reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="day"
                                        stroke="#666"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={12}
                                        label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                        formatter={(value) => [`${value} minutes`, 'Study Time']}
                                        labelFormatter={(label) => `Day: ${label}`}
                                    />
                                    <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                                        {dailyData.slice(-7).reverse().map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.minutes > 60 ? '#3B82F6' : '#93C5FD'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Hourly Study Pattern */}
                    <div>
                        <h4 className="font-medium text-gray-900 mb-4">Study Time by Hour</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="hour"
                                        stroke="#666"
                                        fontSize={10}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        fontSize={12}
                                        label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                        formatter={(value) => [`${value} minutes`, 'Study Time']}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#8B5CF6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Session Type Breakdown */}
                <div className="mb-8">
                    <h4 className="font-medium text-gray-900 mb-4">Study Time by Activity Type</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {sessionTypeData.map((session, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900 capitalize">
                                        {session.type}
                                    </span>
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: session.color }}
                                    ></div>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {formatMinutes(session.value)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {session.count} session{session.count !== 1 ? 's' : ''}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Sessions */}
                <div>
                    <h4 className="font-medium text-gray-900 mb-4">Recent Study Sessions</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date & Time
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Activity
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Duration
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Focus
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Module
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {timeData.slice(0, 5).map((session, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">
                                                {format(parseISO(session.session_date), 'MMM dd')}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {session.hour_of_day}:00 - {session.hour_of_day + 1}:00
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center">
                                                <div
                                                    className="w-3 h-3 rounded-full mr-2"
                                                    style={{ backgroundColor: getSessionTypeColor(session.session_type) }}
                                                ></div>
                                                <span className="text-sm capitalize">
                                                    {session.session_type}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 capitalize">
                                                {session.part_type}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {formatMinutes(session.total_minutes)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`font-medium ${getFocusColor(session.avg_focus_score)}`}>
                                                {session.avg_focus_score.toFixed(1)}/5
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {session.module_name}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {timeData.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-3">⏱️</div>
                        <p className="text-gray-600">No time tracking data available</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Study sessions will be tracked automatically
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}