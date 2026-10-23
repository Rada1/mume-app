import { createButton } from '../../utils/buttonFactory';

/**
 * @file doors.ts
 * @description Door manipulation buttons.
 */

const createDoorButton = (id: string, label: string, command: string) => 
    createButton({
        id: `door-${id}`,
        label,
        command,
        setId: 'doors',
        color: '#78350f',
        shape: 'circle',
        width: 50,
        height: 50
    });

const createExitButton = (id: string, label: string, command: string) =>
    createButton({
        id,
        label,
        command,
        setId: 'trait-exit',
        color: '#78350f',
        shape: 'circle',
        width: 50,
        height: 50
    });

export const DOOR_BUTTONS = [
    createDoorButton('open', 'Open', 'open %n|exit'),
    createDoorButton('close', 'Close', 'close %n|exit'),
    createDoorButton('lock', 'Lock', 'lock %n|exit'),
    createDoorButton('unlock', 'Unlock', 'unlock %n|exit'),
    createDoorButton('knock', 'Knock', 'knock %n|exit')
];

export const EXIT_BUTTONS = [
    createExitButton('door-scout', 'Scout', 'scout %n|exit'),
    createExitButton('exit-point', 'Point', 'point %n')
];








