import { CustomButton } from '../../types';
const XBOX_ICONS = {
    RANGER: '/assets/Icons/Xbox/RangerIcon.png',
    CLERIC: '/assets/Icons/Xbox/ClericIcon.png',
    THIEF: '/assets/Icons/Xbox/ThiefIcon.png',
    WARRIOR: '/assets/Icons/Xbox/WarriorIcon.png',
    DOOR: '/assets/Icons/Xbox/door.png',
    Y: '/assets/Icons/Xbox/Y.png',
    B: '/assets/Icons/Xbox/B.png',
    X: '/assets/Icons/Xbox/X.png',
    A: '/assets/Icons/Xbox/A.png',
};

export const TACTICAL_BUTTONS: CustomButton[] = [
    {
        id: "tactical-ranger",
        label: "Ranger",
        command: "bandage",
        setId: "Tactical",
        actionType: "command",
        display: "floating",
        hideIfUnknown: true,
        style: {
            x: 84,
            y: 64,
            w: 50,
            h: 50,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "#22c55e",
            borderWidth: 2.5,
            transparent: true,
            curvedText: true,
            shape: "circle",
            iconScale: 1.6
        },
        longActionType: "menu",
        longCommand: "rangerskilllist",
        swipeCommands: {
            up: "ride",
            down: "lead"
        },
        swipeActionTypes: {
            up: "command",
            down: "command"
        },
        longSwipeActionTypes: {
            up: "select-assign", down: "select-assign", left: "select-assign", right: "select-assign",
            ne: "select-assign", nw: "select-assign", se: "select-assign", sw: "select-assign"
        },
        longSwipeCommands: {
            up: "rangerskilllist", down: "rangerskilllist", left: "rangerskilllist", right: "rangerskilllist",
            ne: "rangerskilllist", nw: "rangerskilllist", se: "rangerskilllist", sw: "rangerskilllist"
        },
        menuDisplay: "dial",
        isVisible: true,
        icon: XBOX_ICONS.RANGER,
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    },
    {
        id: "tactical-cleric",
        label: "Cleric",
        command: "cast 'cure light'",
        setId: "Tactical",
        actionType: "command",
        display: "floating",
        hideIfUnknown: true,
        isVisible: true,
        style: {
            x: 74,
            y: 74,
            w: 50,
            h: 50,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "#fbbf24",
            borderWidth: 2.5,
            transparent: true,
            curvedText: true,
            shape: "circle",
            iconScale: 1.6
        },
        longActionType: "menu",
        longCommand: "clericspelllist",
        longSwipeActionTypes: {
            up: "select-assign", down: "select-assign", left: "select-assign", right: "select-assign",
            ne: "select-assign", nw: "select-assign", se: "select-assign", sw: "select-assign"
        },
        longSwipeCommands: {
            up: "clericspelllist", down: "clericspelllist", left: "clericspelllist", right: "clericspelllist",
            ne: "clericspelllist", nw: "clericspelllist", se: "clericspelllist", sw: "clericspelllist"
        },
        icon: XBOX_ICONS.CLERIC,
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    },
    {
        id: "tactical-thief",
        label: "Thief",
        command: "hide",
        setId: "Tactical",
        actionType: "command",
        display: "floating",
        hideIfUnknown: true,
        isVisible: true,
        style: {
            x: 94,
            y: 84,
            w: 50,
            h: 50,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "#94a3b8",
            borderWidth: 2.5,
            transparent: true,
            curvedText: true,
            shape: "circle",
            iconScale: 1.6
        },
        longActionType: "menu",
        longCommand: "thiefskilllist",
        swipeCommands: {
            up: "shoot",
            down: "recover"
        },
        swipeActionTypes: {
            up: "command",
            down: "command"
        },
        longSwipeActionTypes: {
            up: "select-assign", down: "select-assign", left: "select-assign", right: "select-assign",
            ne: "select-assign", nw: "select-assign", se: "select-assign", sw: "select-assign"
        },
        longSwipeCommands: {
            up: "thiefskilllist", down: "thiefskilllist", left: "thiefskilllist", right: "thiefskilllist",
            ne: "thiefskilllist", nw: "thiefskilllist", se: "thiefskilllist", sw: "thiefskilllist"
        },
        icon: XBOX_ICONS.THIEF,
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    },
    {
        id: "tactical-warrior",
        label: "Warrior",
        command: "hit",
        setId: "Tactical",
        actionType: "command",
        display: "floating",
        hideIfUnknown: false,
        isVisible: true,
        style: {
            x: 84,
            y: 74,
            w: 50,
            h: 50,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "#ef4444",
            borderWidth: 2.5,
            transparent: true,
            curvedText: true,
            shape: "circle",
            iconScale: 1.6
        },
        longActionType: "menu",
        longCommand: "warriorskilllist",
        swipeCommands: {
            up: "flee",
            down: "stat"
        },
        swipeActionTypes: {
            up: "command",
            down: "command"
        },
        longSwipeActionTypes: {
            up: "select-assign", down: "select-assign", left: "select-assign", right: "select-assign",
            ne: "select-assign", nw: "select-assign", se: "select-assign", sw: "select-assign"
        },
        longSwipeCommands: {
            up: "warriorskilllist", down: "warriorskilllist", left: "warriorskilllist", right: "warriorskilllist",
            ne: "warriorskilllist", nw: "warriorskilllist", se: "warriorskilllist", sw: "warriorskilllist"
        },
        icon: XBOX_ICONS.WARRIOR,
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    },
    {
        id: "tactical-mage",
        label: "Mage",
        command: "cast 'magic missile'",
        setId: "Tactical",
        actionType: "command",
        display: "floating",
        hideIfUnknown: true,
        isVisible: true,
        style: {
            x: 84,
            y: 84,
            w: 50,
            h: 50,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "#3b82f6",
            borderWidth: 2.5,
            transparent: true,
            curvedText: true,
            shape: "circle",
            iconScale: 1.4
        },
        icon: XBOX_ICONS.Y,
        longActionType: "menu",
        longCommand: "magespelllist",
        longSwipeActionTypes: {
            up: "select-assign", down: "select-assign", left: "select-assign", right: "select-assign",
            ne: "select-assign", nw: "select-assign", se: "select-assign", sw: "select-assign"
        },
        longSwipeCommands: {
            up: "magespelllist", down: "magespelllist", left: "magespelllist", right: "magespelllist",
            ne: "magespelllist", nw: "magespelllist", se: "magespelllist", sw: "magespelllist"
        },
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    },
    {
        id: "tactical-doors",
        label: "Doors",
        command: "doors",
        setId: "Tactical",
        actionType: "menu",
        display: "floating",
        hideIfUnknown: false,
        isVisible: true,
        style: {
            x: 64,
            y: 64,
            w: 50,
            h: 50,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderColor: "#06b6d4",
            borderWidth: 2.5,
            transparent: true,
            curvedText: true,
            shape: "circle",
            iconScale: 1.4
        },
        icon: XBOX_ICONS.DOOR,
        longActionType: "select-assign",
        longCommand: "doors",
        longSwipeActionTypes: {
            up: "select-assign", down: "select-assign", left: "select-assign", right: "select-assign",
            ne: "select-assign", nw: "select-assign", se: "select-assign", sw: "select-assign"
        },
        longSwipeCommands: {
            up: "doors", down: "doors", left: "doors", right: "doors",
            ne: "doors", nw: "doors", se: "doors", sw: "doors"
        },
        trigger: { enabled: false, pattern: "", isRegex: false, autoHide: false, duration: 0, type: "show" }
    }
];
