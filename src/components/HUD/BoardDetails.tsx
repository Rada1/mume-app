/** @file BoardDetails.tsx — Expand board entries in the Details panel. */
import React, { useEffect, useState } from 'react';
import { stripHtml } from '../../utils/lookTextUtils';
import { useArchiveStore } from '../../stores/useArchiveStore';
import type { ExecuteCommand } from '../../types';
import './BoardDetails.css';
import { parseMailList } from '../../utils/mailParser';
import { BoardReplyEditor } from './BoardReplyEditor';

// --- Board entries ---
export const BoardDetails = ({lines, loading, label, executeCommand, mail = false}: {
 lines?: string[]; loading?: boolean; label?: string; executeCommand: ExecuteCommand; mail?: boolean;
}) => {
 const [boardLines, setBoardLines] = useState<string[]>([]);
 const [selected, setSelected] = useState<number | null>(null);
 const listLabel = mail ? 'Mail' : 'Board';
 const view = useArchiveStore(state => state.activeView);
 const source = mail ? 'mail' : 'board';
 const detail = useArchiveStore(state => state.activeDetail);
 useEffect(() => { if (label === listLabel && lines) { setBoardLines(lines); setSelected(null); } }, [label, lines, listLabel]);
 const entries = label === listLabel && lines ? lines : boardLines;
 if (!entries.length && label !== listLabel) return <div className="board-details-message">{loading ? 'Loading…' : (lines || []).map(stripHtml).join('\n')}</div>;
 return <div className="board-details"><div className="board-details-title">{listLabel}</div>
  {entries.map((line, index) => {
   const text = stripHtml(line).trim();
   const mailEntry = mail ? parseMailList([{id:String(index), text, html:''}], view === 'mail-sent' ? 'sent' : 'inbox')[0] : undefined;
   const match = mailEntry ? [text, String(mailEntry.id), `${mailEntry.subject}${mailEntry.author ? ` (${mailEntry.author})` : ''}`] : text.match(/^\s*(?:-\s*)?(\d+)(?:#:|\s+:)\s*(.*)$/);
   if (!match) return <div key={index} className="board-details-heading">{text}</div>;
   const id = Number(match[1]);
   return <div key={`${id}:${index}`}><button type="button" className="board-details-entry" aria-expanded={selected === id} onClick={() => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    useArchiveStore.getState().setActiveDetail({id, source, view, subject:match[2], author:'', date:'', body:''});
    executeCommand(`read ${mail && view === 'mail-sent' ? 'sent ' : ''}${id}`, true, true, false, true, {shouldFocus:false, fromUi:true});
   }}><span>{id}</span> {match[2]}</button>
   {selected === id && <div className="board-details-expanded"><pre className="board-details-message">{loading ? 'Loading…' : detail?.id === id ? detail.body || (lines || []).map(stripHtml).join('\n') : ''}</pre>
    {!loading && view !== 'mail-sent' && <button type="button" className="board-details-reply" onClick={() => {
     useArchiveStore.getState().setPendingEditorContext({kind:'archive-reply', source, view, entryId:id, subject:match[2], author:''});
     executeCommand(`reply ${id}`, false, false, false, false, {shouldFocus:false, fromUi:true});
    }}>Reply</button>}
    <BoardReplyEditor entryId={id} source={source}/></div>}</div>;
  })}
 </div>;
};
