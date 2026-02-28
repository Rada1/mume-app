import React, { useState, useCallback } from 'react';
import { Sun, Moon, Zap, EyeOff, CloudRain, CloudLightning, Snowflake, CloudFog } from 'lucide-react';
import { LightingType } from '../types';
import { useGame } from '../context/GameContext';

export function useEnvironment() {
    const {
        lightning: lightingEnabled, setLightning,
        weather, setWeather,
        isFoggy, setIsFoggy
    } = useGame();

    // The 'lightning' state in GameContext refers to the darkness/light toggle effect (for detection)
    // Here we map it to LightingType ('artificial' | 'moon' | 'dark' | 'sun' | 'none')
    const [lighting, setLighting] = useState<LightingType>('none');

    const [mood, setMood] = useState('normal');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');

    const detectLighting = useCallback((symbol: string) => {
        const s = symbol.trim();
        let type: LightingType = 'none';
        if (s.includes('!')) type = 'artificial';
        else if (s.includes(')')) type = 'moon';
        else if (/o/i.test(s)) type = 'dark';
        else if (s.includes('*')) type = 'sun';
        else if (s === '.') type = 'none';

        setLighting(type);
        // Sync with the boolean 'lightning' state in context for detection logic elsewhere
        setLightning(type !== 'dark' && type !== 'none');
    }, [setLightning]);

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
        detectLighting,
        getLightingIcon,
        getWeatherIcon,
    };
}
