# MUME Shaper Mode /com Command Help Guides

This guide contains locally stored MUME building help pages for `/com` reset command trees, retrieved directly from the live game server.

## /help com

```text
COM

Level : Mb

Syntax:
/com [<room>]
   list [-commands] ...
   add ...
   change ...
   move|copy ...
   kill ...
   limit ...
   diff [zone]
   upgrade [zone] [-list]

The /com command is used to edit the per-room zone reset commands.

See also: "COM ADD", "COM LIST", "COM MOVE", "COM KILL", "COM LIMIT", "COM
          DIFF", "COM UPGRADE"
```

## /help com add

```text
COM ADD, COM CHANGE

/com add is used to add new commands that are run on zone reset.

/com change can be used to modify an already existing command.

/com add <command> will add the command after any already existing commands, at
the same level as the last command. To add the command after a different
command, use /com add <index> <command>.

To make the new command a child of another command, use the + flag:

  /com add + <command>              # child of the last command
  /com add <index> + <command>      # child of the specified command

One or more minuses - can be used to add the command at higher levels:

  /com add - <command>              # sibling of the last command's parent
  /com add <index> - <command>      # sibling of the specified command's parent
  /com add -- <command>             # sibling of the last command's grandparent

The available commands can be seen with /com add ?:

  mobile     load mobile
  follow     load mobile as follower or mount
  object     load object
  hide       hide object
  put        put object inside another
  give       give object to mobile
  equip      equip mobile with object
  find       find already loaded object or mobile
  door       open/close/lock door
  container  open/close/lock container
  repeat     repeat child commands
  eqclass    load an eqclass
  exec       make a character run a command
  liquid     set the liquid of a drink container
  money      load money
  months     run subcommands certain times of year

Many of these commands take a <limit> parameter, which limits how many objects
or mobiles of the same kind can be loaded, or the chance (in percent) that the
command will be executed as the zone resets. <limit> is specified as an integer
of format aabbccdd:

  aa  max instances allowed in the world (objects in room 0:100 are not
      counted)
  bb  max instances allowed in the zone (objects on players voided from the
      zone also count)
  cc  max instances allowed in the room (objects on players voided from the
      room also count)
  dd  percentage chance, where 00 is taken as 100%

Examples:
  0 or 00  100% chance
      100  100% chance as long as there are no such instances in the room
    20180  80% chance as long as there is no such instance in the room and at
           most one in the zone

The /com limit and /com ... origin-limit commands can impose further load limit
restriction.

Commands that are subcommands (children) of another command will only run if
the parent command completed successfully. It should be self evident what
successful means for each command type, but typically it means a mobile or
object was created or the lock ended up in the correct state.

Some commands take a legacy "need obj/mob" flag. Using this is deprecated in
favor of using nested commands (subcommands).

A command may have an option to act on its "parent", meaning the parent's
return value. The return value is typically the loaded object or mobile, or
none.
```

## /help com kill

```text
COM KILL

/com kill <index> removes that particular zone reset command.

If the command has subcommands, you need to specify the + parameter, which will
remove the command together with all its children: /com kill 12 +.

You cannot remove a command that has subcommands without removing the
subcommands as well. If you want to do that, you first have to move the
subcommands so they are no longer children of the command want to remove.

/com kill all will remove all commands in the room.
```

## /help com change

