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

  module.exports = Resolver;
})(window || this);
