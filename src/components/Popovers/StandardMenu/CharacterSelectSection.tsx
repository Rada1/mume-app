import React from 'react';
import { AccountState, CharacterEntry } from '../../../types';

interface CharacterSelectSectionProps {
    accountState?: AccountState;
    setAccountState?: (val: AccountState | ((prev: AccountState) => AccountState)) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean) => void;
    handleCharacterClick: (char: CharacterEntry) => void;
}

export const CharacterSelectSection: React.FC<CharacterSelectSectionProps> = ({
    accountState,
    setAccountState,
    executeCommand,
    handleCharacterClick
}) => {
    const chars = accountState?.characters || [];
    const isGathering = accountState?.isGathering;

    return (
        <>
            <div className="popover-header" style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(250, 204, 21, 0.2)',
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#facc15',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>Select Character</span>
                {!isGathering && (
                    <span 
                        onClick={() => {
                            setAccountState?.(prev => ({ ...prev, isGathering: true, characters: [] }));
                            executeCommand('list', true, true);
                        }}
                        style={{ fontSize: '0.7rem', opacity: 0.6, cursor: 'pointer', letterSpacing: 'normal' }}
                    >
                        REFRESH
                    </span>
                )}
            </div>
            <div className="popover-items-container" style={{ maxHeight: '60vh', overflowY: 'auto', minWidth: '240px' }}>
                {isGathering ? (
                    <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                        <div className="discovery-spinner" style={{ 
                            width: '24px', height: '24px', border: '2px solid rgba(250, 204, 21, 0.2)', 
                            borderTopColor: '#facc15', borderRadius: '50%', margin: '0 auto 12px',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        <div style={{ fontSize: '0.85rem', color: '#fff', opacity: 0.8 }}>Gathering characters...</div>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (chars.length === 0) ? (
                    <div style={{ padding: '24px', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem', color: '#fff' }}>
                        No characters found.<br/>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Try using the refresh button.</span>
                    </div>
                ) : (
                    chars.map((char) => (
                        <div
                            key={char.name}
                            className="popover-item"
                            data-menu-item="true"
                            onClick={() => handleCharacterClick(char)}
                            style={{ padding: '12px 16px' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span style={{ fontWeight: 600 }}>{char.name}</span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Level {char.level} {char.class}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
};
