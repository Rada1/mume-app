/**
 * @file useAccountParser.ts
 * @description Specialized hook for parsing MUME account-level output, including login,
 * character selection, and account menu navigation. Optimized for "Pure Terminal" interaction.
 */

import { useCallback, useRef } from 'react';
import { CharacterEntry } from '../../types';

// --- Logic Section: Types ---

interface UseAccountParserProps {
    accountState: import('../../types').AccountState;
    setAccountState: React.Dispatch<React.SetStateAction<import('../../types').AccountState>>;
    gameState: import('../../types').GameState;
    setGameState: React.Dispatch<React.SetStateAction<import('../../types').GameState>>;
    sendCommand: (cmd: string) => void;
    executeCommandRef: React.MutableRefObject<((cmd: string, silent?: boolean, isEnter?: boolean) => void) | undefined>;
    isMobile?: boolean;
    addDiagnosticLog?: (msg: string) => void;
    addMessage?: (type: import('../../types').MessageType, text: string, isCombat?: boolean, mid?: string) => void;
    setMessages?: React.Dispatch<React.SetStateAction<import('../../types').Message[]>>;
    clearLog?: () => void;
}

// --- Logic Section: Hook Implementation ---

export function useAccountParser({ accountState, setAccountState, gameState, setGameState, sendCommand, executeCommandRef, isMobile, addDiagnosticLog, addMessage, setMessages, clearLog }: UseAccountParserProps) {
    // Use Refs to keep parseAccountLine stable and avoid re-render loops
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;
    const charsRef = useRef(accountState.characters);
    charsRef.current = accountState.characters;
    const isMobileRef = useRef(isMobile);
    isMobileRef.current = isMobile;

    const parseAccountLine = useCallback((line: string, isNewChunk: boolean): boolean => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (!cleanLine) return false;

        // During gameplay, skip all account parsing except detecting return to Account>
        if (gameStateRef.current === 'playing') {
            if (cleanLine === 'Account>') {
                setGameState('account');
                setAccountState(prev => ({ ...prev, stage: 'account-menu' }));
                return true;
            }
            return false;
        }

        // 0. Detect Main Account Menu Prompt (for completion/cancellation)
        if (cleanLine === 'Account>') {
            setGameState('account');
            setAccountState(prev => {
                // If we are currently in character select, don't stomp it if we have characters
                if (prev.stage === 'character-select' && prev.characters.length > 0) return prev;
                return { ...prev, stage: 'account-menu' };
            });
            return false;
        }

        // Detect Character Creation Headers (Return false to ensure they show in log)
        const creationHeaders = [
            "Choose Your Allegiance", "Choose Your Race", "Choose Your Subrace",
            "Choose Your Hometown", "Choose Your Sex", "Choose Your Alignment",
            "Choose Your Archetype", "Choose Your Stats", "Choose Your Physique",
            "Choose Your Name", "Your Character", "Choose Your Specialty",
            "Choose Your Profession", "Choose Your Class"
        ];
        if (creationHeaders.some(h => cleanLine.includes(h))) {
            setAccountState(prev => ({ ...prev, stage: 'login' }));
            return false;
        }

        // 1. Detect Name/Password Prompts (Mirrored into TAP TO TYPE box)
        const lowerLine = cleanLine.toLowerCase();
        const isNamePrompt = lowerLine.includes('by what name do you wish to be known') ||
                             lowerLine.includes('what is your name?') ||
                             lowerLine.includes("what's your name?") ||
                             lowerLine.includes("illegal name") ||
                             lowerLine.includes("character's name") ||
                             lowerLine.includes('nom de guerre:');
        
        const isPasswordPrompt = lowerLine.includes('password:');

        if (isNamePrompt || isPasswordPrompt) {
            setGameState('account');
            setAccountState((prev: any) => ({ ...prev, stage: 'login' }));
            return false;
        }

        // 2. Detect Character List Headers
        if (cleanLine.includes('Character') && (cleanLine.includes('Level') || cleanLine.includes('Race'))) {
            setGameState('account');
            setAccountState(prev => ({
                ...prev,
                stage: (prev.stage === 'account-menu' || prev.stage === 'login') ? 'account-menu' : 'character-select',
                characters: []
            }));
            return false;
        }

        // 3. Detect Character Entries
        // Original Login Format
        const charMatch = cleanLine.match(/^\s*(\d+)\)\s+([a-zA-Z]+)\s+(\d+)\s+([a-zA-Z\-]+)\s+(.*?)\s+(Yesterday|Today|[\d\w\s]+ago|Never)\s+(.*)$/i);
        if (charMatch) {
            const [_, index, name, level, race, sublevel, logon, rent] = charMatch;
            const newChar: CharacterEntry = { index: parseInt(index), name, level: parseInt(level), race, sublevel, logon, rent, area: '' };
            setAccountState(prev => ({ ...prev, characters: prev.characters.some(c => c.name === name) ? prev.characters : [...prev.characters, newChar] }));
            setGameState('account');
            return false;
        }

        // Account Menu Format
        const logonRegex = /(\d+\s+(?:days?|yrs?|wks?|weeks?|months?|mths?|hours?|hrs?|mins?|secs?|ago|years?)|Yesterday|Today|Never|new|Playing)\s*/i;
        const logonMatchLine = cleanLine.match(logonRegex);
        if (logonMatchLine && logonMatchLine.index !== undefined) {
            const rawLine = line.replace(/\x1b\[[0-9;]*m/g, '');
            const cleanName = cleanLine.split(/\s+/)[0];
            if (/^[a-zA-Z\u00C0-\u024F]{2,15}$/.test(cleanName)) {
                const name = rawLine.substring(0, 14).trim() || cleanName;
                const newChar: CharacterEntry = { 
                    name, 
                    race: rawLine.substring(14, 18).trim(), 
                    sublevel: rawLine.substring(18, 22).trim(), 
                    level: (logonMatchLine.index > 22) ? rawLine.substring(22, logonMatchLine.index).trim() : '',
                    logon: logonMatchLine[1],
                    area: cleanLine.substring(logonMatchLine.index + logonMatchLine[0].length).trim().split(/\s+/)[0] || '',
                    rent: cleanLine.substring(logonMatchLine.index + logonMatchLine[0].length).trim().split(/\s+/)[1] || '',
                };
                setAccountState(prev => ({ ...prev, characters: prev.characters.some(c => c.name === name) ? prev.characters : [...prev.characters, newChar] }));
                setGameState('account');
                return false;
            }
        }

        // Hide Host Remnants (lines that are just hostnames/IPs during account stage)
        const isHostRemnant = (gameState === 'account') && 
                            (/^[0-9a-zA-Z\.\-]{3,}$/.test(cleanLine)) &&
                            (cleanLine.includes('.') || cleanLine.includes('-')) &&
                            !cleanLine.includes('selection:') && 
                            !cleanLine.includes('Character') &&
                            !cleanLine.includes('lugath');
        
        if (isHostRemnant) return false;

        // 4. Detect Selection Footers
        if ((cleanLine.includes('(P)lay') && cleanLine.includes('(N)ew')) ||
            (cleanLine.includes('Select a character') && cleanLine.includes('(N)ew'))) {
            setGameState('account');
            setAccountState(prev => ({ ...prev, stage: 'character-select' }));
            return false;
        }

        // 5. Detect Successful Login
        if (cleanLine.includes('Welcome to MUME') || cleanLine.includes('The music of the Ainur')) {
            setGameState('playing');
            setAccountState(prev => ({ ...prev, stage: 'none' }));
            return false;
        }

        // 6. Detect Account Menu Header
        if (cleanLine.includes('Available commands:')) {
            setGameState('account');
            setAccountState(prev => ({ ...prev, stage: 'account-menu' }));
            return false;
        }

        return false;
    }, [setAccountState, setGameState, addMessage, gameState]);

    return { parseAccountLine };
}

/**
 * Strips characters from the end of a string while ignoring ANSI escape sequences for length calculation.
 */
function visualTruncate(str: string, limit: number): string {
    let visualCount = 0;
    let i = 0;
    while (i < str.length && visualCount < limit) {
        if (str[i] === '\x1b') {
            const match = str.slice(i).match(/^\x1b\[[0-9;]*m/);
            if (match) {
                i += match[0].length;
                continue;
            }
        }
        visualCount++;
        i++;
    }
    // Append a reset code to be safe, then trim trailing spaces
    return str.slice(0, i).trimEnd() + '\x1b[0m';
}
