MLoader
=======

AMD compliant script loader and dependency management.



Dissection
=======

Modules are created/registered for consumption by other modules via the define
interface, and they can be either named or anonymous.  The names are the way to
identify a module when it needs to be loaded as a dependency.<br>

How is define called?  Inline or remote scripts tags.  Either way, they will
register possibly a name and dependencies, as well as a callback funtion to
called when dependencies are resolved.<br>

Defined modules go into the pending bucket when they are named, and into the
anonymous bucket when they are anonymous.  At this point, modules are not
considered resolved.  Meaning, their dependency tree has not yet been traversed
and loaded.  This resolution process is initiated with a require or import call.
When the modules are resolved, they are moved from the pending bucket into the
modules buckets, which is where all modules that have been resolved are stored.<br>

To clarify, a resolved module is a module whose dependencies have already been
fully loaded and is ready to be consumed as a dependency by other modules<br>

The deferred bucket is simply a bucket of promises with the resolved module.<br>

Mdoules generally correspond to single files, but a single file could have multiple
module definitions.<br>

The resolution of a module is triggered by calling either require or import.
Both interfaces accomplish the same thing with just different semantics.
Require is designed to be compliant with AMD/CommonJS and import is an alternative
that focuses on the use of promises to deliver resolved modules. Import is also
the interface for loading and resolving modules, and it is used by the require
interface to load modules.<br>
