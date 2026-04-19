import * as React from 'react';

export interface SessionManagerDeps {
    status: string;
    activePrompt: string;
    loginName?: string;
    loginPassword?: string;
    addSystemMessage: (msg: string) => void;
    telnetSendCommand: (cmd: string) => void;
    telnetConnect: () => void;
    characterName: string | null;
    executeCommand: (cmd: string, echo?: boolean, fromMacro?: boolean) => void;
    autoConnect: boolean;
    groupMembers: any[];
    spatButtons: any[];
    triggerSpitManual: (btn: any) => void;
    gameState: import('../types').GameState;
    accountStage?: import('../types').AccountStage;
    isPasswordMode?: boolean;
}

export const useSessionManager = ({
    status,
    activePrompt,
    loginName,
    loginPassword,
    addSystemMessage,
    telnetSendCommand,
    telnetConnect,
    characterName,
    executeCommand,
    autoConnect,
    groupMembers,
    spatButtons,
    triggerSpitManual,
    gameState,
    accountStage,
    isPasswordMode
}: SessionManagerDeps) => {
    // --- Auto-login session tracking ---
    const autoLoginSessionRef = React.useRef({ nameSent: false, passwordSent: false, lastStatus: '' });
    const telnetSendCommandRef = React.useRef(telnetSendCommand);
    React.useEffect(() => { telnetSendCommandRef.current = telnetSendCommand; }, [telnetSendCommand]);

    // Use refs for credentials so the effect only fires on prompt changes, not on each keystroke
    const loginNameRef = React.useRef(loginName);
    const loginPasswordRef = React.useRef(loginPassword);
    React.useEffect(() => { loginNameRef.current = loginName; }, [loginName]);
    React.useEffect(() => { loginPasswordRef.current = loginPassword; }, [loginPassword]);

    React.useEffect(() => {
        // Reset session tracking when we start a new connection
        if (status === 'connecting' && autoLoginSessionRef.current.lastStatus !== 'connecting') {
            autoLoginSessionRef.current = { nameSent: false, passwordSent: false, lastStatus: 'connecting' };
        }
        autoLoginSessionRef.current.lastStatus = status;

        const currentName = loginNameRef.current;
        const currentPassword = loginPasswordRef.current;

        // If no saved credentials, do nothing — let the user type manually
        if (!currentName && !currentPassword) {
            console.log('[SessionManager] No credentials found (status:', status, 'prompt:', activePrompt, ' gameState:', gameState, ')');
            return;
        }

        console.log('[SessionManager] EVALUATING (status:', status, 'prompt:', activePrompt, ' gameState:', gameState, ')');

        if (status !== 'connected' || !activePrompt) return;

        // If we are already in the character selection flow, don't auto-send more login info
        if (gameState === 'playing') return;

        // Important: Strip ANSI escape codes before checking for prompts
        const cleanPrompt = activePrompt.replace(/\x1b\[[0-9;]*m/g, '');
        const lower = cleanPrompt.toLowerCase();

        const isNamePrompt = /by what name do you wish to be known\s*\?|what is your name\s*\?|character\'s name/i.test(lower) || (gameState === 'account' && accountStage === 'login' && !isPasswordMode);
        const isPasswordPrompt = /password\s*:/i.test(lower) || (gameState === 'account' && accountStage === 'login' && isPasswordMode);
        const isIllegalName = /illegal name/i.test(lower);

        console.log('[SessionManager] Checking prompt:', { 
            lower, 
            isNamePrompt, 
            isPasswordPrompt,
            isIllegalName, 
            nameSent: autoLoginSessionRef.current.nameSent,
            passwordSent: autoLoginSessionRef.current.passwordSent,
            currentNamePresent: !!currentName,
            currentPasswordPresent: !!currentPassword,
            accountStage,
            isPasswordMode
        });

        // Handle Name Prompt
        if (isNamePrompt && !isIllegalName) {
            // Only reset passwordSent on a CLEAN name prompt (not after a rejection)
            autoLoginSessionRef.current.passwordSent = false;

            if (currentName && !autoLoginSessionRef.current.nameSent) {
                autoLoginSessionRef.current.nameSent = true;
                addSystemMessage(`Auto-login: Sending name: ${currentName}`);
                telnetSendCommandRef.current(currentName);
            }
        }

        // Handle Password Prompt
        if (currentPassword && !autoLoginSessionRef.current.passwordSent) {
            if (isPasswordPrompt) {
                autoLoginSessionRef.current.passwordSent = true;
                addSystemMessage(`Auto-login: Sending password...`);
                telnetSendCommandRef.current(currentPassword);
            }
        }
    }, [activePrompt, status, addSystemMessage, gameState]);

    // Exposed so LoginView can signal a manual login attempt is starting.
    // Sets nameSent=true (caller sends name) and resets passwordSent=false
    // (auto-login will handle the upcoming "Password:" prompt).
    const prepareLoginAttempt = React.useCallback(() => {
        autoLoginSessionRef.current.nameSent = true;
        autoLoginSessionRef.current.passwordSent = false;
    }, []);

    // --- Practice sync on character detection ---
    const lastSyncedCharRef = React.useRef<string | null>(null);
    React.useEffect(() => {
        if (characterName && characterName !== lastSyncedCharRef.current && status === 'connected') {
            lastSyncedCharRef.current = characterName;
            // Delay slightly to ensure login sequence is fully finished
            setTimeout(() => {
                executeCommand('practice', true, true);
            }, 2000);
        } else if (!characterName) {
            lastSyncedCharRef.current = null;
        }
    }, [characterName, status, executeCommand]);

    // --- Only on mount / Auto Connect ---
    React.useEffect(() => {
        if (autoConnect && status === 'disconnected') {
            telnetConnect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

    // When any groupmate is fighting, show a single 'Assist' spit button.
    const isAssistActiveRef = React.useRef<boolean>(false);
    React.useEffect(() => {
        const checkStr = (val: any) => typeof val === 'string' && (val.toLowerCase().includes('fight') || val.toLowerCase().includes('combat'));
        
        const isAnyoneFighting = (groupMembers || []).some(m => 
            checkStr(m.position) || checkStr((m as any).pos) || checkStr((m as any).status) || checkStr((m as any).state) || (m as any).fighting || (m as any).combat
        );
        
        if (!isAnyoneFighting) {
            isAssistActiveRef.current = false;
            return;
        }

        const hasExistingAssist = (spatButtons || []).some(sb => sb.btnId === 'auto-assist-generic');
        if (!hasExistingAssist && !isAssistActiveRef.current) {
            isAssistActiveRef.current = true;
            
            triggerSpitManual({
                id: `auto-assist-generic`,
                label: `Assist`,
                command: `assist`,
                style: { backgroundColor: 'rgba(220, 38, 38, 0.8)' }, // Red combat glow
                trigger: { 
                    enabled: true,
                    duration: 15, // Button lasts 15s or until clicked
                    spit: true 
                }
            });
        }
    }, [groupMembers, triggerSpitManual, spatButtons]);

    return { prepareLoginAttempt };
};
