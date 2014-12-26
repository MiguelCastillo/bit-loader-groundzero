(function() {
  "use strict";

  var Promise  = require('spromise'),
      Registry = require('./registry');

  function Loader(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) || Registry.getById();
  }

  Loader.prototype.load = function(name) {
    var loader  = this,
        manager = this.manager,
        context = this.context;

    if (!name) {
      throw new TypeError("Must provide the name of the module to load");
    }

    if (!context.loaded.hasOwnProperty(name)) {
      context.loaded[name] = manager
        .fetch(manager.resolve(name))
        .then(function(result) {
          // Copy modules over to the loaded bucket if it does not exist. Anything
          // that has already been loaded will get ignored.
          var modules = result.modules;
          for (var item in modules) {
            if (modules.hasOwnProperty(item) && !context.loaded.hasOwnProperty(item)) {
              context.loaded[name] = result.modules[item];
            }
          }

          return (context.loaded[name] = result.modules[name]);
        }, function(err) {return err;});
    }

    return Promise
      .resolve(context.loaded[name])
      .then(function(mod) {
        // If the module has a property `code` that means the module has already
        // been fully resolved.
        if (mod.hasOwnProperty("code")) {
          return mod;
        }

        return loader.finalize(mod);
      }, function(err) {return err;});
  };

  Loader.prototype.finalize = function(mod) {
    var manager = this.manager;

    if (!mod.deps.length) {
      mod.code = mod.factory();
      manager.providers.transformation.transform(mod);
      return mod;
    }

    return manager
      .import(mod.deps)
      .then(function() {
        mod.code = mod.factory.apply(mod, arguments);
        manager.providers.transformation.transform(mod);
        return mod;
      }, function(err) {return err;});
  };

  module.exports = Loader;
})();
