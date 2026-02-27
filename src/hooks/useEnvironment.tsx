import React, { useState, useCallback } from 'react';
import { Sun, Moon, Zap, EyeOff, CloudRain, CloudLightning, Snowflake, CloudFog } from 'lucide-react';
import { LightingType } from '../types';

export function useEnvironment() {
    const [lighting, setLighting] = useState<LightingType>('none');
    const [weather, setWeather] = useState<'none' | 'cloud' | 'rain' | 'heavy-rain' | 'snow'>('none');
    const [isFoggy, setIsFoggy] = useState(false);
    const [mood, setMood] = useState('normal');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');

    const detectLighting = useCallback((symbol: string) => {
        const s = symbol.trim();
        if (s.includes('!')) setLighting('artificial');
        else if (s.includes(')')) setLighting('moon');
        else if (/o/i.test(s)) setLighting('dark'); // 'oo', 'oO', etc
        else if (s.includes('*')) setLighting('sun');
        else if (s === '.') setLighting('none');
    }, []);

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
