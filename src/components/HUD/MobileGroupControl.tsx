/** @file MobileGroupControl.tsx — Group status and quick group commands in the mobile state row. */
import { createPortal } from 'react-dom';
import { useMobileGroupControl } from '../../hooks/useMobileGroupControl';
import { groupMemberCommandTarget } from '../../hooks/useRoomEntitiesPanel';
import { getGroupMemberName, getGroupMemberHits, getGroupMemberMana, getGroupMemberMoves, getGroupMemberState } from '../../utils/groupMemberStatus';
import './MobileStateControls.css';

// --- Render Section ---
export function MobileGroupControl({ dock = false }: { dock?: boolean }) {
    const control = useMobileGroupControl();
    const { members, otherEntities, colorFor } = control.entities;
    return <div className={dock ? 'command-tree-quick-state' : 'this-is-you-pill-wrapper'}>
        <button ref={control.anchor} type="button" className={dock ? 'group-state-button' : `this-is-you-pill${control.open ? ' is-active' : ''}`}
            disabled={control.disabled} aria-expanded={control.open} aria-haspopup="true"
            onPointerEnter={control.hoverEnter} onPointerLeave={control.hoverLeave}
            onPointerDown={control.pointerDown} onPointerMove={control.pointerMove}
            onPointerUp={() => control.pointerEnd(false)} onPointerCancel={() => control.pointerEnd(true)}
            onLostPointerCapture={() => control.pointerEnd(true)} onClick={control.click}>
            {dock ? <>Group<small>{members.length} {members.length === 1 ? 'member' : 'members'}</small></> : <>
                <span className="this-is-you-pill-category">Group:</span>
                <strong className="this-is-you-pill-value">{members.length} {members.length === 1 ? 'member' : 'members'}</strong>
            </>}
        </button>
        {control.open && createPortal(<div ref={control.menu} className="mobile-group-popover" style={control.position} aria-label="Group targets" onPointerEnter={control.hoverEnter} onPointerLeave={control.hoverLeave}>
            <div className="mobile-group-section" role="group" aria-label="In your group">
            <div className="mobile-group-heading">In your group</div>
            {members.map((member, index) => {
                const name = getGroupMemberName(member);
                const target = groupMemberCommandTarget(member, control.entities.entries);
                return <button type="button" key={String(member.id || `${name}-${index}`)} data-group-target={target}
                    className={`mobile-group-target mobile-group-member${control.heldTarget === target ? ' is-held' : ''}`} onClick={() => control.select(target)}>
                    <span className="mobile-group-member-name">{name}</span>
                    <small><span className="group-member-vital"><span>HP </span><strong>{getGroupMemberHits(member) || '—'}</strong></span><span className="group-member-vital"><span>Mana </span><strong>{getGroupMemberMana(member) || '—'}</strong></span><span className="group-member-vital"><span>Moves </span><strong>{getGroupMemberMoves(member) || '—'}</strong></span>
                    <span className="group-member-position">{getGroupMemberState(member) || '—'}</span><span className="group-member-location">{member.room || '—'}</span></small>
                </button>;
            })}
            {!members.length && <div className="mobile-group-empty">No group members.</div>}
            </div>
            <div className="mobile-group-section" role="group" aria-label="Others in the room">
            <div className="mobile-group-heading">Others in the room</div>
            {otherEntities.map(entry => <button type="button" key={entry.id} data-group-target={entry.context}
                className={`mobile-group-target${control.heldTarget === entry.context ? ' is-held' : ''}`} onClick={() => control.select(entry.context)}>
                <span style={{ color: colorFor(entry.category) }}>{entry.label}</span>
            </button>)}
            {!otherEntities.length && <div className="mobile-group-empty">No other players or NPCs in the room.</div>}
            </div>
        </div>, document.body)}
    </div>;
}
