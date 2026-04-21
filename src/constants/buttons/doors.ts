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
    createDoorButton('open', 'Open', 'open exit %d'),
    createDoorButton('close', 'Close', 'close exit %d'),
    createDoorButton('lock', 'Lock', 'lock exit %d'),
    createDoorButton('unlock', 'Unlock', 'unlock exit %d'),
    createDoorButton('pick', 'Pick', 'pick exit %d'),
    createDoorButton('scout', 'Scout', 'scout %d')
];









