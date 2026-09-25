// @vitest-environment jsdom
/**
 * @file PlayersPanel.test.tsx
 * @description Unit tests for the vertical accordion PlayersPanel.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PlayersPanel from './PlayersPanel';

const mockExecuteCommand = vi.fn();
const mockSetWhoLines = vi.fn();
const mockSetWhereLines = vi.fn();
const mockTriggerHaptic = vi.fn();
const mockSetShowPlayersPanel = vi.fn();

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        executeCommand: mockExecuteCommand,
        triggerHaptic: mockTriggerHaptic,
        viewport: { isMobile: false },
        expandedContainers: new Set(),
        containerContents: {}
    }),
    useUI: () => ({
        whoLines: [
            { id: '1', text: 'Elrond [High Elf]', isHeader: false },
            { id: '2', text: 'Glorfindel [Elf Lord]', isHeader: false },
            { id: '3', text: '2 players on.', isHeader: true }
        ],
        whereLines: [
            { id: 'w1', text: 'Players near you:', isHeader: true },
            { id: 'w2', text: 'Glorfindel - Rivendell Valley', isHeader: false }
        ],
        setWhoLines: mockSetWhoLines,
        setWhereLines: mockSetWhereLines
    }),
    useVitals: () => ({
        groupMembers: [
            { id: 'g1', name: 'Ellessar', hits: 100, maxhits: 100 }
        ]
    })
}));

vi.mock('../../stores/useSettingsStore', () => ({
    useSettingsStore: (selector: any) => selector({
        showChatWindow: false,
        setShowPlayersPanel: mockSetShowPlayersPanel
    })
}));

describe('PlayersPanel', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders the 3 categories sorted vertically: group, nearby, online', () => {
        const { container } = render(<PlayersPanel />);

        const headers = container.querySelectorAll('.players-section-header');
        expect(headers).toHaveLength(3);
        expect(headers[0].textContent).toContain('group');
        expect(headers[1].textContent).toContain('nearby');
        expect(headers[2].textContent).toContain('online');
    });

    it('defaults to all 3 sections expanded simultaneously', () => {
        const { container } = render(<PlayersPanel />);

        const sections = container.querySelectorAll('.players-accordion-section');
        expect(sections).toHaveLength(3);
        sections.forEach(section => {
            expect(section.classList.contains('is-expanded')).toBe(true);
        });

        // Group content is visible
        expect(screen.getByText('Ellessar')).toBeDefined();
        // Nearby content is visible
        expect(screen.getByText('Glorfindel - Rivendell Valley')).toBeDefined();
        // Online content is visible
        expect(screen.getByText('Elrond [High Elf]')).toBeDefined();
    });

    it('collapses and re-expands a section when clicking its header', () => {
        const { container } = render(<PlayersPanel />);

        const headers = container.querySelectorAll('.players-section-header');

        // Click group header to collapse
        fireEvent.click(headers[0]);
        const sectionsAfterCollapse = container.querySelectorAll('.players-accordion-section');
        expect(sectionsAfterCollapse[0].classList.contains('is-collapsed')).toBe(true);
        expect(sectionsAfterCollapse[1].classList.contains('is-expanded')).toBe(true);
        expect(sectionsAfterCollapse[2].classList.contains('is-expanded')).toBe(true);

        // Click again to re-expand
        fireEvent.click(headers[0]);
        const sectionsAfterReexpand = container.querySelectorAll('.players-accordion-section');
        expect(sectionsAfterReexpand[0].classList.contains('is-expanded')).toBe(true);
    });

    it('refreshes category on clicking its refresh button without collapsing the section', () => {
        const { container } = render(<PlayersPanel />);

        const refreshBtns = screen.getAllByRole('button', { name: /refresh/i });
        expect(refreshBtns.length).toBeGreaterThanOrEqual(3);

        // Click group refresh button
        fireEvent.click(refreshBtns[0]);
        expect(mockExecuteCommand).toHaveBeenCalledWith('group', true, true, false, true);

        // Group should still be expanded
        const sections = container.querySelectorAll('.players-accordion-section');
        expect(sections[0].classList.contains('is-expanded')).toBe(true);
    });

    it('persists expanded state to localStorage', () => {
        const { container } = render(<PlayersPanel />);

        const headers = container.querySelectorAll('.players-section-header');

        // Collapse 'nearby' (index 1)
        fireEvent.click(headers[1]);

        const saved = JSON.parse(localStorage.getItem('mume-players-expanded-sections') || '{}');
        expect(saved).toEqual({ group: true, nearby: false, online: true });
    });
});
