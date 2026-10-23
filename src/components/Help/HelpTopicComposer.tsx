/** @file HelpTopicComposer.tsx — Chat-style bottom composer with a fixed help command. */
import React from 'react';
import { Send } from 'lucide-react';
import type { useHelpTopicComposer } from '../../hooks/useHelpTopicComposer';
import '../Messages/ChatTranscriptWindow.css';
import './HelpTopicComposer.css';

// --- Render Section ---
export const HelpTopicComposer = ({ composer }: { composer: ReturnType<typeof useHelpTopicComposer> }) => (
    <form className="chat-communication-bar help-topic-composer" onSubmit={composer.submit} aria-label="Search game help">
        <span className="docked-prompt-symbol" aria-hidden="true">&gt;</span>
        <span className="help-topic-command" aria-label="Command: help">help</span>
        <input className="chat-communication-input" value={composer.input}
            onChange={event => composer.setInput(event.target.value)} placeholder="Help topic…" aria-label="Help topic" />
        <button type="submit" className="chat-communication-send" disabled={!composer.input.trim()}
            aria-label="Send help command" title="Send help command"><Send size={14} /></button>
    </form>
);
