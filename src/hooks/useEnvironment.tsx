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

    const detectLightingImpl = useCallback((symbol: string) => {
        if (!symbol) return;
        const s = String(symbol).trim();
        let type: LightingType = 'none';

        // MUME Standard Light Symbols
        if (s.includes('!')) type = 'artificial';
        else if (s.includes(')') || s.includes('(')) type = 'moon';
        else if (/o/i.test(s)) type = 'dark';
        else if (s.includes('*')) type = 'sun';
        else if (s.includes('[') || s.includes('.')) type = 'none';

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
