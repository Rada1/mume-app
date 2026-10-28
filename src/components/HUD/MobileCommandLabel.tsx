/** @file MobileCommandLabel.tsx — Compact command label with its current-target indicator. */
import { Crosshair } from 'lucide-react';

// --- Command targeting indicator ---
export const MobileCommandLabel = ({label,usesTargetChip}:{label:string;usesTargetChip:boolean}) =>
 <span className="mobile-command-action-label">{label}{usesTargetChip
  && <Crosshair className="mobile-command-target-indicator" size={12} strokeWidth={1.75} aria-hidden="true"/>}</span>;
