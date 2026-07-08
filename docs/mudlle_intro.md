# An Introduction to MUDLLE

Source: C:\Users\pwetz\OneDrive\Desktop\An Introduction to MUDLLE.txt
Original document date: December 1993

```text
		      An Introduction to MUDLLE
		      =========================
			     December 1993


Preface
-------

This documents attemps to introduce you, the reader, to mudlle, MUME's
extension language. It assumes familiarity with the game as well as
knowledge of some basic computer language concepts (eg what a variable
is). Any complaints or questions should be addressed to Owl.

For a complete and more precise definition of mudlle, see the mudlle
reference manual.

For details on the interface between mudlle and MUME, see the
mudlle-mume manual.

MUDLLE, The Language
--------------------

Mudlle is a language designed for writing extensions to MUME, a
diku-based MUD written in C. It had several conflicting design aims:

- It should be simple and small. This translates into a simple
compiler/interpreter, less bugs, and faster availability.

- It should be easy to use (within the MUME framework).

- It should be safe, ie bugs in programs written by gods should not
crash the game. They are likely to cause strange behaviour, but this
is more or less unavoidable.

The result of this may not please everyone, but I feel that a
reasonable balance has been struck. After many complaints, the syntax
has been made more user-friendly, but otherwise the language is unchanged
from the initial version.

You may be wondering after all this what the language is like ? In one
incomprehensible sentence, it is an expression-based imperative language
with automatic storage allocation. An example will make this much
clearer: the standard "hello world!" program is written thus:

  hello = fn () [ display("Hello world!"); newline() ]

This defines a new function, 'hello', which when executed will print
"hello world!" on a line of its own. The basic constructions of the
language are visible in this example, namely:

  '<variable> = <value>' is used to give a value to a variable, in this
    case a function is being stored in 'hello'.

  'fn (<parameters>) <expression>' defines a function, whose result is
    <expression>.

  expressions: these are the basic building block of the language. 
    Any piece of code written in the language is an expression that can
    be evaluated, for example:

      3+2	  // Add 3 to 2
      newline()	  // Call the newline function
      if (a == b) 1 else 2

  code-blocks: these allow local variables to be declared and expressions
    to be executed in sequence (eg a display followed by a newline, as
    in the example above):

      [ | a | a = x + y; display(a); newline(); a ] 

    is a code-block that declares a variable 'a', stores 'x+y' in it,
    then displays a. The value of this code-block is a: code-blocks
    are also expressions. For example, you can write:

      3 * [ | b | b = x + y; b + 2 * b * b ]

    which calculates 3*((x+y) + 2*(x+y)*(x+y)).

You will have noticed that their are no type declarations, the language
is 'dynamically-typed'. This means that the language still has various
data types (integer, string, list, ...), but that a given variable can 
contain a value of any type. All type-checking is done at run-time,
for example '+' checks that it is really adding two integers. So you
can write:

  3+"fun"

and the compiler won't complain. However you will get a runtime error
if you try and execute the code.

The following notation is used to indicate what types of arguments a
function called 'name' expects, as well as the type of its result:

name: <p1> <p2> ... <pi> -> <r>

This means that function 'name' takes 'i' parameters <p1>, <p2>, ...
<pi> (or signals an error if there aren't enough). When it has
finished, it returns a result of type <r>.

<p1>, <p2>, ..., <r> are words, followed by an optional digit, for
example 'n1', 'x' or 'table3'. The name indicates the type of the expected
argument (n stands for an integer, for example), the digit allows
multiple arguments of the same type to be distinguished. For example:

  modulo: n1 n2 -> n

means that 'modulo' is a function of 2 integers returning an integer.
So the following code is legal:

  modulo(3,2)
  modulo(3+2, modulo(99,23))

but the following will cause a runtime error:

  modulo("aa", 1) // Bad type for arguments
  modulo(3)	  // Bad number of arguments

If the result type is omitted (eg as in 'newline: -> ') it means that
the function returns an unspecified value (ie nothing useful). 

If the parameter list ends with '...' it means that the function
accepts a variable number of parameters, as in

  list: x1 ... -> l

The help string associated with the function should make clear any
restrictions on the parameters.


Here is a list of the names used, and the corresponding types
(definitions and examples of all these types are given further on):

  x, y, x1, y1, x2, y2, ... : a value of any type
  n, n1, n2, ... : an integer
  b, b1, b2, ... : a boolean value (0 = FALSE, everything else = TRUE)
  s, s1, s2, ... : a string
  c, c1, c2, ... : a function (or closure as it is sometimes known)
  sym, sym1, ... : a symbol
  table, ...     : a symbol table
  l, l1, l2, ... : a list
  v, v1, v2, ... : a vector
  p, p1, p2, ... : a MUME person (player or mobile)
  o, o1, o2, ... : a MUME object (eg a sword)

If the types and number of arguments don't match what is specified for
the function, and error will be signaled. Of course, descriptions of
the functions may describe other restrictions (eg you can't divide by
0).

To get help on a particular function, you can use the predefined
function 'help'. For example, 'help(help)' prints:

  c -> . Provides help on variable function c

Or 'help(modulo)' prints:

  n1 n2 -> n. n = n1 mod n2

As you can see, 'help' also displays a quick explanation of the
function beyond the definition of parameter and result types.

If you don't know the precise name of a function, you can use
apropos(string) to get help on all functions whose name
contains 'string', for example

  apropos("sub")
  RESULT: 
    substring
    Primitive: s1 n1 n2 -> s2. Extract substring of s starting at n1 of length
n2.
    The first character is numbered 0


In the examples that follow, I shall use the word RESULT: to indicate
what the result of evaluating various examples, eg:

  3 + 2
  RESULT: 5

or

  3 + "fun"
  RESULT: wrong type of arguments

(the latter example is actually an error message)

Expressions
-----------

In mudlle, everything is an expression. But what can an expression be ?
The answer is lots of things:

- a variable: a, solution

- an indexed reference: a[i], b["fun"]

- a constant: 3, "fun", '(1 2 3)

- a function: fn (x) x + 1

- a control expression: while (a > 0) [ a = a - 1; b = b * a], 
    if (a == 1) 3 else 2

- a function call: display("fun"), modulo(88,12)

- a complex expression, with the usual operators (and brackets): 
    3+2, 7*(a-b/2), a != 0 or b > 2

- a variable assignment: a = 44

- an indexed assignment: a[i] = 12

- a code block: [ a = a - 1; b = b + 1; a * b ]


A more detailed description of the various expressions follows:

VARIABLES

Variables are of two kinds: global and local. It isn't necessary to
declare a global variable, a simple assignation will create it:

  Master_of_the_Universe = "Owl"

creates a new global variable Master_of_the_Universe and stores the
string "Owl" in it. Local variables are created when a function is
called or when a code block is entered, and are not visible outside.
See the sections on these two constructions for details.

Variable names are unlimited in length but restricted to letters,
numbers, !, @, #, $, %, _, : and ?. A number can start an
identifier, so the following are all legal variable names:

  hello
  023a
  integer?

CONSTANTS

There are four types of constants: integers, strings, arrays and
lists.

Integers are stored in 31 bits and must therefore be between
-1073741824 and 1073741823. The language has no real numbers.


Strings are surrounded by double quotes. To include a double quote in
a string, precede it with a "\". You can also include linefeeds with
"\n", carriage returns with "\r" and tabs with "\t". For example:

  "How fun it is\n\rto write a language."


Array constants must be preceded with ', and are otherwise simply a
list of constants (including other arrays) surrounded by '[' and ']'.
For example:

  '[ 1 2 (3 4) [5 6]]

is a 4 element array, whose 4th element is itself an array.

List constants are very similar, but surrounded with '(' and ')'. So:

  '( "this" "is" (32 3 [1 2]))

is a 3 element list. For more details on lists and arrays, see the
discussions on the various types.

It is illegal to attempt to modify the value of a constant (eg the
characters in a string, the elements of an array).


ASSIGNMENT

expression : variable '=' expression2

The value of 'expression2' is stored in 'variable'.

The value of the expression is the value of 'expression2'.

So for example you can write:

  a = solution = b2 + 3

COMPLEX EXPRESSIONS

expression : expression1 operator expression2

The value of the expression is the result of applying the operator to
the value of 'expression1' and 'expression2'. The following operators
are defined (inspired by C):

*: multiplication.
/: division
+: addition
-: subtraction
<<: bitwise left shift
>>: bitwise right shift
&: bitwise and
|: bitwise or
^: bitwise exclusive or
==: equality comparison
!=: inequality
<, <=, >, >=: as usual, but apply to numbers only
and, &&: logical and
or, ||: logical or
.: pair creation

There are also unary operators:

expression : unaryop expression1

The value of the expression is the result of applying 'unaryop' to the
value of 'expression1', with the following operators known:

-: numerical negation
": bitwise negation
not, !: logical negation

Most of these operators are straightforward, and are effectively just
functions in disguise. They are described in the section on types
below. The exceptions are && and || which are 'short-circuit', ie they
only evaluate their second argument if necessary (&& evaluates it if
the first is true, || if the first is false). So you can write

  if (a != 0 && b / a) ...

without getting a runtime error.

The precedence of all these operators is defined below (from highest to
lowest). The other expression constructions are also included in this
table as they are also part of the precedence order.

function call, indexed reference (a[index])
- (unary), ~, not, !
*, /
+, -
<<, >>
&
|, ^
==, !=, <, <=, >, >=
and, &&
or, ||
.
= (assignment)
if, while, functions

You can of course use brackets to override these precedence rules, eg:

  a = (if (b > 0) 1 else 2) * c


INDEXED REFERENCE and INDEXED ASSIGNMENT:

Several types represent collection of values, parts of which may be
accessed or modified by specifying an index. The relevant types and
indexes are:

- vectors, indexed by an integer between 0 and the vector's length - 1.

- strings, indexed by an integer between 0 and the string's length - 1.

- associative arrays, indexed by arbitrary strings.

The a[x] and a[x] = b operations check the type of a and call the
appropriate indexing function (one of vector_ref, vector_set,
string_ref, string_set, table_ref and table_set).

CONTROL EXPRESSIONS: See the section on control structure.

FUNCTIONS and FUNCTION CALLS: See the section on functions.

CODE BLOCKS: See the section on code blocks.

Functions
---------

Mudlle functions take a fixed number of parameters and return an
expression, for example:

  fn (x) x + 1
  RESULT: {closure}

is a function which adds one to x and returns the result.

Functions are values like any other and are displayed as '{closure}'
if you try and print them. It is generally more convenient to store
them in a variable:

  add1 = fn (x) x + 1
  RESULT: {closure}

You can then call this function with the usual syntax:

  add1(4)
  RESULT: 5

You can however call a function directly:

  (fn (x) x + 1)(4)
  RESULT: 5

The brackets are necessary to avoid precedence problems.

Functions can have more than one parameter, eg:

  average = fn (x, y) (x + y) / 2

  average(10, 5)
  RESULT: 7

or none at all:

  hello = fn () display("hello world!\n")

  hello()
  PRINTS: hello world!
  RESULT: undefined

And as pointed out above, functions are values. So they can be
returned by other functions:

  curry_add = fn (x) (fn (y) x + y)

defines a function which returns a function... It can be used like
this:

  add5 = curry_add(5)
  RESULT: {closure}

  add5(7)
  RESULT: 12

or like this:

  curry_add(3)(99)
  RESULT: 102


Code blocks
-----------

Sometimes you may wish to do more than one thing in a function
definition, like printing 'a' and then a newline. This introduces that
dreaded beast, imperative programming ... (which has already been
lurking in previous paragraphs in the guise of its horrible sidekick,
the 'side-effect')

To solve this problem, mudlle provides the 'code block' construction
which allows you to execute expressions in sequence, like this:

  [ display(a); newline() ]

A code block is itself an expression, whose value is that returned by
the last expression in the block (in this case 'newline()', which has
an undefined result).

Here is a typically bad imperative function:

  mad = fn (a, b) 
    [ c = a + 2; d = b - 1;
      display("The result of "); display(c); display("/"); display(d);
      display(" is "); display(c / d); newline() ]

A typical usage:

  c = 99
  RESULT: 99

  mad(10, 7)
  PRINTS: The result of 12/6 is 2
  RESULT: undefined

  c
  RESULT: 12

  d
  RESULT: 6

The values of the global variables c and d have been destroyed by the
call to 'mad'. c and d shouldn't have been global variables, only the
function 'mad' cares what their values are. They should therefore only
be visible inside 'mad', and not get in the way of any other functions
which use the same names.

This is achieved by declaring 'c' and 'd' as local variables:

  better = fn (a, b) 
    [ | c d | // Declare local variables c and d
      c = a + 2; d = b - 1;
      display("The result of "); display(c); display("/"); display(d);
      display(" is "); display(c / d); newline() ]

A typical usage:

  c = 99
  RESULT: 99

  better(10, 7)
  PRINTS: The result of 12/6 is 2
  RESULT: undefined

  c
  RESULT: 99

  d
  RESULT: something
  

Local variables are simply listed at the start of a code block,
surrounded by '|'s. New local variables are created every time
the block is executed, which allows recursion (see the section on
control structures for some examples). 

Local variables are only visible in the code block which declares them
(and in any code block contained in the first), this is known as
lexical scoping. So

  a = 1
  print_a = fn () [ display(a); newline() ]
  print_two_a = fn (a) [ display(a); newline(); print_a() ]

  print_two_a("fir-tree")
  PRINTS: fir-tree
	  1
  RESULT: undefined

Once a local variable has been created it will continue existing as
long as necessary, this is called "indefinite extent". For people
raised on conventional stack-based languages like C, this will
probably be longer than they thought ... See the 'curry_add' example
in the section on functions above for an example (the parameters to
functions are also local variables).

Control structures
------------------

Mudlle has three basic control structures: 'if', 'while' and recursion
(or more strictly, abstraction and application). The first two are not
actually strictly necessary, but make life much easier.

As an aside to interested readers, here is how you can define 'if':

  true = fn (x, y) x()
  false = fn (x, y) y()
  newif = fn (condition, success, failure) condition(success, failure)

then:

  newif(true, fn () 1, fn () 2)
  RESULT: 1

  newif(false, fn () 1, fn () 2)
  RESULT: 2

definining 'while', numbers and so on is left as an exercise to the
student ... Readers who haven't given up in disgust may be reassured
that I will now return to more traditional pastures.

The 'if' and 'while' control structures are similar to those provided
in C:

  glorf = fn (a) if (a > 0) display("a is greater than 0")

  glorf(23)
  PRINTS: a is greater than 0

  sumn = fn (n) [ | m | m = 0;
		  while (n > 0) [ m = m + n; n = n - 1];
		  m ]

  sumn(10)
  RESULT: 55

Other traditional control structures, such as 'for' loops are also
available albeit in a slightly strange form. This is because they are
defined as functions and are not in any way different from others
functions like 'display', 'modulo', etc. For example:

  for(1, 5, fn (i) [ display(i); newline ])

  PRINTS: 1
	  2
	  3
	  4
	  5


This is possible because code blocks are values which can be passed to
functions.  The other control structures which is provided in a
similar way is 'repeat'. These control structures work as follow
(some of the definitions are in pseudo-code for simplicity):

  repeat: n c ->
  Execute function 'c()' 'n' times.
  Signals an error if 'n' < 0.
  The result is undefined

  for: n1 n2 c -> ?
  If 'n1' <= 'n2' then
    for i = n1 to n2 do
      execute 'c(i)'
    end for

The factorial function can now be written without excessive
difficulty. It takes an integer from the stack and produces another,
so its definition is:

  fact: n1 -> n2
  n2 = factorial(n1), or 1 if n1 < 0.

And it can be written in mudlle as:

  fact = fn "n1 -> n2. n2 = factorial(n1), or 1 if n1 < 0" (n)
    [ | result |
      result = 1;	// Result of the factorial
      while (n > 0) [ result = result * n; n = n - 1 ]
      result ]		// Return result

  fact(5)
  RESULT: 120

  fact(-4)
  RESULT: 1

  help(fact)
  PRINTS: n1 -> n2. n2 = factorial(n1), or 1 if n1 < 0

This example has also shown how you can add a help text to functions
you define.

The other classical control structure, recursion, is also available.
Knowing that 

	    | n * fact(n - 1) if n > 0
  fact(n) = |
	    | 1 if n = 0

we can define frec (recursive factorial) as:

  frec = fn "n1 -> n2. recursive factorial" (n)
    if (n > 0) n * frec(n - 1)
    else 1

  frec(5)
  RESULT: 120

Types
-----

The following types are defined in mudlle:

- integer: 32, -999999

- string: an ASCII string, "Owl", "MUME", ...

- pairs: a pair of values, used to construct lists, as in:
    (1 2 3), ("Owl" "is" [12 {closure}])

- null type: used to mark the end of lists, has only one value: null

- vector: a one-dimensional array of values, similar to a list, [ ], 
  [ 12 -1 ]

- closure (or function): fn (x) x + 1

- associative array: an associative array allows you to associate
  values with strings. It can thus be viewed as a generalisation of an
  array, but using strings instead of numbers as indexes.

- symbol: an associative array stores a number of 'symbols'. A symbol
  is just a name (a string) and a value.

- person: MUME mobiles or players

- object: MUME object, eg a sword

- gone: a MUME object or person that has been destroyed

It isn't possible to define any new types in mudlle, but the existing
ones are flexible enough to represent any data structure.

Each of the types will be presented in more detail, except for the
MUME related ones which are described in the mudlle-mume manual.

The section on each type will also define the operations which are
predefined on objects of that type (some readers may notice
similarities with Scheme ...)

The language does not include a character or a boolean type. For
simplicity, these are represented by integers (like in C). More
precisely:

A character is represented by its ASCII code, a number between 0 and
255.

Integer 0 is 'false', all other values are 'true'. Functions that
return a boolean value return 1 for 'true'. So you can write:

  if (3) 1 else 2
  RESULT: 1

  if (0) 1 else 2
  RESULT: 2


INTEGERS

As already pointd out, integers are stored in 31 bits and must
therefore be between -1073741824 and 1073741823.

The following operators are available:

  n1 + n2 -> n. Addition. There is no overflow or underflow checking (so
  1073741823 + 1 is undefined)

  n1 - n2 -> n. Subtraction. No checking either.

  n1 * n2 -> n. Multiplication. No checking.

  n1 / n2 -> n. Division. If n2 == 0, a runtime error is signaled. The
  result of the division is rounded towards 0.

  n1 % n2 -> n. Remainder of the division. (a / b) * b + a % b = a.

  -n1 -> n2. Numerical negation.

  n1 == n2 -> b. Numerical equality.

  n1 != n2 -> b. Numerical inequality.

  n1 < n2 -> b, n1 <= n2 -> b, n1 > n2 -> b, n1 >= n2 -> b. Numerical
  ordering.

  n1 | n2 -> n. Bitwise or.

  n1 & n2 -> n. Bitwise and.

  n1 ^ n2 -> n. Bitwise xor.

  ~n1 -> n2. Bitwise negation

  n1 << n2 -> n. Shift n1 left by n2 bits.

  n1 >> n2 -> n. Shift n1 right by n2 bits. If n1 is negative, the n2 most
  significant bits are set to 1, otherwise to 0 ('arithmetic shift right').


There are also several functions:

  integer?: x -> b. Returns TRUE if x is an integer.

  modulo: n1 n2 -> n. Returns (n1 mod n2), with the usual mathematical
  definition of modulo (this is different from % when negative numbers
  are involved).

  min: n1 n2 -> n. Returns n1 if n1<n2, n2 otherwise.

  max: n1 n2 -> n. Returns n1 if n1>n2, n2 otherwise.

  abs: n1 -> n2. Returns |n1|.


STRINGS

Strings are sequences of characters of a given length n. There are no
limits on the maximum length of strings. For a sequence of length n,
the first character is numbered 0, the last n-1. The characters are
represented by their ascii codes.

Strings are either constants (included in the source), or created by
one of the functions below. It is illegal to modify a constant string.


  string?: x -> b. Returns TRUE if x is a string.

  make_string: n -> s. Creates a new string of length n. The contents
  are undefined.

  string_length: s -> n. Returns the length of string s.

  string_fill: s n -> . Sets all the characters in s to ascii code n. s
  must not be a constant. The result is undefined.

  string_ref: s n1 -> n2. Return the ascii code (n2) of the n1'th
  character of s.

  string_set: s n1 n2 -> . Set the n1'th character of s to the character
  whose ascii code is n2. s must not be a constant. The result is
  undefined.

  string_cmp: s1 s2 -> n. Compare 2 strings. Returns 0 if s1 = s2, < 0
  if s1 < s2 and > 0 if s1 > s2.

  string_icmp: s1 s2 -> n. Compare 2 strings ignoring the case of the
  characters.  Returns 0 if s1 = s2, < 0 if s1 < s2 and > 0 if s1 > s2.

  substring: s1 n1 n2 -> s2. Extract substring of s starting
  at n1 of length n2. The returned string is modifiable.

  string_append: s1 s2 -> s. Concatenate s1 and s2. The returned string
  is modifiable.

  split_words: s -> l. Split string s into words in list l. The strings
  in l are modifiable.

  itoa: n -> s. Converts integer into string

  atoi: s -> n. Converts string into integer. Returns s if conversion failed

  format: s x1 x2 ... -> s. Formats string s with parameters x1, ...
    The format string is copied as is to the result, except for format
    specifiers introduced by %:
      %% is replaced by a single %.
      %s is replaced by a string representation of the next argument.
      %c is replaced by the character whose ASCII code is the next
         argument (which must be an integer between 0 and 255).
    

LISTS

Lists in mudlle follow the traditional Lisp representation based on
the concept of 'pairs'. A pair is just what it's name implies: a pair
of values. Pairs are created with the 'cons' function or its synonym,
the '.' operator:

  cons(3, 2)
  RESULT: (3 . 2)

  "hello" . null
  RESULT: ("hello")

The two functions 'car' and 'cdr' return respectively the first and
second element of a pair (the names have historical reasons):

  a = cons(3,2)
  RESULT: (3 . 2)

  car(a)
  RESULT: 3

  cdr(a)
  RESULT: 2

Lists are just a convention on the use of pairs: to pass a list to a
function you pass it a pair. The first element of the pair is
considered to be the first element of the list. The second element of
the pair is expected to be either: 

- null (the null value), which means that this is the end of the list.

- another pair. Then the first element of this second pair is the
second element of the list, and the second element must be either a
pair (containing the third element of the list) or null.

- any other value: the list isn't a proper list (so (3 . 2) above is a
malformed list).

So we can create the 3 element list (1 2 3) like this:

  endlist = cons(3, null)
  RESULT: (3)

  middle = cons(2, endlist)
  RESULT: (2 3)

  mylist = cons(1, middle)
  RESULT: (1 2 3)

You will notice that the printing functions know about lists and print
them in a friendly fashion ... You can now use 'car' and 'cdr' to look
at pieces of mylist:

  car(mylist) // Get first element
  RESULT: 1

  cdr(mylist) // Get rest of list
  RESULT: (2 3)

  car(cdr(mylist)) // Get 2nd element
  RESULT: 2

After this (hopefully clear) introduction, here is a summary of the
functions that operate on pairs / lists:

  pair?: x -> b. Returns TRUE if x is a pair.

  cons: x1 x2 -> l. Make a new pair from elements x1 & x2.

  car: l -> x. Returns first element of pair l

  cdr: l -> x. Returns 2nd element of pair l

  set_car: l x ->. Sets the first element of pair l to x. l must not be
  a constant.

  set_cdr: l x ->. Sets the 2nd element of pair l to x. l must not be
  a constant.

  list: x1 ... -> l. Returns a list of the arguments

Be careful when using set_car or set_cdr: you can create a circular
list:

  a = cons(3, null)
  RESULT: (3)

  set_cdr(a, a)
  RESULT: undefined

  a
  RESULT: (3 3 3 3 3 3 3 3 3 3 ....

This result logically follows, because:

  car(a)
  RESULT: 3

  eq?(cdr(a), a)
  RESULT: 1

The first element of the list is 3. The pair stored in the 2nd element
of 'a', ie 'a' itself, so the 2nd element is also 3, and so on.


VECTORS

These are sometimes called vectors. An array is similar to a string,
but can contain any value: it is a fixed length sequence of values,
the first of which is numbered 0.

Mudlle provides some syntax to help in manipulating arrays:

- There are array constants, like '[ 1 2 "mad"].

- You can easily read the n'th element of an array: a[3]

- You can modify the n'th element of an array: a[i + 1] = "fun".
However, it is illegal to modify the elements of a constant array.


  vector?: x -> b. Returns TRUE if x is a vector.

  make_vector: n -> v. Create an empty vector of length n (all elements
  are set to null).

  vector_length: v -> n. Returns the length of the vector.

  vector_fill: v x -> . Sets all elements of vector v to x. This is
  illegal if v is a constant array.

  vector: x1 ... -> v. Returns a vector of the arguments


FUNCTIONS

These have been discussed above. The only function defined
specifically to operate on functions is:

  closure?: x -> b. Returns TRUE if x is a function.


ASSOCIATIVE ARRAYS and SYMBOLS

A symbol table allows you to associate values with strings. It can
thus be viewed as a generalisation of an array, but using strings
instead of numbers to index it.

A symbol table stores a number of 'symbols'. A symbol is just a name
(a string) and a value stored together, with the following functions
defined:

  symbol?: x -> b. Returns TRUE if x is a symbol

  symbol_name: sym -> s. Returns the name of a symbol

  symbol_get: sym -> x. Returns the value of a symbol

  symbol_set: sym x -> . Sets the value of symbol sym to x. The result
  is undefined.

You will notice that their is no way to directly create a new symbol,
they always come from symbol tables:

  table?: x -> b. Returns TRUE if x is an associative array

  make_table: -> table. Create a new (empty) associative array

  table_ref: table s -> x. Returns the value of s in symbol table. If
  s isn't in the table, returns null. table[s] returns the same result.

  table_set: table s x -> x. Sets the value of entry s in symbol table
  to x. table[s] = x has the same effect.

  table_list: table -> l. Returns list of symbols in table whose value
  isn't null (this is the only way to get at the actual symbols of a
  table)

One example of use would be a mobile remembering the names of the
people it had met, and what they had done to it. It could then use
this information next time it met the same person to decide how to act
(eg be friendly / be agressive).

Miscellaneous operations
------------------------

Not all operations are linked to particular types. The following
functions are also available:

INPUT / OUTPUT

Within MUME, this is only useful for debugging (when using /mudlle).
The output from these functions is thrown away if it is executed as
a timed action or as a reaction.

  write: x -> . Print a representation of x.

  display: x -> . Display a representation of x.

  examine: x -> . Examine a representation of x.

  newline: -> . Print a newline.

  load: s -> . Loads file s.

display, write and examine display varying amounts of information on
their parameter, display the least, examine the most.

load loads a file whose pathname you specify. Within MUME, it is
generally more convenient to use load_mobile, load_room or load_object
(see below).

LOGICAL OPERATIONS

The following logical operators and functions are available:

  b1 and b2 -> b. Returns TRUE if b1 and b2 are true.

  b1 or b2 -> b. Returns TRUE if b1 or b2 are true.

  not b1 -> b2. Returns TRUE if b1 is FALSE.

  x1 == x2 -> b. Returns TRUE if x1 and x2 are the same object.

Be careful that these operators always evaluate both arguments (as
opposed to the C && and || operators). So:

  if (1 < 0 and display("fun")) 1 else 2
  PRINTS: fun
  RESULT: 2

By the same object it is meant a particular object created at a
particular moment. The contents are not compared. So:

  "fun" == "fun"
  RESULT: 0

  a = "fun"; a == a
  RESULT: 1

Similarly

  cons(3, 2) == cons(3, 2)
  RESULT: 0

  a = cons(3, 2); a == a
  RESULT: 1

However, 2 integers are 'eq?' if they have the same value. So:

  33 == 32 + 1
  RESULT: 1


REALLY MISCELLANEOUS

  ctime: -> n. Returns the number of milliseconds of cpu time (use
  difference only)

  time: -> n. Returns the number of seconds since the 1st of January
  1970 GMT

  quit: -> . Exit mudlle.

  help: c -> . Provides help on function c.

  apropos: s -> . Finds all global variables whose name contains
  substring s and prints them (with help)

  debug: n -> . Set debug level (0 = no debug). This is most useful if
  you know how the mudlle internals work ...

  gcstats: -> l. Returns GC statistics. The same comment as for
  debug() applies ...


Storage allocation
------------------

Looking at the functions defined above, you will notice that there are
lots of functions to allocate things (arrays, pairs, ...) but nothing
to free the memory thus reserved. This is because the language (or to
be more precise, the garbage collector) is responsible for freeing any
memory that isn't used anymore.

Basically, all values to which there is still a reference (in a
variable, as an element of an array which is itself referenced
somewhere, referenced from within the game, ...) will be kept.
Everything else is freed automatically, thus freeing you, the
programmer, from an annoying burden.

Errors
------

All operations and functions check their arguments for consistency
before executing them, and signal an appropriate error if necessary.
The possible errors are:

  bad function -- you tried to call something that wasn't a function,  eg:

    hello = 1; hello()
    RESULT: error: bad function

  stack underflow -- this shouldn't happen

  bad type -- you passed arguments of the wrong type, eg:

    3+"fun"
    RESULT: error: bad type

  divide by zero -- you tried to do a division by zero

  bad index -- you tried to access a non-existent element of an array
    or string, eg:

    a = [ 1 ]; a[2]
    RESULT: error: bad index

  bad value -- a parameter had an invalid value (lots of causes)

  variable is read-only -- you tried to modify one of the predefined
    functions or variables:

    display = 1
    RESULT: error: variable is read-only

  value is read-only -- you tried to modify a read only value,
    probably a constant:

    a = '[1]; a[0] = 99
    RESULT: error: value is read-only


  function probably has an infinite loop -- your code took to
    long to execute. Either it has an infinite loop or you should
    make it simpler.

  function probably has an infinite recursion -- the depth of
    recursive calls exceeded a predefined limit, currently 400.

  wrong number of parameters -- example:

    modulo(3)
    RESULT: error: wrong number of parameters

  value too complex to be printed -- you tried to print an
    excessively complex, or circular, value. Don't.

  insufficient privilege -- see the mudlle-mume manual (you tried
    to do something that is forbidden to you)

All this checking has the great advantage that mudlle cannot crash
MUME (except for the case of bugs in mudlle itself, not in the
programs you write).

When an error is signaled, whatever is being done is aborted and the
error message is printed (if you are using mudlle interactively). You
can use this feature to avoid doing some checks in your code, for example:

If you have a function which looks for an object in a room (by
name) and does something if it finds it, you can simply write it like
this:

fn () // Take an object called "glorf" in room 1010
 [ | obj | obj = find_object_in(actor, 1010, "glorf");
   move_object(obj, actor) ]

Theoretically, you should check that obj is not FALSE (no object
called "glorf" found), but move_object expects an object as parameter.
If it gets FALSE, it will signal a runtime error and whatever was
being doing will be abandoned.


*f>i
You are carrying:
an old black bottle
a jewel-encrusted goblet
a dragonshaped staff
a long and scaly snakeskin
an Ainu hat (satisfactory); it emits a faint humming sound

*f>l
Sauron's Laboratory
An iron chair is here.
A scorched table spattered in blood is here.
On the table, there are a sacrificial knife and an old black bottle.
A Morgundul orc-guard is here, preparing the chamber for you.
Jahara, wielding a mighty dwarven axe, is standing here (wizinvis M and idle).
Obvious exits (150:19):
 (Down)   - (door) The Tavern's Gambling Room  [150:92]  (one-way)

*f>read 2

			MUME REFERENCE MANUAL
			     December 1993

1. Preface
==========

This text is the reference manual for the mudlle language. To
familiarize yourself with the language, look at the introductory
manual first. To find out information on the MUME interface,
consult the mudlle-mume manual.

Any complaints or questions should be addressed to Owl.

2. Notation
===========

The following notation is used to indicate what types of arguments a
function called 'name' expects, as well as the type of its result:

name: <p1> <p2> ... <pi> -> <r>

This means that function 'name' takes 'i' parameters <p1>, <p2>, ...
<pi> (or signals an error if there aren't enough). When it has
finished, it returns a result of type <r>.

<p1>, <p2>, ..., <r> are words, followed by an optional digit, for
example 'n1', 'x' or 'table3'. The name indicates the type of the expected
argument (n stands for an integer, for example), the digit allows
multiple arguments of the same type to be distinguished. For example:

  modulo: n1 n2 -> n

means that 'modulo' is a function of 2 integers returning an integer.
So the following code is legal:

  modulo(3,2)
  modulo(3+2, modulo(99,23))

but the following will cause a runtime error:

  modulo("aa", 1) // Bad type for arguments
  modulo(3)	  // Bad number of arguments

If the result type is omitted (eg as in 'newline: -> ') it means that
the function returns an unspecified value (ie nothing useful). 

If the parameter list ends with '...' it means that the function
accepts a variable number of parameters, as in

  list: x1 ... -> l

The help string associated with the function should make clear any
restrictions on the parameters.

Here is a list of the names used, and the corresponding types
(definitions and examples of all these types are given further on):

  x, y, x1, y1, x2, y2, ... : a value of any type
  n, n1, n2, ... : an integer
  b, b1, b2, ... : a boolean value (0 = FALSE, everything else = TRUE)
  s, s1, s2, ... : a string
  c, c1, c2, ... : a function (or closure as it is sometimes known)
  sym, sym1, ... : a symbol
  table, ...     : a symbol table
  l, l1, l2, ... : a list
  v, v1, v2, ... : a vector
  p, p1, p2, ... : a MUME person (player or mobile)
  o, o1, o2, ... : a MUME object (eg a sword)

If the types and number of arguments don't match what is specified for
the function, and error will be signaled. Of course, descriptions of
the functions may describe other restrictions (eg you can't divide by
0).

In the examples that follow, I shall use the word RESULT: to indicate
what the result of evaluating various examples, eg:

  3 + 2
  RESULT: 5

or

  3 + "fun"
  RESULT: wrong type of arguments

(the latter example is actually an error message)

3. MUDLLE, The Language
=======================

3.1 Lexical structure
---------------------

Mudlle programs are composed of a certain number of tokens, which can
be any of the following:

- white space & comments: these may serve as separators between tokens,
  but are otherwise ignored.

  white space is: space, cr, lf and tab.
  comments: start with // and extend to the end of the line

- integers: integers range from -2^30 to 2^30 - 1 and are entered 
  as usual in base 10.

  You can also get the ASCII code for a particular character with
  the ?c notation (eg ?A is 65, ?9 is 57, ...).

- identifiers: identifiers start with a letter, digit, _ or : and
  continue with letters, digits, _, :, $, ? and !. There is no
  limit on identifier length and identifiers are not case sensitive.

- strings: strings must be surrounded with double quotes (") and may
  not be longer than a single line. To include a " in a string preceed
  it with a \. To get a cr, lf or tab, use \r, \n and \t respectively.
  To get a \, use \\. There are no limits on string length.

- keywords: the following identifiers are reserved for use as keywords:
    fn, if, else, while, or, and, not.

- symbolic keywords: &&, ||, !. [, ], |, ;, +, -, *, /, %, (, ), &,
  ~, ^, comma (,), dot(.), =, ==, !=, <, <=, >, >=, <<. >>, '.


3.2 Syntax
----------

Mudlle's syntax is in some respects quite close to C. Here it is, in
EBNF form (keywords and other tokens are in capital letters, symbolic
keywords are surrounded by quotes (')):

mudlle_expression : expression_list

expression_list : expression_list1 optional_semi

expression_list1 :
  expression_list1 ';' expression  |
  expression

optional_semi : /* empty */ | ';'

expression :
  control_expression |
  function_expression |
  variable '=' expression |
  indexed_ref '=' expression |
  op_expression

control_expression : if | while

if : IF '(' expression ')' expression optional_else

optional_else : /* empty */ | ELSE expression

while : WHILE '(' expression ')' expression

function_expression : FN optional_help parameters expression

optional_help : /* empty */  | STRING

parameters : '(' variable_list ')'  ;

variable_list : /* empty */  | variable_list1

variable_list1 : variable_list1 ',' variable  | variable

indexed_ref : simple_expression '[' expression ']'

op_expression : 
  op_expression '.'  op_expression |
  op_expression '||' op_expression |
  op_expression OR   op_expression |
  op_expression '&&' op_expression |
  op_expression AND  op_expression |
  op_expression '==' op_expression |
  op_expression '!=' op_expression |
  op_expression '<'  op_expression |
  op_expression '<=' op_expression |
  op_expression '>'  op_expression |
  op_expression '>=' op_expression |
  op_expression '|'  op_expression |
  op_expression '^'  op_expression |
  op_expression '&'  op_expression |
  op_expression '<<' op_expression |
  op_expression '>>' op_expression |
  op_expression '+'  op_expression |
  op_expression '-'  op_expression |
  op_expression '*'  op_expression |
  op_expression '/'  op_expression |
  op_expression '%'  op_expression |
  op_expression '-'  op_expression |
  op_expression '~'  op_expression |
  op_expression NOT  op_expression |
  NOT op_expression |
  '!' op_expression |
  '-' op_expression |
  '~' op_expression |
  simple_expression

simple_expression :
  function_call |
  indexed_ref |
  variable  |
  simple_constant  |
  QUOTE constant  |
  code_block  |
  '(' expression ')'

function_call : simple_expression '(' call_list ')'

call_list : /* empty */ | call_list1  ;

call_list1 : call_list1 ',' expression  | expression

constant :
  simple_constant |
  '[' constant_list ']' |
  '(' constant_list ')'

simple_constant : INTEGER | STRING

constant_list : /* empty */ | constant_list constant ;

variable : SYMBOL ;

code_block :
  '[' expression_list ']' |
  '[' '|' variable_list '|' expression_list ']' ;

The op_expression above does not specify the associativity or priority
of the operators. All operators except '.' associate to the left ('.'
associates to the right). The priorities are as follows, from highest 
to lowest:

  NOT, !, ~, (unary) -
  *, /, %
  +, -
  <<, >>
  &
  |, ^
  ==, !=, <, <=, >, >=
  AND, &&,
  OR, ||
  .

Brackets ('(' and ')') may of course be used to override the default
precedences.


3.3 Types
---------

The following types are defined in mudlle:

- integer: integers are stored in 31 bits and must therefore be
  between -1073741824 and 1073741823. Examples: 32, -999999, ?\.

- string: strings are sequences of characters of a given length n.
  There are no limits on the maximum length of strings. For a sequence
  of length n, the first character is numbered 0, the last n-1. The
  characters are represented by their ascii codes.
  Examples: "Owl", "MUME", ...

- pair: a pair of values, eg (1 . 2). Pairs are created with the
  'cons' function or the '.'  operator:

    cons(3, 2)
    RESULT: (3 . 2)

  Lists in mudlle follow the traditional Lisp representation based on
  the concept of 'pairs'. A pair is just what it's name implies: a pair
  of values. 

  Lists are just a convention on the use of pairs: to pass a list to a
  function you pass it a pair. The first element of the pair is
  considered to be the first element of the list. The second element of
  the pair is expected to be either: 

  - null (the null value), which means that this is the end of the list.

  - another pair. Then the first element of this second pair is the
  second element of the list, and the second element must be either a
  pair (containing the third element of the list, and so on) or null.

  - any other value: the list isn't a proper list (so (3 . 2) above is a
  malformed list).

  So (1 2 3) is just a shorthand for (1 . (2 . (3 . null))).

  The printing functions know about lists and print them in a friendly
  fashion.

- null type: used to mark the end of lists, has only one value: null.

- vector: an one-dimensional array of values, similar to a list. The
  first element is numbered 0.
  Examples: [ ], [ 12 -1 ].

  There are no multi-diensional arrays, but vectors may contain other vectors
  (the effect is very similar), eg [ [ 1 9 ] [ 4 12] ].

- closure (or function): fn (x) x + 1.

- associative array: an associative array allows you to associate
  values with strings. It can thus be viewed as a generalisation of an
  array, but using strings instead of numbers as indexes.

- symbol: an associative array stores a number of 'symbols'. A symbol
  is just a name (a string) and a value.

- person: MUME mobiles or players.

- object: MUME object, eg a sword.

- gone: a MUME object or person that has been destroyed.

It isn't possible to define any new types in mudlle, but the existing
ones are flexible enough to represent any data structure. For more
details on the MUME types, see the mudlle-mume manual.

It is possible to define constants of the integer, string, list
(pairs) and vector types in mudlle source. These constants are really
constant, any attempt to modify them will cause a runtime error.

All types are disjoint, ie any value has only one type.

There is no boolean type, instead integer 0 is false and everything other
value is true. Operations that return a boolean return 1 for true, 0
for false (it is best to use the predefined 'true' and 'false' variables).

Similarly, there is no character type, the ascii value of characters
(ie an integer) is used instead.

3.4 Expressions
---------------

As can be seen in the grammar above, mudlle is an expression language.
Any syntaxically correct program is an expression with a single result
and possibly some side effects (such as modifying some variables,
displaying some results, etc). Some functions or expressions do not
have any useful results, those expressions are said to return the
`undefined' value. This value should never be used.