```text
COM ADD, COM CHANGE

/com add is used to add new commands that are run on zone reset.

/com change can be used to modify an already existing command.

/com add <command> will add the command after any already existing commands, at
the same level as the last command. To add the command after a different
command, use /com add <index> <command>.

To make the new command a child of another command, use the + flag:

  /com add + <command>              # child of the last command
  /com add <index> + <command>      # child of the specified command

One or more minuses - can be used to add the command at higher levels:

  /com add - <command>              # sibling of the last command's parent
  /com add <index> - <command>      # sibling of the specified command's parent
  /com add -- <command>             # sibling of the last command's grandparent

The available commands can be seen with /com add ?:

  mobile     load mobile
  follow     load mobile as follower or mount
  object     load object
  hide       hide object
  put        put object inside another
  give       give object to mobile
  equip      equip mobile with object
  find       find already loaded object or mobile
  door       open/close/lock door
  container  open/close/lock container
  repeat     repeat child commands
  eqclass    load an eqclass
  exec       make a character run a command
  liquid     set the liquid of a drink container
  money      load money
  months     run subcommands certain times of year

Many of these commands take a <limit> parameter, which limits how many objects
or mobiles of the same kind can be loaded, or the chance (in percent) that the
command will be executed as the zone resets. <limit> is specified as an integer
of format aabbccdd:

  aa  max instances allowed in the world (objects in room 0:100 are not
      counted)
  bb  max instances allowed in the zone (objects on players voided from the
      zone also count)
  cc  max instances allowed in the room (objects on players voided from the
      room also count)
  dd  percentage chance, where 00 is taken as 100%

Examples:
  0 or 00  100% chance
      100  100% chance as long as there are no such instances in the room
    20180  80% chance as long as there is no such instance in the room and at
           most one in the zone

The /com limit and /com ... origin-limit commands can impose further load limit
restriction.

Commands that are subcommands (children) of another command will only run if
the parent command completed successfully. It should be self evident what
successful means for each command type, but typically it means a mobile or
object was created or the lock ended up in the correct state.

Some commands take a legacy "need obj/mob" flag. Using this is deprecated in
favor of using nested commands (subcommands).

A command may have an option to act on its "parent", meaning the parent's
return value. The return value is typically the loaded object or mobile, or
none.
```

## /help com list

```text
COM LIST

/com list shows the room's commands that will be run at zone reset:

   /com [<room>] list [-commands] [area|zone]

For V+, these variants are also available:

   /com [<room>] list all [area|zone] [children]
     mobile <number>|<keyword>...
     object <number>|{type <object type>}|<keyword>...
   /com [<room>] list [-commands] world

The children flag lists any child as well.

The -commands flag shows the list as a sequence of user /com commands that can
be typed to recreate the list.

The -changes flag shows the list as a sequence of user /com commands that can
be typed to modify the commands in place. This is useful if you need to
bulk-edit them.

Examples:
  /com list                list the room's commands
  /com list zone           list the zone's commands
  /com list -c             list the room's commands as a series of /com
                           commands
  /com list all m 80       list all loads of mobile 80 in the world (V+ only)
  /com list all z m orc    list all loads of orc mobiles in the zone (V+
                           only)
  /com list all o t plant  list all plants loading in the world (V+)
```

## /help com move

```text
COM COPY, COM MOVE

/com move and /com copy will move or copy a command and its subcommands to
another location within the current room or another room.

/com move <from> <to> will move command number <from> and all its subcommands
to be _after_ command <to>, at the same level. Use index zero to move a command
to be first in the room list.

Specify the + flag to make the moved commands subcommands to the <to> command:
/com move 12 7 +. That moves command 12 and its subcommands to be a subcommand
branch of command 7.

You can also use one or more minuses to add the moved or copied commands to a
higher level.
```

## /help com insert

```text
There is no help on this subject.
```

## /help com add mobile

```text
COM ADD MOBILE

/com add
   mobile <mob number> <limit> [<max zone players>] [sleep|rest|sit|stand]

Return value:   the created mobile
Successful:     if the mobile was created

Mobile <mob number> will load in the room, optionally in the specified
position.

<max zone players> can specified to prevent the load if there are more than
that many players in the zone.
```

## /help com add follow

```text
COM ADD FOLLOW

/com add
   follow <mob number> <limit> [<master mob number>] [ridden|ride-with]
     [<need mob?>]

Return value:   the created mobile
Successful:     if the mobile was created

Mobile <mob number> will load in the room as a follower of either the parent
command's return value or any <master mob number> mobile in the room.

If the ridden flag is specified, the mobile will instead load as a mount of the
parent. No mobile will load if the parent is already riding or being ridden.

If the ride-with flag is specified, the mobile will ride behind the parent,
sharing its mount. No mobile will load unless the parent is riding.
```

## /help com add object

```text
COM ADD HIDE, COM ADD OBJECT

/com add
   object <obj number> <limit>
   hide <obj number> <limit>

Return value:   the created object
Successful:     if the object was created

Loads an object of number <obj number> and drops or hides it in the room.
```

## /help com add equip

```text
COM ADD EQUIP, COM ADD GIVE

/com add
   give <obj number> <limit> [<to mob number>] [<need mob?>]
   equip <obj number> <limit> [<to mob number>] <position> [<need mob?>]

Return value:   the created object
Successful:     if the object was created

Object <obj number> will be created and given to or equipped by the parent, or
<to mob number> if such a mobile is found in the room.

The equip command will fail and no object will be created if the mobile already
is wearing something at that location (e.g., through /eqclass or a previous
/com command), or if the object cannot be worn at that location.


See also: equipment position
```

