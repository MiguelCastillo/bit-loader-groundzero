(function() {
  "use strict";

  var Registry = require('./registry'),
      Promise  = require('spromise');

  function Import(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) || Registry.getById();
  }

  Import.prototype.import = function(names, options) {
    var manager  = this.manager,
        context  = this.context,
        deps     = [];

    // Coerce string to array to simplify input processing
    if (typeof(names) === "string") {
      names = [names];
    }

    // This logic figures out if the module's dependencies need to be resolved and if
    // they also need to be downloaded.
    deps = names.map(function(name) {
      var modules;
      if (options && options.modules && options.modules.hasOwnProperty(name)) {
        modules = options.modules;
      }
      else {
        modules = context.modules;
      }

      // If the module is not already loaded, then load it.
      if (!modules.hasOwnProperty(name)) {
        return (modules[name] = manager.load(name)
          .then(function(result) {
            return (modules[name] = result);
          }));
      }
      else {
        return modules[name];
      }
    });

    return Promise.when.apply((void 0), deps).fail(function(error) {
      console.error("===> error", error);
    });
  };

  module.exports = Import;
})(window || this);
