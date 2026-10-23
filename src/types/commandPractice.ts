/** @file commandPractice.ts — Ability selection and practice response contracts. */
import type { CustomButton, DrawerLine } from './index';
import type { useCommandPractice } from '../hooks/useCommandPractice';

// --- Workspace Contracts ---
export interface CommandPracticeReportState {
    requestId: number;
    pendingCommand: string | null;
    skillName: string;
    lines: DrawerLine[];
    begin: (command: string, skillName: string) => void;
    complete: (requestId: number, lines: DrawerLine[]) => void;
    clear: () => void;
}
export interface CommandPracticeProps { practice: ReturnType<typeof useCommandPractice>; }
export interface CommandPracticeActionsProps extends CommandPracticeProps {
    onRequestHelp: (topic: string) => void;
    isHelpMode?: boolean;
}
export interface CommandPracticeAction {
    button: CustomButton;
    run: () => void;
    disabled: boolean;
    title?: string;
}
