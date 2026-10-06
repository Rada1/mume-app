/** @file CounterRotatedContent.tsx — Keeps selected content upright in rotated landscape. */

import React, { type ReactNode } from 'react';

// --- Logic Section ---

interface CounterRotatedContentProps {
    active: boolean;
    className: string;
    children: ReactNode;
}

export const CounterRotatedContent: React.FC<CounterRotatedContentProps> = ({ active, className, children }) => {
    if (!active) return <>{children}</>;
    return <div className={className}>{children}</div>;
};