The main classes of expressions are:

- binary and unary expressions (eg 3 + 2, a == b, -z)

- constants, variables, indexed references, assignment and indexed
  assignment.

- function definition and function call.

- code blocks

- control expressions (if, while)

- expression lists (which express the sequential nature of computations)

The order of evaluation of the expressions composing a more complex
expression is undefined, except for the following cases:

- parameters of a function are evaluated before the function is called.
  But the order of their evaluation is unspecified.

- the expressions in an expression list are evaluated in order, from
  first to last.

- the condition of an if or while is evaluated before its body.

- in 'a && b' and 'a || b', a is evaluated before b.

3.4.1 Binary and unary expressions
----------------------------------

Most operators only accept one type of argument. Those that accept
more are 'overloaded' operators. They will be described several times
in this section. The operators can be divided into three classes:
numerical, boolean and miscellaneous.

3.4.1.1 Numerical operators

All numbers in mudlle are 31 bit 2's complement numbers.  The operators
cause all their arguments to be evaluated, though in an arbitrary and
unspecified order.

The following arithmetic operators return a number:

  (unary) -: negation
  *: multiplication
  /: division
  %: remainder
  +: addition
  -: subtraction

There is no overflow checking, numbers just wrap around according to the
rules of 2's complement arithmetic. / and % are defined as in C (ie their
behaviour on negative arguments is uncertain, -3/2 can be -1 or -2, and %
is defined in consequence so that (a / b) * b + a % b = a). If you need
the mathematical definition of 'modulo', use the modulo function, not %.

