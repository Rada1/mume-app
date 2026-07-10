/**
 * @file shaperContextHelp.ts
 * @description Contextual excerpts from local MUME builder guides.
 */

import buildersGuide from '../../../docs/builders_guide.md?raw';
import comHelp from '../../../docs/com_help.md?raw';
import libCommandsRef from '../../../docs/lib_commands_reference.md?raw';
import libHelp from '../../../docs/lib_help.md?raw';
import roomHelp from '../../../docs/room_help.md?raw';
import type { ShaperCommandType, ShaperLibraryTargetType } from './shaperTypes';

export interface ShaperContextHelp {
    title: string;
    body: string;
}

export type ShaperContextHelpTopic =
    'room-basics' | 'room-description' | 'room-extra' | 'exit' | 'library' | `library-${ShaperLibraryTargetType}` |
    'com' | `com-${ShaperCommandType}`;

const sectionFrom = (content: string, heading: string, nextPattern: RegExp): string => {
    const start = content.toLowerCase().indexOf(heading.toLowerCase());
    if (start < 0) return '';
    const rest = content.slice(start);
    const next = rest.slice(heading.length).search(nextPattern);
    return (next >= 0 ? rest.slice(0, heading.length + next) : rest).trim();
};

const markdownHelpSection = (content: string, heading: string): string =>
    sectionFrom(content, heading, /\n##\s+/);

const builderSection = (heading: string): string =>
    sectionFrom(buildersGuide, heading, /\n\d+\.\d+\.?\s+[^\n]+\n[=]+/);

const limitLines = (text: string, maxLines = 44): string => {
    const lines = text.split('\n');
    return lines.length <= maxLines ? text : `${lines.slice(0, maxLines).join('\n')}\n...`;
};

const comTopic = (type: ShaperCommandType): ShaperContextHelp => {
    const aliases: Partial<Record<ShaperCommandType, string>> = {
        object: 'object',
        hide: 'hide',
        give: 'give',
        equip: 'equip',
        put: 'put',
        door: 'door',
        container: 'container',
        find: 'find',
        repeat: 'repeat',
        follow: 'follow',
        mobile: 'mobile'
    };
    const section = aliases[type]
        ? markdownHelpSection(comHelp, `## /help com add ${aliases[type]}`)
        : markdownHelpSection(comHelp, '## /help com add');
    return { title: `/com ${type}`, body: limitLines(section || markdownHelpSection(comHelp, '## /help com add')) };
};

export const getShaperContextHelp = (topic: ShaperContextHelpTopic): ShaperContextHelp => {
    if (topic.startsWith('com-')) return comTopic(topic.replace('com-', '') as ShaperCommandType);
    if (topic === 'com') {
        return { title: '/com reset commands', body: limitLines(markdownHelpSection(comHelp, '## /help com add')) };
    }
    if (topic === 'room-extra') {
        return { title: 'Room keywords and edescs', body: limitLines(builderSection('2.6. Extra features')) };
    }
    if (topic === 'room-description') {
        return { title: '/room desc', body: limitLines(builderSection('2.2. Room name and description'), 54) };
    }
    if (topic === 'exit') {
        const door = sectionFrom(buildersGuide, 'After you have created your door', /\n2\.4\.\s+Climb/);
        const climb = builderSection('2.4. Climb');
        return { title: 'Exits, doors, and climbs', body: limitLines([door, climb].filter(Boolean).join('\n\n'), 56) };
    }
    if (topic === 'library' || topic.startsWith('library-')) {
        const target = topic.replace('library-', '');
        const refHeading = target === 'mobile'
            ? '## /lib commands mobile long'
            : target === 'object'
                ? '## /lib commands object long'
                : '## /lib commands room long';
        return {
            title: topic === 'library' ? '/lib behavior libraries' : `/lib ${target}`,
            body: limitLines(`${markdownHelpSection(libHelp, '## /help lib')}\n\n${markdownHelpSection(libCommandsRef, refHeading)}`, 64)
        };
    }
    return {
        title: 'Room fields',
        body: limitLines(`${markdownHelpSection(roomHelp, '## /help room')}\n\n${builderSection('2.5. Room flags and sector types')}`, 58)
    };
};
