/** @file CommandTreeMenuHeader.tsx — Explicit header actions cancel pending command hover previews. */
import React from 'react';
import { Pin } from 'lucide-react';
import { SkillsSyncPrompt } from './SkillsSyncPrompt';

// --- Render Section ---
export const CommandTreeMenuHeader = ({ root, showSkills, helpMode, pinned, cancelPreview, onHelp, onPin }: {
    root: boolean; showSkills: boolean; helpMode: boolean; pinned: boolean;
    cancelPreview: () => void; onHelp: () => void; onPin: () => void;
}) => <header className={`command-tree-header${root ? ' command-tree-root-header' : ''}`}
    onPointerEnter={cancelPreview} onFocusCapture={cancelPreview}>
    <span className="command-tree-header-title">COMMANDS</span>
    <span className="command-tree-header-spacer" aria-hidden="true" />
    {showSkills && <SkillsSyncPrompt hideWhenReady presentation="command-header" />}
    <button onClick={onHelp} aria-pressed={helpMode}>Help</button>
    <button type="button" aria-label={pinned ? 'Unpin command menu' : 'Pin command menu'}
        title={pinned ? 'Unpin command menu' : 'Pin command menu'} aria-pressed={pinned} onClick={onPin}>
        <Pin size={14} fill={pinned ? 'currentColor' : 'none'} />
    </button>
</header>;