The following operators allow manipulation of integers as 31 bit binary
numbers:

  ~: bitwise negation.
  <<: n1 << n2 shifts n1 left by n2 bits (and adds 0 bits).
  >>: n1 >> n2 shifts n1 right by n2 bits (and adds 0 bits).
  &: bitwise and
  |: bitwise or
  ^: bitwise exclusive or

To compare two integers (and return a boolean), use <, <=, >, or >=.

3.4.1.2 Boolean operators

These are: ==, !=, and, or, not, !, &&, ||. All return true (1) or
false (0).

The == operator compares two values and returns true if they are the
*same value*. By this it is meant a particular value created at a
particular moment. The contents are not compared. So:

  "fun" == "fun"
  RESULT: 0

  a = "fun"; a == a
  RESULT: 1

The result of the first expression is actually undefined, ie it may be
either 1 or 0 (depending on whether the compiler recognises if the two
constants are identical at compile time).

Similarly

  cons(3, 2) == cons(3, 2)
  RESULT: 0

  a = cons(3, 2); a == a
  RESULT: 1

Separate calls to cons, and all other functions which create values (like
'list', 'vector', etc) are guaranteed to return "unequal" values (ie values
for which == returns false).

However, 2 integers are '==' if they have the same value. So:

  33 == 32 + 1
  RESULT: 1

