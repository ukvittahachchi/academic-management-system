import React from 'react';
import clsx from 'clsx';

interface StudentCardProps {
    children: React.ReactNode;
    className?: string; // Allow custom classes
    title?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    variant?: 'default' | 'glass' | 'gradient';
}

const StudentCard: React.FC<StudentCardProps> = ({
    children,
    className = '',
    title,
    icon,
    action,
    variant = 'default'
}) => {
    const variants = {
        default: "bg-white border-brand-50 hover:shadow-xl hover:-translate-y-1",
        glass: "bg-white/80 backdrop-blur-md border-white/20 hover:shadow-xl hover:-translate-y-1",
        gradient: "bg-gradient-to-br from-white to-brand-50/50 border-brand-100 hover:shadow-xl hover:-translate-y-1"
    };

    return (
        <div className={clsx(
            "rounded-[2rem] shadow-sm p-6 border transition-all duration-300 flex flex-col group",
            variants[variant],
            className
        )}>
            {(title || icon || action) && (
                <div className="flex items-center justify-between mb-6 shrink-0 relative">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className="bg-brand-50 p-3 rounded-2xl text-brand-500 group-hover:scale-110 transition-transform duration-300">
                                {icon}
                            </div>
                        )}
                        {title && <h3 className="text-xl font-bold text-gray-800 tracking-tight">{title}</h3>}
                    </div>
                    {action && <div className="z-10">{action}</div>}
                </div>
            )}
            <div className="text-gray-600 flex-1 w-full relative">
                {children}
            </div>
        </div>
    );
};

export default StudentCard;
