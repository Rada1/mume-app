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

export const DOOR_BUTTONS = [
    createDoorButton('open', 'Open', 'open %n|exit'),
    createDoorButton('close', 'Close', 'close %n|exit'),
    createDoorButton('lock', 'Lock', 'lock %n|exit'),
    createDoorButton('unlock', 'Unlock', 'unlock %n|exit'),
    createDoorButton('knock', 'Knock', 'knock %n|exit'),
    createDoorButton('scout', 'Scout', 'scout %n|exit')
];









