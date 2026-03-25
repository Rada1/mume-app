import { useCallback, useRef } from 'react';
import { CharacterEntry, AccountStage, CreationPrompt } from '../../types';

interface UseAccountParserProps {
    accountState: import('../../types').AccountState;
    setAccountState: React.Dispatch<React.SetStateAction<import('../../types').AccountState>>;
    setGameState: React.Dispatch<React.SetStateAction<import('../../types').GameState>>;
    sendCommand: (cmd: string) => void;
    executeCommandRef: React.MutableRefObject<((cmd: string, silent?: boolean, isEnter?: boolean) => void) | undefined>;
    isMobile?: boolean;
}

// --- Logic Section: Character Creation Ref ---
// Module-level ref ensures persistence across hook re-renders during creation flow
const creationPromptRef: { current: CreationPrompt | null } = { current: null };

export function useAccountParser({ accountState, setAccountState, setGameState, sendCommand, executeCommandRef, isMobile }: UseAccountParserProps) {
    // Use Refs to keep parseAccountLine stable and avoid re-render loops
    const stageRef = useRef(accountState.stage);
    stageRef.current = accountState.stage;
    const charsRef = useRef(accountState.characters);
    charsRef.current = accountState.characters;
    const isMobileRef = useRef(isMobile);
    isMobileRef.current = isMobile;
    const lastProcessedPromptRef = useRef<string | null>(null);
    const currentChunkLinesRef = useRef<string[]>([]);

    const parseAccountLine = useCallback((line: string, isNewChunk: boolean): boolean => {
        if (isNewChunk) {
            currentChunkLinesRef.current = [];
        }

        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (!cleanLine) return false;

        if (isNewChunk) {
            currentChunkLinesRef.current = [cleanLine];
            // Only clear if we were in a menu state, otherwise keep the creation prompt until we match a new one
            if (stageRef.current === 'account-menu' || stageRef.current === 'login') {
                creationPromptRef.current = null;
            }
            console.log(`[AccountParser] New chunk started with line: ${cleanLine}`);
        }

        // 0. Detect Paginator (Progress output)
        if (cleanLine.includes('[Press return to continue]') ||
            cleanLine.includes('*** [Hit Return to continue]') ||
            cleanLine.includes('*** Return:')) {
            if (isMobileRef.current) {
                console.log(`[AccountParser] Detected paginator (mobile), sending return.`);
                // Use silent non-system so isSilentCapture is NOT incremented
                executeCommandRef.current?.('', true, false);
                return true; // Mobile: auto-page and suppress from log
            }
            return false; // Desktop: show in log so user can press Enter manually
        }

        // 0. Detect Main Account Menu Prompt (for completion/cancellation)
        if (cleanLine === 'Account>') {
            setGameState('account');
            setAccountState(prev => {
                console.log(`[AccountParser] Account> updater fired: prev.stage = "${prev.stage}", stageRef = "${stageRef.current}"`);
                
                // If we just finished creating a character, auto-play it
                if (prev.lastCreatedCharacterName) {
                    console.log(`[AccountParser] Auto-playing newly created character: ${prev.lastCreatedCharacterName}`);
                    executeCommandRef.current?.(`play ${prev.lastCreatedCharacterName}`, false, true);
                    return { ...prev, stage: 'none', lastCreatedCharacterName: undefined, creationPrompt: null };
                }

                if (prev.stage === 'character-select' || prev.stage === 'character-detail' || prev.stage === 'character-creation') return prev;
                creationPromptRef.current = null;
                return { ...prev, stage: 'account-menu', creationPrompt: null };
            });
            return true;
        }

        // Detect New Account Flow Prompts
        const lowerLine = cleanLine.toLowerCase();

        if (lowerLine.includes('welcome to mume!') || lowerLine.includes('another account on mume')) {
            console.log(`[AccountParser] Matched New Account prompt: ${cleanLine}`);
            creationPromptRef.current = {
                title: 'New Account',
                description: 'Welcome to MUME! This graphical client will walk you through creating your new account and your first character.',
                options: [
                    { id: 'n', label: 'No, creating my first account' },
                    { id: 'y', label: 'Yes, I have another account' }
                ],
                footer: '[Y/N/?]>'
            };
            setAccountState(prev => ({ 
                ...prev, 
                stage: 'character-creation', 
                creationPrompt: creationPromptRef.current! 
            }));
            return true;
        }

        if (lowerLine.includes('enter new account name') || lowerLine.includes('account name:')) {
            console.log(`[AccountParser] Matched Account Name prompt: ${cleanLine}`);
            creationPromptRef.current = {
                title: 'Account Name',
                description: 'Pick a unique name for your new MUME account. This is the name you will use to log in.',
                options: [],
                footer: 'Account Name>'
            };
            setAccountState(prev => ({ 
                ...prev, 
                stage: 'character-creation', 
                creationPrompt: creationPromptRef.current! 
            }));
            return true;
        }

        if (lowerLine === 'account password:' || 
            lowerLine === 'password:' || 
            lowerLine.startsWith('pick your account password') ||
            lowerLine.startsWith('enter password') ||
            lowerLine.startsWith('enter your password')) {
            console.log(`[AccountParser] Matched Set Password prompt: ${cleanLine}`);
            creationPromptRef.current = {
                title: 'Set Password',
                description: 'Pick a strong password. You will need this every time you log in.',
                options: [],
                footer: 'Password: '
            };
            setAccountState(prev => ({ 
                ...prev, 
                stage: 'character-creation', 
                creationPrompt: creationPromptRef.current! 
            }));
            return true;
        }

        if (lowerLine.includes('verify:') || 
            lowerLine.includes('verify password') || 
            lowerLine.includes('confirm password') ||
            lowerLine.includes('re-type') ||
            lowerLine.includes('verify it matches')) {
            console.log(`[AccountParser] Matched Verify prompt: ${cleanLine}`);
            creationPromptRef.current = {
                title: 'Verify Password',
                description: 'For security, please input your password a second time to verify it matches.',
                options: [],
                footer: 'Verify: '
            };
            setAccountState(prev => ({ 
                ...prev, 
                stage: 'character-creation', 
                creationPrompt: creationPromptRef.current! 
            }));
            return true;
        }

        // Detect Game Time Output
        if (cleanLine.startsWith('It is ') && cleanLine.includes('the Third Age')) {
            creationPromptRef.current = {
                title: 'Middle-earth Time',
                description: cleanLine,
                options: [{ id: 'menu', label: 'Back to Menu' }],
                footer: ''
            };
            setAccountState(prev => ({ 
                ...prev, 
                stage: 'character-creation', 
                creationPrompt: creationPromptRef.current! 
            }));
            return true;
        }

        if (creationPromptRef.current?.title === 'Middle-earth Time' && 
            (cleanLine.startsWith('Dawn is') || cleanLine.startsWith('It is'))) {
            // Append second line if it arrived
            if (!creationPromptRef.current.description.includes(cleanLine)) {
                creationPromptRef.current.description += '\n' + cleanLine;
                setAccountState(prev => ({ 
                    ...prev, 
                    creationPrompt: { ...creationPromptRef.current! } 
                }));
            }
            return true;
        }

        // 1. Detect Character Creation Header
            const creationHeaders = [
                "Choose Your Allegiance", "Choose Your Race", "Choose Your Subrace",
                "Choose Your Hometown", "Choose Your Sex", "Choose Your Alignment",
                "Choose Your Archetype", "Choose Your Stats", "Choose Your Physique",
                "Choose Your Name", "Your Character", "Choose Your Specialty", 
                "Choose Your Profession", "Choose Your Class"
            ];
            
            const isHeader = creationHeaders.some(h => cleanLine.includes(h));
            if (isHeader) {
                // Reset buffer for new creation stage
                creationPromptRef.current = {
                    title: cleanLine,
                    description: '',
                    options: [],
                    footer: ''
                };
                setAccountState(prev => ({ 
                    ...prev, 
                    stage: 'character-creation', 
                    creationPrompt: creationPromptRef.current! 
                }));
                setGameState('account');
                return true;
            }

            // 2. Parse Creation Prompt Details
            if (creationPromptRef.current && stageRef.current !== 'character-select') {
                // Parse options: (1) Option Name OR 1) Option Name
                const optionMatch = cleanLine.match(/^\s*\(?(\d+|back|\?)\)?\s+(.+)$/i);
                if (optionMatch) {
                    const id = optionMatch[1];
                    const label = optionMatch[2].trim();
                    
                    // If we see ID "1", check if we should reset (new list/page)
                    const existingOpt1 = creationPromptRef.current.options.find(o => o.id === "1");
                    if (id === "1" && existingOpt1 && existingOpt1.label !== label) {
                        creationPromptRef.current.options = [];
                        
                        // Surgically restore description from current chunk lines that aren't options/headers
                        creationPromptRef.current.description = currentChunkLinesRef.current
                            .filter(l => !l.match(/^\s*\(?(\d+|back|\?)\)?\s+(.+)$/i))
                            .filter(l => !l.match(/^[=\-\s\*\.]+$/))
                            .join('\n');
                    }

                    // Avoid duplicates in the same capture pass
                    if (!creationPromptRef.current.options.find(o => o.id === id)) {
                        creationPromptRef.current.options.push({ id, label });
                        setAccountState(prev => ({ 
                            ...prev, 
                            creationPrompt: { ...creationPromptRef.current! } 
                        }));
                    }
                    return true;
                }

                // Parse selection prompt (end of block)
                if (cleanLine.endsWith('>') && (
                    cleanLine.includes('"back"') || 
                    cleanLine.includes('Select an option') || 
                    cleanLine.includes('Pick a number') ||
                    cleanLine.includes('Enter your name')
                )) {
                    creationPromptRef.current.footer = cleanLine;
                    setAccountState(prev => ({ 
                        ...prev, 
                        creationPrompt: { ...creationPromptRef.current! } 
                    }));
                    return true;
                }

                // Parse known footer patterns without '>' (legacy/backup)
                if (cleanLine.includes('Will you use these stats?') ||
                    cleanLine.includes('Does this describe you?')) {
                    creationPromptRef.current.footer = cleanLine;
                    setAccountState(prev => ({ 
                        ...prev, 
                        creationPrompt: { ...creationPromptRef.current! } 
                    }));
                    return true;
                }

                // Collect description text
                if (cleanLine && !cleanLine.match(/^[=\-\s\*\.]+$/) && !isHeader) {
                    const desc = creationPromptRef.current.description.trimEnd();
                    const isListItem = cleanLine.match(/^(\*|\-|•|\d+[\.\)])/);

                    if (desc && !isListItem) {
                        if (desc.endsWith('-')) {
                            creationPromptRef.current.description = desc + cleanLine;
                        } else if (!desc.match(/[.!?:>]$/)) {
                            creationPromptRef.current.description = desc + ' ' + cleanLine;
                        } else {
                            creationPromptRef.current.description = desc + '\n' + cleanLine;
                        }
                    } else {
                        creationPromptRef.current.description = (desc ? desc + '\n' : '') + cleanLine;
                    }

                    setAccountState(prev => ({ 
                        ...prev, 
                        creationPrompt: { ...creationPromptRef.current! } 
                    }));
                    return true;
                }
                
                // Suppress separators and empty lines during creation
                if (!cleanLine || cleanLine.match(/^[=\-\s\*\.]+$/)) return true;
            }

        // 3. Detect Login Prompt
        const isNamePrompt = cleanLine.toLowerCase().includes('nom de guerre:') || 
                             cleanLine.toLowerCase().includes('by what name do you wish to be known?') ||
                             cleanLine.toLowerCase().includes('what is your name?') ||
                             cleanLine.toLowerCase().includes("what's your name?") ||
                             cleanLine.toLowerCase().includes("character's name");

        if (isNamePrompt) {
            if (lastProcessedPromptRef.current === cleanLine) return true;
            lastProcessedPromptRef.current = cleanLine;
            
            if (stageRef.current === 'login') return false;
            setGameState('account');
            setAccountState((prev: any) => ({ ...prev, stage: 'login' }));
            return false;
        }

        if (cleanLine.toLowerCase().includes('password:')) {
            if (lastProcessedPromptRef.current === cleanLine) return true;
            lastProcessedPromptRef.current = cleanLine;

            if (stageRef.current === 'login') return false;
            setGameState('account');
            setAccountState((prev: any) => ({ ...prev, stage: 'login' }));
            return false;
        }

        // 3.1 Detect Character List Header (Original Login Format)
        if (/no\s+name/i.test(cleanLine) && /level/i.test(cleanLine) && /race/i.test(cleanLine)) {
            creationPromptRef.current = null; // Ensure creation state is cleared before character entries
            setGameState('account');
            setAccountState(prev => ({ 
                ...prev, 
                stage: prev.stage === 'login' ? 'account-menu' : 'character-select', 
                characters: [] 
            }));
            return false;
        }

        // 3b. Detect Character List Header (Account Menu "list" Format)
        // Name            Rce Sub Lvl   Logon Area      Rent    Delete Host
        if (cleanLine.includes('Characters in account') ||
            (cleanLine.includes('Name') && cleanLine.includes('Logon') && cleanLine.includes('Area') && cleanLine.includes('Rent'))) {
            creationPromptRef.current = null; // Ensure creation state is cleared before character entries
            setGameState('account');
            setAccountState(prev => ({ 
                ...prev, 
                stage: prev.stage === 'login' ? 'account-menu' : 'character-select', 
                characters: [] 
            }));
            return false;
        }

        // 3. Detect Character Entry (Original Login Format)
        const charMatch = cleanLine.match(/^\s*(\d+)\)\s+([a-zA-Z]+)\s+(\d+)\s+([a-zA-Z\-]+)\s+(.*?)\s+(Yesterday|Today|[\d\w\s]+ago|Never)\s+(.*)$/i);

        if (charMatch) {
            const [_, index, name, level, race, sublevel, logon, rent] = charMatch;
            const alreadyExists = charsRef.current.some(c => c.name === name);
            if (alreadyExists && stageRef.current === 'character-select') return false;

            const newChar: CharacterEntry = {
                index: parseInt(index),
                name,
                level: parseInt(level),
                race,
                sublevel,
                logon,
                rent,
                area: ''
            };

            setAccountState(prev => ({
                ...prev,
                stage: 'character-select',
                characters: alreadyExists ? prev.characters : [...prev.characters, newChar]
            }));
            setGameState('account');
            return false;
        }

        // 4. Detect Character Entry (Account Menu Format - No Index)
        // Regex covers: "3 days", "1 day", "2 yrs", "1 yr", "4 weeks", "1 week", "3 mths", "1 mth",
        // "2 hrs", "1 hr", "5 mins", "1 min", "22 hrs", "Playing" (currently online), Yesterday/Today/Never/new
        const logonRegex = /(\d+\s+(?:days?|yrs?|wks?|weeks?|months?|mths?|hours?|hrs?|mins?|secs?|ago|years?)|Yesterday|Today|Never|new|Playing)\s*/i;
        const logonMatchLine = cleanLine.match(logonRegex);

        if (logonMatchLine && logonMatchLine.index !== undefined) {
            const rawLine = line.replace(/\x1b\[[0-9;]*m/g, '');
            const cleanName = cleanLine.split(/\s+/)[0];
            const nameValid = /^[a-zA-Z\u00C0-\u024F]{2,15}$/.test(cleanName);
            console.log(`[AccountParser] Section4: cleanName="${cleanName}" nameValid=${nameValid} logon="${logonMatchLine[1]}" stage=${stageRef.current} line="${cleanLine.substring(0, 50)}"`);
            // Allow accented characters (e.g. Rogóring, Hédir, Lúsifér)
            if (!nameValid) return false;

            const alreadyExists = charsRef.current.some(c => c.name === cleanName);
            if (alreadyExists && stageRef.current === 'character-select') return false;

            const logonMatchRaw = rawLine.match(logonRegex);
            const logonStart = logonMatchRaw && logonMatchRaw.index !== undefined ? logonMatchRaw.index : rawLine.indexOf(logonMatchLine[1]);
            
            const name = rawLine.substring(0, 14).trim() || cleanName;
            const race = rawLine.substring(14, 18).trim();
            const sublevel = rawLine.substring(18, 22).trim();
            const level = (logonStart > 22) ? rawLine.substring(22, logonStart).trim() : '';

            const newChar: CharacterEntry = {
                name, race, sublevel, level,
                logon: logonMatchLine[1],
                area: cleanLine.substring(logonMatchLine.index + logonMatchLine[0].length).trim().split(/\s+/)[0] || '',
                rent: cleanLine.substring(logonMatchLine.index + logonMatchLine[0].length).trim().split(/\s+/)[1] || '',
            };

            setAccountState(prev => ({
                ...prev,
                stage: 'character-select',
                characters: alreadyExists ? prev.characters : [...prev.characters, newChar]
            }));
            setGameState('account');
            return false;
        }

        // 5. Detect Selection Prompt (MUME uses "(P)lay  (N)ew  (D)elete ... (Q)uit")
        if ((cleanLine.includes('(P)lay') && cleanLine.includes('(N)ew')) ||
            (cleanLine.includes('Select a character') && cleanLine.includes('(N)ew'))) {
            if (stageRef.current === 'character-select') return true;
            setGameState('account');
            setAccountState(prev => ({ ...prev, stage: 'character-select' }));
            return false; // Show footer too
        }

        // 5. Detect Successful Login (Transition to Game)
        if (cleanLine.includes('Welcome to MUME') || cleanLine.includes('The music of the Ainur')) {
            setGameState('playing');
            setAccountState(prev => ({ ...prev, stage: 'none' }));
            return false;
        }

        // 6. Detect Account Menu (Graphical Command Grid)
        if (cleanLine.includes('Available commands:')) {
            if (stageRef.current === 'account-menu' || stageRef.current === 'character-select' || stageRef.current === 'character-detail' || stageRef.current === 'character-creation') return true;
            setGameState('account');
            setAccountState(prev => ({ ...prev, stage: 'account-menu' }));
            return true;
        }

        if (cleanLine === 'Account>') {
            setGameState('account');
            setAccountState(prev => {
                // If we are currently in character select or detail, or creation, don't stomp it
                if (prev.stage === 'character-select' || prev.stage === 'character-detail' || prev.stage === 'character-creation' || prev.stage === 'account-menu') return prev;
                return { ...prev, stage: 'account-menu' };
            });
            return true;
        }

        // Suppression Logic
        if (stageRef.current !== 'none' && stageRef.current !== 'login') {
            // In account-menu stage, suppress everything if it looks like the menu
            if (stageRef.current === 'account-menu') {
                // If it's the list of commands or help text, suppress
                if (cleanLine.match(/^[a-z]+(\s+<[a-z]+>)?\s+-\s+/i)) return true;
                if (cleanLine.startsWith('Where <sort> can be one of:')) return true;
                if (!cleanLine || cleanLine.match(/^[=\-\s\*\.]+$/)) return true;
            } else if (stageRef.current === 'character-creation') {
                return true; // Character creation suppressions handled in Step 2
            } else {
                // Legacy character select suppression
                if (!cleanLine || cleanLine.match(/^[=\-\s\*\.]+$/)) return true;
            }
        }

        return false;
    }, [setAccountState, setGameState]);

    return { parseAccountLine };
}
