'use client';

import React, { createContext, useContext, useState } from 'react';

interface LayoutContextType {
    isSidebarHidden: boolean;
    setSidebarHidden: (hidden: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarHidden, setSidebarHidden] = useState(false);

    return (
        <LayoutContext.Provider value={{ isSidebarHidden, setSidebarHidden }}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}