'a != b' is simply 'not (a == b)'.

(To understand how == works, it is useful to know that all values in mudlle
are represented as pointers to the memory area which contains the actual
data (except for integers). == just compares two pointers for equality).

and, or, not and ! (which is just a synonym for 'not') evaluate
both their arguments and return the appropriate boolean value.

&& and || are like 'and' and 'or' respectively, except that they
evaluate their first argument first and only evaluate the second
argument if necessary (for 'and', the second is evaluated if the
first is true, for 'or' if the first is false). Thus you can
write

  if (a != 0 && 100 / a > 10) ...

without the runtime error which is produced by:

  if (a != 0 and 100 / a > 10) ...


3.4.1.3 Miscellaneous operators

'.' is the pair building operator. 'a . b' creates a new pair whose
elements are a and b. This is identical to 'cons(a, b)'. '.' associates
to the right, so you can use:

  a . b / 2 . "hello" . null

to create the list

  ( a b/2 "hello")


'+' is also string concatenation. Example:

  "aa " + "zeta"
  RESULT: "aa zeta"

3.4.2 Constants, variables, etc
-------------------------------

Mudlle allows constants of some types to be specified in programs,
specifically lists, vectors, integers and strings. A list is just
a shorthand for a set of linked pairs. Evaluating a constant returns
the constant itself. For example:

  a = 23; // An integer constant
  display("Hello world!"); // A string constant
  values = '[1 4 9 "hello!" ]; // A vector (one dimensional array)
  lvalues = '(1 4 9 "hello!"); // The same values, in a list

