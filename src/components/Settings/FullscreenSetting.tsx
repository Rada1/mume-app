/** @file FullscreenSetting.tsx — User-controlled browser fullscreen for mobile and desktop. */
import React from 'react';
import { ToggleRow } from './SettingHelpers';

// --- Fullscreen state and user-initiated transitions ---
export const FullscreenSetting: React.FC = () => {
    const [active, setActive] = React.useState(() => Boolean(document.fullscreenElement));
    const [error, setError] = React.useState(false);
    const installedFullscreen = !active && window.matchMedia('(display-mode: fullscreen)').matches;
    const supported = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen && document.exitFullscreen);

    React.useEffect(() => {
        const update = () => setActive(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', update);
        return () => document.removeEventListener('fullscreenchange', update);
    }, []);

    const toggle = async () => {
        setError(false);
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.documentElement.requestFullscreen();
        } catch {
            setError(true);
        }
    };

    const description = installedFullscreen
        ? 'This installation starts in fullscreen. Chrome must update its installed app before this can be switched off.'
        : !supported ? 'Fullscreen is unavailable in this browser.'
        : error ? 'Unable to change fullscreen. Check your browser settings and try again.'
        : 'Hide system bars while playing. Fullscreen may end when you leave the app.';
    return <ToggleRow label="Fullscreen" description={description} value={active || installedFullscreen}
        disabled={!supported || installedFullscreen} onToggle={() => { void toggle(); }}/>;
};
