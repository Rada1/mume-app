/** @file CommandTreeGearLocationSection.tsx — Omit redundant location headings beneath workspace tabs. */
import React from 'react';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';

// --- Location Wrapper ---
export const CommandTreeGearLocationSection = ({workspace, label, className, children}: {
 workspace: boolean; label: string; className: string; children: React.ReactNode;
}) => workspace
 ? <section className={className} aria-label={`${label} targets`}>{children}</section>
 : <CommandTreeCollapsibleSection label={label} className={className}>{children}</CommandTreeCollapsibleSection>;
