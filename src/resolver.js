(function(root) {
  "use strict";

  var Registry = require('./registry'),
      File     = require('./file');

  function Resolver(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) ? manager.context : Registry.getById();
  }

  Resolver.prototype.resolve = function(name) {
    var i, length, pkg, shimName;
    var manager  = this.manager,
        context  = this.context,
        settings = manager.settings,
        shim     = settings.shim,
        packages = settings.packages,
        fileName = "";

    // Go through the packages and figure if the module is actually configured as such.
    for (i = 0, length = packages.length; i < length; i++) {
      pkg = packages[i] || '';
      if (pkg.name === name || pkg === name) {
        if (pkg.location) {
          fileName = pkg.location + "/";
        }

        fileName += name + "/" + (pkg.main || "main");
        break;
      }
    }
    
    if (!fileName) {
      fileName = (settings.paths && settings.paths[name]) || name;
    }

    // Once the module has been fully resolved, we finally added to the list of available modules
    if (shim && shim.hasOwnProperty(name)) {
      shimName = shim[name].exports || name;
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

  module.exports = Resolver;
})(typeof(window) !== 'undefined' ? window : this);
