/** @file commandTreeIdentity.test.ts - Collapses legacy and generated representations of the same action. */
import {expect,it} from 'vitest';
import {createButton} from './buttonFactory';
import {commandTreeActionKey,deduplicateCommandTreeButtons} from './commandTreeIdentity';
// --- Identity Checks ---
const button=(id:string,command:string,setId='clericspelllist')=>createButton({id,label:id,command,setId});
it.each(['bless','cure light','remove poison','detect poison'])('combines spelling and cast syntax variants for %s',name=>{
 const variants=[button('saved',name),button('quoted',`cast '${name}'`),button('inline-ability-learned',`cast '${name}' %n`)];
 expect(new Set(variants.map(commandTreeActionKey)).size).toBe(1);
 expect(deduplicateCommandTreeButtons(variants)).toEqual([variants[2]]);
});
it('merges spelling aliases and command casing',()=>{
 expect(commandTreeActionKey(button('a','Armor','magespelllist'))).toBe(commandTreeActionKey(button('b',"cast 'armour'",'magespelllist')));
 expect(deduplicateCommandTreeButtons([button('a','DROP %n','inventorylist'),button('b','drop   %n','inventorylist')])).toHaveLength(1);
});
it('excludes legacy class navigation from the spell list',()=>{
 expect(deduplicateCommandTreeButtons([button('class','cleric','spellbook')])).toEqual([]);
});
it('keeps different actions and item removal distinct',()=>{
 expect(deduplicateCommandTreeButtons([button('remove','remove %n','equipmentlist'),button('poison','remove poison'),button('bash','bash %n','warriorskilllist'),button('bash-dis','bash dis %n','warriorskilllist')])).toHaveLength(4);
});

it.each(['bash','rescue','kick','assist','track'])('keeps only the target-aware version of %s',name=>{
 const bare=button('saved',name,'warriorskilllist');
 const targeted=button('targeted',`${name} %n`,'warriorskilllist');
 expect(commandTreeActionKey(bare)).toBe(commandTreeActionKey(targeted));
 expect(deduplicateCommandTreeButtons([bare,targeted])).toEqual([targeted]);
 expect(deduplicateCommandTreeButtons([bare])).toEqual([]);
});
it.each(['Ranger','Warrior','Thief','Mage','Cleric'])('excludes %s category buttons even with incorrect legacy metadata',label=>{
 const category={...button('category','open-category','trait-offense'),label};
 expect(deduplicateCommandTreeButtons([category])).toEqual([]);
});
it('keeps valid immediate commands without targets',()=>{
 const immediate=[button('flee','flee','trait-retreat'),button('look','look','cat-room')];
 expect(deduplicateCommandTreeButtons(immediate)).toEqual(immediate);
});

it.each(['tell','whisper','ask','follow'])('merges bare and legacy target placeholders for %s',verb=>{
 const source=[button('saved',verb,'communicate'),button('targeted',`${verb} %n`,'trait-communication'),{...button('legacy',`${verb} $1`,'inline-ally'),label:`${verb} $1`}];
 expect(new Set(source.map(commandTreeActionKey)).size).toBe(1);
 const rows=deduplicateCommandTreeButtons(source);
 expect(rows).toHaveLength(1);
 expect(rows[0].command).toBe(`${verb} %n`);
 expect(rows[0].label).toBe(verb[0].toUpperCase()+verb.slice(1));
 if(verb!=='follow') expect(rows[0].setId).toBe('trait-communication');
});
it('merges group messaging into Tell while preserving unfollow',()=>{
 const rows=deduplicateCommandTreeButtons([button('tell','tell','communicate'),button('group','tell group','trait-communication'),button('gtell','gtell','communicate'),button('gsay','gsay','communicate'),button('follow','follow $1','inline-ally'),button('unfollow','follow self','inline-ally')]);
 expect(rows.map(row=>row.command)).toEqual(['tell %n','follow %n','follow self']);
});
