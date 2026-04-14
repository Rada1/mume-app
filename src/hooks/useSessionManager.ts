import { useEffect, useRef, useCallback } from 'react';

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
    gameState
}: SessionManagerDeps) => {
    // --- Auto-login session tracking ---
    const autoLoginSessionRef = useRef({ nameSent: false, passwordSent: false, lastStatus: '' });
    const telnetSendCommandRef = useRef(telnetSendCommand);
    useEffect(() => { telnetSendCommandRef.current = telnetSendCommand; }, [telnetSendCommand]);

    // Use refs for credentials so the effect only fires on prompt changes, not on each keystroke
    const loginNameRef = useRef(loginName);
    const loginPasswordRef = useRef(loginPassword);
    useEffect(() => { loginNameRef.current = loginName; }, [loginName]);
    useEffect(() => { loginPasswordRef.current = loginPassword; }, [loginPassword]);

    useEffect(() => {
        // Reset session tracking when we start a new connection
        if (status === 'connecting' && autoLoginSessionRef.current.lastStatus !== 'connecting') {
            autoLoginSessionRef.current = { nameSent: false, passwordSent: false, lastStatus: 'connecting' };
        }
        autoLoginSessionRef.current.lastStatus = status;

        if (status !== 'connected' || !activePrompt) return;

        // If we are already in the character selection flow, don't auto-send more login info
        if (gameState === 'playing') return;

        const lower = activePrompt.toLowerCase();
        const currentName = loginNameRef.current;
        const currentPassword = loginPasswordRef.current;

        // If no saved credentials, do nothing — let the user type manually
        if (!currentName && !currentPassword) return;

        const isNamePrompt = lower.includes("by what name do you wish to be known?") || lower.includes("what is your name?") || lower.includes("character's name");
        const isIllegalName = lower.includes("illegal name");

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
            if (lower.includes("password:")) {
                autoLoginSessionRef.current.passwordSent = true;
                addSystemMessage(`Auto-login: Sending password...`);
                telnetSendCommandRef.current(currentPassword);
            }
        }
    }, [activePrompt, status, addSystemMessage]);

    // Exposed so LoginView can signal a manual login attempt is starting.
    // Sets nameSent=true (caller sends name) and resets passwordSent=false
    // (auto-login will handle the upcoming "Password:" prompt).
    const prepareLoginAttempt = useCallback(() => {
        autoLoginSessionRef.current.nameSent = true;
        autoLoginSessionRef.current.passwordSent = false;
    }, []);

    // --- Practice sync on character detection ---
    const lastSyncedCharRef = useRef<string | null>(null);
    useEffect(() => {
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
    useEffect(() => {
        if (autoConnect && status === 'disconnected') {
            telnetConnect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

    // When any groupmate is fighting, show a single 'Assist' spit button.
    const isAssistActiveRef = useRef<boolean>(false);
    useEffect(() => {
        const checkStr = (val: any) => typeof val === 'string' && (val.toLowerCase().includes('fight') || val.toLowerCase().includes('combat'));
        
        const isAnyoneFighting = groupMembers.some(m => 
            checkStr(m.position) || checkStr((m as any).pos) || checkStr((m as any).status) || checkStr((m as any).state) || (m as any).fighting || (m as any).combat
        );
        
        if (!isAnyoneFighting) {
            isAssistActiveRef.current = false;
            return;
        }

        const hasExistingAssist = spatButtons.some(sb => sb.btnId === 'auto-assist-generic');
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
