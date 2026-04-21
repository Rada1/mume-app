import React, { useCallback, useEffect } from 'react';
import { Sun, Moon, Flame, EyeOff, CloudRain, CloudLightning, Snowflake, CloudFog, Cloud } from 'lucide-react';
import { LightingType } from '../types';

interface EnvironmentDeps {
    lighting: LightingType;
    setLighting: React.Dispatch<React.SetStateAction<LightingType>>;
    lightningEnabled: boolean;
    setLightningEnabled: (val: boolean) => void;
    weather: any;
    setWeather: React.Dispatch<React.SetStateAction<any>>;
    isFoggy: boolean;
    setIsFoggy: (val: boolean) => void;
    mood: string;
    setMood: (val: string) => void;
    spellSpeed: string;
    setSpellSpeed: (val: string) => void;
    alertness: string;
    setAlertness: (val: string) => void;
}

export function useEnvironment(deps: EnvironmentDeps) {
    const {
        lighting, setLighting,
        lightningEnabled, setLightningEnabled,
        weather, setWeather,
        isFoggy, setIsFoggy,
        mood, setMood,
        spellSpeed, setSpellSpeed,
        alertness, setAlertness,
    } = deps;

    const detectLightingImpl = useCallback((symbol: string | number) => {
        if (symbol === undefined || symbol === null) return;
        const s = String(symbol).trim();
        let type: LightingType = 'none';

        // 1. Handle Numeric GMCP Light Values (MUME common: 0=dark, 1=bright)
        if (/^\d+$/.test(s)) {
            const val = parseInt(s);
            if (val <= 0) type = 'dark';
            else type = 'sun';
            setLighting(type);
            return;
        }

        // 2. Handle Textual GMCP Light Values
        const lower = s.toLowerCase();
        if (lower === 'dark' || lower === 'night') { setLighting('dark'); return; }
        if (lower === 'light' || lower === 'day' || lower === 'bright') { setLighting('sun'); return; }
        if (lower === 'moon' || lower === 'moonlight') { setLighting('moon'); return; }

        // 3. MUME Standard Prompt Symbols
        // If it's a single character, it's from the parser's focused detection
        if (s.length === 1) {
            if (s === '!') type = 'artificial';
            else if (s === ')' || s === '(') type = 'moon';
            else if (s.toLowerCase() === 'o') type = 'dark';
            else if (s === '*') type = 'sun';
            else if (['[', '.', '+', '{'].includes(s)) type = 'none';
            
            if (type !== 'none') {
                setLighting(type);
                return;
            }
        }

        // 4. Full Prompt String Parsing
        // We strip anything inside brackets [ ] because that's status info, not lighting
        const cleanForSearch = s.replace(/\[.*?\]/g, '');
        
        // Priority Search:
        if (cleanForSearch.includes('!')) type = 'artificial';
        else if (cleanForSearch.includes('*')) type = 'sun';
        else if (cleanForSearch.includes(')') || cleanForSearch.includes('(')) type = 'moon';
        else if (/\bo\b/i.test(cleanForSearch) || cleanForSearch.includes(' o ') || cleanForSearch.endsWith(' o')) type = 'dark';
        else if (cleanForSearch.toLowerCase().includes('pitch black')) type = 'dark';

        if (type !== 'none') {
            setLighting(type);
        }
    }, [setLighting]);

    const getLightingIcon = () => {
        switch (lighting) {
            case 'sun': return <Sun size={16} style={{ color: '#fbbf24' }} />; // Yellow
            case 'moon': return <Moon size={16} style={{ color: '#a5b1c2' }} />; // Silvery Blue
            case 'artificial': return <Flame size={16} style={{ color: '#ef4444' }} />; // Red
            case 'dark': return <EyeOff size={16} className="text-gray-500" />;
            default: return null;
        }
    };


    const getWeatherIcon = () => {
        switch (weather) {
            case 'rain': return <CloudRain size={16} className="text-blue-400" />;
            case 'heavy-rain': return <CloudRain size={16} className="text-blue-600 drop-shadow-sm" />;
            case 'snow': return <Snowflake size={16} className="text-white" />;
            case 'cloud': return <Cloud size={16} className="text-gray-400" />;
            default: return null;
        }
    };

    return {
        lighting,
        setLighting,
        weather,
        setWeather,
        isFoggy,
        setIsFoggy,
        mood,
        setMood,
        spellSpeed,
        setSpellSpeed,
        alertness,
        setAlertness,
        detectLighting: detectLightingImpl,
        getLightingIcon,
        getWeatherIcon,
    };
}
