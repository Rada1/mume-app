/** @file Zone music mapping drafts and upload actions. */
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useGame } from '../context/GameContext';

// --- Mapping Actions ---
export const useZoneMusicSettings = () => {
    const { zoneMusic, setZoneMusic } = useGame();

    const [newZoneName, setNewZoneName] = useState('');
    const [newZoneUrl, setNewZoneUrl] = useState('');

    const addZoneMusic = () => {
        if (!newZoneName || !newZoneUrl) return;
        setZoneMusic(prev => {
            const existingIdx = prev.findIndex(m => m.zone.toLowerCase() === newZoneName.toLowerCase());
            if (existingIdx >= 0) {
                const next = [...prev];
                const current = next[existingIdx];
                next[existingIdx] = { ...current, url: newZoneUrl };
                return next;
            }
            return [...prev, { zone: newZoneName, url: newZoneUrl }];
        });
        setNewZoneName('');
        setNewZoneUrl('');
    };

    const removeZoneMusic = (zone: string) => {
        setZoneMusic(prev => prev.filter(m => m.zone !== zone));
    };

    const handleZoneOverrideUpload = (zone: string, e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setZoneMusic(prev => {
                const filtered = prev.filter(m => m.zone.toLowerCase() !== zone.toLowerCase());
                return [...filtered, { zone, url }];
            });
        }
    };

    return { zoneMusic, newZoneName, setNewZoneName, newZoneUrl, setNewZoneUrl,
        addZoneMusic, removeZoneMusic, handleZoneOverrideUpload };
};