The value of a constant may not be modified, eg

  a = "abcdef"; a[2] = ?z 

produces a runtime error.

There are two classes of variables, local and global. They are both
untyped (i.e. they may at different times contain values of different
types, 'a = 3; a = "hello"' is perfectly legal). The local variables
are the parameters of functions and the variables declared in a code
block. All other variables are global (and are implicitly declared
the first time they are used).

To get a variable's value, you use its name, as in 'a + 1'. To set a
variable to a particular you use the assignment operator '=':

  a = 3

The value of an assignment expression is the value assigned, so you
can write:

  a = (b = "hello")

which will set both a & b to "hello" (the brackets are unecessary).

Mudlle also has a special notation to refer to the contents of
indexable values. Indexable values are vectors (the index is a number
from 0 to the length of the vector - 1), strings (same as vectors, but
the contents are unsigned 8 bit numbers) and associative arrays (the
index is an arbitrary string). The usual array notation is used:

  a[3] // Return 4th element of vector stored in a
  b["test"] // Return element "test" of associative array in b

The value that is indexed does not have to be a variable, it simply
must be an expression whose value is of the appropriate type:

  '["Hello" "Goodbye" "Go away"][answer]

And to assign a value:

  a[2] = a[1] + 1
  b["test"] = null

Both the indexed assignment and lookup operations are simply short
cuts for calls to the 'ref' and 'set' functions:

  a[x] is the same as ref(a, x)
  a[x] = b is the same as set(a, x, b)

