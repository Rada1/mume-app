# MUME Shaper Mode Room & Exit Command Help Guides

This guide contains locally stored MUME building help pages retrieved directly from the live game server.

## /help room

```text
ROOM

Description: the <cmd> will affect the room where the Ainur is.
Syntax:      /room <cmd> ...
Level : All (+Legends)
Restrictions: M

Where <cmd> ... may be one of the following:

  name [<prep>@]<room_name>       Sets the name (and preposition) of the room
  preposition <preposition>       Changes the preposition of the room
  description                     Edits the description of the room
  exit <dir> <room>               Creates a one-way exit to <roomd>
  dset <dir> <flag>               Sets the exit or door flags for <dir>
  noexit <dir>                    Removes an exit
  dig <dir> <room>                Creates a bidirectional exit to <room>
  copy <to-room>                  Copy some info of this room to <to-room>
  swap <room>                     Swap contents of this room with <room>.
                                  Includes exits, /coms etc. To undo a swap,
                                  type the _exactly_ the same command in the
                                  same place again.
  kadd <keyword> [<synonym>...]   Adds a keyword, and optional synonyms
  kdescription <keyword>          Write the descr associated to the keyword
  kname <old> <new keyws>         Change keywords for <old> keyword
  kkill <keyword>                 Removes the keyword
  dadd <dir> <name> [<key>]       Adds a door. If <key> is missing, the door
                                    has a generic key. <key> can also be
                                    "latch" or "no_keyhole" or "none".
                                    Use /com add d to set lock difficulty
  dkey <dir> <key>                Sets key for door in <dir>
  dname <dir> <name>              Sets name for door in <dir>
  dweight <dir> <weight>          Sets weight of door in <dir>
  dkill <dir>                     Removes the door in the direction <dir>
  edescription <dir>              Sets the description for the "look <dir>" cmd
  build +|- <beg> <end>           Put/remove the build flag in all the room
                                  between room number <beg> and <end>
  cliset <dir> <climb_level>      Requires climbing to use that exit
         <damage>                 <climb_level> should be 0-99, 99 hardest;
                                  <damage> is in HPs
  clirm <dir>                     Remove the climbable exit
  owner <player>                  Sets ownership of current room. If player is
                                  unspecified it resets the room owner. (V+)
  reset                           Runs the room's /coms
  save                            Saves all rooms in current zone

See also: DOOR FLAGS, ROOM FLAGS, SECTOR, DSET, ADD, COM ADD
```

## /help room name

```text
There is no help on this subject.
```

## /help room preposition

```text
There is no help on this subject.
```

## /help room description

```text
There is no help on this subject.
```

## /help room flags

