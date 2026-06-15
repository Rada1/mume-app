Arglebargle, glop-glyf!?!

+ *( C iMw NN NS 3150[31:50]>You open the guide titled 'Hitchhiker's Guide to Building' by Ariakas and begin
to read.


*******************************************************************************
******************************  Building Guide  *******************************
*******************************************************************************

First edition by Ariakas, 30 September 1994.

TABLE OF CONTENTS


        Chapter 1 - Introduction.

        Chapter 2 - Room: building your zone from the ground up.

        Chapter 3 - Commands: how to populate and equip your zone.

        Chapter 4 - Mobiles: how to create/edit new mobiles.

        Chapter 5 - Objects: how to create/edit new objects.

        Chapter 6 - /lib: how to liven things up a bit.

        Chapter 7 - Shops: modifying a shop within your zone.

        Chapter 8 - Edition: note of modifications since first version.

        Chapter 9 - Miscellaneous.


    Chapter 1 - Introduction.
    =========================

1. Introduction

Welcome to MUME's guide to building. This set of documentation differs from
the standard help in one way; this is a tutorial on how to build and design
game objects, not a list of commands and syntaxes. It will take you from
your first room to adding a complex shop, through creating mobiles and loading
them in your zone. Each tutorial is based around a command found in /help.

Each tutorial will use plenty of examples. All use of the editor will show
what you would see should you be using the standard MUME line editor. If you
can use Cancan (Credits: Yorick, Vivriel, Thuzzle & Ilie) then you are strongly
advised to, as it allows you to edit mume files on your local editor. This is
likely to be a full screen editor and thus much easier to use.

Windows users may like to try Powtty, a windows port of the popular powwow.
Powtty also supports local editing.

These clients are available for download from the Mume web page mume.pvv.org

All examples and information were correct at time of creation, though commands
change over time and I cannot accept responsibility for any confusion caused by
this. Updates will be made as regularly as possible.

    Chapter 2 - Room: building your zone from the ground up.
    ========================================================

 2. Room
     1. Zone structure
     2. Room name and description
     3. Room exits
     4. Climb
     5. Room flags and sector types
     6. Extra features
     7. Saving your changes
     8. Frequently asked questions

This tutorial covers:
 * The structure of zones
 * How to set the name and description for a room
 * How to define the links between rooms (exits) and create doors
 * How to set room flags and sector types
 * Adding additional features such as keywords

2.1. Zone structure and
========================

First of all, the zone needs some information put in it so that other gods can
get a general idea about the zone quickly. This type of information is set out
in /info <zone number>. For example, if your zone were 300, then you could type
/info zone 300 list:

Zone 300 has the following keywords:
asciimap

You will need to add extra keywords to inform other people who might need to
work on the zone about what is there. Typically you should include keywords to
cover map, story/evaluation of the zone, connections, mobiles, objects, mudlle,
libs, and any other special features for the zone. To add a new keyword to the
list for the story of the area:

/info zone 300 story edit

keyword 'story', zone 300
MUME editor. Type %h for help
-----------------------------
==>
: Here is where you type in the story behind for your zone.
: It should relate the basic concept for the area, and who is expected to visit
: the zone.
: %e
Ok.

In this way, as you go about designing and building your zone, you will be able
to add keywords to the info, and your supervisor [and any other people who need
to know what has been done there] will be able to read about it. To read an
entry in the info type: /info zone 300 story read

MUME has adopted the standard structure whereby each zone consists of 100 rooms
laid out on a 10x10 map. Each room number consists of a zone number followed by
the X,Y coordinate of that room. For example, 82:94 would mean zone 82 and 9,4
on the map. 130:84 would mean zone 130 etc. Each room in MUME represents 4
square miles. This means that if the room you are describing is marked as a
stream on the asciimap you will also be describing the surrounding areas (the
banks on either side). Rooms which will occupy significantly less space than a
2x2 miles room (such as a ruined cottage) should probably be done with an extra
room (over and above the usual 100 rooms in your zone). These rooms can be
provided by your Sv if they are justified.

 0123456789
0 Tffff----  f = Forest            Room 0y = western side, 9y=eastern side
1fTTTTff---  T = Trail             Room x0 = northern side, x9=southern side
2ffffTf----  - = Plain/undefined
3--ffT-----
4----TTT---  This is a typical basic map for an empty zone.  All zones have
5------T---  some guidelines, for example, this zone requires that a trail
6------TTTT  run through it, and that the trail runs through a forest at the
7----------  northwestern part of the zone. These features are defined by the
8----------  asciimap for the zone, which will be provided by your supervisor
9----------  and is generally the first entry made in the info for the zone.

2.2. Room name and description
==============================

The room name can be anything, but it should generally be kept to three or four
words. To set the room name, type:

> /room name My First Room
Room renamed (in the My First Room).

The reply in the My First Room is slightly strange-looking; more on that later
on.

If you decide your room name should have an article ("a", "an" or "the"), you
should use "the" for unique rooms or features, and "a" or "an" for a place that
is very similar to something that might be found elsewhere; i.e., "the Old East
Road", "the Ballroom", but "a Grove of Trees" or "a Cave".

All words should be capitalised, except prepositions (at, in, on, before,
etc.), coordinating conjunctions (and, but, or, for, nor), articles (a, an,
the), and "to" in infinitives. If the room name consists of more than one word,
the last word should also be capitalised.

  a Dusty Study                         before the Great Gates
  along the Gravel Path                 Old East Road
  Deep inside a Dark Forest             the Ballroom

Hyphenated words should only have their first word capitalised in room names
(unless the following are proper nouns or adjectives):

  in an Ivy-draped Forest
  a Tree-top
  the Non-Quenya Library Section

MUME will automatically capitalise the first word in the room when you type
look.

Together with the room name, you must set a "preposition". This is used by
mobiles (and in some messages, like in history) who want to talk about the room
(e.g., yell An orc is here in a Dusty Study). To figure out what the
preposition should be, think You are <preposition> <name>., where <name> is the
room name. In the a Dusty Study case, the preposition should be in. You set the
preposition with /room preposition. Note that a preposition can be empty (e.g.,
when the room name starts with a preposition).

You can set the room name and preposition at the same time by typing /room name
<preposition>@<name>. E.g., /room name in@a Dusty Study or /room name @along
the Gravel Path.

Now add a description for this room. This is the detailed description of
everything that can be seen in the room.

> /room desc
Enter your description.

This would be your room description. It should be at least three lines, some
supervisors will insist on longer descriptions. For conformity, keep the lines
as wide as possible, but less than 80 characters.

Note that the standard MUME editor provides a way of justifying text to 80
characters wide with the %j command.

Now typing examine should show the room complete with description and name.

Another MUME convention is that there must be no forced emotion or action in
the description. This means that the following would not be allowed:

A Dusty Study
A layer of thick dark dust has settled over everything in this room. A
bookshelf on the western wall is packed with ancient tomes, taking a closer
look you breathe in the dust and sneeze violently.

This breaks the guidelines since you force a player to sneeze. Trolls may like
the dust yet they will still see the same description!

2.3. Room exits
===============

Practically all rooms in a zone will connect to another, either by simply
moving in a direction or by opening a door first. Go to room no. 88 of your
zone. From the previous section, this is known to be in the SE corner of the
zone. Assuming the normal convention will be used, the room east of this one
would be no. 98. Go to these rooms and rename them with something familiar.

> /at xx:88 /room name The western room
> /at xx:98 /room name The eastern room

(Note /at is useful for simple commands like this, but it is normally wise to
/goto the room you are working on - assume /goto xx:88 has been done)

> /room dig e xx:98
That is all that is needed. This creates an exit east to room 98, and creates
an exit west from 98 back to 88. This command works in all directions,
including up and down. An alternative command is /room ex. This does not create
an exit in the room you are linking to, just in the starting room. This is used
for one way exits.

Use the command /room noex <direction> to destroy a room exit. This will never
affect the room the exit leads to, so if you want to destroy that you will need
to reuse the command in that room.

To create a door is just as simple, we want a door leading east (from 88)

> /room dadd e window -1
dadd (door add) adds a door on the eastern exit and sets the key for the door
to no-keyhole. To make a door with a lock, without having a specified key
object, use "none". If the door can be unlocked (from this side) without a key,
use latch.

Otherwise specify a key object number. Do not use a key that already exists. If
you feel your door should have a key, ask your supervisor, and he/she will
decide if this is needed if it is, you will be allowed to request a new key
object.

To make the door have any special flags, such as it being HIDDEN or NOFLEE, you
use /room dset (type /help room dset for information). Thus:

> /room dset e hidden
will make the window hidden. Note that on the other side there will be no door
yet, and this should be created in the same way, although it does not
necessarily have to have the same name or flags.

Note that setting the door to be closed and/or locked when the zone repops is
done with /command (explained in chapter three).

2.4. Climb
==========

After you've connected two rooms, creating a climbable exit requires two steps:
 1. Setting the CLIMB_UP exit in the east room > /ro cliset w 40 10 up note

 2. Setting the CLIMB_DOWN exit in the west room > /ro cliset e 30 10 down

Notice that you will always travel through an exit flag of CLIMB_DOWN, but it
takes climb skill to pass through CLIMB_UP. Attempting to climb without enough
skill will cause damage in either direction.

After you've created the climb, check the exit flags. If you've made any
mistakes for example on the climb direction, you can fix it by typing in the
command again, this time with the right parameters. For example if you would
like it reversed use the following commands. Use in the appropriate rooms, you
want the climb exits

    > /ro cliset w 30 10 down
    > /ro cliset e 40 10 up

 1. DOOR and CLIMB are not possible together.
 2. In most cases, you should use 25% less climb skill going down.
 3. 0-40 skill and 0-20 damage are normal. Consult your Sv for higher values.
 4. Climbing into/out of rivers should typically have no more than two damage.

Rooms may also slope. The difference lies in the fact that a sloping room
requires no special skill to pass through. E.g., 'A Wooded Hillside' would
require a slope to be added where 'A Rock Face' would need climb. Common sense
can be applied to see which is best used. Slopes can be applied using /lib
slope. There is more on libs in chapter six.

2.5. Room flags and sector types
================================

What makes a room a death trap? What makes a room stop you from hearing shouts?
The answer is of course flags. Sectors have different effects, most notably
they alter the number of movement points required to walk through the room for
a player.

DARK          This room is dark unless lit by a torch etc
DEATH         Deathtrap. Player dies, loses eq, and some exp.
NO_MOB        Mobiles won't go here normally. (Will flee)
INDOORS       No weather, no time of day, lit unless DARK
NO_RIDE       This room cannot be entered with a mount

This is a brief section from the /help room flags list. Each flag is listed and
explained. As an example, if this room were to be made NO_RIDE

> /room flag no_ride
If you want multiple flags in the room, you should type the next flag after the
first one.

> /room flag no_ride dark
This will put the no_ride and dark flag in the room.

Removing a flag is done in a similar way.

> /ro flag -no_ride
Whilst a room can have many different flags, it can have only one sector type.
An excerpt from the '/help sector' information:

       INSIDE            /* Not INDOORS room flag, no weather*/
       CITY              /* You may not track here */
       FIELD
       FOREST
       HILLS
       MOUNTAIN

To set the room to be HILLS type:

> /room sector hills

2.6. Extra features
===================

If your description mentions something, a painting for example, you might want
the player to be able to get more information about it without it being part of
the description, i.e. the player will type 'look painting'. To do this keywords
are used. A keyword is created together with any synonyms required, then given
a suitable separate description:

> /room kadd painting picture
> /room kdesc painting        (any one of the synonyms will do)
Enter your description
The painting is nice (a somewhat poor kdesc)

To remove a keyword, together with its description and synonyms, use

> /room kkill keyword
A similar feature is exit descriptions. In this case, more information is given
when a player looks in this direction. If you have a death-trap, it is
essential that you have an exit description for it.

> /room edesc n
Enter your description
 The planks beneath your feet seem to develop more cracks every inch of the way
 ahead. They may not be able to bare much weight.

You can use /room edesc on directions whether they have exits or not.

2.7. Saving your changes
========================

Nothing you enter is saved unless done manually with /room save or /zone save.

Get into the habit of saving regularly as crashes will destroy any unsaved
changes, with resulting anger/frustration/tears (delete as applicable).

/room save will do the same as /zone save, without sending to all the message
The earth shivers... Arda seems to have reshaped itself, so use /room save.

2.8. Frequently asked question
==============================

 * How do I make my doors close or lock? I use the right door flags, but the
   never change unless done manually

   Doors are closed, opened, and locked by /commands, not by door flags. The
   CLOSED and LOCKED flags on a door have no real effect. See COMMANDS

 * How do I make indoor rooms lit

   All rooms carrying the INDOORS flag are lit unless they also have the DARK
   flag. Rooms without INDOORS flag will be light during the day only

 * What is the difference between INDOORS flag and INSIDE sector

   The flag is used to affect whether the room is lit or not, the sector is
   used as minimal MPs usage

 * What is the difference between CITY and ROAD sectors

   They both use equal movement points, however you cannot use the track skill
   in a CITY sector. This sector must -only- be used in cities

 * Do I need to have a door to use /room dset

   NO_FLEE can be used on any exit, whilst STREAM is usually used with no door

 * Why should I use /room save rather than /zone save

   They both do exactly the same. That is; they both save the entire zone /Room
   save doesn't produce annoying global echoes

    Chapter 3 - Commands: how to populate and equip your zone.
    ==========================================================

    Chapter 3 - Commands: how to populate and equip your zone.
    ==========================================================


3.  Command
  1. Function of /com
  2. Using commands
  3. Command limits
  4. Frequently asked questions

This tutorial covers:

  o Function of /com
  o Usage of each option to create an example room
  o Listing and removing commands


3.1. Function of /com

 A zone would be quite boring if it contained no objects or creatures. In order
 to populate a zone as such, /com is used. This could be seen as perhaps
 a very simple programming language, only consisting of a handful of commands.
 Each room can have its own set of commands which are run in turn at a zone
 reset (or reboot). Using /com often causes lots of confusion to the
 beginner, but after a while it becomes fairly clear and easy to use.
 Each command is added sequentially to the room, and then normally checked by
 calling a reset (/zone reset or /room reset).

 The following functions can be carried out with /com:

 - M : Adding a mobile to a room
 - F : Adding a mobile to a room and making it follow another
 - O : Adding an object to a room
 - P : Loading an object and placing it in a previously loaded container
 - H : Adding an object to a room and hiding it
 - E : Loading an object as a mobile's equipment
 - G : Loading an object and placing it in a mobile's inventory
 - D : Closing, opening and locking doors.
 - C : Open/close/lock container
 - F : Find already loaded object or mobile
 - R : Repeat commands


3.2. Using commands

 It's easiest to begin using /com in a room empty of previous commands. Go to a
 room in your zone or testarea and type "/com list". If this gives no output,
the
 room has no /com commands in it. We will use this room for a tutorial of how
 to create a set of /com's using the various commands.


3.2.1 /com add M

 With the M (mobile) command, we set mobiles to load. For this tutorial, we
want
 an orkish patrol leader to load in our room. You will need the v-num for the
 leader first. To get this, find the leader with the command "/num mob leader".

 We find several mobiles with the keyword leader, among them the orkish patrol
 leader we want, it looks like this; 1313: orc         : an orkish
patrol-leader

 Before loading mobiles or objects, be sure to read their info, "/info mob 1313
 read" as it may be restricted in where/why it can be used.

 Now, we are sure this is the right mobile for us. Let's set the /com:

 /com add mobile 1313 00020175

 This will set a /com for mobile 1313, with a loading limit of unlimited (00)
 for the world, 02 for the zone, 01 for the room and it will have 75% on zone
 reset to load.

 Type /com list to check if it looks correct. It should look like this:

 1   Mobile  1313 (an orkish patrol-leader) (--/2/1/75%)


3.2.1 /com add FOLLOW

 We want our patrol leader to have two soldiers following him. We search and
 find the ones we want. We now use the following command to make them load and
 follow the leader.

 /com add follow 70 00040200 1313

 Do this twice, and then /com list. The list should now look like this:

 1   Mobile  1313 (an orkish patrol-leader) (--/2/1/75%)
 2   Follow    70 (an orkish soldier) follows 1313 (orc) (--/4/2/100%)
 3   Follow    70 (an orkish soldier) follows 1313 (orc) (--/4/2/100%)

 With this /com structure, the loading of the soldiers will happen when the
 limits are not reached (4 in zone, 2 in room) and there is a mobile 1313
 present. Let's make sure it's the leader loaded with line 1 they follow, and
 not some other leader who wandered into the area.

 First we remove the two soldiers with "/com kill 3" and "/com kill 2" (or
 just "/com kill 2" twice).

 Now we use this command to specify that the soldiers should load with this
 leader, type it twice:

 /com add 1 + follow 70 00040200

 The '1' tells us which position in the /com list we are attaching the /com to
 and the + sets this new /com as a child of line 1. This means the execution
 of this new /com will only happen if the parent /com is performed. If you
 do /com list it will now look like this:

 1   Mobile  1313 (an orkish patrol-leader) (--/2/1/75%)
 |-- 2   Follow    70 (an orkish soldier) follows parent (--/4/2/100%)
 `-- 3   Follow    70 (an orkish soldier) follows parent (--/4/2/100%)

 If the leader loads, he will get two orkish soldiers as followers. The loading
 of the soldiers still obey their limits though.


3.2.3 /com add O

 With this command we can load objects in a room. Clear out the old commands
 with "/com kill". We will use object 1040 'a crack'. This is the container
 found in for example Grinder's room.

 /com add O 1040 00010100

 List the commands and it will look like this:

 1   Object  1040 (a crack) (--/1/1/100%)


3.2.4 /com add P

 This command is used to put objects in a container. We will put some bread
(obj
 8004) in the crack. There are two basic ways we can go about to put things in
 a container. Here are two methods for putting 8004 in 1040.

 /com add 1 + P 8004 00000200

 /com add p 8004 00000200 1040

 The first line makes the command a child to 1 (1 +). By doing this, we do not
 need to specify which container it will go to. However, this will only load
 bread once, when the crack itself loads.

 The second line makes it a separate command and specifies that the bread will
 go into object 1040.

 The command list will now look like either of these:

 1   Object  1040 (a crack) (--/1/1/100%)
 `-- 2   Put     8004 (a loaf of bread) in parent (--/--/2/100%)

 1   Object  1040 (a crack) (--/1/1/100%)
 2   Put     8004 (a loaf of bread) in 1040 (crack) (--/--/2/100%)

 The first of the two ways is a good way to load equipment into a container
 that loads in a room, such as a pouch or backpack, while the second way is
 more suitably used for refilling such things as boots in a skeleton or
 berries in a bush.

 The problem with the second example is that it will put the item in a
 container if it finds one, even if it is not the one you had in mind when
 writing the /com sequence.

 For example, if you load a backpack with a room limit of 1, and someone picks
 it up. Later the zone resets while a mobile is in the room carrying a backpack
 of the same v-num. In this scenario the backpack would not load, since the
 room  limit of 1 is already met, but line 2 would still execute and put bread
 in the backpack it finds.


3.2.5 /com add H

 Using this command objects can be loaded hidden.

 Example:

 /com add hide 6520 00000100

 Resulting command list:

 1   Hide    6520 (a water skin) (--/--/1/100%)


3.2.6 /com add E

  The equipment positions are as follows:

  free-0    neck-2  feet    about    wield   belt-1  belt-5
  finger-r  body    hands   waist    free-2  belt-2  quiver
  finger-l  head    arms    wrist-r  free-1  belt-3
  neck-1    legs    shield  wrist-l  belt    belt-4

 Let's start over in a fresh room. We'll go with the orkish patrol leader
 again, but this time we will equip him with some items. We'll use the
 following items: 2003 (a falchion), 2012 (a scimitar), 3104 (a plain leather
 belt) and finally 6007 (a belt pouch).

 /com add m 1313 00010100
 ^ First we load the leader with a 100% chance.

 /com add 1 + E 2012 00000050 wield
 ^ This line creates a child for the first line and gives the scimitar a 50%
   chance to load.

 /com add E 2003 00000000 wield
 ^ Notice how we do not make this command a child. Since the previous command
   was made a child, we are already there in the /com structure. To add
   commands that do not act as children we would need to use the "-" command.

 Now list the commands and it will look like this:

 1   Mobile  1313 (an orkish patrol-leader) (--/1/1/100%)
 |-- 2   Equip   parent wield    with 2012 (a scimitar) (50%)
 `-- 3   Equip   parent wield    with 2003 (a falcion) (100%)

 The patrol leader will have a 50% chance to load with a scimitar. When the
 third line is executed there is a 100% chance for a falchion. However, if a
 position (wield in this case) is already filled then the command will not
 execute.

 What we have created here is a patrol leader with an equal chance to load with
 two different weapons.

 Let's equip him with a belt and a pouch too.

 /com add e 3104 00000000 belt
 /com add e 6007 00000000 belt-1

 When we do a room reset to run the /com sequence, we should see the following:

 An orkish patrol-leader has arrived.
 An orkish patrol-leader awkwardly draws a falchion.
 An orkish patrol-leader wears a plain leather belt about his waist.
 An orkish patrol-leader puts a belt pouch on his belt.

 Let's refresh the use of P and make our orc happy.

 /com add 5 + put 8026 00
                       ^ Note how we do not type out all the zeroes. They are
                         not needed if the loading is unconditional. We could
                         use e.g. 0150 to make it no world/zone limit but 1
                         room limit and chance 50%

 This is our "/com list" for the patrol leader:

 1   Mobile  1313 (an orkish patrol-leader) (--/1/1/100%)
 |-- 2   Equip   parent wield    with 2003 (a falchion) (50%)
 |-- 3   Equip   parent wield    with 2012 (a scimitar) (100%)
 |-- 4   Equip   parent belt     with 3104 (a plain leather belt) (100%)
 `-- 5   Equip   parent belt-1   with 6007 (a belt pouch) (100%)
     `-- 6   Put     8026 (a small piece of chocolate) in parent (100%)

 It could be argued that the pouch should also have been made a child of the
 command to load a belt, since the pouch requires the belt.


3.2.7 /com add G

 This command gives a mobile an object. It has the same function as equip but
 puts the item in the mobiles inventory (see 3.2.6).


3.2.8 /com add D

 By using this command, we can open, close and lock doors.

 Example:

 /com add door east close
 ^ This closes the door to the east.

 /com add door east lock 20 30
 ^ This locks the door to the east and gives it a pick difficulty between 20
   and 30.

 /com add door west lock
 ^ This locks the door, and since no pick value is set, the door can not be
   picked at all.

3.2.9 /com add C

 By using this command, we can open, close and lock containers. This has the
 same functionality as "/com add D" (see 3.2.8).


3.2.10 /com add FIND

 For this tutorial, we pretend to make a storyteller mobile that has a belt
 pouch  with candy in it. We have kindly asked a mudller to make the
 storyteller eat a piece of candy every now and then. To make that happen, we
 will continuously put candy in his belt pouch.

 /com add m 3532 00010100
 ^ This is actually a robber. We use him since we do not have a storyteller
   mob we can safely load.

 /com add + e 3104 00 belt
 ^ The + creates a child structure and puts the belt on our robber.

 /com add e 6007 00 belt-1
 ^ It's not needed here, since it continues on the previous structure. It could
   still be used since the pouch depends on the belt. If the belt was anything
   but a guaranteed load, this line should definitely have been a child to it.

 /com add - find mob 3532
 ^ The "-" here takes us out of the structure again, since we do not want the
   find to only happen when the mobile loads.

 /com add + find object 6007
 ^ The previous find was to find the robber. After that we add a child that
   finds the robber's pouch. We will only try to find the pouch if the robber
   was found.

 /com add + put 8026 1000
 ^ Finally we add a child to the finding of the pouch, which puts a piece of
   candy in it. We add a room limit of 10.

 The command structure looks like this:

 1   Mobile  3532 (a robber) (--/1/1/100%)
 |-- 2   Equip   parent belt     with 3104 (a plain leather belt) (100%)
 `-- 3   Equip   parent belt-1   with 6007 (a belt pouch) (100%)
 4   Find    mobile 3532 (a robber)
 `-- 5   Find    object 6007 (a belt pouch)
     `-- 6   Put     8026 (a small piece of chocolate) in parent
(--/--/10/100%)

 This will load a robber with a belt and belt pouch. It will also put a piece
 of candy in his pouch, and continue to do so every zone reset (up to the limit
 of 10)

3.2.11 /com add R

 The repeat command sets a number for how many times its children should be
 performed. We will use the "storyteller" from 3.2.10 as an example. First
 we remove the loading of the candy with "/com kill 6".

 Now we add a repeat as a child to the finding of the pouch:

 /com add + repeat 4
 ^ This sets it to repeat 4 times. A command can be repeated up to 10 times and
   by setting "repeat 4 6" it will be a random number of times between 4 and 6.

 /com add + put 8026 1000
 ^ We put a piece of candy in. This will be run 4 times.

 /com list:

 1   Mobile  3532 (a robber) (--/1/1/100%)
 |-- 2   Equip   parent belt     with 3104 (a plain leather belt) (100%)
 `-- 3   Equip   parent belt-1   with 6007 (a belt pouch) (100%)
 4   Find    mobile 3532 (a robber)
 `-- 5   Find    object 6007 (a belt pouch)
     `-- 6   Repeat  4 times
         `-- 7   Put     8026 (a small piece of chocolate) in parent
                         (--/--/10/100%)

 Now we load a robber and give him a belt and a belt pouch, then right after,
 and every following zone reset, we check for the robber in the room. If we
 find him we check for his pouch, and if we find that we put a piece of candy
 in it four times up to a maximum of 10 pieces of candy.

 Other (possibly more practical) uses for repeat is to load several followers
 at once to a leader. For example we could load 4 orkish soldiers to a patrol
 leader with the repeat command. This is especially useful if the orkish
 soldiers in their turn are parents to other commands, such as equipping items.

 Here is a longer example of a /com (from malardil) that uses both find and
 repeat to give malardil new followers if they have been killed off and also
 gives him a new small silver key;

 1   Door    open east  (curtain)
 2   Mobile  1122 (Malardil) (--/1/1/100%)
 |-- 3   Equip   parent belt     with 3104 (a plain leather belt) (100%)
 `-- 4   Equip   parent belt-1   with 6007 (a belt pouch) (100%)
 5   Find    mobile 1122 (Malardil)
 |-- 6   Give    parent obj 7032 (a castle key) (aa/bb/cc/dd%)
 |-- 7   Find    object 6007 (a belt pouch)
 |   |-- 8   Put     7051 (a small silver key) in parent (aa/bb/cc/dd%)
 |   `-- 9   Put     4104 (an amethyst) in parent (aa/bb/cc/dd%)
 |-- 10  Follow  1127 (a bulldog) follows parent
 |-- 11  Follow  1123 (a gypsy woman) follows parent (--/1/1/100%)
 |   |-- 12  Equip   parent about    with 3524 (a russet cloak) (--/--/1/100%)
 |   `-- 13  Give    parent obj   86 (a shiny flute) (aa/bb/cc/dd%)
 `-- 14  Repeat  2 times
     `-- 15  Follow  1125 (Malardil's guardsman) follows parent
         |-- 16  Equip   parent body     with 3036 (a metal breastplate)
         |-- 17  Equip   parent shield   with 3074 (a large metal full shield)
         |-- 18  Equip   parent wield    with 2003 (a falchion)
         `-- 19  Equip   parent wield    with 2017 (a broadsword)


3.3. Command limits

 As the command list of each room is read at reset, there has to be some way
 of deciding if each command should be executed or not. This is done by setting
 limits on the command. They are as follows: aabbccdd.

 aa = world limit for this load
 bb = zone limit
 cc = room limit
 dd = chance that the command will be executed, assuming the limits are met.

 World limit is mainly used for unique or rare mobs, artefacts and such things.
 When creating an assassin, deer or boar, you typically wouldnt want the
 loading to fail because of what loads in other zones.

 Zone limit is very important for wandering mobiles. Zone limits should always
 be used with mobiles even if they are sentinel, since they can be moved with
 the fear spell, some mobiles flee when attacked etc. Just remember that if you
 have several loading places for a mobile you need to account for this when
 setting a zone limit.

 Room limit does the same thing as zone limit, but for that one room.

 Random chance sets a percentage chance (1-100%) for the command to be
 executed. Remember that for the children in a command structure to be
 performed the parent command must first be successful.

 For the limits, 00 means unlimited, and for random chance 00 equals 100%

 When typing out the limits, we do not need to enter all 8 numbers assuming
 aa, bb, cc are to be unlimited. The limits are read from right to left.

 Examples:

 030150 = 3 zone limit, 1 room limit, 50% chance, since we did not want a world
          limit we did not enter the zeroes for aa)

 01000000 = A world limit of 1, no other restrictions and 100% load chance.

 0100 = Unlimited world/zone limit. Limited to 1 in the room and 100% chance.

 To sumarise:  (World limit/Zone limit/Room limit/Load chance)

 Here is an example of this; We will load an assassin of which there can only
 be one in the zone. He will have a thief as follower which will only be
 loaded if there is less than 3 thieves in the zone.

 This is the first command in the room therefore it has no dependencies that
 must be satisfied so we can omit the optional command number.

 /com add M 3086 00010000    (aa not needed, bb=01, cc unlimited, dd=100%)
 /com list

 1   Mobile  3086 (an assassin) (--/1/--/100%)

 Now we will give the assassin a sword. We want the sword to always load on
 this assassin with a 100% chance independant of other swords in the world/
 zone/room. We use "/num obj sword" to find a suitable sword (2019) and then
 we load it in a wielded position (see 3.2.6 or help obj pos for a list of
 positions).

 /com add + equip 2019 00 wield

 The + makes this /com a child of the previous command, and it will only be
 executed when the previous command was successfully performed.

 Now we check the structure with "/com list":

 1   Mobile  3086 (an assassin) (--/1/--/100%)
 `-- 2   Equip   parent wield    with 2019 (a longsword) (100%)

 Now we give him the thief follower, whom will load as a follower as long as
 there are no more than 3 thieves already in the zone.

 /com add fol 3083 030000

 We did not need to make the /com a child of the assassin's loading, because
 we are already there in the /com structure from loading the sword. We
 omitted the world limit and entered 03 as a zone limit and a 100% load chance.

 The /com list will now look like this:

 1   Mobile  3086 (an assassin) (--/1/--/100%)
 |-- 2   Equip   parent wield    with 2019 (a longsword) (100%)
 `-- 3   Follow  3083 (a thief) follows parent (--/3/--/100%)

 Now let's give the thief a dagger (o 2001), a sack (o 6001) and put 3 pieces
 of bread in the sack (o 8004).

 /com add + equip 2001 00 wield
 /com add give 6001 00
 /com add + put 8004 00
 /com add put 8004 00
 /com add put 8004 00

 The first line of these five puts us as a child to the thief in the structure
 and then proceeds to equip a wielded dagger, load a sack and put 3 loaves of
 bread in the sack. We have a "+" before the first bread to make the bread
 loading children of the sack.

 Our /com list with all this accomplished:

 1   Mobile  3086 (an assassin) (--/1/--/100%)
 |-- 2   Equip   parent wield    with 2019 (a longsword) (100%)
 `-- 3   Follow  3083 (a thief) follows parent (--/3/--/100%)
     |-- 4   Equip   parent wield    with 2001 (a dagger) (100%)
     |-- 5   Give    parent obj 6001 (a large sack) (100%)
         |-- 6   Put     8004 (a loaf of bread) in 6001 (sack) (100%)
         |-- 7   Put     8004 (a loaf of bread) in 6001 (sack) (100%)
         `-- 8   Put     8004 (a loaf of bread) in 6001 (sack) (100%)

 And let's accomplish the same commands with repeat instead. "/com kill 8", "7"
 and "6" and replace it with these two commands:

 /com add + repeat 3
 /com add + put 8004 00

 This makes a child to the creation of the sack, and sets a repeat of 3. The
 next command creates a child to the repeat and loads a loaf of bread. The
 loaf-loading will be repeated 3 times.

 The /com list:

 1   Mobile  3086 (an assassin) (--/1/--/100%)
 |-- 2   Equip   parent wield    with 2019 (a longsword) (100%)
 `-- 3   Follow  3083 (a thief) follows parent (--/3/--/100%)
     |-- 4   Equip   parent wield    with 2001 (a dagger) (100%)
     `-- 5   Give    parent obj 6001 (a large sack) (100%)
         `-- 6   Repeat  3 times
             `-- 7   Put     8004 (a loaf of bread) in parent (100%)