3.4.3 Functions
---------------

Mudlle functions take a fixed number of arguments and return a single
result (some primitives accept a variable number of arguments).
Functions are values like any other and are displayed as '{closure}'
if you try and print them. They are not automatically associated with
a particular name as in programming languages like C or Pascal (it is
up to the programmer to store the function in an appropriate variable).

3.4.3.1 Function definition

The formal definition of a function is:

  FN help_string ( parameters ) expression

The (optional) help_string is for use with the 'help' and 'apropos'
functions (see the function reference below) and is otherwise ignored.

The parameters introduce formal names for the variables which will
contain the functions arguments, for use within the 'expression'.
These variables are created when the function is called and have 
indefinite extent (they will continue existing as long as necessary).
Their scope is the 'expression'.

The 'expression' defines the value of the function, it is evaluated
every time the function is called, with new parameter variables bound
to the arguments passed.

Some examples:

  fn (x) x + 1 // parameter: x, expression: x + 1

  fn () display("hello world!\n") // no parameters

  fn (x) (fn (y) x + y) // parameter: x, expression: fn (y) x + y

The last function is an example where the parameter x created when the
call was made will continue to exist after the function returns (x is
necessary to compute 'fn (y) x + y').

3.4.3.2 Function call

Functions are called with the following syntax:

  function_expression ( arguments )

The function_expression must evaluate to a function with as many
parameters as there are arguments. The arguments is a list of comma
separated expressions.

A call proceeds as follows:

- the function_expression and argument expressions are evaluated (in
  an unspecified order)
- the value of the function_expression is checked to make sure that it
  is a function with the appropriate number of parameters
- the local variables for the parameters of the function are created
  and the value of the arguments stored in them
- the function's expression is evaluated
- this expression's result is the result of the function call

Example:

  add1 = fn (x) x + 1; add1(7)
  RESULT: 8

3.4.4 Code blocks
-----------------

A code block is a possibly empty list of variable declarations,
followed by a sequence of expressions:

  [ | variable_list | expression_list ]

If the variable_list is empty, the vertical bars (|) may be omitted.
The variables are separated by commas (,), the expressions by
semi-colons (;).

The scope of the variables is the block in which they are declared,
and their extent is (as with functions) indefinite.

A code block is evaluated as follows:

- the local variables are created and initialised to null.
- the expressions in the list are evaluated in the order given
- the value of the last expression is the value of the code block

A logical consequence of the last statement is that all expression
but the last are only useful for their side effects:

  [ a + 2; b + 2 ]

is the same as

  b + 2

but

  [ c = a + 2; b + 2 ]

isn't.


3.4.5 Control structure
-----------------------

Mudlle has three basic control structures: 'if', 'while' and recursion
(or more strictly, abstraction and application).

The 'if' and 'while' are fairly traditional:

  IF (condition) expression
  IF (condition) expression1 ELSE expression2
  WHILE (condition) expression

'if' without an 'else' evaluates the condition, and if it is true
evaluates the expression. The result of an 'if' without an 'else' is
always undefined.

'if' with an 'else' evaluates the condition and then, if it was true,
'expression1', else 'expression2'. The result of this type of 'if' is
the value of the expression that was evaluated.

'while' evaluates the condition, and if it is true the 'expression'.
This process repeats until the condition evaluates to false. The
result of a 'while' is always undefined.

More complex control structures can be built with function calls and
recursion. There are also a number of primitive functions (for,
repeat) which evaluate a function passed as a parameter several times.

3.5 Storage allocation
----------------------

Several comments above have indicated that values, variables, etc are
allocated but never explicitly freed. This task is the responsibility
of the language, it must recover any memory that is not used any more.

Basically, all values to which there is still a reference (in a
variable, as an element of an array which is itself referenced
somewhere, ...) will be kept. Everything else is freed automatically,
thus freeing you, the programmer, from an annoying burden.

3.6 Errors
----------

All operations and functions check their arguments for consistency
before executing them, and signal an appropriate error if necessary.
The possible errors are:

  bad function -- you tried to call something that wasn't a function,  eg:

    hello = 1; hello()
    RESULT: error: bad function

  stack underflow -- this shouldn't happen

  bad type -- you passed arguments of the wrong type, eg:

    3+"fun"
    RESULT: error: bad type

  divide by zero -- you tried to do a division by zero

  bad index -- you tried to access a non-existent element of an array
    or string, eg:

    a = [ 1 ]; a[2]
    RESULT: error: bad index

  bad value -- a parameter had an invalid value (lots of causes)

  variable is read-only -- you tried to modify one of the predefined
    functions or variables:

    display = 1
    RESULT: error: variable is read-only

  value is read-only -- you tried to modify a read only value,
    probably a constant:

    a = '[1]; a[0] = 99
    RESULT: error: value is read-only


  function probably has an infinite loop -- your code took to
    long to execute. Either it has an infinite loop or you should
    make it simpler.

  function probably has an infinite recursion -- the depth of
    recursive calls exceeded a predefined limit, currently 400.

  wrong number of parameters -- example:

    modulo(3)
    RESULT: error: wrong number of parameters

  value too complex to be printed -- you tried to print an
    excessively complex, or circular, value. Don't.

  insufficient privilege -- see the mudlle-mume manual (you tried
    to do something that is forbidden to you)

4. The language primitives
==========================

To get help on a particular function, you can use the predefined
function 'help'. For example, 'help(help)' prints:

  c -> . Provides help on variable function c

and 'help(modulo)' prints:

  n1 n2 -> n. n = n1 mod n2

As you can see, 'help' also displays a quick explanation of the
function beyond the definition of parameter and result types.

If you don't know the precise name of a function, you can use
apropos(string) to get help on all functions whose name
contains 'string', for example

  apropos("sub")
  RESULT: 
    substring
    Primitive: s1 n1 n2 -> s2. Extract substring of s starting at n1 of length
n2.
    The first character is numbered 0


The primitive functions are organised by the type of value on which
they primarily operate.

4.1 Integers
------------

  integer?: x -> b. Returns TRUE if x is an integer.

  negate: n1 -> n2. n2 = -n1. This is the same as -n1.

  modulo: n1 n2 -> n. Returns (n1 mod n2), with the usual mathematical
  definition of modulo (this is different from % when negative numbers
  are involved).

  min: n1 n2 -> n. Returns n1 if n1<n2, n2 otherwise.

  max: n1 n2 -> n. Returns n1 if n1>n2, n2 otherwise.

  abs: n1 -> n2. Returns |n1|.


4.2 Strings
-----------

  string?: x -> b. Returns TRUE if x is a string.

  make_string: n -> s. Creates a new string of length n. The contents
  are undefined.

  string_length: s -> n. Returns the length of string s.

  string_fill: s n -> . Sets all the characters in s to ascii code n. s
  must not be a constant. The result is undefined.

  string_ref: s n1 -> n2. Return the ascii code (n2) of the n1'th
  character of s. You can also use the indexed notation, s[n1].

  string_set: s n1 n2 -> . Set the n1'th character of s to the character
  whose ascii code is n2. s must not be a constant. The result is
  undefined. You can also use the indexed notation, s[n1] = n2.

  string_cmp: s1 s2 -> n. Compare 2 strings. Returns 0 if s1 = s2, < 0
  if s1 < s2 and > 0 if s1 > s2.

  string_icmp: s1 s2 -> n. Compare 2 strings ignoring the case of the
  characters.  Returns 0 if s1 = s2, < 0 if s1 < s2 and > 0 if s1 > s2.

  substring: s1 n1 n2 -> s2. Extract substring of s starting
  at n1 of length n2. The returned string is modifiable.

  string_append: s1 s2 -> s. Concatenate s1 and s2. The returned string
  is modifiable. You can also use s1+s2.

  split_words: s -> l. Split string s into words in list l. The strings
  in l are modifiable.

  itoa: n -> s. Converts integer into string

  atoi: s -> n. Converts string into integer. Returns s if conversion failed

  format: s x1 x2 ... -> s. Formats string s with parameters x1, ...
    The format string is copied as is to the result, except for format
    specifiers introduced by %:
      %% is replaced by a single %.
      %s is replaced by a string representation of the next argument.
      %c is replaced by the character whose ASCII code is the next
         argument (which must be an integer between 0 and 255).
    

