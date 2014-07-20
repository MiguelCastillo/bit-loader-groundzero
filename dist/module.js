var Module = (function (root) {
  "use strict";

  //
  // Modules are created/registered for consumption by other modules via the define
  // interface, and they can be either named or anonymous.  The names are the way to
  // identify a module when it needs to be loaded as a dependency.
  //
  // How is define called?  Inline or remote scripts tags.  Either way, they will
  // register possibly a name and dependencies, as well as a callback funtion to
  // called when dependencies are resolved.
  //
  // Defined modules go into the pending bucket when they are named, and into the
  // anonymous bucket when they are anonymous.  At this point, modules are not
  // considered resolved.  Meaning, their dependency tree has not yet been traversed
  // and loaded.  This resolution process is initiated with a require or import call.
  // When the modules are resolved, they are moved from the pending bucket into the
  // modules buckets, which is where all modules that have been resolved are stored.
  //
  // To clarify, a resolved module is a module whose dependencies have already been
  // fully loaded and is ready to be consumed as a dependency by other modules
  //
  // The deferred bucket is simply a bucket of promises with the resolved module.
  //
  // Mdoules generally correspond to single files, but a single file could have multiple
  // module definitions.
  //
  // The resolution of a module is triggered by calling either require or import.
  // Both interfaces accomplish the same thing with just different semantics.
  // Require is designed to be compliant with AMD/CommonJS and import is an alternative
  // that focuses on the use of promises to deliver resolved modules. Import is also
  // the interface for loading and resolving modules, and it is used by the require
  // interface to load modules.
  //

  ///
  /// From requirejs https://github.com/jrburke/requirejs. Thanks dude!
  /// url regex http://regex101.com/r/aH9kH3/7
  ///
  var Module         = {},
    commentRegExp    = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
    cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,

    // These two have data once pending modules have been resolved.
    deferred  = {}, // Promises that contain modules.  These just simply wrap the items in modules
    modules   = {}, // Modules already resolved. Only module from the pending bucket transition to this

    // These two only have data during module defititions.
    pending   = {}, // Modules that are available but not yet used. Only set through define calls.
    anonymous = []; // Anonymous modules not yet used


  /**
   * target, [source]+
   */
  function _extender() {
    var sources = Array.prototype.slice.call(arguments),
      target  = sources.shift(),
      source,
      property;

    for (source in sources) {
      source = sources[source];
      for (property in source) {
        target[property] = source[property];
      }
    }

    return target;
  }


  function _result(input, args, context) {
    if (typeof (input) === "function") {
      return input.apply(context, args || []);
    }
    return input;
  }


  function _noop() {
  }


  /**
   * Setup a logger that can be configured to anything other than default
   */
  Module.logger = root.console || {log: _noop};


  /**
   * AMD compliant define interface
   * Defines a module to be loaded and consumed by other modules.  Two types of modules
   * come through here, named and anonymous.
   */
  Module.define = function () {
    var m = Module.adapters.apply({}, arguments);

    if (!m) {
      throw new Error("Unable to process module format");
    }
    else if (m.name) {
      if (pending.hasOwnProperty(m.name) === false) {
        pending[m.name] = m;
      }
      else {
        throw new Error("Module " + m.name + " is already defined");
      }
    }
    else {
      anonymous.push(m);
    }
  };


  /**
   * AMD/CJS compliant require interface.
   *
   * @name can be an array or string module name
   * @ready is the callback when the module(s) is loaded.
   * If multiple modules are to be loaded, a promise object is also returned. If a single module
   * is required in CJS format, then the resolved module is returned.
   *
   * @return promise object
   */
  Module.require = function(name, ready, options) {
    var deps = [];
    var moduleMeta, i, length;

    // Array AMD style
    if (name instanceof Array) {
      return Module.import(name, options).done(ready || _noop);
    }

    // If the required module is in the pending bucket, then we just resolve it right away
    else if (pending.hasOwnProperty(name) === true) {
      moduleMeta = pending[name]; delete pending[name];

      for (i = 0, length = moduleMeta.deps.length; i < length; i++) {
        // Traverse tree of dependencies breadth first
        deps.push(Module.require(moduleMeta.deps[i]));
      }

      // Move resolved module to modules bucket.
      modules[moduleMeta.name] = _result(moduleMeta.factory, deps, Module.settings.global);
    }
    else if (modules.hasOwnProperty(name) === false) {
      throw new Error("Unable to load " + moduleMeta.name);
    }

    return modules[name];
  };


  /**
   * Import interface to load a module
   */
  Module.import = function (names, options) {
    var deps = [];
    var moduleMeta, i, length, name;

    if (typeof names === "string") {
      names = [names];
    }

    for (i = 0, length = names.length; i < length; i++) {
      name = names[i];

      if (pending.hasOwnProperty(name) === true) {
        moduleMeta = pending[name]; delete pending[name];
        deferred[name] = Module.load(moduleMeta);
      }
      else if (deferred.hasOwnProperty(name) === false) {
        moduleMeta = Module.moduleMeta(name, options);
        deferred[name] = Module.fetch(moduleMeta).then(Module.load);
      }

      deps.push(deferred[name]);
    }

    return Module.Promise.when.apply((void 0), deps);
  };


  /**
   * Parse module
   */
  Module.load = function (moduleMeta) {
    if (!moduleMeta) {
      return;
    }

    moduleMeta.cjs = [];

    if (typeof moduleMeta.factory === 'function') {
      // Just save the type to avoid further type checks.
      moduleMeta.isFunction = true;

      // Extract inline module imports in CJS format. E.g. var x = require("x");
      //
      // This would also be the spot to transform the function if we needed to
      // support more advanced injection features.
      //

      moduleMeta.factory.toString()
        .replace(commentRegExp, "")
        .replace(cjsRequireRegExp, function (match, dep) {
          moduleMeta.cjs.push(dep);
        });
    }

    return Module.resolve(moduleMeta).then(Module.injection);
  };


  /**
   * Resolve a module dependencies and figure out what the module actually is.
   */
  Module.resolve = function (moduleMeta) {
    var deps = moduleMeta.deps.length ? Module.import(moduleMeta.deps) : undefined,
      cjs = moduleMeta.cjs.length ? Module.import(moduleMeta.cjs) : undefined;

    return Module.Promise.when(deps, cjs)
      .then(function (dependencies) {
        moduleMeta.resolved = moduleMeta.deps.length === 1 ? [dependencies] : dependencies;
        return moduleMeta;
      }, function (error) {
        Module.logger.log(error);
        return error;
      });
  };


  Module.injection = function (moduleMeta, dependencies) {
    var execModule = (new Function("Module", "module", "factory", "dependencies", Module.injection.__module));
    return (modules[moduleMeta.name] = execModule(Module, moduleMeta, moduleMeta.factory, dependencies));
  };


  Module.injection.__module = "" +
    "var exports = module.exports;\n" +
    "var result; \n" +
    "if(module.isFunction){return factory.apply(this, dependencies || module.resolved);}\n" +
    "else {return factory;}\n";


  /**
   * Takes in a module name and options to create a proper moduleMeta object needed to load the module
   *
   // moduleMeta is an object used for collecting information about a module file being loaded. This
   // is where we are storing information such as anonymously modules, names modules, exports and so on.
   // This information is used to figure out if we have and AMD, CJS, or just a plain ole module pattern.
   */
  Module.moduleMeta = function (name, options) {
    options = options || Module.settings;
    options.baseUrl = options.baseUrl || Module.settings.baseUrl;
    var fileName = Module.settings.paths[name] || name;

    return {
      name: name,
      file: new File(fileName, options.baseUrl),
      settings: options
    };
  };


  /**
   * Adapter interfaces to define modules
   */
  Module.adapters = function (name, deps, factory) {
    var _signature = ["", typeof name, typeof deps, typeof factory].join("/"),
      _adapter   = Module.adapters[_signature];
    if (_adapter) {
      return _adapter.apply(this, arguments);
    }
  };

  Module.adapters["/string/function/undefined"] = function (name, factory) {
    return {
      name: name,
      deps: [],
      factory: factory
    };
  };

  Module.adapters["/string/object/undefined"] = function (name, data) {
    return {
      name: name,
      deps: [],
      factory: data
    };
  };

  Module.adapters["/string/object/function"] = function (name, deps, factory) {
    return {
      name: name,
      deps: deps,
      factory: factory
    };
  };

  Module.adapters["/object/function/undefined"] = function (deps, factory) {
    return {
      deps: deps,
      factory: factory
    };
  };

  Module.adapters["/object/undefined/undefined"] = function (data) {
    return {
      deps: [],
      factory: data
    };
  };

  Module.adapters["/function/undefined/undefined"] = function (factory) {
    return {
      deps: [],
      factory: factory
    };
  };

  Module.adapters["/string/undefined/undefined"] = function (factory) {
    return {
      deps: [],
      factory: factory
    };
  };

  Module.adapters["/number/undefined/undefined"] = function (factory) {
    return {
      deps: [],
      factory: factory
    };
  };

  Module.adapters["/undefined/undefined/undefined"] = function (factory) {
    return {
      deps: [],
      factory: factory
    };
  };


  Module.fetch = function (moduleMeta) {
    var pending   = Module.Promise.defer();
    var moduleUrl = moduleMeta.file.toUrl();
    var head      = document.getElementsByTagName("head")[0] || document.documentElement;
    var script    = document.createElement("script");

    script.setAttribute("async",       "true");
    script.setAttribute("charset",     "utf-8");
    script.setAttribute("type",        "text/javascript");
    script.setAttribute("src",         moduleUrl);
    script.setAttribute("module-name", moduleMeta.name);

    //
    // Code from:
    // http://stackoverflow.com/questions/4845762/onload-handler-for-script-tag-in-internet-explorer
    // http://stevesouders.com/efws/script-onload.php
    //

    // Handle Script loading
    var done = false;

    // Attach handlers for all browsers
    script.onload = script.onreadystatechange = function() {
      if (!done && (!this.readyState ||
            this.readyState === "loaded" ||
            this.readyState === "complete")) {
        done = true;

        // Get the module id that just finished and load it up!
        var moduleName = script.getAttribute("module-name");
        var mod        = pending[moduleName];

        // Check if the module was loaded as a named module or an anonymous module.
        // If it was loaded as an anonymous module, then we need to manually add it
        // the list of named modules
        if (!mod && anonymous.length) {
          mod      = anonymous.shift();
          mod.name = moduleName;

          // Make module available as pending resolution so that it can be loaded
          // whenever it is requested as dependency.
          pending[mod.name] = mod;
        }

        // Cleanup stuff used by the script.
        anonymous = [];

        // Resolve with emtpty string so that moduleMeta can be processed
        pending.resolve(mod);

        // Handle memory leak in IE
        script.onload = script.onreadystatechange = null;
        if (head && script.parentNode) {
          head.removeChild(script);
        }
      }
    };

    head.appendChild(script);
    return pending.promise;
  };


  Module.configure = function (settings) {
    _extender(Module.settings, settings);

    if (settings.makeGlobal) {
      Module.makeGlobal();
    }

    return Module;
  };


  Module.settings = {
    global: this,
    baseUrl: "",
    cache: true,
    deps: [],
    paths: {}
  };


  /**
   */
  function File (file, base) {
    var fileUri, baseUri, fileName, mergedPath;

    fileUri = File.parseUri(file);

    if (fileUri.protocol || !base) {
      fileName = File.parseFileName(fileUri.path);
    }
    else {
      baseUri    = File.parseUri(base);
      mergedPath = File.mergePaths(fileUri.path, baseUri ? baseUri.path : "/");
      fileName   = File.parseFileName(mergedPath);
    }

    this._file    = fileUri;
    this.protocol = fileUri.protocol ? fileUri.protocol + fileUri.protocol.mark : undefined;
    this.name     = fileName.name;
    this.path     = fileName.path;
  }


  /**
   */
  File.prototype.toUrl = function (extension) {
    var file = this;
    return (file.protocol || "") + (file.path || "") + file.name + (extension || ".js");
  };


  /**
   * Parses out uri
   */
  File.parseUri = function(uriString) {
    if (!uriString) {
      throw new Error("Must provide a string to parse");
    }

    if (File.isHttpProtocol(uriString)) {
      return File.parseHttpProtocol(uriString);
    }
    else {
      return File.parseFileProtocol(uriString);
    }
  };


  /**
   * Parses out the string into file components
   * return {object} file object
   */
  File.parseFileProtocol = function (uriString) {
    var uriParts = /^(?:(file:)(\/\/\/?))?(([A-Za-z-]+:)?[/\\d\w\.\s-]+)/gmi.exec(uriString);
    uriParts.shift();

    // Make sure we sanitize the slashes
    if (uriParts[2]) {
      uriParts[2] = File.normalizeSlashes(uriParts[2]);
    }

    return {
      protocol: uriParts[0],
      protocolmark: uriParts[1],
      path: uriParts[2],
      drive: uriParts[3],
      href: uriString,
      uriParts: uriParts
    };
  };


  /**
   * Parses out a string into an http url
   * @return {object} url object
   */
  File.parseHttpProtocol = function (uriString) {
    var uriParts = /^((https?:)(\/\/)([\d\w\.-]+)(?::(\d+))?)?([\/\\\w\.()-]*)?(?:([?][^#]*)?(#.*)?)*/gmi.exec(uriString);
    uriParts.shift();

    // Make sure we sanitize the slashes
    if (uriParts[5]) {
      uriParts[5] = File.normalizeSlashes(uriParts[5]);
    }

    return {
      origin: uriParts[0],
      protocol: uriParts[1],
      protocolmark: uriParts[2],
      hostname: uriParts[3],
      port: uriParts[4],
      path: uriParts[5],
      search: uriParts[6],
      hash: uriParts[7],
      href: uriString,
      uriParts: uriParts
    };
  };


  /**
   * Tests if a uri has a protocol
   * @return {boolean} if the uri has a protocol
   */
  File.hasProtocol = function (path) {
    return /^(?:(https?|file)(:\/\/\/?))/g.test(path) === false;
  };


  /**
   * Test is the input constains the file protocol delimiter.
   * @return {boolean} True is it is a file protocol, othterwise false
   */
  File.isFileProtocol = function (protocolString) {
    return /^file:/gmi.test(protocolString);
  };


  /**
   * Test is the input constains the http/https protocol delimiter.
   * @return {boolean} True is it is an http protocol, othterwise false
   */
  File.isHttpProtocol = function (protocolString) {
    return /^https?:/gmi.test(protocolString);
  };


  /**
   * Build and file object with the important pieces
   */
  File.parseFileName = function (fileString) {
    var fileName;
    var pathName = fileString.replace(/([^/]+)$/gmi, function(match) {
      fileName = match;
      return "";
    });

    return {
      name: fileName,
      path: pathName
    };
  };


  /**
   * Removes all forward and back slashes to forward slashes as well as all duplicates slashes
   * @return {string} path with only one forward slash a path delimters
   */
  File.normalizeSlashes = function (path) {
    return path.replace(/[\\/]+/g, "/");
  };


  /**
   * Lets get rid of the trailing slash
   * @return {string} without trailing slash(es)
   */
  File.stripTrailingSlashes = function (path) {
    return path.replace(/[\\/]+$/, "");
  };


  /**
   * Merges a path with a base.  This is used for handling relative paths.
   * @return {string} Merge path
   */
  File.mergePaths = function (path, base) {
    var pathParts = path.split("/"),
        baseParts = (base || "").split("/"),
        pathCount = pathParts.length,
        skipCount = 0;

    while (pathCount-- > 0) {
      if (pathParts[0] === "..") {
        pathParts.shift();
        skipCount++;
      }
      else if (pathParts[0] === ".") {
        pathParts.shift();
      }
      else {
        break;
      }
    }

    if (skipCount) {
      skipCount = baseParts.length > skipCount ? skipCount : (baseParts.length - 1);
      baseParts.splice(baseParts.length - skipCount, skipCount);
    }

    return File.normalizeSlashes(baseParts.join("/") + "/" + pathParts.join("/"));
  };


  Module.define.amd = {};
  Module.require.config  = Module.require.configure = Module.configure;

  // Set promise provider
  Module.setPromiseProvider = function(promise) {
    deferred       = {};
    pending        = {};
    modules        = {};
    Module.Promise = promise;
  };

  // Provide a way to make define and require interfaces available in the public space
  Module.makeGlobal = function() {
    root.require = Module.require;
    root.define  = Module.define;
  };

  Module.File = File;
  return Module;
})(this);


/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 *
 * https://github.com/MiguelCastillo/spromise
 */


/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */


Module.define( 'src/async',[],function() {
  var _self = this;

  var nextTick;
  if ( _self.setImmediate ) {
    nextTick = _self.setImmediate;
  }
  else if ( _self.process && typeof _self.process.nextTick === "function" ) {
    nextTick = _self.process.nextTick;
  }
  else {
    nextTick = function(cb) {
      _self.setTimeout(cb, 0);
    };
  }

  return nextTick;
});

/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */


Module.define('src/promise',[
  "src/async"
], function (Async) {


  var states = {
    "pending": 0,
    "always": 1,
    "resolved": 2,
    "rejected": 3,
    "notify": 4
  };

  var strStates = [
    "pending",
    "",
    "resolved",
    "rejected",
    ""
  ];


  /**
   * Small Promise
   */
  function Promise(resolver, options) {
    if (this instanceof Promise === false) {
      return new Promise(resolver, options);
    }

    var target       = this;
    var stateManager = new StateManager(options || {});

    /**
     * callback registration (then, done, fail, always) must be synchrounous so
     * that the callbacks can be registered in the order they come in.
     */

    function then(onResolved, onRejected) {
      return stateManager.then(onResolved, onRejected);
    }

    // Setup a way to verify an spromise object
    then.constructor  = Promise;
    then.stateManager = stateManager;

    function done(cb) {
      stateManager.enqueue(states.resolved, cb);
      return target.promise;
    }

    function fail(cb) {
      stateManager.enqueue(states.rejected, cb);
      return target.promise;
    }

    function always(cb) {
      stateManager.enqueue(states.always, cb);
      return target.promise;
    }

    function notify(cb) {
      stateManager.enqueue(states.notify, cb);
      return target.promise;
    }

    function state() {
      return strStates[stateManager.state];
    }

    function resolve() {
      stateManager.transition(states.resolved, this, arguments);
      return target;
    }

    function reject() {
      stateManager.transition(states.rejected, this, arguments);
      return target;
    }

    target.always = always;
    target.done = done;
    target.fail = fail;
    target.notify = notify;
    target.resolve = resolve;
    target.reject = reject;
    target.then = then;
    target.state = state;
    target.promise = {
      always: always,
      done: done,
      fail: fail,
      notify: notify,
      then: then,
      state: state
    };

    // Interface to allow to post pone calling the resolver as long as its not needed
    if (typeof (resolver) === "function") {
      resolver.call(target, target.resolve, target.reject);
    }
  }

  /**
   * Interface to play nice with libraries like when and q.
   */
  Promise.defer = function () {
    return new Promise();
  };

  /**
   * Interface to create a promise and link it to a thenable object.  The assumption is that
   * the object passed in is a thenable.  If it isn't, there is no check so an exption might
   * be going your way.
   */
  Promise.thenable = function (thenable) {
    return new Promise(thenable.then);
  };

  /**
   * Create a promise that's already rejected
   */
  Promise.rejected = function () {
    return new Promise(null, {
      context: this,
      value: arguments,
      state: states.rejected
    });
  };

  /**
   * Create a promise that's already resolved
   */
  Promise.resolved = function () {
    return new Promise(null, {
      context: this,
      value: arguments,
      state: states.resolved
    });
  };


  /**
   * StateManager is the state manager for a promise
   */
  function StateManager(options) {
    // Initial state is pending
    this.state = states.pending;

    // If a state is passed in, then we go ahead and initialize the state manager with it
    if (options.state) {
      this.transition(options.state, options.context, options.value);
    }
  }

  // Queue will figure out if the promise is pending/resolved/rejected and do the appropriate
  // action with the callback based on that.
  StateManager.prototype.enqueue = function (state, cb, sync) {
    var _self = this,
      _state  = _self.state;

    if (!_state) {
      (this.queue || (this.queue = [])).push({
        state: state,
        cb: cb
      });
    }

    // If resolved, then lets try to execute the queue
    else if (_state === state || states.always === state) {
      if (sync) {
        cb.apply(_self.context, _self.value);
      }
      else {
        Async(function queuecb() {
          cb.apply(_self.context, _self.value);
        });
      }
    }

    // Do proper notify events
    else if (states.notify === state) {
      if (sync) {
        cb.call(_self.context, _self.state, _self.value);
      }
      else {
        Async(function queuecb() {
          cb.call(_self.context, _self.state, _self.value);
        });
      }
    }
  };

  // Sets the state of the promise and call the callbacks as appropriate
  StateManager.prototype.transition = function (state, context, value, sync) {
    if (this.state) {
      return;
    }

    this.state   = state;
    this.context = context;
    this.value   = value;

    // Process queue if anything is waiting to be notified
    if (this.queue) {
      var queue = this.queue,
        length = queue.length,
        i = 0,
        item;

      this.queue = null;

      for (; i < length; i++) {
        item = queue[i];
        this.enqueue(item.state, item.cb, sync);
      }
    }
  };

  // Links together the resolution of promise1 to promise2
  StateManager.prototype.then = function (onResolved, onRejected) {
    var resolution;
    onResolved = typeof (onResolved) === "function" ? onResolved : null;
    onRejected = typeof (onRejected) === "function" ? onRejected : null;

    if ((!onResolved && this.state === states.resolved) ||
        (!onRejected && this.state === states.rejected)) {
      return new Promise(null, this);
    }

    resolution = new Resolution(new Promise());
    this.enqueue(states.notify, resolution.notify(onResolved, onRejected));
    return resolution.promise;
  };


  /**
   * Thenable resolution
   */
  function Resolution(promise) {
    this.promise = promise;
  }

  // Notify when a promise has change state.
  Resolution.prototype.notify = function (onResolved, onRejected) {
    var _self = this;
    return function notify(state, value) {
      var handler = (onResolved || onRejected) && (state === states.resolved ? (onResolved || onRejected) : (onRejected || onResolved));
      try {
        _self.context = this;
        _self.finalize(state, handler ? [handler.apply(this, value)] : value);
      }
      catch (ex) {
        _self.promise.reject.call(_self.context, ex);
      }
    };
  };

  // Promise.chain DRYs onresolved and onrejected operations.  Handler is onResolved or onRejected
  // This chain is partcularly used when dealing with external promises where we just just have to
  // resolve the result
  Resolution.prototype.chain = function (state) {
    var _self = this;
    return function resolve() {
      try {
        // Handler can only be called once!
        if ( !_self.resolved ) {
          _self.resolved = true;
          _self.context  = this;
          _self.finalize(state, arguments);
        }
      }
      catch (ex) {
        _self.promise.reject.call(_self.context, ex);
      }
    };
  };

  // Routine to resolve a thenable.  Data is in the form of an arguments object (array)
  Resolution.prototype.finalize = function (state, data) {
    var input = data[0],
      then    = (input && input.then),
      promise = this.promise,
      context = this.context,
      resolution, thenableType;

    // 2.3.1
    if (input === this.promise) {
      throw new TypeError("Resolution input must not be the promise being resolved");
    }

    // 2.3.2
    // Shortcut if the incoming promise is an instance of spromise
    if (then && then.constructor === Promise) {
      then.stateManager.enqueue(states.notify, this.notify(), true);
      return;
    }

    // 2.3.3
    // If thenable is function or object, then try to resolve using that.
    thenableType = then && (typeof (then) === "function" && typeof (input));
    if (thenableType === "function" || thenableType === "object") {
      try {
        resolution = new Resolution(promise);
        then.call(input, resolution.chain(states.resolved), resolution.chain(states.rejected));
      }
      catch (ex) {
        if (!resolution.resolved) {
          promise.reject.call(context, ex);
        }
      }
    }

    // 2.3.4
    // Just resolve the promise
    else {
      promise.then.stateManager.transition(state, context, data, true);
    }
  };

  // Expose enums for the states
  Promise.states = states;
  return Promise;
});

/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */


Module.define('src/when',[
  "src/promise",
  "src/async"
], function(Promise, Async) {


  function _result(input, args, context) {
    if (typeof(input) === "function") {
      return input.apply(context, args||[]);
    }
    return input;
  }

  /**
  * Interface to allow multiple promises to be synchronized
  */
  function When() {
    // The input is the queue of items that need to be resolved.
    var values      = arguments,
        resolutions = [],
        promise     = Promise.defer(),
        context     = this,
        remaining   = values.length;

    if (!values.length) {
      return promise.resolve();
    }

    // Check everytime a new resolved promise occurs if we are done processing all
    // the dependent promises.  If they are all done, then resolve the when promise
    function checkPending() {
      remaining--;
      if (!remaining) {
        promise.resolve.apply(context, resolutions);
      }
    }

    // Wrap the resolution to keep track of the proper index in the closure
    function resolve(index) {
      return function() {
        resolutions[index] = arguments.length === 1 ? arguments[0] : arguments;
        checkPending();
      };
    }

    function processQueue() {
      var i, item, length;
      for (i = 0, length = remaining; i < length; i++) {
        item = values[i];
        if (item && typeof item.then === "function") {
          item.then(resolve(i), promise.reject);
        }
        else {
          resolutions[i] = _result(item);
          checkPending();
        }
      }
    }

    // Process the promises and callbacks
    Async(processQueue);
    return promise;
  }

  return When;
});


/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */


Module.define('src/spromise',[
  "src/promise",
  "src/async",
  "src/when"
], function(promise, async, when) {
  promise.when = when;
  promise.async  = async;
  return promise;
});


// Set default promise provider...
Module.setPromiseProvider(Module.require("src/spromise"));