3.4. Frequently asked questions

- How do I remove a command?

  Simply type "/com kill <number>". If a command has children, they have to
  either be removed first, or the whole structure killed with the "+" command.
  Example: "/com kill 1 +" This will remove command 1 and all its children.

- What does the `-- at the start of a line in /com list mean?

  This means that the command is a child, and will only be performed if its
  parent command is successful.

- What does the > at the start of a line in /com list mean?

  This is an older version of a child in the command structure. It means
  the command will only be performed if its parent command is successful.

  /com list
  1 Load a shrub (8322) (--/--/1/100%)
  2 Put a berries (8300) in the shrub (8322) (--/--/2/100%)
  ^
  +--  Note NO `-- or > before this line.

  This means new berries will be loaded in the shrub, even if the shrub itself
  has not been taken (and thus is not loaded anew)

- My mobiles load with equipment I didn't set in /com. What's going on?

  Most likely, there is an eqclass associated with the mobile (/help eqclass)

  If you want to check if a mobile has an eqclass, type:
  "/eqclass mobile/<v-num> view", for example "/eqclass mobile/1176 view"

  Currently, if a mobile does not have an eqclass, the attempt to view it gives
  a bar arguments error message.

- Can I still give equipment to a mobile with an eqclass attached to it?

  Yes, the /com structure is performed before /eqclass.

