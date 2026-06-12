# MUME Shaper Mode Mudlle /mhelp Reference

This guide contains locally stored MUME building help pages for Mudlle, retrieved directly from the live game server.

## Table of Contents

- [#ARITH](#arith)
- [/LIBRARY](#library)
- [ADDING /LIBRARIES](#adding-libraries)
- [ADDING COMMANDS](#adding-commands)
- [AFFECTS](#affects)
- [ANSI COLORS](#ansi-colors)
- [ARG_](#arg)
- [ARITHMETIC](#arithmetic)
- [ARITHMETIC MODES](#arithmetic-modes)
- [BEHAVIOR TREES](#behavior-trees)
- [BEHAVIOR TREES BEST PRACTICES](#behavior-trees-best-practices)
- [BEHAVIOR TREES CONCEPTS](#behavior-trees-concepts)
- [BEHAVIOR TREES DEBUGGING](#behavior-trees-debugging)
- [CHARACTER CLASSES](#character-classes)
- [CODE REVIEWS](#code-reviews)
- [COMMANDS](#commands)
- [COMMON MISTAKES](#common-mistakes)
- [CONTAINER TYPES](#container-types)
- [COORDINATES](#coordinates)
- [CPARSER](#cparser)
- [DEBUG](#debug)
- [DIPHASH](#diphash)
- [DIRECTORIES](#directories)
- [DOCUMENTATION](#documentation)
- [EMACS](#emacs)
- [ESCAPE CODES](#escape-codes)
- [EVENT DATA](#event-data)
- [EVENT LIST](#event-list)
- [EVENTS](#events)
- [EXIT](#exit)
- [FOR](#for)
- [HEARTBEAT](#heartbeat)
- [HELP STRINGS](#help-strings)
- [INTRODUCTION](#introduction)
- [INTRODUCTION LANGUAGE](#introduction-language)
- [INTRODUCTION MUME](#introduction-mume)
- [LABELS](#labels)
- [LISTS](#lists)
- [LOCK](#lock)
- [LOOPS](#loops)
- [MARKUP](#markup)
- [MATCH](#match)
- [MCOM](#mcom)
- [MENU](#menu)
- [MODULE DATA](#module-data)
- [MODULES](#modules)
- [MOON](#moon)
- [MUDLLE DIRECTORIES](#mudlle-directories)
- [MUDLLE LIBRARIES](#mudlle-libraries)
- [MUDLLE-MODE.EL](#mudlle-mode-el)
- [MUDLLING MAIAR](#mudlling-maiar)
- [MUDLLING MAIAR ACCESS](#mudlling-maiar-access)
- [MUDLLING MAIAR DESIGN](#mudlling-maiar-design)
- [MUDLLING MAIAR EXCEPTIONS](#mudlling-maiar-exceptions)
- [MUDLLING MAIAR GRANT](#mudlling-maiar-grant)
- [MUDLLING MAIAR PRIMITIVES](#mudlling-maiar-primitives)
- [MUDLLING MAIAR SECURING](#mudlling-maiar-securing)
- [MUDLOAD](#mudload)
- [NOTEPAD++](#notepad)
- [OPERATOR PRECEDENCE](#operator-precedence)
- [OPERATORS](#operators)
- [OPTIMISTIC LOCK](#optimistic-lock)
- [PARSER](#parser)
- [PARSER ARGUMENTS](#parser-arguments)
- [PATTERN MATCHING](#pattern-matching)
- [PATTERNS](#patterns)
- [PERSISTING DATA](#persisting-data)
- [POWWOW](#powwow)
- [PROPAGATE](#propagate)
- [REACT_GIVE](#react-give)
- [REVIEWS](#reviews)
- [SCHEDULER](#scheduler)
- [SECLEVELS](#seclevels)
- [SPEC](#spec)
- [STORYTELLERS](#storytellers)
- [STRFTIME](#strftime)
- [SYNTAX](#syntax)
- [TELL](#tell)
- [TEMPERATURE](#temperature)
- [TESTING](#testing)
- [TEXT MARKUP](#text-markup)
- [TIME](#time)
- [TYPES](#types)
- [VARIABLES](#variables)
- [VIM](#vim)
- [WEATHER](#weather)
- [WEATHER MESSAGES](#weather-messages)

---

## #ARITH

```text
#ARITH, ARITHMETIC, ARITHMETIC MODES

By default, mudlle's arithmetic and comparison operators -, *, <=, /=, etc.
only work on integers. The plus operator (+) also works on strings for
concatenation.

Using #arith(<mode>) [ ... ] you can change this behavior inside the code
block. <mode> can be (an abbreviation of) one of the following: bigint,
default, float, integer, or overflow.

default and integer are identical except that the latter doesn't allow + to do
string concatenation.

overflow works like integer, except that integer over- or underflow will cause
runtime errors. This is implemented by calling the overflow:<xxx>() primitives
when necessary.

bigint and float change all the operators to operate on bigint or
floating-point numbers, respectively.

These operators are affected:

  | ^ & << >> ~   invalid for floating-point
  + - * / %       normal binary arithmetic
  -               unary negation
  ++ --           prefix and postfix increment/decrement
  < <= == >= >    comparison

All corresponding compound assignments (+=, *=, etc.) are also affected.

Examples:

  #arith(f) [ x + y / z ]       <=>      fadd(x, fdiv(y, z))
  #arith(b) [ a > b ]           <=>      bicmp(a, b) > 0
  #arith(f) [ f += g ]          <=>      f = fadd(f, g)
  #arith(o) [ a * b ]           <=>      overflow:mul(a, b)

Tip: keep the affected block as small as possible, and remember that all listed

operators are affected. The following is broken:

  #arith(b) [ sum += v[++i] ]   <=>      sum = biadd(sum, v[i = biadd(i, 1)])

#arith blocks can be nested, but it's best to avoid it for readability.
```

## /LIBRARY

```text
/LIBRARY, ADDING /LIBRARIES

Non-mudllers can include calls to predefined mudlle "commands" via the /lib
command.

Defining a new command is supposed to be reasonably easy, the main task being
to provide parsing & display functionality for the arguments of your new
command. You must also include some documentation.

Here is an example, the only existing command:

lib:simple_command(
  "aggressive_but",
  "aggressive except against certain players",
  """Makes a mobile aggressive against all players except those in specified
  classes and races. This command takes 3 arguments:
    `classes    \tlist of classes mobile not aggressive to
    `races      \tlist of races mobile not aggressive to
    `frequency  \tfrequency at which mobile checks for player (in seconds)
  Don't use less than 5.""",
  sequence(
    "classes"   . arg_classes . null,
    "races"     . arg_races   . null,
    "frequency" . arg_number  . 10),
  fn (@[cls race freq]) aggressive_but(cls, race, freq));

There are 2 main components to this specification (beyond the documentation):

 * The arguments: each command has a fixed number of named arguments. With
   lib:simple_command(), you just give the argument's name, an arg_xxx that
   parses the appropriate type of value, and the default value for this
   argument (for when the command is created). See the message about the parser
   for information on predefined arg_xxx arguments.

 * The building function: this is called every time the mobile/object/room's
   code is loaded, be it at boot time, when load_mobile/object/room is called
   or when /lib m|o|r n load is used.


   The function receives a signle parameter, a vector of the values of the
   command's arguments (in the same order). This call behaves as if it were in
   the mudlle file; i.e., react_event() will work as expected.

Note the values of the command's arguments are the values returned by arg_xxx,
not the actual strings specified by the user.

See documentation on lib:simple_command() and lib:add_command() for more
details.

What can you do if you can't find an appropriate arg_xxx for one of the
arguments of your marvellous new command ?

2 solutions:

 a. define a new arg_xxx. Look in utility/parser.mud, after the comment
    explaining the use of the parser for a description of the format of
    arg_xxx. Look in utility/arguments.mud for examples.

 b. Use lib:add_command(). This is similar to lib:simple_command(), but each
    argument is specified by 2 functions: the parsing function and the display
    function.
```

## ADDING /LIBRARIES

```text
/LIBRARY, ADDING /LIBRARIES

Non-mudllers can include calls to predefined mudlle "commands" via the /lib
command.

Defining a new command is supposed to be reasonably easy, the main task being
to provide parsing & display functionality for the arguments of your new
command. You must also include some documentation.

Here is an example, the only existing command:

lib:simple_command(
  "aggressive_but",
  "aggressive except against certain players",
  """Makes a mobile aggressive against all players except those in specified
  classes and races. This command takes 3 arguments:
    `classes    \tlist of classes mobile not aggressive to
    `races      \tlist of races mobile not aggressive to
    `frequency  \tfrequency at which mobile checks for player (in seconds)
  Don't use less than 5.""",
  sequence(
    "classes"   . arg_classes . null,
    "races"     . arg_races   . null,
    "frequency" . arg_number  . 10),
  fn (@[cls race freq]) aggressive_but(cls, race, freq));

There are 2 main components to this specification (beyond the documentation):

 * The arguments: each command has a fixed number of named arguments. With
   lib:simple_command(), you just give the argument's name, an arg_xxx that
   parses the appropriate type of value, and the default value for this
   argument (for when the command is created). See the message about the parser
   for information on predefined arg_xxx arguments.

 * The building function: this is called every time the mobile/object/room's
   code is loaded, be it at boot time, when load_mobile/object/room is called
   or when /lib m|o|r n load is used.


   The function receives a signle parameter, a vector of the values of the
   command's arguments (in the same order). This call behaves as if it were in
   the mudlle file; i.e., react_event() will work as expected.

Note the values of the command's arguments are the values returned by arg_xxx,
not the actual strings specified by the user.

See documentation on lib:simple_command() and lib:add_command() for more
details.

What can you do if you can't find an appropriate arg_xxx for one of the
arguments of your marvellous new command ?

2 solutions:

 a. define a new arg_xxx. Look in utility/parser.mud, after the comment
    explaining the use of the parser for a description of the format of
    arg_xxx. Look in utility/arguments.mud for examples.

 b. Use lib:add_command(). This is similar to lib:simple_command(), but each
    argument is specified by 2 functions: the parsing function and the display
    function.
```

## ADDING COMMANDS

```text
ADDING COMMANDS, COMMANDS

It is possible to define global user & god commands from mudlle. However,
before you all jump in & start coding, a word of warning from Manwë:

New commands may not be added without consulting the appropriate authorities
(the appropriate authorities remain to be defined, presumably to be chosen as
some subset of the Arata & Implementors - contact Manwë for details). Gods who
ignore this procedure will have to suffer Manwë's wrath and suffer the
consequences ...

Adding god commands should not present any particular problems (as long as some
security precautions are considered), but user commands should be preceded by
careful thought & discussion (maybe here, on the board in 1, or on the mudlle
mailing list).

After all these government health warnings, here comes some substance:

To add a god command, call the following function in one of your general files:
  define_god_command("commandname", level, function)

commandname should not include the /. level should be one of LVL_CARTOGRAPHER
through LVL_IMPLEMENTOR. function will be called with two arguments:
function(who, args)

where who is the person who typed the command, and args is a list of the words
of its argument (as produced by split_words).

If you use this function to override a builtin god command, beware of my wrath
:-). To list all mudlled god commands, do /mudlle list_god_commands().

Adding a user command is similar:
  define_command("commandname", position, function)
  define_acommand("commandname", min_match_length, position, function)

position is the minimum position in which the command can be used;
min_match_length is the length of the shortest abbreviation a player can use;
the other parameters are the same.


Mudlled user commands (e.g., lead) normally cause reactions as follows:
 * Send event_command (me, who, 0, "lead horse") to character surroundings
 * Check if overridden
 * Call mudlled implementation of the command

If someone with access to the C code adds cmd_lead to the C parser, then:
 * Send event_command (me, who, cmd_lead, " horse") to character surroundings
 * Check if overridden
 * Send event_command(me, who, 0, "lead horse") to character surroundings
 * Check if overridden
 * Call mudlled implementation of the command

Once the C version exists, you can replace the previous calls with
  define_ccommand(cmd_xxx, position, function)

In this case, event sequence becomes the same as for a C command:
 * Send event_command(me, who, cmd_lead, " horse") to character surroundings
 * Check if overridden
 * Call mudlled implementation of the command

/mudlle list_commands() will list all mudlled user commands (it is not possible
to redefine an existing command this way).
```

## AFFECTS

```text
AFFECTS

To define an affect in mudlle, there are two steps:

 1. The behaviour of a particular kind of affect must be defined with
    define_affect().

 2. Add an instance of this affect to a character with char_add_affect!().

A simple example:

  define_affect(
    "test", "a test affect",
    // the effects function:
    fn (who, x) char_affect_int(who, x),
    // the tick function, called once a minute:
    fn (who, x) send_wrap(who, "You still feel stupid!"),
    // the start function, called when the delay expires:
    fn (who, x) send_wrap(who, "Hah! I've made you stupid!"),
    // the end function, called when the duration expires or the
    // affect is removed
    fn (who, x) send_wrap(who, "Bah! You're not really any better now."),
    // the print function for info
    fn (who, x, duration) "feeling stupid",
    // the display function for /stat
    fn (to, who, x) format("Stupidity, int %f", x),
    // the examine function
    fn (to, who, x) [
      act(TO_CHAR, IF_ACTOR, to, "$N seems a bit daft today.", who)
    ])

This affect can be placed on a player with:

  char_add_affect!(get_player("nada"), "test", -3.14, 2, 5 * loops_per_minute)

will make Nada stupid (decreating Int by 3.14 points) starting in 2 loops, for
5 (RL) minutes.


See /mlib man define_affect for much more information.
```

## ANSI COLORS

```text
ANSI COLORS, ESCAPE CODES, MARKUP, TEXT MARKUP

Text markup (as controlled by change colour) is handled by sending special
escape sequences inside output. These escape sequences are converted by
render_text() to either ANSI codes, XML markup, or nothing depending on the
player's terminal mode.

The escape sequences have the following formats:

  \033< <code> > ... \033</ <code> >
  \033</ <code> >

where <code> is the markup number (which is the CI_xxx constant plus one). The
start and end sequences are returned by start_color() and end_color(),
respectively.

The %( and %) format() conversions also return the same.

<code> can be followed by &-prefixed, ;-separated tag arguments:

  \033<123&abc=def;ghi=jkl>

where the supported (typically not emitted by mudlle) arguments are:

  Tag          | Arguments
  -------------+--------------------------------
  mt_highlight | &<code>
  mt_movement  | &dir=<dir>
  mt_snoop     | &symbol=<prefix>
               | or &symbol=<prefix>;time=<time>

The renderer also handles standard ANSI codes:

  \033[ [^a-z]* [a-z]

Use slength_noansi() to return the length of a string, not counting any escape
sequences.
```

## ARG_

```text
ARG_, PARSER ARGUMENTS

Arguments to be used in parser() and misc-command syntax trees.

Do not use () after those arg's that do not require parameters. Example:
"arg_range(0, 100)" vs "arg_race".

All argument names are prepended with arg_.

arg_ name         Params   Matches                                      Return
=========         ======   =======                                      ======
abbrev            s, n     Abbreviation of s with at least n chars      s
bitset            v1, v2   Words representing bits in an integer        i
boolean           ------   Boolean value (yes/no, true/false)           0, 1
change_help       ????
character         SEARCH_* A character (see help(find))                 p
choice            v, [s]   One of the words in v. Helptext s.           i
class             ------   Character class (A/C/T/W/R). Obsolete.       CLASS_*
classes           ------   List of character classes. Obsolete.      '(CLASS_*)
command           ------   A command name.                        CMD_* . "cmd"
complex_list      ????
complex_vector    ????
data_type         ------   ????
data_types        ------   ????
direction         ------   Direction name.                              0...5
disease           ------   Poison/disease name.                         DIS_*
float             ------   Floating-point number.                       f
float_range       f1,f2,[s]Float between f1-f2. Helptext s.             f
fortress          ------   Fortress name.                               "name"
group_id          ------   Mail destination.                         pnum|GID_*
herb              ------   Ingredient number.                           vnum
herblore          ------   Herblore name.                               lorenum
herbs             ------   List of ingredient numbers.                  '(vnum)
ignore            ????
language          ------   Language name.                               LAN_*
level             ------   Level number or name.                        n
line_string       ????
list              ????

mobile_number     ------   Vnum of existing mobile.                     vnum
money             ????
month             ------   RL month name.                               0...11
number            ------   Integer.                                     n
object            ????
object_number     ------   Vnum of existing object.                     vnum
objtype           ------   Object type (armour, worn...)                ITEM_*
objtypes          ------   List of obj types.                         '(ITEM_*)
old_races         ------   List of races.                             '(RACE_*)
one_of            ????
option            ????
optional          ????
percent           ------   ????
player            ------   Player name.                                 pnum>0
policy            ????
race              ------   Race name.                                   RACE_*
races             ------   List of races, or all/evil/good.           '(RACE_*)
range             n1,n2,[s]Integer between n1-n2. Helptext s.           n
rest              ------   ????
room_number       ------   Room number, room id or "here".              n
script            ------   ????
sector_type       ------   Room sector type.                            SECT_*
select_branch     ????
skill             ------   Skill name.                       SKILL_* or SPELL_*
social            ------   Name of a social command.                    CMD_*
string            ------   Any single word.                             s
subraces          ------   List of races/subraces/all/good/evil [(races)(subr)]
subset            ????
town              ------   Town name.                                   TOWN_*
towns             ------   List of town names.                        '(TOWN_*)
weapon_type       ------   Weapon type (slash, crush...)         WEAPON_TYPE_*
weapon_types      ------   List of weapon types.               '(WEAPON_TYPE_*)
zone_area         ------   Geographical area name.                     area num
zone_number       ------   Number of existing zone.                     n
```

## ARITHMETIC MODES

```text
#ARITH, ARITHMETIC, ARITHMETIC MODES

By default, mudlle's arithmetic and comparison operators -, *, <=, /=, etc.
only work on integers. The plus operator (+) also works on strings for
concatenation.

Using #arith(<mode>) [ ... ] you can change this behavior inside the code
block. <mode> can be (an abbreviation of) one of the following: bigint,
default, float, integer, or overflow.

default and integer are identical except that the latter doesn't allow + to do
string concatenation.

overflow works like integer, except that integer over- or underflow will cause
runtime errors. This is implemented by calling the overflow:<xxx>() primitives
when necessary.

bigint and float change all the operators to operate on bigint or
floating-point numbers, respectively.

These operators are affected:

  | ^ & << >> ~   invalid for floating-point
  + - * / %       normal binary arithmetic
  -               unary negation
  ++ --           prefix and postfix increment/decrement
  < <= == >= >    comparison

All corresponding compound assignments (+=, *=, etc.) are also affected.

Examples:

  #arith(f) [ x + y / z ]       <=>      fadd(x, fdiv(y, z))
  #arith(b) [ a > b ]           <=>      bicmp(a, b) > 0
  #arith(f) [ f += g ]          <=>      f = fadd(f, g)
  #arith(o) [ a * b ]           <=>      overflow:mul(a, b)

Tip: keep the affected block as small as possible, and remember that all listed

operators are affected. The following is broken:

  #arith(b) [ sum += v[++i] ]   <=>      sum = biadd(sum, v[i = biadd(i, 1)])

#arith blocks can be nested, but it's best to avoid it for readability.
```

## ARITHMETIC

```text
#ARITH, ARITHMETIC, ARITHMETIC MODES

By default, mudlle's arithmetic and comparison operators -, *, <=, /=, etc.
only work on integers. The plus operator (+) also works on strings for
concatenation.

Using #arith(<mode>) [ ... ] you can change this behavior inside the code
block. <mode> can be (an abbreviation of) one of the following: bigint,
default, float, integer, or overflow.

default and integer are identical except that the latter doesn't allow + to do
string concatenation.

overflow works like integer, except that integer over- or underflow will cause
runtime errors. This is implemented by calling the overflow:<xxx>() primitives
when necessary.

bigint and float change all the operators to operate on bigint or
floating-point numbers, respectively.

These operators are affected:

  | ^ & << >> ~   invalid for floating-point
  + - * / %       normal binary arithmetic
  -               unary negation
  ++ --           prefix and postfix increment/decrement
  < <= == >= >    comparison

All corresponding compound assignments (+=, *=, etc.) are also affected.

Examples:

  #arith(f) [ x + y / z ]       <=>      fadd(x, fdiv(y, z))
  #arith(b) [ a > b ]           <=>      bicmp(a, b) > 0
  #arith(f) [ f += g ]          <=>      f = fadd(f, g)
  #arith(o) [ a * b ]           <=>      overflow:mul(a, b)

Tip: keep the affected block as small as possible, and remember that all listed

operators are affected. The following is broken:

  #arith(b) [ sum += v[++i] ]   <=>      sum = biadd(sum, v[i = biadd(i, 1)])

#arith blocks can be nested, but it's best to avoid it for readability.
```

## BEHAVIOR TREES BEST PRACTICES

```text
BEHAVIOR TREES BEST PRACTICES

This is very much a work in progress. BTs are basically a new language, with
best practices waiting to be discovered!

Naming branch variables in reusable code
----------------------------------------
When writing a reusable Leaf that imports Branch Vars from a user's BT, do not
hardcode their names. What's named talkingto in mob A can be quester for mob B.
Furthermore, your hardcoded variable name could conflict with a variable used
for other purposes elsewhere.

Instead, accept an argument with the variable name.

Bundling a lot of checks in a single Condition
----------------------------------------------
When writing a Condition that can be used in more than one place, be careful to
have it very clearly defined. If what it checks is later updated to better
match the needs of branch C without ensuring that it still fits the existing
branches A and B, it'll break them.

This is of course also true for any mudlle function, but somehow was more
painful in BTs ;-)

Performance
-----------
The BT code is probably fast, but still slower than event-based mudlle. So, the
least nodes there are to explore every time some event triggers the BT, the
less costly it'll be and the more readable the debug log will be.

This can be done by reducing the node count (duh), ie. bundling more things
inside a single node (but: see above, and it'll reduce reusability). If you are
100% sure that a certain type of event will not be used in a given branch, it's
also possible to write a condition in that branch to return early.
```

## BEHAVIOR TREES CONCEPTS

```text
BEHAVIOR TREES CONCEPTS


Conventions
-----------
Most functions of the API return and accept opaque objects. If you want to do a
first level of type-checking, they are vectors.

All objects have a textual ID, used in logging and (future) /misc commands. It
is recommended to have unique IDs within a given tree, as it makes debugging
easier.

When something goes wrong, using objects triggers calltraces closest to the
actual error, leading to a better Developer eXperience (hello, cparser!).

Behavior Tree Definition
------------------------
A BTD (for short) is the static tree. In the common case, there is a BTD per
BT-mudlled mobile number.

Nodes, Branches, and Leaves

The tree is made of nodes. Nodes with children are called branches, nodes
without children are called leaves.

The leaves are conditions or actions. The branches compose those using logical
operations.

Behavior Tree Instance
----------------------
A BTI (for short) contains the dynamic state. In the common case, there is a
BTI per mudlled mobile instance and it is stored in its data table. The entry
is usually called "bti".

Running a BTI

The BTI will be run in reaction to the events that leaves subscribed to, or
after explicit rescheduling (which is basically a call_in()).


The run will traverse the entire tree, depth-first, unless a branch decides
otherwise. In other words, the next event or reschedule you were expecting may
be preempted by an earlier part of the tree. This is what makes BTs reactive.

Most other implementations are exclusively time-based and call the "run" a
"tick". This implementation is mostly event-based, so "tick" was not most
appropriate.

Statuses
--------
Upon being run, nodes may return one of bt:success, bt:failure, and bt:running.
Failure is not an error: a condition that isn't met will return failure to
prevent running the nodes it was guarding.

Actions may return bt:running if they aren't done yet. Except under specific
types of branches, there may be only one running node in the whole tree.

If a running action is (in a later run) preempted by a prior node, it will be
cancelled and will have the opportunity to cleanup. It is also possible to
protect running nodes from preemption by their siblings (see "memo" branches
below).

Leaves
------
Conditions
   Conditions return bt:success or bt:failure to stop or continue processing
   the current branch, depending on the branch type.

   Conditions are not allowed to return bt:running, and by convention they have
   no side-effect.

Quick Actions
   Quick actions behave exactly like conditions, but by convention they are
   allowed to have side-effects.

Slow Actions
   Slow actions are allowed to return bt:running, and they declare a cancel

   function. The cancel function will be called if the running action is later
   preempted by an earlier node, that is:

    * If the new run path does not include the running node anymore (early
      return).

    * If an earlier node returns bt:running (except if that kind of branch
      allows multiple running nodes).

Notable Branch Constructs
-------------------------
Sequences
   Sequences perform checks and actions until something fails.

   Specifically, Sequences process their children in order like a logical AND.
   They stop on the first child that returns bt:failed or bt:running. That
   status becomes the branch's status. If all nodes return bt:success, the
   branch returns bt:success.

Fallbacks
   Fallbacks try alternatives until they find one that works.

   Specifically, Fallbacks process their children in order like a logical OR.
   They stop on the first child that returns bt:success or bt:running. That
   status becomes the branch's status. If all nodes return bt:failure, the
   branch returns bt:failure.

Memo Sequences and Memo Fallbacks
   They behave like Sequences and Fallbacks, except when they get a bt:running
   child. In that case, the next run of that branch will resume straight at
   that child, without consulting first the prior children.

   This effectively disables reactivity for that branch. This is useful when
   writing an event-based condition followed by a slow action. The condition
   will succeed the first time, but would fail on a subsequent reschedule,
   automatically cancelling the action:

   bt:memo_sequence("are we agreed?", sequence(

       hear_yes,         // some event-based condition
       say_shopping_list // some slow action based on storyteller
   ));

bt:memo_ifelse()
   This is just a useful shortcut. It could be expressed with a Memo Fallback
   and a Memo Sequence.

bt:goal()
   Backchainable postcondition-precondition-action construct to attain goals
   with seemingly smart AI. Not yet implemented, but easy to add.

Parallel Branches
   They allow more than one running child and vary by sucess/failure
   algorithms. This is useful when you need a branch to be running until a
   timeout expires, or to react to interruptions while keeping a "main" branch
   running. See /ml.

State Management
----------------
BTs automatically manage two kinds of state:
 * Which Node is (are) currently Running. This replaces all sorts of Finite
   State Machines.
 * Variables that are reset when the Node that declares them finishes running,
   unlike mobile DTEs.

Node Variables
   These variables are visible only to their declaring Node, and useful to
   maintain state while the said Slow Node is Running.

Branch Variables
   These variables are declared in a special Branch type, bt:branch_vars().
   They can be imported in all the child nodes of that Branch and constitute
   shared state. They are also useful for Quick branches: a first Node can set
   a variable to be consumed by a later sibling.

Typespec
   All Variables are typed. The (string) typespec character,gone works just

   like mudlle's {character,gone} found in function arguments and return
   values.

Events
------
Behavior Trees react to more than plain event_xxx events: they are also nicely
integrated with react_give() and the converse library (socials, listen). This
leads to:

Evsets
   Evset objects contain one or more event specifications:
    * Plain event_xxx: the event integer.
    * react_give(): the list of items to react to, and the reacting priority.
    * listen(): a list of wordlists to react to.
    * socialise(): a list of socials to react to.

Evreacs
   Evreacs associate evsets with functions to call when these events are
   triggered.

Leaves and Events

Leaves declare which events they are interested in. The union of all events
determines which events the whole BT will react to.

In other words, nodes will be run for all sorts of reason (events, timers) they
did not expect. It's up to the mudllers to filter events through prior
conditions and/or to test the value of the event args their leaf received.

This is critical to enable the reactivity property: earlier nodes must be
consulted on everything that interest later nodes. In practice this doesn't
change much: nodes either care about events and already check down to the event
arguments, or don't and plainly ignore the event argument, instead relying on
world state (mobile position etc.).

Leaves can react to events they did not declare, but these events will only
propagate through the BT if some other Leaf declares them.


Immediate Events

It is currently(!) possible to subscribe to immediate events. It is thus
advised to be careful not to move or kill characters and objects if your action
might be run during such an event.

Writing Nodes
-------------
Nodes have three important associated functions, detailed below.

Run Function
   A BT Run traverses the tree (according to the rules above) and calls the Run
   Functions of every Node met.

Cancel Functions
   Slow Nodes that were Running but got preempted by an earlier Node will get
   an opportunity to cleanup in their Cancel Function.

Setup Functions
   Setup Functions are called once when the BTD gets loaded. This is where
   events and Variables are declared.

Run Function Context
   Run Functions and Cancel Functions receive a single RFC object as an entry
   point into the BT API. See /ml apr ^bt:rfc_.

Who
---
As Nodes often have to handle different events at once, part of the API deals
with Who, the main character that triggered the current BT Run, as determined
through the event arguments.
```

## BEHAVIOR TREES DEBUGGING

```text
BEHAVIOR TREES DEBUGGING


Examining the BTD, and BTI status
---------------------------------
See /misc behavior-trees ??. The output is currently overly verbose, feel free
to improve it!

Observing Behavior
------------------
Presumably that mobile should have a debug channel, calling bt:set_log_* in
bt:install()'s setup function.

If so, subscribing to that debug channel will show every node being entered and
left, as well as all Variables assignments.
```

## BEHAVIOR TREES

```text
BEHAVIOR TREES


Intro
-----
Classic mudlle spreads unrelated behaviors (such as combat and quest giving)
through a bunch of top-level event handlers, and all of them potentially mess
with the state of the mobile and/or quest being written. Unsurprisingly, this
doesn't scale for complex features.

Meanwhile, the gaming industry standardized on Behavior Trees to express the
behavior of their mobs ("AI"). Behavior Trees bring the following benefits:

 * Code simplicity: The state can stay local to the behavior branch, greatly
   lowering the global complexity and the chances for bugs.

 * Explicit logic: No more reverse-engineering a flowchart out of existing code
   by following the state changes across event handlers and story functions.
   The behavior tree expresses the logic in a single place, and interested
   builders could probably make sense of it.

 * Reactivity: BT make it easy to write code that adapts to external changes.
   If combat is to preempt questing, just express that in the tree and you'll
   never have to do these repetitive checks in your questing code again.

 * Modularity: Common behavior can be reused and abstracted. Unlike existing
   mudlle libraries, reusing BT branches cannot cause conflicts.

Furthermore, this allows for smarter mobiles: mobiles that have goals, mobiles
that can "learn" the best tactics over time (ML)... It all gets easier when
complexity only grows linearly.

Behavior Trees in MUME
----------------------
Everything is in bt library. Writing new Nodes is classic Mudlle, assembling
them into a Tree is done in a declarative DSL.

BTs are intended for non-trivial mobiles, as they'll always be slower than the

equivalent event-based code.

Documentation & Suggested Reading Order
---------------------------------------
 * Concepts: /MHELP BEHAVIOR TREES CONCEPTS.

 * Examples: mobiles/1301 (Aldereon).

 * Best practices: /MHELP BEHAVIOR TREES BEST PRACTICES.

 * API, per use-case: /mlib ls /Game/BTs/*.

 * API in alphabetical order: /mlib apr ^bt:.

 * /MHELP BEHAVIOR TREES DEBUGGING.

Interesting Links about Behavior Trees
--------------------------------------
 * https://www.gamasutra.com/blogs/ChrisSimpson/20140717/221339/Behavior_trees_for_AI_How_they_work.php
 * https://arxiv.org/abs/1709.00084
```

## CHARACTER CLASSES

```text
CHARACTER CLASSES

These are the different classes of characters and how to tell them apart:

    character          character?()
    |
    +-- player         !is_npc?() or char_number() < 0
    |
    +-- NPC            is_npc?() or char_number() > 0

For switched players (the latter look like regular NPCs), you can use
char_original() to determine the controlling player. find_player() does the
reverse.

all_players() returns players and switched players.

get_player() only returns a player if not switched.

Use mortal?() to determine if a character is a non-Ainu player.

god?() determines if a character is a non-switched Ainu.
```

## CODE REVIEWS

```text
CODE REVIEWS, REVIEWS


What's in a review?
===================

 1. Is this code maintainable for the years to come? Does it follow general
    good software engineering practices?
 2. Are there obvious bugs and anti-patterns (ie. /mh common mistakes)?
 3. Is there an opportunity to improve the submitter's skills?

Personal takes
==============

Imago's process
---------------
 1. File level review (mostly checking style, consistency, approach).
 2. Function review (quickly review each function for correctness).
 3. Flow review (follow from an entry point to finish).

Waba's level of detail
----------------------
When reviewing, I do not attempt to detect subtle bugs, and ask for tests
instead. Exception: critical pieces of code that could cause reimbursement
requests get a closer look.
```

## COMMANDS

```text
ADDING COMMANDS, COMMANDS

It is possible to define global user & god commands from mudlle. However,
before you all jump in & start coding, a word of warning from Manwë:

New commands may not be added without consulting the appropriate authorities
(the appropriate authorities remain to be defined, presumably to be chosen as
some subset of the Arata & Implementors - contact Manwë for details). Gods who
ignore this procedure will have to suffer Manwë's wrath and suffer the
consequences ...

Adding god commands should not present any particular problems (as long as some
security precautions are considered), but user commands should be preceded by
careful thought & discussion (maybe here, on the board in 1, or on the mudlle
mailing list).

After all these government health warnings, here comes some substance:

To add a god command, call the following function in one of your general files:
  define_god_command("commandname", level, function)

commandname should not include the /. level should be one of LVL_CARTOGRAPHER
through LVL_IMPLEMENTOR. function will be called with two arguments:
function(who, args)

where who is the person who typed the command, and args is a list of the words
of its argument (as produced by split_words).

If you use this function to override a builtin god command, beware of my wrath
:-). To list all mudlled god commands, do /mudlle list_god_commands().

Adding a user command is similar:
  define_command("commandname", position, function)
  define_acommand("commandname", min_match_length, position, function)

position is the minimum position in which the command can be used;
min_match_length is the length of the shortest abbreviation a player can use;
the other parameters are the same.


Mudlled user commands (e.g., lead) normally cause reactions as follows:
 * Send event_command (me, who, 0, "lead horse") to character surroundings
 * Check if overridden
 * Call mudlled implementation of the command

If someone with access to the C code adds cmd_lead to the C parser, then:
 * Send event_command (me, who, cmd_lead, " horse") to character surroundings
 * Check if overridden
 * Send event_command(me, who, 0, "lead horse") to character surroundings
 * Check if overridden
 * Call mudlled implementation of the command

Once the C version exists, you can replace the previous calls with
  define_ccommand(cmd_xxx, position, function)

In this case, event sequence becomes the same as for a C command:
 * Send event_command(me, who, cmd_lead, " horse") to character surroundings
 * Check if overridden
 * Call mudlled implementation of the command

/mudlle list_commands() will list all mudlled user commands (it is not possible
to redefine an existing command this way).
```

## COMMON MISTAKES

```text
COMMON MISTAKES

Here is a compendium of the mistakes most commonly encountered in code reviews
and bugfixes. Avoid these to save time in reviews!

Design issues
-------------
 * Luring a character in a fight he cannot win: oneway to a mobtrap, locked
   mobtrap on reconnect etc.

 * Uncalled-for arrow purging: you purge a mobile behind the scenes and do not
   drop first all the (possibly rare/enchanted) missiles that players shot into
   it.

 * Mount traps: more of a zone issue, the mounts get into a place they cannot
   climb out of. Example in the open world: collapsing stairs near the Master
   Assassin.

Code design
-----------

Flags vs. Finite State Machine vs. Behavior Tree

If your quest mob relies on a set of flags in variables or table entries
(busy?, has_object? etc.) and/or which story is going on to exhibit the right
behavior at the right time, it is probably brittle and prone to bugs. Consider
expliciting the state with a state variable and an enumeration of possible
states.

Look up Finite-state Machine and Event-driven FSM on Wikipedia for more info.

Coming soon: Behavior Trees for a more elegant solution.

Coding mistakes
---------------

Assuming that p is (still) a character (or o an object)


This is the #1 calltrace cause: characters or objects may be killed and/or
purged outside of your control and become of the "gone" type. This will cause a
bad type error when you try to use them again as characters or objects.

Unsafe examples

Your own code killed p

    simple_damage(p, 5, ph_die_fall);
    // WRONG: p may be a gone now, causing an error_bad_type
    send_wrap_color(p, CI_DAMAGE, "You trip, making a lot of noise.");

Of course, this also applies to (respectively) all functions that might kill p,
and to all usages of p as a character. Ditto for objects.

Fix: send the message before the damage or if you do need p after the damage,
make a character?(p) check.

p died during a delay

    basic_call_in(
        // WRONG: p may have died during that second
        fn () send_wrap(p,
            "You give up, the boulder is too heavy to be rolled aside."),
        "fake delayed door", 1 * LOOPS_PER_SECOND);

Fix: do not assume anything about the world's state in callbacks (call_in(),
delayed_action(), ...). Check that your characters are characters, objects are
objects, finite state machines are still in the expected state etc.

Caused by previous event handlers

    // WRONG: some previous handler of the same event may have killed who or
    // obj, making them gone.
    // There would be a bad_type error when the C code calls your function with
    // a gone argument (while we only accept character/object).
    react_event(fn (int me, character who, object obj) ...,
        "...", EVENT_DROP)


    react_event(
        fn (me, who, obj)
        [
            // WRONG, the bad_type error would happen here: who/obj would be
            // gone.
            act(TO_ROOM, IF_ACTOR, who, "$n drops $1p into the chasm, where "
                + "it disappears in the blazing lava.", null, obj);
            purge(obj);
        ], "Sammath Naur, maybe", EVENT_DROP);

    // CORRECT
    react_event(
        fn (me, who, obj)
        [
            if (character?(who) && object?(obj)) ...
        ], "...", EVENT_DROP);

Safe example

While you should be paranoid of what happens outside of your control, MUME is
single-threaded: no other code will run (and possibly alter p/o) until your
reaction exits. Also, you are encouraged to set explicit constraints on
accepted types from mudlle callers (and thus don't have to explicitely check
the type of arguments received).

    // GOOD: documented and enforced constraint for mudlle callers
    hop = fn "`p -> . Makes `p hop around." (character who)
        // We don't have to re-check that who is still a character
        exec_react(who, "hop");

Other wrong assumptions about p

 * Can see p2/o.

 * Is able to do the action described by your mudlle (not in delay, not slept,
   not incap, not fighting ...).


 * Will not move (fear, mudlle, /load).

 * Is not charmed.

For example, you might want to consider if players should be able to have their
charmies operate whatever your are mudlling or not. Examples of unintended
advantages for the players include bypassing racial checks and revealing for
stabbers because they're not in delay.

Lack of overridden?() and override!() in immediate event handlers

Moving, killing, or purging involved chars or objects in immediate events

From /mh event list: "It is a very bad idea to move, kill or purge involved
chars or objects while handling immediate events. If you need to do this,
override the event and do what needs to be done inside call_in(fn() ..., ...,
0)."

That's equivalent to pulling the rug from under the C code, possibly causing a
MUME crash.

Immediate events are executed like this:

    void some_c_function()
    {
        // ... Stuff ...

        cause_event(...); // Mudlle takes over to execute the immediate
                          // event(s). Mudlle's GC possibly frees purged p & o.

        // Hopefully check that the involved p & o are still in the expected
        // state, bail out if so.

        // Usually do more stuff with the p & o, crashing or corrupting memory
        // if they were freed.
    }

Whereas non-immediate events are run outside of "game" C code, when no code

expects anything about characters and objects.

Nowadays most characters and objects are checked after the immediate event
returns, but the players do not want to find out the missing checks the hard
way. Do not assume any of this is safe unless documented otherwise.

Missing speak_to(quester, mob) for listen() and socialise()

If you expect your mobile to react to undirected socials ("nod", not "nod
mob"), you need to let the converse lib know that that the quester is talking
to the mob, by calling speak_to(quester, mob).

It may be useful to also record that your mob is speaking to the quester, with
speak_to(mob, quester). Currently, this switches the mob's language to
something that can be understood by the target.

Wrong lifetime on variables

Most common mistake: storing state as a simple module variable that will be
reset on module reload. Use a static variable instead.

See /mh persisting data for the full discussion and more options.

Actually, if you have module variables that are not constants, functions, or
mere cache, you are most likely doing something wrong.

Costly appending to unsorted lists

Do not use lappend()/lappend!()qq to add a single item to a unsorted list, it's
unnecessarily slow (needs to iterate over the whole list to find its tail and
append there).

If the order is not important, prepend instead (for a list l and a value x):

    l = x . l;

Costly list element counting


Most calls to llength() are unnecessary, and bad practice because it goes
through the whole list to count its elements. If you just want to know if it's
empty, compare it to null. If you want to compare its length, use lhaslen?().

Rescheduling yourself into a fork-bomb of sorts

It's perfectly fine to reschedule the execution of a function like this:

    do_something = fn ()
        if (not_ready_yet())
            basic_call_in(do_something, "retry doing something", in_a_while)
        else
            do_it!();

Just make really sure that you are not creating call_ins more than once per
attempt, such as inside a loop. It would create an exponential amount of
call_ins, eventually crashing the game by memory exhaustion.

Ask if unsure, there is no safety net for this one.

Transient exits and no EX_TRANSIENT & OPEN_ROOT

If you are periodically disconnecting rooms from the rest of the world, be sure
to read up about the OPEN_ROOT room flag and the EX_TRANSIENT exit flag, see
/help zone. TL;DR: flag both sides of your exit with EX_TRANSIENT, and make
sure the builders have an OPEN_ROOT inside the disconnected area.

Mudlle-loaded objects and no register_mudload()

We use /com (for /com-based loads) and /mcom (for mudlle-based loads) to figure
out where and how objects are loaded into the world. Please keep /mcom up to
date by registering your own mudloads in it.

Ugly Data Table Entries

DTEs are the variables stored in the data tables of mobiles, rooms, and
objects. They are pretty-printed in /misc data xxx. Please make sure that they
look as useful as possible. For example, state machines should display a

human-readable string, not just the state internal number. Complex structures
should be made useful, not just the raw vector etc.

See register_data_table_entry() to alter how your DTEs are displayed by /misc
data.

Missing quest info and/or achievement

Did you write a new quest? Something that could count as a (negative or
positive) achievement? Please go the extra mile and make sure your new feature
plays nicely with the /misc quest journal (register_quest_info()) and the
achievements system (register.*ach()).

The players love those!
```

## CONTAINER TYPES

```text
CONTAINER TYPES

Here follows a list of the various container types in mudlle.

Primitive Types
---------------

bitset

Fixed-size bit sets stored in strings. Generally cheap operations.

list

Normal cons lists. Cheap push, pop, and filter.

Can also be used as small light-weight associative containers using assoc() and
assq(), or sets using lfind?() or member().

string

Fixed-length character arrays. Cheap referencing, minimal storage space.

Strings are indexed using s[n], where n can be negative to count from the end
(s[-1] being the last element).

Only the 8 least significant bits are retained as you store an integer into a
string. On dereference, an 8-bit unsigned number is returned. String primitives
(and mudlle-defined functions) that take an index (offset) as argument should
all handle negative indices as well.

table

String indexed hash tables. Cheap lookup.

Normal tables ('{ ... }) are case- and accent-insensitive, while "ctables"
('{c ... }) are case- and accent-sensitive.

A table holds a set of symbols ('<"name" = value>), which are pairs of a

read-only string and a value. Most operations on tables ignore table entries
that have a null value. Exceptions include table_lookup() and
table_symbol_ref().

vector

Fixed-length arrays. Cheap referencing, minimal storage space.

When given the choice (e.g., a constant array to iterate on), prefer vectors to
lists.

Vectors are indexed using v[n], where n can be negative to count from the end
(v[-1] being the last element). Vector primitives (and mudlle-defined
functions) that take an index (offset) as argument should all handle negative
indices as well.

Non-primitive Types
-------------------

avector -- data/avectors.mud

Dynamically sized vectors. Cheap reference, push, pop. Has sorted-insert
functions to simplify binary searches.

iset -- data/iset.mud

Set of integers. Implemented using dihash and bitset.

dihash -- compiler/dihash.mud

Dynamically sized integer indexed hash tables.

diphash -- data/diphash.mud

Dynamically sized auto-protecting integer indexed hash tables. Useful for large
tables the GC chokes on if not protected. See /mhelp diphash.

dlist -- compiler/dlist.mud


Doubly-linked lists (null represents the empty dlist). Cheap insert and delete.

graph -- compiler/graph.mud

Directed graphs.

heap -- data/heap.mud

Efficient data structure for keeping top-N elements or maintaining a priority
queue. Implemented using avector.

idlist -- data/idlist.mud

Doubly-linked indexed list.

ohash -- data/ohash.mud

Dynamically sized hash tables, indexable by any object. Key lookup identity is
done using normal comparison (==).

queue -- data/queue.mud

FIFO queues implemented as lists that hold a reference to the last element.
```

## COORDINATES

```text
COORDINATES

MUME has two different coordinate systems: zone coordinates and room
coordinates.

Zone coordinates
----------------
Valinor (zone 0) is at the origin (0, 0) of the zone coordinates. Increasing X
coordinates are to the east; increasing Y coordinates are to the north.

Use /map world area to visualize where different zones are located within the
zone coordinate system.

Use char_zone_coords(), zone_coords(), set_zone_coords!(), and coord_zones() to
access them.

The C constants ZONE_{MIN,MAX}_COORD_{X,Y} restrict the values zone coordinates
may have.

Use /move zone <direction> to move around in the zone coordinate system. Use
/move zone up|down to move between zones on the same zone coordinate.

A room or mount may override its zone coordinates by setting its "coordinates"
data table entry to vector(<x>, <y>). This affects the map command.

Room coordinates
----------------
The origin for the room coordinates is the northwestern corner of the
northwestern corner of the C map. Currently there is no zone there. Increasing
X coordinates are to the east; increasing Y coordinates are to the south.

As the size of the map could change, the room coordinates are not fixed.

Only rooms with a zone room offset < 100, in zones without the ZF_NO_GRID flag
have coordinates.

The offset % 10 (0-9) specifies the north-south position. The offset / 10 (also
0-9) specifies the west-east position.


Use char_room_coords(), room_coords(), and coords_room() to access room
coordinates.

Use /move coord <direction> to move around in the room coordinate system.

A room or mount may override its room coordinates by setting its "room-coords"
data table entry to cons(<x>, <y>). This affects the map rooms command.

Conversion
----------
To find the room coordinate of a given room (what room_coords() does):

  room = 285
  zone = room_zone(room)
  ofs  = room_zone_offset(room)

  @[zone_x zone_y] = zone_coords(zone)
  rorigin = room_map_origin()

  room_x = (zone_x - rorigin[0]) * 10 + ofs / 10
  room_y = (rorigin[1] - zone_y) * 10 + ofs % 10
```

## CPARSER

```text
CPARSER

cparser() is a command parser that is intended to be used for parsing of game
commands (as opposed to Nada's parser(), which almost only is suited for
god-commands).

It is more or less a subset of Nada's parser, but the arguments are different.

The main function is the cparse() function, which takes four parameters: who,
syntax, cmd and args. cmd is the cmd_xxx, and args is a list of word, typically
split_words(commandline).

This is a rather "formal" definition of what the syntax is:

  syntax =
     list(arg*) . result        // if arg* match, result is run
     list(arg*, syntax+)        // is arg* match, find the first syntax+
                                // that does

  result =
     c:fn(p,l)                  // run c(who, res), accept if it returns TRUE
     string                     // accept, and send_wrap string

  arg =
     c:fn(who, argl) -> false | vector(remains, add?, result)
                                // fails if the fn returns false
                                // if a vector, argl is set to remains, and
                                // if add? is true, result is added to the res
                                // list that is passed on to the leaf-fn above
     string                     // accepts this string only (case insensitive)

Some examples:

  react_event(fn(me, who, cmd, args) [
    | syntax, use_fn |

    use_fn = fn (who, argl)
      [

        | cmd, obj |
        @(cmd obj) = argl;
        if (obj == me)
          [
            override();
            act(to_char, true, who, "You use the $1o.", null, me);
          ];
      ];

    syntax = list(carg_cmd(cmd_use),
                  carg_the,
                  carg_object(search_eq)) . use_fn;

cparse(who, syntax, cmd, split_words(args));
], "use obj handler", event_command);

This rather pointless syntax accepts input use the <object> or use <object>. In
both cases, use_fn() is run with parameters who and the list of return values
from the arguments (carg_xxx).

From the helptexts of the carg_xxx functions we find the following:

  carg_cmd     returns the number of the matched command  (i.e. cmd_use
                in this example)
  carg_the      returns nothing
  carg_object   returns the object matched

So, list(command-number, object) will be passed as second parameter to use_fn.

And here goes a more complicated example:

  syntax = list
    (list(carg_branches(list(carg_cmd(cmd_look),
                             carg_head("in", 1)),
                        list(carg_cmd(cmd_examine))),
          carg_the,
          carg_object(search_eq),
          carg_match!) . examine_fn,

     list(carg_cmd(cmd_get,
                   cmd_take),
          list(carg_number,
               carg_coinage,
               carg_from,
               carg_the,
               carg_object(search_eq)) . take_money_fn,
          list(carg_the,
               carg_word,
               carg_from,
               carg_the,
               carg_object(search_eq)) . take_fn));

This is a part of the syntax for moneybags... More precisely, the syntax to
examine/look/get/take.

Here's an example of what this syntax accepts (and how it is done):

     look      in         the      moneybag
     /         |            \           \
carg_cmd  carg_head("in",1)  carg_the carg_object
    \         /
   carg_branches

This would pass list(list(0, cmd_look), obj) to examine_fn.

list(0, cmd_look) is returned from carg_branches, since it's the 0th branch
that matched (the 1st branch being the "examine"-branch).

Neither carg_head nor carg_the return any values.

      l        i                    moneybag
     /         |               \        \
carg_cmd  carg_head("in",1)  carg_the carg_object
    \         /
   carg_branches

carg_the matches either the word "the", or nothing (which is the case here).

This, again, sends list(list(0, cmd_look), obj) to examine_fn.

    examine         moneybag
     /          |        \
carg_cmd    carg_the  carg_object
   |
carg_branches

Here, list(list(1, cmd_examine), obj) is passed to examine_fn.

  get         13     silver                               moneybag
   /          |         \                |         |         \
carg_cmd  carg_number  carg_coinage  carg_from  carg_the  carg_object

This passes list(cmd_get, 13, 100, obj) to take_money_fn.

100 is the return value from carg_coinage (100 silvers to 1 copper).

Note that this only matches if 'who' isn't ELF or HALF-ELF, since carg_coinage
doesn't match 'silver' for them (only 'celeb' etc).

Another example:

  fail_fn = fn (who, argl)
    [
      | cmd, word |
      @(cmd word) = argl;
      pformat_wrap(who, "You have no %s.", word);
    ];

  syntax = list(carg_cmd(cmd_hold),
                carg_the,
                list() . "Hold what?",
                list(carg_object(search_inv)) . hold_fn,
                list(carg_word) . fail_fn);

If you type "hold" or "hold the", you get the error "Hold what?".


If you type "hold asdf", you get the error "You have no asdf" (from fail_fn)

If you type "hold moneybag" hold_fn is called with list(cmd_hold, obj) as
argument list.
```

## DEBUG

```text
DEBUG

The debug message system is based on 'debug ports', identified by a string.
Each mudller has his own port, and - by default - messages sent to that port
are sent to the corresponding mudller. You can, however, use any name for a
port - say, you could send to the "shops" port a debug message regarding shops.

If nobody is "listening" to a given port, messages sent there are ignored. You
can however, at any time, register yourself (or someone else) to any port
(n.b., this is much easier done using the /debug command):

    start_debug_player("PortName", "PlayerName")

Any number of players may be registered to the same port at any time. You may
want debug messages to be sent either to you or to your testchar, but not to
both at the same time. You achieve this by doing the following:

    start_debug_players("PortName", '("Player1", "Player2", ...))

The list of player names is scanned from the beginning to the end, debug
messages are sent to the first connected character only.

You can also remove some character from a port at any time:

     stop_debug_player("PortName", "PlayerName")

will remove a single character, while

     stop_debug_players("PortName", "PlayerName")

will remove that character, and all other characters that were mentioned in the
corresponding start_debug_players().

You can have a port automatically dump its messages to a log file at the same
time as they're sent to registered characters:

     start_debug_file("PortName", "FileName")
     stop_debug_file("PortName", "FileName")


Logs thus produced are stored in ~arda/run/lib/mudlle-logs, and are deleted a
few days later. Make sure you don't overuse them, an endless logging loop can
fill up the mume partition quite fast.

Creating a debugging function for a port is easy: for example, as you can see
at the end of utility/debug.mud,

     fror_debug = make_debug_fn("Fror")

make_debug_fn("PortName") returns a fn (x1, x2, x3...) that dumps its arguments
to port "PortName". If "PortName" is the name of a V+, that V+ is automatically
registered to the port.

See also: /help debug
```

## DIPHASH

```text
DIPHASH

"diphash" is a dynamically growing, auto-protecting hash table indexed by
integers.

- Dynamically growing: the table size will increase if necessary, so that bins
do not become too crowded

- Auto-protecting: most data within a diphash becomes automatically read-only
(which is good for the garbage collector). Only the recent changes reside in
mutable memory, and those can be merged with the main store with a commit.

- Lockable: if you need to perform a massive update upon a diphash, you can
"lock" it to improve performance, and then "commit"

TO BE DOCUMENTED: details about the interface

WARNING: the implementation details of diphash are likely to change. Until
further notice from Frór or Dáin, do not save a diphash onto disk (either
directly or by adding one to a player's or object's symbol table).

WARNING: diphashes protect their contents recursively. This might make
read-only something that you expect to remain writeable.
```

## DIRECTORIES

```text
DIRECTORIES, MUDLLE DIRECTORIES

The following mudlle directories exist:

  ainu      Ainu-specific code, such as /-commands
  base      fundamental mudlle code, boot log, and data files
  com       /com commands
  commands  game commands
  compiler  mudlle compiler and its support libraries
  data      data structures
  game      game-specific libraries
  global    more fundamental mudlle code
  libs      /lib commands
  mobiles   mobile-specific code
  objects   object-specific code
  places    in-game features specific to certain types of rooms or areas
  quests    quests
  rooms     room-specific code
  social    boards and mail
  utility   general purpose code, not directly game-specific

Personal directories should only contain work in progress and temporary stuff.
Code used in-game should not live in personal directories.

There is a fair bit of legacy code not following the above rules.

To move a file to a different location, use move_file() and make sure to /mgit
commit all changed files, including seclevels.txt and libraries.txt if
necessary.

Code is loaded in the following order at boot; cf. base/mume-loader.mud:

 1. base/mume-loader.mud
 2. the compiler; see compiler/load-compiler.mud
 3. base/load-world.mud
 4. global/
 5. other named directories (ainu/, data/, game/, ...), alphabetically;
    see base/directories.txt

 6. <player>/
 7. rooms/
 8. mobiles/
 9. objects/

Contents of directories is loaded alphabetically or (for rooms, mobiles, and
objects), numerically.

Along the way, any requires are fulfilled as necessary.

When rooms, mobiles, and objects are loaded, the corresponding hooks are run as
documented by hook_add(). Notably, /lib commands are loaded after the
corresponding mudlle file.

New directories can be added using /mud add_mudlle_directory!().

See also /misc mudlle-reactions hooks mobiles|objects|rooms.
```

## DOCUMENTATION

```text
DOCUMENTATION, HELP STRINGS

Mudlle documentation can be found using:

  /mlib                        see /help mlib
  /mud help(<function>)        
  /mud apropos("<substring>")  
  Emacs mudlle-mode.el         see /mhelp emacs mudlle-mode.el

The following are basic guidelines for documenting mudlle functions and
variables. They are not set in stone, but have a good reason if you deviate
from them.

All global functions and variables should be properly documented.

Functions are documented in the optional string between the fn keyword and the
argument(s). The documentation string can be a concatenation of multiple
strings, which can help line-wrapping.

Mudlle function documentation strings should have the following parts:

 1. argument specification; e.g., n s
 2. an arrow ->
 3. return value specification; e.g., t
 4. a period .
 5. the help text

The help text should be a proper sentence ending with a period.

In all these strings, parameters, constants (except null, false, and true),
function calls (except when the list(), cons(), sequence(), and vector()
functions are used to describe a data layout) should be preceded with a
backtick (`).

This is used by the help system (on-line in MUME and in the Emacs mudlle-mode)
to add special markup or hyperlinks.

You should use tabs (\t) to indicate line-wrapping positions:


  "  `foo  \tthis is a long line"

may display as, with a tiny terminal width:

  foo  this is a
       long line

with foo in the "emphasis" color, as set by change color emphasis.

Compare the source of arg_one_of() to /ml man arg_one_of for a longer example.

When referring to other functions, add a () suffix to mark them as such.

Non-functions are documented using the document() function. Please add the call
near the code that uses/defines the variable.

If the symbol you want to highlight contains a colon (:) you have to add an
additional backtick for the colon: `foo`:bar() will treat foo:bar as one
symbol.

For parameters, you can use the following letters to indicate their type (based
on MUME source code mudlle/runtime/prims.h):

    b     boolean (any type, interpreted as a boolean value)
  f or c  function (closure)
    l     list (pair or null)
    n     integer
    o     object
    p     pair / player / character
    s     string
    t     table
    v     vector
    x     any type

For long documentation strings with multiple paragraphs, consider using double
newlines and triple-quoted strings for improved legibility.
```

## EMACS

```text
EMACS, MUDLLE-MODE.EL

To set up mudlle-mode in Emacs, you need a copy of the most recent
mudlle-mode.el file, which typically can be found in
/home/arda/elisp/mudlle-mode.el on the MUME machine (Dáin maintains it). It is
also part of mudlle distributions in the elisp/ subdirectory; see
https://mume.org/download/mudlle/.

The master version is maintained in the MUME source code tree: /cgit view
mudlle/elisp/mudlle-mode.el.

Add to your .emacs something similar to the following:

  (setq load-path (append load-path '("/home/gustav/elisp")))
  (autoload 'mudlle-mode "mudlle-mode.el" "Turns on mudlle editing mode" t)

Replace /home/gustav/elisp with the directory where mudlle-mode.el can be
found.

In order to have the mudlle function help texts available from within Emacs,
you need to also add the following:

  (setq mudlle-function-data-file "/home/arda/run/lib/mudlle-help.el")

You can copy the listed file somewhere else, but the above is automatically
created by /mud write_mudlle_help().

To look up the help for a function, use M-x mudlle-help (by default bound to
C-c C-h) or M-x mudlle-apropos (by default bound to C-c C-a).

In order to get the mudlle help texts link to the source code for mudlle
functions, you also need:

  (setq mudlle-source-path "/home/arda/run/lib/mudlle")

and to also get links to the C source code (given that you have access to it)
for mudlle primitives, add something like:


  (setq mudlle-c-source-path "/home/gustav/devel/mume-src")

To automatically load mudlle-mode for mudlle files, add:

  (defun powwow-mode ()
    (setq buffer-file-coding-system 'latin-1
          cannot-suspend t)
    (let ((title (getenv "TITLE")))
      (cond ((and title (or (string-match " file base/boot\.log" title)
                            (string-equal "mudlle source code grep" title)
                            (string-match "\`/usr/bin/git grep\>" title)))
             (compilation-mode)
             (set (make-local-variable 'compilation-search-path)
                  '("/home/arda/run/lib/mudlle")))
            ((and title (string-match "\`/usr/bin/git diff\>" title))
             (diff-mode))
            ((and title (string-match "\`/usr/bin/git blame\>" title))
             (fundamental-mode)
             (setq truncate-lines t))
            ((and title (string-match " mudlle file " title))
             (mudlle-mode))
            (t
             (text-mode)
             (setq ispell-local-dictionary "en_GB-ise-w_accents")
             (set (make-local-variable 'sentence-end-double-space) nil)
             (setq fill-column 79)))))

  (add-to-list (if (or (> emacs-major-version 25)
                       (and (= emacs-major-version 24)
                            (> emacs-minor-version 0)))
                   'inhibit-local-variables-regexps
                 'inhibit-first-line-modes-regexps)
               "`/tmp/powwow")

  (setq auto-mode-alist
        (append '(("\`/tmp/powwow.*" . powwow-mode)
                  ("\.mud\'" . mudlle-mode))
                auto-mode-alist

                '(("/lib/mudlle/[^.]" . mudlle-mode))))

The function powwow-mode automatically selects compilation-mode, text-mode, or
mudlle-mode based on what your client set the TITLE environment variable to
before starting the external editor (powwow does this at least).

See also: NOTEPAD++, VIM
```

## ESCAPE CODES

```text
ANSI COLORS, ESCAPE CODES, MARKUP, TEXT MARKUP

Text markup (as controlled by change colour) is handled by sending special
escape sequences inside output. These escape sequences are converted by
render_text() to either ANSI codes, XML markup, or nothing depending on the
player's terminal mode.

The escape sequences have the following formats:

  \033< <code> > ... \033</ <code> >
  \033</ <code> >

where <code> is the markup number (which is the CI_xxx constant plus one). The
start and end sequences are returned by start_color() and end_color(),
respectively.

The %( and %) format() conversions also return the same.

<code> can be followed by &-prefixed, ;-separated tag arguments:

  \033<123&abc=def;ghi=jkl>

where the supported (typically not emitted by mudlle) arguments are:

  Tag          | Arguments
  -------------+--------------------------------
  mt_highlight | &<code>
  mt_movement  | &dir=<dir>
  mt_snoop     | &symbol=<prefix>
               | or &symbol=<prefix>;time=<time>

The renderer also handles standard ANSI codes:

  \033[ [^a-z]* [a-z]

Use slength_noansi() to return the length of a string, not counting any escape
sequences.
```

## EVENT DATA

```text
EVENT DATA

city-defence uses event_data on EVENT_ATTACK and EVENT_MOVEMENT. The following
function is run on all events:

    is_unhandled? = fn() [
        | o |
        o = event_data();
        if (table?(o))
            null?(o["cdef"])
        else
            set_event_data!(make_table());
    ]

and event_data()["cdef"] = (internal secret value) is set if the event is
handled.

That pretty much means event_data() on EVENT_ATTACK and EVENT_MOVEMENT is
either null or a symbol table.
```

## EVENT LIST

```text
EVENT LIST, EVENTS


Predefined Events
-----------------
Note that events marked (*) have separate documentation in /ml man event_xxx.

Immediate events may be overridden to replace the normal behavior, see
override() and overridden?().

  event_                  Parameters                              Sent to                                   Immed?
  -----------------------------------------------------------------------------------------------------------------
  account (*)             how, from, to                           global                                    yes
  attack (*)              attacker, victim                        room, mobs, global                        no
  beacon (*)              who, where, msg                         room, mobs                                yes
  butcher (*)             who, corpse                             butchered object                          yes
  c_affect_added (*)      see removed                             global                                    no
  c_affect_removed (*)    who, type, info, delay, duration, id    global                                    no
  command (*)             who, cmd, args                          who's eq, room, mobs, objs, global        yes
  change_mood (*)         who, old_m, new_m, flags                who's eq, room, mobs, objs, global        yes
  change_name             who, pno, oldname                       global                                    no
  charm                   who, victim                             room, mobs, global                        no
  create (*)              -                                       me                                        no
  create_corpse (*)       victim, corpse, shadow                  room, char, global                        yes
  create_notify (*)       what                                    room, global                              no
  crime (*)               crime_xxx, all_room, who, victim        global                                    no
  death (*)               who                                     room, mobs, objs, global                  yes
  decay (*)               obj, forced?                            me, contents, container                   yes
  door (*)                who, type, room, dir                    both rooms, key, container                no
  drink (*)               who, amount                             room or drink container                   yes (3)
  drop (*)                who, obj                                obj, room, objs in obj, mobs              no
  eat (*)                 who, amount, eaten?                     object eaten                              yes (3)
  end_wait                who, why (wait_xxx)                     who                                       no
  enter_game (*)          who, room                               room, global                              no
  equipped (*)            who, obj                                who, who's eq including obj               no
  examine_direction (*)   who, dir                                room                                      yes
  examine_object (*)      who, obj, eo_xxx, arg                   obj                                       yes
  expire                  affect, data                            mob                                       no

  flee_round (*)          who                                     mob                                       yes
  follow (*)              who, whom                               room, chars in room                       no
  gain_trophy (*)         who, victim, xp, knowledge_gain*256     who, victim                               yes
  give (*)                from, to, obj                           to, obj                                   no (4)
  give_money (*)          from, to, amt                           to                                        no
  god_command             who, arg_list                           who's eq, room, mobs, objs                yes
  hear (*)                type, from, to, msg                     all mobs who can hear msg, and room for   no
                                                                  hear_say                                  
  help_cry                who, attacker, 0                        complain room                             no
  hide (*)                who, obj, room                          obj, room, mobs                           yes
  hit                     who, victim, obj, dam, crit?, att_type  obj, who, victim                          yes
  identify (*)            who, target                             target, global                            yes
  kill (*)                victim, killer, xp-gain                 global                                    yes
  link (*)                who, what                               global                                    no
  movement (*)            who, from, to, cause                    from, to, chars and objs in both rooms    no
                                                                  for players, eq, global for magical       
                                                                  movement                                  
  mudlle_file (*)                                                                                           
  new_model (*)           select_xxx, number                      global                                    yes
  player_exhausted (*)    who, from, cause                        global                                    no
  player_moved            who, from, to, cause                    global                                    no
  put (*)                 who, top, cont, obj                     obj, room, mobs, container                no (4)
  quaff                   who, what                               potion being quaffed                      yes (3)
  quit (*)                pno                                     room & contents, global                   no
  reboot (*)              rebooting?                              global                                    yes
  reborn (*)              who                                     global                                    yes
  removed (*)             who, what                               who, who's eq, what                       no
  reveal                  who, obj, room                          obj, room, mobs                           no
  room_copy (*)                                                                                             
  scout                   who, from, to, dir, type                things in both rooms                      no (18)
  server_lag (*)                                                                                            
  sheathe                 who, weapon, sheath                     who, weapon, sheath                       no
  shop (*)                shop, obj, how, who, cost               shopkeeper, room, obj, player             no (15)
  social (*)              who, cmd, vict/0, flags                 room, chars in room                       no
  spell (*)               caster, spell, target                   chars in room, room, victim, victim's eq  no
  steal (*)               who, victim, what, seen                 room, chars in room, what                 no
  stronghold_outlaw       who, what, until                        global                                    yes
  stunned (*)             who                                     who, global                               no

  summon (*)              summonee, summoner, transfer?,          chars in to/from room, global             no
                          from_room, to_room                                                                
  syslog                  what                                    global                                    no (19)
  take (*)                who, obj                                obj, room, mobs                           no (4)
  take_container (*)      who, obj, container                     obj, room, mobs, container                no (4)
  take_money (*)          who, amt                                room, mobs                                no
  tell (*)                from, to, msg                           the mob told                              no
  tick (*)                hour                                    global                                    yes
  try_absorb (*)          victim, attacker, dmg, att_type,        victim                                    yes
                          eq_pos, dmg_before, magic_abs, eq_abs,                                            
                          nat_abs, bypassed                                                                 
  try_bash (*)            who, victim, final?, disengage?         who, victim                               yes
  try_cast (*)            caster, spell, target, effort, delay    room, chars & obj in room, eq on caster   yes
                                                                  and victim                                
  try_climb               who, from, to                           from, to, chars and objs in both rooms    yes(14)
                                                                  for players, eq                           
  try_damage (*)          victim, attacker, dmg, critical?, type  victim and its eq                         yes (9)
  try_door (*)            who, door                               same as door, not sent on zone reset      yes
  try_follow (*)          who, whom                               room, chars in room                       yes
  try_group               who, whom, what                         chars, global                             yes(17)
  try_movement (*)                                                same as movement                          yes
  try_put (*)             who, top, cont, obj                     obj, room, mobs, container                yes (4)
  try_ride                who, horse                              horse, rider                              yes
  try_scout               who, whose room, scouted room, dir |    both rooms, chars,                        yes
                          objs and eq in both rooms                                                         
  try_shop (*)            shop, obj, how, who, cost               shopkeeper, room, obj, : yes(15) player   
  try_spell (*)           caster, spell, target, mana             room, chars & obj in room, eq on caster   yes
                                                                  and victim                                
  try_steal (*)           who, victim, what, seen                 room, chars in room, what                 yes
  try_swim                who, from, to                           from, to, chars and objs in both rooms    yes(14)
                                                                  for players, eq                           
  try_take (*)                                                    same as take                              yes
  try_take_container (*)                                          same as take_container                    yes
  try_tell (*)            from, to, msg                           the mob told                              yes
  try_zone_reset          zone                                    global                                    yes(26)
  weather (*)             type, value                             global                                    no
  weather_message         room, global                            see /mh w m                               yes
  whois                   targetname                              global                                    yes

  zone_reset              zone                                    global                                    yes (3)

 3. Can't be overridden.

 4. EVENT_DROP, EVENT_TAKE, EVENT_GIVE, EVENT_PUT and EVENT_TAKE_CONTAINER is
    sent recursively to any objects in obj if it is a container.

 9. dmg < 0 is a miss. Overriding or moving the victim cancels the hit, and
    will probably make Manwe cancel you. This event is VERY UNSAFE.

 14. Sent when a person tries to move from one room to another and that move
     will cause a swim/climb test. The event is sent before any such tests are
     done. Can be either overridden, or one can call swim/climb_succeed which
     suppresses the normal C swim/climb test and will immediately proceed until
     the event_try_movement call. event_try_swim is also sent when moving
     between rooms with ice in them, so one should test for ice to do anything
     swim-related.

 15. shop is the vshop_xxx vector. how is one of shopev_buy, _sell, _mend,
     _mend_return, _produce seen from the player's point of view. who is the
     player buying things (or null for shopev_produce). cost is the price (or
     null for shopev_produce and shopev_mend).

 17. The what argument is a group_cmd_xxx constant.

 18. "type" is one of scout_{hidden,shape,seen}

 19. Causing anything to be written to the syslog from a reaction to this event
     is very unwise.

 24. "flags" has one reason field: "flags & mood_change_reason_mask", one of
     the mood_change_reason_xxx values, and a "mood_change_flag_next" flag,
     indicating that this change will take effect "soon" (i.e., will not show
     up as char_mood() right away). Only the "next" flagged events can be
     overridden.

 26. Can be overridden, but this is not advised. You should use
     override_zone_reset() to override only certain rooms.


Important
---------
 1. If you pass -event_xxx as the event name to react_event() for a mobile,
    then that mobile will react to the event even if it is in a delayed action.
    Cf. /ml man react_event.

 2. It is a very bad idea to move, kill or purge involved chars or objects
    while handling immediate events. If you need to do this, override the event
    and do what needs to be done inside call_in(fn() ..., ..., 0).
```

## EVENTS

```text
EVENT LIST, EVENTS


Predefined Events
-----------------
Note that events marked (*) have separate documentation in /ml man event_xxx.

Immediate events may be overridden to replace the normal behavior, see
override() and overridden?().

  event_                  Parameters                              Sent to                                   Immed?
  -----------------------------------------------------------------------------------------------------------------
  account (*)             how, from, to                           global                                    yes
  attack (*)              attacker, victim                        room, mobs, global                        no
  beacon (*)              who, where, msg                         room, mobs                                yes
  butcher (*)             who, corpse                             butchered object                          yes
  c_affect_added (*)      see removed                             global                                    no
  c_affect_removed (*)    who, type, info, delay, duration, id    global                                    no
  command (*)             who, cmd, args                          who's eq, room, mobs, objs, global        yes
  change_mood (*)         who, old_m, new_m, flags                who's eq, room, mobs, objs, global        yes
  change_name             who, pno, oldname                       global                                    no
  charm                   who, victim                             room, mobs, global                        no
  create (*)              -                                       me                                        no
  create_corpse (*)       victim, corpse, shadow                  room, char, global                        yes
  create_notify (*)       what                                    room, global                              no
  crime (*)               crime_xxx, all_room, who, victim        global                                    no
  death (*)               who                                     room, mobs, objs, global                  yes
  decay (*)               obj, forced?                            me, contents, container                   yes
  door (*)                who, type, room, dir                    both rooms, key, container                no
  drink (*)               who, amount                             room or drink container                   yes (3)
  drop (*)                who, obj                                obj, room, objs in obj, mobs              no
  eat (*)                 who, amount, eaten?                     object eaten                              yes (3)
  end_wait                who, why (wait_xxx)                     who                                       no
  enter_game (*)          who, room                               room, global                              no
  equipped (*)            who, obj                                who, who's eq including obj               no
  examine_direction (*)   who, dir                                room                                      yes
  examine_object (*)      who, obj, eo_xxx, arg                   obj                                       yes
  expire                  affect, data                            mob                                       no

  flee_round (*)          who                                     mob                                       yes
  follow (*)              who, whom                               room, chars in room                       no
  gain_trophy (*)         who, victim, xp, knowledge_gain*256     who, victim                               yes
  give (*)                from, to, obj                           to, obj                                   no (4)
  give_money (*)          from, to, amt                           to                                        no
  god_command             who, arg_list                           who's eq, room, mobs, objs                yes
  hear (*)                type, from, to, msg                     all mobs who can hear msg, and room for   no
                                                                  hear_say                                  
  help_cry                who, attacker, 0                        complain room                             no
  hide (*)                who, obj, room                          obj, room, mobs                           yes
  hit                     who, victim, obj, dam, crit?, att_type  obj, who, victim                          yes
  identify (*)            who, target                             target, global                            yes
  kill (*)                victim, killer, xp-gain                 global                                    yes
  link (*)                who, what                               global                                    no
  movement (*)            who, from, to, cause                    from, to, chars and objs in both rooms    no
                                                                  for players, eq, global for magical       
                                                                  movement                                  
  mudlle_file (*)                                                                                           
  new_model (*)           select_xxx, number                      global                                    yes
  player_exhausted (*)    who, from, cause                        global                                    no
  player_moved            who, from, to, cause                    global                                    no
  put (*)                 who, top, cont, obj                     obj, room, mobs, container                no (4)
  quaff                   who, what                               potion being quaffed                      yes (3)
  quit (*)                pno                                     room & contents, global                   no
  reboot (*)              rebooting?                              global                                    yes
  reborn (*)              who                                     global                                    yes
  removed (*)             who, what                               who, who's eq, what                       no
  reveal                  who, obj, room                          obj, room, mobs                           no
  room_copy (*)                                                                                             
  scout                   who, from, to, dir, type                things in both rooms                      no (18)
  server_lag (*)                                                                                            
  sheathe                 who, weapon, sheath                     who, weapon, sheath                       no
  shop (*)                shop, obj, how, who, cost               shopkeeper, room, obj, player             no (15)
  social (*)              who, cmd, vict/0, flags                 room, chars in room                       no
  spell (*)               caster, spell, target                   chars in room, room, victim, victim's eq  no
  steal (*)               who, victim, what, seen                 room, chars in room, what                 no
  stronghold_outlaw       who, what, until                        global                                    yes
  stunned (*)             who                                     who, global                               no

  summon (*)              summonee, summoner, transfer?,          chars in to/from room, global             no
                          from_room, to_room                                                                
  syslog                  what                                    global                                    no (19)
  take (*)                who, obj                                obj, room, mobs                           no (4)
  take_container (*)      who, obj, container                     obj, room, mobs, container                no (4)
  take_money (*)          who, amt                                room, mobs                                no
  tell (*)                from, to, msg                           the mob told                              no
  tick (*)                hour                                    global                                    yes
  try_absorb (*)          victim, attacker, dmg, att_type,        victim                                    yes
                          eq_pos, dmg_before, magic_abs, eq_abs,                                            
                          nat_abs, bypassed                                                                 
  try_bash (*)            who, victim, final?, disengage?         who, victim                               yes
  try_cast (*)            caster, spell, target, effort, delay    room, chars & obj in room, eq on caster   yes
                                                                  and victim                                
  try_climb               who, from, to                           from, to, chars and objs in both rooms    yes(14)
                                                                  for players, eq                           
  try_damage (*)          victim, attacker, dmg, critical?, type  victim and its eq                         yes (9)
  try_door (*)            who, door                               same as door, not sent on zone reset      yes
  try_follow (*)          who, whom                               room, chars in room                       yes
  try_group               who, whom, what                         chars, global                             yes(17)
  try_movement (*)                                                same as movement                          yes
  try_put (*)             who, top, cont, obj                     obj, room, mobs, container                yes (4)
  try_ride                who, horse                              horse, rider                              yes
  try_scout               who, whose room, scouted room, dir |    both rooms, chars,                        yes
                          objs and eq in both rooms                                                         
  try_shop (*)            shop, obj, how, who, cost               shopkeeper, room, obj, : yes(15) player   
  try_spell (*)           caster, spell, target, mana             room, chars & obj in room, eq on caster   yes
                                                                  and victim                                
  try_steal (*)           who, victim, what, seen                 room, chars in room, what                 yes
  try_swim                who, from, to                           from, to, chars and objs in both rooms    yes(14)
                                                                  for players, eq                           
  try_take (*)                                                    same as take                              yes
  try_take_container (*)                                          same as take_container                    yes
  try_tell (*)            from, to, msg                           the mob told                              yes
  try_zone_reset          zone                                    global                                    yes(26)
  weather (*)             type, value                             global                                    no
  weather_message         room, global                            see /mh w m                               yes
  whois                   targetname                              global                                    yes

  zone_reset              zone                                    global                                    yes (3)

 3. Can't be overridden.

 4. EVENT_DROP, EVENT_TAKE, EVENT_GIVE, EVENT_PUT and EVENT_TAKE_CONTAINER is
    sent recursively to any objects in obj if it is a container.

 9. dmg < 0 is a miss. Overriding or moving the victim cancels the hit, and
    will probably make Manwe cancel you. This event is VERY UNSAFE.

 14. Sent when a person tries to move from one room to another and that move
     will cause a swim/climb test. The event is sent before any such tests are
     done. Can be either overridden, or one can call swim/climb_succeed which
     suppresses the normal C swim/climb test and will immediately proceed until
     the event_try_movement call. event_try_swim is also sent when moving
     between rooms with ice in them, so one should test for ice to do anything
     swim-related.

 15. shop is the vshop_xxx vector. how is one of shopev_buy, _sell, _mend,
     _mend_return, _produce seen from the player's point of view. who is the
     player buying things (or null for shopev_produce). cost is the price (or
     null for shopev_produce and shopev_mend).

 17. The what argument is a group_cmd_xxx constant.

 18. "type" is one of scout_{hidden,shape,seen}

 19. Causing anything to be written to the syslog from a reaction to this event
     is very unwise.

 24. "flags" has one reason field: "flags & mood_change_reason_mask", one of
     the mood_change_reason_xxx values, and a "mood_change_flag_next" flag,
     indicating that this change will take effect "soon" (i.e., will not show
     up as char_mood() right away). Only the "next" flagged events can be
     overridden.

 26. Can be overridden, but this is not advised. You should use
     override_zone_reset() to override only certain rooms.


Important
---------
 1. If you pass -event_xxx as the event name to react_event() for a mobile,
    then that mobile will react to the event even if it is in a delayed action.
    Cf. /ml man react_event.

 2. It is a very bad idea to move, kill or purge involved chars or objects
    while handling immediate events. If you need to do this, override the event
    and do what needs to be done inside call_in(fn() ..., ..., 0).
```

## EXIT

```text
EXIT, LABELS, LOOPS

The loop keyword is used to create infinite loops. It is followed by an
expression, which will be executed repeatedly: loop <expression>.

The exit keyword can be used to break out of loop expressions. You write
exit<label> <expression>, where label is a named expression containing the exit
expression.

You can label any expression by prefixing it with <label>:

<mylabel> [
  if (do_something())
    exit<mylabel> 4711;
  do_somethingelse();
]

If do_something() returned true, do_somethingelse() will never be evaluated,
and the block statement will return 4711.

You can of course use exit to break out of a loop keyword's expression:

<myloop> loop
[
  if (l == null)
    exit<myloop> "done";
  l = cdr(l);
];

There is a special variant of the exit expression that breaks out of the
innermost loop, while, or for statement, and it does not take any label name:

i = 0;
loop
  if (v[i++] == elt) exit i - 1;

All functions implicitly have the function label:


fn (arg)
[
  if (arg == null)
    exit<function> 12;
  17 . arg
]

For-loops have implicit break and continue labels. See /mhelp for for more
information.
```

## FOR

```text
FOR

Syntax:

   for ( <vars> <expr> ; <expr> ; <expr> ) <expr>

Where <vars> and all <expr>s except the last are optional.

Example:

   for (;;) ...                   // infinite loop
   for (i = 0; i < 10; ++i) ...   // loop global i 0 through 9
   for (|i| i = 7; i; --i) ...    // loop local i 7 through 1

You can use exit to continue or leave the for expression:

   for (...) [
     if (skip?) exit<continue> null;
     :
       exit<break> 7;
     :
   ]

exit<continue> works like continue in C (the value argument is discarded).

exit<break> or an unlabeled exit works like break in C (the value is what for
returns).

For reference, this is how for is implemented:

  > /mud mudlle_unparse(mudlle_parse("for(|v|a;b;c) d", null, false), false)
  <break> [
    | v |
    a;
    loop
      [
        if (!b)
          exit<break> 42;

        <continue> d;
        c
      ]
  ]
```

## HEARTBEAT

```text
HEARTBEAT

 * check for new connections

 * read input from all connections
    + handle telnet protocol
    + handle remote editing protocol
    + queue input

 * process player commands
    + reads one line from input queue

 * move chars from limbo to starting room
    + set mudlle data back to character (from possible gone)
    + unswitch if switched
    + set depressed for BNs
    + move to starting room

 * check pending waits; e.g., delayed_action()
    + if a wait is done, call its end function in C or mudlle
    + otherwise, send twiddler prompt

 * run all delayed mudlle events

 * save one room in round-robin fashion
    + save hidden items in room

 * run C events
    + position_action() timeouts
    + C affect timeouts

 * run mudlle scheduler
    + run medium-term ops
    + run near-term ops
    + run long-term ops

 * update room affects
    + darkness, watch, portal, break


 * update game time
    + each new game hour, send event_tick

 * each minute (tick)
    + send any reboot messages
    + modify Sauron's darkness
    + send any sun and moon messages
    + update weather
       - send weather change messages
    + update points
       - do nothing for linkless and voided
       - hurt wounded
       - apply/advance diseases and poisons
       - possibly hurt stunned, incap, mortallyw
       - decrease drunkenness
       - increase hunger/thirst
       - check Istari
          * send quest timeout messages
          * reduce XP
       - check idleness/linkelessrent
    + decay encounter counters
    + update warlord status
       - decays WPs
       - reads 10 players from disk

 * every 24 minutes
    + move alignment toward base align
    + decay skill knowledge

 * every 15 minutes
    + write war status to webpage

 * each minute plus 30 seconds
    + decay room TPs
    + update object timers

 * each minute plus 20 seconds

    + update magic noise

 * every 30 seconds
    + repop zones
    + decay tracks

 * every 5 seconds
    + check auto-linkdrop timeouts

 * scan all fighters
    + if ch->in_room != ch->fighting->in_room, clear fight
    + ++ch->fight_pulse
    + if may flee (ch->next_flee_pulse <= current_pulse)
       - if have FLAG_FLEE, try to flee
       - send event_flee_round for NPCs
       - set FLAG_FLEE for PC if wimpy
    + if delayed/frozen ++ch->next_hit_pulse
    + otherwise if ch->next_hit_pulse <= current_pulse
       - try to hit opponent

 * every 5 seconds
    + handle Troll sunburn

 * if !((pulse + 1) % (6 * loops_per_second))
    + handle Bear returns

 * every 10 seconds
    + handle STREAM flagged exits

 * send random lightning messages

 * send all output to connections

 * check external programs like /mud mgrep() or /mgit

 * reload data files if someone has run /mud mume_reload_data_files()
    + view texts
    + social messages


 * increase mume_pulse()
```

## HELP STRINGS

```text
DOCUMENTATION, HELP STRINGS

Mudlle documentation can be found using:

  /mlib                        see /help mlib
  /mud help(<function>)        
  /mud apropos("<substring>")  
  Emacs mudlle-mode.el         see /mhelp emacs mudlle-mode.el

The following are basic guidelines for documenting mudlle functions and
variables. They are not set in stone, but have a good reason if you deviate
from them.

All global functions and variables should be properly documented.

Functions are documented in the optional string between the fn keyword and the
argument(s). The documentation string can be a concatenation of multiple
strings, which can help line-wrapping.

Mudlle function documentation strings should have the following parts:

 1. argument specification; e.g., n s
 2. an arrow ->
 3. return value specification; e.g., t
 4. a period .
 5. the help text

The help text should be a proper sentence ending with a period.

In all these strings, parameters, constants (except null, false, and true),
function calls (except when the list(), cons(), sequence(), and vector()
functions are used to describe a data layout) should be preceded with a
backtick (`).

This is used by the help system (on-line in MUME and in the Emacs mudlle-mode)
to add special markup or hyperlinks.

You should use tabs (\t) to indicate line-wrapping positions:


  "  `foo  \tthis is a long line"

may display as, with a tiny terminal width:

  foo  this is a
       long line

with foo in the "emphasis" color, as set by change color emphasis.

Compare the source of arg_one_of() to /ml man arg_one_of for a longer example.

When referring to other functions, add a () suffix to mark them as such.

Non-functions are documented using the document() function. Please add the call
near the code that uses/defines the variable.

If the symbol you want to highlight contains a colon (:) you have to add an
additional backtick for the colon: `foo`:bar() will treat foo:bar as one
symbol.

For parameters, you can use the following letters to indicate their type (based
on MUME source code mudlle/runtime/prims.h):

    b     boolean (any type, interpreted as a boolean value)
  f or c  function (closure)
    l     list (pair or null)
    n     integer
    o     object
    p     pair / player / character
    s     string
    t     table
    v     vector
    x     any type

For long documentation strings with multiple paragraphs, consider using double
newlines and triple-quoted strings for improved legibility.
```

## INTRODUCTION LANGUAGE

```text
INTRODUCTION LANGUAGE


Variables and types
-------------------
Mudlle is garbage-collected (no explicit "free" operation). The typing is
dynamic but strong; i.e., you can reassign a string to a variable that used to
contain an int, but you can't add an int and a string.

The common types are (full list in "/mh types"):
 * int: 63-bit (!) signed integers. Cf. INTBITS, MININT, and MAXINT.

 * string: Possibly mutable, fixed-size strings.

 * object, character: MUME objects and characters (PC & NPC). Rooms are
   represented as ints.

 * gone: Dead characters and purged objects become of type "gone".

 * vector: Like C's arrays, fixed-size. Example: v = vector(1, 2, 3); v[0].

 * list: Single-linked lists, Lisp-style (see /mh lists). Can sometimes be used
   as associative containers and sets, see /mh container types.

 * null: the final element of a list, sometimes used as "nothing".

 * table: a hash-table indexed by case- and accent-insensitive 8-bit strings.
   Syntax: mytable["foo"].

   Case- and accent-sensitive tables also exist (but are more rare).

There are further, user-defined, data structures constructed from the above:
see /mh container types.

Functions and code blocks
-------------------------
library chars
defines char_legend?

/* ... */
[
    char_legend? = int fn
        "`p|`n -> `b . True if `p (or its number `n) is a level 26+ mortal."
        ({character,int} who)
    [
        | level |
        if (integer?(who))
        [
            level = player_level(who);
            assert_message(level != 0, "invalid player number");
        ]
        else
            level = char_level(who);

        if (level >= LVL_GOD)
            exit<function> false;

        level >= LVL_LEGEND;
    ];
];

This (convoluted) example demonstrates a few points:

 * Mudlle files' contents must be enclosed in a module or library block.

 * [] brackets delimit code blocks. They can be left out (even for functions)
   if the block consists of a single expression.

 * Local variables are declared with the | var1, var2 | syntax.

 * The return and (most importantly) the argument types should be declared (see
   /mh types). They will be enforced at runtime, but the compiler will emit
   compile-time warnings in most cases.

 * exit<function> returns prematurely from the function.

 * Otherwise, the last expression determines the return value.


 * Global functions must have a help string between the fn keyword and the
   arguments declaration. See /mh documentation.

 * Named functions are just an anonymous function (fn keyword) assigned to a
   variable.

Function names may include ? and ! as last characters, by this convention:
boolean predicates is_xxx() are named xxx?() instead; functions that forcibly
alter their argument are suffixed by ! (such as sfill!()). : is sometimes used
for library prefixes: story:install().

Booleans
--------
The boolean false is the integer 0; anything else is true. However, the "true"
constant is just the integer 1. So you should never compare to "true", because:

  if (42 == true)  // WRONG, false because 42 != 1
  if (42)          // Correct, true

Conditional constructs
----------------------
  if (var == 42)
      do_thing()
  else if (var == RACE_ELF)
      do_other_thing()
  else
      do_otherwise();

  match (var)
  [
      42        => do_thing();
      ,RACE_ELF => do_other_thing();
      _         => do_otherwise();
  ];

Both constructs return the value of the expression evaluated (ex: do_thing()),
unless this is an if with no else clause.


See also: /mh match.

Loops
-----
We rarely use explicit loops like for, while and loop.

Instead, there is a sizeable amount of functional constructs that are less
bug-prone:

 * lforeach, vforeach, ...: generic per-item iteration.

 * lfind?, vfind?, ...: checks if some value is in the container.

 * lexists?, vexists?, ...: returns the first item that matches a predicate.

 * lforall?, vforall?, ...: checks that all items match a predicate.

 * And much more!

Examples:

  room_echo = fn (int room, string msg)
      room_people_foreach(fn (character p) send_wrap(p, msg), room);

  has_the_answer? = fn (vector answers)
      vfind?(42, answers);

  experienced_account? = fn (int account)
  [
      | legends |
      vforeach(
          fn (int pno)
              if (char_legend?(pno))
                  legends++,
          account_players(account));

      legends > 5;

  ];

  experienced_account? = fn (int account) // Shorter version
      vlength(vfilter(char_legend?, account_players(account))) > 5;

Error handling
--------------
All errors are fatal. They can be intercepted, but not used as a general
try/catch mechanism because they will generate a calltrace in /debug anyway.

You can (voluntarily) cause errors in your code using error(), fail(),
fail_message(), abort(), and abort_message().

Unusual operators
-----------------
All operators (see /mh operators) are like C except for:

 * + also concatenates strings.

 * if (cond) val1 else val2 replaces cond ? val1 : val2.

 * . creates a pair.

 * ^^ is a logical XOR.

Reference/value semantics
-------------------------
All values are stored in variables (and passed around) by reference, except for
ints. So:

  | a, b |
  a = b = make_vector(1);
  a[0] = 42;
  display(b[0]); // 42

  a = b = 0;
  a = 42;
  display(b); // 0


Protected variables
-------------------
The contents of variables should be made immutable (recursively read-only) when
possible as it improves the performance of the garbage collector.

protect() makes a variable read-only, rprotect() does so recursively. Or use
one of the (preferred) shorter syntaxes when creating new data structures:

  '[ 42 "abc" ,RACE_ELF ]     // A protected vector (aka. sequence)
  '( 42 "abc" ,RACE_ELF )     // A protected list
  '[ 42 ( a b c ) ,RACE_ELF ] // A protected vector containing a protected list
  '{ "foo"=42 "bar"=44 }      // A protected table

Note: the entries are not separated by commas. The comma is only used to
reference existing variables.

Libraries and modules
---------------------
Files that provide global functions and variables should be libraries:

  library frob
  requires someotherlib
  defines myfunction, MYGLOBAL
  reads EVENT_FOO
  [
      MYGLOBAL = 42;
      myfunction = fn "..." () ...;
  ];

Libraries must be registered once with:

  /mud register_library("frob", "Frobs foos into bars", "utility/frob.mud");

This updates base/libraries.txt, don't forget to commit it!

Everything else (such as objects/6532) is a module:


  module
  requires frob, someotherlib
  reads EVENT_COMMAND
  [
      | use_bag |
      use_bag = fn (me, who, cmd, args)
      [
          if (cmd == CMD_USE && ...)
              // Load a random mobile
      ];

      react_event(use_bag, "create a random monster when used", EVENT_COMMAND);
  ];

By convention, reactions and registrations are always at the end of the file.

More about libraries and modules: /mh modules.

Further reading
---------------
See also: /mh, b19, and the (obsolete) o10, o11 and o5606.
```

## INTRODUCTION MUME

```text
INTRODUCTION MUME

This file describes how your code interacts with the MUME engine (C code).
It'll hopefully give you the big picture and enough pointers to the details.

How the MUME engine calls your code
-----------------------------------

Module execution

The body of all files (which should be proper modules or libraries) is executed
once by MUME when the game boots, and at mudller's will through /mud load().

This is the proper execution context to react (subscribe) to events. You may
react to global events from everywhere, but reacting to the events that a
mob/object/room xxx may receive is only possible from within a mobiles/xxx,
objects/xxx, or rooms/xxx mudlle file; or a function called by that file.

Further information: /ml man ^react, /mh events, /mh modules.

Events

Events are the main entry point for mudlle that implements game features.

Immediate events (for example event_try_movement) are called before the action
happens and give you an opportunity to override (and sometimes alter) the C
behavior. Otherwise (for example event_movement), MUME merely informs you that
the action happened. Use the latter unless you need the former.

MUME will call your reactions (event handlers) with a first argument (commonly
named me) that represents the mob, object or room that reacted. The rest of the
arguments are as in /mh events.

Mudlle code may define new events and cause events (causing C events from
mudlle is usually a bad idea).

Further information: /ml man ^react, /mh events, /ml man ^overrid, /ml man
allocate_event, /ml man cause_event.


Delayed callbacks

You may request MUME to call you back after a delay, using the call_in()
function family.

If the delay is actually about a character performing an action,
delayed_action() will call you back when the action is finished or has been
interrupted, in addition to the effects you'd expect (prompt etc).

Further information: /ml man call_in, /ml man delayed_action, /ml man
cancels_wait$.

And more

After a player is done editing a text, when printing affects in stat/info etc.

How your code calls the MUME engine
-----------------------------------
MUME exposes a rich set of primitives (global functions implemented in C),
complemented by a large set of mudlle libraries. They're all documented in
/mlib man.

Some primitives are unavailable to you, depending on the security level of your
code (your level for /mud, the file's seclevel for files). Calling such
primitives (possibly through mudlle libraries) will cause an
error_security_violation. Mudlle functions may also cause that error on their
own (and in rare cases, V+ mudlle may unlock them by raising its minlevel).

Further information: /mlib man, /mh seclevels, /ml man ^with_.*level.
```

## INTRODUCTION

```text
INTRODUCTION


Introduction for new mudllers
-----------------------------

How to get help

 * Introduction to the language: /mh intro lang.

 * Obsolete, longer introductions: book objects 10, 11, and 5606.

 * Per-topic documentation (should be up to date): /mhelp

 * API reference (up to date): /mlib apropos, /mlib man, and /mlib se arch.
   Note: /mlib also has a per-topic listing, but a lot of functions are not
   classified.

 * Long list of announcements: b19 (the old posts are obviously obsolete, but
   you may learn a thing or two from this very long read).

 * For improved legibility of help texts, set the emphasis color to bold or
   similar.

How to test mudlle as you learn

 * For oneliners: /mud.
   Example: /mud send_wrap(muduser(), "Hello world!");
   Note: Just typing /mud drops you in the interpreter mode, send a blank line
   to get out.

 * For improved legibility of output, set the code-<xxx> colors; for example
   change colour mudlle default.

 * For longer tests: write files in your private directory (the default
   directory). You can get output by three means: your debug function,
   display() and friends, and returning values out of "define"d functions
   (prefix them by yourname_test_ to avoid globals pollution).


   Note: Do not display() things at file load, as it will clutter the boot log
   that we monitor for bugs.

   Note: Do not leave useless files around, especially if they fail to load
   (same reason), or make sure they get ignored by inserting ** as the two
   first characters on the first line.

 * For testing reactions (or anything you can think about): write code in your
   testroom, or assigned testobj/mob if you have one.

How not to get trapped by your own code

Write this down somewhere: if you mistakenly install a reaction that discards
all your commands, type /escape to un-/react.

How to look for examples:

  /mud list_files("")             // List files in your directory
  /mud list_files("/")            // List all mudlle directories
  /mud list_files("game")         // List files in the game/ directory
  /mud view("game/chars.mud")
  /mud mgrep("stars of Elbereth")     // Searches the mudlle files BUT r/m/o
  /mud mgrep_all("Greetings, I am Clint") // Searches all mudlle files

Note: The access you need to read or write a mudlle source file is documented
in /mhelp m m access. If you know of a feature with no game secrets that would
be a useful example, do ask for it to be publish()-ed.

Editing, compiling and loading code

  /mud edit("test.mud")
  /mud compile("test.mud")
  /mud load("test.mud")

The compile step is not stricly necessary, but it provides helpful warnings
(catching bugs for you) and makes your code run faster.


N.b., delete files by emptying them with edit(), rename using move_file().

How to troubleshoot your code

Mudlle has no interactive debugger (as it would freeze the whole game).
However, feel free to insert yourname_debug("here we are:", var1, var2) calls
where appropriate, and then listen to your debug channel with /debug yourname
yes. Hints: make it easy to enable/disable debug in your module, and (for V+)
create feature-specific debug channels.

Also, make sure that you listen to calltraces (errors triggered by mudlle code)
using /debug trace on, or you may not even be aware of errors happening in your
reactions. Please remove (/debug trace rem <XXX>) all your calltraces from the
list, or other mudllers may investigate them thinking they're bugs in open
areas.

Tools for observing mudlle

/misc data shows you the data stored in rooms, mobs, players, objects etc - at
least, the entries that you may read.

/misc mudlle-reactions shows the reactions installed on anything you have
/access to.

Don't forget to commit

Please read /help mgit and apply its guidelines. Uncommited code creates a
cluttered /mgit status, and causes headaches when we merge our git topic
branches.

Before committing, use /mgit diff -- your/file.mud to see what changed. Any
trailing spaces (bad!) will be highlighted red.

Useful client setup

The bare minimum is a client with support for local editing. You may also want
to set a login alias:


  alias at-login /react on; /debug <yourname> yes; /debug trace on

See also

/mh intro ?? and /mh common mistakes.
```

## LABELS

```text
EXIT, LABELS, LOOPS

The loop keyword is used to create infinite loops. It is followed by an
expression, which will be executed repeatedly: loop <expression>.

The exit keyword can be used to break out of loop expressions. You write
exit<label> <expression>, where label is a named expression containing the exit
expression.

You can label any expression by prefixing it with <label>:

<mylabel> [
  if (do_something())
    exit<mylabel> 4711;
  do_somethingelse();
]

If do_something() returned true, do_somethingelse() will never be evaluated,
and the block statement will return 4711.

You can of course use exit to break out of a loop keyword's expression:

<myloop> loop
[
  if (l == null)
    exit<myloop> "done";
  l = cdr(l);
];

There is a special variant of the exit expression that breaks out of the
innermost loop, while, or for statement, and it does not take any label name:

i = 0;
loop
  if (v[i++] == elt) exit i - 1;

All functions implicitly have the function label:


fn (arg)
[
  if (arg == null)
    exit<function> 12;
  17 . arg
]

For-loops have implicit break and continue labels. See /mhelp for for more
information.
```

## LISTS

```text
LISTS

Lists in mudlle follow the traditional Lisp representation based on the concept
of 'pairs'. A pair is just what it's name implies: a pair of values. Pairs are
created with the 'cons' function:

  cons(3, 2)
  RESULT: (3 . 2)

There is also the '.' operator that does the same:

  3 . 2
  RESULT: (3 . 2)

You can also create a constant (readonly, immutable) pair using a quote:

  '(3 . 2)
  RESULT: (3 . 2)

The two functions 'car' and 'cdr' return respectively the first and second
element of a pair (the names have historical reasons):

  a = cons(3,2)
  RESULT: (3 . 2)

  car(a)
  RESULT: 3

  cdr(a)
  RESULT: 2

Lists are just a convention on the use of pairs: to pass a list to a function
you pass it a pair. The first element of the pair is considered to be the first
element of the list. The second element of the pair is expected to be either:

 * null (the null value), which means that this is the end of the list.

 * another pair. Then the first element of this second pair is the second

   element of the list, and the second element must be either a pair
   (containing the third element of the list) or null.

 * any other value: the list isn't a proper list (so (3 . 2) above is a
   malformed list).

So we can create the 3 element list (1 2 3) like this:

  endlist = cons(3, null)
  RESULT: (3)

  middle = cons(2, endlist)
  RESULT: (2 3)

  mylist = cons(1, middle)
  RESULT: (1 2 3)

You will notice that the printing functions know about lists and print them in
a friendly fashion ... You can now use 'car' and 'cdr' to look at pieces of
mylist:

  car(mylist) // Get first element
  RESULT: 1

  cdr(mylist) // Get rest of list
  RESULT: (2 3)

  car(cdr(mylist)) // Get 2nd element
  RESULT: 2

You can also create lists using quote:

  '(1 2 3)
  RESULT: (1 2 3)

You can even create a not-null-terminated list:

  '(1 2 . 3)

  RESULT: (1 2 . 3)

which is a readonly equivalent to cons(1, cons(2, 3)).

After this (hopefully clear) introduction, here is a summary of the functions
that operate on pairs / lists:

  pair?: x -> b. Returns TRUE if x is a pair.

  cons: x1 x2 -> l. Make a new pair from elements x1 and x2.

  car: l -> x. Returns first element of pair l

  cdr: l -> x. Returns 2nd element of pair l

  cadr, cdadr, ...: l -> x. Returns car(cdr(x)), cdr(car(cdr(x)), ...

  set_car!: l x ->. Sets the first element of pair l to x. l must not be
  readonly.

  set_cdr!: l x ->. Sets the 2nd element of pair l to x. l must not be
  readonly.

  list: e0 e1 ... -> l. Creates a list of the elements

  list?: x -> b. Returns TRUE if x is a pair or null.

See "/mlib ls /DataTypes/Lists" for more list- and pair-related functions.

Be careful when using set_car! or set_cdr!: you can create a circular list:

  a = cons(3, null)
  RESULT: (3)

  set_cdr!(a, a)
  RESULT: undefined

  a

  RESULT: (3 3 3 3 3 3 3 3 3 3 ....

This result logically follows, because:

  car(a)
  RESULT: 3

  cdr(a) == a
  RESULT: 1

The first element of the list is 3. The pair stored in the 2nd element of 'a',
ie 'a' itself, so the 2nd element is also 3, and so on.
```

## LOCK

```text
LOCK, OPTIMISTIC LOCK

A simple locking mechanism for data that many players may read, but only one
may be changing at any given time.

 * Players get a lock (automatically granted) before beginning to update data

 * The update is performed in a temporary variable

 * A player who wants to commit the change tries to use the previously acquired
   lock.
    + In case of success, the update can be committed and any other players
      lose their lock.
    + In case of failure, the update is lost.

Locks are identified by a unique key (a number, a string, a pair... try to keep
it simple).

Interface
---------
 * get_optimistic_lock(who, key) -> list of lock holders

 * release_optimistic_lock(who, key) -> list of lock holders

 * use_optimistic_lock(who, key) ->
    + if lock was intact, release lock and return true
    + otherwise do nothing and return false

 * lock_and_confirm(who, key, fn) -> get a lock on key, ask the user to confirm
   the current operation, and then call c unless the lock was broken while the
   user was confirming
```

## LOOPS

```text
EXIT, LABELS, LOOPS

The loop keyword is used to create infinite loops. It is followed by an
expression, which will be executed repeatedly: loop <expression>.

The exit keyword can be used to break out of loop expressions. You write
exit<label> <expression>, where label is a named expression containing the exit
expression.

You can label any expression by prefixing it with <label>:

<mylabel> [
  if (do_something())
    exit<mylabel> 4711;
  do_somethingelse();
]

If do_something() returned true, do_somethingelse() will never be evaluated,
and the block statement will return 4711.

You can of course use exit to break out of a loop keyword's expression:

<myloop> loop
[
  if (l == null)
    exit<myloop> "done";
  l = cdr(l);
];

There is a special variant of the exit expression that breaks out of the
innermost loop, while, or for statement, and it does not take any label name:

i = 0;
loop
  if (v[i++] == elt) exit i - 1;

All functions implicitly have the function label:


fn (arg)
[
  if (arg == null)
    exit<function> 12;
  17 . arg
]

For-loops have implicit break and continue labels. See /mhelp for for more
information.
```

## MARKUP

```text
ANSI COLORS, ESCAPE CODES, MARKUP, TEXT MARKUP

Text markup (as controlled by change colour) is handled by sending special
escape sequences inside output. These escape sequences are converted by
render_text() to either ANSI codes, XML markup, or nothing depending on the
player's terminal mode.

The escape sequences have the following formats:

  \033< <code> > ... \033</ <code> >
  \033</ <code> >

where <code> is the markup number (which is the CI_xxx constant plus one). The
start and end sequences are returned by start_color() and end_color(),
respectively.

The %( and %) format() conversions also return the same.

<code> can be followed by &-prefixed, ;-separated tag arguments:

  \033<123&abc=def;ghi=jkl>

where the supported (typically not emitted by mudlle) arguments are:

  Tag          | Arguments
  -------------+--------------------------------
  mt_highlight | &<code>
  mt_movement  | &dir=<dir>
  mt_snoop     | &symbol=<prefix>
               | or &symbol=<prefix>;time=<time>

The renderer also handles standard ANSI codes:

  \033[ [^a-z]* [a-z]

Use slength_noansi() to return the length of a string, not counting any escape
sequences.
```

## MATCH

```text
MATCH, PATTERN MATCHING, PATTERNS


Complex assignment
------------------
Mudlle lets you do "complex" assignments, allowing you to extract fields from
vectors, pairs, and symbols.

Example:
  @[x y] = <some expression>

This will check if <some expression> is a vector with size 2, and will then
assign the values on indices 0 and 1 to x and y respectively.

If the assignment fails (e.g., the expression doesn't result in a vector, or if
it's of the wrong size), there is a runtime error (error_no_match).

The left hand side can be any combination of pairs, vectors, constants and
expressions that will be evaluated at runtime (these have to be preceded by a
comma and surrounded by parentheses except if it's a single variable that's to
be read). Constants and runtime expressions will just be checked to see that
they match the right hand side's value at that position using equal?().

The returned value of the @ statement is undefined.

Pattern match statements
------------------------
The control statements match and match! work a little like a C switch, but you
can use pattern matching:

match (a) [
  [ 3 x ]    => <statement>;    // this will be run if a is a 2-elem.
                                //   vector starting with 3
  [ x y ]    => <statement>;    // this will be run if a is a 2-element vector
  ( x y z )  => <statement>;    //         - " -              3-element list
  ( x . y )  => <statement>;    //         - " -              pair
  < n = v >  => <statement>;    // this will be run if a is a symbol
  {string} x => <statement>;    // this will be run if a is a string

  x          => <statement>;    // this will be run for any a
]

match (char_race(p)) [
  ,race_orc   => run_the_orc_function();
  ,race_troll => run_the_troll_function();
  _           => display("This only works for orcs and trolls");
]

A match statement will find the first matching "match node" and then run that
node's statement (to the right of =>), with the variables to the left filled in
with proper values.

Note that variables in match patterns are local to that match node, while the
@-assignment above uses variables in the current scope.

A match statement returns the return value of the matched node's right hand
side, or false if no node was matched. If you want an error, use match! instead
of match:

match! (argv)
[
  [ a0 ] => ...;
  [ a0 a1 ] => ...;
  // throws error_no_match unless argv is a 1- or 2-element vector
];

Function arguments
------------------
One can also use patterns in function arguments:

  // self-explanatory?
  my_car = fn (@(x . _)) x;

  // return first element of vector or list
  first_element = fn (@[x ...] || (x . _)) x;

  // call foo(name, value) for all symbols in my_table

  table_foreach(fn (@<x = y>) foo(x, y), my_table)

This:
  f = fn (@<pattern>) <expr>

is mostly syntactic sugar for:
  f = fn ($arg0)
    [
      | <vars> |
      @<pattern> = $arg0;
      <expr>
    ];

More on patterns
----------------
_ acts as a sink and matches any value.

{<type>, <type>, ...} can be used before a variable or a sink and will only
match if the value is of one of the listed types:

  @{int,string} x = y;

The above will assign y to x if it is a string or an integer; otherwise it will
throw an error.

... can be used (at most once) in vectors to match any number of elements.

[ x y ... ] matches vectors of size 2 or longer.

[ 1 ... 2 ] matches vectors whose first and last elements are 1 and 2,
respectively.

A pattern may optionally be followed by && and an expression, adding an extra
level of pattern checking:

  match (x) [
    x && magic_cookie?(x) => this-will-be-run-for-all-cookies;
    x => this-will-be-run-for-anything-else;

  ]

Note that all the lines have "different" x'es in the above example. The
match (x) line's is the one present in the context of the match statement,
while the two match pattern lines have x:es individual to each line
respectively.

|| can be used to match alternative patterns. This returns the first element of
a one-element vector or list:

  match (x) [
    [ e ] || ( e ) => e;
  ]

A pattern element can be (p0 || p1) to match either pattern of p0 or p1; or
(p0 && e) to match p0 and have the expression e evaluate to true:

  match (x) [
    [ (1 || 2) ... ] => "foo";
    ( (y && f(y)) . _ ) => "bar";
  ]

This returns "foo" if x is a vector whose first element is 1 or 2; or "bar" if
x is a pair and f(car(x)) returns true.

Pattern comparison is done depth first from left to right, and variables will
be assigned, and expressions will be evaluated as we go along. Thus, you can
use [ x ,x ] to match a vector with two equal values.

If it wasn't clear, patterns can be combinations of vectors, lists, constants
etc:

  [ ,race_orc ( x y z ) [ _ "test" ] ]

Note the use of the equal?() for comparison; i.e., strings are compared with
string_cmp(), floats with fcmp(), etc. See /mud help(equal?) for details.

Also note that after a comma (meaning runtime evaluation), you can either have

a variable name, or any expression enclosed in parentheses.

Run one of the following:

  mudlle_unparse(mudlle_parse("@[ x y ] = f()", ""), 0)
  examine(fn() match (x) [ [ ... ] => true ])
  mc:compile(mudlle_parse("@[ x y ] = f()"), false, lvl_vala)

to see the kind of code that is generated.

Set mc:disassemble = 1 before testing with mc:compile(). Please set it back to
0 when you're through playing with it!
```

## MCOM

```text
MCOM, MUDLOAD

It is often difficult to keep track of where and how a certain object or mobile
is loaded via mudlle -- by butcher, herblore, crush, as reward for a quest, as
member of a fortress garrison, and so on. Hence this set of registry functions,
which are interfaced to /misc query and should always be used when your code
creates a mobile or an object.

To get the list of all fn's: /mud apropos("mudload")

Since there are a lot of fn's, an example is probably the best way to explain
how this works. Let's say we want to register loads by butchering.

 1. Define a unique identifier string that explains "how" the item is produced.
    butcher seems perfect. Let's see, did anyone use it before us?

    /mcom types -> ...a list of existing types...

    ...No, nobody used it. Perfect.

 2. Decide what kind of data identifies the load. For butchering on mobs, it's
    the mob vnum. Now we write a nice display fn for this kind of loading...

    butcher_display_fn = fn(x) textf("butchered from m%4s [%s]",
                                     x, mobile_model(x)[mm_short])

    ... and we install it. This must be done once per reboot, so we place this
    in game/butcher.mud:

    register_mudload_display(SELECT_OBJECT, "butcher",butcher_display_fn)

    If we had been developing a mudload type for mobiles, we would have used
    SELECT_MOBILE.

 3. Now we want to tell the registry whenever a new item is added to the list
    of butcherable items. So, in the /misc butcher <mob> add code, we insert
    the following line:


    register_mudload(SELECT_OBJECT, OBJECT_VNUM, "butcher", MOBILE_VNUM)

    In the same way, when an object is removed from production list,

    remove_mudload(SELECT_OBJECT, OBJECT_VNUM, "butcher", MOBILE_VNUM)

    These operations need to be performed once per reboot, not every time you
    actually load the object (which would be a waste of CPU time, but wouldn't
    cause other harmful effects).

There are other functions in the registry library, to read the registry or to
perform mass-deletion of old entries. They should be self-documenting -- just
apropos("mudload") *wink*. Most of them are used in the definiton of /mcom
(Fror/registry).

Currently available register types are the following:

Objects:

Type      Data         Usage
butcher   [mob vnum]   Reserved for /misc butcher
cook      [obj vnum]   Item created by cooking another (o2104) 
cook_salt [obj vnum]   Item created by salting another (o2104) 
crush     [obj vnum]   Item created by crushing (/lib herb) 
dress     [mob vnum]   Auto-loaded on a mob by /misc dress
fortress  [sequence(fort_name, allegiance, room)]
                       Reserved for /misc fortress
herblore  [number]     Product of a herblore recipe
mine      [room]       Mined from a room (/lib mine)
reward    [mob vnum]   Reward granted by a generic mob
special   [string]     Catch-all type, string is displayed as is
root      [obj vnum]   Item grows from a hidden root (plant_root())
treasury  [room]       Item loaded by mudlle on the ground

Mobiles:
Type      Data         Usage
fortress  [sequence(fort_name, allegiance, room)]
                       Reserved for /misc fortress

special   [string]     Catch-all type, string is displayed as is
```

## MENU

```text
MENU

The menu system for MUME, found in Fror/menu, is an alternative to the generic
MUME parser. You should use the menu system for interactive commands, which
require order confirmation or context-dependent parsing; the parser, for
simpler commands, which the user types in one command line.

How to use the menu system?

First of all, make one or more menus.

A menu is a list; its first element is a prompt, the following elements are
(commandword . dispatcher) pairs.

If a simple prompt suits you, you can simply provide a string; if you want
something more intricate, you may use a fn: p -> s. For example,

  simple_prompt = "MyMenu> ";
  room_prompt = fn (p) roomid_string(char_room(p)) + " > ";

A dispatcher is a fn: p s:args -> b. It should return one of the following
values:

  0 - Leave the menu system
  1 - Drop the rest of the input line, display a prompt
  set_char_menu!(who, newmenu, args) - Change to a new menu (or even to
                                       the current menu!) and evaluate
                                       the next word

The first word of the user's input is scanned and matched against all
commandwords. The dispatcher corresponding to the first matching abbreviation
is executed. "" matches everything. If no dispatcher is found, the list of
commands is displayed.

Here are two simple interlinked menus:

  menu1 = list(
  "Quit or Menu2 > ",

  "quit"   . (fn (who, s) [ send_char(who, "Quit args: '" + s + "'\n\r"); 0 ]),
  "menu2"  . (fn (who, s) [ send_char(who, "Menu 2!\n\r");
                            set_char_menu!(who, menu2, s);
                          ]));
  menu2 = list(
  "Quit, Chomp or Menu1 > ",
  "quit"   . (fn (who, s) [ send_char(who, "Quit args: '" + s + "'\n\r"); 0 ]),
  "chomp"  . (fn (who, s) [ send_char(who, "Chomping '" + s + "'\n\r"); 1 ]),
  "menu1"  . (fn (who, s) [ send_char(who, "Menu 1!\n\r");
                            set_char_menu!(who, menu1, s);
                          ]));

DO NOT mix set_char_menu! with constant 0's or 1's. It is important that its
return value is correctly passed up through the call stack. On the other hand,
DO NOT stack calls to start_char_menu. If you need to go to a submenu, use
set_char_menu!.

Once you have a full set of menus, you can use them to parse user input. You
usually do it by calling

start_char_menu(p, menu1, cleanup, hide?, args);

where cleanup is 0 or a cleanup function (called with p as argument); 'hide?'
is true if the normal MUME output is to be hidden while the player is
interacting with the menu system, and 'args' is the rest of the command line
(or "" if none).

In some cases, you may want to use your set of menus non-interactively. You do
it by calling parse_char_menu(who, menu, args): it will parse 'args', and
immediately return.
```

## MODULE DATA

```text
MODULE DATA, PERSISTING DATA


Persisting Data across Reloads and Reboots
------------------------------------------
It is often useful to persist data over time, from the list of players seeking
for Rivendell to shop inventories. Here is a quick list of the available
techniques.

Module Variables

Variables local to your module will be overwritten at every module reload.

Suitable for: constants and caches.

Unsuitable for: anything that will not be automatically computed on module load
or over time - otherwise it makes it impossible to reload your module for
bugfixes and such.

Sample Code
===========
module
[
    | cache |
    ...
];

Static Variables

Suitable for: anything that should survive module reloads, until the next
reboot: zone state etc.

Unsuitable for: anything with a shorter or longer lifetime.

You can have static variables in modules which will retain values across
reloads.

Sample Code

===========
module
writes myget, myset, myref
static data
[
    myget = fn () data;
    myset = fn (x) data = x;
    myref = fn () &data;
]

So, if you call myset(123) and then reload this file, myget() or *myref() will
still return 123 as opposed to null.

The variable name must not change for this to work, but it should survives a
move_file().

N.b., it is not necessary to use accessors from inside your module.

N.b., the compiler does not do type inference for these variables.

Quest Global Data

Suitable for: storing quest data until the next reboot (same lifetime as static
variables).

See: /ml man quest_global_data.

Data Table Entries

Each room, object, mobile, player, account, and connection has an associated
mudlle table, with the same lifetime as the owning "thing" (but see below about
$ variables):

  rooms        until reboot
  objects      until they are destroyed (decay, rent expired, etc.)
  mobiles      until killed or next reboot
  players      nearly forever (until deleted)
  accounts     nearly forever (until deleted)

  connections  until the link is disconnected (player rents or cuts link)

Suitable for: anything linked to this "thing" and with the same lifetime.

Unsuitable for: quest data (see below), anything not matching the definition
above. Be especially careful about not polluting rooms and real players with
test entries.

Notes:
 * Table entries starting with $ are not persisted on disk and will never
   survive a reboot. For example muduser()["$temp"] = 4711 will disappear when
   you rent.

 * Maiar can't access all data table entries, they need a V+ to
   register_data_table_entry_level() for them.

 * Please register_data_table_entry() for an easier to read /misc data output.

 * Select a name that's short yet descriptive and unlikely to conflict with
   other mudlle.

Sample Code

  muduser()["exitecho"] // Your exit echo
  9693["lever_down"]    // The state of that lever
  9600["death-reason"]  // DT type, read by the C code
  account_data(46340, "seen-messages") // Board reading status

Quest data

Suitable for: storing permanent data about a player's progress in a quest
(stored in the player's data table).

See: /ml man quest_data.

Data Files

read_data() and write_data() serialize any mudlle data structure to disk. By

definition, this will persist over reboots.

Examples: Ilie's InstaMountRecover(tm), a lot of justice features (both in
cities and versus cheaters), shops, books, /misc newbie, /project, etc.

Unsuitable for: common quests (use the quests library instead), anything that
can accept a shorter lifetime.

Notes:
 * The file name is arbitrary in a dedicated directory. Be careful about naming
   conflicts and leftovers. See data_files() for a list.

 * read_data_safe() returns null instead of erroring out if the file doesn't
   exist (yet), unlike read_data().

 * Depending on how often your data is accessed and how large it is, use one of
   these two strategies: unload your data when it is not in use (saving
   memory), or keep a cache of it once it is read (saving I/O).

 * Not all data types can be stored on disk. They will be converted to {gone}
   instead.

Sample Code
===========
module
requires data
[
    | MYFILE, data_cache, data, set_data! |
    MYFILE = "mymodulename";

    data = fn ()
    [
        if (null?(data_cache))
            data_cache = read_data_safe(MYFILE);
        data_cache;
    ];

    set_data! = fn (newdata)

    [
        write_data(MYFILE, newdata);
        data_cache = newdata;
    ];
];

Global Variables - Do Not Use Them

This is a crude attempt at persisting data over reloads. However, it clutters
the global namespace and exposes your internals to the whole world. Don't do
this without A+ approval.

N.b., Maiar can't read nor write global variables.

Sample Code
===========
module
writes foo_data
[
    ...
];
```

## MODULES

```text
MODULES, MUDLLE LIBRARIES

Mudlle includes a module facility, to simplify the development of large pieces
of code. It was developed with the following aims in mind:

 * allow related functions, constants, etc to be grouped together into
   libraries.

 * provide some management of the global name space

The main component is the library: a library has a name and defines a number of
variables, eg:

  library simple
  defines sym1, sym2
  [
    sym1 = 23;
    sym2 = fn (x) x + sym1;
  ];

A library is thus like a normal file, with a special header. Once simple is
loaded, the variables sym1 and sym2 are said to "belong" to it. They cannot be
modified by any other piece of code (attempts to do so will produce compile or
runtime errors, depending on the exact circumstances). This includes the bodies
of the functions defined in simple (essentially the defined variables can only
be set at the top level of a library, which is executed when the library is
loaded).

What is more, a library must explicitly declare the global variables that it
wishes to use, either explictly by name (the reads & writes declarations
below), or by importing other libraries:

  library complex
  requires system, simple
  defines complex1, complex2
  writes count
  [
    complex1 = fn (x) display(sym2(x));


    complex2 = fn (x) [ count = count + sym2(x) ];
  ];

If complex did not require simple, then various errors would occur when it was
loaded (e.g., "read of sym2"). All the standard functions are included in the
system module which must also be imported.

The reads and writes declarations are used to declare that the library wishes
to access particular variables (which may for instance not belong to any
module). writes x, y, z is necessary for all global variables x, y, and z that
are modified by a module. Use of writes does not allow you to modify variables
which belong to another module.

The full syntax is:

  library <name>
  requires <lib1>, <lib2>, ...
  defines <def1>, <def2>, ...
  reads <v1>, <v2>, ...
  writes <w1>, <w2>, ...

The above order must be requested, and the defines clause may not be ommitted.
If a variable is present in the writes clause it may also be read.

Libraries are normally loaded only once. If you load a library l1 that requires
l2, mudlle checks to see if it is already loaded. If not, it attempts to load
the code of l2 (the details of how this code is found depend on the environment
in which mudlle is run). If l2 is not found, or if loading it causes an error,
then l1 may or may not load (if l1 is compiled it will not, if it is
interpreted it will).

A library can be reloaded explicitly but, depending on the changes you made,
code that uses it may stop functioning; e.g., if you remove one of its defined
variables).

There can not be loops in the requires clauses of libraries; i.e., the
following is illegal:


  library a
  requires b
  defines v1
  [
    v1 = fn (x) if (x) v2(x) else 0;
  ];

  library b
  requires a
  defines v2
  [
    v2 = fn (y) if (!y) v1(0) else 99;
  ];

If you find you really need such circular dependencies, use reads in one of the
libraries:

  library a
  requires b
  defines v1
  [
    v1 = fn (x) if (x) v2(x) else 0;
  ];

  library b
  defines v2
  reads v1
  [
    v2 = fn (y) if (!y) v1(0) else 99;
  ];

Attempts to load a library that defines a variable that already belongs to
another library will fail (see below if you get such an error while trying to
rename a library).

Not all code wishes to define variables: for instance the code on MUME rooms,
objects, etc only wishes to install event handlers. This code can use a

simplified form of the library, the module: a module does not need to have a
name, and defines no variables. Its syntax is:

  module <optional name>
  requires <lib1>, <lib2>, ...
  reads <v1>, <v2>, ...
  writes <w1>, <w2>, ...

There are a number of functions connected with module handling, but they are
mostly for internal use. The useful ones are:

  module_status: s -> n. Returns status of module s (one of 
  module_unloaded, module_loaded, module_error, module_protected)

  module_vstatus: n -> s/n. Returns status of variable n, var_write if
  n is written, var_normal if it is only ever read, the module to which
  it belongs otherwise. Use global_lookup to find the index of a given
  variable.

  global_lookup: s -> n. Returns index of global variable s.

How to lower the level of a loaded library:

  /mud secure("foo", lvl_whatever)
  /mud unload_library("foo")
  /mud some_foo_function()

unload_library() has the side-effect of making the library auto-load at the
first call, so the third command is necessary to make the real code load. It
does not matter if it is called with invalid arguments.

Warning: it may not work for other reasons (most notably, libraries that define
god commands fail to redefine them).

How to rename a library (as in "library a" to "library b"):

 1. Commit any pending changes to the library source.


 2. Edit the library source to define a single global that will not conflict
    with any name you care about (such as "yourlib_deleteme"). Comment out the
    rest of the defined globals.

 3. Load the library, this will disown the globals from library "a", but
    they'll still exist so the rest of the game will keep working.

Warning: reloading code that depends on the library will obviously fail.

Warning: some mistakes in step 2 may leave you with null globals in step 3 and
break the loaded code that depends on this library. Practice before you try
this on something important.

 4. Revert your changes to the library source (/mgit really revert is
    convenient) and change the name as desired. Compile and reload the library.

 5. Update the library registry: delete_library(), register_library().

 6. Update, compile and reload all files that require your library, then commit
    your changes.
```

## MOON

```text
MOON

The moon state is updated every game minute. Its state can be read using
moon_info() as a vector indexed by mi_xxx constants.

The state within that month is given by the mi_zenith_minute field. If the time
of day (in minutes) equals that value, the moon is at its zenith (due south).
If the time of day is 6 hours earlier, the moon rises in the east, and 6 hours
after, it sets in the west.

Note that the value keeps changing, so it cannot directly be used to tell when
a future event will happen.

If mi_zenith_minute is zero, the moon is full (as it is due south at midnight).
If it is 12 × 60 = 720, the moon is new (as it is due south at midday).

It takes the moon 29d 12h 44min (a real world synodic month) to return to the
same phase: new, half, full, and such.

It takes the moon (29d 12h 44min × 1d) ÷ (29d 12h 44min - 1d) or about 1490.47
minutes to return to the same position in the sky.

The rough position (compass direction) in the sky is given by the mi_position
field.

The moon's current brightness is given by the mi_level field or the
moon_level() function (regardless of whether it is currently above the
horizon).

Whenever the moon's position or level changes, an event_weather of type
WEATHER_MOON is triggered with MOON_NEW_POSITION or MOON_NEW_LEVEL as argument.

Use can_see_moon?() to determine whether a character can currently see the
moon.
```

## MUDLLE DIRECTORIES

```text
DIRECTORIES, MUDLLE DIRECTORIES

The following mudlle directories exist:

  ainu      Ainu-specific code, such as /-commands
  base      fundamental mudlle code, boot log, and data files
  com       /com commands
  commands  game commands
  compiler  mudlle compiler and its support libraries
  data      data structures
  game      game-specific libraries
  global    more fundamental mudlle code
  libs      /lib commands
  mobiles   mobile-specific code
  objects   object-specific code
  places    in-game features specific to certain types of rooms or areas
  quests    quests
  rooms     room-specific code
  social    boards and mail
  utility   general purpose code, not directly game-specific

Personal directories should only contain work in progress and temporary stuff.
Code used in-game should not live in personal directories.

There is a fair bit of legacy code not following the above rules.

To move a file to a different location, use move_file() and make sure to /mgit
commit all changed files, including seclevels.txt and libraries.txt if
necessary.

Code is loaded in the following order at boot; cf. base/mume-loader.mud:

 1. base/mume-loader.mud
 2. the compiler; see compiler/load-compiler.mud
 3. base/load-world.mud
 4. global/
 5. other named directories (ainu/, data/, game/, ...), alphabetically;
    see base/directories.txt

 6. <player>/
 7. rooms/
 8. mobiles/
 9. objects/

Contents of directories is loaded alphabetically or (for rooms, mobiles, and
objects), numerically.

Along the way, any requires are fulfilled as necessary.

When rooms, mobiles, and objects are loaded, the corresponding hooks are run as
documented by hook_add(). Notably, /lib commands are loaded after the
corresponding mudlle file.

New directories can be added using /mud add_mudlle_directory!().

See also /misc mudlle-reactions hooks mobiles|objects|rooms.
```

## MUDLLE LIBRARIES

```text
MODULES, MUDLLE LIBRARIES

Mudlle includes a module facility, to simplify the development of large pieces
of code. It was developed with the following aims in mind:

 * allow related functions, constants, etc to be grouped together into
   libraries.

 * provide some management of the global name space

The main component is the library: a library has a name and defines a number of
variables, eg:

  library simple
  defines sym1, sym2
  [
    sym1 = 23;
    sym2 = fn (x) x + sym1;
  ];

A library is thus like a normal file, with a special header. Once simple is
loaded, the variables sym1 and sym2 are said to "belong" to it. They cannot be
modified by any other piece of code (attempts to do so will produce compile or
runtime errors, depending on the exact circumstances). This includes the bodies
of the functions defined in simple (essentially the defined variables can only
be set at the top level of a library, which is executed when the library is
loaded).

What is more, a library must explicitly declare the global variables that it
wishes to use, either explictly by name (the reads & writes declarations
below), or by importing other libraries:

  library complex
  requires system, simple
  defines complex1, complex2
  writes count
  [
    complex1 = fn (x) display(sym2(x));


    complex2 = fn (x) [ count = count + sym2(x) ];
  ];

If complex did not require simple, then various errors would occur when it was
loaded (e.g., "read of sym2"). All the standard functions are included in the
system module which must also be imported.

The reads and writes declarations are used to declare that the library wishes
to access particular variables (which may for instance not belong to any
module). writes x, y, z is necessary for all global variables x, y, and z that
are modified by a module. Use of writes does not allow you to modify variables
which belong to another module.

The full syntax is:

  library <name>
  requires <lib1>, <lib2>, ...
  defines <def1>, <def2>, ...
  reads <v1>, <v2>, ...
  writes <w1>, <w2>, ...

The above order must be requested, and the defines clause may not be ommitted.
If a variable is present in the writes clause it may also be read.

Libraries are normally loaded only once. If you load a library l1 that requires
l2, mudlle checks to see if it is already loaded. If not, it attempts to load
the code of l2 (the details of how this code is found depend on the environment
in which mudlle is run). If l2 is not found, or if loading it causes an error,
then l1 may or may not load (if l1 is compiled it will not, if it is
interpreted it will).

A library can be reloaded explicitly but, depending on the changes you made,
code that uses it may stop functioning; e.g., if you remove one of its defined
variables).

There can not be loops in the requires clauses of libraries; i.e., the
following is illegal:


  library a
  requires b
  defines v1
  [
    v1 = fn (x) if (x) v2(x) else 0;
  ];

  library b
  requires a
  defines v2
  [
    v2 = fn (y) if (!y) v1(0) else 99;
  ];

If you find you really need such circular dependencies, use reads in one of the
libraries:

  library a
  requires b
  defines v1
  [
    v1 = fn (x) if (x) v2(x) else 0;
  ];

  library b
  defines v2
  reads v1
  [
    v2 = fn (y) if (!y) v1(0) else 99;
  ];

Attempts to load a library that defines a variable that already belongs to
another library will fail (see below if you get such an error while trying to
rename a library).

Not all code wishes to define variables: for instance the code on MUME rooms,
objects, etc only wishes to install event handlers. This code can use a

simplified form of the library, the module: a module does not need to have a
name, and defines no variables. Its syntax is:

  module <optional name>
  requires <lib1>, <lib2>, ...
  reads <v1>, <v2>, ...
  writes <w1>, <w2>, ...

There are a number of functions connected with module handling, but they are
mostly for internal use. The useful ones are:

  module_status: s -> n. Returns status of module s (one of 
  module_unloaded, module_loaded, module_error, module_protected)

  module_vstatus: n -> s/n. Returns status of variable n, var_write if
  n is written, var_normal if it is only ever read, the module to which
  it belongs otherwise. Use global_lookup to find the index of a given
  variable.

  global_lookup: s -> n. Returns index of global variable s.

How to lower the level of a loaded library:

  /mud secure("foo", lvl_whatever)
  /mud unload_library("foo")
  /mud some_foo_function()

unload_library() has the side-effect of making the library auto-load at the
first call, so the third command is necessary to make the real code load. It
does not matter if it is called with invalid arguments.

Warning: it may not work for other reasons (most notably, libraries that define
god commands fail to redefine them).

How to rename a library (as in "library a" to "library b"):

 1. Commit any pending changes to the library source.


 2. Edit the library source to define a single global that will not conflict
    with any name you care about (such as "yourlib_deleteme"). Comment out the
    rest of the defined globals.

 3. Load the library, this will disown the globals from library "a", but
    they'll still exist so the rest of the game will keep working.

Warning: reloading code that depends on the library will obviously fail.

Warning: some mistakes in step 2 may leave you with null globals in step 3 and
break the loaded code that depends on this library. Practice before you try
this on something important.

 4. Revert your changes to the library source (/mgit really revert is
    convenient) and change the name as desired. Compile and reload the library.

 5. Update the library registry: delete_library(), register_library().

 6. Update, compile and reload all files that require your library, then commit
    your changes.
```

## MUDLLE-MODE.EL

```text
EMACS, MUDLLE-MODE.EL

To set up mudlle-mode in Emacs, you need a copy of the most recent
mudlle-mode.el file, which typically can be found in
/home/arda/elisp/mudlle-mode.el on the MUME machine (Dáin maintains it). It is
also part of mudlle distributions in the elisp/ subdirectory; see
https://mume.org/download/mudlle/.

The master version is maintained in the MUME source code tree: /cgit view
mudlle/elisp/mudlle-mode.el.

Add to your .emacs something similar to the following:

  (setq load-path (append load-path '("/home/gustav/elisp")))
  (autoload 'mudlle-mode "mudlle-mode.el" "Turns on mudlle editing mode" t)

Replace /home/gustav/elisp with the directory where mudlle-mode.el can be
found.

In order to have the mudlle function help texts available from within Emacs,
you need to also add the following:

  (setq mudlle-function-data-file "/home/arda/run/lib/mudlle-help.el")

You can copy the listed file somewhere else, but the above is automatically
created by /mud write_mudlle_help().

To look up the help for a function, use M-x mudlle-help (by default bound to
C-c C-h) or M-x mudlle-apropos (by default bound to C-c C-a).

In order to get the mudlle help texts link to the source code for mudlle
functions, you also need:

  (setq mudlle-source-path "/home/arda/run/lib/mudlle")

and to also get links to the C source code (given that you have access to it)
for mudlle primitives, add something like:


  (setq mudlle-c-source-path "/home/gustav/devel/mume-src")

To automatically load mudlle-mode for mudlle files, add:

  (defun powwow-mode ()
    (setq buffer-file-coding-system 'latin-1
          cannot-suspend t)
    (let ((title (getenv "TITLE")))
      (cond ((and title (or (string-match " file base/boot\.log" title)
                            (string-equal "mudlle source code grep" title)
                            (string-match "\`/usr/bin/git grep\>" title)))
             (compilation-mode)
             (set (make-local-variable 'compilation-search-path)
                  '("/home/arda/run/lib/mudlle")))
            ((and title (string-match "\`/usr/bin/git diff\>" title))
             (diff-mode))
            ((and title (string-match "\`/usr/bin/git blame\>" title))
             (fundamental-mode)
             (setq truncate-lines t))
            ((and title (string-match " mudlle file " title))
             (mudlle-mode))
            (t
             (text-mode)
             (setq ispell-local-dictionary "en_GB-ise-w_accents")
             (set (make-local-variable 'sentence-end-double-space) nil)
             (setq fill-column 79)))))

  (add-to-list (if (or (> emacs-major-version 25)
                       (and (= emacs-major-version 24)
                            (> emacs-minor-version 0)))
                   'inhibit-local-variables-regexps
                 'inhibit-first-line-modes-regexps)
               "`/tmp/powwow")

  (setq auto-mode-alist
        (append '(("\`/tmp/powwow.*" . powwow-mode)
                  ("\.mud\'" . mudlle-mode))
                auto-mode-alist

                '(("/lib/mudlle/[^.]" . mudlle-mode))))

The function powwow-mode automatically selects compilation-mode, text-mode, or
mudlle-mode based on what your client set the TITLE environment variable to
before starting the external editor (powwow does this at least).

See also: NOTEPAD++, VIM
```

## MUDLLING MAIAR ACCESS

```text
MUDLLING MAIAR ACCESS

What is required for mudlling Maiar to edit() or view() mudlle source files?

Their own directory:
Reading: always
Writing: mudlle access >= file seclevel

Mw: room/, object/, mobile/ file, or someone else's directory:
Reading: public file, or same as writing
Writing: relevant /access and mudlle access >= file seclevel

Ms: room/, object/, mobile/ file, or someone else's directory:
Reading: public file, or same as writing
Writing: mudlle access >= file seclevel

ainu/, data/, game/, utility/:
Reading: public file, or same as writing
Writing: mudlle access >= file seclevel

global/, base/, compiler/:
Reading: always
Writing: never

Use cases:

Making a file readable by everyone: use publish().

Showing secure files to Maiar: send a copy by mail.
NB: /access does not grant read access to mudlle files, so that Maiar may still
help with building without having automatically access to the code of that
z/m/o.

Letting Maiar perform maintenance on a z/m/o: lower the file(s)' seclevel as
needed, and (if they're under Shaper level) give them /access to that z/m/o.

Let a Maia work on a project without spoiling other Wrights: same as above,
putting any common code in the Maia's private directory.


Let a Maia run code in his funroom: the Maia should create a library that
defines somemaia_funroom(), then a Vala can create the funroom code that calls
somemaia_funroom().
```

## MUDLLING MAIAR DESIGN

```text
MUDLLING MAIAR DESIGN

Mudlle has been available for 20 years to V+ only, highly trusted individuals.
In 2014, I (Waba) refined its security model to let semi-trusted Mw+ mudlle,
without having to edit the existing 141,000+ lines of mudlle libraries. This
was done through four distinct features.

First, whereas the historic security design was primarily concerned with the
security level of the immediate mudlle caller, the MM hybrid system checks the
whole calltrace of the current session for M-secure code, or resorts to the old
behavior if there wasn't any (Dáin made this efficient).

This automatically made 80% of the existing mudlle libraries secure, as Mw/Ms
code will cause a security violation if they call a library that ends up (even
indirectly) calling a primitive secure above their level. So the second feature
was going through the ~800 primitives and making them partially or fully
Ms-/V-secure, to mimic the current abilities of Wrights and Shapers (but: see
also /mh M M E). Access to globals and r/m/o data tables was made an implicit
V-secure operation, with configurable exceptions.

Third, the remaining 20% libraries expose module ("static") data through global
functions and had to be manually secured by the same checks against
effective_seclevel() than done inside the primitives.

And lastly, the mudlling infrastructure (edit(), view(), /mgit, /mlib, /react,
/debug etc) was modified to restrict what Maiar may read or know about, or how
the MM may affect V+.

See also: "/MHELP M M ??" and "/MHELP SECLEVELS".
```

## MUDLLING MAIAR EXCEPTIONS

```text
MUDLLING MAIAR EXCEPTIONS

Some pointers to add exceptions to the security system of Mudlling Maiar.

Letting Maiar call a secure primitive through your library, or restricting who
may call your library: see /mhelp seclevels.

Letting Maiar read and/or write r/m/o data entries: use
register_data_table_entry_level() in some V+ code.

Letting Maiar read and/or write quest data: use
register_quest_mudlle_level() in some V+ code.

Hiding functions and/or their helpstrings from Maiar: see
register_help_string_level().

Letting Maiar do secure things in the zone they're mudlling:

 * For objects and mobiles: they can already alter instances once they get a
   handle (such as from a reaction handler).

 * For rooms: /ml man maia_room_setter.

See also: "/MHELP M M ??".
```

## MUDLLING MAIAR GRANT

```text
MUDLLING MAIAR GRANT

How to grant mudlle access to a Maia:

  /caccess SomeMaia debug  allow
  /caccess SomeMaia mgit   allow
  /caccess SomeMaia mhelp  allow
  /caccess SomeMaia mlib   allow
  /caccess SomeMaia mudlle allow
  /misc access data             player SomeMaia allow
  /misc access mudlle-reactions player SomeMaia allow
  /board mudlle access SomeMaia set read write
  /access SomeMaia add mobile 9091 forever
  /access SomeMaia add mobile 9092 forever
  /access SomeMaia add mobile 9093 forever
  /access SomeMaia add mobile 9094 forever
  /access SomeMaia add mobile 9095 forever
  /access SomeMaia add object 9091 forever
  /access SomeMaia add object 9092 forever
  /access SomeMaia add object 9093 forever
  /access SomeMaia add object 9094 forever
  /access SomeMaia add object 9095 forever

For the MM to mudlle anything outside of their private directories, you will
also have to create files, provide /access and use secure() and publish() as
appropriate (see "/MHELP M M ACCESS").

See also: "/MHELP M M ??".
```

## MUDLLING MAIAR PRIMITIVES

```text
MUDLLING MAIAR PRIMITIVES

Here is a possibly incomplete list of the security changes made to primitives.

Mw restrictions NOT carried over to mudlle:
- Switch into mobs that are in SECURITY rooms
    It's possible to exec() if they get a handle on such a mob
- Purge rooms they can't write to
    They can touch non-SECURITY rooms or handles returned by find(ROOM)
- Drop stuff in opened areas
    Restricted moving BUILD p/o to all open and secure rooms
    The secure part can be bypassed if they have a handle to a p/o there
- Bypass ignore/etc.

Made Ms-secure:
- Finding stuff world-wide:
    - FIND_.*_WORLD for find() & co
    - all_players.*(), all.*_chars(), find_chars.*(), find_hidden_object()
    - deprecated find_.* functions
    - get_player() except for themselves or their own testchars
- From/to secure rooms:
    - move_char(), move_horse(), make_mobile(), set_mob_origin!()
- Moving BUILD characters/objects to open rooms
- /stat-like restrictions on players and secure mobs:
    XP, class, subclass (title), WPs, (power) level, TPs, realms, class level,
    pracs, skills, spells, flags, last login, alignment, stats, perception,
    trophy, C affects,
- Misc character stuff:
    Setting any of the above, change_char_alignment(), skill_practice(),
    char_history(), set/rem citizen, player_equipment(), tracks, (un)void,
    poisons, diseases, char_host(), char_ip_address(), has_link?, last login,
    rent stuff, move_all_char(), FLAG_SECRET_SNOOP
- /stat-like restrictions on secure objects:
    vals, level, flags, hps, wear, weight, weapon type, OB/PB, delays, effects
- Misc object:
    Setting any of the above, ids, set 2H, set value, make_object_at() if secure, make money,
- /stat-like restrictions on secure rooms:
    listing contents (o/p) in any way, names, desc, anything about exits, lit?,

    type, flags, temp flags, affects, keywords, room_crowded?()
- Misc room stuff:
    Setting any of the above, find_the_path(), propagate(), zone_flags(),
    zone_recall_rooms(), superzone_.*_bits(), zone alignment, room_commands()
- Symbol tables (char/obj/room): access is denied, individual entries may be
  lowered to Mw/Ms.
  for that level (applies to Mw and Ms).
- Misc: TP stuff, call_in_list(), moon info

Made V-secure:
- Symbol tables (see Mw)
- Charsep: terminal settings, connection info, aliases, eqorder
- (passwd|group)_file_entries()
- (model_)?react_list()
- syslog()
- static_strings()
- set_picked_plant_long!()
- reset_zone!() and partial_zone_reset()

Made I-secure:
- set_use_nicename!()

See also: "/MHELP M M ??".
```

## MUDLLING MAIAR SECURING

```text
MUDLLING MAIAR SECURING


Securing your V+ code from Maiar
--------------------------------
How Mudlle for Maiar affects your code:

 * Code that does not expose any interface is completely unaffected.

 * Code that just calls secure primitives is already secure, because these
   primitives now also consider the session's seclevel (maxseclevel), not just
   the immediate caller's seclevel.

 * Code that maintains sensitive state or data such as prison_add() must check
   minlevel() or effective_seclevel(). The latter does not require changes to
   calling code. N.b.,I will hopefully have already done that for you anyway.

 * Code that contains secret game mechanics such as smobs should not be
   readable by Maiar, ie. should be secure() V+ and not publish()ed. You can
   check both with list_files(), and you will get a warning when editing
   publish()ed code.

See also: "/MHELP M M ??" and "/MHELP SECLEVELS".
```

## MUDLLING MAIAR

```text
MUDLLING MAIAR

Mw+ may safely be given mudlle access: their mudlle powers are roughly
equivalent to their /-commands, while still allowing useful code to be written
under the supervision of a V+. Mudlling Maiar (MM) of a specific level are
abbreviated Mw+m or Ms+m below.

A Mw+m typically works on a specific task for a Va under the supervision of a
Vm+. The Vm is responsible for teaching the Maia how to write maintainable and
correct mudlle. Both Valar should guide the Maia on the path of game design.

Tasks most suitable for MM are self-contained (no interaction with other zones
and/or the already opened world) and do not depend too much on acts
(primitives) above the level of the MM. They can on the other hand exercise the
MM's design and logical skills as much as required. See /info z 0 maia-mudlle
for the current list.

A Ms+m would help the supervising Vm in their task (we don't have a Ms+m yet at
the time of writing).

Trusted Mw+m with no supervision role could be made into virtual Ms+m through
Ms-mudlle /access. This would let them write and maintain code that deals with
players and secure-flagged things, without access to pnotes.

If we wanted to accept MM candidates after completing a mere testzone, we could
create a Mb+m role within 2-3 months. A Mc+m would on the other hand be useless
by lack of access to objects and mobiles.

How to grant mudlle access to a Maia

How to be 100% safe from Maia mudlle

Adjust your login trigger to /react V.

See also: "/MHELP M M ??" and "/AT 1 READ 41452" (Q&A).
```

## MUDLOAD

```text
MCOM, MUDLOAD

It is often difficult to keep track of where and how a certain object or mobile
is loaded via mudlle -- by butcher, herblore, crush, as reward for a quest, as
member of a fortress garrison, and so on. Hence this set of registry functions,
which are interfaced to /misc query and should always be used when your code
creates a mobile or an object.

To get the list of all fn's: /mud apropos("mudload")

Since there are a lot of fn's, an example is probably the best way to explain
how this works. Let's say we want to register loads by butchering.

 1. Define a unique identifier string that explains "how" the item is produced.
    butcher seems perfect. Let's see, did anyone use it before us?

    /mcom types -> ...a list of existing types...

    ...No, nobody used it. Perfect.

 2. Decide what kind of data identifies the load. For butchering on mobs, it's
    the mob vnum. Now we write a nice display fn for this kind of loading...

    butcher_display_fn = fn(x) textf("butchered from m%4s [%s]",
                                     x, mobile_model(x)[mm_short])

    ... and we install it. This must be done once per reboot, so we place this
    in game/butcher.mud:

    register_mudload_display(SELECT_OBJECT, "butcher",butcher_display_fn)

    If we had been developing a mudload type for mobiles, we would have used
    SELECT_MOBILE.

 3. Now we want to tell the registry whenever a new item is added to the list
    of butcherable items. So, in the /misc butcher <mob> add code, we insert
    the following line:


    register_mudload(SELECT_OBJECT, OBJECT_VNUM, "butcher", MOBILE_VNUM)

    In the same way, when an object is removed from production list,

    remove_mudload(SELECT_OBJECT, OBJECT_VNUM, "butcher", MOBILE_VNUM)

    These operations need to be performed once per reboot, not every time you
    actually load the object (which would be a waste of CPU time, but wouldn't
    cause other harmful effects).

There are other functions in the registry library, to read the registry or to
perform mass-deletion of old entries. They should be self-documenting -- just
apropos("mudload") *wink*. Most of them are used in the definiton of /mcom
(Fror/registry).

Currently available register types are the following:

Objects:

Type      Data         Usage
butcher   [mob vnum]   Reserved for /misc butcher
cook      [obj vnum]   Item created by cooking another (o2104) 
cook_salt [obj vnum]   Item created by salting another (o2104) 
crush     [obj vnum]   Item created by crushing (/lib herb) 
dress     [mob vnum]   Auto-loaded on a mob by /misc dress
fortress  [sequence(fort_name, allegiance, room)]
                       Reserved for /misc fortress
herblore  [number]     Product of a herblore recipe
mine      [room]       Mined from a room (/lib mine)
reward    [mob vnum]   Reward granted by a generic mob
special   [string]     Catch-all type, string is displayed as is
root      [obj vnum]   Item grows from a hidden root (plant_root())
treasury  [room]       Item loaded by mudlle on the ground

Mobiles:
Type      Data         Usage
fortress  [sequence(fort_name, allegiance, room)]
                       Reserved for /misc fortress

special   [string]     Catch-all type, string is displayed as is
```

## NOTEPAD++

```text
NOTEPAD++

This is the mudlle mode created by Timodeus for Notepad++. It goes in
C:\Users\USER\AppData\Roaming\Notepad++\userDefineLang.xml. If you have another
custom created language in there, you can copy in the part from <UserLang name
= "mudlle" ...> below. It can probably get improved, that it is enough for me
might not mean it's enough for you. Due to the nature of the file I did not use
the usual wrapping at 80 chars, use /view /build no mud mod to get an easily
copyable version to your pager.

After copying this file you can (manually) switch to mudlle as a user defined
language.

<NotepadPlus>
    <UserLang name="mudlle" ext="" udlVersion="2.1">
        <Settings>
            <Global caseIgnored="yes" allowFoldOfComments="no" foldCompact="no" forcePureLC="0" decimalSeparator="0" />
            <Prefix Keywords1="no" Keywords2="yes" Keywords3="no" Keywords4="no" Keywords5="yes" Keywords6="yes"
Keywords7="yes" Keywords8="no" />
        </Settings>
        <KeywordLists>
            <Keywords name="Comments">00// 01 02 03/* 04*/</Keywords>
            <Keywords name="Numbers, prefix1"></Keywords>
            <Keywords name="Numbers, prefix2"></Keywords>
            <Keywords name="Numbers, extras1"></Keywords>
            <Keywords name="Numbers, extras2"></Keywords>
            <Keywords name="Numbers, suffix1"></Keywords>
            <Keywords name="Numbers, suffix2"></Keywords>
            <Keywords name="Numbers, range"></Keywords>
            <Keywords name="Operators1">| , ( ) ; &apos; [ ] = &lt; &gt; &gt;= &lt;= { }</Keywords>
            <Keywords name="Operators2"></Keywords>
            <Keywords name="Folders in code1, open"></Keywords>
            <Keywords name="Folders in code1, middle"></Keywords>
            <Keywords name="Folders in code1, close"></Keywords>
            <Keywords name="Folders in code2, open"></Keywords>
            <Keywords name="Folders in code2, middle"></Keywords>
            <Keywords name="Folders in code2, close"></Keywords>
            <Keywords name="Folders in comment, open"></Keywords>

            <Keywords name="Folders in comment, middle"></Keywords>
            <Keywords name="Folders in comment, close"></Keywords>
            <Keywords name="Keywords1">error module requires writes defines reads if else library</Keywords>
            <Keywords name="Keywords2">SECS_PER_ LOOPS_PER_ LVL_&#x000D;&#x000A;ERROR_ RACE_ AREA_ ACCESS_ AFFECT_
ALERT_ APPLY_ ASSIST_&#x000D;&#x000A;ATYPE_ BODY_PART_ CF_ CI_ CLASS_ COIN_ CONT_ CRAFT_ CRIME_ CW_ DARKNESS_ DIS_
door_ EA_ EX_ FLAG_ FOOD_ GLOB_ IF_ ITEM_ itype_ KEY_ LAN_ LIQ_ LOG_ MAGIC_ MAX_ MISSILE_ MOOD_ MOVE_ MYTPE_ OFLAG_ om_
OTYPE_ PLANT_FLAG_ pm_ POSITION_ EAST WEST NORTH SOUTH UP DOWN EX_ RF_ ZF_ KEY_NO_ EVENT_ SELECT_ TO_
RS_&#x000D;&#x000A;cmd_</Keywords>
            <Keywords name="Keywords3">exit override</Keywords>
            <Keywords name="Keywords4">timo_debug FALSE TRUE null null? gone? debug fn actor</Keywords>
            <Keywords name="Keywords5">arg_ can_ cmd_god module_ react_ register_ hook_add define_</Keywords>
            <Keywords name="Keywords6">set_ get_</Keywords>
            <Keywords name="Keywords7">!</Keywords>
            <Keywords name="Keywords8">while for</Keywords>
            <Keywords name="Delimiters">00&quot; 01 02&quot; 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21
22 23</Keywords>
        </KeywordLists>
        <Styles>
            <WordsStyle name="DEFAULT" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="COMMENTS" fgColor="FF8000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="LINE COMMENTS" fgColor="808000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="NUMBERS" fgColor="0000FF" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="KEYWORDS1" fgColor="FF00FF" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="KEYWORDS2" fgColor="0000FF" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="KEYWORDS3" fgColor="FF0000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="KEYWORDS4" fgColor="0080FF" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="KEYWORDS5" fgColor="FF00FF" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="KEYWORDS6" fgColor="8000FF" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="KEYWORDS7" fgColor="FF0000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="KEYWORDS8" fgColor="8000FF" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="OPERATORS" fgColor="FF0000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="FOLDER IN CODE1" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0"
/>
            <WordsStyle name="FOLDER IN CODE2" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0"
/>
            <WordsStyle name="FOLDER IN COMMENT" fgColor="008000" bgColor="FFFFFF" fontName="" fontStyle="0"
nesting="0" />
            <WordsStyle name="DELIMITERS1" fgColor="008000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />

            <WordsStyle name="DELIMITERS2" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="DELIMITERS3" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="DELIMITERS4" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="DELIMITERS5" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="DELIMITERS6" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="DELIMITERS7" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
            <WordsStyle name="DELIMITERS8" fgColor="000000" bgColor="FFFFFF" fontName="" fontStyle="0" nesting="0" />
        </Styles>
    </UserLang>
</NotepadPlus>

See also: EMACS, VIM
```

## OPERATOR PRECEDENCE

```text
OPERATOR PRECEDENCE, OPERATORS

The mudlle operators and their precedences are heavily based on those of C's.

Notable differences:
 * in mudlle, bitwise binary operators have higher precedence than comparison
   operators
 * in mudlle, comparison operators all have the same precedence

The operators are listed in low-to-high precedence order.

The operators that appear on the same row in the table below have the same
precedence.

All operators are left-associative, except the ones marked (R) below
(assignment and pair construction). Left-associative means that same-precedence
operators are evaluated from left to right.

Operator(s)           Description
----------------------------------------
Assignment
  = += -= *= /= %=    assignments (R) \
  ^= &= |= &&= ^^=         :           > same precedence
  ||= >>= <<=              :          /
Pair construction
  .                   pair construction (R)
Logical operators
  ||                  logical inclusive OR
  ^^                  logical exclusive OR
  &&                  logical AND
Comparison operators
  == != < <= > >=     comparisons
Bitwise binary operators
  |                   bitwise inclusive OR
  ^                   bitwise exclusive OR
  &                   bitwise AND
  << >>               bitwise shift left, bitwise shift right
Arithmetic binary operators

  + -                 addition/concatenation, subtraction
  * / %               multiplication, division, remainder
Unary prefix operators
  - ! ~ & * ++ --     unary negation, logical NOT, bitwise NOT, reference,
                      dereference, prefix increment, prefix decrement
Unary postfix operators
  () [] ++ --         function call, vector/table lookup, postfix increment,
                      postifx decrement

See /mhelp arithmetic mode for how the behavior of operators can be modified
using #arith.

Note that mudlle doesn't allow unary prefix plus (+).

See also /mhelp syntax.
```

## OPERATORS

```text
OPERATOR PRECEDENCE, OPERATORS

The mudlle operators and their precedences are heavily based on those of C's.

Notable differences:
 * in mudlle, bitwise binary operators have higher precedence than comparison
   operators
 * in mudlle, comparison operators all have the same precedence

The operators are listed in low-to-high precedence order.

The operators that appear on the same row in the table below have the same
precedence.

All operators are left-associative, except the ones marked (R) below
(assignment and pair construction). Left-associative means that same-precedence
operators are evaluated from left to right.

Operator(s)           Description
----------------------------------------
Assignment
  = += -= *= /= %=    assignments (R) \
  ^= &= |= &&= ^^=         :           > same precedence
  ||= >>= <<=              :          /
Pair construction
  .                   pair construction (R)
Logical operators
  ||                  logical inclusive OR
  ^^                  logical exclusive OR
  &&                  logical AND
Comparison operators
  == != < <= > >=     comparisons
Bitwise binary operators
  |                   bitwise inclusive OR
  ^                   bitwise exclusive OR
  &                   bitwise AND
  << >>               bitwise shift left, bitwise shift right
Arithmetic binary operators

  + -                 addition/concatenation, subtraction
  * / %               multiplication, division, remainder
Unary prefix operators
  - ! ~ & * ++ --     unary negation, logical NOT, bitwise NOT, reference,
                      dereference, prefix increment, prefix decrement
Unary postfix operators
  () [] ++ --         function call, vector/table lookup, postfix increment,
                      postifx decrement

See /mhelp arithmetic mode for how the behavior of operators can be modified
using #arith.

Note that mudlle doesn't allow unary prefix plus (+).

See also /mhelp syntax.
```

## OPTIMISTIC LOCK

```text
LOCK, OPTIMISTIC LOCK

A simple locking mechanism for data that many players may read, but only one
may be changing at any given time.

 * Players get a lock (automatically granted) before beginning to update data

 * The update is performed in a temporary variable

 * A player who wants to commit the change tries to use the previously acquired
   lock.
    + In case of success, the update can be committed and any other players
      lose their lock.
    + In case of failure, the update is lost.

Locks are identified by a unique key (a number, a string, a pair... try to keep
it simple).

Interface
---------
 * get_optimistic_lock(who, key) -> list of lock holders

 * release_optimistic_lock(who, key) -> list of lock holders

 * use_optimistic_lock(who, key) ->
    + if lock was intact, release lock and return true
    + otherwise do nothing and return false

 * lock_and_confirm(who, key, fn) -> get a lock on key, ask the user to confirm
   the current operation, and then call c unless the lock was broken while the
   user was confirming
```

## PARSER ARGUMENTS

```text
ARG_, PARSER ARGUMENTS

Arguments to be used in parser() and misc-command syntax trees.

Do not use () after those arg's that do not require parameters. Example:
"arg_range(0, 100)" vs "arg_race".

All argument names are prepended with arg_.

arg_ name         Params   Matches                                      Return
=========         ======   =======                                      ======
abbrev            s, n     Abbreviation of s with at least n chars      s
bitset            v1, v2   Words representing bits in an integer        i
boolean           ------   Boolean value (yes/no, true/false)           0, 1
change_help       ????
character         SEARCH_* A character (see help(find))                 p
choice            v, [s]   One of the words in v. Helptext s.           i
class             ------   Character class (A/C/T/W/R). Obsolete.       CLASS_*
classes           ------   List of character classes. Obsolete.      '(CLASS_*)
command           ------   A command name.                        CMD_* . "cmd"
complex_list      ????
complex_vector    ????
data_type         ------   ????
data_types        ------   ????
direction         ------   Direction name.                              0...5
disease           ------   Poison/disease name.                         DIS_*
float             ------   Floating-point number.                       f
float_range       f1,f2,[s]Float between f1-f2. Helptext s.             f
fortress          ------   Fortress name.                               "name"
group_id          ------   Mail destination.                         pnum|GID_*
herb              ------   Ingredient number.                           vnum
herblore          ------   Herblore name.                               lorenum
herbs             ------   List of ingredient numbers.                  '(vnum)
ignore            ????
language          ------   Language name.                               LAN_*
level             ------   Level number or name.                        n
line_string       ????
list              ????

mobile_number     ------   Vnum of existing mobile.                     vnum
money             ????
month             ------   RL month name.                               0...11
number            ------   Integer.                                     n
object            ????
object_number     ------   Vnum of existing object.                     vnum
objtype           ------   Object type (armour, worn...)                ITEM_*
objtypes          ------   List of obj types.                         '(ITEM_*)
old_races         ------   List of races.                             '(RACE_*)
one_of            ????
option            ????
optional          ????
percent           ------   ????
player            ------   Player name.                                 pnum>0
policy            ????
race              ------   Race name.                                   RACE_*
races             ------   List of races, or all/evil/good.           '(RACE_*)
range             n1,n2,[s]Integer between n1-n2. Helptext s.           n
rest              ------   ????
room_number       ------   Room number, room id or "here".              n
script            ------   ????
sector_type       ------   Room sector type.                            SECT_*
select_branch     ????
skill             ------   Skill name.                       SKILL_* or SPELL_*
social            ------   Name of a social command.                    CMD_*
string            ------   Any single word.                             s
subraces          ------   List of races/subraces/all/good/evil [(races)(subr)]
subset            ????
town              ------   Town name.                                   TOWN_*
towns             ------   List of town names.                        '(TOWN_*)
weapon_type       ------   Weapon type (slash, crush...)         WEAPON_TYPE_*
weapon_types      ------   List of weapon types.               '(WEAPON_TYPE_*)
zone_area         ------   Geographical area name.                     area num
zone_number       ------   Number of existing zone.                     n
```

## PARSER

```text
PARSER

This module provides a simple generic parser, configured by an argument
specification.

Introduction
------------

Argument specifications are a tree-like structure, with functions at the leaves
of the tree. Each node specifies an argument, which matches certain words (for
instance, if the node is arg_number, the node matches all strings that
represent numbers. If the node is "list", it matches all words that are
abbreviations of "list"). Each path from the root of the tree to a leaf
represents a possible argument specification. For example, the tree:

         shop
           |
	   |
	 number
       	 /   \
	/     \
       /       \
   number     "clear"
      | 	 |
   set_fn     clear_fn

will accept input matching the following argument lists:

  shop number number
  shop number "clear"

The parser function accepts such a specification and a list of words, and tries
to match this against the argument lists specified by the tree. If it find one
that matches, it calls the function that it found at the corresponding leaf. So
in the example above, assuming "test" is the name of a shop:

  'test 10 23' will cause set_fn to be called.
  'test 10 clear' will cause clear_fn to be called.

  'test 10 list' will fail (matches no argument list).

When no argument list is matched, the parser will display a condensed version
of the input specification. The amount displayed depends on the parts of the
tree the parser explored while trying to find a match (eg in the example above,
if you did not give a legal shop it will display

  <prefix> <shop> <number> ...

but if you gave 'test 10 list' you will get:

  <prefix> <shop> <number>
    <number>
    clear

(the <prefix> is a string you pass to the "parser" function). The user can also
get help by using ? or ?? at the end of the matched argument list.

The functions you specify at the leaves of the argument tree get called with
two arguments: the user who is doing the parsing (as passed to the 'parser'
function) and the list of matched arguments. These correspond to the elements
of the argument lists, and are the values returned by the argument matching
functions (for instance if you specify arg_number, the element in the argument
list is the numerical value of the argument (and *not* the string). Strings in
the argument list do not contribute to elements of the argument list. So in the
two examples above:

  set_fn gets called with list(shop, number, number)
  clear_fn gets called with list(shop, number)

  (shop is whatever data-structure arg_shop feels like returning...)

(normal arguments need not return values either actually, but all standard
arguments do. This is a matter of the definition of each argument type).

So how are argument trees specified ? Our usual example will guide us:

  list(arg_shop, arg_number,

       list(arg_number) . set_fn,
       list("clear") . clear_fn)

Formally, an argument tree is either:

- a pair of an argument list and a function
- a 2-part list:
    the first <n> elements are arguments
    the remaining <m> elements are argument trees
    (n >= 0, m >= 1)

An argument list is a list of arguments. An argument is either a string or one
of the complex arguments (arg_number, arg_range, arg_string, etc).

This seemingly complex representation for a tree makes it easier to specify
most argument lists (which are essentially flat, with just a few branching
points). For instance, if you just want to match a simple list of arguments a1,
a2 and a3 and call function f, you use:

  list(a1, a2, a3) . f

A simple alternative between a1, a2, a3 and b1, b2 is:

  list(list(a1, a2, a3) . f,
       list(b1, b2) . g)

But more involved examples are possible:

  list(list(a1, a2, a3) . f,
       list(b1, list(b2a, b3a) . g,
	        list(b2b) . h))

which matches a1, a2, a3 or b1, b2a, b3a or b1, b2b. And so on. Look in
David/shop-mgmt.mud, or Manwe/newboards.mud for more complex examples.

Some final points about argument specifications: the argument list must match
all words. If you want, you can include 'arg_rest' as the last argument
specification, it matches all remaining arguments (which is why it must be the

last element of the list...). Also, the return value of the function at the
leaf is important:

  - if it returns false, the parser considers that the argument list
    wasn't matched and continues searching the argument tree.
  - any other value means success; this value is returned by the
    parser function.

So don't return false by mistake!

And finally, the argument tree specifications are processed in order, so don't
put a more general specification before a less general one. The typical example
is:

  list("message", arg_string,
       list(arg_string) . set_message,
       list("reset") . reset_message)

This doesn't work, as "reset" is a string, so

  message msg1 reset

will cause set_message to be called with arguments list("msg1", "reset").
Instead you must specify:

  list("message", arg_string,
       list("reset") . reset_message,
       list(arg_string) . set_message)

which does work, but of course prevents you from using "reset" (or "rese", or
"res", etc) as a message.

If the function at the leaf has a help string, that string will be displayed
right-justified when the branch to that leaf is displayed.

Calling 'parser'
----------------


This is the easy part:

  result = parser(argument_tree, prefix, who, arguments)

argument_tree is the argument specification

prefix is a string to put in front of the syntax help messages. If it is false,
no help is given.

who is the user to whom messages should be sent (essentially help messages).

arguments is the list of arguments to be parsed, typically the result of
split_words (but if you use define_god_command, the arguments come already
split).

parser returns false if no argument specification was matched, otherwise it
returns whatever the appropriate leaf function
returned.

Standard arguments
------------------

An argument is defined by three things: what it matches, what it returns and
the help string it displays (there is actually a fourth characteristic, how it
displays its return value, but this is rarely used and generally corresponds to
the reverse transformation from words -> return value).

An argument can match more than one word (eg arg_rest which matches all
remaining input), though most arguments match exactly one.

Arguments are either stored in arg_xxx constants (arg_rest, arg_number, etc)
or, for more configurable arguments, returned by arg_xxx functions (eg
arg_range(10, 20) for numbers between 10 and 20).

Here is a summary of the standard arguments:

Name: arg_string
Matches: one word exactly

Returns: the word matched
Help: <string>

Name: arg_number
Matches: one word exactly, provided that word is a number
Returns: the numerical value of the matched word
Help: <number>

Name: arg_rest
Matches: all remaining words
Returns: the list of remaining words
Help: <rest of line>

Name: arg_range(n1, n2)
Matches: one word exactly, provided that it is a number between n1 and n2
(inclusive)
Returns: the matched numerical value
Help: n1..n2

Name: arg_boolean
Matches: abbreviations of yes, true, no, false (one word)
Returns: true or false
Help: yes|no

Name: arg_optional(s)
Matches: one word if it is an abbreviation of s, nothing otherwise
Returns: the matched word, or false
Help: [s]

Name: arg_choice(v)
      where v is a vector of words
Matches: one word, which must be an abbreviation of one of those in v
Returns: index in v of matched word
Help: words in v, separated by |

MUME arguments
--------------


Name: arg_character(location)
      where location is chosen by oring together the following selectors:
	find_char_in_room  - check actor's room
	find_char_in_world - check whole world
      in all cases, the character found must be visible to the actor
      search proceeds in the above order and stops when something is
      found
Matches: one word, provided that a character by that name can be found
Returns: character found
Help: <character[room|world]>

Name: arg_object(location)
      where location is chosen by oring together the following selectors:
	find_obj_in_equip - check actor's equipment
	find_obj_in_inv   - check actor's inventory
	find_obj_in_room  - check actor's room
	find_obj_in_world - check whole world
      in all cases, the character found must be visible to the actor
      (except for equipment which can be invisible)
      search proceeds in the above order and stops when something is
      found
Matches: one word, provided that an object by that name can be found
Returns: object found
Help: <object[equipment|inventory|room|world]>

Name: arg_skill
Matches: one word, provided that it is a skill name
Returns: the skill number
Help: <skill>

Name: arg_policy(policyset)
Matches: one word, provided that it is a policy in policyset
Returns: the policy name
Help:<policyset name policy>

Name: arg_class/arg_race/arg_objtype
      (these are like predefined arg_choice's, but return the correct
       CLASS/RACE/ITEM_xxx value)

Matches: one word, provided that it is a class/race/object-type name
Returns: corresponding class/race/object type value
Help: like arg_choice

Name: arg_classes/arg_races/arg_objtypes
      (these are like predefined arg_subset's, but return the correct
       CLASS/RACE/ITEM_xxx values)
Matches: like arg_subset
Returns: corresponding list of class/race/object-type values
Help: like arg_subset

(look in Manwe/enum.mud and Manwe/useful.mud to see how such enumerations are
defined).

Argument definition
-------------------

An argument is a sequence of 3 functions:

  - parse function
  - help function
  - display function

The parse function (fn (who, args)) takes a player and a list of arguments and
returns:

  - false: argument not matched
  - vector(remaining args, value_returned?, value)
    value_returned? is true if the argument returns a value, if so
    value is the returned value (otherwise it is ignored)

The help function (fn (seen)) returns a help string for the argument. If seen
is true, the user "saw" this argument while trying to match the command, so a
more complete help message should be given; e.g., arg_choice() either gives
<choice> or the list of choices separated by "|".

Any help text between less-than greater-than brackets will be colored. To
suppress coloring, you need to escape them with backslash.


The help function can return false to indicate an invisible argument.

The display function (fn (val)) should give a "nice" printed representation of
val (a return value from the argument). It should return false for arguments
with no return value.
```

## PATTERN MATCHING

```text
MATCH, PATTERN MATCHING, PATTERNS


Complex assignment
------------------
Mudlle lets you do "complex" assignments, allowing you to extract fields from
vectors, pairs, and symbols.

Example:
  @[x y] = <some expression>

This will check if <some expression> is a vector with size 2, and will then
assign the values on indices 0 and 1 to x and y respectively.

If the assignment fails (e.g., the expression doesn't result in a vector, or if
it's of the wrong size), there is a runtime error (error_no_match).

The left hand side can be any combination of pairs, vectors, constants and
expressions that will be evaluated at runtime (these have to be preceded by a
comma and surrounded by parentheses except if it's a single variable that's to
be read). Constants and runtime expressions will just be checked to see that
they match the right hand side's value at that position using equal?().

The returned value of the @ statement is undefined.

Pattern match statements
------------------------
The control statements match and match! work a little like a C switch, but you
can use pattern matching:

match (a) [
  [ 3 x ]    => <statement>;    // this will be run if a is a 2-elem.
                                //   vector starting with 3
  [ x y ]    => <statement>;    // this will be run if a is a 2-element vector
  ( x y z )  => <statement>;    //         - " -              3-element list
  ( x . y )  => <statement>;    //         - " -              pair
  < n = v >  => <statement>;    // this will be run if a is a symbol
  {string} x => <statement>;    // this will be run if a is a string

  x          => <statement>;    // this will be run for any a
]

match (char_race(p)) [
  ,race_orc   => run_the_orc_function();
  ,race_troll => run_the_troll_function();
  _           => display("This only works for orcs and trolls");
]

A match statement will find the first matching "match node" and then run that
node's statement (to the right of =>), with the variables to the left filled in
with proper values.

Note that variables in match patterns are local to that match node, while the
@-assignment above uses variables in the current scope.

A match statement returns the return value of the matched node's right hand
side, or false if no node was matched. If you want an error, use match! instead
of match:

match! (argv)
[
  [ a0 ] => ...;
  [ a0 a1 ] => ...;
  // throws error_no_match unless argv is a 1- or 2-element vector
];

Function arguments
------------------
One can also use patterns in function arguments:

  // self-explanatory?
  my_car = fn (@(x . _)) x;

  // return first element of vector or list
  first_element = fn (@[x ...] || (x . _)) x;

  // call foo(name, value) for all symbols in my_table

  table_foreach(fn (@<x = y>) foo(x, y), my_table)

This:
  f = fn (@<pattern>) <expr>

is mostly syntactic sugar for:
  f = fn ($arg0)
    [
      | <vars> |
      @<pattern> = $arg0;
      <expr>
    ];

More on patterns
----------------
_ acts as a sink and matches any value.

{<type>, <type>, ...} can be used before a variable or a sink and will only
match if the value is of one of the listed types:

  @{int,string} x = y;

The above will assign y to x if it is a string or an integer; otherwise it will
throw an error.

... can be used (at most once) in vectors to match any number of elements.

[ x y ... ] matches vectors of size 2 or longer.

[ 1 ... 2 ] matches vectors whose first and last elements are 1 and 2,
respectively.

A pattern may optionally be followed by && and an expression, adding an extra
level of pattern checking:

  match (x) [
    x && magic_cookie?(x) => this-will-be-run-for-all-cookies;
    x => this-will-be-run-for-anything-else;

  ]

Note that all the lines have "different" x'es in the above example. The
match (x) line's is the one present in the context of the match statement,
while the two match pattern lines have x:es individual to each line
respectively.

|| can be used to match alternative patterns. This returns the first element of
a one-element vector or list:

  match (x) [
    [ e ] || ( e ) => e;
  ]

A pattern element can be (p0 || p1) to match either pattern of p0 or p1; or
(p0 && e) to match p0 and have the expression e evaluate to true:

  match (x) [
    [ (1 || 2) ... ] => "foo";
    ( (y && f(y)) . _ ) => "bar";
  ]

This returns "foo" if x is a vector whose first element is 1 or 2; or "bar" if
x is a pair and f(car(x)) returns true.

Pattern comparison is done depth first from left to right, and variables will
be assigned, and expressions will be evaluated as we go along. Thus, you can
use [ x ,x ] to match a vector with two equal values.

If it wasn't clear, patterns can be combinations of vectors, lists, constants
etc:

  [ ,race_orc ( x y z ) [ _ "test" ] ]

Note the use of the equal?() for comparison; i.e., strings are compared with
string_cmp(), floats with fcmp(), etc. See /mud help(equal?) for details.

Also note that after a comma (meaning runtime evaluation), you can either have

a variable name, or any expression enclosed in parentheses.

Run one of the following:

  mudlle_unparse(mudlle_parse("@[ x y ] = f()", ""), 0)
  examine(fn() match (x) [ [ ... ] => true ])
  mc:compile(mudlle_parse("@[ x y ] = f()"), false, lvl_vala)

to see the kind of code that is generated.

Set mc:disassemble = 1 before testing with mc:compile(). Please set it back to
0 when you're through playing with it!
```

## PATTERNS

```text
MATCH, PATTERN MATCHING, PATTERNS


Complex assignment
------------------
Mudlle lets you do "complex" assignments, allowing you to extract fields from
vectors, pairs, and symbols.

Example:
  @[x y] = <some expression>

This will check if <some expression> is a vector with size 2, and will then
assign the values on indices 0 and 1 to x and y respectively.

If the assignment fails (e.g., the expression doesn't result in a vector, or if
it's of the wrong size), there is a runtime error (error_no_match).

The left hand side can be any combination of pairs, vectors, constants and
expressions that will be evaluated at runtime (these have to be preceded by a
comma and surrounded by parentheses except if it's a single variable that's to
be read). Constants and runtime expressions will just be checked to see that
they match the right hand side's value at that position using equal?().

The returned value of the @ statement is undefined.

Pattern match statements
------------------------
The control statements match and match! work a little like a C switch, but you
can use pattern matching:

match (a) [
  [ 3 x ]    => <statement>;    // this will be run if a is a 2-elem.
                                //   vector starting with 3
  [ x y ]    => <statement>;    // this will be run if a is a 2-element vector
  ( x y z )  => <statement>;    //         - " -              3-element list
  ( x . y )  => <statement>;    //         - " -              pair
  < n = v >  => <statement>;    // this will be run if a is a symbol
  {string} x => <statement>;    // this will be run if a is a string

  x          => <statement>;    // this will be run for any a
]

match (char_race(p)) [
  ,race_orc   => run_the_orc_function();
  ,race_troll => run_the_troll_function();
  _           => display("This only works for orcs and trolls");
]

A match statement will find the first matching "match node" and then run that
node's statement (to the right of =>), with the variables to the left filled in
with proper values.

Note that variables in match patterns are local to that match node, while the
@-assignment above uses variables in the current scope.

A match statement returns the return value of the matched node's right hand
side, or false if no node was matched. If you want an error, use match! instead
of match:

match! (argv)
[
  [ a0 ] => ...;
  [ a0 a1 ] => ...;
  // throws error_no_match unless argv is a 1- or 2-element vector
];

Function arguments
------------------
One can also use patterns in function arguments:

  // self-explanatory?
  my_car = fn (@(x . _)) x;

  // return first element of vector or list
  first_element = fn (@[x ...] || (x . _)) x;

  // call foo(name, value) for all symbols in my_table

  table_foreach(fn (@<x = y>) foo(x, y), my_table)

This:
  f = fn (@<pattern>) <expr>

is mostly syntactic sugar for:
  f = fn ($arg0)
    [
      | <vars> |
      @<pattern> = $arg0;
      <expr>
    ];

More on patterns
----------------
_ acts as a sink and matches any value.

{<type>, <type>, ...} can be used before a variable or a sink and will only
match if the value is of one of the listed types:

  @{int,string} x = y;

The above will assign y to x if it is a string or an integer; otherwise it will
throw an error.

... can be used (at most once) in vectors to match any number of elements.

[ x y ... ] matches vectors of size 2 or longer.

[ 1 ... 2 ] matches vectors whose first and last elements are 1 and 2,
respectively.

A pattern may optionally be followed by && and an expression, adding an extra
level of pattern checking:

  match (x) [
    x && magic_cookie?(x) => this-will-be-run-for-all-cookies;
    x => this-will-be-run-for-anything-else;

  ]

Note that all the lines have "different" x'es in the above example. The
match (x) line's is the one present in the context of the match statement,
while the two match pattern lines have x:es individual to each line
respectively.

|| can be used to match alternative patterns. This returns the first element of
a one-element vector or list:

  match (x) [
    [ e ] || ( e ) => e;
  ]

A pattern element can be (p0 || p1) to match either pattern of p0 or p1; or
(p0 && e) to match p0 and have the expression e evaluate to true:

  match (x) [
    [ (1 || 2) ... ] => "foo";
    ( (y && f(y)) . _ ) => "bar";
  ]

This returns "foo" if x is a vector whose first element is 1 or 2; or "bar" if
x is a pair and f(car(x)) returns true.

Pattern comparison is done depth first from left to right, and variables will
be assigned, and expressions will be evaluated as we go along. Thus, you can
use [ x ,x ] to match a vector with two equal values.

If it wasn't clear, patterns can be combinations of vectors, lists, constants
etc:

  [ ,race_orc ( x y z ) [ _ "test" ] ]

Note the use of the equal?() for comparison; i.e., strings are compared with
string_cmp(), floats with fcmp(), etc. See /mud help(equal?) for details.

Also note that after a comma (meaning runtime evaluation), you can either have

a variable name, or any expression enclosed in parentheses.

Run one of the following:

  mudlle_unparse(mudlle_parse("@[ x y ] = f()", ""), 0)
  examine(fn() match (x) [ [ ... ] => true ])
  mc:compile(mudlle_parse("@[ x y ] = f()"), false, lvl_vala)

to see the kind of code that is generated.

Set mc:disassemble = 1 before testing with mc:compile(). Please set it back to
0 when you're through playing with it!
```

## PERSISTING DATA

```text
MODULE DATA, PERSISTING DATA


Persisting Data across Reloads and Reboots
------------------------------------------
It is often useful to persist data over time, from the list of players seeking
for Rivendell to shop inventories. Here is a quick list of the available
techniques.

Module Variables

Variables local to your module will be overwritten at every module reload.

Suitable for: constants and caches.

Unsuitable for: anything that will not be automatically computed on module load
or over time - otherwise it makes it impossible to reload your module for
bugfixes and such.

Sample Code
===========
module
[
    | cache |
    ...
];

Static Variables

Suitable for: anything that should survive module reloads, until the next
reboot: zone state etc.

Unsuitable for: anything with a shorter or longer lifetime.

You can have static variables in modules which will retain values across
reloads.

Sample Code

===========
module
writes myget, myset, myref
static data
[
    myget = fn () data;
    myset = fn (x) data = x;
    myref = fn () &data;
]

So, if you call myset(123) and then reload this file, myget() or *myref() will
still return 123 as opposed to null.

The variable name must not change for this to work, but it should survives a
move_file().

N.b., it is not necessary to use accessors from inside your module.

N.b., the compiler does not do type inference for these variables.

Quest Global Data

Suitable for: storing quest data until the next reboot (same lifetime as static
variables).

See: /ml man quest_global_data.

Data Table Entries

Each room, object, mobile, player, account, and connection has an associated
mudlle table, with the same lifetime as the owning "thing" (but see below about
$ variables):

  rooms        until reboot
  objects      until they are destroyed (decay, rent expired, etc.)
  mobiles      until killed or next reboot
  players      nearly forever (until deleted)
  accounts     nearly forever (until deleted)

  connections  until the link is disconnected (player rents or cuts link)

Suitable for: anything linked to this "thing" and with the same lifetime.

Unsuitable for: quest data (see below), anything not matching the definition
above. Be especially careful about not polluting rooms and real players with
test entries.

Notes:
 * Table entries starting with $ are not persisted on disk and will never
   survive a reboot. For example muduser()["$temp"] = 4711 will disappear when
   you rent.

 * Maiar can't access all data table entries, they need a V+ to
   register_data_table_entry_level() for them.

 * Please register_data_table_entry() for an easier to read /misc data output.

 * Select a name that's short yet descriptive and unlikely to conflict with
   other mudlle.

Sample Code

  muduser()["exitecho"] // Your exit echo
  9693["lever_down"]    // The state of that lever
  9600["death-reason"]  // DT type, read by the C code
  account_data(46340, "seen-messages") // Board reading status

Quest data

Suitable for: storing permanent data about a player's progress in a quest
(stored in the player's data table).

See: /ml man quest_data.

Data Files

read_data() and write_data() serialize any mudlle data structure to disk. By

definition, this will persist over reboots.

Examples: Ilie's InstaMountRecover(tm), a lot of justice features (both in
cities and versus cheaters), shops, books, /misc newbie, /project, etc.

Unsuitable for: common quests (use the quests library instead), anything that
can accept a shorter lifetime.

Notes:
 * The file name is arbitrary in a dedicated directory. Be careful about naming
   conflicts and leftovers. See data_files() for a list.

 * read_data_safe() returns null instead of erroring out if the file doesn't
   exist (yet), unlike read_data().

 * Depending on how often your data is accessed and how large it is, use one of
   these two strategies: unload your data when it is not in use (saving
   memory), or keep a cache of it once it is read (saving I/O).

 * Not all data types can be stored on disk. They will be converted to {gone}
   instead.

Sample Code
===========
module
requires data
[
    | MYFILE, data_cache, data, set_data! |
    MYFILE = "mymodulename";

    data = fn ()
    [
        if (null?(data_cache))
            data_cache = read_data_safe(MYFILE);
        data_cache;
    ];

    set_data! = fn (newdata)

    [
        write_data(MYFILE, newdata);
        data_cache = newdata;
    ];
];

Global Variables - Do Not Use Them

This is a crude attempt at persisting data over reloads. However, it clutters
the global namespace and exposes your internals to the whole world. Don't do
this without A+ approval.

N.b., Maiar can't read nor write global variables.

Sample Code
===========
module
writes foo_data
[
    ...
];
```

## POWWOW

```text
POWWOW

This help page is supposed to contain mudller-friendly tips for configuring
powwow.

Tab completion
--------------
If you have non-ancient version of powwow that supports #addstatic, you add the
following:

  #init ={#identify;#exe </home/arda/run/lib/mudlle-globals.powwow}

The mudlle-globals.powwow file contains an #addstatic for all (documented)
global mudlle variables, providing you with permanent tab completion on all
those words.

The file is generated by write_mudlle_help().

See also: EMACS, VIM
```

## PROPAGATE

```text
PROPAGATE

Here is a list of some intensity values for propagate()

death cry       sqrt(char_height)
yell            41
earthquake      level * 3
lightning       41

The formula for movement and fighting are too complicated for a tired Dáin.
```

## REACT_GIVE

```text
REACT_GIVE

When installed on mobiles, EVENT_GIVE reactions are the most likely to cause
interference between different pieces of code: a mobile might need to deal with
several types of given items. For example, a certain mobile was meant to be
given some lockpicks to be improved; he was to hold them for a while, and then
return them to the owner. However, that mobile was also a shopkeeper; and
shopkeepers used to drop all non-receipt items given to them.

Instead of hacking the shopkeeper code, it's better to use an intermediate
layer between handlers and the GIVE event; react_give() provides that layer.

Usage is quite easy. Suppose that you are interested only in a few items -
those the mob is asking for a quest, for instance. First, make up a list of the
relevant obj numbers:

OBJECTS = '(1234 5678 9012);

If you're interested in ALL objects, use 'null'.

Secondly, write your handler, which is a function that takes four arguments:

my_fn = fn (me, who, what, idx) [...];

As usual, 'me' is the mudlled mobile who's been given something, 'who' is the
one who gave, and 'what' is the given object. 'idx' is the index of the object
in your OBJECTS list: in the example above, "idx == 1" would mean the mob has
been given object 5678.

If your code is interested in the object, the handler fn should return any
non-false value. If, instead, you realize the object does not interest you (it
might be missing some mudlled data), you should return false. This will allow
any other installed handler to have a look at the object.

Finally, you need to install your code. From the mob's mudlled file, just call

react_give(my_fn, "what your fn does", OBJECTS [, priority]);


You can call react_give several times on the same mobile: relevant handlers
will be called in order of priority, from highest to lowest. If two handlers
have the same priority, the last installed is the first to be called. If you
don't specify a priority, is is set to zero by default. By the way, you should
use priorities between maxint (top priority) and minint (lowest).

Since most mobiles should give back, or drop, whatever is not of their
interest, there is a predefined handler that does exactly this. To install it,
use

react_give(give_item_back, "Return items I'm not interested in", null, minint);

(where 'null' means "all items", and priority is lowest), or simply use

giveback();

As an alternative, use drop_given() which will make the mob drop the object
without even trying to give it back.

All handlers installed via react_give are displayed by "/misc mudlle"; if you
need to list them, use "model_react_give_list(mobnum)".
```

## REVIEWS

```text
CODE REVIEWS, REVIEWS


What's in a review?
===================

 1. Is this code maintainable for the years to come? Does it follow general
    good software engineering practices?
 2. Are there obvious bugs and anti-patterns (ie. /mh common mistakes)?
 3. Is there an opportunity to improve the submitter's skills?

Personal takes
==============

Imago's process
---------------
 1. File level review (mostly checking style, consistency, approach).
 2. Function review (quickly review each function for correctness).
 3. Flow review (follow from an entry point to finish).

Waba's level of detail
----------------------
When reviewing, I do not attempt to detect subtle bugs, and ask for tests
instead. Exception: critical pieces of code that could cause reimbursement
requests get a closer look.
```

## SCHEDULER

```text
SCHEDULER

mudlle_schedule() is the C function that executes all events scheduled for the
current mume_pulse().

Consider call_in(f, s, n)

if n == 0 and is inside mudlle_schedule, set n = 1

if n < (15 * LOOPS_PER_SEC + 1)
   schedule in the near-term bucket n calls to mudlle_schedule from now
   (zero-based) unless there already are 1024 events scheduled in the near-term
   bucket for that pulse, in which case we fall through to using the
   medium-term bucket

if n < 1000
   schedule in the medium-term bucket n calls to mudlle_schedule from now
   (zero-based)

otherwise
   schedule in the long-term bucket at the call to mudlle_schedule when
   mume_pulse == current_pulse + n

For near-term and medium-term events, n == 0 is "as soon as possible" unless we
are inside mudlle_schedule already (i.e., executing previously scheduled
events) in which case n == 1 is "as soon as possible"

Looking at calls to cause_event():

Immediate events are always executed before cause_event() returns.

Delayed events are always called at the next "run all delayed mudlle events"
phase (see /mhelp heartbeat).
```

## SECLEVELS

```text
SECLEVELS

Mudlle's security model has several components:

 * effective_seclevel: protecting the sensitive API, primitives and core
   mudlle.
 * minlevel: protecting high-level Ainur from mudlle, and core mudlle from V+.
 * maxseclevel and seclevel: technical components for the above.
 * secure() and publish(): source access and influencing the
   effective_seclevel.
 * trace_seclevel(): controls visibility of call traces in /debug trace show
   and such

TL;DR and I want to...
----------------------
Secure my existing code with sensitive data or state from Maiar: check
effective_seclevel().

Secure my existing code which just calls primitives: it's already secure.

Secure my new code: check minlevel().

Access minlevel-secured code: use with_minlevel().

Let Maiar make privileged calls through my code: use with_maxseclevel().

Effective seclevel for calling secure primitives
------------------------------------------------
Some primitives are secure; i.e., callable only from mudlle above a given
level. For instance, player_account() is level 106; i.e. callable only by V+.

Calling secure primitives only succeeds if:

  effective_seclevel() >= function_seclevel(primitive)

effective_seclevel() is:

 * The maxseclevel if that value is < V. Maxseclevel basically means "the

   lowest seclevel of the callstack".
 * The immediate caller if the session seclevel is V+.

This asymmetry lets legacy (pre-2014) mudlle code work untouched, while
allowing to grant mudlle access to some Maiar.

effective_seclevel() is formally defined as min(maxseclevel(), seclevel()),
detailed below.

Effective seclevel for calling core mudlle
------------------------------------------
The same effective_seclevel() also works for securing pure-mudlle code from
Maiar. (Non-pure mudlle, ie. mudlle that calls primitives, will calltrace when
calling these secure primitives anyway.)

As it deals with the session seclevel, it is sufficient to insert these checks
in the core functions that deal with the secure data or state, and securing
every exposed function is not necessary.

This mechanism does not require altering the existing V+ calling code, because
effective_seclevel() is always set to something sensible.

It does not, however, secure A+ code from V. Use minlevel() for that.

Raising the maxseclevel: giving more access to Maiar
----------------------------------------------------
Using with_maxseclevel(), V+ code can let M code access secure mudlle or
primitives by temporarily raising the maxseclevel. The V+ code must carefully
check that this exception makes sense and do the least work in this privileged
state.

Typical usage:

  with_maxseclevel(seclevel(), fn () some_secure_call())

Maxseclevel: also for accessing globals
---------------------------------------
Maxseclevel is used for:


 * Computing effective_seclevel().
 * Checking if one may alter globals. Only V+ may read or write globals,
   besides defines.

Maxseclevel derives from the file's secure() level, or the Ainu's level for
/mud sessions. It is set to that level if < V, or to LVL_IMPLEMENTOR if V+.

Seclevel: the immediate caller's, sometimes
-------------------------------------------
Whenever a closure is called and the current seclevel is less than minlevel, an
error_security_violation is caused.

seclevel is updated with the calling closure's seclevel when calling any
secure/vararg primitives directly (i.e., through a variable defined by a
protected module).

seclevel is not changed when directly calling any closure or primitive.

In all other cases, seclevel is set to LVL_VALA before making any call.

Whenever a call trace catching frame ends, it restores seclevel to its previous
value. These can only be created from C, but trap_error() and many other
primitives create them. This does not matter much, as a call can leave seclevel
in any state.

Note: the seclevel() primitive is secure and will return the expected value in
most cases.

  /mud seclevel()               // 108
  /mud (waba_test = seclevel)() // 106

Minlevel
--------
Two security features rely on minlevel:

 * Calling mudlle code whose seclevel() < minlevel() fails. This lets an Arata
   turn /react off and be unaffected by all mudlle except I-secure mudlle.

 * As it's not possible to raise minlevel() above seclevel(), it is also used
   as a security mechanism within mudlle.

How minlevel is set:

 * Minlevel is usually set when creating a new mudlle session. This is
   frequently done from C. Most sessions set minlevel to 0.
 * The session() primitive does not modify minlevel, but reuses the previous
   value.
 * Mudlle events caused by a non-reacted Mw+ set minlevel to the player's level
   + 1 (capped to LVL_IMPLEMENTOR).
 * When a session ends, it restores the previous minlevel.
 * The with_minlevel() primitive can also set the minlevel. It also restores
   minlevel to the previous value when it returns.

This is how you write secure functions in mudlle, that only are supposed to be
called by other secure functions:

  secure_fn = fn (x)
  [
    if (minlevel() < lvl_arata) error(error_security_violation);

    <do something that only Aratar may do>
  ];

  calling_fn = fn (x)
  [
    with_minlevel(lvl_arata, fn() secure_fn(x));
  ]

The above call to with_minlevel() will fail if calling_fn is not secure A+, and
secure_fn() will fail if not called with a high enough minlevel.

Call trace visibility
---------------------
By default, any call trace generated in a mudlle session is visible for Ainur
(using /debug) at or above the initial maxseclevel of that session.


This can be changed using the msl:trace_seclevel_shift mechanism of
with_maxseclevel():

  with_maxseclevel(new_maxseclev | (new_tracelev << msl:trace_seclevel_shift),
                   fn () ...)

Higher-level library functions should use this if triggering callbacks into
lower-level functions.
```

## SPEC

```text
SPEC, TESTING


Automated Testing in Mudlle
===========================

Intro
-----
The spec library brings automated, example-driven testing to mudlle.

spec:describe("identity()", fn (spec)
[
    spec:context(spec, "when given the value 42", fn ()
    [
        | result |
        result = spec:let(spec, fn () identity(42));

        spec:it(spec, "returns it unchanged", fn ()
        [
            spec:expect_eq(spec, result(), 42);
        ]);
    ]);
]);

This produces the following log:

>/mud spec:report_log("identity()", muduser())
Subject identity
  when given the value 42
    returns it unchanged
Spec of subject "identity": OK with 1 example

Beautiful tests remain conversational, and are useful both to understand how
the software should behave and to verify it is working as specified.

The spec library is a mudlle port of the excellent RSpec.

Structure

---------

spec:describe()

This starts a new specification (aka. test suite). Its first argument is the
subject, ie. what you are going to describe in it.

It creates a spec object referenced throughout the specification.

Typically, the subject is a module or a cohesive subset. Optimize its size for
report usefulness.

spec:context()

Contexts (aka. example groups) are the structure that keeps examples
(spec:it()) readable. Always give context separately from the examples.

Contexts are typically worded: "when ...", "with ...", or "without ...".

Contexts can be nested as much as necessary.

spec:it()

This is an individual example of expected behavior, within a given context.

Example texts continue the sentence "it ..." relating to the subject, do not
use "should", and are short (use contexts!).

Examples test one thing only and are independent from each other. Typically,
the thing to test is set up at the context level, then each example will verify
an aspect of it (more on that later).

It is the lowest level that will show in the report.

Expectations

Expectations live in a spec:it() block and will fail that example if any of
them is not verified.


spec:and_describe()

This announces a different subject. Typically, the top-level spec:describe()
will relate to the module under test, and spec:and_describe() blocks under it
to individual functions.

Like spec:describe() and spec:context(), it may contain spec:context() blocks
or (rarely) spec:it() blocks.

Independent Examples
--------------------
Examples that rely on side-effects of previous examples tend to be brittle.

Do not rely on examples executing in the order they are declared. A future
version might randomize examples within their group.

Instead, use:

spec:before_each()

Setup here the things to verify in the examples of that example group
(context).

Since it is executed before each example, every example gets a fresh
environment, no matter what other examples might have done to it.

There is also spec:after_each(), spec:before_all(), and spec:after_all(), but
they are usually less useful.

spec:let()

Most spec:before_each() are just about setting up variables with the
side-effects of things under test. spec:let() are a useful shortcut for that.

Semantically, spec:let() creates a variable that is reset before each test by
re-evaluating the oneliner you provided.


Technically, spec:let() returns a function, so access it with var() instead of
var (see the introduction example).

Mocks
-----
Most testing requires mocking, ie. providing fake implementations of code that
would be called by what you are testing, but is not what you want to focus on.

In Unit Testing, most calls out of the function under test are mocked. The
focus is on the algorithm (checks, conditions, loops) implemented by the
function, not how it behaves with the rest of the system.

In Integration Testing, the boundary is wider but still exists. The focus is on
how the code (module?) under test interacts with some other parts of the
system, but not all of it. For example, all delays would be mocked out.

And Acceptance Testing (everything as a whole) is out of scope for the spec
lib: it would use a Telnet client and a testmud, instead.

Function Mocks

The spec lib currently (only) provides function mocking, and with an ugly
syntax.

The lib is pure mudlle and cannot override global functions, so the code under
test must call module-local copies of the global functions.

module ...
[
    | madd_citizen!, kill_wanted |
    madd_citizen! = add_citizen!;

    kill_wanted = fn (...)
    [
        ...
        madd_citizen!(...);
        ...
    ];


    ...
    spec:it(spec, "grants citizenship", fn ()
    [
        spec:expect_call_and_return(spec, &madd_citizen!, null, 42);
        kill_wanted(...);
    ]);
];

Q & A
-----

What Can I Test?

The spec lib works great for algorithm libraries, but the current lack of
object/character/room mocking will probably limit its usefulness for general
game code.

What Should I Test?

 * Things you cannot be 100% sure of have gotten right the first time.
 * Things that can break if someone else edits your code later.
 * Behaviors that may not be obvious to a future reader (the tests are made of
   examples, examples document your code).

Where Should I Test?

As close as the code under test as technically possible. Remember, the examples
are documentation.

spec:describe() will error out if tests fail, thus failing loudly rather than
silently loading incorrect code.

See Also
--------
 * /mlib man lib spec
 * Examples in utility/spec.mud.
 * http://www.betterspecs.org/
```

## STORYTELLERS

```text
STORYTELLERS


Defining storytellers

Storytellers use a "storyteller builder" interface that works as a wrapper
around the old error-prone interface. All old storytellers were converted to
the new interface in /mgit show ccce6ac2; see /mlib apropos story: for
documentation of this interface.

Story data structure

Stories are defined by the following data structure:

  story         actual_story
                0 . actual_story       This identifies uninteresting story,
                                       only told randomly (i.e. only by
                                       storyteller_reg_random(me)).
                                       If any such story is present, the
                                       mobile will automaticly tell random
                                       stories
  actual_story  vector (action)
                func_idx
  action        string                 This string will automatically be
                                       broken into lines at 100 characters
                                       that will be said.
                                       Newlines force a line break.
                ST_SAY . string        This line will be said (no breaks)
                ST_EXEC . string       exec (string)
                ST_SING . string       Fake sings
                ST_HINT . string       Show a "# Hint:" to the player
                ST_WAIT                Do nothing for this action
                ST_WAIT . seconds      Sets delay for the previous action
                ST_FUNC . func_idx     Run funcs[func_idx](me)
                ST_ACT . acts
                ST_WHISPER . string    This line will be whispered;
                                       requires target
  acts          string                 act(TO_ROOM, true, string, ...)

                list(to . string)      lforeach: act(to, true, string, ...)

$-substitutions are made in ST_SAY, ST_EXEC, and ST_WHISPER strings. Lowercase
letters are used for the storyteller (not very useful) and uppercase for the
victim (if any):

  $n  short name
  $m  him/her/it
  $s  his/her/its
  $e  he/she/it
  $k  keyword for (e.g., 2.orc)

For ST_ACT, only TO_ROOM, TO_VICT, and TO_NOTVICT are supported in to (and the
latter only with a victim).

The functions parameter is used when an actual_story is a func_idx, which is an
index into the functions vector. That entry will be run fn(me), and shall
return a vector (action). It will also be used when the action is a pair of
ST_FUNC and an integer.

To start telling a story, use storyteller_start_story() or
storyteller_tell_story(). Use storyteller_stop() to stop telling the current
story.

Hearing trigger words

storyteller_trigger() is an interface between listen() and the storytelling
code. It takes as parameter a list of triggers:

  trigger           trigger_words . story_number
  trigger_words     list("word1", "word2",...)
  and a veto_fn(me, who) that returns a boolean.

When the storyteller hears someone pronounce all the trigger words in a list
(see Nada/converse.mud for details), he begins telling the specified story,
unless veto_fn() returns false. If veto_fn is null, the story is always told.

Victims (the "audience" character) is set using storyteller_tell_story(). It is

also done automatically using storyteller_trigger().

About wait times

If the ST_WAIT has an integer argument (ST_WAIT . n), the previous action will
have a fixed delay of n seconds.

Normal actions (including ST_WAIT without any argument) has a random delay of
2.5 and 5 seconds before executing.

Assuming all unspecified delays are 4 seconds, you can get the following
behavior:

  Time | Action
  -----+-----------------------
     0 | ST_SAY . "Hello"
     0 | ST_WAIT . 15
    15 | ST_SAY . "Still here?"
    19 | ST_WAIT
    23 | ST_SAY . "No change?"

Note how the initial ST_WAIT is "run" at time 0, forcing the Still here line to
happen after 15 seconds. The second ST_WAIT (legacy behavior) inserts a no-op,
making it 4 + 4 = 8 seconds between Still here and No change.

It can be useful to insert an ST_WAIT . 0 if you want to run two commands
back-to-back.
```

## STRFTIME

```text
STRFTIME

strftime() converts a time vector (as returned by gmtime() or localtime()) into
text, according to the contents of a format string.

The following sequences in the format string, and some more that can be found
in man strftime but are not likely to be used in MUME, are replaced:

  %a  The abbreviated weekday name.
  %A  The full weekday name.
  %b  The abbreviated month name.
  %B  The full month name.
  %C  The century number (year/100) as a 2-digit integer.
  %d  The day of the month as a decimal number (range 01 to 31).
  %D  Equivalent to %m/%d/%y. (Yecch - for Americans only.)
  %e  Like %d, the day of the month as a decimal number, but a leading zero is
      replaced by a space.
  %h  Equivalent to %b.
  %H  The hour as a decimal number using a 24-hour clock (range 00 to 23).
  %I  The hour as a decimal number using a 12-hour clock (range 01 to 12).
  %j  The day of the year as a decimal number (range 001 to 366).
  %k  The hour (24-hour clock) as a decimal number (range 0 to 23); single digits are
      preceded by a blank. (See also %H.)
  %l  The hour (12-hour clock) as a decimal number (range 1 to 12); single digits are
      preceded by a blank. (See also %I.)
  %m  The month as a decimal number (range 01 to 12).
  %M  The minute as a decimal number (range 00 to 59).
  %n  A newline character.
  %p  Either AM or PM according to the given time value. Noon is treated as PM and
      midnight as AM.
  %P  Like %p but in lowercase: am or pm.
  %S  The second as a decimal number (range 00 to 61).
  %t  A tab character.
  %T  The time in 24-hour notation (%H:%M:%S).
  %y  The year as a decimal number without a century (range 00 to 99).
  %Y  The year as a decimal number including the century.
  %%  A literal % character.
```

## SYNTAX

```text
SYNTAX

This very very incomplete help page describes some of mudlle's syntax/grammar.

<code-block>:
   [ <expression-sequence> ;? ]

<expression-sequence>:
   | <variable-list> | <expression-sequence-tail>
   <expression-sequence-tail>

<expression-sequence-tail>:
   <expression> ; <expression-sequence>
   <expression>

<expression>:
   < <label-name> > <expression>
   <statement-expression>

<statement-expression>:
   <control-expression>
   <function-expression>
   <assign-expression>
   <cons-expression>

<cons-expression>:
   <cons-expression> . <logical-or-expression>
   <logical-or-expression>

<logical-or-expression>:
   <logical-or-expression> || <logical-xor-expression>
   <logical-xor-expression>

<logical-xor-expression>:
   <logical-xor-expression> ^^ <logical-and-expression>
   <logical-and-expression>

<logical-and-expression>:

   <logical-and-expression> && <comparison-expression>
   <comparison-expression>

<comparison-expression>:
   <comparison-expression> ==|!=|<|<=|>=|> <bitwise-or-expression>
   <bitwise-or-expression>

<bitwise-or-expression>:
   <bitwise-or-expression> | <bitwise-xor-expression>
   <bitwise-xor-expression>

<bitwise-xor-expression>:
   <bitwise-xor-expression> ^ <bitwise-and-expression>
   <bitwise-and-expression>

<bitwise-and-expression>:
   <bitwise-and-expression> & <bitwise-shift-expression>
   <bitwise-shift-expression>

<bitwise-shift-expression>:
   <bitwise-shift-expression> <<|>> <additive-expression>
   <additive-expression>

<additive-expression>:
   <additive-expression> +|- <multiplicative-expression>
   <multiplicative-expression>

<multiplicative-expression>:
   <multiplicative-expression> *|/|% <unary-expression>
   <unary-expression>

<unary-expression>:
   -|!|~|++|-- <unary-expression>
   <postfix-expression>

<postfix-expression>:
   <postfix-expression> ( <expression-list>? )
   <postfix-expression> [ <expression> ]

   <postfix-expression> ++|--
   <primary-expression>

<primary-expression>:
   <variable>
   <simple-constant>
   ' <constant>
   ( <expression> )
   <arith-mode-expression>
   <code-block>

<expression-list>:
   <expression> , <expression-list>
   <expression>

<control-expression>:
   <exit-expression>
   <for-expression>
   <if-expression>
   <loop-expression>
   <match-expression>
   <while-expression>

<exit-expression>:
   exit < <label-name> > <statement-expression> exit <statement-expression>

<for-expression>:
   for ( <for-init-expression>? ; <expression>? ; <expression>? )
      <expression>

<for-init-expression>:
   | <variable-list> | <expression>?
   <expression>

<if-expression>:
   if ( <expression> ) <expression> else <expression>
   if ( <expression> ) <expression>


<loop-expression>:
   loop <expression>

<match-expression>:
   match|match! ( <expression> ) [ <match-list> ;? ]

<match-list>:
   <match-rule> ; <match-list>
   <match-rule>

<match-rule>:
   <pattern-or> => <expression>

<pattern-or>:
   <pattern-and> || <pattern-or>
   <pattern-and>

<pattern-and>:
   <pattern-atom> && <logical-and-expression>
   <pattern-atom>

<pattern-atom>:
   <pattern>
   <unary-constant>
   , <variable>
   , ( <expression> )

<pattern>:
   <pattern-list>
   <pattern-vector>
   <pattern-symbol>
   <typeset>? _
   <typeset>? <variable>
   ( <pattern-and> || <pattern-or> )
   ( <pattern-atom> && <logical-and-expression> )

<type-or-typeset>:
   <typeset>

   <type>

<typeset>:
   { <type-list> }

<type-list>:
   <type> , <type-list>
   <type>

<pattern-list>:
   ( <pattern-atoms> . <pattern-atom> )
   ( <pattern-atoms> )
   ( )

<pattern-atoms>:
   <pattern-atom> <pattern-atoms>
   <pattern-atom>

<pattern-vector>:
   [ <pattern-atoms>? ... <pattern-atoms>? ]
   [ <pattern-atoms> ]
   [ ]

<pattern-symbol>:
   < <pattern-atom> = <pattern-atom> >

<while-expression>:
   while ( <expression> ) <expression>

<function-expression>:
   <type-or-typeset>? fn <documentation>? ( <formal-arguments>? )
      <expression>

<documentation>:
   <string> + <documentation>
   <string>

<formal-arguments>:

   <formal-argument-list> , <variable-argument>
   <formal-argument-list>
   <variable-argument>

<formal-argument-list>:
   <formal-argument> , <formal-argument-list>
   <formal-argument>

<formal-argument>:
   <formal-argument-declaration> = <expression>
   <formal-argument-declaration>

<formal-argument-declaration>:
   <type-or-typeset>? <variable-name>
   @ <pattern-or>

<variable-argument>:
   <variable-name> ...

<assign-expression>:
   @ <pattern> = <expression>
   <lvalue> = <expression>
   <lvalue> <modify-assign> <expression>

<modify-assign>:
   +=|-=
   *=|/=|%=
   &=||=|^=
   &&=|||=|^^=
   <<=|>>=

<lvalue>:
   <variable>
   <postfix-expression> [ <expression> ]

<arith-mode-expression>
   #arith ( <arith-mode-name> ) <code-block>


<constant>:
   #ro|#rw|#im <constant-container>
   #ro|#rw <string-constant>
   , <variable>
   , ( <expression> )
   #gone
   <constant-container>
   <unary-constant>

<unary-constant>:
   "-" <float-constant>
   "-" <integer-constant>
   "~" <integer-constant>
   "!" <integer-constant>
   <named-float-constant>
   <simple-constant>

<constant-container>:
   { c? <constant-table-entry>* }
   [ <constant>* ]
   ( <constant>* )
   ( <constant>+ . <constant> )
   < <constant-table-entry> >

<constant-table-entry>:
   #ro|#rw|#im <constant-table-entry-no-prefix>
   <constant-table-entry-no-prefix>

<constant-table-entry-no-prefix>:
   <constant-symbol-name> = <constant>

<constant-symbol-name>:
   <string-constant>
   , <variable>
   , ( <expression> )

<named-float-constant>:
   -? infinity

   -? inf
   nan

<simple-constant>:
   <string-constant>
   <integer-constant>
   <float-constant>
   <bigint-constant>

<variable-list>:
   <variable-name>
   <variable-name> , <variable-list>

<variable>:
   :<variable-name>
   <variable-name>
   <user-variable-name>

<integer-constant>
------------------
Integers can be written in the following ways:

  Example   Start    Description
  --------------------------------------------------------------------------------------------
  0b1010   0b or 0B  binary
  033         0      octal
  1234       1..9    decimal
  0xf00f   0x or 0X  hexadecimal
  ?x          ?      character constant; supports escaped characters as in strings (see below)

Note that the integer zero (0) is the only logically false value. All other
values are considered logically true.

<bigint-constant>
-----------------
Bigints are prefixed with #b or #B, an optional minus sign (-) and then a
binary, octal, decimal, or hexadecimal integer as above.


<string-constant>
-----------------
Strings come in three variants: single-quoted, triple-quoted, or raw strings.

Single-quoted strings use double quotes as delimeters. They may not contain any
non-escaped newlines or double quotes.

Triple-quoted strings use three double quotes are delimeters. They may contain
newlines and up to two consecutive double quotes without escaping.

Backslash (\) is used as escape character. These special combinations are
supported:
    \a     ASCII 7, bell
    \b     ASCII 8, backspace
    \f     ASCII 12, form feed
    \n     ASCII 10, new line
    \r     ASCII 13, carriage return
    \t     ASCII 9, horizontal tab
    \v     ASCII 11, vertical tab
   \012    octal character; up to three octal digits
   \x1f    hexadecimal character; exactly two hexadecimal digits
  \N{...}  named Unicode character; e.g., \N{NO-BREAK SPACE}

All other escaped characters resolve to the character itself. In particular \\
becomes a single backslash and \" becomes a double quote.

Raw strings start with r###" where there may be between 0 and 256 hash signs
(#). They end with "###, where the number of hash signs must match those of the
opening string. Inside a raw string, all characters are treated literally. No
escaping is supported.

Examples:
  r"\"        -> "\\"
  r#"""#      -> "\""
  r##"#"#"##  -> "#\"#"

<float-constant>
----------------

Floating-point numbers, stored in 64-bit double precision, come in these
flavors:

  Pattern                           Example   In decimal
  ------------------------------------------------------
  <dec>.<dec>                       3.14      3.14
  <dec>[eE][+-]?<dec>               1e-3      0.001
  <dec>.<dec>[eE][+-]?<dec>         1.024e3   1024.0
  0[xX]<hex>[.<hex>][pP][+-]?<dec>  0x1.9p+3  12.5

where <dec> is one or more decimal digits; and <hex> is one or more hexadecimal
digits.

Inside quoted constants (<named-float-constant>) nan is a quiet Not a Number
(NaN), and inf and infinity (optionally prefixed by -) both represent positive
(negative) infinity.

Variable names
--------------
A <variable-name> starts with an alphabetic character ([A-Za-z]) followed by
zero or more characters in [A-Za-z0-9_:?!]. They can have at most 1024
characters.

A <variable> is a <variable-name>, optionally prefixed by : to make it into a
global symbol.

In some circumstances a <variable> can also be a <user-variable-name>, which
starts with $, optionally followed by a character in [a-zA-Z0-9$], optionally
followed by zero or more characters in [a-zA-Z0-9$_:?!]. They can also have at
most 1024 characters.
```

## TELL

```text
TELL

If someone tell a mobile, first there will be one or two event_try_tell events.

The optional first event_try_tell is used when figuring out which named
character (2.tom) is being told. A mobile is only counted if its event handler
calls accept_tell().

If either event handler calls override(), nothing more happens.

If you call the primitive accept_tell() from both event_try_tell handlers, the
tell "works". Otherwise you get a No one by that name... error message.

If the event was not overridden and accept_tell() was called (both times), the
(delayed) event_tell will be sent as well.

The following pattern might be appropriate:

  tell_fn = fn (try?) fn (me, who, to, msg)
    if (some_condition())
      [
        if (try?) exit<function> accept_tell();
        <react to tell>
      ];

  react_event(tell_fn(false), "", -event_tell);
  react_event(tell_fn(true), "", -event_try_tell);

There is a convenience function, accept_all_tells() that just calls
accept_tell() whenever there's an event_try_tell() to this mobile.
```

## TEMPERATURE

```text
TEMPERATURE

A room's base temperature is the sum of the map coordinate's temperature
(weighted using the zone's temperature variance) and any values from
set_room_base_temperature!().

A map coordinate's temperature is caluclated as follows:

  (time-of-year-modifier + weather-modifier) * variance
  + zone-temp-modifier
  + daytime-modifier

daytime-modifier is 2 if day and not cloudy, -2 if night and not cloudy, and 0
otherwise.

zone-temp-modifier is as set by /zone temperature.

time-of-year-modifier is a linear interpolation of 4 -3 -10 -3 4 11 18 25 32 25
18 11 4 for day 1 of each month.

weather-modifier is the weather modifier to the temperature as seen by /weather
temperature-delta.

variance is the zone's temperature variance as set by /zone temp-variance.

In addition to base temperature, there is a number of degrees added from any
present and lit ITEM_LIGHT object's light_heat(), which is multiplied by 2 in
indoor rooms. Also, any indoor rooms in a SECT_CITY zone will be at least 15
degrees.

All temperatures are in °C (that's deg. C for you latin-1 challenged people out
there).
```

## TESTING

```text
SPEC, TESTING


Automated Testing in Mudlle
===========================

Intro
-----
The spec library brings automated, example-driven testing to mudlle.

spec:describe("identity()", fn (spec)
[
    spec:context(spec, "when given the value 42", fn ()
    [
        | result |
        result = spec:let(spec, fn () identity(42));

        spec:it(spec, "returns it unchanged", fn ()
        [
            spec:expect_eq(spec, result(), 42);
        ]);
    ]);
]);

This produces the following log:

>/mud spec:report_log("identity()", muduser())
Subject identity
  when given the value 42
    returns it unchanged
Spec of subject "identity": OK with 1 example

Beautiful tests remain conversational, and are useful both to understand how
the software should behave and to verify it is working as specified.

The spec library is a mudlle port of the excellent RSpec.

Structure

---------

spec:describe()

This starts a new specification (aka. test suite). Its first argument is the
subject, ie. what you are going to describe in it.

It creates a spec object referenced throughout the specification.

Typically, the subject is a module or a cohesive subset. Optimize its size for
report usefulness.

spec:context()

Contexts (aka. example groups) are the structure that keeps examples
(spec:it()) readable. Always give context separately from the examples.

Contexts are typically worded: "when ...", "with ...", or "without ...".

Contexts can be nested as much as necessary.

spec:it()

This is an individual example of expected behavior, within a given context.

Example texts continue the sentence "it ..." relating to the subject, do not
use "should", and are short (use contexts!).

Examples test one thing only and are independent from each other. Typically,
the thing to test is set up at the context level, then each example will verify
an aspect of it (more on that later).

It is the lowest level that will show in the report.

Expectations

Expectations live in a spec:it() block and will fail that example if any of
them is not verified.


spec:and_describe()

This announces a different subject. Typically, the top-level spec:describe()
will relate to the module under test, and spec:and_describe() blocks under it
to individual functions.

Like spec:describe() and spec:context(), it may contain spec:context() blocks
or (rarely) spec:it() blocks.

Independent Examples
--------------------
Examples that rely on side-effects of previous examples tend to be brittle.

Do not rely on examples executing in the order they are declared. A future
version might randomize examples within their group.

Instead, use:

spec:before_each()

Setup here the things to verify in the examples of that example group
(context).

Since it is executed before each example, every example gets a fresh
environment, no matter what other examples might have done to it.

There is also spec:after_each(), spec:before_all(), and spec:after_all(), but
they are usually less useful.

spec:let()

Most spec:before_each() are just about setting up variables with the
side-effects of things under test. spec:let() are a useful shortcut for that.

Semantically, spec:let() creates a variable that is reset before each test by
re-evaluating the oneliner you provided.


Technically, spec:let() returns a function, so access it with var() instead of
var (see the introduction example).

Mocks
-----
Most testing requires mocking, ie. providing fake implementations of code that
would be called by what you are testing, but is not what you want to focus on.

In Unit Testing, most calls out of the function under test are mocked. The
focus is on the algorithm (checks, conditions, loops) implemented by the
function, not how it behaves with the rest of the system.

In Integration Testing, the boundary is wider but still exists. The focus is on
how the code (module?) under test interacts with some other parts of the
system, but not all of it. For example, all delays would be mocked out.

And Acceptance Testing (everything as a whole) is out of scope for the spec
lib: it would use a Telnet client and a testmud, instead.

Function Mocks

The spec lib currently (only) provides function mocking, and with an ugly
syntax.

The lib is pure mudlle and cannot override global functions, so the code under
test must call module-local copies of the global functions.

module ...
[
    | madd_citizen!, kill_wanted |
    madd_citizen! = add_citizen!;

    kill_wanted = fn (...)
    [
        ...
        madd_citizen!(...);
        ...
    ];


    ...
    spec:it(spec, "grants citizenship", fn ()
    [
        spec:expect_call_and_return(spec, &madd_citizen!, null, 42);
        kill_wanted(...);
    ]);
];

Q & A
-----

What Can I Test?

The spec lib works great for algorithm libraries, but the current lack of
object/character/room mocking will probably limit its usefulness for general
game code.

What Should I Test?

 * Things you cannot be 100% sure of have gotten right the first time.
 * Things that can break if someone else edits your code later.
 * Behaviors that may not be obvious to a future reader (the tests are made of
   examples, examples document your code).

Where Should I Test?

As close as the code under test as technically possible. Remember, the examples
are documentation.

spec:describe() will error out if tests fail, thus failing loudly rather than
silently loading incorrect code.

See Also
--------
 * /mlib man lib spec
 * Examples in utility/spec.mud.
 * http://www.betterspecs.org/
```

## TEXT MARKUP

```text
ANSI COLORS, ESCAPE CODES, MARKUP, TEXT MARKUP

Text markup (as controlled by change colour) is handled by sending special
escape sequences inside output. These escape sequences are converted by
render_text() to either ANSI codes, XML markup, or nothing depending on the
player's terminal mode.

The escape sequences have the following formats:

  \033< <code> > ... \033</ <code> >
  \033</ <code> >

where <code> is the markup number (which is the CI_xxx constant plus one). The
start and end sequences are returned by start_color() and end_color(),
respectively.

The %( and %) format() conversions also return the same.

<code> can be followed by &-prefixed, ;-separated tag arguments:

  \033<123&abc=def;ghi=jkl>

where the supported (typically not emitted by mudlle) arguments are:

  Tag          | Arguments
  -------------+--------------------------------
  mt_highlight | &<code>
  mt_movement  | &dir=<dir>
  mt_snoop     | &symbol=<prefix>
               | or &symbol=<prefix>;time=<time>

The renderer also handles standard ANSI codes:

  \033[ [^a-z]* [a-z]

Use slength_noansi() to return the length of a string, not counting any escape
sequences.
```

## TIME

```text
TIME


Wall clock time
===============

Wall clock time is measured using Unix time and is read using time():

time
   -> n. Returns the number of seconds since the 1st of January 1970 UTC. On
   32-bit systems, negative values are used for values greater than MAXINT
   (following Jan 10 13:37:03 2004 UTC).

Note that time() returns positive numbers on 64-bit systems. To be backwards
compatible, code needs to handle both cases. To convert to a possibly-bigint
number of seconds since the Epoch, use:

time_to_epoch
   n -> n|bi. Returns the number of seconds since the 1st of January 1970 UTC
   represented by the time n as returned by time().

To compare two time stamps, use these functions:

time_until
   n0 -> n1. Return the number of seconds until time n0 as returned by time().

time_since
   n0 -> n1. Return the number of seconds since time n0 as returned by time().

time_after?
   n0 n1 -> b. Returns true if time n0 is after time n1, as returned from
   time().

To compute relative times, just use addition or subtraction. Use these
constants when appropriate:

  SECS_PER_REAL_MIN          60  The number of seconds per real minute.
  SECS_PER_REAL_HOUR       3600  The number of seconds per real hour.

  SECS_PER_REAL_DAY       86400  The number of seconds per real day.
  SECS_PER_REAL_MONTH   2629800  The approximate number of seconds per real month. SECS_PER_REAL_YEAR / 12.
  SECS_PER_REAL_YEAR   31557600  The approximate number of seconds per real year. SECS_PER_REAL_DAY × 365.25.

To split Unix time into components, use:

gmtime
   n -> v. Converts time in seconds n, as returned by time(), to a vector of
   UTC time information, indexed by the tm_xxx constants:

   tm_sec  seconds (0-59; 60 for leap seconds)
   tm_min  minutes (0-59)
   tm_hour hours (0-23)
   tm_mday day of month (1-31)
   tm_mon  month (0-11 for Jan-Dec)
   tm_year year since 1900
   tm_wday day of week (0-6 for Sun-Sat)
   tm_yday day of year (0-365 where 0 is Jan 1)

To make it human-readable, use:

asctime
   v -> s. Returns a string of format "Wed Jun 30 21:49:08 1993" representing
   the time in v as returned by gmtime().

Periods of time (a number of seconds) can be printed using one of the
xxx_time_string() functions. Cf. /mlib man time_string.

Game time
=========

Game time is loosely tied to wall clock time. At game boot, the game time and
date is set from the current Unix time (rounded to the nearest game hour),
based on game year 2850 (MUD_BIRTH_YEAR) having started at a particular, but
sometimes updated, point in Unix time (SECS_REAL_BEGINNING).

Game time advances approximately 60 times faster than wall clock time. Use
these constants when appropriate:


  SECS_PER_MUD_MIN         1  The number of real seconds per game minute.
  SECS_PER_MUD_HOUR       60  The number of real seconds per game hour.
  SECS_PER_MUD_DAY      1440  The number of real seconds per game day.
  SECS_PER_MUD_MONTH   43200  The number of real seconds per game month.
  SECS_PER_MUD_YEAR   518400  The number of real seconds per game year.

Note that game months and years have fixed lengths (30 and 360 days,
respectively).

The current game date and time (as shown by the time command) is obtained by:

mume_date
   -> v. Returns a [year, month, day, hour] vector of the current mume time

To split a Unix time into game time components (assuming a fixed rate of game
time vs. Unix time), use:

mume_time
   n -> v. Returns a vector(year, month, day, hour) of the MUME time for real
   time n seconds since 1970.

   Note that this mapping is not stable over time as the start of MUME's time
   (year 2850) may change.

Warning: mume_date() can return a different result than
mume_time(time()), as the game sometimes doesn't keep up with real time! There
is no reliable way to accurately know what the game time will be at a future
Unix time.

To print a time range in wall clock seconds in game time, use one of the
xxx_mud_time_string() function. Cf. /mlib man mud_time_string.

Use loops_until_mume_date() to find out when a (future) game time stamp will be
reached.

Game mechanics
==============


Game behavior is often tied to ticks (game hours) or rounds (3.5 game minutes).

Object decay timers and affect durations are often specified in terms of ticks.

Fight speed is defined in terms of rounds.

Heartbeats
==========

The game advances time in heartbeats, or loops. Use these constants:

  LOOPS_PER_SECOND      4  The number of game heartbeats per real second.
  LOOPS_PER_MINUTE    240  The number of game heartbeats per real minute.
  LOOPS_PER_TICK      240  The number of game heartbeats per game tick.
  LOOPS_PER_HOUR    14400  The number of game heartbeats per real hour.

As mentioned above, heartbeats are only aspirationally tied to real time. You
cannot assume that heartbeats are accurately tied to real time, despite the
names of the constants.

Cf. /mhelp heartbeat.
```

## TYPES

```text
TYPES

These are the primitive (built-in) mudlle types:

  icode       compiled byte-code
  closure     closure of code or mcode and some state; mudlle "function"
  variable    container used to hold state in closure
  internal    used to hold some C-internal data structures
  primitive   primitive functions
  varargs     variable-argument primitive functions
  secure      security-flagged primitive functions
  integer     signed integer of INT_BITS bits; in [MININT..MAXINT]
  string      fixed-length strings of unsigned bytes
  vector      fixed-length vector of any data
  pair        car/cdr pair of any data
  symbol      a pair of a string and any data used in tables
  table       hash table for storing any data indexed by strings; either 8-bit and case
              insensitive (default) or case- and accent sensitive (ctables)
  private     used to hold some almost-internal data structures: return value from setjmp(),
              profiling information, and callbacks to C
  object      a MUME object
  character   a MUME character; cf. /mhelp character classes
  gone        a (possibly temporarily) deleted MUME object or character; also used when
              serializing (writing to disk) an object that cannot be serialized, such as
              functions
  oport       a dynamically sized string (grows in spurts of 512 bytes)
  mcode       compiled machine-code
  float       an immutable IEEE 764 double floating-point value; integers and bigints are
              automatically converted to floats by most primitives
  bigint      a (nearly) boundless signed integer; integers are automatically converted to
              bigints by most primitives
  null        singleton class whose only value is null
  connection  telnet connections
  cookie      scheduler magic cookies
  file        a file; cf. file_open()
  weak_ref    a weak reference to another value; cf. weak_ref()
  regexp      regular expressions; cf. make_regexp()
  url         an outgoing http curl request; cf. make_url()


New types can be added before type_null (if they can be stored to disk), or
last (if they cannot be stored to disk).

There are constants called type_xxx for each of these, including last_type,
which is one greater than the highest used type_xxx number.

In addition to the types, there are sets of types (mostly) used to specify the
types of formal parameters and return values of functions:

  none         the empty set; no types allowed
  any          the set of all types
  function     the set closure, primitive, varargs, and secure
  list         pair or null
  bigint_like  bigint or integer; primitives automatically convert these to bigints
  float_like   float, bigint, or integer; primitives automatically convert these to floats
  false        Boolean false; i.e., zero (0)

These are referred to as synthetic types and have corresponding constants
stype_xxx and last_synthetic_type is one greater than the last synthetic type.

Compiler types
--------------
To confuse things, the mudlle compiler uses another set of synthetic types (see
itype_xxx), which almost completely overlaps the above, but also introduces the
type other, which corresponds to any type except functions (closure, primitive,
varargs, and secure), integer, string, vector, null, symbol, table, pair,
bigint, and float.

The compiler also differentiates between zero and non-zero integers.

The vector type_names holds the names corresponding to each type_xxx and
stype_xxx constant.

Function argument signatures
----------------------------
You can specify types for function return types and function arguments. A type
can either be a regular type (integer), a synthetic type (list), or a typeset

({string,integer}).

As a special case, integer can be witten as int.

For example:

  vector fn ({string,null} opt_name, character ch, data) ...

specifies a function that must return a vector. Its first argument must be
either a string or null; its second argument must be a character; and its third
argument can be of any type.

Note: the argument type check is only performed at function entry. The
variables can be assigned to any value of any type at any point inside the
function.

These are the (known) benefits of adding such annotations:

 1. Source code documentation
 2. You trigger runtime errors if you try to pass/return the wrong types
 3. You get warnings if the compiler knows you're passing the wrong type in an
    argument
 4. You get a warning if you specify a return type the compiler knows you never
    return
 5. Allows for some compiler optimizations

Pattern matching
----------------
You can specify types when pattern matching (for complex assignments or
match/match! patterns):

  @{int} i = f()
  @{string,null} s = g()

See /mhelp patterns for more details.

Limitations
-----------

Mudlle objects cannot become arbitrariliy large. The following limitations
apply:

  strings  MAX_STRING_SIZE characters
  vectors  MAX_VECTOR_SIZE elements
  tables   MAX_TABLE_ENTRIES symbols
  bigints  slightly less than 8 × MAX_STRING_SIZE bits
```

## VARIABLES

```text
VARIABLES

Any variable defined in one function (either as a function argument or as a
local variable) and used from any other (inner) function becomes a closure
variable.

New instances of closure variables are (only) created every time the defining
function is called. All other uses of variables refer to a specific such
instance.

Example:
  f = fn (n) fn() n

Here, f(7) creates a new instance of n that is set to 7. Every time the inner
function that is returned by f(7) is called, 7 is returned:

  a = f(7); b = f(1);

gives:

  a() == 7; b() == 1

This may cause problems in cases like this:

  my_mob = fn (vector victims)
    react_event(fn (a, b, c) [
      victims = vector_to_list(victims);
      if (lfind?(char_number(a), victims))
         ...
    ], event_something, "...");

Here, the inner function modifies victims every time it is called. However, as
victims was created by the call to the outer my_mob() function, all calls to
the event handler will see those modifications. The second call to the event
handler will try to pass something that's already a list of vector_to_list(),
and there will be a runtime error.

In summary, always make sure you know what you're doing when modifying a

variable that was defined in another function.

The above is rather simple as long as you remember where variables are created.

Note that only functions create separate closure scopes. If you have a local
variable that's defined inside a loop, all "laps" in the loop refer to the same
instance of the variable. Example:

  for (|n|n = 0; n < 5; ++n)
    [
      |x|
      x = n;
      result = (fn() x) . result;
    ];

Now, result will be a list of 5 functions, all returning the value of the same
instance of x. That instance will have the value of its most recent assignment,
which is 4, so:

  lmap(fn (x) x(), result) == '(4 4 4 4 4)

Note also that the top level of a mudlle function works exactly like a function
taking zero arguments that contains one code block with the top level code.
```

## VIM

```text
VIM

Waba has written a vim mode for mudlle. Get it here:

  https://github.com/MUME/vim-mudlle

If you use it from powwow, set POWWOWEDITOR to a script looking something like
this:

  #!/bin/bash
  [ -n "${TITLE}" -a -z "${TITLE/* mudlle file */}" ] \
      && cmd="$cmd -c ':set ft=mudlle'"
  exec vim "$@" $cmd

This will inspect the $TITLE environment variable and automatically enable the
mudlle filetype when appropriate.

See also: EMACS, NOTEPAD++
```

## WEATHER MESSAGES

```text
WEATHER MESSAGES

The event_weather_message event lets you customize weather messages.

It takes several arguments:

  who,
  sun, moon,
  old_rain, new_rain,
  old_fog,  new_fog,
  old_ice,  new_ice,
  old_snow, new_snow

All arguments except the first are integers. -1 is used to indicate "no change"
or "no value".

sun can be -1 (no sun change), SUN_SET, or SUN_RISE.

moon can be -1 (no moon change), MOON_SET, or MOON_RISE.

The old/new pairs work as follows:

If both values are -1, there is no such event. If one value is -1, it means a
player moved from a room that has no such state into one that has it (this
typically means moving between indoors and outdoors).

If both values are >= 0, it means that the weather actually changed (either due
to movement or due change in weather).

rain is 0-9, where the WT_CLOUDY, WT_RAINY, and WT_STORMY indicate boundries.

fog is 0-2, where 1 is light fog and 2 is thick fog (FOG_NONE, FOG_LIGHT,
FOG_DENSE).

ice is 0-4, where 2 is enough to carry a person.

snow is 0-9.


There will never be an event that has non-negative values in more than one row
above (so sun and moon can both be >= 0, but sun and old_rain cannot).

The event is sent to global and the room the player is in (room first). Talk to
Nienor first if you want to install this on a room.

The event is immediate. If override() is called, the default weather message is
suppressed.

Don't forget to use CI_WEATHER for messages.
```

## WEATHER

```text
WEATHER

Here is some information related to weather.

Weather consists of a number of parameters, which can be read using
room_weather():

rw_type - basic weather type

  0  clear      
  1  clear      
  2  clear      
  3  cloudy     
  4  cloudy     
  5  overcast   CLOUDY (orcs don't suffer)
  6  rain       RAINY
  7  rain       
  8  lightning  STORMY
  9  storm      

rw_base_temperature - room's temperature without fires etc.

If base temperature is below 2, "rain" in the table above means snow.

rw_ice_level - amount of ice/frost

Ice appears in rooms with sector WATER, UNDERWATER, WATER_NOBOAT, and
WATER_SHALLOW.

               0     0
               1     1
  ICE_CARRIES  50    2
  THIN_ICE     100   3
  THICK_ICE    500   4
  MAX_ICE      2000  

The rightmost column is the value used in event_weather_message.
```

