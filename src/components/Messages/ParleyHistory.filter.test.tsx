/** @file ParleyHistory.filter.test.tsx — Filter communication history by channel. */
// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Message } from '../../types';
import { useMessageStore } from '../../stores/useMessageStore';
import { ParleyHistory } from './ParleyHistory';

vi.mock('./ChatEntry', () => ({ ChatEntry: ({ message }: { message: Message }) => <div>{message.commText}</div> }));
afterEach(() => { cleanup(); vi.useRealTimers(); useMessageStore.setState({ userChat:[], spectateChat:[] }); });

// --- Channel filter ---
it('filters the history and restores all messages', () => {
    useMessageStore.setState({ userChat:[
        { id:'1', type:'comm', timestamp:1, commSender:'Elena', commText:'Hello there', replyCommand:'tell' },
        { id:'2', type:'comm', timestamp:2, commSender:'Rin', commText:'News today', replyCommand:'narrate' }
    ] as Message[] });
    render(<ParleyHistory onClose={vi.fn()} onReply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name:'tell' }));
    expect(screen.getByText('Hello there')).toBeTruthy();
    expect(screen.queryByText('News today')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name:'All communications' }));
    expect(screen.getByText('News today')).toBeTruthy();
});

it('shows incoming activity for 30 seconds without counting sent messages', () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    useMessageStore.setState({ userChat:[
        { id:'1', type:'comm', timestamp:99_000, commSender:'Elena', commText:'Hello there', replyCommand:'tell' },
        { id:'2', type:'user', timestamp:99_500, textRaw:'tell Elena hello', textOnly:'tell Elena hello' }
    ] as Message[] });
    render(<ParleyHistory onClose={vi.fn()} onReply={vi.fn()} />);
    expect(screen.getByRole('button', { name:'tell, 1 recent' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(29_000));
    expect(screen.getByRole('button', { name:'tell' })).toBeTruthy();
});