- I made a long series of commands and I want to do them in several rooms. Is
  there a way to do this?

  Yes. "/help com copy"

    Chapter 4 - Mobiles: how to create/edit new mobiles.
    ====================================================

 4. Mobile
     1. Templates
     2. Modifications

This tutorial covers:

 * Mobile templates
 * Modifying keywords and descriptions
 * Setting various attributes
 * Advice on usage of flags

4.1. Templates

Each mobile has a set of fields which can all be changed. Therefore, when you
want to create a new mobile, you will receive a copy of an existing one but
with a new, unique, v-number. This is known as a template, and is obtained from
the Arata responsible for this. You should usually obtain templates via your
supervisor.

4.2. Modifications

*IMPORTANT*

As there are many mobiles with common keywords, in order to be sure you are
modifying the correct mobile, you must load the mobile explicitly using its
v-num, and then carry out modifications with the mobile in the same room as
yourself.

Assume the template is currently a hobbit.

First of all the mobile keywords should be changed. The keywords are those
words which will be used to manipulate the mobile, both for you and players. As
an example, if a cityguard was to be created, it's likely that its keywords
would be cityguard, guard, and maybe city. This is a simple operation:

> /mob hobbit keywords cityguard guard

From now on guard or cityguard must be used to manipulate the mobile, even
though everything else about the mob including descriptions says it is a
hobbit.

