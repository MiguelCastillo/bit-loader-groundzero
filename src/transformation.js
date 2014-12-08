(function() {
  "use strict";

  function Transformation(manager) {
    this.manager = manager;
  }

  Transformation.prototype.transform = function(_module) {
    return _module;
  };

  module.exports = Transformation;
})(window || this);
