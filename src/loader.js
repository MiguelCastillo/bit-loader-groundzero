(function() {
  "use strict";

  var Promise  = require('spromise'),
      Registry = require('./registry');

  function Loader(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) || Registry.getById();
  }

  Loader.prototype.load = function(name) {
    var manager = this.manager,
        context = this.context;

    if (!name) {
      throw new TypeError("Must provide the name of the module to load");
    }

    if (!context.hasOwnProperty(name)) {
      context.loaded[name] = this.fetch(name).then(function(_module) {
        return manager._transformation.transform(_module);
      });
    }

    return Promise.when(context.loaded[name])
      .then(function(_module) {
        return _module.code;
      }, function(error) {
        return error;
      });
  };


  Loader.prototype.fetch = function(name) {
    var manager = this.manager,
        context = this.context;

    return manager._fetch(manager.resolve(name))
      .then(function(result) {
        // Copy modules over to the loaded bucket if it does not exist. Anything
        // that has already been loaded will get ignored.
        var modules = result.modules;
        for (var item in modules) {
          if (modules.hasOwnProperty(item) && !context.loaded.hasOwnProperty(item)) {
            context.loaded[name] = result.modules[item];
          }
        }

        // Save to variable for easier reading
        var _module = (context.loaded[name] = result.modules[name]);

        if (_module.hasOwnProperty("code")) {
          return _module;
        }

        if (!_module.deps.length) {
          _module.code = _module.factory();
          return _module;
        }

        return manager.import(_module.deps).then(function() {
          _module.code = _module.factory.apply(_module, arguments);
          return _module;
        });
      });
  };


  module.exports = Loader;
})(window || this);