The first keyword must be the most characteristic noun with the proper
capitalization; i.e., capitalized for proper nouns ("Elrond") and probably all
lowercase for other nouns ("cityguard").

If a keyword contains a hyphen, it must come before any of its parts. orc-guard
must be listed before orc or guard. It is unnecessary to include the hyphenated
word if all the parts are already present.

Next to change is the mob's short description. This is the text used when the
mobile does something, such as enters or leaves a room, attacks, or performs
some social action.

> /mob guard short the cityguard

Never capitalise the first word (the), as the game will do this if it appears
at the start of a line. If you do capitalise it, it will remain so even if used
in the middle of a line of text, e.g. You hit The cityguard hard.

The short description will be similar to the keywords, but it is important to
note the difference. Whatever is in the short description is irrelevant to the
words used to handle the mobile. Next to change is the mobile's long
description. This text is seen when a look is performed. E.g.

> /mob guard long
Enter description
A tall, well armoured {cityguard} stands here
==>

Use {...} to mark up the "character name" part of the long descriptions. You
can use {o:...} to have this character use object markup, or {} (somewhere) to
suppress markup entirely.

This text should usually start with a capital letter. A period (.) will
automatically be appended, so don't add one yourself.

To change the description seen when the mobile is looked at, use /mob desc.

