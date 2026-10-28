/** @file DesktopCommandPin.tsx — Unobtrusive per-command desktop default control. */
import React from 'react';
import { Pin } from 'lucide-react';

// --- Command row and independent pin control ---
export const DesktopCommandPin = ({label, selected, onSelect, children}: {
 label: string; selected: boolean; onSelect: () => void; children: React.ReactNode;
}) => <div className="desktop-command-pin-row">
 {children}
 <button type="button" className="desktop-command-pin" aria-label={`Set ${label} as click action`}
  title={`Set ${label} as click action`} aria-pressed={selected}
  onClick={event => {event.preventDefault();event.stopPropagation();onSelect();}}>
  <Pin size={12} fill={selected ? 'currentColor' : 'none'} aria-hidden="true"/>
 </button>
</div>;
