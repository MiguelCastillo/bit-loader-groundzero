var Module = (function (root) {
  "use strict";


  ///
  /// From requirejs https://github.com/jrburke/requirejs. Thanks dude!
  /// url regex http://regex101.com/r/aH9kH3/7
  ///
  var commentRegExp    = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
      cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,

    // Module buckets
    deferred  = {}, // Promises that contain modules.  These just simply wrap the items in modules
    modules   = {}, // Modules already resolved
    metas     = {}, // Bucket with all modules meta data
    anonymous = []; // Anonymous modules not yet used.  Only used when a modules is being defined


  /**
   * target, [source]+
   */
  function _extend(target) {
    var sources = Array.prototype.slice.call(arguments, 1);
    var source, property;

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


  function _noop() {}


  var Module = {};


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
      // Do no allow module to override other modules...
      if (modules.hasOwnProperty(m.name) || metas.hasOwnProperty(m.name)) {
        throw new Error("Module " + m.name + " is already defined");
      }
      else {
        metas[m.name] = m;
      }
    }
    else {
      anonymous.push(m);
    }
  };


  /**
   * AMD/CJS compliant require interface.
   * If multiple modules are to be loaded, a promise object is also returned. If a single module
   * is required in CJS format, then the resolved module is returned.
   *
   * @param {string} name Array of string module name or a single string module name
   * @param {function} ready is the callback called when the module(s) is loaded.
   *
   * @return {Promise | Module}
   */
  Module.require = function (name, ready, options) {
    var deps = [], moduleMeta, i, length;

    // Array AMD style
    if (name instanceof Array) {
      return Module.import(name, options).done(ready || _noop);
    }

    else if (modules.hasOwnProperty(name)) {
      return modules[name];
    }

    // If the required module isn't resolved, then resolving it is what we need to do next.
    else if (metas.hasOwnProperty(name) === true) {
      moduleMeta = metas[name];

      for (i = 0, length = moduleMeta.deps.length; i < length; i++) {
        // Traverse tree of dependencies breadth first
        deps.push(modules[moduleMeta.deps[i]] || Module.require(moduleMeta.deps[i]));
      }

      // Move resolved module to modules bucket.
      return (modules[moduleMeta.name] = _result(moduleMeta.factory, deps, Module.settings.global));
    }
    else {
      throw new Error("Unable to load " + moduleMeta.name);
    }
  };


  /**
   * Import interface to load a module.  This interface will return a promise that when
   * resolved will have the module itself.
   *
   * @param {string | array} names is the name or array of names of the module(s) that need to be
   *   imported
   * @param {!object} options settings used for the module to configure the modules being loaded
   * @return {Promise} promise that will contain the module once it's resolved.
   */
  Module.import = function (names, options) {
    var deps = [], moduleMeta, i, length, name;

    // If names is a string, then we will just make an array with names as the only item
    // and continue processing. This is to simplify the exposed interface so that importing
    // a single module does not force everyone to pass in the array.
    if (typeof names === "string") {
      names = [names];
    }

    // This logic figures out if the module's dependencies need to be resolved and if
    // and if they also need to be downloaded.
    for (i = 0, length = names.length; i < length; i++) {
      name = names[i];

      if (!deferred.hasOwnProperty(name)) {
        if (metas.hasOwnProperty(name)) {
          deferred[name] = Module.load(name);
        }
        else {
          // If shim, then resolve its dependencies first, then load the shimmed module...  Shimmed
          // modules don't actually have a way to define dependencies, so they need to be loaded for
          // them.

          moduleMeta = Module.moduleMeta(name, options);
          deferred[name] = Module.fetch(moduleMeta).then(Module.load);
        }
      }

      deps.push(deferred[name]);
    }

    return Module.Promise.when.apply((void 0), deps);
  };


  /**
   * Processes the module content if it's a function in order to do a bit of cleanup before
   * the module dependencies are injected.  Here is where cjs defintions in the code are
   * processed so that they can also be loaded as dependencies.
   */
  Module.load = function (name) {
    var moduleMeta = metas[name];

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

    return Module.resolve(name)
      .then(Module.injection)
      .done(function(result) {
        modules[name] = result;
      });
  };


  /**
   * Resolve a module's dependencies, including cjs imports
   */
  Module.resolve = function (name) {
    var moduleMeta = metas[name],
      deps = moduleMeta.deps.length ? Module.import(moduleMeta.deps) : undefined,
      cjs = moduleMeta.cjs.length ? Module.import(moduleMeta.cjs) : undefined;

    return Module.Promise.when(deps, cjs)
      .then(function (dependencies) {
        moduleMeta.resolved = moduleMeta.deps.length === 1 ? [dependencies] : dependencies;
        return name;
      }, function (error) {
        Module.logger.log(error);
        return error;
      });
  };


  /**
   * Injects the list of dependencies to a specific module.  The dependencies themeselves are fully resolved modules
   * and not a module names. This is very valuable during unit tests where a particular module need to be created with
   * specific mocked out code.
   *
   * @param {string} name is the name of the module that needs to be processed
   * @param {Array} dependencies is an array of fully resolved modules
   *
   * @return {Module} fully loaded module with all its dependencies.
   */
  Module.injection = function (name, dependencies) {
    var moduleMeta = metas[name];
    var execModule = (new Function("Module", "module", "factory", "dependencies", Module.injection.__module));
    return execModule(Module, moduleMeta, moduleMeta.factory, dependencies);
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
    options = _extend({}, options, Module.settings);
    var i, length, pkg;
    var fileName = options.paths[name] || name;
    var packages = options.packages;

    // Go through the packages and figure if the module is actually configured as such.
    for (i = 0, length = packages.length; i < length; i++) {
      pkg = packages[i] || '';
      if (pkg.name === name || pkg === name) {
        fileName = (pkg.location || pkg) + "/" + (pkg.main || "main.js");
        break;
      }
    }

    var shimName;

    // Once the module has been fully resolved, we finally added to the list of available modules
    if (options.shim.hasOwnProperty(name)) {
      shimName = options.shim[name].exports || name;
      if (root.hasOwnProperty(name)) {
        modules[name] = root[name];
      }
    }

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
    var adapter = Module.adapters[["", typeof name, typeof deps, typeof factory].join("/")];
    if (adapter) {
      return adapter.apply(this, arguments);
    }
  };

  Module.adapters.create = function (name, deps, factory) {
    return {
      cjs: [],
      name: name,
      deps: deps,
      factory: factory
    };
  };

  Module.adapters["/string/object/function"]        = function (name, deps, factory) { return Module.adapters.create(name, deps, factory); };
  Module.adapters["/string/function/undefined"]     = function (name, factory)       { return Module.adapters.create(name, [], factory); };
  Module.adapters["/object/function/undefined"]     = function (deps, factory)       { return Module.adapters.create(undefined, deps, factory); };
  Module.adapters["/object/undefined/undefined"]    = function (data)                { return Module.adapters.create(undefined, [], data); };
  Module.adapters["/string/object/undefined"]       = Module.adapters["/string/function/undefined"];
  Module.adapters["/function/undefined/undefined"]  = Module.adapters["/object/undefined/undefined"];
  Module.adapters["/string/undefined/undefined"]    = Module.adapters["/object/undefined/undefined"];
  Module.adapters["/number/undefined/undefined"]    = Module.adapters["/object/undefined/undefined"];
  Module.adapters["/undefined/undefined/undefined"] = Module.adapters["/object/undefined/undefined"];


  /**
   * Fetches a particular module from a stream.  Generally a remote javascript file sitting out in a server
   */
  Module.fetch = function (moduleMeta) {
    var deferred  = Module.Promise.defer();
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
        var mod        = metas[moduleName];

        // Check if the module was loaded as a named module or an anonymous module.
        // If it was loaded as an anonymous module, then we need to manually add it
        // the list of named modules
        if (!mod && anonymous.length) {
          mod      = anonymous.shift();
          mod.name = moduleName;

          // Make module available as pending resolution so that it can be loaded
          // whenever it is requested as dependency.
          metas[mod.name] = mod;
        }

        // Cleanup stuff used by the script.
        anonymous = [];

        // Resolve with emtpty string so that moduleMeta can be processed
        deferred.resolve(moduleName);

        // Handle memory leak in IE
        script.onload = script.onreadystatechange = null;
        if (head && script.parentNode) {
          head.removeChild(script);
        }
      }
    };

    head.appendChild(script);
    return deferred.promise;
  };


  Module.configure = function (settings) {
    _extend(Module.settings, settings);

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
    paths: {},
    shim: {},
    packages: []
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



  Module.File = File;
  Module.define.amd = {};
  Module.require.configure = Module.configure;
  Module.logger = root.console || {log: _noop};

  // Set promise provider
  Module.setPromiseProvider = function(promise) {
    deferred       = {};
    metas          = {};
    modules        = {};
    Module.Promise = promise;
  };


  // Provide a way to make define and require interfaces available in the public space
  Module.makeGlobal = function() {
    root.require = Module.require;
    root.define  = Module.define;
  };

  return Module;
})(this);


