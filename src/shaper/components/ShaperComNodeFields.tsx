/**
 * @file ShaperComNodeFields.tsx
 * @description Command-specific editable fields for Shaper /com nodes.
 */

import type { ShaperCommandNode } from '../model/shaperTypes';

interface ShaperComNodeFieldsProps {
    node: ShaperCommandNode;
    onUpdateFields: (nodeId: string, patch: Partial<ShaperCommandNode['fields']>) => void;
}

const valueOf = (node: ShaperCommandNode, key: string): string => String(node.fields[key] ?? '');
const actions = ['open', 'close', 'lock'];
const directions = ['n', 'e', 's', 'w', 'u', 'd'];

// --- Component Section ---
export const ShaperComNodeFields: React.FC<ShaperComNodeFieldsProps> = ({ node, onUpdateFields }) => {
    const update = (key: string, value: string) => onUpdateFields(node.id, { [key]: value || null });

    if (node.type === 'mobile') {
        return (
            <div className="shaper-com-fields">
                <label>Max zone players<input value={valueOf(node, 'maxZonePlayers')} onChange={event => update('maxZonePlayers', event.target.value)} placeholder="optional" /></label>
                <label>Position
                    <select value={valueOf(node, 'position')} onChange={event => update('position', event.target.value)}>
                        <option value="">default</option>
                        <option value="sleep">sleep</option>
                        <option value="rest">rest</option>
                        <option value="sit">sit</option>
                        <option value="stand">stand</option>
                    </select>
                </label>
            </div>
        );
    }

    if (node.type === 'follow') {
        return (
            <div className="shaper-com-fields">
                <label>Master mob<input value={valueOf(node, 'master')} onChange={event => update('master', event.target.value)} placeholder="parent or vnum" /></label>
                <label>Mode
                    <select value={valueOf(node, 'followMode')} onChange={event => update('followMode', event.target.value)}>
                        <option value="">follower</option>
                        <option value="ridden">ridden</option>
                        <option value="ride-with">ride-with</option>
                    </select>
                </label>
            </div>
        );
    }

    if (node.type === 'give') {
        return <div className="shaper-com-fields"><label>To mob<input value={valueOf(node, 'target')} onChange={event => update('target', event.target.value)} placeholder="parent or mob vnum" /></label></div>;
    }

    if (node.type === 'equip') {
        return (
            <div className="shaper-com-fields">
                <label>To mob<input value={valueOf(node, 'target')} onChange={event => update('target', event.target.value)} placeholder="parent or mob vnum" /></label>
                <label>Position<input value={valueOf(node, 'position')} onChange={event => update('position', event.target.value)} placeholder="wield, body, head..." /></label>
            </div>
        );
    }

    if (node.type === 'put') {
        return (
            <div className="shaper-com-fields">
                <label>Container<input value={valueOf(node, 'container')} onChange={event => update('container', event.target.value)} placeholder="parent or object vnum" /></label>
                <label>Need object<input value={valueOf(node, 'needObject')} onChange={event => update('needObject', event.target.value)} placeholder="optional legacy flag" /></label>
            </div>
        );
    }

    if (node.type === 'door') {
        return (
            <div className="shaper-com-fields">
                <label>Direction
                    <select value={valueOf(node, 'direction') || 'n'} onChange={event => update('direction', event.target.value)}>
                        {directions.map(direction => <option key={direction} value={direction}>{direction}</option>)}
                    </select>
                </label>
                <label>Action
                    <select value={valueOf(node, 'doorAction') || 'close'} onChange={event => update('doorAction', event.target.value)}>
                        {actions.map(action => <option key={action} value={action}>{action}</option>)}
                    </select>
                </label>
                <label>Min difficulty<input value={valueOf(node, 'minDifficulty')} onChange={event => update('minDifficulty', event.target.value)} placeholder="lock only" /></label>
                <label>Max difficulty<input value={valueOf(node, 'maxDifficulty')} onChange={event => update('maxDifficulty', event.target.value)} placeholder="lock only" /></label>
            </div>
        );
    }

    if (node.type === 'container') {
        return (
            <div className="shaper-com-fields">
                <label>Container object<input value={valueOf(node, 'container')} onChange={event => update('container', event.target.value)} placeholder="parent or object vnum" /></label>
                <label>Action
                    <select value={valueOf(node, 'containerAction') || 'close'} onChange={event => update('containerAction', event.target.value)}>
                        {actions.map(action => <option key={action} value={action}>{action}</option>)}
                    </select>
                </label>
            </div>
        );
    }

    if (node.type === 'find') {
        return (
            <div className="shaper-com-fields">
                <label>Find type
                    <select value={valueOf(node, 'findKind') || 'object'} onChange={event => update('findKind', event.target.value)}>
                        <option value="object">object</option>
                        <option value="mobile">mobile</option>
                    </select>
                </label>
                <label>Visibility
                    <select value={valueOf(node, 'visibility')} onChange={event => update('visibility', event.target.value)}>
                        <option value="">any</option>
                        <option value="hidden">hidden</option>
                        <option value="not-hidden">not-hidden</option>
                    </select>
                </label>
            </div>
        );
    }

    if (node.type === 'repeat') {
        return (
            <div className="shaper-com-fields">
                <label>Min count<input value={valueOf(node, 'minCount')} onChange={event => update('minCount', event.target.value)} placeholder="1" /></label>
                <label>Max count<input value={valueOf(node, 'maxCount')} onChange={event => update('maxCount', event.target.value)} placeholder="optional" /></label>
            </div>
        );
    }

    if (node.type === 'eqclass') {
        return <div className="shaper-com-fields"><label>Eqclass<input value={valueOf(node, 'eqclass')} onChange={event => update('eqclass', event.target.value)} placeholder="class name or id" /></label></div>;
    }

    if (node.type === 'exec') {
        return (
            <div className="shaper-com-fields">
                <label>Character<input value={valueOf(node, 'character')} onChange={event => update('character', event.target.value)} placeholder="parent or mobile vnum" /></label>
                <label>Command<input value={valueOf(node, 'command')} onChange={event => update('command', event.target.value)} placeholder="command to run" /></label>
            </div>
        );
    }

    if (node.type === 'liquid') {
        return (
            <div className="shaper-com-fields">
                <label>Liquid<input value={valueOf(node, 'liquid')} onChange={event => update('liquid', event.target.value)} placeholder="water, ale..." /></label>
                <label>Amount<input value={valueOf(node, 'amount')} onChange={event => update('amount', event.target.value)} placeholder="optional" /></label>
            </div>
        );
    }

    if (node.type === 'money') {
        return (
            <div className="shaper-com-fields">
                <label>Amount<input value={valueOf(node, 'amount')} onChange={event => update('amount', event.target.value)} placeholder="1" /></label>
                <label>Currency<input value={valueOf(node, 'currency')} onChange={event => update('currency', event.target.value)} placeholder="optional" /></label>
            </div>
        );
    }

    if (node.type === 'months') {
        return <div className="shaper-com-fields"><label>Months<input value={valueOf(node, 'months')} onChange={event => update('months', event.target.value)} placeholder="e.g. 1 2 3" /></label></div>;
    }

    return null;
};
