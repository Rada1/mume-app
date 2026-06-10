# MUME /lib Library Commands Reference

This guide contains the lists of installed Mudlle behavioral libraries for rooms, mobiles, and objects, retrieved directly from the live game server.

## /lib commands room long

```text
Name                 Description
-------------------------------------------------------------------------------
alignment            Set the alignment of a room.
block                makes mobs in the room block an exit
caradhras            For usage on Redhorn Pass
city-defense         makes room a city defense central (tm)
coords               set room coordinates
damage-exit          makes exits inflict damage
death-reason         set death reason for DTs
embed-gem            embeds an item with a gem.
fall                 makes people fall if they enter
fishable             allows players to fish in this room
fog                  Override the fog level in a room.
generic-key          set dressup ID (duid) on OBJ_GENERIC_KEY loaded via /com
                     in room
heavy-door           Makes a door hard to open/close
hide-exits           hide exits in a room
holdable-door        allows creating a door that can be held open
justice              Handles justice in town
legendhome-door      legendhome doors - only for V+ use
legendhome-mob       customize legendhome mobiles
mine                 allows players to mine for ore
mob-barrier          sets a mob-barrier
mobtrap-room         protects players from reconnecting in a mobtrap
move-dropped         will make dropped stuff fall into another room
no-camp              prevents people from camping or burning corpses in this
                     room
no-drink-pour        Prevents drinking/pouring of water from the room.
no-lead-mount        prevents leading mounts through exit
no-ride              makes exits unrideable
no-scout             Makes a direction impossible to scout.
no-scout-from-room   cannot scout in any direction
no-track             prevent people from tracking in a room
note                 initialize notes loaded in room
partial-reset        selectively avoid zone resets
petshop              installs a pet shop in the room
poisonroom           Poison people as they enter/leave a room
qtoken               set qname on OBJ_QTOKEN loaded via /com in room
questionnaire        disabled command
random-movement      Makes all exits random; no group splitting
redress-corpse       Replace descriptions and properties of a corpse loading in
                     this room
redress-mob          Replace descriptions of a mobile loading in this room
redress-obj          Replace descriptions of an object loading in this room
room-echo            makes a room send echo's now and then
room-water           customize message drinking in water-flagged rooms
shake-tree           makes a tree shake-able in the room
sign                 place a language-specific sign in the room
slope                make a room slope in a certain direction
special-door         Special messages and door delay.
stable               makes the room a stable
stringdata           add string data to something
temperature          Set or modify temperature on a room.
thorns               makes exits take time to open and cause damage
treasure-guard       makes mobs in the room block an item from being taken
treasure-room        protects treasure room from cheaters
underwater-entrance  entrance room to underwater
underwater-room      makes the room underwater
warrens-alarmer      special use - don't install
watch-tower          makes the room a watchtower
watched-room         makes exits from a room seeable from a watch_tower
weight-based-fall    fall to another room if too many people
```

## /lib commands mobile long

```text
Name                  Description
-------------------------------------------------------------------------------
actor                 makes a mobile "act" now and then
aggressive            Be aggressive
amnesia               forget attackers
archer                makes the mobile fight with missile weapon
assist-mode           sets a number of mobs that a mobile shall assist and/or
                      rescue
attack-mode           specifies switching and special attacks for a mobile
citizen               makes mobile a citizen
cityguard             makes mobile a cityguard
converse              answer spoken messages
diurnal               makes a mob diurnal
elven-cityguard       mob will attack and hunt evil people
flee-at-low-hps       flee when hps fall below x%
flee-on-entry         flee when players enter room
flee-when-hit         flee BEFORE being hit. Use sparingly
free-prisoners        Experimental. Allow players to free prisoners (V+
                      approval required).
group                 sets a number of mobs that a mobile shall group
hard-to-blind         multiple successful spells are required to blind this mob
homesick              Experimental /lib, do not use!
hunt                  hunt players
hunt-on-sight         make the mobile hunt on sight
hunter                make the mobile hunt its victims
justice-secretary     Act as justice secretary when in complain room
lamp-holder           mob will hold/remove lantern at nightfall/dawn
legendhome-keyholder  gives mobile legendhome keys - only for Aratar use
looter                makes this mobile try to loot things
mended-equipment      mend inventory at creation
milk                  mobile will be milkable.
nice-thief            be nice to thieves
no-bash               Makes a mobile unbashable.
no-blind              prevent people from blinding this mobile
no-flee               prevent people from making this mobile flee
no-give               do not accept gifts
no-rescue             prevents people from rescuing this mobile
no-sleep              prevent people from sleeping this mobile
nocturnal             makes a mob nocturnal
poison                afflict enemies with poison or a disease
rescue-mode           sets a number of mobs that a mobile shall rescue
scavenger             scavenge objects
scout                 makes mob yell about other races
script                You must get V+ approval to use this library
searchmob             Make a mob do a periodic search (find hidden)
sentimental           Makes a mob react to other mobs being attacked or killed.
sentinel              prevent random movement
skill                 Sets a skill on a mobile
socialise             react to socials
stay-area             stay in same area
stay-flags            stay with room flags
stay-sector           restrict sector type of a mobile
stay-zone             stay in zone
test-scout            makes mob yell about other races
thief                 makes this mobile act like a thief
troll-random          sundying trolls
walk-back             makes mobile try to stay in one room
wimpy                 for wimpy monsters
```

## /lib commands object long

```text
Name             Description
-----------------------------------------------------------------------------
colorable        makes this object colorable
custom-identify  Add custom info into identify spell output for this object
herb             makes item crushable
herblore-book    makes this item teach a herblore
inscription      Do not use! Experimental /lib
instrument       makes this obj a playable instrument
light-desc       Set dynamic description depending on light state
meat-object      Change object description according to the mob it comes from
no-shopinv       prevent from storing in shops
not-edible       prevents this object from being eaten
not-hidable      prevents this object from being hidden
poisoned-weapon  poison a weapon on creation
scalp-knife      allow people to take scalps with this object
sheath           makes object a sheath
social           Customize a social for an object
surface-prefix   customize surface display prefix
timed-object     sets the timer field of the object
```