```text
ROOM FLAGS

Possible flags are:

  DARK          This room is dark unless lit by a torch or other light
                source.
  DEATH         Deathtrap. Player dies, loses eq, and some tp.
  NO_MOB        Mobiles won't go here normally. See below for RANDOM_EXITS!
  INDOORS       No weather, no time of day unless SUNLIT, lit unless DARK,
                trolls don't sundie.
  NO_RIDE       This room cannot be entered on a mount.
  NO_FREEZE     To be used on water rooms only: water will not freeze.
  OPEN_ROOT     Root flag for /zone world_open. Az approval required.
  NO_MAGIC      Casting is impossible. (Not scrolls, etc). Only use if you
                are sure it belongs there. Needs Az approval. Consider muddle
                as well
  ISOLATED      Prevent teleport, portal, locate, scry, watch, summon, ...
  PRIVATE       Can't /goto if more than one person present, no effect on
                mortals
  RANDOM_EXITS  Player/mob takes a random exit; see also the NO_MOB flag
  MAP_TOGGLE    Change room's map visibility. See below.
  HIDE_MAP_ID   Hide the map ID from mappers (for mazes).
  SECURITY      Maiar without access cannot /goto here.
  PEACEFUL      No aggressive actions. Do not use for the mortal world!
  BUILD         Not opened: players can't teleport in. Works automatically.
  WATER         Water source (for drinking and filling); see /lib help
                room-water
  NO_SHOUT      Shouting impossible.
  SILENT        Shouting, talking, emoting impossible.
  SUNLIT        DARK SUNLIT rooms are lit by the sun (without sundeath). Use
                for cave entrances, rooms with windows, etc.
  TRAIL         Movement between 2 trail flagged rooms is at half cost.

To set room flags, use one of the following syntaxes. f1, f2, ... must be
replaced with the flag names.

  /room flag +f1 f2 f3...   -> Add flags to existing ones
  /room flag -f1 f2 f3...   -> Clear specified flags
  /room flag @f1 f2 f3...   -> Clear all flags, then set specified ones.

For instance: /room flag +indoors dark

Note on RANDOM_EXITS
--------------------
Rooms with RANDOM_EXITS allow mobs to enter rooms flagged with NO_MOB (where
they will get stuck). Also, mobs with the stay-zone or stay-sector /libs will
be overruled when leaving a random-room, thus creating possible mobtraps. Hence
always check your mob movement when you have a zone with random flags.

Note on Lighting Flags
----------------------
The DARK, INDOORS and SUNLIT flags interact with each other as follows:

  DARK  INDOORS  SUNLIT
  ---------------------------------------------------------------------
   N       N       N     Normal outdoors room
   N       N       Y     Meaningless, do not use
   N       Y       N     Indoors room with a permanent light source, no
                         windows
   N       Y       Y     Indoors room, permanent light source + window
   Y       N       N     Dark outdoors room (very, very dense forest)
   Y       N       Y     Outdoors, dense cover (dense forest w/indirect
                         sunlight)
   Y       Y       N     Indoors room, no light sources, no windows
   Y       Y       Y     Indoors room with windows

Note 1: A "window" can be anything that provides indirect daylight.
Note 2: The DARK and/or INDOORS flags makes a room safe for Trolls during the
day.

Note on MAP_TOGGLE
------------------
The MAP_TOGGLE room flag changes the logic for whether a room should show up on
maps or not (think map r, and /map nice).

So, if you have a room with BUILD and MAP_TOGGLE flags, it will show up on map
r, and if you have a room that doesn't have the BUILD flag and has the
MAP_TOGGLE flag, it will not show up on map r.

Examples of ways this can be used:

 0. You have a (multi-storey) house. Only one of the rooms should show up on
    the map, so you give all the other rooms the MAP_TOGGLE flag. (The "real"
    solution here is to move the room to a 100+ room, but that's a different
    story.)

 1. You have an outdoors zone that connects to a city-zone. On the scale of an
    outdoors zone, the city zone should occupy one room (2x2 miles), so you can
    create a (BUILD-flagged) "placeholder" room, set it to
    sector CITY and flag it MAP_TOGGLE.

    Add one-way exits from the placeholder room to the correct surrounding
    room. This makes roads or trails show up properly on map rooms and similar.

 2. You have an unreachable mountain peak that you want to show up on maps.
    Make such a room, BUILD and MAP_TOGGLE-flag it.

The MAP_TOGGLE flag has no effect on rooms with offset >= 100 as only rooms
0-99 are used for these maps.
```

## /help room sector

```text
ROOM SECTOR, SECTOR

Available sector types are:

  BUILDING    Doesn't do much on its own
  CITY        You may not track here
  FIELD
  FOREST
  HILLS
  MOUNTAIN
  SHALLOWS    Can be walked in
  WATER       Needs a boat/swim. Special if STREAM exit flag is used (player
              is moved)
  ROAD        Tracking possible; same mps as CITY
  RAPIDS      Swim only, boat unusable
  UNDERWATER  Not on room maps
  BRUSH
  TUNNEL      Cramped underground; not on room maps
  CAVERN      Spacious underground; not on room maps

Sector determines (mostly) the number of movement points used when moving
through the room. However, this number is influenced also by other conditions,
such as TRAIL flag and weather.

Other effects include, but are not limited to:

 * Sneak/hide bonuses; e.g., sector CITY gives a hide bonus
 * Scouting is easier in sector BUILDING (or INDOORS flag)
 * Ability to track; e.g., cannot track in CITY sector
 * C-coded weather messages
 * Some spell effects - for example:
    + quake damage (higher in some sectors),
    + ability to portal (cannot portal to cities)
 * Some mudlled effects - for example:
    + ability to burn corpses or make campfires
    + mudlled weather messages
 * Short terrain description visible when blind or in darkness or fog

Note that some room flags have functionality that supplements room sector
functionality. Most WATER, RAPIDS, UNDERWATER, SHALLOWS rooms should be flagged
WATER. Most BUILDING rooms should be flagged INDOORS.
```

## /help room exit

```text
There is no help on this subject.
```

## /help room dset