## /help com add give

```text
COM ADD EQUIP, COM ADD GIVE

/com add
   give <obj number> <limit> [<to mob number>] [<need mob?>]
   equip <obj number> <limit> [<to mob number>] <position> [<need mob?>]

Return value:   the created object
Successful:     if the object was created

Object <obj number> will be created and given to or equipped by the parent, or
<to mob number> if such a mobile is found in the room.

The equip command will fail and no object will be created if the mobile already
is wearing something at that location (e.g., through /eqclass or a previous
/com command), or if the object cannot be worn at that location.


See also: equipment position
```

## /help com add put

```text
COM ADD PUT

/com add
   put <obj number> <limit> [<container obj number>] [<need obj?>]

Return value:   the created object
Successful:     if the object was created

Object <obj number> will be created and put inside the parent object, or any
object of number <container obj number> found in the room.

If <container obj number> is specified, such an object is searched for among
dropped objects, hidden objects, and objects worn/carried by mobiles in the
room, in that order. The search also descends into objects contained by said
objects.
```

## /help com add door

```text
COM ADD CONTAINER, COM ADD DOOR

/com add
   door <direction>
     open|close
     lock [<min diff> [<max diff>]]
   container [<container obj number>] open|close|lock

Return value:   none
Successful:     if the door or any container ended up in the correct state

The door in <direction> or the parent container will be opened, closed, or
locked (if possible). If a <container obj number> is specified, all such
containers dropped in the room will be acted on.

In the door case, the pick difficulty will be set to a number between <min
diff> and <max diff> or zero if not supplied.
```

## /help com add container

```text
COM ADD CONTAINER, COM ADD DOOR

/com add
   door <direction>
     open|close
     lock [<min diff> [<max diff>]]
   container [<container obj number>] open|close|lock

Return value:   none
Successful:     if the door or any container ended up in the correct state

The door in <direction> or the parent container will be opened, closed, or
locked (if possible). If a <container obj number> is specified, all such
containers dropped in the room will be acted on.

In the door case, the pick difficulty will be set to a number between <min
diff> and <max diff> or zero if not supplied.
```

## /help com add find

```text
COM ADD FIND

/com add
   find
     mobile <mob number>
     object <obj number> [hidden|not-hidden]

Return value:   the found mobile or object
Successful:     if the mobile or object was found

The find command will try to find a matching object or mobile. If successful,
its child commands can then act on the returned value.

When finding mobiles, if the command has no parent, the room will be searched.
The first mobile in "look" order not following anyone will be returned. This
means that the most recent successful /com "mobile" command's result will be
returned, if any.

If the parent command returns a mobile, that mobile's followers will be
searched.

When finding objects, if the command has no parent, dropped objects and hidden
objects will be searched, in that order. The optional hidden or not-hidden
flags restrict such a search to only finding hidden or not hidden objects,
respectively.

If the parent command returns a mobile, that mobile's equipment and inventory
will be searched, in that order.

If the parent command returns an object, that object's contents will be
searched.

In other cases, the command will fail.
```

## /help com add hide

```text
COM ADD HIDE, COM ADD OBJECT

/com add
   object <obj number> <limit>
   hide <obj number> <limit>

Return value:   the created object
Successful:     if the object was created

Loads an object of number <obj number> and drops or hides it in the room.
```

## /help com add repeat

```text
COM ADD REPEAT

/com add
   repeat <min count 0..20> [<max count 0..20>]

Return value:   the parent command's return value
Successful:     if the repeat count is greater than zero

The repeat command will run its child command a specified number of times, or
between <min count> and <max count> number of times.

Note that it returns whatever its parent command returned, so the following
will work as expected and give the spirit four nuggets of gold:

1   Mobile    80 (a spirit) (100%)
`-- 2   Repeat  4 times
    `-- 3   Give    parent obj 4105 (a nugget of gold) (100%)

The above was created with these commands:

  /com add mob 80 0
  /com add + rep 4
  /com add + giv 4105 0 parent

Warning: you can nest repeat commands. For safety reasons, there is a hard
limit of 1024 commands executed in one room.
```