> /mob guard desc
Enter your description:
: The guard standing before you is dressed head to toe in fine quality metal
: armour. He stands with a sword at his side, not far from his grasp should
: he need to use it.
: %e

There are many other fields which may be changed, see /help mob ? for more
details.

The mobile can be affected by two sets of flags. There are the normal flags and
the action/NPC flags. Normal flags are shared with players and include things
such as spell effects. See /help flag type and /help mob flags.

> /mob guard flags +BLESS +SANCTUARY

NPC behavior can be modified using /lib, which will be explained further in
chapter 6.

> /lib m <number> add sentinel

To add other flags to the mob use the same command, but this time with the new
flag you want to add to it.

Other fields are explained in /help.

    Chapter 5 - Objects: how to create/edit new objects.
    ====================================================

 5. Object
     1. Templates
     2. Wear flags
     3. Extra flags
     4. Affect flags
     5. Object type and values
     6. Other flags

This tutorial covers:

 * Object Templates
 * Renaming and modifying objects
 * Object types
 * Object affects, wear and extra flags
 * Object type and values

5.1. Templates
--------------
IMPORTANT

As there are many objects with common keywords, in order to be sure you are
modifying the correct object, you *must* load the object explicitly using its
v-num, and then carry out modifications with the object in the same room as
you, or carried by you and first in your inventory list.