```text
DOOR FLAGS, DSET, EXIT FLAGS, ROOM DSET

Syntax:
   /room dset <dir> [-|+|@] <flag>...

The following flags exist:
  BROKEN      Bashed or broken door. Prevents /com ... door from taking
              effect.
  BUILD       The rooms beyond are not open to mortals
  CLIMB_DOWN  DO NOT USE (see /room cliset)
  CLIMB_UP    DO NOT USE (see /room cliset)
  CLOSED      Set by /com
  DOOR        Essential for all normal doors
  HIDDEN      Needs search to reveal door name
  LOCKED      Set by /com
  NOBASH      Can't be bashed down
  NOBLOCK     Unaffected by block door
  NOBREAK     Unaffected by the spell break door
  NOFLEE      Players cannot flee in this direction
  NOT_SHOWN   The exit will not be shown to mortals
  NO_MOB      Random walking mobiles won't enter
  PICKPROOF   Unaffected by pick skill
  PLURAL      Door name is in the plural
  STREAM      Moves players, needs water sector
  TRANSIENT   Can be disconnected from the world by mudlle

NOBLOCK is used on exits that are not solid or stable by themselves, such as
vegetation (brushes, twigs, branches, thornbushes) or curtains.

Any door that has a fairly limited border where edges connect is magically
blockable. (Examples: "bark", "tree", or a rock that connects to a rockface.)
Please take in account that doors have two sides. An exit is blockable when one
side of it is (e.g., twigs/trapdoor or thornbushes/tree).

NOBASH exits are generally ones too heavy to bash down (that is what the
message says). You can probably bash most other doors, and you can also bash
holes in a bush or a similar obstruction.

NOBREAK ones are typically somewhat magical. break door can scramble loose
rocks or shatter bushes.

Note that exits that use mudlle that does not play well with break, bash, or
block (such as /lib heavy_door or thorny_exit() mudlle) may have to be made
NOBREAK, NOBASH, or NOBLOCK because of the mudlle.

See also: DADD, ZONE
```

## /help room noexit

```text
There is no help on this subject.
```

## /help room dig

```text
There is no help on this subject.
```

## /help room copy

```text
There is no help on this subject.
```

## /help room swap

```text
There is no help on this subject.
```

## /help room kadd

```text
There is no help on this subject.

Perhaps you were interested in the following:
ROOM DADD
```

## /help room kdescription

```text
There is no help on this subject.
```

## /help room kname

```text
There is no help on this subject.
```

## /help room kkill

```text
There is no help on this subject.
```

## /help room dadd

```text
DADD, ROOM DADD

Lets you add a door to a direction.

/room dadd <dir> <door name> [<key>|latch|no-keyhole|none]

If <key> is missing, the door has a generic (non-existing) key. If you want a
key, you must provide its object number. Use /com add door <dir> lock ... to
set the lock's difficulty.

You can also use no-keyhole, none, or latch.

no-keyhole should be used for doors that have no key and thus cannot be picked
(such as bushes and curtains). You should not leave the key out and set a
door's flag to NOPICK if you want a door without a lock!

none should be used for pickable doors that have no key.

Latches can and should be used whenever it makes sense or is required for good
gameplay; e.g., consider latch for rooms which become locked at zoneresets and
have powerful aggressive mobs inside.

See also: ROOM, DSET, DWEIGHT, "COM ADD", "DOOR FLAGS"
```

## /help room dkey

```text
There is no help on this subject.
```

## /help room dname

```text
There is no help on this subject.
```

## /help room dweight

```text
DWEIGHT, ROOM DWEIGHT

Lets you set the door weight in a direction.

  /room dweight <dir> <weight>

If <weight> is -1 then the door is not openable.

See also: ROOM, DADD, DSET, DOOR FLAGS
```

## /help room dkill

```text
There is no help on this subject.
```

## /help room edescription

```text
There is no help on this subject.
```

## /help room build

```text
There is no help on this subject.
```

## /help room cliset

```text
There is no help on this subject.
```

## /help room clirm

```text
There is no help on this subject.

Perhaps you were interested in the following:
ROOM CLIMB
```

## /help room owner

```text
There is no help on this subject.
```

## /help room reset

```text
There is no help on this subject.
```

## /help room save

```text
There is no help on this subject.
```

## /help door flags

