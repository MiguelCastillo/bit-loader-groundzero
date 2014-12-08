(function() {
  "use script";

  var Registry = require('./registry'),
      Utils    = require('./Utils');

  function Require(manager) {
    this.manager = manager;
    this.context = (manager && manager.context) || Registry.getById();
  }

  Require.prototype.require = function(name, ready, options) {
    var manager = this.manager,
        context = this.context;

    if (context.modules.hasOwnProperty(name)) {
      return context.modules[name];
    }
    else {
      return manager.import(name, options).done(ready || Utils.noop);
    }
  };

  module.exports = Require;
})(window || this);
