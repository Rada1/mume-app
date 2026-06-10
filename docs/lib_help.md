# MUME Shaper Mode /lib Command Help Guides

This guide contains locally stored MUME building help pages for `/lib` behaviour definitions, retrieved directly from the live game server.

## /help lib

```text
LIB

The /lib command lets Builders add special effects using libraries that would
otherwise require mudlle.

Libraries can be installed on rooms, objects or mobiles; you need write
permission to an entity in order to use /lib on it.

From the list below, Mc have only /lib commands and /lib help <command>,
whereas Mb+ have all commands.

/lib commands [mobile|object|room] [long]
   lists available commands, optionally with a description

/lib help <command>
   gives help on the parameters of a specific library

/lib zone <zone> list [-commands] [<substring>]
   lists the rooms of zone <zone> with an installed library. If the optional
   flag -commands is given, the commands installed on each room will be listed
   as well. If the optional parameter <substring> is given, only the libraries
   whose name has that substring will be listed.

   Example: /lib zone 108 list underwater_room

/lib mobile|object|room list [<substring>]
   lists all mobiles, objects or rooms to which you have access and which have
   one or more /lib commands on them. The <substring> parameter works as above.

/lib mobile|object|room search <string>
   lists all mobiles, objects or rooms to which you have access and which
   contain <string> in one of its arguments.

/lib mobile|object|room <number>
   add <library>
      adds the specified library, with default parameters, to the entity
   list
      lists the libraries installed on the entity with their current parameters
   remove <number>
      removes the specified library from the entity
   set <number> <parameter> <value>
      changes parameters on the specified library. See /lib help or board 16
      for more information.
   load
      loads mudlle code for the libraries. After a library is installed, you
      must use this command or wait for a reboot to activate it. Some libraries
      might need a reboot to become active, check /lib help.

/lib errors [-commands]
   list where there are loading errors of libraries, optionally specifying
   which commands caused errors.

An example: how to make the mosquito swarm, mobile 1003, immune to bash.

  > /lib m 1003 add no_bash
  > /lib m 1003 list
  1: no_bash
    type: agile
  > /lib m 1003 set 1 type
  Changing command no_bash (position 1)
  Bad arguments, usage:
  ... type hulk|swarm|agile
  > /lib m 1003 set 1 type swarm
  Changing command no_bash (position 1)
  > /lib m 1003 load

Some libraries or library options can be very CPU-intensive. If /lib help says
so, you must ask permission to your supervisor before installing them.

Mudlle Output
-------------
The result from your most recent /lib ... list or /lib ... search will be
stored in your $lib mudlle variable as a vector of numbers.

See also: BUILD
```

## /help lib room

```text
There is no help on this subject.
```

## /help lib mobile

```text
There is no help on this subject.
```

## /help lib object

```text
There is no help on this subject.
```

## /help lib exit

```text
There is no help on this subject.
```

## /help lib door

```text
There is no help on this subject.
```

## /help lib climb

```text
There is no help on this subject.
```

## /help lib zone

```text
There is no help on this subject.
```

