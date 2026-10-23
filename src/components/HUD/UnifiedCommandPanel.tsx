/** @file UnifiedCommandPanel.tsx — V2 entry point with legacy restoration support. */
import React from 'react';
import { CommandPanelV2 } from './CommandPanelV2';
import { UnifiedCommandPanelLegacy } from './UnifiedCommandPanelLegacy';
import type { UnifiedCommandActionScope } from '../../hooks/useUnifiedCommandActions';
// --- Logic Section ---
export const UnifiedCommandPanel = (props: {initialScope?: UnifiedCommandActionScope; onClose?: () => void}) => {
 const [legacy, setLegacy] = React.useState(() => localStorage.getItem('mume-command-panel-version') === '1');
 const restoreV2 = () => { localStorage.setItem('mume-command-panel-version', '2'); setLegacy(false); };
 return legacy ? <><button className="command-tree-restore" onClick={restoreV2}>Try Commands V2</button><UnifiedCommandPanelLegacy {...props}/></>
  : <CommandPanelV2 {...props}/>;
};
