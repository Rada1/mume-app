/**
 * @file useDiscordActivity.ts
 * @description Hook to manage Discord Activity Embedded App SDK initialization, authentication, and Rich Presence updates.
 */

import { useEffect, useRef, useState } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';
import { useActiveRoom, useActiveVitals, useActiveCharacter } from '../stores/useActiveGameState';
import { useSettingsStore } from '../stores/useSettingsStore';

// --- Type-safe ImportMeta Cast ---
const meta = import.meta as unknown as { env?: Record<string, string> };
const CLIENT_ID = meta.env?.VITE_DISCORD_CLIENT_ID || '1512833894158696478';

// --- Global SDK Instance ---
let discordSdk: DiscordSDK | null = null;

if (typeof window !== 'undefined') {
    const isDiscordIframe = window.location.search.includes('frame_id') || 
                            window.location.search.includes('instance_id') || 
                            window.self !== window.top;
    if (isDiscordIframe) {
        discordSdk = new DiscordSDK(CLIENT_ID);
    }
}

export const useDiscordActivity = () => {
    const isDiscordEnabled = useSettingsStore(state => state.isDiscordEnabled ?? true);
    const [sdkReady, setSdkReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [discordUser, setDiscordUser] = useState<any | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    const activeRoom = useActiveRoom();
    const activeVitals = useActiveVitals();
    const characterName = useActiveCharacter();
    const sessionStartTime = useRef<number>(Date.now());

    const roomZone = activeRoom.roomZone;
    const currentHp = activeVitals.hp;
    const maxHp = activeVitals.maxHp;
    const isFighting = activeVitals.position === 'fighting';

    // --- SDK Initialization Logic ---
    useEffect(() => {
        if (!discordSdk || !isDiscordEnabled) {
            return;
        }

        let isMounted = true;
        const initializeSdk = async () => {
            try {
                console.log('[DiscordSDK] Readying SDK...');
                await discordSdk!.ready();
                if (!isMounted) return;
                setSdkReady(true);
                console.log('[DiscordSDK] SDK is ready.');

                // Perform OAuth2 authentication flow client-side authorization
                const { code } = await discordSdk!.commands.authorize({
                    client_id: CLIENT_ID,
                    response_type: 'code',
                    scope: ['identify', 'rpc.activities.write'],
                });

                if (!isMounted) return;

                // Send code to backend token exchange endpoint
                const tokenExchangeUrl = meta.env?.VITE_DISCORD_TOKEN_EXCHANGE_URL || '/api/token';
                console.log(`[DiscordSDK] Exchanging code via ${tokenExchangeUrl}...`);
                
                const redirectUri = window.location.origin + window.location.pathname;
                const response = await fetch(tokenExchangeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, redirect_uri: redirectUri }),
                });

                if (!response.ok) {
                    throw new Error(`Token exchange returned status ${response.status}`);
                }

                const { access_token } = await response.json();
                if (!isMounted) return;

                // Finalize authentication with Discord host client
                const authResult = await discordSdk!.commands.authenticate({ access_token });
                if (!isMounted) return;

                setIsAuthenticated(true);
                setDiscordUser(authResult.user);
                setAuthError(null);
                console.log('[DiscordSDK] Successfully authenticated. User:', authResult.user.username);
            } catch (err: any) {
                console.warn('[DiscordSDK] Authorization failed. Rich Presence updates may be disabled:', err.message || err);
                if (isMounted) {
                    setAuthError(err.message || 'Authorization failed. Ensure backend exchange is configured.');
                }
            }
        };

        initializeSdk();

        return () => {
            isMounted = false;
        };
    }, [isDiscordEnabled]);

    // --- Rich Presence Update Logic ---
    useEffect(() => {
        if (!discordSdk || !sdkReady || !isAuthenticated || !isDiscordEnabled) {
            return;
        }

        const updatePresence = async () => {
            try {
                // Capitalize the physical position (e.g., standing -> Standing)
                const positionRaw = activeVitals.position || 'standing';
                const positionText = positionRaw.charAt(0).toUpperCase() + positionRaw.slice(1);
                const stateDetail = `Status: ${positionText}`;

                let detailsText = 'Selecting Character...';
                const race = activeVitals.characterInfo?.race;
                if (isFighting) {
                    detailsText = `⚔️ In Combat`;
                } else if (race) {
                    const firstChar = race.charAt(0).toLowerCase();
                    const article = ['a', 'e', 'i', 'o', 'u'].includes(firstChar) ? 'an' : 'a';
                    detailsText = `Playing as ${article} ${race}`;
                } else if (characterName) {
                    detailsText = `Playing Game`;
                }

                await discordSdk!.commands.setActivity({
                    activity: {
                        details: detailsText,
                        state: stateDetail,
                        timestamps: {
                            start: sessionStartTime.current,
                        },
                        assets: {
                            large_image: 'mume_logo',
                            large_text: 'MUME MUD Client',
                        },
                    }
                });
                console.log('[DiscordSDK] Rich Presence updated.');
            } catch (err) {
                console.error('[DiscordSDK] Failed to update setActivity presence:', err);
            }
        };

        // Debounce updates to avoid spamming Discord RPC rate limits
        const timeout = setTimeout(updatePresence, 2000);
        return () => clearTimeout(timeout);
    }, [sdkReady, isAuthenticated, isDiscordEnabled, characterName, activeVitals.position, currentHp, maxHp, isFighting]);

    // --- Helper Commands ---
    const openInviteDialog = async () => {
        if (!discordSdk || !sdkReady) {
            console.warn('[DiscordSDK] Invite command failed: SDK is not ready.');
            return;
        }
        try {
            await discordSdk.commands.openInviteDialog();
            console.log('[DiscordSDK] Opened Invite Dialog');
        } catch (err) {
            console.error('[DiscordSDK] Failed to open invite dialog:', err);
        }
    };

    return {
        isDiscordIframe: !!discordSdk,
        sdkReady,
        isAuthenticated,
        discordUser,
        authError,
        openInviteDialog,
    };
};
