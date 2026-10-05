/**
 * @file ReplayHUD.tsx
 * @description HUD component for session playback controls.
 */

import React, { useState, useMemo } from 'react';
import { useUI } from '../../../context/GameContext';
import type { FlagEntry } from '../../../types/session';
import { ReplayHUDMinimized } from './ReplayHUDMinimized';
import { ReplayHUDExpanded } from './ReplayHUDExpanded';
import type { ReplayFlagMarker } from './ReplayHUDTypes';

import { useViewport } from '../../../hooks/useViewport';
import { useSessionStore } from '../../../stores/useSessionStore';

export const ReplayHUD: React.FC = () => {
    // --- Logic Section ---
    const { replayer } = useUI();
    const { log, state, seek, performSearch, setTrimRange } = replayer;
    const { isMobile } = useViewport();

    const flagMarkers = useMemo(() => {
        if (!log?.log) return [];
        return log.log
            .filter((entry): entry is FlagEntry => entry.typ === 'flag')
            .map(entry => ({ t: entry.t, kind: entry.d.kind, name: entry.d.name } satisfies ReplayFlagMarker));
    }, [log]);

    const jumpToFlag = (dir: 'next' | 'prev') => {
        if (!flagMarkers.length) return;
        if (dir === 'next') {
            const next = flagMarkers.find(f => f.t > state.currentTime + 100);
            seek(next !== undefined ? next.t : flagMarkers[0].t);
        } else {
            const prevs = flagMarkers.filter(f => f.t < state.currentTime - 100);
            seek(prevs.length ? prevs[prevs.length - 1].t : flagMarkers[flagMarkers.length - 1].t);
        }
    };
    const [isHovered, setIsHovered] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTrimMode, setIsTrimMode] = useState(false);
    
    const isMinimized = useSessionStore(state => state.isReplayHUDMinimized);
    const setIsMinimized = useSessionStore(state => state.setIsReplayHUDMinimized);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        performSearch(e.target.value);
    };

    const toggleTrimMode = () => {
        if (!isTrimMode) {
            // Default to whole log if no trim set
            if (state.trimRange[0] === null) setTrimRange([0, state.duration]);
            setIsTrimMode(true);
        } else {
            setIsTrimMode(false);
        }
    };

    const jumpToResult = (dir: 'next' | 'prev') => {
        if (!state.searchResults.length) return;
        
        let targetTime = 0;
        if (dir === 'next') {
            const next = state.searchResults.find(t => t > state.currentTime + 100);
            targetTime = next !== undefined ? next : state.searchResults[0];
        } else {
            const prevs = state.searchResults.filter(t => t < state.currentTime - 100);
            targetTime = prevs.length ? prevs[prevs.length - 1] : state.searchResults[state.searchResults.length - 1];
        }
        
        seek(targetTime);
    };

    
    // --- Rendering Section ---
    if (!state.duration || !state.isVisible) {
        return null;
    }

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = (state.currentTime / state.duration) * 100;

    if (isMinimized) {
        return <ReplayHUDMinimized
            replayer={replayer}
            progress={progress}
            flagMarkers={flagMarkers}
            isMobile={isMobile}
            isHovered={isHovered}
            setIsHovered={setIsHovered}
            setIsMinimized={setIsMinimized}
            searchQuery={searchQuery}
            handleSearch={handleSearch}
            jumpToResult={jumpToResult}
            formatTime={formatTime}
            isTrimMode={isTrimMode}
        />;
    }

    return <ReplayHUDExpanded
        replayer={replayer}
        flagMarkers={flagMarkers}
        isMobile={isMobile}
        isHovered={isHovered}
        setIsHovered={setIsHovered}
        setIsMinimized={setIsMinimized}
        searchQuery={searchQuery}
        handleSearch={handleSearch}
        jumpToResult={jumpToResult}
        jumpToFlag={jumpToFlag}
        formatTime={formatTime}
        progress={progress}
        isTrimMode={isTrimMode}
        toggleTrimMode={toggleTrimMode}
    />;
};
