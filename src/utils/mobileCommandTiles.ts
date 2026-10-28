/** @file mobileCommandTiles.ts — Fixed mobile command families and stable gesture slots. */
import type { CustomButton, SwipeDirection } from '../types';
import { createButton } from './buttonFactory';
import { getCommandTreeSection } from './commandTreeSections';
import { isCommandTreePracticeAction } from './commandTreePractice';
import { canCommandAcceptTarget } from './commandTargetUtils';
import { parseKeyedSpellCommand } from './magicKeyUtils';

// --- Fixed tile positions ---
export const MOBILE_COMMAND_TILES = [
 {id:'combat', label:'Combat', groups:[0], sections:['Combat action','Warrior'], preferred:'hit'},
 {id:'thief', label:'Thief', groups:[0,3], sections:['Thief'], preferred:'backstab'},
 {id:'mage', label:'Mage', groups:[0], sections:['Mage'], preferred:"cast 'magic missile'"},
 {id:'cleric', label:'Cleric', groups:[0], sections:['Cleric'], preferred:"cast 'heal'"},
 {id:'ranger', label:'Ranger', groups:[0], sections:['Ranger'], preferred:'track'},
 {id:'observe', label:'Observe', groups:[2], sections:['Observation'], preferred:'look'},
 {id:'information', label:'Information', groups:[2], sections:['Character','Game','Navigation','People','Weather'], preferred:'info'},
 {id:'consume', label:'Consume', groups:[3], sections:['Move','Use'], preferred:'eat'},
 {id:'gear', label:'Gear', groups:[3], sections:['Move'], preferred:'get'},
 {id:'mounts', label:'Mounts', groups:[1,3], sections:['Mounts','Mount equipment'], preferred:'ride'},
 {id:'social', label:'Social', groups:[4], sections:['Social actions'], preferred:'smile'},
 {id:'interact', label:'Interact', groups:[3,4], sections:['Modify','Use'], preferred:'open'}
];
export const MOBILE_TILE_DIRECTIONS: SwipeDirection[] = ['up','right','down','left','nw','ne','sw','se'];
export const isMobileCommandTargetless = (button:CustomButton): boolean => {
 if (parseKeyedSpellCommand(button.command)) return false;
 if (!button.command.trim() || /%n|\$1/.test(button.command)) return false;
 if (/^watch\s*$/i.test(button.command.trim())) return true;
 // Reports execute directly even when the older tactical UI offers optional scope choices.
 if (['Character','Game','Navigation','People','Weather'].includes(getCommandTreeSection(button))) return true;
 return !canCommandAcceptTarget(button.command);
};
export const tileContainsCommand = (tile: typeof MOBILE_COMMAND_TILES[number], button: CustomButton, section = getCommandTreeSection(button)) => {
 if (tile.id === 'combat' && /^flee(?:\s|$)/i.test(button.command.trim())) return false;
 if (isCommandTreePracticeAction(button)) return tile.id === 'information';
 const verb=button.command.trim().split(/\s+/)[0].toLowerCase();
 if (['pick','recover'].includes(verb)) return tile.id === 'thief';
 const gear=['get','take','drop','give','put','wear','remove','wield','hold','fill','empty'].includes(verb);
 const consume=['eat','drink','taste','sip','quaff','pour'].includes(verb);
 if (tile.id === 'gear') return gear && tile.sections.includes(section);
 if (tile.id === 'consume') return consume && tile.sections.includes(section);
 if (tile.id === 'interact') return !gear && !consume && tile.sections.includes(section);
 return tile.sections.includes(section);
};

// --- Initial bindings (saved once, never reflowed with live targets) ---
export const createMobileTileButton = (tile: typeof MOBILE_COMMAND_TILES[number], commands: CustomButton[]): CustomButton => {
 const center = commands.find(button => button.command === tile.preferred || button.command.startsWith(`${tile.preferred} `)) || commands[0];
 const spokes = commands.filter(button => button.id !== center?.id).slice(0,8);
 return {...createButton({id:`mobile-tile-${tile.id}`, label:tile.label, command:center?.command || '', setId:'mobile-command-tiles', shape:'rect'}),
  style:{backgroundColor:'transparent',borderWidth:0,borderRadius:0},
  swipeCommands:Object.fromEntries(spokes.map((button,index) => [MOBILE_TILE_DIRECTIONS[index],button.command])),
  swipeActionTypes:Object.fromEntries(spokes.map((button,index) => [MOBILE_TILE_DIRECTIONS[index],button.actionType || 'command']))};
};
