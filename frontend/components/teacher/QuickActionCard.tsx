import React from 'react';

interface QuickActionCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    color: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'indigo';
    onClick: () => void;
}

export default function QuickActionCard({ title, description, icon: Icon, color, onClick }: QuickActionCardProps) {
    const colorStyles = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', shadow: 'shadow-blue-500/10' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', shadow: 'shadow-purple-500/10' },
        green: { bg: 'bg-green-50', text: 'text-green-600', shadow: 'shadow-green-500/10' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', shadow: 'shadow-orange-500/10' },
        pink: { bg: 'bg-pink-50', text: 'text-pink-600', shadow: 'shadow-pink-500/10' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', shadow: 'shadow-indigo-500/10' },
    };

    const style = colorStyles[color];

    return (
        <button
            onClick={onClick}
            className={`bg-white p-6 rounded-[2rem] shadow-xl ${style.shadow} border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all group text-left w-full`}
        >
            <div className={`w-14 h-14 ${style.bg} rounded-2xl flex items-center justify-center ${style.text} mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">{description}</p>
        </button>
    );
}
