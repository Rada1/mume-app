import { CustomButton, SwipeDirection } from '../../types';

const ASSIGN_LONG_SWIPE_ACTIONS = Object.fromEntries(
    (['up', 'down', 'left', 'right', 'ne', 'nw', 'se', 'sw'] as SwipeDirection[]).map(dir => [dir, 'assign'])
) as Record<SwipeDirection, 'assign'>;

const withAssignLongActions = (button: CustomButton): CustomButton => ({
    ...button,
    longCommand: button.command,
    longActionType: 'assign',
    longSwipeCommands: {
        up: button.command,
        down: button.command,
        left: button.command,
        right: button.command,
        ne: button.command,
        nw: button.command,
        se: button.command,
        sw: button.command
    },
    longSwipeActionTypes: ASSIGN_LONG_SWIPE_ACTIONS
});

const DOOR_SWIPE_COMMANDS: CustomButton['swipeCommands'] = {
    up: 'open',
    down: 'close',
    left: 'lock',
    right: 'unlock',
    sw: 'knock',
    se: 'reveal quick'
};

export const TACTICAL_BUTTONS: CustomButton[] = [
    {
        id: "tactical-charmie",
        label: "Ch",
        command: "order followers",
        setId: "Tactical",
        actionType: "modifier",
        display: "floating",
        hideIfUnknown: true,
        requirement: { ability: "Charm", minProficiency: 1, characterClass: ["Mage"] },
        style: { x: -95, y: 0, w: 34, h: 34, backgroundColor: "rgba(48, 45, 52, 0.94)", borderColor: "rgba(255, 255, 255, 0.18)", borderRadius: 999, fontSize: 10, shape: "circle", iconScale: 1 },
        position: { x: -95, y: 0, w: 34, h: 34 },
        isVisible: true,
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    },
    withAssignLongActions({
        id: "tactical-ranger",
        label: "Ranger",
        command: "rangerskilllist",
        setId: "tactical",
        actionType: "menu",
        display: "floating",
        hideIfUnknown: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: "rgba(21, 128, 61, 0.8)", borderColor: "#22c55e", borderRadius: 8, fontSize: 13, shape: "pill", iconScale: 1.2 },
        position: { x: 0, y: 0, w: 90, h: 40 },
        isVisible: true,
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    }),
    withAssignLongActions({
        id: "tactical-cleric",
        label: "Cleric",
        command: "clericspelllist",
        setId: "tactical",
        actionType: "menu",
        display: "floating",
        hideIfUnknown: true,
        isVisible: true,
        style: { x: 95, y: 0, w: 90, h: 40, backgroundColor: "rgba(217, 119, 6, 0.8)", borderColor: "#fbbf24", borderRadius: 8, fontSize: 13, shape: "pill", iconScale: 1.2 },
        position: { x: 95, y: 0, w: 90, h: 40 },
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    }),
    withAssignLongActions({
        id: "tactical-thief",
        label: "Thief",
        command: "thiefskilllist",
        setId: "tactical",
        actionType: "menu",
        display: "floating",
        hideIfUnknown: true,
        style: { x: 190, y: 0, w: 90, h: 40, backgroundColor: "rgba(71, 85, 105, 0.8)", borderColor: "#94a3b8", borderRadius: 8, fontSize: 13, shape: "pill", iconScale: 1.2 },
        position: { x: 190, y: 0, w: 90, h: 40 },
        isVisible: true,
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    }),
    withAssignLongActions({
        id: "tactical-warrior",
        label: "Warrior",
        command: "warriorskilllist",
        setId: "tactical",
        actionType: "menu",
        display: "floating",
        hideIfUnknown: false,
        isVisible: true,
        style: { x: 285, y: 0, w: 90, h: 40, backgroundColor: "rgba(185, 28, 28, 0.8)", borderColor: "#ef4444", borderRadius: 8, fontSize: 13, shape: "pill", iconScale: 1.2 },
        position: { x: 285, y: 0, w: 90, h: 40 },
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    }),
    withAssignLongActions({
        id: "tactical-mage",
        label: "Mage",
        command: "magespelllist",
        setId: "tactical",
        actionType: "menu",
        display: "floating",
        hideIfUnknown: true,
        isVisible: true,
        style: { x: 380, y: 0, w: 90, h: 40, backgroundColor: "rgba(30, 64, 175, 0.8)", borderColor: "#3b82f6", borderRadius: 8, fontSize: 13, shape: "pill", iconScale: 1.2 },
        position: { x: 380, y: 0, w: 90, h: 40 },
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    }),
    withAssignLongActions({
        id: "tactical-doors",
        label: "Scout",
        command: "doors",
        setId: "tactical",
        actionType: "menu",
        display: "floating",
        hideIfUnknown: false,
        isVisible: true,
        style: { x: 475, y: 0, w: 90, h: 40, backgroundColor: "rgba(8, 145, 178, 0.8)", borderColor: "#06b6d4", borderRadius: 8, fontSize: 13, shape: "pill", iconScale: 1.2 },
        position: { x: 475, y: 0, w: 90, h: 40 },
        swipeCommands: DOOR_SWIPE_COMMANDS,
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    })
];