4.3 Pairs
---------

  pair?: x -> b. Returns TRUE if x is a pair.

  cons: x1 x2 -> l. Make a new pair from elements x1 & x2.

  car: l -> x. Returns first element of pair l

  cdr: l -> x. Returns 2nd element of pair l

  set_car: l x ->. Sets the first element of pair l to x. l must not be
  a constant.

  set_cdr: l x ->. Sets the 2nd element of pair l to x. l must not be
  a constant.

  list: x1 ... -> l. Returns a list of the arguments


4.4 Vectors
-----------

  vector?: x -> b. Returns TRUE if x is a vector.

  make_vector: n -> v. Create an empty vector of length n (all elements
  are set to null).

  vector_length: v -> n. Returns the length of the vector.

  vector_fill: v x -> . Sets all elements of vector v to x. This is
  illegal if v is a constant array.

  vector_ref: v n -> x. Return the n'th element of v. You can use v[n]
  instead.

  vector_set: v n x -> x. Set the n'th element of v to x. You can use
  v[n] = x instead.

  vector: x1 ... -> v. Returns a vector of the arguments

4.5 Functions
-------------

  closure?: x -> b. Returns TRUE if x is a function (closure or primitive).

  repeat: n c -> . Execute c n times. c may not be a primitive function.

  for: n1 n2 c -> . If n1 > n2, do nothing. Otherwise, for i = n1 to
  n2 do: c(i). c may not be a primitive function.


4.6 Associative arrays
----------------------

  table?: x -> b. Returns TRUE if x is an associative array

  make_table: -> table. Create a new (empty) associative array

  table_ref: table s -> x. Returns the value of s in symbol table. If
  s isn't in the table, returns null. table[s] returns the same result.

  table_set: table s x -> x. Sets the value of entry s in symbol table
  to x. table[s] = x has the same effect.

  table_list: table -> l. Returns list of symbols in table whose value
  isn't null

  symbol?: x -> b. Returns TRUE if x is a symbol

  symbol_name: sym -> s. Returns the name of a symbol. The returned
  string is read only.

  symbol_get: sym -> x. Returns the value of a symbol.

  symbol_set: sym x -> . Sets the value of symbol sym to x. The result
  is undefined. This modifies the value of the entry in the
  associative array this symbol came from.

4.7 Input/Output
----------------

Within MUME, this is only useful for debugging (when using /mudlle).
The output from these functions is thrown away if it is executed
without any available output (see the 'with_output' function in the
mudlle-mume manual).

  write: x -> . Print a representation of x.

  display: x -> . Display a representation of x.

  examine: x -> . Examine a representation of x.

  newline: -> . Print a newline.

  load: s -> . Loads file s.

display, write and examine display varying amounts of information on
their parameter, display the least, examine the most.

load loads a file whose pathname you specify. Within MUME, it is
generally more convenient to use load_mobile, load_room or load_object
(see below).

4.8 Miscellaneous
-----------------

  eq?: x1 x2 -> b. Returns TRUE if x1 and x2 are the same object. This
  is the same as x1 == x2.

  ref: x1 x2 -> x3. Generic interface to lookup operations,
  same as x1[x2]

  set: x1 x2 x3 -> . Generic interface to set operations, 
  same as x1[x2] = x3

  ctime: -> n. Returns the number of milliseconds of cpu time (use
  difference only)

  time: -> n. Returns the number of seconds since the 1st of January
  1970 GMT

  quit: -> . Exit mudlle.

  help: c -> . Provides help on function c.

  apropos: s -> . Finds all global variables whose name contains
  substring s and prints them (with help)

  debug: n -> . Set debug level (0 = no debug). This is most useful if
  you know how the mudlle internals work ...

  gcstats: -> l. Returns GC statistics. The same comment as for
  debug() applies ...


*f>read 3

MUME Interface
--------------

The MUME interface isn't finished yet, so don't be surprised if some
things you would like to be able to do seem impossible. There is quite
a lot of work involved in integrating mudlle in MUME ...

M U M E   T Y P E S

MUME contains basically three types of entities: rooms, persons
(mobiles or players) and objects. They are represented in mudlle as
follows:

- rooms are represented by their room number. Any function expecting a
room will be passed an integer.

- persons are represented by values of the 'person' type.

- objects are reprensented by values of the 'object' type.

Objects and mobiles (or non-playing characters, NPCs as they are often
called) are divided into classes, ie 'grey wolf', 'torch' of which
there can be several instances. These classes are identified by
numbers, so any mudlle functions which act on all objects/mobiles of a
class (eg to define their behaviour) will expect an integer as
argument. There are no room classes (or depending on your point of
view, there is one class per room ...).

To complicate things a bit, a mudlle variable may contain a value
representing a particular person. If this person is killed, or quits
the game, what should happen to the value ? The solution adopted is to
silently transform this value into a special type called 'gone' with
which you can't do anything. Any attempts to use this value will then
fail.

As rooms/objects/persons have different types, several functions
accept parameters representing any of these, for convenience (eg
find_object_in will find an object in a room, in somebody's inventory
or inside another object).

A summary of the functions defined for the various entities follows:

ROOMS

  room_name: n -> s. Returns name of room n.

  room_exits: n -> l. Returns a list of the exits from room n (as
  numbers).

  room_lit?: n -> b. Returns TRUE if room n is lit.

  room_contents: n -> l. Returns a list of the objects in a room.

  room_people: n -> l. Returns a list of the people in a room.

OBJECTS

  find_objects: x -> l. Returns all objects whose name or number is x.

  find_object_in: p x s -> o. Returns the object in room x/object
    x/x's inventory whose name is 's', that can be seen by p, FALSE if
    there are none.

  find_object_hidden: x s -> o. Returns the object in room x/object
    x/x's inventory whose name is 's', FALSE if there are none.

  find_object_equipment: p s -> n. Returns position of object s in p's
    equipment, null if nothing by that name (beware: FALSE = 0 is a
    valid position).

  obj_contains: o -> l. Returns list of objects contained in o.

  equip_char: p o n -> . Puts object o at position n in p's equipment.

  move_object: o x -> . Moves object o to x (room/mobile/object).

  get_obj_val: o n1 -> n2. Returns the n1'th (0 <= n1 <= 3) value of
    object c.

  get_obj_room: o -> n. Return object's room number, -1 if none

  get_obj_name: o -> s. Returns object's name

  get_obj_carrier: o -> c. Returns character carrying o, FALSE if none

  get_obj_container: o1 -> o2. Returns object o2 which contains o1,
    FALSE if none

  get_obj_type: o -> n. Return object's type.

  get_obj_extra: o -> n. Return object's extra flags.

  get_obj_wear: o -> n. Return object's wear flags.

  get_obj_number: o -> n. Return object's number (identical for all
    instances of a given object class)

  get_obj_value: o -> n. Returns object's cost.

