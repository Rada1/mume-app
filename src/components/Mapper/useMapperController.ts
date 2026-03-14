/**
 * @file useMapperController.ts
 * @description Bridge between the shared MapperContext and individual Mapper view instances.
 * Handles instance-specific UI state and registration.
 */

import { useState, useEffect, useImperativeHandle } from 'react';
import { useMapper } from '../../context/MapperContext';

export const useMapperController = (characterName: string | null, ref: React.Ref<any>, options: { onRecenter?: () => void, triggerRender?: () => void } = {}) => {
    const context = useMapper();
    // console.log('[Mapper] useMapperController re-render', { characterName, hasRef: !!ref });
    const {
        rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId,
        currentRoomIdRef, roomsRef, preloadedCoordsRef,
        handleResetAndSync, handleSyncLocation, handleClearMap,
        handleAddRoom, handleDeleteRoom, pushPendingMove,
        handleMoveConfirmed, handleMoveFailure, preMoveRef,
        triggerRender: contextTriggerRender, renderVersion
    } = context;

    // Instance-specific UI state that doesn't need to be global
    // Note: allowPersistence and unveilMap are now global in MapperContext

    useImperativeHandle(ref, () => ({
        handleRoomInfo: () => {}, // Handled by context events
        handleAddRoom,
        handleDeleteRoom,
        handleUpdateExits: () => {}, // Handled by context events
        handleTerrain: () => {}, // Handled by context events
        handleResetAndSync,
        handleMoveConfirmed,
        handleMoveFailure,
        handleCenterOnPlayer: options.onRecenter,
        stableRoomIdRef: currentRoomIdRef,
        stableRoomsRef: roomsRef,
        preloadedCoordsRef,
        pushPendingMove,
        pushPreMove: (dir: string, targetId: string) => {
            preMoveRef.current = { dir, targetId, time: Date.now() };
            contextTriggerRender();
        },
    }), [handleAddRoom, handleDeleteRoom, handleResetAndSync, handleMoveConfirmed, handleMoveFailure, options.onRecenter, currentRoomIdRef, roomsRef, preloadedCoordsRef, pushPendingMove, preMoveRef, contextTriggerRender]);


    return {
        ...context
    };
};
