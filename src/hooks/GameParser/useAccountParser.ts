/**
 * @file useAccountParser.ts
 * @description Specialized hook for parsing MUME account-level output, including login,
 * character selection, and account menu navigation. Optimized for "Pure Terminal" interaction.
 */

import { useCallback, useRef } from 'react';
import { gmcpBus } from '../../events/gmcpBus';
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

    const parseAccountLine = useCallback((line: string, isPrompt: boolean = false): boolean => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        const trimmedLine = cleanLine.trim();

        if (!trimmedLine) {
            // Surgically suppress empty lines ONLY during stat editing to prevent layout 'shifting'.
            // For all other account stages, preserve them to maintain intended terminal spacing.
            return accountStageRef.current === 'stat-editing';
        }

        console.log(`[AccountParser] parseAccountLine: line="${cleanLine.substring(0, 30)}", isPrompt=${isPrompt}, gameState=${gameStateRef.current}`);

        // Sync silent listing ref with state
        if (accountState.isGathering) {
            isSilentListingRef.current = true;
        }

        // Fire login setup commands regardless of current game state (handles reconnects too)
        if (trimmedLine.includes('Welcome to the land of Middle-earth')) {
            console.log('[AccountParser] Login detected via welcome line');
            setGameState('playing');
            setAccountState(prev => ({ ...prev, stage: 'none' }));
            setIsPasswordMode(false);
            gmcpBus.emit('Session.Start', { characterName: 'Player' });
            setTimeout(() => {
                if (executeCommandRef.current) {
                    executeCommandRef.current('change xml on', true, true, true, true);
                    executeCommandRef.current('change page off', true, true, true, true);
                    setTimeout(() => executeCommandRef.current?.('stat', true, true, true, true), 100);
                    setTimeout(() => executeCommandRef.current?.('score', true, true, true, true), 200);
                    setTimeout(() => executeCommandRef.current?.('info %m', true, true, true, true), 300);
                    setTimeout(() => executeCommandRef.current?.('time', true, true, true, true), 400);
                    setTimeout(() => executeCommandRef.current?.('info', true, true, true, true), 500);
                    setTimeout(() => executeCommandRef.current?.('eq', true, true, true, true), 600);
                    setTimeout(() => executeCommandRef.current?.('inv', true, true, true, true), 700);
                    setTimeout(() => executeCommandRef.current?.('practice', true, true, true, true), 800);
                    setTimeout(() => executeCommandRef.current?.('quest', true, true, true, true), 900);
                    setTimeout(() => executeCommandRef.current?.('who', true, true, true, true), 1000);
                    setTimeout(() => executeCommandRef.current?.('where', true, true, true, true), 1100);
                }
            }, 1000);
            return false;
        }

        // During gameplay, skip all account parsing except detecting return to Account>
        if ((gameStateRef.current as string) === 'playing') {
            if (trimmedLine === 'Account>') {
                setGameState('account');
                setAccountState(prev => ({ ...prev, stage: 'account-menu' }));
                setIsPasswordMode(false);
                return true;
            }
            return false;
        }

        // 1. Detect Login Prompts
        const lowerLine = trimmedLine.toLowerCase();
        const isNamePrompt = lowerLine.includes('by what name do you wish');
        const isPasswordPrompt = lowerLine.includes('account password:');

        if (isNamePrompt || isPasswordPrompt || isPrompt) {
            // Check if the trimmed line matches known prompts even if isPrompt is false (e.g. text line that is a prompt)
            const activePrompt = isNamePrompt || (isPrompt && lowerLine.includes('by what name'));
            const activePassPrompt = isPasswordPrompt || (isPrompt && lowerLine.includes('password'));

            if (activePrompt || activePassPrompt) {
                if (activePrompt || gameStateRef.current !== 'playing') {
                    console.log(`[AccountParser] Detected prompt: ${activePrompt ? 'Name' : 'Password'}. Switching to account state.`);
                    setGameState('account');
                    setAccountState((prev: any) => ({ ...prev, stage: 'login' }));
                    
                    if (activePassPrompt) setIsPasswordMode(true);
                    else if (activePrompt) setIsPasswordMode(false);
                    
                    // Do not inject a specialized account-prompt message here.
                    // Instead, let the original line fall through so it appears
                    // exactly where the game sends it in the terminal stream.
                }
            }
        }

        // --- Silent Listing Suppression ---
        if (isSilentListingRef.current) {
            const isPaginator = trimmedLine.includes('Return: continue') || 
                               trimmedLine.includes('*** [Hit Return') ||
                               (trimmedLine.startsWith('***') && trimmedLine.toLowerCase().includes('continue')) ||
                               (trimmedLine.includes('(') && trimmedLine.includes('%)') && trimmedLine.includes('continue'));

            if (isPaginator) {
                if (executeCommandRef.current) {
                    setTimeout(() => {
                        if (executeCommandRef.current) {
                            executeCommandRef.current('', true, true); 
                        }
                    }, 150);
                }
                return true;
            }

            if (trimmedLine === 'Account>') {
                isSilentListingRef.current = false;
                setAccountState(prev => ({ ...prev, isGathering: false, stage: 'account-menu' }));
            } 
        }

        const shouldSuppress = isSilentListingRef.current;

        // --- 0. Detect Stat Edit Trigger ---
        if (trimmedLine.includes('Please specify an ability') && trimmedLine.includes('(str, int, etc.)')) {
            accountStageRef.current = 'stat-editing';
            setAccountState(prev => ({ ...prev, stage: 'stat-editing' }));
        }

        // --- 0b. Detect Stat Summary Disclaimer ---
        if (trimmedLine.includes('review the following statistics') || trimmedLine.includes('provided values, as stats have a major impact')) {
            accountStageRef.current = 'character-select';
            setAccountState(prev => ({ ...prev, stage: 'character-select' }));
        }

        const isSelectionLine = /^\s*\(\d+\)/.test(trimmedLine);
        if (isSelectionLine) {
            const isEditSelection = trimmedLine.includes('Edit') && accountStageRef.current !== 'stat-editing';
            // Just detect state
        }

        const isStatLine = /Str:\s*\d+.*Int:\s*\d+.*Wis:\s*\d+/i.test(trimmedLine);
        if (isStatLine) {
            if (accountStageRef.current === 'stat-editing') {
                setMessages?.(prev => prev.filter(m => m.id !== 'account-stat-line'));
            }
        }

        const isPointsLine = /points left/i.test(trimmedLine);
        if (isPointsLine) {
            if (accountStageRef.current !== 'stat-editing') {
                accountStageRef.current = 'stat-editing';
                setAccountState(prev => ({ ...prev, stage: 'stat-editing' }));
            }
            setMessages?.(prev => prev.filter(m => m.id !== 'account-points-line'));
        }

        // 2. Detect Character List Headers
        if (trimmedLine.includes('Character') && (trimmedLine.includes('Level') || trimmedLine.includes('Race'))) {
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
        const charMatch = trimmedLine.match(/^\s*(\d+)\)\s+([a-zA-Z]+)\s+(\d+)\s+([a-zA-Z\-]+)\s+(.*?)\s+(Yesterday|Today|[\d\w\s]+ago|Never)\s+(.*)$/i);
        if (charMatch) {
            const [_, index, name, level, race, sublevel, logon, rent] = charMatch;
            const newChar: CharacterEntry = { index: parseInt(index), name, level: parseInt(level), race, sublevel, logon, rent, area: '' };
            setAccountState(prev => ({ ...prev, characters: prev.characters.some(c => c.name === name) ? prev.characters : [...prev.characters, newChar] }));
            setGameState('account');
            
            if (!shouldSuppress) {
                // Let fall through
            }
            return shouldSuppress;
        }

        // Account Menu Format
        const logonRegex = /(\d+\s+(?:days?|yrs?|wks?|weeks?|months?|mths?|hours?|hrs?|mins?|secs?|ago|years?)|Yesterday|Today|Never|\bnew\b|\bPlaying\b|\bno link\b|\bRetired\b|\bDead\b)/i;
        const logonMatchLine = trimmedLine.match(logonRegex);
        
        if (logonMatchLine && logonMatchLine.index !== undefined && logonMatchLine.index > 20) {
            const cleanName = trimmedLine.split(/\s+/)[0];
            const exclusions = ['play', 'create', 'new', 'time', 'list', 'move', 'password', 'add', 'info', 'practice', 'link', 'lag', 'help', 'menu', 'quit', 'where'];
            const lowerName = cleanName.toLowerCase();
            
            if (/^[a-zA-Z\u00C0-\u00FF\-]{2,15}$/.test(cleanName) && !exclusions.includes(lowerName)) {
                const name = cleanLine.substring(0, 14).trim() || cleanName;
                const newChar: CharacterEntry = { 
                    name, 
                    race: cleanLine.substring(14, 18).trim(), 
                    sublevel: cleanLine.substring(18, 22).trim(), 
                    level: (logonMatchLine.index > 22) ? cleanLine.substring(22, logonMatchLine.index).trim() : '',
                    logon: logonMatchLine[1].trim(),
                    area: trimmedLine.substring(logonMatchLine.index + logonMatchLine[0].length).trim().split(/\s+/)[0] || '',
                    rent: trimmedLine.substring(logonMatchLine.index + logonMatchLine[0].length).trim().split(/\s+/)[1] || '',
                };
                setAccountState(prev => ({ ...prev, characters: prev.characters.some(c => c.name === name) ? prev.characters : [...prev.characters, newChar] }));
                setGameState('account');
                
                if (!shouldSuppress) {
                    // Let fall through
                }
                return shouldSuppress;
            }
        }

        // Host Remnants
        const isHostRemnant = (gameState === 'account') && 
                            (/^[0-9a-zA-Z\.\-]{3,}$/.test(trimmedLine)) &&
                            (trimmedLine.includes('.') || trimmedLine.includes('-')) &&
                            !trimmedLine.includes('selection:') && 
                            !trimmedLine.includes('Character') &&
                            !trimmedLine.includes('lugath');
        
        if (isHostRemnant) return false;

        // 4. Detect Selection Footers
        if ((trimmedLine.includes('(P)lay') && trimmedLine.includes('(N)ew')) ||
            (trimmedLine.includes('Select a character') && trimmedLine.includes('(N)ew')) ||
            trimmedLine.includes('If you have never played MUME before')) {
            setGameState('account');
            setAccountState(prev => ({ ...prev, stage: 'character-select' }));
            setIsPasswordMode(false);
            return false;
        }

        // 6. Detect Account Menu Header
        if (trimmedLine.includes('Available commands:')) {
            setGameState('account');
            accountStageRef.current = 'account-menu';
            setAccountState(prev => ({ ...prev, stage: 'account-menu' }));
            setIsPasswordMode(false);
            return false;
        }

        // 7. General Account Menu Content Catch
        const isMenuStage = accountStageRef.current === 'account-menu';
        const menuKeywords = ['create', 'play', 'time', 'list', 'move', 'password', 'add', 'info', 'practice', 'link', 'lag', 'help', 'menu', 'quit'];
        const lowerClean = trimmedLine.toLowerCase();
        
        const isMenuLine = isMenuStage && (menuKeywords.some(kw => lowerClean.startsWith(kw)) || trimmedLine.startsWith('Where <sort>'));
        const isIntroLine = lowerClean.includes('type new to create') || lowerClean.includes('? for help');
        
        if (isMenuLine || isIntroLine || isSelectionLine) {
            // Let fall through
        }

        return false;
    }, [setAccountState, setGameState, addMessage, gameState, accountState.isGathering]);

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
