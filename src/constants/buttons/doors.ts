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
    createDoorButton('open', 'Open', 'open exit'),
    createDoorButton('close', 'Close', 'close exit'),
    createDoorButton('lock', 'Lock', 'lock exit'),
    createDoorButton('unlock', 'Unlock', 'unlock exit'),
    createDoorButton('pick', 'Pick', 'pick exit'),
    createDoorButton('scout', 'Scout', 'scout')
];
