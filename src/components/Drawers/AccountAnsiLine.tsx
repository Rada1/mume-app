/**
 * @file AccountAnsiLine.tsx
 * @description Renders account capture lines while preserving MUME ANSI colors.
 */

import React from 'react';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';

// --- Logic Section ---

interface AccountAnsiLineProps {
    line: string;
    className?: string;
}

export const AccountAnsiLine: React.FC<AccountAnsiLineProps> = ({ line, className = 'char-data-line' }) => {
    const html = React.useMemo(() => sanitizeMumeHtml(ansiConvert.toHtml(line)), [line]);
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};
