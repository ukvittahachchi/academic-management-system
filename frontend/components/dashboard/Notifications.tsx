'use client';

import React from 'react';
import { format } from 'date-fns';
import { Notification } from '@/lib/types/dashboard';

interface NotificationsProps {
    notifications: Notification[];
}

export default function Notifications({ notifications }: NotificationsProps) {
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'assignment_due':
                return '⏰';
            case 'new_content':
                return '🎉';
            default:
                return '📢';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'assignment_due':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'new_content':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    if (notifications.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
                <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-3">🔔</div>
                    <p className="text-gray-600">No notifications</p>
                    <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <span className="text-sm text-gray-500">
                    {notifications.length} new
                </span>
            </div>

            <div className="space-y-3">
                {notifications.map((notification, index) => (
                    <div
                        key={index}
                        className={`p-3 border rounded-lg ${getNotificationColor(notification.type)}`}
                    >
                        <div className="flex items-start space-x-3">
                            <div className="text-xl">
                                {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium">{notification.title}</h4>
                                <p className="text-sm mt-1">{notification.message}</p>
                                <p className="text-xs opacity-75 mt-2">
                                    {format(new Date(notification.relevant_date), 'MMM dd, yyyy • hh:mm a')}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => {
                    // Mark all as read or view all
                }}
                className="w-full mt-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
                Mark All as Read
            </button>
        </div>
    );
}