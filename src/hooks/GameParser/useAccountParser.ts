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
    addMessage?: (type: import('../../types').MessageType, text: string, isCombat?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string; lower: string; html?: string }) => void;
    setMessages?: React.Dispatch<React.SetStateAction<import('../../types').Message[]>>;
    clearLog?: () => void;
    setIsPasswordMode: (val: boolean) => void;
    captureStage: React.MutableRefObject<string>;
}

// --- Logic Section: Hook Implementation ---

export function useAccountParser({ accountState, setAccountState, accountStageRef, gameState, setGameState, sendCommand, executeCommandRef, isMobile, addDiagnosticLog, addMessage, setMessages, clearLog, setIsPasswordMode, captureStage }: UseAccountParserProps) {
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
    const hasSentGameEntrySetupRef = useRef(false);

    const parseAccountLine = useCallback((line: string, isPrompt: boolean = false): boolean => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        const trimmedLine = cleanLine.trim();

        if (!trimmedLine) {
            // Surgically suppress empty lines ONLY during stat editing to prevent layout 'shifting'.
            // For all other account stages, preserve them to maintain intended terminal spacing.
            return accountStageRef.current === 'stat-editing';
        }


        // Sync silent listing ref with state
        if (accountState.isGathering) {
            isSilentListingRef.current = true;
        }

        // --- 0. Global Prompt Detection: Account> ---
        // If we see this, we are ALWAYS at the main account menu.
        // We use endsWith to catch cases where the prompt might follow some text without a newline.
        if (trimmedLine.endsWith('Account>') || trimmedLine === 'Account>') {
            console.log('[AccountParser] Main Account Menu detected');
            accountStageRef.current = 'account-menu';
            setGameState('account');
            setAccountState(prev => ({ 
                ...prev, 
                stage: 'account-menu', 
                currentPrompt: undefined,
                creationPrompt: undefined, // Clear creation buttons
                isGathering: false,
                // Clear creation specific data to avoid stale UI when restarting creation
                pointsLeft: undefined,
                stats: undefined 
            }));
            captureStage.current = 'none';
            isSilentListingRef.current = false;
            setIsPasswordMode(false);
            return true;
        }

        // Fire login setup commands regardless of current game state (handles reconnects too)
        if (trimmedLine.includes('Welcome to the land of Middle-earth')) {
            console.log('[AccountParser] Login detected via welcome line');
            setGameState('playing');
            setAccountState(prev => ({ ...prev, stage: 'none', currentPrompt: undefined }));
            setIsPasswordMode(false);
            gmcpBus.emit('Session.Start', { characterName: 'Player' });

            if (!hasSentGameEntrySetupRef.current) {
                hasSentGameEntrySetupRef.current = true;
                sendCommand('change xml on');
                sendCommand('change page off');
            }

            setTimeout(() => {
                if (executeCommandRef.current) {
                    executeCommandRef.current('info %O %D %k %A', true, true, true, true);
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
            }, 150);
            return false;
        }

        // During gameplay, skip all account parsing except detecting return to Account>
        if ((gameStateRef.current as string) === 'playing') {
            if (trimmedLine.endsWith('Account>') || trimmedLine === 'Account>') {
                hasSentGameEntrySetupRef.current = false;
                setGameState('account');
                setAccountState(prev => ({ 
                    ...prev, 
                    stage: 'account-menu', 
                    currentPrompt: undefined,
                    creationPrompt: undefined,
                    pointsLeft: undefined,
                    stats: undefined
                }));
                captureStage.current = 'none';
                setIsPasswordMode(false);
                return true;
            }
            return false;
        }

        // 1. Detect Login Prompts
        const lowerLine = trimmedLine.toLowerCase();
        const isNamePrompt = lowerLine.includes('by what name do you wish') || lowerLine.includes('enter new account name:');
        const isPasswordPrompt = lowerLine.includes('account password:') || lowerLine.includes('verify:');

        if (isNamePrompt || isPasswordPrompt || isPrompt) {
            // Check if the trimmed line matches known prompts even if isPrompt is false (e.g. text line that is a prompt)
            const activePrompt = isNamePrompt || (isPrompt && (lowerLine.includes('by what name') || lowerLine.includes('enter new account name')));
            const activePassPrompt = isPasswordPrompt || (isPrompt && (lowerLine.includes('password') || lowerLine.includes('verify')));

            if (activePrompt || activePassPrompt) {
                if (activePrompt || gameStateRef.current !== 'playing') {
                    console.log(`[AccountParser] Detected prompt: ${activePrompt ? 'Name' : 'Password'}. Switching to account state.`);
                    setGameState('account');
                    
                    let promptText = "Account Password:";
                    if (activePrompt) promptText = "By what name do you wish to be known?";
                    if (lowerLine.includes('enter new account name')) promptText = "Enter new account name:";
                    if (lowerLine.includes('verify:')) promptText = "Verify:";

                    setAccountState(prev => ({ 
                        ...prev, 
                        stage: 'login',
                        currentPrompt: promptText
                    }));
                    captureStage.current = 'none';
                    
                    if (activePassPrompt) setIsPasswordMode(true);
                    else if (activePrompt) setIsPasswordMode(false);
                    
                    // Do not inject a specialized account-prompt message here.
                    // Instead, let the original line fall through so it appears
                    // exactly where the game sends it in the terminal stream.
                }
            }
        }

        // --- Paginator Auto-Advance (silent AND visible listing) ---
        // Detects the MUME pager prompt (e.g. "*** Return: continue, b: back... (63%) ***")
        // and automatically sends an empty return to page through the list.
        // This runs unconditionally during the account phase so both manual `list`
        // commands and silent background gathers advance past pagination automatically.
        const isPaginator = trimmedLine.includes('Return: continue') ||
                            trimmedLine.includes('*** [Hit Return') ||
                            (trimmedLine.startsWith('***') && trimmedLine.toLowerCase().includes('continue')) ||
                            (trimmedLine.includes('(') && trimmedLine.includes('%)') && trimmedLine.includes('continue'));

        if (isPaginator) {
            // Use queueMicrotask so the current parse cycle and React state updates
            // fully commit before the server receives our newline and floods us with
            // the next page. setTimeout(150) caused the response to arrive mid-update
            // and sit in a buffer until the next user action triggered a render flush.
            queueMicrotask(() => sendCommand(''));
            // Suppress the paginator line from the log — it's transient noise.
            return true;
        }

        // --- Silent Listing Suppression ---
        if (isSilentListingRef.current) {
            if (trimmedLine === 'Account>') {
                isSilentListingRef.current = false;
                setAccountState(prev => ({ ...prev, isGathering: false, stage: 'account-menu' }));
            }
        }

        const shouldSuppress = isSilentListingRef.current;

        // --- 0. Detect Stat Edit Trigger ---
        if ((trimmedLine.includes('Please specify an ability') && trimmedLine.includes('(str, int, etc.)')) ||
            (trimmedLine.includes('Enter ability') && trimmedLine.includes('"R" (reset)'))) {
            accountStageRef.current = 'stat-editing';
            
            const statOptions = [
                { id: 'str', label: 'Strength' },
                { id: 'int', label: 'Intelligence' },
                { id: 'wis', label: 'Wisdom' },
                { id: 'dex', label: 'Dexterity' },
                { id: 'con', label: 'Constitution' },
                { id: 'wil', label: 'Willpower' },
                { id: 'per', label: 'Perception' },
                { id: 'R', label: 'Reset (R)' },
                { id: 'Q', label: 'Done (Q)' }
            ];

            setAccountState(prev => ({ 
                ...prev, 
                stage: 'stat-editing', 
                currentPrompt: undefined,
                characters: [], // Clear characters when entering stat editing
                creationPrompt: {
                    title: 'Stat Editing',
                    description: trimmedLine,
                    options: statOptions
                }
            }));
            captureStage.current = 'none';
            setGameState('account');
        }

        // --- 0d. Detect Account Confirmation (New Account Flow) ---
        if (trimmedLine.includes('Do you have another account on MUME')) {
            accountStageRef.current = 'account-confirmation';
            setAccountState(prev => ({ 
                ...prev, 
                stage: 'account-confirmation', 
                currentPrompt: trimmedLine,
                creationPrompt: {
                    title: 'Account Confirmation',
                    description: '',
                    options: [
                        { id: 'y', label: 'Yes' },
                        { id: 'n', label: 'No' }
                    ]
                }
            }));
            captureStage.current = 'none';
            setGameState('account');
        }

        // --- 0a. Detect Character Creation Start ---
        if (trimmedLine.includes('You must now choose a name for your character') || 
            trimmedLine.includes('Enter a name for your character') ||
            trimmedLine.includes('What name do you wish to have') ||
            trimmedLine.includes('Choose Your Allegiance') ||
            trimmedLine.includes('Which side will you fight for') ||
            trimmedLine.includes('Pick a number, "back", "?"')) {
            accountStageRef.current = 'character-creation';
            setAccountState(prev => ({ 
                ...prev, 
                stage: 'character-creation', 
                currentPrompt: undefined,
                characters: [] // Clear characters when entering creation
            }));
            captureStage.current = 'none';
            setGameState('account');
        }

        // --- 0b. Detect Character Creation Prompts ---
        const isCreationRelatedStage = ['character-creation', 'stat-editing'].includes(accountStageRef.current);
        
        if (isCreationRelatedStage) {
            if (trimmedLine.includes('Do you want to use the default configuration') ||
                trimmedLine.startsWith('Choose Your') ||
                trimmedLine.includes('Compared to other') ||
                trimmedLine.includes('review the following statistics') ||
                trimmedLine.includes('What race do you want to be') ||
                trimmedLine.includes('What sex do you want to be') ||
                trimmedLine.includes('Are you sure you want to be a') ||
                trimmedLine.includes('You will be a') ||
                trimmedLine.includes('Enter a name for your character')) {
                // Clear existing options when a NEW major question starts
                setAccountState(prev => ({ 
                    ...prev, 
                    creationPrompt: { title: trimmedLine, description: '', options: [] } 
                }));
            }

            if (trimmedLine.match(/(Str|Int|Wis|Wisdom|Dex|Con|Wil|Will|Per)\s*[:=]\s*(\d+)/i)) {
                const stats: Record<string, number> = {};
                const matches = Array.from(trimmedLine.matchAll(/(Str|Int|Wis|Wisdom|Dex|Con|Wil|Will|Per)\s*[:=]\s*(\d+)/gi));
                for (const match of matches) {
                    const key = match[1].toLowerCase();
                    const canonicalKey = key.startsWith('wis') ? 'wis' : key.startsWith('wil') ? 'wil' : key;
                    stats[canonicalKey] = parseInt(match[2]);
                }
                if (Object.keys(stats).length > 0) {
                    setAccountState(prev => ({ ...prev, stats: { ...(prev.stats || {}), ...stats } }));
                    // Suppress stat lines when in the editor to keep it clean
                    if (accountStageRef.current === 'stat-editing') return true;
                }
            }

            if (trimmedLine.includes('point left') || trimmedLine.includes('points left')) {
                const match = trimmedLine.match(/(\d+)\s+point[s]?\s+left/i);
                if (match) {
                    const points = parseInt(match[1]);
                    setAccountState(prev => ({ ...prev, pointsLeft: points }));
                    // If we see points, we are definitely in stat-editing
                    if (accountStageRef.current !== 'stat-editing') {
                        accountStageRef.current = 'stat-editing';
                        setAccountState(prev => ({ ...prev, stage: 'stat-editing' }));
                    }
                    return true;
                }
            }

            if (trimmedLine.includes('will you be') || trimmedLine.includes('Pick a number') || trimmedLine.includes('Select an option') || trimmedLine.includes('Compared to other') || (trimmedLine.includes('?') && trimmedLine.length < 100)) {
                setAccountState(prev => {
                    if (prev.creationPrompt?.title === trimmedLine) return prev;
                    return {
                        ...prev,
                        creationPrompt: {
                            options: prev.creationPrompt?.options || [],
                            title: trimmedLine,
                            description: prev.creationPrompt?.description || ''
                        }
                    };
                });
            }

            // More flexible regex to capture options like (1) Description or (a) Option
            // Also handle options that might not start the line but follow a prompt
            // Only match 1-3 character options (like (1), (a), (10), (str)) to avoid matching long flavor text like "(The man...)"
            // Also ensure it doesn't look like a full parenthesized sentence (starting with '(' and ending with ')')
            const optionMatch = trimmedLine.match(/^\s*\(([\w\d]{1,3})\)\s+([^(\[]+)/) || 
                               trimmedLine.match(/\(([\w\d]{1,3})\)\s+([^(\[]+)/);
            
            if (optionMatch && accountStageRef.current !== 'stat-editing') {
                const id = optionMatch[1];
                const label = optionMatch[2].trim();
                
                // Heuristic: If it starts and ends with parentheses, it's likely flavor text, not a menu option.
                // MUME menu options like "(1) Choice" or "(str) Stat" don't end with a closing parenthesis for the whole line.
                const isFlavorText = trimmedLine.startsWith('(') && trimmedLine.endsWith(')');
                const isLikelyOption = !isFlavorText && id.length <= 3 && label.length > 0 && !label.includes(':') && !label.includes('points left');
                
                if (isLikelyOption) {
                    setAccountState(prev => {
                        const currentPrompt = prev.creationPrompt || { title: '', description: '', options: [] };
                        const existingOptions = currentPrompt.options || [];
                        if (existingOptions.some(o => o.id === id)) return prev;
                        
                        return {
                            ...prev,
                            creationPrompt: {
                                ...currentPrompt,
                                options: [...existingOptions, { id, label }]
                            }
                        };
                    });
                    // Preserve creation option lines in the log for context, even if they are also buttons.
                    return false;
                }
            }
        }

        // --- 0c. Detect Stat Summary Disclaimer ---
        if (trimmedLine.includes('review the following statistics') || trimmedLine.includes('provided values, as stats have a major impact')) {
            accountStageRef.current = 'character-creation';
            setAccountState(prev => ({ ...prev, stage: 'character-creation', currentPrompt: undefined, characters: [] }));
        }

        const isSelectionLine = /^\s*\(\d{1,2}\)/.test(trimmedLine);
        if (isSelectionLine) {
            const isEditSelection = trimmedLine.includes('Edit') && accountStageRef.current !== 'stat-editing';
            // Just detect state
        }

        const isStatLine = /Str:\s*\d+.*Int:\s*\d+.*Wis:\s*\d+/i.test(trimmedLine);
        if (isStatLine) {
            if (accountStageRef.current === 'stat-editing') {
                setMessages?.(prev => prev.filter(m => m.id !== 'account-stat-line'));
                return true;
            }
        }

        const isPointsLine = /point[s]?\s+left/i.test(trimmedLine);
        if (isPointsLine) {
            if (accountStageRef.current === 'stat-editing') {
                setMessages?.(prev => prev.filter(m => m.id !== 'account-points-line'));
                return true;
            }
        }

        // 2. Detect Character List Headers
        if (trimmedLine.includes('Character') && (trimmedLine.includes('Level') || trimmedLine.includes('Race'))) {
            setGameState('account');
            setAccountState(prev => ({
                ...prev,
                stage: 'account-menu',
                characters: [],
                currentPrompt: undefined
            }));
            setIsPasswordMode(false);
            return shouldSuppress;
        }

        // 3. Detect Character Entries
        const isSelectStage = accountStageRef.current === 'account-menu';
        const charMatch = trimmedLine.match(/^\s*(\d+)\)\s+([a-zA-Z]+)\s+(\d+)\s+([a-zA-Z\-]+)\s+(.*?)\s+(Yesterday|Today|[\d\w\s]+ago|Never)\s+(.*)$/i);
        if (isSelectStage && charMatch) {
            const [_, index, name, level, race, sublevel, logon, rent] = charMatch;
            const newChar: CharacterEntry = { index: parseInt(index), name, level: parseInt(level), race, sublevel, logon, rent, area: '' };
            setAccountState(prev => ({ ...prev, characters: prev.characters.some(c => c.name === name) ? prev.characters : [...prev.characters, newChar] }));
            setGameState('account');

            if (!shouldSuppress) {
                const nameIdx = cleanLine.indexOf(name);
                const lineHtml = nameIdx >= 0
                    ? cleanLine.substring(0, nameIdx) + `<span class="inline-btn account-char-name" data-context="${name}">${name}</span>` + cleanLine.substring(nameIdx + name.length)
                    : cleanLine;
                addMessage?.('account-character-list', cleanLine, false, undefined, false, { textOnly: cleanLine, lower: cleanLine.toLowerCase(), html: lineHtml });
            }
            return true;
        }

        // Account Menu Format
        const logonRegex = /(\d+\s+(?:days?|yrs?|wks?|weeks?|months?|mths?|hours?|hrs?|mins?|secs?|ago|years?)|Yesterday|Today|Never|\bnew\b|\bPlaying\b|\bno link\b|\bRetired\b|\bDead\b)/i;
        const logonMatchLine = trimmedLine.match(logonRegex);
        
        if (isSelectStage && logonMatchLine && logonMatchLine.index !== undefined && logonMatchLine.index > 20) {
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
                    const nameIdx = cleanLine.indexOf(cleanName);
                    const lineHtml = nameIdx >= 0
                        ? `<span class="inline-btn account-char-name" data-context="${cleanName}">${cleanLine.substring(nameIdx, nameIdx + cleanName.length)}</span>` + cleanLine.substring(nameIdx + cleanName.length)
                        : cleanLine;
                    addMessage?.('account-character-list', cleanLine, false, undefined, false, { textOnly: cleanLine, lower: cleanLine.toLowerCase(), html: lineHtml });
                }
                return true;
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
            setAccountState(prev => ({ ...prev, stage: 'account-menu', currentPrompt: undefined }));
            setIsPasswordMode(false);
            return false;
        }

        // 6. Detect Account Menu Header
        if (trimmedLine.includes('Available commands:')) {
            setGameState('account');
            accountStageRef.current = 'account-menu';
            setAccountState(prev => ({ ...prev, stage: 'account-menu', currentPrompt: undefined }));
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

        // 7. General Suppression for Creation/Stat Stages
        // Removed broad suppression to allow game descriptive/flavor text to appear.
        // Surgical suppression is handled above for stats, points, and options.

        return false;
    }, [setAccountState, setGameState, addMessage, gameState, accountState.isGathering, sendCommand, captureStage]);

    return { parseAccountLine };
}
