# MUME Building Guide: Info, Zone, and Stat Guides

This guide contains locally stored MUME building help pages for `/help info`, `/help zone`, and `/help stat` retrieved directly from the live game server.

## /help info

```text
INFO

Level: Mc
Restrictions: Mc-, Ms-

Syntax:
/info
   account
     <account or player name> edit|view|"delete forever"
     list
   global
     list [<path>]
     add|mkdir <keyword>
     <keyword> view|read|edit|rename|"delete forever"
   mobile|object
     <number> edit|view|"delete forever"
     list
   personal
     list                               list all players with personal keywords
     <player>
       list [<path>]                                     list player's keywords
       add|mkdir <keyword>
       <keyword> view|read|edit|rename|"delete forever"
       delete all keywords                          delete all keywords in zone
   player
     <name> edit|eq|view|"delete forever"
     list
   skill <skill>                                 shows information on the skill
   zone
     list [<area name>] [long]                     list all zones with keywords
     <zone>
       list [<path>]                                      list keywords in zone
       add|mkdir <keyword>
       <keyword> view|read|edit|rename|"delete forever"
       delete all keywords                          delete all keywords in zone

The /info command is used to keep information about zones, mobiles, objects,
player characters and accounts, and to store global information about the game.

Entries may be written using plain text, markdown (prefix text with <md>), or

/info zone is used to store keywords with information about the zone, e.g. maps
and evaluations.

The object and mobile subcommands are used to store information about where the
obj/mob was intended to be used, etc.

The personal subcommand can be used to store information belonging to a player
(Mc+). These keywords are readable by everyone of that player's level and can
be changed by anyone above that player's level (and the player themselves).

Directories are added using the mkdir command. They are automatically deleted
when their last keyword is deleted.

Access levels
-------------
Mc only have access to /info personal and /info zone. Only Ms+ have access to
/info player.
Only V+ may use the /info account and global commands.

Formatting player entries
-------------------------
New /info player entries should be added at the top of the info files! The most
recent notes are probably the most important, and should be what you see first
when reading notes. Entries should always begin with the current date and the
editor's name.

When writing dates, the only allowed formats are:

  28 Aug 2002
  Aug 28, 2002
  28-Aug-2002
  2002 Aug 28

It's really necessary to write the month names rather than their number, and
4-digit years rather than 2, since everyone writes dates in different order.
```

## /help zone

```text
ZONE

Syntax: /zone <arguments>
Level : Mc
Restrictions: M, V

  list         Options allow all zones to be listed. When preceded by a
               number, it lists all the rooms in that zone.
  exploration  Valar only -- manages old TPs.
  world-open   Valar only -- recomputes the BUILD flag of each room. See
               below.
  create       Aratar only.
  save         Saves the zone. /room save does the same.
  save extra   Saves hidden objects and TP flags.
  reset        Run all the zone's commands. With the verbose flag, show
               output from all rooms affected.
  revert       Do not use, it duplicates the /com list.
  erase        Aratar only - destroy rooms. Example: /zone 2 erase 0 99.
               Better do not delete rooms "in the middle" of a zone!
  add          Add <n> rooms to the zone.
  delete       Remove rooms in the specified range from the zone. To delete
               rooms <zone>:<xx> to <zone>:<yy>, use "/zone <zone> delete
               <xx> <yy>".
  sign         The sign shown on the map command.
  owner        Changes owner of the zone.
  name         Names the zone, as given in /zone list. [P] means the zone
               only partially uses the rooms 0-99.
  cx|cy        The coordinates for the map command.
  town         If the zone is a special town zone, it's name is here.
  jail         The room number of the zone's jail, if applicable.
  complain     Where a player complains in the zone, if applicable.
  alignment    Zone alignment, usually 0.
  freq         For TPs.
  reset-mode   Set to always (default), never, noplayers.
  life-sp      How long in minutes between each automatic reset.
  recall-good  The room a player will go to using 'word of recall' from this
  recall-evil  zone.

  sun-rise     Sets the message for sun rise.
  sun-set      Text for sun set.
  moon-rise    As sun.
  moon-Set     As sun.

  high-hum     Sets high altitude humidity (ignored if no-map).
  temp         Zone temperature.
  low-hum      Sets low altitude humidity (ignored if no-map).


How /zone world-open works: It explores the world starting from all rooms with
the OPEN_ROOT flag and removes the BUILD flag from all the linked rooms. Rooms
that were not reachable have their BUILD flag set.

Use the BUILD exit flag to prune unopened yet linked (such as Isengard) off the
non-BUILD world. world-open does not explore rooms past such exits (but you
still need PICKPROOF, NOT_BREAKABLE, and NOBASH to keep the mortals outside).

If on the other hand you have a sub-area reachable by mortals but sometimes
disconnected from the open world (such as the White Ship), that sub-area needs
a room flagged OPEN_ROOT or it will be BUILD-flagged.

If that sub-area happens to be connected to the world when someone runs /zone
world-open, the command will produce a "duplicate path" warning because the
same area is reachable by two different OPEN_ROOT rooms.

The proper fix is to make open-world ignore such temporary connections by
flagging both sides of the exits TRANSIENT in the mudlle that creates them.
Exit changes that only affect the layout (for example making the ship head
north or west) do not need TRANSIENT (the 3 rooms are still always connected
together), however the exits out of the ship only exist when docked and thus do
need TRANSIENT.

Common symptoms:
 * Rooms are sometimes BUILD, sometimes not: missing OPEN_ROOT and TRANSIENT
   flags.
 * Rooms are always BUILD: missing OPEN_ROOT flag.
 * Duplicate paths warnings in open-world: missing TRANSIENT flags.

See also: ZONE FLAGS
```

## /help stat

```text
STAT

Syntax:
/stat
   room [<number>|<[zone]:offset>] [full]
   object|item <name>|<number>
   mobile|player|char <name>|<number>
   zone [<number>]

Level: Mc
Restrictions: -

If you're interested in a person (player or mobile) and want to find out about
his/her/its strength, mana, hitpoints, etc.

In addition, /stat room will give you useful information about the room you are
in, provided you are the owner of the zone.

Statting objects will give summary of its affects, weight, etc.

Statting a zone will give general details set by /zone.

Finding Objects

In addition to the "mortal" location specifiers (eq, inv, etc.), Mb+ can use a
character and hidden. Examples:

  /stat o barliman.shirt   finds objects carried by Barliman, who does not
                           have to be in your room
  /stat o hidden.moneybag  finds hidden objects in your current room

Mudlle Output

The thing you show information for will be assigned to the $stat mudlle
variable (as a character, object, room or zone number).
```

## /help stat room

```text
There is no help on this subject.
```

## /help stat mobile

```text
There is no help on this subject.
```

## /help stat object

```text
There is no help on this subject.
```

