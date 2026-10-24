/** @file CommandTreeTargetHeader.tsx — Marks a command branch as a target picker. */
import React from 'react';

// --- Render Section ---
export const CommandTreeTargetHeader = ({title = 'TARGETS'}: {title?: string} = {}) =>
    <header className="command-tree-header command-tree-target-header" aria-label={title}>
        <span className="command-tree-header-title">{title}</span>
    </header>;
