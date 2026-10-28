/** @file CommandTreeGearLocationSection.tsx — Omit redundant location headings beneath workspace tabs. */
import React from 'react';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';

// --- Location Wrapper ---
export const CommandTreeGearLocationSection = ({workspace, label, className, children, collapsible = true}: {
 workspace: boolean; label: string; className: string; children: React.ReactNode; collapsible?: boolean;
}) => workspace
 ? <section className={className} aria-label={`${label} targets`}>{children}</section>
 : collapsible
  ? <CommandTreeCollapsibleSection label={label} className={className}>{children}</CommandTreeCollapsibleSection>
  : <section className={className} aria-label={`${label} targets`}>{children}</section>;
