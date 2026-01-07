import React from 'react';
import clsx from 'clsx';

interface StudentButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'glass' | 'gradient' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

const StudentButton: React.FC<StudentButtonProps> = ({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-300 active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50 rounded-2xl";

    const variants = {
        primary: "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30 focus:ring-brand-500",
        secondary: "bg-surface-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-300",
        accent: "bg-accent-orange hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 focus:ring-accent-orange",
        outline: "border-2 border-brand-200 text-brand-600 hover:bg-brand-50 focus:ring-brand-200",
        glass: "bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/20 hover:scale-105",
        gradient: "bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1",
        ghost: "hover:bg-white/10 text-white"
    };

    const sizes = {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
    };

    return (
        <button
            className={clsx(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
};

export default StudentButton;
