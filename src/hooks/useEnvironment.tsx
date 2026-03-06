import React, { useCallback, useEffect } from 'react';
import { Sun, Moon, Zap, EyeOff, CloudRain, CloudLightning, Snowflake, CloudFog } from 'lucide-react';
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
    setDetectLighting: (fn: (symbol: string) => void) => void;
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
        setDetectLighting
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

        // 3. MUME Standard Prompt Symbols
        // We look for the FIRST character if it's a known symbol
        const char = s.charAt(0);

        if (char === '!') type = 'artificial';
        else if (char === ')' || char === '(') type = 'moon';
        else if (char.toLowerCase() === 'o') type = 'dark';
        else if (char === '*') type = 'sun';
        else if (char === '[' || char === '.' || char === '+') type = 'none';
        else {
            // Fallback: If no match at start, check for symbol anywhere but avoid descriptive labels
            // (Only for very short strings or clear symbols)
            if (s.length < 5) {
                if (s.includes('!')) type = 'artificial';
                else if (s.includes('*')) type = 'sun';
                else if (s.includes(')') || s.includes('(')) type = 'moon';
                else if (/^o$/i.test(s)) type = 'dark'; // Only if exactly 'o'
            }
        }

        setLighting(type);
    }, [setLighting]);

    useEffect(() => {
        // Fix: passing the function directly to correctly set the ref
        setDetectLighting(detectLightingImpl);
    }, [detectLightingImpl, setDetectLighting]);

    const getLightingIcon = () => {
        switch (lighting) {
            case 'sun': return <Sun size={16} className="text-yellow-400" />;
            case 'moon': return <Moon size={16} className="text-blue-300" />;
            case 'artificial': return <Zap size={16} className="text-orange-400" />;
            case 'dark': return <EyeOff size={16} className="text-gray-500" />;
            default: return null;
        }
    };

    const getWeatherIcon = () => {
        switch (weather) {
            case 'rain': return <CloudRain size={16} className="text-blue-400" />;
            case 'heavy-rain': return <CloudLightning size={16} className="text-indigo-400" />;
            case 'snow': return <Snowflake size={16} className="text-white" />;
            case 'cloud': return <CloudFog size={16} className="text-gray-400" />;
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
