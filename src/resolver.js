(function() {
  "use strict";

  var Registry = require('./registry');

  function Resolver(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) ? manager.context : Registry.getById();
  }

  Resolver.prototype.resolve = function(_module) {
    if (_module.hasOwnProperty("code")) {
      return _module;
    }

    if (!_module.deps.length) {
      _module.code = _module.factory();
      return _module;
    }

    return this.manager.import(_module.deps).then(function() {
      _module.code = _module.factory.apply(_module, arguments);
      return _module;
    });
  };

  module.exports = Resolver;
})(window || this);
