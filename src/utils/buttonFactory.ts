import { CustomButton, ActionType } from '../types';

/**
 * @file buttonFactory.ts
 * @description Helper functions to create CustomButton objects with sensible defaults.
 */

export interface ButtonOptions {
    id: string;
    label: string;
    command: string;
    setId: string;
    color?: string;
    actionType?: ActionType;
    width?: number;
    height?: number;
    shape?: 'pill' | 'rect' | 'circle';
    x?: number;
    y?: number;
    isVisible?: boolean;
    trigger?: any;
}

/**
 * Creates a standard floating button with default styles and triggers disabled.
 */
export const createButton = (options: ButtonOptions): CustomButton => {
    const {
        id,
        label,
        command,
        setId,
        color = '#3b82f6',
        actionType = 'command',
        width = 90,
        height = 40,
        shape = 'pill',
        x = 0,
        y = 0,
        isVisible = true,
        trigger = {
            enabled: false,
            pattern: '',
            isRegex: false,
            autoHide: false,
            duration: 0
        }
    } = options;

    return {
        id,
        label,
        command,
        setId,
        actionType,
        display: 'floating',
        isVisible,
        style: {
            x,
            y,
            w: width,
            h: height,
            backgroundColor: color,
            shape
        },
        position: {
            x,
            y,
            w: width,
            h: height
        },
        trigger
    };
};

/**
 * Specialized factory for social buttons.
 */
export const createSocialButton = (id: string, label: string, hasTarget: boolean = true): CustomButton => {
    return createButton({
        id: `soc-${id}`,
        label,
        command: `${id}${hasTarget ? ' %n' : ''}`,
        setId: 'social list',
        color: '#06b6d4'
    });
};
