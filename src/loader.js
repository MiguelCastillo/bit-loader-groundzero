(function(root) {
  "use strict";

  var Promise      = require('spromise'),
      File         = require('./file'),
      scriptLoader = require('./fetchscript');

  function Loader(manager) {
    this.manager = manager;
    this.fetch   = scriptLoader;
  }

  Loader.prototype.load = function(name) {
    var manager = this.manager;

    if (!name) {
      throw new TypeError("Must provide the name of the module to load");
    }

    if (!manager.context.loaded[name]) {
      manager.context.loaded[name] = this.fetch(this.getModuleMeta(name))
        .then(function(result) {
          // Copy modules over to the loaded bucket if it does not exist. Anything
          // that has already been loaded will get ignored.
          var modules = result.modules;
          for (var item in modules) {
            if (modules.hasOwnProperty(item) && !manager.context.loaded.hasOwnProperty(item)) {
              manager.context.loaded[name] = result.modules[item];
            }
          }

          manager.context.loaded[name] = result.modules[name];
          return manager.resolve(result.modules[name]);
        });
    }

    return Promise.when(manager.context.loaded[name])
      .then(function(_module) {
        return _module.code;
      }, function(error) {
        return error;
      });
  };

  Loader.prototype.getModuleMeta = function(name) {
    var i, length, pkg, shimName;
    var manager  = this.manager,
        context  = manager.context,
        settings = manager.settings,
        packages = settings.packages,
        fileName = (settings.paths && settings.paths[name]) || name;

    // Go through the packages and figure if the module is actually configured as such.
    for (i = 0, length = packages.length; i < length; i++) {
      pkg = packages[i] || '';
      if (pkg.name === name || pkg === name) {
        if (pkg.location) {
          fileName = pkg.location + "/" +  name + "/" + (pkg.main || "main");
        }
        else {
          fileName = name + "/" + (pkg.main || "main");
        }
        break;
      }
    }

    // Once the module has been fully resolved, we finally added to the list of available modules
    if (settings.shim && settings.shim.hasOwnProperty(name)) {
      shimName = settings.shim[name].exports || name;
      if (root.hasOwnProperty(name)) {
        context.modules[name] = root[name];
      }
    }

    return {
      name: name,
      file: new File(fileName, settings.baseUrl),
      urlArgs: settings.urlArgs
    };
  };

  module.exports = Loader;
})(window || this);
