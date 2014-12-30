(function() {
  "use strict";

  var Promise  = require('spromise'),
      Registry = require('./registry');

  /**
   * The purpose of Loader is to return full instances of Module.  Module instances
   * are stored in the context to avoid loading the same module multiple times.
   * If the module is loaded, then we just return that.  If it has not bee loaded yet,
   * then we:
   *
   * 1. Fetch its source; remote server, local file system... You can specify a fetch
   *      provider to define how source files are retrieved
   * 2. Transform the source that was fetched.  This step enables processing of the
   *      source before it is compiled into an instance of Module.
   * 3. Compile the source that was fetched and transformed into a proper
   *      instance of Module
   */
  function Loader(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) || Registry.getById();
  }

  /**
   * Handles the process of returning the instance of the Module if one exists, otherwise
   * the workflow for creating the instance is kicked off.
   *
   * @param {string} name - The name of the module to load.
   */
  Loader.prototype.load = function(name) {
    var loader  = this,
        manager = this.manager,
        context = this.context;

    if (!name) {
      throw new TypeError("Must provide the name of the module to load");
    }

    // If the context does not have a module with the given name, then we go on to
    // fetch the source and put it through the workflow to create a Module instance.
    if (!context.loaded.hasOwnProperty(name)) {
      var moduleMeta = manager.resolve(name);

      // This is where the workflow for fetching, transforming, and compiling happens.
      // It is designed to easily add more steps to the workflow.
      context.loaded[name] = manager
        .fetch(moduleMeta)
        .then(transform(loader))
        .then(compile(loader));
    }

    return Promise.resolve(context.loaded[name]);
  };

  /**
   * The transform enables transformation providers to process the moduleMeta
   * before it is compiled into an actual Module instance.  This is where steps
   * such as linting and processing coffee files can take place.
   */
  function transform(loader) {
    return function(moduleMeta) {
      loader.manager.providers.transformation.transform(moduleMeta);
      return moduleMeta;
    };
  }

  /**
   * The compile step is to convert the moduleMeta to an instance of Module. The
   * fetch provider is in charge of adding the compile interface in the moduleMeta
   * as that is the place with the most knowledge about how the module was loaded
   * from the server/local file system.
   */
  function compile(loader) {
    return function(moduleMeta) {
      if (!moduleMeta.compile) {
        throw new TypeError("ModuleMeta must provide have a `compile` interface");
      }

      var mod     = moduleMeta.compile(),
          loaded  = moduleMeta.loaded || {},
          modules = loaded.modules;

      // Copy modules over to the loaded bucket if it does not exist. Anything
      // that has already been loaded will get ignored.
      for (var item in modules) {
        if (modules.hasOwnProperty(item) && !loader.context.loaded.hasOwnProperty(item)) {
          loader.context.loaded[item] = modules[item];
        }
      }

      mod.meta = moduleMeta;
      return (loader.context.loaded[mod.name] = mod);
    };
  }

  module.exports = Loader;
})(typeof(window) !== 'undefined' ? window : this);
