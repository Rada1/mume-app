/** @file CommandTargetKeyword.tsx — Shows the command selector beside a target label. */
import React from 'react';

// --- Render Section ---
export const CommandTargetKeyword: React.FC<{ keyword: string }> = ({ keyword }) => (
    <small className="command-action-target-keyword" aria-label={`Target keyword ${keyword}`}>{`<${keyword}>`}</small>
);
