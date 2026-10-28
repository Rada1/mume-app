/** @file DesktopCommandPin.tsx — Unobtrusive per-command desktop default control. */
import React from 'react';
import { Star } from 'lucide-react';

// --- Command row and independent pin control ---
export const DesktopCommandPin = ({label, selected, onSelect, children}: {
 label: string; selected: boolean; onSelect: () => void; children: React.ReactNode;
}) => <div className="desktop-command-pin-row">
 <button type="button" className="desktop-command-pin" aria-label={`Set ${label} as default click action`}
  title={selected ? `${label} is the default click action` : `Set ${label} as default click action`} aria-pressed={selected}
  onClick={event => {event.preventDefault();event.stopPropagation();onSelect();}}>
  <Star size={15} fill={selected ? 'currentColor' : 'none'} aria-hidden="true"/>
 </button>
 {children}
</div>;