PERSONS

  find_players: x -> l. Returns all mobiles whose name or number is x

  find_player_visible: p1 s -> p2. Returns the player p2 whose name is
    s, and who can be seen by p1, FALSE if there isn't anybody

  find_player_known: p1 s -> p2. Returns the player p2 known by p1
    whose name is s, FALSE if there are none

  char_inventory: p -> l. Returns list of objects in player's inventory

  char_equipment: p -> v. Returns a vector of p's equipment (Unused
    positions are FALSE)

  char_followers: p -> l. Returns list of followers of p

  send_char: p s -> . Sends message s to p

  move_char: p n -> . Moves p to room n

  get_char_name: p -> s. Returns characters name

  get_char_sex: p -> n. Returns characters sex

  get_char_class: p -> n. Returns characters class

  get_char_race: p -> n. Returns characters race

  get_char_level: p -> n. Returns characters level

  get_permanent_str: p -> n. Returns characters strength

  get_permanent_str_add: p -> n. Returns characters additional strength

  get_permanent_intel: p -> n. Returns characters intelligence

  get_permanent_wis: p -> n. Returns characters wisdom

  get_permanent_dex: p -> n. Returns characters dexterity

  get_permanent_con: p -> n. Returns characters constitution

  get_char_str: p -> n. Returns characters strength

  get_char_str_add: p -> n. Returns characters additional strength

  get_char_intel: p -> n. Returns characters intelligence

  get_char_wis: p -> n. Returns characters wisdom

  get_char_dex: p -> n. Returns characters dexterity

  get_char_con: p -> n. Returns characters constitution

  get_char_position: p -> n. Returns characters position

  get_char_act: p -> n. Returns characters act flags

  get_char_affected: p -> n. Returns characters affected flags

  get_char_alignment: p -> n. Returns characters alignment

  get_char_low_quests: p -> n. Returns characters low quest flags

  get_char_high_quests: p -> n. Returns characters high quest flags

  get_char_istari_quests: p -> n. Returns characters istari quest flags

  get_char_room: p -> n. Returns room in which p is (-1 if out of game)

  get_char_mana: p -> n. Returns characters mana

  get_char_max_mana: p -> n. Returns characters max mana

  get_char_hit: p -> n. Returns characters hit points

  get_char_max_hit: p -> n. Returns characters max hit points

  get_char_move: p -> n. Returns characters move points

  get_char_move_extra: p -> n. Returns characters extra move points
    when riding

  get_char_max_move: p -> n. Returns characters max move points

  get_char_gold: p -> n. Returns characters fortune (in pennies)

  get_char_age: p -> n. Returns characters age in game minutes, with
    0 = 17 years old

  get_char_fighting: p1 -> p2. Returns mobile p2 being fought by p1,
    or FALSE if none

  get_char_master: p1 -> p2. Returns mobile p2 who is p1's master, or
    FALSE if none

  get_char_riding: p1 -> p2. Returns mobile p2 which p1 is riding, or
    FALSE if none

  get_char_drunk: p -> n. Returns characters drunkenness, -1 <= n <= 24

  get_char_thirst: p -> n. Returns characters thirst, -1 <= n <= 24

  get_char_hunger: p -> n. Returns characters hunger, -1 <= n <= 24

  set_char_str: p n -> . Sets character p's strength to n, 3 <= n <= 18.

  set_char_str_add: p n -> . Sets character p's additional strength to
    n, 0 <= n <= 100.

  set_char_intel: p n -> . Sets character p's intelligence to n, 3 <= n <= 18.

  set_char_wis: p n -> . Sets character p's wisdom to n, 3 <= n <= 18.

  set_char_dex: p n -> . Sets character p's dexterity to n, 3 <= n <= 18.

  set_char_con: p n -> . Sets character p's constitution to n, 3 <= n <= 18.

  set_char_alignment: p n -> . Sets character p's alignment to n,
    -1000 <= n <= 1000.

  set_char_low_quests: p n -> . Sets characters low quest flags

  set_char_high_quests: p n -> . Sets characters high quest flags

  set_char_istari_quests: p n -> . Sets characters istari quest flags

  set_char_age: p n -> . Sets p's age to 17 years + n minutes (n >= 0)


M U M E   A C T I O N S

All the functions defined above are very low level, and simply modify
or read the state of the world. The next level up is to provide access
to the functionality of the various MUME commands (like hit, drop,
cast, ...). These commands have the advantage that they send all the
right messages to the game players. However, as things are currently
organised it isn't possible to know the result of an action (ie, did
it succeed or fail ? And if it failed, why ?).

These actions are designed to be executed by somebody. To avoid
constantly passing the same parameter when defining the behaviour of a
particular mobile, these functions look at the value of the global
variable 'actor' and use this as the person executing the action. So
for example to have Elrond tell Owl "Hello", you would do:

  say_hello = fn ()
    [ actor = car(find_players("Elrond"));
      tell(find_player_known(actor, "Owl"), "Hello!") ]

(find_player_known() is used, because Elrond should only say hello to
Owl if he can know of him).

Currently, very few actions are defined:

  tell: p s -> . Actor tells p 's'.

  say: s -> . Actor says 's'.

  exec: s -> . Actor executes command 's'. This allows rapid access to
    all MUME commands, but isn't very convenient (or efficient).


C O D E   E X E C U T I O N

Under what conditions is mudlle code executed ? The answer to this
will tell you how to go about customising MUME.

There are three ways mudlle code gets executed automatically in MUME:

- Code can be executed as a reaction to a particular (or to any)
command. This is called a 'reaction procedure'.

- Code can be executed at a particular time (within a MUME day, ie
1440 real seconds). This is called an 'action procedure'.

- Code can be executed when a monster or object is created. This is
called an 'initialisation procedure'.


REACTION PROCEDURES

Reaction procedures can be associated with rooms, monster classes or
object classes.

Whenever a command is executed by person p, the following entities are
checked for reaction procedures:

- the room in which p is.

- the classes of the people in the same room as p.

- the classes of the objects in the same room as p.

- the classes of the objects in p's inventory.

- the classes of the objects that p is wearing.

All reaction procedures found are executed (but reaction procedures
can be restricted to react to only some commands).

How is the reaction procedure called ? Assume that:

- person 'p' executed a command 'n' (all commands have unique numbers)
with arguments 's'

- the reaction procedure is 'reacting'

- this procedure was found on object/room/mobile 'x'

then the following function call is made:

  reacting(p, x, n, s)

If this procedure wants to prevent the command from being normally
executed, it should call the 'override' function:

  override: -> . If called in a reaction procedure, the command
    which caused the procedure to be executed is overridden

If none of the reaction procedures calls override, the command is then
executed as usual.

Reaction procedures are associated with a particular class or room at
load time, see the section on editing for details. They don't change
dynamically during MUME execution (except while debugging ... see the
section on editing).

There can of course be severalof them for a class or room, to avoid
having to put everything in one gigantic function.



ACTION PROCEDURES

Action procedures are mudlle functions which are scheduled for
execution at a particular time in the MUME day. This time is specified
in MUME minutes (ie real seconds, which should be precise enough).

You can register a function to be executed at a particular time with
the register_at function:

  register_at: c s n -> . Registers function c (description s) to be
    executed at time n.

  register_list: -> v. Returns currently registered timed functions.
    This function is intended for debugging purposes.

  mudlle_time: -> n. Returns the current time (in minutes since
    midnight), as known to be mudlle. This is the time used to decide
    when to execution action procedures.

The description is returned with register_list, which should help for
debugging.

If you wish a function to be executed say every n seconds, you can use
the following mudlle code (which will be provided in a standard
library):

  register_every = fn "c s n -> . Execute c (description s) every n
    MUME minutes, starting next minute" (c s n)
    [ | every |
      every = fn () // Execute c, and reschedule it in n minutes
        [ register_at(every, s, mudlle_time() + n);
          c() ];
      register_at(every, s, mudlle_time() + 1) ]

Note: if you register something at 'mudlle_time()', it won't be
executed for a whole MUME day ...

As this example shows, action procedures are executed without any
parameters.


INITIALISATIN PROCEDURES

Initialisation procedures are functions which are associated with a
particular room, object class or mobile class. They are executed:

- when rooms are created when the game boots

- whenever an object of the class is created

- whenever a mobile of the class is created

They can thus be used to customise the behaviour of whatever they
affect, either by initialising or changing some of its characteristics
or by setting up a regular action procedure specific to that object.

As an example, here is an initialisation procedure used to make a
monster hit somebody in the room in which it finds itself (but not
itself!) every 10 seconds:

  nasty_init = fn "Setup mobile to be nasty ..." (who)
    // who is the mobile which has just been created
    [ | nasty |
      nasty = fn "Hit somebody ..." ()
        [ | tohit | actor = who;
          if (not get_char_fighting(actor))
            hit(random_person(get_char_room(actor))) ];
      // Setup a regular action
      register_every(nasty, "Try and hit somebody", 10) ]

This code assumes the existence of:

  random_person: n -> p2. Returns somebody in room n (but don't choose
    the actor), or FALSE if nobody can be found.

  hit: p -> . Actor hits p.

These two functions don't actually exist yet ...

Initialisation functions are called with the object/room/mobile
created as parameter.

There can of course be several initialisation procedures for a class
or room, to avoid having to put everything in one gigantic function.


E D I T I N G

The discussions on reaction and initialisation procedures did not tell
you how to add them to objects, rooms or mobiles. That is because
this is related to how the code is stored and edited:

Every object class, mobile class and room has a file of mudlle code
associated with it. This file belongs to the owner of a mobile (only
he/she and Arata can edit it). It simply contains mudlle code that is
loaded and executed when the game boots. This code should therefore
simply add all the necessary reaction and initialisation procedures to
the object class/room/mobile class with which it is associated, and
maybe initialise a few variables.

To avoid total chaos, it is only possible to add reaction or
initialisation procedures to (say) mobile 232 within the file
associated with mobile 232. This restriction is enforced by the
'react' and 'add_init' functions, which are defined as follows:

  react: c s -> . Registers function c (with description s) to be
    called as a reaction for whatever is being loaded.

  add_init: c s -> . Registers function c (with description s) to be
    called as an initialisation function for whatever is being loaded.

If 'react' or 'add_init' are called at any other time, they simply
cause an error.

You can get a list of the reactions or initialisations associated with
a particular object class/room/mobile class by passing a room number,
object or mobile to:

  init_list: x -> l. Returns a list of init code for
    objects/mobiles/rooms of the same class as x

  react_list: x -> l. Returns a list of reactions on
    object/mobile/room x

To allow convenient debugging, it is possible to ask for the code for
an object/mobile class or room to be reloaded and executed. If this is
done, all the old initialisation and reaction procedures associated
with it are thrown out first:

  load_mobile: n -> . Load code for mobile n

  load_room: n -> . Load code for room n

  load_object: n -> . Load code for object n

Finally, you can edit the code for the mobile with the following
functions (currently the only editor supported is emacs):

  edit_mobile: n -> . Edit mobile n

  edit_room: n -> . Edit room n

  edit_object: n -> . Edit object n
```

