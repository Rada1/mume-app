import React, { ReactNode } from 'react';
import './GutterShell.css';

interface GutterShellProps {
    children: ReactNode;
    activeTabId: string;
}

export const GutterShell: React.FC<GutterShellProps> = ({ children, activeTabId }) => {
    return (
        <div className={`gutter-shell active-view-${activeTabId}`}>
            <div className="gutter-shell-content">
                {children}
            </div>
        </div>
    );
};
