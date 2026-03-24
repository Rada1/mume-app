import { useEffect, useRef } from 'react';

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
    hasSeenOnboarding: boolean;
    isNoviceMode: boolean;
    groupMembers: any[];
    spatButtons: any[];
    triggerSpitManual: (btn: any) => void;
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
    hasSeenOnboarding,
    isNoviceMode,
    groupMembers,
    spatButtons,
    triggerSpitManual
}: SessionManagerDeps) => {
    // --- Auto-login session tracking ---
    const autoLoginSessionRef = useRef({ nameSent: false, passwordSent: false, lastStatus: '' });
    const telnetSendCommandRef = useRef(telnetSendCommand);
    useEffect(() => { telnetSendCommandRef.current = telnetSendCommand; }, [telnetSendCommand]);

    useEffect(() => {
        // Reset session tracking when we start a new connection
        if (status === 'connecting' && autoLoginSessionRef.current.lastStatus !== 'connecting') {
            autoLoginSessionRef.current = { nameSent: false, passwordSent: false, lastStatus: 'connecting' };
        }
        autoLoginSessionRef.current.lastStatus = status;

        if (status !== 'connected' || !activePrompt) return;

        const lower = activePrompt.toLowerCase();

        // Handle Name Prompt
        if (loginName && !autoLoginSessionRef.current.nameSent) {
            if (lower.includes("by what name do you wish to be known?") || lower.includes("what is your name?") || lower.includes("character's name")) {
                autoLoginSessionRef.current.nameSent = true;
                addSystemMessage(`Auto-login: Sending name: ${loginName}`);
                telnetSendCommandRef.current(loginName);
            }
        }

        // Handle Password Prompt (only if name was sent or we don't have a name/prompt for it)
        if (loginPassword && !autoLoginSessionRef.current.passwordSent) {
            if (lower.includes("password:")) {
                autoLoginSessionRef.current.passwordSent = true;
                addSystemMessage(`Auto-login: Sending password...`);
                telnetSendCommandRef.current(loginPassword);
            }
        }
    }, [activePrompt, status, loginName, loginPassword, addSystemMessage]);

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

    // --- Phase 1: First-Run Onboarding Greeting ---
    useEffect(() => {
        if (status === 'connected' && !hasSeenOnboarding && isNoviceMode) {
            const greetingMessages = [
                "Welcome! The map (top-right) tracks your movement automatically.",
                "Vitals (top-center) show your status. Click a target's name in the log to lock onto them.",
                "Tactical buttons (bottom-sides) can be swiped for extra actions."
            ];
            greetingMessages.forEach((msg, i) => {
                setTimeout(() => {
                    addSystemMessage(msg);
                }, 1000 * (i + 1));
            });
        }
    }, [status, hasSeenOnboarding, isNoviceMode, addSystemMessage]);

    // --- Group Combat Assist Trigger ---
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

};
