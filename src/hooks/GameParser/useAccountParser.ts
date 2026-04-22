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
    accountStageRef: React.MutableRefObject<import('../../types').AccountStage>;
    gameState: import('../../types').GameState;
    setGameState: React.Dispatch<React.SetStateAction<import('../../types').GameState>>;
    sendCommand: (cmd: string) => void;
    executeCommandRef: React.MutableRefObject<((cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void) | undefined>;
    isMobile?: boolean;
    addDiagnosticLog?: (msg: string) => void;
    addMessage?: (type: import('../../types').MessageType, text: string, isCombat?: boolean, mid?: string) => void;
    setMessages?: React.Dispatch<React.SetStateAction<import('../../types').Message[]>>;
    clearLog?: () => void;
    setIsPasswordMode: (val: boolean) => void;
}

// --- Logic Section: Hook Implementation ---

export function useAccountParser({ accountState, setAccountState, accountStageRef, gameState, setGameState, sendCommand, executeCommandRef, isMobile, addDiagnosticLog, addMessage, setMessages, clearLog, setIsPasswordMode }: UseAccountParserProps) {
    // Use Refs to keep parseAccountLine stable and avoid re-render loops
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;
    const charsRef = useRef(accountState.characters);
    charsRef.current = accountState.characters;
    const isMobileRef = useRef(isMobile);
    isMobileRef.current = isMobile;

    // --- State for Automated Gathering ---
    const hasAutomatedListRef = useRef(false);
    const isSilentListingRef = useRef(false);

    const parseAccountLine = useCallback((line: string, isNewChunk: boolean): boolean => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (!cleanLine) {
            // Surgically suppress empty lines ONLY during stat editing to prevent layout 'shifting'.
            // For all other account stages, preserve them to maintain intended terminal spacing.
            return accountStageRef.current === 'stat-editing';
        }

        // Sync silent listing ref with state
        if (accountState.isGathering) {
            isSilentListingRef.current = true;
        }

        // During gameplay, skip all account parsing except detecting return to Account>
        if (gameStateRef.current === 'playing') {
            if (cleanLine === 'Account>') {
                setGameState('account');
                setAccountState(prev => ({ ...prev, stage: 'account-menu' }));
                setIsPasswordMode(false);
                return true;
            }
            return false;
        }

        // --- Silent Listing Suppression ---
        // If we are in silent listing mode, we suppress common character list output
        if (isSilentListingRef.current) {
            // 0a. Handle Paginator (if list is long)
            const isPaginator = cleanLine.includes('Return: continue') || 
                               cleanLine.includes('*** [Hit Return') ||
                               (cleanLine.startsWith('***') && cleanLine.toLowerCase().includes('continue')) ||
                               (cleanLine.includes('(') && cleanLine.includes('%)') && cleanLine.includes('continue'));

            if (isPaginator) {
                if (executeCommandRef.current) {
                    // Small delay to ensure server is ready for input after sending the paginator
                    setTimeout(() => {
                        if (executeCommandRef.current) {
                            executeCommandRef.current('', true, true); 
                        }
                    }, 150);
                }
                return true; // Suppress the paginator line
            }

            // Check for end of list/menu prompts
            // We ONLY reset on the final 'Account>' prompt because 'Where <sort>' 
            // and other menu headers can appear BEFORE the paginator in multi-page lists.
            if (cleanLine === 'Account>') {
                isSilentListingRef.current = false;
                setAccountState(prev => ({ ...prev, isGathering: false, stage: 'account-menu' }));
            } 
        }

        const shouldSuppress = isSilentListingRef.current;

        // --- 0. Detect Stat Edit Trigger ---
        if (cleanLine.includes('Please specify an ability') && cleanLine.includes('(str, int, etc.)')) {
            accountStageRef.current = 'stat-editing'; // Immediate synchronous update for lines in same chunk
            setAccountState(prev => ({ ...prev, stage: 'stat-editing' }));
            if (addMessage) {
                addMessage('account-menu-item', line);
                return true;
            }
        }

        // --- 0b. Detect Stat Summary Disclaimer (Reset out of edit mode) ---
        if (cleanLine.includes('review the following statistics') || cleanLine.includes('provided values, as stats have a major impact')) {
            accountStageRef.current = 'character-select'; // Reset to review stage
            setAccountState(prev => ({ ...prev, stage: 'character-select' }));
            // Don't return, let it render as menu item
        }

        // --- Logic Section: Stage-specific Parsing ---
        const isSelectionLine = /^\s*\(\d+\)/.test(cleanLine);
        if (isSelectionLine && addMessage) {
            const isEditSelection = cleanLine.includes('Edit') && accountStageRef.current !== 'stat-editing';
            addMessage(isEditSelection ? 'account-selection-edit' : 'account-selection', line);
            return true;
        }

        const isStatLine = /Str:\s*\d+.*Int:\s*\d+.*Wis:\s*\d+/i.test(cleanLine);
        if (isStatLine && addMessage) {
            // Auto-detect editing mode if we see the stat line and it's definitely not the summary
            // (The summary is preceded by long disclaimer text handled elsewhere)
            if (accountStageRef.current === 'stat-editing') {
                setMessages?.(prev => prev.filter(m => m.id !== 'account-stat-line'));
                addMessage('account-stat-edit', line, undefined, 'account-stat-line');
            } else {
                addMessage('account-menu-item', line);
            }
            return true;
        }

        const isPointsLine = /points left/i.test(cleanLine);
        if (isPointsLine && addMessage) {
            // "Points left" is a definitive indicator of an interactive editing session.
            if (accountStageRef.current !== 'stat-editing') {
                accountStageRef.current = 'stat-editing';
                setAccountState(prev => ({ ...prev, stage: 'stat-editing' }));
                
                // Retroactively fix the preceding stat line if it was parsed before this line identified the mode
                setMessages?.(prev => {
                    const next = [...prev];
                    for (let i = next.length - 1; i >= Math.max(0, next.length - 10); i--) {
                        if (/Str:\s*\d+.*Int:\s*\d+.*Wis:\s*\d+/i.test(next[i].textRaw)) {
                            next[i] = { ...next[i], type: 'account-stat-edit', id: 'account-stat-line' };
                            break;
                        }
                    }
                    return next;
                });
            }

            setMessages?.(prev => prev.filter(m => m.id !== 'account-points-line'));
            addMessage('account-stat-points', line, undefined, 'account-points-line');
            return true;
        }

        // 1. Detect Login Prompts
        const lowerLine = cleanLine.toLowerCase();
        // Stricter matching for prompts: must end with the prompt string and not be in the middle of a sentence
        const isNamePrompt = lowerLine.endsWith('by what name do you wish to be known?');
        const isPasswordPrompt = lowerLine.endsWith('account password:');

        if (isNamePrompt || isPasswordPrompt) {
            // If we're already playing, only allow "By what name" to reset us (e.g. on disconnect)
            // but ignore "account password:" as it's likely a chat message false positive.
            if (isNamePrompt || gameStateRef.current !== 'playing') {
                setGameState('account');
                setAccountState((prev: any) => ({ ...prev, stage: 'login' }));
                if (isPasswordPrompt) setIsPasswordMode(true);
                else if (isNamePrompt) setIsPasswordMode(false);
                return false;
            }
        }

        // 2. Detect Character List Headers
        if (cleanLine.includes('Character') && (cleanLine.includes('Level') || cleanLine.includes('Race'))) {
            setGameState('account');
            setAccountState(prev => ({
                ...prev,
                stage: (prev.stage === 'account-menu' || prev.stage === 'login') ? 'account-menu' : 'character-select',
                characters: []
            }));
            setIsPasswordMode(false);
            return shouldSuppress;
        }

        // 3. Detect Character Entries
        // Original Login Format
        const charMatch = cleanLine.match(/^\s*(\d+)\)\s+([a-zA-Z]+)\s+(\d+)\s+([a-zA-Z\-]+)\s+(.*?)\s+(Yesterday|Today|[\d\w\s]+ago|Never)\s+(.*)$/i);
        if (charMatch) {
            const [_, index, name, level, race, sublevel, logon, rent] = charMatch;
            const newChar: CharacterEntry = { index: parseInt(index), name, level: parseInt(level), race, sublevel, logon, rent, area: '' };
            setAccountState(prev => ({ ...prev, characters: prev.characters.some(c => c.name === name) ? prev.characters : [...prev.characters, newChar] }));
            setGameState('account');
            
            if (!shouldSuppress && addMessage) {
                addMessage('account-character-list', line);
                return true;
            }
            return shouldSuppress;
        }

        // Account Menu Format
        const logonRegex = /(\d+\s+(?:days?|yrs?|wks?|weeks?|months?|mths?|hours?|hrs?|mins?|secs?|ago|years?)|Yesterday|Today|Never|\bnew\b|\bPlaying\b|\bno link\b|\bRetired\b|\bDead\b)/i;
        const logonMatchLine = cleanLine.match(logonRegex);
        
        // Stricter check for Account Menu Format to avoid false positives like "If you have never..."
        if (logonMatchLine && logonMatchLine.index !== undefined && logonMatchLine.index > 20) {
            const rawLine = line.replace(/\x1b\[[0-9;]*m/g, '');
            const cleanName = cleanLine.split(/\s+/)[0];
            
            // Exclude common account commands and descriptions
            const exclusions = ['play', 'create', 'new', 'time', 'list', 'move', 'password', 'add', 'info', 'practice', 'link', 'lag', 'help', 'menu', 'quit', 'where'];
            const lowerName = cleanName.toLowerCase();
            
            if (/^[a-zA-Z\u00C0-\u024F\-]{2,15}$/.test(cleanName) && !exclusions.includes(lowerName)) {
                const name = rawLine.substring(0, 14).trim() || cleanName;
                const newChar: CharacterEntry = { 
                    name, 
                    race: rawLine.substring(14, 18).trim(), 
                    sublevel: rawLine.substring(18, 22).trim(), 
                    level: (logonMatchLine.index > 22) ? rawLine.substring(22, logonMatchLine.index).trim() : '',
                    logon: logonMatchLine[1].trim(),
                    area: cleanLine.substring(logonMatchLine.index + logonMatchLine[0].length).trim().split(/\s+/)[0] || '',
                    rent: cleanLine.substring(logonMatchLine.index + logonMatchLine[0].length).trim().split(/\s+/)[1] || '',
                };
                setAccountState(prev => ({ ...prev, characters: prev.characters.some(c => c.name === name) ? prev.characters : [...prev.characters, newChar] }));
                setGameState('account');
                
                if (!shouldSuppress && addMessage) {
                    addMessage('account-character-list', line);
                    return true;
                }
                return shouldSuppress;
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
            (cleanLine.includes('Select a character') && cleanLine.includes('(N)ew')) ||
            cleanLine.includes('If you have never played MUME before')) {
            setGameState('account');
            setAccountState(prev => ({ ...prev, stage: 'character-select' }));
            setIsPasswordMode(false);
            // [Mod] Disabled: don't clear the previous log data when logging in
            // clearLog?.(); // Clear bubbles once we reach character selection
            return false;
        }

        // 5. Detect Successful Login
        if (cleanLine.includes('Welcome to MUME') || 
            cleanLine.includes('The music of the Ainur') ||
            cleanLine.includes('Now entering the game')) {
            setGameState('playing');
            setAccountState(prev => ({ ...prev, stage: 'none' }));
            setIsPasswordMode(false);
            // [Mod] Disabled: don't clear the previous log data when logging in
            // clearLog?.();

            // --- Bootstrap Drawer Data ---
            // Trigger a sequence of silent commands to populate all drawers in the background
            setTimeout(() => {
                if (executeCommandRef.current) {
                    console.log('[Bootstrap] Triggering background data gather...');
                    executeCommandRef.current('stat', true, true, true, true);
                    setTimeout(() => executeCommandRef.current?.('score', true, true, true, true), 100);
                    setTimeout(() => executeCommandRef.current?.('info %m', true, true, true, true), 200);
                    setTimeout(() => executeCommandRef.current?.('time', true, true, true, true), 300);
                    setTimeout(() => executeCommandRef.current?.('info', true, true, true, true), 400);
                    setTimeout(() => executeCommandRef.current?.('eq', true, true, true, true), 500);
                    setTimeout(() => executeCommandRef.current?.('inv', true, true, true, true), 600);
                    setTimeout(() => executeCommandRef.current?.('practice', true, true, true, true), 700);
                    setTimeout(() => executeCommandRef.current?.('quest', true, true, true, true), 800);
                    setTimeout(() => executeCommandRef.current?.('who', true, true, true, true), 900);
                    setTimeout(() => executeCommandRef.current?.('where', true, true, true, true), 1000);
                }
            }, 1000); // Wait 1s for the login text to settle

            return false;
        }

        // 6. Detect Account Menu Header
        if (cleanLine.includes('Available commands:')) {
            setGameState('account');
            accountStageRef.current = 'account-menu';
            setAccountState(prev => ({ ...prev, stage: 'account-menu' }));
            setIsPasswordMode(false);

            if (addMessage) {
                addMessage('account-menu-item', line);
                return true;
            }
            return false;
        }

        // 7. General Account Menu Content Catch (lines while in account-menu stage)
        const isMenuStage = accountStageRef.current === 'account-menu';
        const menuKeywords = ['create', 'play', 'time', 'list', 'move', 'password', 'add', 'info', 'practice', 'link', 'lag', 'help', 'menu', 'quit'];
        const lowerClean = cleanLine.toLowerCase();
        
        const isMenuLine = isMenuStage && (menuKeywords.some(kw => lowerClean.startsWith(kw)) || cleanLine.startsWith('Where <sort>'));
        const isIntroLine = lowerClean.includes('type new to create') || lowerClean.includes('? for help');
        
        if (isMenuLine || isIntroLine || isSelectionLine) {
            if (addMessage) {
                addMessage('account-menu-item', line);
                return true;
            }
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