Similarly to mobiles, all objects have their own unique v-number and templates
will be obtained by creating a copy of an old object. Modifications to this
object can be made to create a new one.

We will assume that our template is a longsword, and we wish to make a lantern.
First the object should be renamed to something suitable. As with mobiles, the
name can have synonyms.

> /obj longsword name lantern brass

Note that the first keyword should be the default keyword. It must fit well
into a sentence: You hold the <keyword>.

Next, the object type should be established. Currently if /stat the object, it
will show up as Object Type: WEAPON. By quickly viewing /help obj type, it is
clear the lantern should be type LIGHT.

> /obj lantern type light

Now it must have its descriptions altered. First of all the short description.
This is identical as to mobile short descriptions, the text used is seen when
the object is picked up, and when it is seen in the inventory.

> /obj lantern short a brass lantern

The short description should almost always start with one of a, an, the, some,
or several.

The long description is next to be changed, and again similarly to mobs, this
text is seen with the room description.

> /obj lantern long A shiny {brass lantern} lies here

Use {...} to mark up the "object name" part of the long descriptions.

N.b., the description must be placed on the same line, unlike /mob long where
the editor is started.

An object must also have a flag saying what type of "countable mode" it is. The
following are availble, with an example expression involving an object's first
keyword:

  the      single objects (a longsword)
  pair     pairs of objects (the pair of gauntlets)
  several  countably many (several berries)
  some     uncountables (some wood)

By looking at your object's first keyword, pick the first category in the list
above, into whose sample sentence it would fit.

The lantern should clearly be in category the, as "the lantern" works perfectly
well:

> /obj lantern count the

Note that a pile of ... should also have category the.

Description keywords can be added to the object, for example if the object was
"a runed plaque", you might want to look runes or look plaque. These are
handled in the same way as /room keywords.

> /obj lantern kadd lantern         /* Can be removed with /obj kkill */
> /obj lantern kdesc
Enter your description:
 The lantern is partially filled with oil, and has a solid look to it.

The next things to modify are the flags. There is a group of flags for various
changes, as given below.

5.2. Wear flags
---------------
These flags allow a player to manipulate the item in certain ways. Some
examples of possible flags and their meanings are:

  take    Item can be taken.
  finger  Can be worn on a finger (rings usually)
  neck    Can be worn around neck.
  body    Can be worn on body.
  head    Can be worn on head.

Type /obj lantern wear-flag for the full list.

5.3. Extra flags
----------------
These flags add special properties to the object. To make the object glow, hum,
show an aura with 'detect magic', unusable by evil/good/neutral players, these
flags must be set. (See /help obj extra).