/**
 * Load Promise definition
 */

(function(define) {
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


define( 'src/async',[],function() {
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


define('src/promise',[
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
    target.catch = fail;
    target.fail = fail;
    target.notify = notify;
    target.resolve = resolve;
    target.reject = reject;
    target.then = then;
    target.state = state;
    target.promise = {
      always: always,
      done: done,
      catch: fail,
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
  Promise.reject = Promise.rejected = function () {
    return new Promise(null, {
      context: this,
      value: arguments,
      state: states.rejected
    });
  };

  /**
   * Create a promise that's already resolved
   */
  Promise.resolve = Promise.resolved = function () {
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


define('src/all',[
  "src/promise",
  "src/async"
], function(Promise, Async) {


  function _result(input, args, context) {
    if (typeof(input) === "function") {
      return input.apply(context, args||[]);
    }
    return input;
  }

  function All(values) {
    values = values || [];

    // The input is the queue of items that need to be resolved.
    var resolutions = [],
        promise     = Promise.defer(),
        context     = this,
        remaining   = values.length;

    if (!values.length) {
      return promise.resolve(values);
    }

    // Check everytime a new resolved promise occurs if we are done processing all
    // the dependent promises.  If they are all done, then resolve the when promise
    function checkPending() {
      remaining--;
      if (!remaining) {
        promise.resolve.call(context, resolutions);
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

  return All;
});


/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */


define('src/when',[
  "src/promise",
  "src/all"
], function(Promise, All) {


  /**
  * Interface to allow multiple promises to be synchronized
  */
  function When() {
    var context = this, args = arguments;
    return Promise(function(resolve, reject) {
      All.call(context, args).then(function(results) {
        resolve.apply(context, results);
      },
      function(reason) {
        reject.call(context, reason);
      });
    });
  }

  return When;
});


/**
 * spromise Copyright (c) 2014 Miguel Castillo.
 * Licensed under MIT
 */


define('src/spromise',[
  "src/promise",
  "src/async",
  "src/when",
  "src/all"
], function(promise, async, when, all) {
  promise.async  = async;
  promise.when = when;
  promise.all = all;
  return promise;
});


})(Module.define);


// Set default promise provider...
Module.setPromiseProvider(Module.require("src/spromise"));

