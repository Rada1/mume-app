/** @file BoardReplyEditor.tsx — Reply through the server editor beneath a board entry. */
import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';

// --- Inline editor section ---
export const BoardReplyEditor = ({entryId, source = 'board'}: {entryId:number; source?:'board'|'mail'}) => {
 const {mumeEditState, handleSaveMumeEdit, handleCancelMumeEdit} = useGame();
 const [text, setText] = useState('');
 useEffect(() => { setText(mumeEditState.text || ''); }, [mumeEditState.key, mumeEditState.text]);
 if (!mumeEditState.isOpen || mumeEditState.context?.kind !== 'archive-reply' || mumeEditState.context.source !== source || mumeEditState.context.entryId !== entryId) return null;
 return <div className="board-details-composer">
  <textarea aria-label={source === 'mail' ? 'Mail reply' : 'Board reply'} value={text} onChange={event => setText(event.target.value)}
   onKeyDown={event => {if (event.ctrlKey && event.key === 'Enter') {event.preventDefault(); handleSaveMumeEdit(text);}}}/>
  <button type="button" className="board-details-reply" onClick={() => handleSaveMumeEdit(text)}>Send reply</button>
  <button type="button" className="board-details-reply" onClick={handleCancelMumeEdit}>Cancel</button>
 </div>;
};