```text
DOOR FLAGS, DSET, EXIT FLAGS, ROOM DSET

Syntax:
   /room dset <dir> [-|+|@] <flag>...

The following flags exist:
  BROKEN      Bashed or broken door. Prevents /com ... door from taking
              effect.
  BUILD       The rooms beyond are not open to mortals
  CLIMB_DOWN  DO NOT USE (see /room cliset)
  CLIMB_UP    DO NOT USE (see /room cliset)
  CLOSED      Set by /com
  DOOR        Essential for all normal doors
  HIDDEN      Needs search to reveal door name
  LOCKED      Set by /com
  NOBASH      Can't be bashed down
  NOBLOCK     Unaffected by block door
  NOBREAK     Unaffected by the spell break door
  NOFLEE      Players cannot flee in this direction
  NOT_SHOWN   The exit will not be shown to mortals
  NO_MOB      Random walking mobiles won't enter
  PICKPROOF   Unaffected by pick skill
  PLURAL      Door name is in the plural
  STREAM      Moves players, needs water sector
  TRANSIENT   Can be disconnected from the world by mudlle

NOBLOCK is used on exits that are not solid or stable by themselves, such as
vegetation (brushes, twigs, branches, thornbushes) or curtains.

Any door that has a fairly limited border where edges connect is magically
blockable. (Examples: "bark", "tree", or a rock that connects to a rockface.)
Please take in account that doors have two sides. An exit is blockable when one
side of it is (e.g., twigs/trapdoor or thornbushes/tree).

NOBASH exits are generally ones too heavy to bash down (that is what the
message says). You can probably bash most other doors, and you can also bash
holes in a bush or a similar obstruction.

NOBREAK ones are typically somewhat magical. break door can scramble loose
rocks or shatter bushes.

Note that exits that use mudlle that does not play well with break, bash, or
block (such as /lib heavy_door or thorny_exit() mudlle) may have to be made
NOBREAK, NOBASH, or NOBLOCK because of the mudlle.

See also: DADD, ZONE
```

## /help room flags

```text
ROOM FLAGS

Possible flags are:

  DARK          This room is dark unless lit by a torch or other light
                source.
  DEATH         Deathtrap. Player dies, loses eq, and some tp.
  NO_MOB        Mobiles won't go here normally. See below for RANDOM_EXITS!
  INDOORS       No weather, no time of day unless SUNLIT, lit unless DARK,
                trolls don't sundie.
  NO_RIDE       This room cannot be entered on a mount.
  NO_FREEZE     To be used on water rooms only: water will not freeze.
  OPEN_ROOT     Root flag for /zone world_open. Az approval required.
  NO_MAGIC      Casting is impossible. (Not scrolls, etc). Only use if you
                are sure it belongs there. Needs Az approval. Consider muddle
                as well
  ISOLATED      Prevent teleport, portal, locate, scry, watch, summon, ...
  PRIVATE       Can't /goto if more than one person present, no effect on
                mortals
  RANDOM_EXITS  Player/mob takes a random exit; see also the NO_MOB flag
  MAP_TOGGLE    Change room's map visibility. See below.
  HIDE_MAP_ID   Hide the map ID from mappers (for mazes).
  SECURITY      Maiar without access cannot /goto here.
  PEACEFUL      No aggressive actions. Do not use for the mortal world!
  BUILD         Not opened: players can't teleport in. Works automatically.
  WATER         Water source (for drinking and filling); see /lib help
                room-water
  NO_SHOUT      Shouting impossible.
  SILENT        Shouting, talking, emoting impossible.
  SUNLIT        DARK SUNLIT rooms are lit by the sun (without sundeath). Use
                for cave entrances, rooms with windows, etc.
  TRAIL         Movement between 2 trail flagged rooms is at half cost.

To set room flags, use one of the following syntaxes. f1, f2, ... must be
replaced with the flag names.

  /room flag +f1 f2 f3...   -> Add flags to existing ones
  /room flag -f1 f2 f3...   -> Clear specified flags
  /room flag @f1 f2 f3...   -> Clear all flags, then set specified ones.

For instance: /room flag +indoors dark

Note on RANDOM_EXITS
--------------------
Rooms with RANDOM_EXITS allow mobs to enter rooms flagged with NO_MOB (where
they will get stuck). Also, mobs with the stay-zone or stay-sector /libs will
be overruled when leaving a random-room, thus creating possible mobtraps. Hence
always check your mob movement when you have a zone with random flags.

Note on Lighting Flags
----------------------
The DARK, INDOORS and SUNLIT flags interact with each other as follows:

  DARK  INDOORS  SUNLIT
  ---------------------------------------------------------------------
   N       N       N     Normal outdoors room
   N       N       Y     Meaningless, do not use
   N       Y       N     Indoors room with a permanent light source, no
                         windows
   N       Y       Y     Indoors room, permanent light source + window
   Y       N       N     Dark outdoors room (very, very dense forest)
   Y       N       Y     Outdoors, dense cover (dense forest w/indirect
                         sunlight)
   Y       Y       N     Indoors room, no light sources, no windows
   Y       Y       Y     Indoors room with windows

Note 1: A "window" can be anything that provides indirect daylight.
Note 2: The DARK and/or INDOORS flags makes a room safe for Trolls during the
day.

Note on MAP_TOGGLE
------------------
The MAP_TOGGLE room flag changes the logic for whether a room should show up on
maps or not (think map r, and /map nice).

So, if you have a room with BUILD and MAP_TOGGLE flags, it will show up on map
r, and if you have a room that doesn't have the BUILD flag and has the
MAP_TOGGLE flag, it will not show up on map r.

Examples of ways this can be used:

 0. You have a (multi-storey) house. Only one of the rooms should show up on
    the map, so you give all the other rooms the MAP_TOGGLE flag. (The "real"
    solution here is to move the room to a 100+ room, but that's a different
    story.)

 1. You have an outdoors zone that connects to a city-zone. On the scale of an
    outdoors zone, the city zone should occupy one room (2x2 miles), so you can
    create a (BUILD-flagged) "placeholder" room, set it to
    sector CITY and flag it MAP_TOGGLE.

    Add one-way exits from the placeholder room to the correct surrounding
    room. This makes roads or trails show up properly on map rooms and similar.

 2. You have an unreachable mountain peak that you want to show up on maps.
    Make such a room, BUILD and MAP_TOGGLE-flag it.

The MAP_TOGGLE flag has no effect on rooms with offset >= 100 as only rooms
0-99 are used for these maps.
```

