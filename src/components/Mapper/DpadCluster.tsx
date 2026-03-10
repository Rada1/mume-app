import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import './DpadCluster.css';

interface DpadClusterProps {
    exits: Record<string, any>;
}

export const DpadCluster: React.FC<DpadClusterProps> = ({ exits }) => {
    const { executeCommand, triggerHaptic } = useGame();

    const handleDir = (dir: string) => {
        triggerHaptic(20);
        executeCommand(dir);
    };

    const hasExit = (dir: string) => exits && exits[dir] !== undefined;

    return (
        <div className="dpad-cluster">
            {/* North */}
            {hasExit('n') && (
                <div className="dpad-btn n" onClick={() => handleDir('n')}>
                    <ArrowUp size={24} />
                </div>
            )}
            {/* South */}
            {hasExit('s') && (
                <div className="dpad-btn s" onClick={() => handleDir('s')}>
                    <ArrowDown size={24} />
                </div>
            )}
            {/* East */}
            {hasExit('e') && (
                <div className="dpad-btn e" onClick={() => handleDir('e')}>
                    <ArrowRight size={24} />
                </div>
            )}
            {/* West */}
            {hasExit('w') && (
                <div className="dpad-btn w" onClick={() => handleDir('w')}>
                    <ArrowLeft size={24} />
                </div>
            )}
            {/* Up */}
            {hasExit('u') && (
                <div className="dpad-btn u" onClick={() => handleDir('u')}>
                    <ChevronUp size={24} />
                </div>
            )}
            {/* Down */}
            {hasExit('d') && (
                <div className="dpad-btn d" onClick={() => handleDir('d')}>
                    <ChevronDown size={24} />
                </div>
            )}
        </div>
    );
};
