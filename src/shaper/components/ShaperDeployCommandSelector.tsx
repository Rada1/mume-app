/**
 * @file ShaperDeployCommandSelector.tsx
 * @description Renders deploy preview command blocks with one-click push actions.
 */

import { useMemo } from 'react';
import { planShaperDeploy } from '../deployment/shaperDeployPlan';

interface ShaperDeployCommandSelectorProps {
    commands: string[];
    onPush: (commands: string[]) => void;
    disabled?: boolean;
    disabledReason?: string;
}

const keyFor = (index: number, lines: string[]): string =>
    `${index}:${lines[0]}:${lines.length}`;

// --- Component Section ---
export const ShaperDeployCommandSelector: React.FC<ShaperDeployCommandSelectorProps> = ({
    commands,
    onPush,
    disabled = false,
    disabledReason = ''
}) => {
    const commandSignature = commands.join('\n');
    const blocks = useMemo(() => planShaperDeploy(commands), [commandSignature]);

    if (commands.length === 0) return null;

    return (
        <div className="shaper-command-selector">
            <ul>
                {blocks.map((block, index) => {
                    const key = keyFor(index, block.lines);
                    return (
                        <li key={key}>
                            <code>{block.requiresEditor ? `${block.text} (editor)` : block.text}</code>
                            <button
                                type="button"
                                onClick={() => onPush(block.lines)}
                                disabled={disabled}
                                title={disabledReason || 'Push this command block'}
                            >
                                Push
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