5.4. Affect flags
-----------------
An object can have two affects, each given by the /obj affect 0|1 command, the
0 and 1 specifying which affect flag to change. The list of affects can be
found in /help obj affect. Such affects could be APPLY INT which would increase
the user's intelligence by the given value while the object is in the equipment
(not inventory).

> /obj wand affect 0 3 5      /* Increase user's Int by 5 */

A special affect is the FLAG, number 6. The modifier in this case will be a
flag as found in '/help flags'. These flags can be spell effects or player
effects.

> /obj wand affect 1 6 6      /* Player receives Sanctuary affect */
> /obj wand affect 1 6 21     /* Player receives NOTELL affect */

N.b., none of these affect flags should be used without permission.

5.5. Object type and values
---------------------------
As stated earlier, each object has a single TYPE which is defined with /obj
type. Each object type has 4 different values which can be set, and the effects
of these values differ from object type to object type. The values are changed
by /obj val0, /obj val1..../obj val3. The complete list of value affects is
posted on the builders' board in room 16. They are not in the standard Ainur
help file as yet.

Weapons, for instance: you should first set the object type to "weapon": /obj
myweapon type 5.

Then you can set its 1-handed and 2-handed statistics separately:

/obj myweapon
  ob1 / ob2      <-128..127>       ob while wielded 1h or 2h
  pb1 / pb2      <-128..127>       pb while wielded 1h or 2h

See /help obj val for more information.

5.6. Other flags
----------------
To set the weight of the object, use /obj weight.

To set the rent cost of the object, use /obj rent (Copper pennies)

To set the value/cost (for shops) of the object, use /obj cost (Copper pennies)

> /obj lantern weight 0.5 kg
> /obj lantern rent 50
> /obj lantern cost 350

    Chapter 6 - /lib: how to liven things up a bit.
    ===============================================

6.  Lib
  1.  Function
  2.  Adding commands
  3.  Setting arguments
  4.  Getting help
  5.  List of commands

This tutorial covers:

  o Setting up library commands
  o Modifying arguments specific to each command
  o Loading the new commands
  o How to make new libraries

6.1. Function

The purpose of /lib is to add standard mudlle functions to a mobile, object
or room using simple commands. For example, the aggressive_but command
can be added to a mobile to prevent it from attacking given races or classes.
The scope of /lib is very wide, and will continue to expand in the future.

6.2. Adding commands

Adding a library command is simple, it requires a single command:

>  /lib mob 1000 add aggressive
>  /lib mob 2000 add converse
>  /lib room 1000 add hide_exits

The general format is: /lib 0 v-num command name

Each command will be given a number which will be used later to set certain
fields, or to remove the command etc.

In order for commands to take effect they must be loaded. This is another
simple operation:

> /lib mob 1000 load

6.3. Setting arguments

Each library command has a set of arguments which need to be set to make
the command work as was intended. For example, for the aggressive command,
the races that the mobile shouldn't be agressive to, neet to be
listed. This is done using the set option of /lib.
Suppose mobile 1000 should be aggressive to everyone except Hobbits.

> /lib m 1000 add aggressive         /* This adds the command */
Command aggressive added at position 1.

> /lib m 1000 set 1 very no
Changing command aggressive (position 1)
Note that the old /lib aggressive_but has changed to /lib aggressive. To define
the sides
that your mob is aggressive to, try /help sides. In this case you should edit
your mob:
/mob <mymob> side halfling.

Note that if you put the aggressive flag on a mob and edit it on 'yes', then
the mob will
be aggressive to anyone on any side .

> /lib m 1000 list
Commands on mobile 1000(mobile_name):
 aggressive
  very?:no

Most of this should seem quite simple. The command is added at position 1,
so set takes the argument 1 as its position.

The first obvious question to this, is how do you know which options to set
for a command, and what each option does? The answer is /lib help.

One of the most common libs you will use is dir_desc. This sets descriptions
that players will see when the look <dir> in a room. This lib can be applied
to any direction in a room. Lets see how it works:

First go to the room you want to add the lib to (there are other ways but
this is by far the easiest) :

/lib room here add dir_desc
/lib r h 1 dir east                /* room here can be abbreviated to r h */
                                 /* 1 refers to the first lib in the room */
                  /* dir is one of the options that can be set in the lib */
                   /* and east is the value we are setting that option to */
You will then get the editor where you can enter the text for the direction
in the same way to did for /room desc.

Alternatively to do it in one line:
/lib r h add dir_desc dir south

*Note*  You only need to add this lib once. You can set all 6 directions from
just the one lib load. If you load the lib more than once you will see the
direction description multiple times when you do a look.

Once you have completed your libs for a room you must load them before they
can take effect:
/lib r h load

To check what libs are loaded in a room:
/lib r h list


6.4. Getting help

Getting help on a library command couldn't be simpler. Simply use
/lib help command_name

> /lib help aggressive
Help for library command aggressive:
Be aggressive according to sides.
If very? is true, be aggressive to everyone of any different side.

The same goes for each library command. The help will tell you what the
command is for, and what each of the options do.
The next question is how do you know which commands exist in the first place?
One option is to check board 16, the easy option is simple:

> /lib commands
Gives you the list of all /lib commands available in MUME building.

Another way, that works with any of the newer /-commands that support
MUME's standard command parsing, is to end the line with one or two
question marks. This will show you all possible ways of continuing the
line in a (syntactical) correct way. For example:

> /lib ?
   choice number ...
   choice list
   help lib policy
   commands

> /lib ??
/lib
   mobile|object|room number
     list
     add lib policy rest of line
     remove number
     set number string rest of line
     load
   mobile|object|room list
   help lib policy
   commands

As you can see, adding two question marks shows a more extended help text.
The text you get with one question mark is identical to the one you get when
you type something illegal.
This method for getting help on syntax is very useful when you are changing
parameters of an installed /lib command that has a somewhat unclear or complex
format.

6.5. List of commands

The most up-to-date information is always available with the /lib commands
and the /lib help <command> commands. If you need a new /lib command, please
write a note on board 27 (the mudlle board).

    Chapter 7 - Shops: modifying a shop within your zone.
    =====================================================

7. Shop

This tutorial covers:

  o Creating a shop
  o Modifying shops
  o Shop policies


This tutorial differs from others in that /shop is far less used than the other
commands, in fact few builders will use it.
The command is only available for Maia Shapers and above. To modify a shop
needs access to the zone where the shop is found. Only Valar and above can
create new shops.

Creation of a shop is simple.  Each shop has a unique name to identify it,
similarly to mobiles and objects having a unique v-number.
> /shop create Thbd-Grocer       /* Shops should be named in in std format */
> /shop list                     /* Will show all MUME shops */
Once a shop has been created, it must be assigned to a room or, less commonly,
a mobile. It must also have a shopkeeper, who has appropriate mudlle.
If the shop is assigned to a mobile, then trade can only occur when the player
is in the same room as the mobile, regardless of the room. If the shop is
assigned to a room then trade can only take place in that room.

