// @vitest-environment jsdom
/** @file RoomInfoCard.test.tsx — Notes on visited and imported rooms, including persistence. */
import React, { useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapperRoom, MapperMarker } from './mapperTypes';
import { RoomInfoCard } from './RoomInfoCard';
import { useMapPersistence } from './hooks/useMapPersistence';

// --- Exercise the real mapper persistence with otherwise unvisited imported rooms ---
const imported: Record<string, unknown[]> = {
    '1': [10, 20, 0, 'forest', { east: 2 }, 'Old Forest', 101, [], [], 'Forest', 0, 1, 2, true, true, 'Imported quest note', '', 'Old trees stand here.'],
    '2': [11, 20, 0, 'field', {}, 'Meadow', 102, [], [], 'Forest', 0, 1, 2, true, true, '', '', 'Open grassland.']
};
const emptyMarkers: Record<string, MapperMarker> = {};
const emptySet = new Set<string>();
const noop = () => undefined;

const Harness = ({ roomId, onKeyDown = noop }: { roomId: string; onKeyDown?: () => void }) => {
    const [rooms, setRooms] = useState<Record<string, MapperRoom>>({});
    const cardRef = useRef<HTMLDivElement>(null);
    const currentRoomIdRef = useRef<string | null>(null);
    const preloadedCoordsRef = useRef(imported);
    useMapPersistence({
        characterName: 'room-notes-test', rooms, setRooms, markers: emptyMarkers, setMarkers: noop,
        exploredVnums: emptySet, setExploredVnums: noop, exploredMarkers: emptySet, setExploredMarkers: noop,
        currentRoomId: null, setCurrentRoomId: noop, currentRoomIdRef, allowPersistence: true, unveilMap: false
    });
    return <div onKeyDown={onKeyDown}><RoomInfoCard roomId={roomId} rooms={rooms} setRooms={setRooms}
        mode="play" onClose={noop} cardRef={cardRef} preloadedCoordsRef={preloadedCoordsRef} isDarkMode /></div>;
};

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('room info notes in play mode', () => {
    it('always shows an editable notes field and keeps notes isolated when selecting another room', () => {
        const { rerender } = render(<Harness roomId="m_2" />);
        const notes = screen.getByRole('textbox', { name: 'Notes' });
        expect((notes as HTMLTextAreaElement).value).toBe('');
        fireEvent.change(notes, { target: { value: 'Meet here\nBring a lantern.' } });
        rerender(<Harness roomId="m_1" />);
        expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('Imported quest note');
        rerender(<Harness roomId="m_2" />);
        expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('Meet here\nBring a lantern.');
    });

    it('edits an imported note and restores the saved edit after reopening', () => {
        const { unmount } = render(<Harness roomId="m_1" />);
        fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Quest completed' } });
        act(() => vi.advanceTimersByTime(2100));
        const saved = JSON.parse(localStorage.getItem('mume_mapper_data_room-notes-test') || '{}') as Record<string, MapperRoom>;
        expect(saved.m_1).toMatchObject({ notes: 'Quest completed', notesEdited: true, name: 'Old Forest', x: 10, y: 20 });
        expect(saved.m_1.exits.e.target).toBe('m_2');
        unmount();
        render(<Harness roomId="m_1" />);
        expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('Quest completed');
    });

    it('keeps a cleared imported note empty after persistence and reopening', () => {
        const { unmount } = render(<Harness roomId="m_1" />);
        fireEvent.change(screen.getByLabelText('Notes'), { target: { value: '' } });
        expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('');
        act(() => vi.advanceTimersByTime(2100));
        unmount();
        render(<Harness roomId="m_1" />);
        expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('');
    });

    it('does not pass typing in notes to map keyboard shortcuts', () => {
        const keyHandler = vi.fn();
        render(<Harness roomId="m_1" onKeyDown={keyHandler} />);
        fireEvent.keyDown(screen.getByLabelText('Notes'), { key: 'w' });
        expect(keyHandler).not.toHaveBeenCalled();
    });
});