## /help sector

```text
ROOM SECTOR, SECTOR

Available sector types are:

  BUILDING    Doesn't do much on its own
  CITY        You may not track here
  FIELD
  FOREST
  HILLS
  MOUNTAIN
  SHALLOWS    Can be walked in
  WATER       Needs a boat/swim. Special if STREAM exit flag is used (player
              is moved)
  ROAD        Tracking possible; same mps as CITY
  RAPIDS      Swim only, boat unusable
  UNDERWATER  Not on room maps
  BRUSH
  TUNNEL      Cramped underground; not on room maps
  CAVERN      Spacious underground; not on room maps

Sector determines (mostly) the number of movement points used when moving
through the room. However, this number is influenced also by other conditions,
such as TRAIL flag and weather.

Other effects include, but are not limited to:

 * Sneak/hide bonuses; e.g., sector CITY gives a hide bonus
 * Scouting is easier in sector BUILDING (or INDOORS flag)
 * Ability to track; e.g., cannot track in CITY sector
 * C-coded weather messages
 * Some spell effects - for example:
    + quake damage (higher in some sectors),
    + ability to portal (cannot portal to cities)
 * Some mudlled effects - for example:
    + ability to burn corpses or make campfires
    + mudlled weather messages
 * Short terrain description visible when blind or in darkness or fog

Note that some room flags have functionality that supplements room sector
functionality. Most WATER, RAPIDS, UNDERWATER, SHALLOWS rooms should be flagged
WATER. Most BUILDING rooms should be flagged INDOORS.
```

## /help dset

```text
DOOR FLAGS, DSET, EXIT FLAGS, ROOM DSET

Syntax:
   /room dset <dir> [-|+|@] <flag>...

The following flags exist:
  BROKEN      Bashed or broken door. Prevents /com ... door from taking
              effect.
  BUILD       The rooms beyond are not open to mortals
  CLIMB_DOWN  DO NOT USE (see /room cliset)
  CLIMB_UP    DO NOT USE (see /room cliset)
  CLOSED      Set by /com
  DOOR        Essential for all normal doors
  HIDDEN      Needs search to reveal door name
  LOCKED      Set by /com
  NOBASH      Can't be bashed down
  NOBLOCK     Unaffected by block door
  NOBREAK     Unaffected by the spell break door
  NOFLEE      Players cannot flee in this direction
  NOT_SHOWN   The exit will not be shown to mortals
  NO_MOB      Random walking mobiles won't enter
  PICKPROOF   Unaffected by pick skill
  PLURAL      Door name is in the plural
  STREAM      Moves players, needs water sector
  TRANSIENT   Can be disconnected from the world by mudlle

NOBLOCK is used on exits that are not solid or stable by themselves, such as
vegetation (brushes, twigs, branches, thornbushes) or curtains.

Any door that has a fairly limited border where edges connect is magically
blockable. (Examples: "bark", "tree", or a rock that connects to a rockface.)
Please take in account that doors have two sides. An exit is blockable when one
side of it is (e.g., twigs/trapdoor or thornbushes/tree).

NOBASH exits are generally ones too heavy to bash down (that is what the
message says). You can probably bash most other doors, and you can also bash
holes in a bush or a similar obstruction.

NOBREAK ones are typically somewhat magical. break door can scramble loose
rocks or shatter bushes.

Note that exits that use mudlle that does not play well with break, bash, or
block (such as /lib heavy_door or thorny_exit() mudlle) may have to be made
NOBREAK, NOBASH, or NOBLOCK because of the mudlle.

See also: DADD, ZONE
```