Assuming the shop is wanted in room 3612:
> /goto 3612
> /shop Thbd-Grocer room 3612     /* Assign the shop to room 3612 */
> /shop here mobile no            /* The shop is not linked to its keeper  */

Or if the shop is wanted to be linked to the shopkeeper, whose v-num is 1234,
and is found in room 4000 at reboot:

> /goto 4000
> /shop Thbd-Grocer room 4000
> /shop here mobile yes

Each shop must have a keeper, whether it is linked to a room or the keeper
himself. The shopkeeper needs mudlle to define him as a shopkeeper.

> /shop here keeper 1234           /* Shopkeeper v-num being 1234  */

To set what the keeper will BUY from players and what he will mend, the object
TYPE must be set. That is, if he will buy one weapon, he will buy all of them.
(As they carry the same object type). If what is bought is not on his produce
list (see later) then he will have only as many as he has bought to sell.
Hence selling a shopkeeper a black runed dagger will mean he will only have
one back to sell.

> /shop here buy add LIGHT TRASH CONTAINER OTHER
> /shop here mend add OTHER

This would make the shop buy all objects contained in the four above types,
and mend any object having the 'OTHER' type.

To set what the shopkeeper will sell as standard
what he will have at reboot
and what he will have limitless supplies of, the produce list must be set.
In this case object TYPES could clearly not be used, instead individual objects
are added using their v-numbers. What he sells does not have to be on his buy
or mend list. If for example he sold object 8004 (loaf of bread), he would not
buy it back as 'FOOD' type is not on his buy list.
*NOTE* Objects sold are no longer held by the shopkeeper but stored in room
37. This room is security flagged to protect it, as any purging there will
result in all shops being disabled until next reboot.

> /shop here produce add 8004

In order to decide on how much he charges for items, and how much he will sell
items for, his trade fields must be set. Each object has a value as set by the
command '/obj cost'. This value is modified by the values found in the shop's
trade entries. Profit_Buy is the modifier applied to the cost of buying an
object from the shop, Profit_Sell the modifier applied to selling an object.
Profit_buy should always be set above profit_sell, or the shop would be making
a loss. Each modifier is '(modifier/1000) * object_cost'

> /shop here trade profit_buy 1500
> /shop here trade profit_sell 500

The shop would charge 1500/1000 * the object cost. (I.E. 150%) and would
pay 500/1000 * the object cost (I.E 50%)

In order to define when the shop is open and closed, '/shop hours' is used. It
is followed by a list of times in the 24-hour clock notation. It alternates
between opening and closing times.

> /shop here hours 6 12 15 18   /* Shop opens at 6am until 12 midday  */
                                /* Re-opens at 3pm, closing at 6pm    */

If you want the shopkeeper to close and lock his shop when he closes, make
sure the shop has exactly one exit, which is a door with key number 7107
(which is the shopkey). Do not load the shopkeeper a key - mudlle will
provide him with one. Also - do not give him anything to hold (since he
will hold the key).

The shopkeeper will NOT throw out any mobile that is following him, thus you
can load mobile assistants to the shopkeeper that won't get thrown out.

Warning. Opening and closing hours have no effect if the shop is mobile.


All that is left to do is to set the shop's policies. This is fairly
complicated, and currently few policies exist. The most important one to set
is the 'deal' policy. This affects who the shop will deal/trade with, and
who it won't. By using '/policy deal list', the various options within this
policy are listed. In order to set the deal policy options, /shop policy is
executed.

> /shop here policy deal standard races elf human hobbit dwarf classes thief

Deal is the policy being used, and the standard option is being set. This
shop would only deal with the races and classes listed.

> /shop here policy deal alignment 500 1000

The deal policy is being affected again, with the alignment option being set
so that the shop will deal only with good characters.

Other policies existing are 'mend', 'buy' and 'sell'. The options available
are listed with '/policy <name> list'.

    Chapter 8 - Edition: note of modifications since first version.
    ===============================================================

8.  Version

MUME GUIDE TO BUILDING

Created 27/9/94 - 30/9/94


10/94   Copied the info in a Mudlled guide. Minor modifications (Manwe)
10/94   LIB and MISC info. added (Ariakas)
11/95   Updated /com to new options. Other minor updates. (Ariakas)
03/98   Moved to /mi books format (Meryaten)
03/98   Text expanded and brought up to date (Mint, Meryaten)
08/99   Updated changes in commands (Hobbi)
07/02   Fully revised and updated (Shalin, Liliah, Mujahid, VairÃ«)

    Chapter 9 - Miscellaneous.
    ==========================

9.  Miscellaneous

9.1  Acknowledgements

 -- /mi books code by DÃ¡in.
 -- Original Guide mudlle written by Vivriel.
 -- Cancan created by Yorick, with modifications by Vivriel & Thuzzle.
    Maintained by Ilie, may be obtained by anonymous ftp from
    ftp.pvv.unit.no. Current version is 2.5.1e.
 -- Powwow is a new client based on the Cancan code, but includes further
    enhancements such as variables. This is more useful as a 'game-playing'
    client.
 -- Recently a new windows client called Powtty has been released. This is
    based on the powwow client but has many more advanced features such as
    support for local editing. More information can be found in the Powtty
    documentation.


9.2.  Using Cancan

See 'cancan.doc' for information about how to operate the client.

Local Editing
-------------

Cancan can be used to remove the necessity of using the awkward and MUME
line editor. When you do any editing on the game, if your editor is set
to 'mume', you will instead use your own default editor, or that specified
in the shell environmental variable 'CANCANEDITOR'. If you put a & symbol
before the editor name, it will be run in the background. Hence you will
be able to edit a piece of text whilst going about your normal business on
The implications of this are clearly very useful.

Examples

i.   Using the default editor
     Simply login as normal, change edit mume, #identify and edit away.

ii.  Using my favourite editor (e.g. emacs)
     Set the variable CANCANEDITOR to emacs and do the above. In (t)csh,
     this is simply: setenv CANCANEDITOR 'emacs'

iii. Using my favourite editor in the background
     This can only be done if you can have multiple windows. If you wanted
     a texteditor window to open each time you did some editing, it would
     be as follows: setenv CANCANEDITOR '&textedit'

iv.  Using emacsclient
     Open emacs as normal, either in its own window or an xterm window.
     Type M-x server-start. Then in your cancan window, set the CANCANEDITOR
     variable to '&emacsclient'.
     When you edit now, the permanently opened emacs window will receive the
     text you wish to edit, and it will be restored when you have finished.
     This is useful as it means the emacs window does not have to be opened
     and closed each time you wish to do some editing.

+ *( C iMw NN NS 3150[31:50]>