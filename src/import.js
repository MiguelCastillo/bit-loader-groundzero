(function() {
  "use strict";

  var Registry = require('./registry'),
      Promise  = require('spromise');

  function Import(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) || Registry.getById();
  }

  Import.prototype.import = function(names, options) {
    options = options || {};
    var manager = this.manager,
        context = this.context;

    // Coerce string to array to simplify input processing
    if (typeof(names) === "string") {
      names = [names];
    }

    // This logic figures out if the module's dependencies need to be resolved and if
    // they also need to be downloaded.
    var deps = names.map(function(name) {
      // Search in the options passed in for the module being loaded.  This is how I
      // allow dependency injection to happen.
      if (options.modules && options.modules.hasOwnProperty(name)) {
        return options.modules[name];
      }
      else if (context.modules.hasOwnProperty(name)) {
        return context.modules[name];
      }

      return (context.modules[name] = manager
        .load(name)
        .then(function(result) {
          return (context.modules[name] = result.code);
        }));
    });

    return Promise.when.apply((void 0), deps).fail(function(error) {
      console.error("===> error", error);
    });
  };

  module.exports = Import;
})();
